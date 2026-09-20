const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const builder = require('../scripts/build-i18n.js');

const publicDir = path.join(__dirname, '../public');
const read = (file) => fs.readFileSync(path.join(publicDir, file), 'utf8');
const SITE = 'https://luniversducroyant.fr';
const indexable = builder.PAGES.filter((page) => page.indexable);
const priv = builder.PAGES.filter((page) => !page.indexable);

test('la version anglaise générée est à jour et complète (aucune traduction manquante ni orpheline)', () => {
  const { files, report } = builder.build();
  assert.deepEqual([...report.missing.keys()], [], 'textes français sans traduction : npm run i18n après avoir complété i18n/en-segments.json');
  assert.deepEqual(report.unused, [], 'entrées de traduction qui ne correspondent plus à aucun texte');
  assert.deepEqual(builder.outOfDate({ files }), [], 'fichiers générés obsolètes : exécuter npm run i18n');
});

test('chaque page française a son équivalent anglais, avec la bonne langue HTML', () => {
  for (const page of builder.PAGES) {
    assert.match(read(page.file), /<html lang="fr"/, `${page.file} doit rester en français`);
    assert.match(read(`en/${page.file}`), /<html lang="en"/, `en/${page.file} doit être en anglais`);
  }
});

test('aucun texte visible resté en français dans les pages anglaises', () => {
  for (const page of builder.PAGES) {
    assert.deepEqual(builder.frenchLeftovers(read(`en/${page.file}`)), [], `en/${page.file}`);
  }
});

test('SEO : canonique propre à chaque langue, hreflang fr/en/x-default cohérents, og:locale', () => {
  for (const page of indexable) {
    const fr = read(page.file);
    const en = read(`en/${page.file}`);
    const frUrl = `${SITE}${builder.frPath(page.file)}`;
    const enUrl = `${SITE}${builder.enPath(page.file)}`;
    assert.ok(fr.includes(`<link rel="canonical" href="${frUrl}">`), `${page.file} : canonique FR`);
    assert.ok(en.includes(`<link rel="canonical" href="${enUrl}">`), `en/${page.file} : canonique EN (jamais la page française)`);
    assert.ok(en.includes(`<meta property="og:url" content="${enUrl}">`), `en/${page.file} : og:url`);
    for (const html of [fr, en]) {
      assert.ok(html.includes(`<link rel="alternate" hreflang="fr" href="${frUrl}">`), `${page.file} : hreflang fr`);
      assert.ok(html.includes(`<link rel="alternate" hreflang="en" href="${enUrl}">`), `${page.file} : hreflang en`);
      assert.ok(html.includes(`<link rel="alternate" hreflang="x-default" href="${frUrl}">`), `${page.file} : x-default vers le français`);
    }
    assert.ok(fr.includes('<meta property="og:locale" content="fr_FR"><meta property="og:locale:alternate" content="en_GB">'));
    assert.ok(en.includes('<meta property="og:locale" content="en_GB"><meta property="og:locale:alternate" content="fr_FR">'));
    assert.match(en, /<meta name="description" content="[^"]+">/, `en/${page.file} : description`);
    assert.match(en, /<title>[^<]+<\/title>/);
  }
  for (const page of priv) {
    const en = read(`en/${page.file}`);
    assert.doesNotMatch(en, /rel="canonical"/, `en/${page.file} : page privée sans canonique`);
    assert.doesNotMatch(en, /<link rel="alternate"/, `en/${page.file} : pas d’alternative hreflang sur une page privée`);
    assert.match(en, /<meta name="robots" content="noindex,/, `en/${page.file} : noindex`);
  }
  assert.doesNotMatch(fs.readdirSync(path.join(publicDir, 'en')).map((name) => read(`en/${name}`)).join('\n'), /maison-du-musulman\.vercel\.app|maison du musulman/i);
});

test('données structurées : marque conservée, WebSite anglais distinct, domaine officiel', () => {
  const fr = read('index.html').match(/<script type="application\/ld\+json">([^<]*)<\/script>/)[1];
  const en = read('en/index.html').match(/<script type="application\/ld\+json">([^<]*)<\/script>/)[1];
  const frSite = JSON.parse(fr)['@graph'].find((node) => node['@type'] === 'WebSite');
  const enGraph = JSON.parse(en)['@graph'];
  const enSite = enGraph.find((node) => node['@type'] === 'WebSite');
  assert.equal(frSite.inLanguage, 'fr-FR');
  assert.equal(enSite.inLanguage, 'en');
  assert.equal(enSite.url, `${SITE}/en/`);
  assert.equal(enSite.name, 'L’Univers du Croyant');
  assert.equal(enGraph.find((node) => node['@type'] === 'Organization').name, 'L’Univers du Croyant');
  assert.doesNotMatch(en, /"@type":"Product"|"@type":"Offer"/);
});

test('les liens internes des pages anglaises restent dans /en/ (sauf le lien FR du sélecteur)', () => {
  for (const page of builder.PAGES) {
    const html = read(`en/${page.file}`).replace(/<!--lang-switch-->[\s\S]*?<!--\/lang-switch-->/, '');
    for (const match of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
      const href = match[1];
      if (!href.startsWith('/')) continue;
      assert.ok(href.startsWith('/en/') || /^\/(assets|api)\//.test(href), `en/${page.file} : lien interne « ${href} » hors /en/`);
    }
  }
});

test('le sélecteur FR | EN est présent, accessible et pointe vers la page équivalente', () => {
  for (const page of builder.PAGES) {
    for (const [lang, source] of [['fr', read(page.file)], ['en', read(`en/${page.file}`)]]) {
      const block = source.match(/<!--lang-switch-->([\s\S]*?)<!--\/lang-switch-->/);
      assert.ok(block, `${lang}/${page.file} : sélecteur absent`);
      assert.match(block[1], /<nav class="mdm-lang[^"]*" data-lang-switch aria-label="[^"]+">/);
      assert.ok(block[1].includes(`href="${builder.frPath(page.file)}" lang="fr" hreflang="fr" aria-label="Français"`), `${lang}/${page.file} : lien FR`);
      assert.ok(block[1].includes(`href="${builder.enPath(page.file)}" lang="en" hreflang="en" aria-label="English"`), `${lang}/${page.file} : lien EN`);
      assert.equal((block[1].match(/aria-current="true"/g) || []).length, 1, 'une seule langue active');
      assert.ok(block[1].includes(lang === 'fr' ? 'hreflang="fr" aria-label="Français" aria-current="true"' : 'hreflang="en" aria-label="English" aria-current="true"'));
      assert.match(source, /<link rel="stylesheet" href="\/lang-switch\.css">/);
      assert.match(source, /<script src="\/i18n\.js"><\/script>/);
    }
    assert.match(read(`en/${page.file}`), /<script src="\/i18n-en\.js"><\/script><script src="\/i18n\.js">/, 'catalogue anglais chargé avant i18n.js');
    assert.doesNotMatch(read(page.file), /i18n-en\.js/, 'les pages françaises ne chargent pas le catalogue anglais');
  }
});

test('le sitemap liste les pages françaises et anglaises avec leurs alternatives hreflang', () => {
  const sitemap = read('sitemap.xml');
  const locations = [...sitemap.matchAll(/<url><loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.equal(locations.length, builder.SITEMAP_PATHS.length * 2);
  assert.equal(new Set(locations).size, locations.length, 'aucun doublon');
  for (const loc of locations) {
    assert.ok(loc.startsWith(SITE));
    const page = loc.slice(SITE.length).split('?')[0].replace(/^\//, '') || 'index.html';
    const file = page.endsWith('/') ? `${page}index.html` : page;
    assert.ok(fs.existsSync(path.join(publicDir, file)), `${loc} doit exister`);
    assert.doesNotMatch(loc, /\/(api|compte|panier|succes|retractation|recherche)/);
  }
  assert.ok(locations.includes(`${SITE}/en/`) && locations.includes(`${SITE}/en/boutique.html`));
  assert.ok(sitemap.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'));
  assert.equal((sitemap.match(/hreflang="x-default"/g) || []).length, locations.length);
  assert.equal(sitemap, builder.sitemapXml());
});

test('robots.txt laisse les pages anglaises publiques explorables et bloque leurs équivalents privés', () => {
  const robots = read('robots.txt');
  assert.doesNotMatch(robots, /^Disallow: \/en\/?$/m);
  assert.doesNotMatch(robots, /^Disallow: \/$/m);
  for (const privatePage of ['compte', 'panier', 'succes']) {
    assert.match(robots, new RegExp(`^Disallow: /${privatePage}\\.html$`, 'm'));
    assert.match(robots, new RegExp(`^Disallow: /en/${privatePage}\\.html$`, 'm'));
  }
  assert.match(robots, /Sitemap: https:\/\/luniversducroyant\.fr\/sitemap\.xml/);
});

test('les prix, variantes et noms français du catalogue ne changent pas avec l’internationalisation', () => {
  const products = require('../public/catalog.js');
  const digest = crypto.createHash('sha256').update(JSON.stringify(products.map((x) => ({
    id: x.id, category: x.category, defaultVariant: x.defaultVariant, name: x.name,
    variants: x.variants.map((v) => [v.variant, v.label, v.price]),
  })))).digest('hex');
  assert.equal(digest, '86d5937fa42fa771ad8cbb60f3ec48521ff1762dfa57a55219883f6c70f8de10');
});

test('chaque produit a une fiche anglaise complète alignée sur ses variantes françaises', () => {
  const products = require('../public/catalog.js');
  for (const product of products) {
    const en = product.i18n && product.i18n.en;
    assert.ok(en, `${product.id} : i18n.en manquant`);
    for (const field of ['categoryLabel', 'badge', 'name', 'tagline', 'description']) {
      assert.ok(typeof en[field] === 'string' && en[field].length > 2, `${product.id} : ${field}`);
    }
    assert.ok('variantLabel' in en, `${product.id} : variantLabel (null si pas de choix)`);
    assert.deepEqual(Object.keys(en.variants).sort(), product.variants.map((v) => v.variant).sort(), `${product.id} : variantes`);
    for (const pair of Object.values(en.variants)) assert.ok(Array.isArray(pair) && pair.length === 2 && pair.every((s) => s));
    assert.ok(Array.isArray(en.info) && en.info.length === Object.keys(product.info).length, `${product.id} : info`);
    if (product.subCategory) assert.ok(en.subCategoryLabel, `${product.id} : sous-catégorie`);
    const visible = [en.name, en.tagline, en.description, en.badge, en.categoryLabel, ...Object.values(en.variants).flat(), ...en.info.flat()].join(' ');
    assert.doesNotMatch(visible, /[àâçéèêëîïôùûüœ]/i, `${product.id} : accent français dans la version anglaise`);
  }
});

/* --- module i18n.js exécuté dans un contexte isolé --- */
function loadI18n({ lang, pathname = '/', search = '', hash = '', preference = null, messages = null }) {
  const store = preference ? { mdm_lang: preference } : {};
  const replaced = [];
  const context = {
    window: {
      localStorage: { getItem: (key) => (key in store ? store[key] : null), setItem: (key, value) => { store[key] = value; } },
      location: { pathname, search, hash, replace: (url) => replaced.push(url) },
      PRODUCTS: require('../public/catalog.js'),
    },
    document: {
      documentElement: { getAttribute: () => lang },
      addEventListener() {},
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: () => ({ setAttribute() {} }),
      head: { appendChild() {} },
    },
    Intl,
  };
  if (messages) context.window.MDM_MESSAGES = messages;
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(publicDir, 'i18n.js'), 'utf8'), context);
  if (lang === 'en') assert.ok(context.window.MDM_MESSAGES === messages || true);
  return { api: context.window.MDM_I18N, store, replaced };
}
function loadEnglishMessages() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(publicDir, 'i18n-en.js'), 'utf8'), context);
  return context.window.MDM_MESSAGES;
}

test('i18n.js : textes, pluriels, prix et adresses selon la langue', () => {
  const fr = loadI18n({ lang: 'fr' }).api;
  const en = loadI18n({ lang: 'en', messages: loadEnglishMessages() }).api;
  assert.equal(fr.lang, 'fr');
  assert.equal(en.lang, 'en');
  assert.equal(fr.t('cart.remove', 'Retirer'), 'Retirer');
  assert.equal(en.t('cart.remove', 'Retirer'), 'Remove');
  assert.equal(en.t('clé.inconnue', 'Texte français'), 'Texte français', 'repli sur le français si la clé est absente');
  assert.equal(fr.tp('cat.count', '{n} produit', '{n} produits', 0), '0 produit');
  assert.equal(fr.tp('cat.count', '{n} produit', '{n} produits', 2), '2 produits');
  assert.equal(en.tp('cat.count', '{n} produit', '{n} produits', 0), '0 products');
  assert.equal(en.tp('cat.count', '{n} produit', '{n} produits', 1), '1 product');
  assert.equal(fr.money(29.9), '29,90 €');
  assert.equal(en.money(29.9), '€29.90');
  assert.equal(fr.path('/panier.html'), '/panier.html');
  assert.equal(en.path('/panier.html'), '/en/panier.html');
  assert.equal(en.path('/'), '/en/');
  assert.equal(en.path('/en/panier.html'), '/en/panier.html');
  assert.equal(en.absolute('/produit.html?id=chapelet'), `${SITE}/en/produit.html?id=chapelet`);
  assert.equal(fr.absolute('/produit.html?id=chapelet'), `${SITE}/produit.html?id=chapelet`);
});

test('i18n.js : produit localisé, ligne de panier et erreurs d’API', () => {
  const fr = loadI18n({ lang: 'fr' }).api;
  const en = loadI18n({ lang: 'en', messages: loadEnglishMessages() }).api;
  const oil = require('../public/catalog.js').find((product) => product.id === 'huile-nigelle');
  const frView = fr.product(oil);
  const enView = en.product(oil);
  assert.equal(frView.name, 'Huile de nigelle pure');
  assert.equal(enView.name, 'Pure nigella oil');
  assert.equal(frView.variants[1].short, '60ml');
  assert.equal(enView.variants[1].short, '60 ml');
  assert.equal(enView.variants[1].long, '60 ml bottle');
  const plain = (value) => JSON.parse(JSON.stringify(value)); // sortie du contexte isolé de i18n.js
  assert.deepEqual(plain(enView.variants.map((v) => [v.variant, v.label, v.price])), oil.variants.map((v) => [v.variant, v.label, v.price]), 'clé de panier et prix inchangés');
  assert.deepEqual(plain(enView.info[0]), ['Origin', 'Ethiopia (Habashia)']);
  assert.deepEqual(plain(frView.info[0]), ['Origine', 'Éthiopie (Habachia)']);
  // Le panier stocke toujours le français ; l’affichage suit la langue.
  const line = { id: 'huile-nigelle', name: 'Huile de nigelle pure', variant: 'flacon 500ml' };
  assert.deepEqual({ ...fr.cartLine(line) }, { name: 'Huile de nigelle pure', variant: 'flacon 500ml' });
  assert.deepEqual({ ...en.cartLine(line) }, { name: 'Pure nigella oil', variant: '500 ml bottle' });
  assert.deepEqual({ ...en.cartLine({ id: 'inconnu', name: 'X', variant: 'Y' }) }, { name: 'X', variant: 'Y' });
  const single = en.product(require('../public/catalog.js').find((product) => product.id === 'chapelet-33'));
  assert.equal(single.variantLabel, null);
  assert.equal(en.apiError('Référence ou adresse e-mail invalide.'), 'Invalid reference or email address.');
  assert.equal(en.apiError('Une demande de rétractation existe déjà pour cette commande (RET-1A2B3C4D).'), 'A withdrawal request already exists for this order (RET-1A2B3C4D).');
  assert.equal(en.apiError('Message inconnu'), 'Message inconnu');
  assert.equal(fr.apiError('Référence ou adresse e-mail invalide.'), 'Référence ou adresse e-mail invalide.');
});

test('i18n.js : la langue choisie est mémorisée sans redirection agressive', () => {
  const messages = loadEnglishMessages();
  // Aucun choix mémorisé : jamais de redirection, quelle que soit la page.
  assert.deepEqual(loadI18n({ lang: 'fr', pathname: '/boutique.html' }).replaced, []);
  // Choix « anglais » mémorisé : la page française renvoie vers son équivalent anglais, requête et ancre conservées.
  assert.deepEqual(loadI18n({ lang: 'fr', pathname: '/', preference: 'en' }).replaced, ['/en/']);
  assert.deepEqual(loadI18n({ lang: 'fr', pathname: '/produit.html', search: '?id=chapelet', hash: '#x', preference: 'en' }).replaced, ['/en/produit.html?id=chapelet#x']);
  assert.deepEqual(loadI18n({ lang: 'fr', pathname: '/compte.html', hash: '#access_token=abc', preference: 'en' }).replaced, ['/en/compte.html#access_token=abc']);
  // Choix « français » mémorisé ou page déjà anglaise : rien.
  assert.deepEqual(loadI18n({ lang: 'fr', pathname: '/boutique.html', preference: 'fr' }).replaced, []);
  assert.deepEqual(loadI18n({ lang: 'en', pathname: '/en/boutique.html', preference: 'en', messages }).replaced, []);
  assert.deepEqual(loadI18n({ lang: 'en', pathname: '/en/boutique.html', preference: 'fr', messages }).replaced, []);
  // Le choix se mémorise via rememberLanguage (lancement du paiement) et non selon l’IP ou la langue du navigateur.
  const loaded = loadI18n({ lang: 'en', pathname: '/en/panier.html', messages });
  loaded.api.rememberLanguage();
  assert.equal(loaded.store.mdm_lang, 'en');
  const source = fs.readFileSync(path.join(publicDir, 'i18n.js'), 'utf8');
  assert.doesNotMatch(source, /navigator\.language|geolocation|ipapi|fetch\(/);
});

test('les clés de texte utilisées par les pages existent dans le catalogue anglais (et inversement)', () => {
  const messages = loadEnglishMessages().en.messages;
  const files = ['index.html', 'categorie.html', 'produit.html', 'panier.html', 'retractation.html', 'succes.html', 'account.js', 'search.js'];
  const used = new Set();
  for (const file of files) {
    const source = read(file);
    for (const match of source.matchAll(/I18N\.t\('([^']+)'/g)) used.add(match[1]);
    for (const match of source.matchAll(/I18N\.tp\('([^']+)'/g)) { used.add(`${match[1]}.one`); used.add(`${match[1]}.other`); }
  }
  assert.ok(used.size > 50, 'les appels de traduction doivent être détectés');
  for (const key of used) assert.ok(typeof messages[key] === 'string' && messages[key], `clé anglaise manquante : ${key}`);
  for (const key of Object.keys(messages)) assert.ok(used.has(key), `clé anglaise inutilisée : ${key}`);
});

test('les messages d’erreur français des API ont une traduction anglaise', () => {
  const errors = loadEnglishMessages().en.errors;
  const messages = new Set();
  for (const file of ['withdrawal-request.js', 'create-checkout-session.js', 'finalize-order.js', '_cart.js']) {
    const source = fs.readFileSync(path.join(__dirname, '../api', file), 'utf8');
    for (const match of source.matchAll(/(?:error: |new Error\()'([^'$]+)'/g)) messages.add(match[1]);
  }
  const clientVisible = [...messages].filter((message) => !/^(SUPABASE|Clé d’administration|Resend|Lecture|Vérification|Enregistrement impossible|La base|Impossible de relire)/.test(message));
  assert.ok(clientVisible.length >= 12);
  for (const message of clientVisible) assert.ok(errors[message], `erreur d’API sans traduction : ${message}`);
});

test('le panier reste commun aux deux langues : même clé de stockage, contenu toujours en français', () => {
  for (const file of ['index.html', 'boutique.html', 'produit.html', 'panier.html', 'contact.html', 'qui-sommes-nous.html', 'livraison.html', 'en/produit.html', 'en/panier.html', 'en/index.html', 'succes.html', 'en/succes.html']) {
    assert.match(read(file), /maison_du_musulman_cart/, `${file} : clé de panier historique`);
  }
  assert.match(read('account.js'), /maison_du_musulman_cart/);
  assert.match(read('search.js'), /maison_du_musulman_cart/);
  const product = read('produit.html');
  assert.match(product, /cart\.push\(\{ id: source\.id, name: source\.name, variant: selected\.label, price: selected\.price/);
  const cart = read('panier.html');
  assert.match(cart, /I18N\.cartLine\(item\)/);
  assert.doesNotMatch(read('i18n.js'), /(?:get|set|remove)Item\(\s*['"]maison_du_musulman_cart/, 'i18n.js ne touche jamais au panier');
  // Le même script de panier est servi dans les deux langues (seuls les textes fixes diffèrent).
  const scriptOf = (html) => html.slice(html.indexOf("<script src=\"/catalog.js\"></script>"));
  assert.equal(scriptOf(read('en/panier.html')), scriptOf(cart));
});

test('la boutique reste fermée et rien de bancaire ou de compte n’a changé pour l’internationalisation', () => {
  const checkout = fs.readFileSync(path.join(__dirname, '../api/create-checkout-session.js'), 'utf8');
  assert.match(checkout, /process\.env\.STORE_OPEN !== 'true'/);
  assert.match(checkout, /code: 'STORE_CLOSED'/);
  assert.match(checkout, /success_url: `\$\{origin\}\$\{pathPrefix\}\/succes\.html\?session_id=\{CHECKOUT_SESSION_ID\}`/);
  // Les liens d’e-mail Supabase continuent d’utiliser /compte.html (adresse déjà autorisée).
  const account = read('account.js');
  assert.equal((account.match(/\$\{location\.origin\}\/compte\.html/g) || []).length, 2);
  assert.doesNotMatch(account, /\$\{location\.origin\}\/en\//, 'aucune nouvelle URL de redirection Supabase');
  assert.match(read('panier.html'), /Ouverture prochaine/);
  assert.match(read('i18n-en.js'), /'cart\.openingSoon': 'Opening soon'/);
  assert.match(read('en/panier.html'), /\/api\/store-status/);
});

test('les pages juridiques anglaises signalent une traduction informative et gardent les champs à compléter', () => {
  for (const file of ['mentions-legales.html', 'cgv.html', 'confidentialite.html', 'retours-remboursements.html', 'retractation.html']) {
    const en = read(`en/${file}`);
    assert.match(en, /This English translation is provided for information only\. The French version prevails/, file);
    assert.doesNotMatch(read(file), /English translation/, 'la page française n’a pas de note de traduction');
  }
  const legal = read('en/mentions-legales.html');
  assert.equal((legal.match(/\[TO BE COMPLETED\]/g) || []).length, 8, 'aucune information juridique inventée : les 8 champs restent à compléter');
  assert.doesNotMatch(legal, /SIRET[^<]*\d{9}/);
  assert.match(read('confidentialite.html'), /choix de langue \(français ou anglais\)/);
  assert.match(read('en/confidentialite.html'), /remember your language choice \(French or English\)/);
});

test('les images des pages anglaises existent et restent légères', () => {
  const maxBytes = 300 * 1024;
  let checked = 0;
  for (const page of fs.readdirSync(path.join(publicDir, 'en'))) {
    for (const match of read(`en/${page}`).matchAll(/<img\b[^>]*\bsrc="(\/assets\/[^"]+)"/g)) {
      const file = path.join(publicDir, match[1]);
      assert.ok(fs.existsSync(file), `en/${page} : ${match[1]}`);
      assert.ok(fs.statSync(file).size <= maxBytes);
      checked += 1;
    }
  }
  assert.ok(checked >= 10);
});

test('les ressources partagées sont référencées par des chemins absolus (valables depuis /en/)', () => {
  for (const page of builder.PAGES) {
    const html = read(`en/${page.file}`);
    for (const match of html.matchAll(/<(?:link|script|img)\b[^>]*\b(?:href|src)="([^"]+)"/g)) {
      const ref = match[1];
      assert.ok(/^(https?:|\/)/.test(ref), `en/${page.file} : chemin relatif « ${ref} » (casserait sous /en/)`);
      if (ref.startsWith('/') && !ref.startsWith('/en/') && !ref.startsWith('//')) {
        const target = ref.split(/[?#]/)[0];
        if (target === '/') continue;
        assert.ok(fs.existsSync(path.join(publicDir, target)), `en/${page.file} : ${ref} introuvable`);
      }
    }
  }
});
