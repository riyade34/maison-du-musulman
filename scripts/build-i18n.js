#!/usr/bin/env node
'use strict';
/*
 * Génération de la version anglaise statique de L’Univers du Croyant.
 *
 *   node scripts/build-i18n.js            écrit public/en/*.html et public/sitemap.xml
 *   node scripts/build-i18n.js --check    échoue si les fichiers écrits ne sont pas à jour
 *   node scripts/build-i18n.js --extract  liste les textes français et leur état de traduction
 *
 * Source de vérité : les pages françaises de public/ (URLs inchangées) + i18n/en-segments.json
 * (« texte français » → « texte anglais »). Aucune dépendance, aucun service externe.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const EN_DIR = path.join(PUBLIC_DIR, 'en');
const SEGMENTS_FILE = path.join(ROOT, 'i18n', 'en-segments.json');
const SITE = 'https://luniversducroyant.fr';

// Pages françaises traduites. `indexable` : page publique (canonique + hreflang + sitemap).
const PAGES = [
  { file: 'index.html', indexable: true },
  { file: 'boutique.html', indexable: true },
  { file: 'categorie.html', indexable: true },
  { file: 'produit.html', indexable: true },
  { file: 'qui-sommes-nous.html', indexable: true },
  { file: 'contact.html', indexable: true },
  { file: 'livraison.html', indexable: true },
  { file: 'mentions-legales.html', indexable: true, legalNotice: true },
  { file: 'cgv.html', indexable: true, legalNotice: true },
  { file: 'confidentialite.html', indexable: true, legalNotice: true },
  { file: 'retours-remboursements.html', indexable: true, legalNotice: true },
  { file: 'compte.html', indexable: false },
  { file: 'panier.html', indexable: false },
  { file: 'recherche.html', indexable: false },
  { file: 'retractation.html', indexable: false, legalNotice: true },
  { file: 'succes.html', indexable: false },
];

// Pages listées dans le sitemap (les fiches produits n’y figurent pas tant que le catalogue n’est pas confirmé).
const SITEMAP_PATHS = [
  '/', '/boutique.html', '/qui-sommes-nous.html', '/contact.html', '/livraison.html',
  '/mentions-legales.html', '/cgv.html', '/confidentialite.html', '/retours-remboursements.html',
  '/categorie.html?cat=pret-a-porter', '/categorie.html?cat=priere',
  '/categorie.html?cat=bien-etre', '/categorie.html?cat=decoration',
];

const BRAND = 'L’Univers du Croyant';
const KEEP = new Set([BRAND]); // textes identiques dans les deux langues, sans entrée de traduction
const TRANSLATABLE_ATTRS = new Set(['alt', 'aria-label', 'placeholder', 'title']);
const TRANSLATABLE_META = new Set(['description', 'og:title', 'og:description', 'og:image:alt']);
const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const HAS_LETTER = /\p{L}/u;
const SWITCH_BLOCK = /<!--lang-switch-->[\s\S]*?<!--\/lang-switch-->/;

const frPath = (file) => (file === 'index.html' ? '/' : `/${file}`);
const enPath = (file) => (file === 'index.html' ? '/en/' : `/en/${file}`);
// '/x.html?a=b' → '/en/x.html?a=b' ; '/' → '/en/'
const toEnglishUrlPath = (value) => (value === '/' ? '/en/' : `/en${value}`);

function lineOf(html, index) { return html.slice(0, index).split('\n').length; }

/* ------------------------------------------------------------------ analyse HTML */
function parse(html) {
  const lower = html.toLowerCase();
  const root = { type: 'root', tag: '#root', attrs: [], children: [], start: 0, openEnd: 0, closeStart: html.length, end: html.length };
  const stack = [root];
  const top = () => stack[stack.length - 1];
  const pushText = (from, to) => { if (to > from) top().children.push({ type: 'text', start: from, end: to }); };
  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt === -1) { pushText(i, html.length); break; }
    pushText(i, lt);
    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt + 4);
      if (end < 0) throw new Error(`commentaire non fermé (ligne ${lineOf(html, lt)})`);
      i = end + 3; continue;
    }
    if (html[lt + 1] === '!') { i = html.indexOf('>', lt) + 1; continue; }
    if (html[lt + 1] === '/') {
      const end = html.indexOf('>', lt);
      const tag = html.slice(lt + 2, end).trim().toLowerCase();
      if (top().tag !== tag) throw new Error(`</${tag}> inattendue, <${top().tag}> ouverte (ligne ${lineOf(html, lt)})`);
      const el = stack.pop();
      el.closeStart = lt; el.end = end + 1; i = end + 1; continue;
    }
    if (/[a-zA-Z]/.test(html[lt + 1] || '')) {
      let j = lt + 1;
      while (j < html.length && /[^\s/>]/.test(html[j])) j += 1;
      const tag = html.slice(lt + 1, j).toLowerCase();
      const attrs = [];
      let selfClose = false;
      for (;;) {
        while (j < html.length && /\s/.test(html[j])) j += 1;
        if (j >= html.length) throw new Error(`balise <${tag}> non terminée (ligne ${lineOf(html, lt)})`);
        if (html[j] === '>') { j += 1; break; }
        if (html[j] === '/' && html[j + 1] === '>') { selfClose = true; j += 2; break; }
        if (html[j] === '/') { j += 1; continue; }
        const nameStart = j;
        while (j < html.length && /[^\s=/>]/.test(html[j])) j += 1;
        const name = html.slice(nameStart, j).toLowerCase();
        let k = j;
        while (k < html.length && /\s/.test(html[k])) k += 1;
        let value = null; let vs = -1; let ve = -1;
        if (html[k] === '=') {
          k += 1;
          while (k < html.length && /\s/.test(html[k])) k += 1;
          if (html[k] === '"' || html[k] === "'") {
            const quote = html[k];
            vs = k + 1; ve = html.indexOf(quote, vs); value = html.slice(vs, ve); j = ve + 1;
          } else {
            vs = k;
            while (k < html.length && /[^\s>]/.test(html[k])) k += 1;
            ve = k; value = html.slice(vs, ve); j = k;
          }
        }
        attrs.push({ name, value, vs, ve });
      }
      const el = { type: 'el', tag, attrs, start: lt, openEnd: j, children: [] };
      top().children.push(el);
      if (VOID_TAGS.has(tag) || selfClose) { el.closeStart = j; el.end = j; el.void = true; i = j; continue; }
      if (tag === 'script' || tag === 'style') {
        const close = lower.indexOf(`</${tag}`, j);
        if (close < 0) throw new Error(`<${tag}> non fermée (ligne ${lineOf(html, lt)})`);
        el.raw = true; el.closeStart = close; el.end = html.indexOf('>', close) + 1; i = el.end; continue;
      }
      stack.push(el); i = j; continue;
    }
    pushText(lt, lt + 1); i = lt + 1;
  }
  if (stack.length > 1) throw new Error(`<${top().tag}> non fermée (ligne ${lineOf(html, top().start)})`);
  return root;
}

const attr = (el, name) => el.attrs.find((item) => item.name === name);

function protectSvg(inner) {
  const svgs = [];
  const text = inner.replace(/<svg\b[\s\S]*?<\/svg>/g, (match) => { svgs.push(match); return `⟦svg${svgs.length - 1}⟧`; });
  return { text, svgs };
}
const restoreSvg = (text, svgs) => text.replace(/⟦svg(\d+)⟧/g, (_, n) => svgs[Number(n)]);
const normalize = (text) => text.replace(/\s+/g, ' ').trim();
const decodeForLetters = (text) => text.replace(/&[a-z]+;|&#\d+;/gi, ' ');

function hasDirectText(html, el) {
  return el.children.some((child) => child.type === 'text' && HAS_LETTER.test(decodeForLetters(html.slice(child.start, child.end))));
}

/* Unités traduisibles : { kind:'text'|'attr', start, end, key, svgs } et liens internes à réécrire. */
function collectUnits(html, root) {
  const units = [];
  const links = [];
  const walk = (el) => {
    if (el.type === 'text') return;
    if (el.type === 'root') { el.children.forEach(walk); return; }
    if (attr(el, 'data-lang-switch')) return;
    for (const a of el.attrs) {
      if (a.value == null) continue;
      if (el.tag === 'meta' && a.name === 'content') {
        const metaKey = (attr(el, 'name') || attr(el, 'property') || {}).value;
        if (!TRANSLATABLE_META.has(metaKey)) continue;
      } else if (!TRANSLATABLE_ATTRS.has(a.name)) continue;
      if (HAS_LETTER.test(a.value) && !KEEP.has(normalize(a.value))) units.push({ kind: 'attr', start: a.vs, end: a.ve, key: normalize(a.value), svgs: [] });
    }
    if (el.tag === 'a') {
      const href = attr(el, 'href');
      if (href && href.value && href.value.startsWith('/') && !href.value.startsWith('//') && !href.value.startsWith('/en/')) {
        const pathname = href.value.split(/[?#]/)[0];
        if (pathname === '/' || pathname.endsWith('.html')) links.push({ start: href.vs, end: href.ve, value: toEnglishUrlPath(href.value) });
      }
    }
    if (el.raw || el.void || el.tag === 'svg') return;
    if (hasDirectText(html, el)) {
      const { text, svgs } = protectSvg(html.slice(el.openEnd, el.closeStart));
      const key = normalize(text);
      if (!KEEP.has(key)) units.push({ kind: 'text', start: el.openEnd, end: el.closeStart, key, svgs });
      return;
    }
    el.children.forEach(walk);
  };
  walk(root);
  return { units, links };
}

/* ------------------------------------------------------------------ génération */
function switcherHtml(lang, file, extraClass = '') {
  const isFr = lang === 'fr';
  return `<!--lang-switch--><nav class="mdm-lang${extraClass}" data-lang-switch aria-label="${isFr ? 'Langue du site' : 'Site language'}">`
    + `<a href="${frPath(file)}" lang="fr" hreflang="fr" aria-label="Français"${isFr ? ' aria-current="true"' : ''}>FR</a>`
    + `<a href="${enPath(file)}" lang="en" hreflang="en" aria-label="English"${isFr ? '' : ' aria-current="true"'}>EN</a>`
    + '</nav><!--/lang-switch-->';
}

function alternatesHtml(file) {
  return `<link rel="alternate" hreflang="fr" href="${SITE}${frPath(file)}">`
    + `<link rel="alternate" hreflang="en" href="${SITE}${enPath(file)}">`
    + `<link rel="alternate" hreflang="x-default" href="${SITE}${frPath(file)}">`;
}

function applyEdits(html, edits) {
  const sorted = [...edits].sort((a, b) => b.start - a.start);
  let out = html;
  let previous = Infinity;
  for (const edit of sorted) {
    if (edit.end > previous) throw new Error('modifications qui se chevauchent');
    out = out.slice(0, edit.start) + edit.text + out.slice(edit.end);
    previous = edit.start;
  }
  return out;
}

// Dans un texte traduit, les liens internes gardent leur forme française (/x.html) et sont réécrits ici.
function localizeLinks(text) {
  if (typeof text !== 'string') return text;
  return text.replace(/href="(\/[^"?#]*)([^"]*)"/g, (whole, pathname, rest) => {
    if (pathname.startsWith('/en/') || (pathname !== '/' && !pathname.endsWith('.html'))) return whole;
    return `href="${toEnglishUrlPath(pathname)}${rest}"`;
  });
}

const TRANSLATION_NOTICE = '<div class="legal-info" lang="en">This English translation is provided for information only. The French version prevails in case of any discrepancy.</div>';

function englishJsonLd(json) {
  const data = JSON.parse(json);
  for (const node of data['@graph'] || []) {
    if (node['@type'] === 'WebSite') {
      node['@id'] = `${SITE}/en/#site`;
      node.url = `${SITE}/en/`;
      node.inLanguage = 'en';
    }
  }
  return JSON.stringify(data);
}

// Le sélecteur garde sa variante d’emplacement (--card pour la page de confirmation).
function switcherFor(lang, file, html) {
  const block = html.match(SWITCH_BLOCK);
  return switcherHtml(lang, file, block && /mdm-lang--card/.test(block[0]) ? ' mdm-lang--card' : '');
}

function buildEnglishPage(page, html, segments, report) {
  const withSwitcher = html.replace(SWITCH_BLOCK, switcherFor('en', page.file, html));
  const root = parse(withSwitcher);
  const { units, links } = collectUnits(withSwitcher, root);
  const edits = [];
  for (const unit of units) {
    // Une entrée « page.html::texte » l’emporte sur l’entrée générale (même mot, sens différent).
    const scopedKey = `${page.file}::${unit.key}`;
    const usedKey = typeof segments[scopedKey] === 'string' ? scopedKey : unit.key;
    report.used.add(usedKey);
    const translated = localizeLinks(segments[usedKey]);
    if (typeof translated !== 'string') {
      if (!report.missing.has(unit.key)) report.missing.set(unit.key, page.file);
      continue;
    }
    const expected = (unit.key.match(/⟦svg\d+⟧/g) || []).length;
    const actual = (translated.match(/⟦svg\d+⟧/g) || []).length;
    if (expected !== actual) throw new Error(`${page.file} : « ${unit.key.slice(0, 50)} » doit garder ${expected} icône(s) ⟦svgN⟧`);
    const original = withSwitcher.slice(unit.start, unit.end);
    const lead = original.match(/^\s*/)[0];
    const trail = original.match(/\s*$/)[0];
    edits.push({ start: unit.start, end: unit.end, text: unit.kind === 'text' ? lead + restoreSvg(translated, unit.svgs) + trail : translated });
  }
  for (const link of links) edits.push({ start: link.start, end: link.end, text: link.value });
  let out = applyEdits(withSwitcher, edits);

  out = out.replace('<html lang="fr"', '<html lang="en"');
  if (page.legalNotice) {
    const opening = /<(article|section) class="legal-content">/;
    if (!opening.test(out)) throw new Error(`${page.file} : zone .legal-content introuvable pour la note de traduction`);
    out = out.replace(opening, `$&${TRANSLATION_NOTICE}`);
  }
  out = out.replace(/(<link rel="canonical" href=")https:\/\/luniversducroyant\.fr(\/[^"]*")/, `$1${SITE}/en$2`);
  out = out.replace(/(<meta property="og:url" content=")https:\/\/luniversducroyant\.fr(\/[^"]*")/, `$1${SITE}/en$2`);
  out = out.replace('<meta property="og:locale" content="fr_FR">', '<meta property="og:locale" content="en_GB">')
    .replace('<meta property="og:locale:alternate" content="en_GB">', '<meta property="og:locale:alternate" content="fr_FR">');
  out = out.replace(/(<script type="application\/ld\+json">)([^<]*)(<\/script>)/, (_, open, json, close) => open + englishJsonLd(json) + close);
  if (!out.includes('<script src="/i18n.js"></script>')) throw new Error(`${page.file} : <script src="/i18n.js"> absent de la page française`);
  out = out.replace('<script src="/i18n.js"></script>', '<script src="/i18n-en.js"></script><script src="/i18n.js"></script>');
  return out;
}

function sitemapXml() {
  const row = (loc, alternates) => `  <url><loc>${SITE}${loc}</loc>${alternates}</url>`;
  const rows = [];
  for (const frLoc of SITEMAP_PATHS) {
    const enLoc = toEnglishUrlPath(frLoc);
    const alternates = `<xhtml:link rel="alternate" hreflang="fr" href="${SITE}${frLoc}"/>`
      + `<xhtml:link rel="alternate" hreflang="en" href="${SITE}${enLoc}"/>`
      + `<xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${frLoc}"/>`;
    rows.push(row(frLoc, alternates), row(enLoc, alternates));
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${rows.join('\n')}\n</urlset>\n`;
}

function loadSegments() {
  return fs.existsSync(SEGMENTS_FILE) ? JSON.parse(fs.readFileSync(SEGMENTS_FILE, 'utf8')) : {};
}

/* Construit tous les fichiers générés en mémoire. */
function build({ segments = loadSegments() } = {}) {
  const files = new Map();
  const report = { missing: new Map(), used: new Set(), unused: [] };
  for (const page of PAGES) {
    const html = fs.readFileSync(path.join(PUBLIC_DIR, page.file), 'utf8');
    files.set(path.join('en', page.file), buildEnglishPage(page, html, segments, report));
  }
  files.set('sitemap.xml', sitemapXml());
  report.unused = Object.keys(segments).filter((key) => !report.used.has(key));
  return { files, report };
}

/* Textes visibles restés en français dans une page anglaise générée (contrôle heuristique). */
const FRENCH_MARKERS = /[àâäçéèêëîïôöùûüœÀÂÇÉÈÊËÎÏÔÙÛÜŒ]|\b(?:le|la|les|des|une|votre|vos|vous|nous|est|sont|pour|avec|dans|sur|et|ou|du|au|aux|ce|cette|ces|que|qui)\b/;
function frenchLeftovers(html) {
  const { units } = collectUnits(html, parse(html));
  const found = [];
  for (const unit of units) {
    const text = normalize(html.slice(unit.start, unit.end).replace(/<[^>]+>/g, ' ')).replace(BRAND, '');
    if (FRENCH_MARKERS.test(text)) found.push(text.slice(0, 90));
  }
  return found;
}

function writeAll(result) {
  fs.mkdirSync(EN_DIR, { recursive: true });
  for (const [name, content] of result.files) fs.writeFileSync(path.join(PUBLIC_DIR, name), content);
}

function outOfDate(result) {
  const stale = [];
  for (const [name, content] of result.files) {
    const target = path.join(PUBLIC_DIR, name);
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== content) stale.push(name);
  }
  return stale;
}

function extractAll() {
  const segments = loadSegments();
  const all = new Map();
  for (const page of PAGES) {
    const html = fs.readFileSync(path.join(PUBLIC_DIR, page.file), 'utf8').replace(SWITCH_BLOCK, '');
    const { units } = collectUnits(html, parse(html));
    for (const unit of units) if (!all.has(unit.key)) all.set(unit.key, page.file);
  }
  let n = 0;
  for (const [key, file] of all) { n += 1; console.log(`${String(n).padStart(3, '0')} | ${segments[key] === undefined ? 'TODO' : 'ok  '} | ${file} | ${key}`); }
}

function main(argv) {
  if (argv.includes('--extract')) { extractAll(); return 0; }
  const result = build();
  const { report } = result;
  if (report.missing.size) {
    console.error(`Traductions manquantes (${report.missing.size}) dans i18n/en-segments.json :`);
    for (const [key, file] of report.missing) console.error(`  [${file}] ${key.slice(0, 110)}`);
    return 1;
  }
  if (report.unused.length) {
    console.error(`Entrées inutilisées dans i18n/en-segments.json (${report.unused.length}) :`);
    report.unused.forEach((key) => console.error(`  ${key.slice(0, 110)}`));
    return 1;
  }
  if (argv.includes('--check')) {
    const stale = outOfDate(result);
    if (stale.length) { console.error(`Fichiers à régénérer (npm run i18n) : ${stale.join(', ')}`); return 1; }
    console.log('Version anglaise à jour.');
    return 0;
  }
  writeAll(result);
  console.log(`Version anglaise générée : ${result.files.size} fichiers.`);
  return 0;
}

module.exports = {
  PAGES, SITE, SITEMAP_PATHS, KEEP, SWITCH_BLOCK, parse, collectUnits, build, buildEnglishPage, switcherHtml, alternatesHtml,
  sitemapXml, frenchLeftovers, outOfDate, frPath, enPath, toEnglishUrlPath, loadSegments, normalize,
};

if (require.main === module) process.exit(main(process.argv.slice(2)));
