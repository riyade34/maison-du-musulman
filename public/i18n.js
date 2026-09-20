/*
 * L’Univers du Croyant — internationalisation FR/EN, sans dépendance ni service externe.
 *
 * - La langue de la page est celle de <html lang> (« fr » par défaut, « en » sous /en/).
 * - Les textes fixes des pages sont générés en anglais à l’avance (voir I18N.md) ;
 *   ce fichier ne sert qu’aux textes produits par JavaScript, aux produits, aux prix et au sélecteur.
 * - Sur les pages françaises, le français est le texte par défaut passé à t(clé, texte français) :
 *   aucun dictionnaire français n’est chargé. Le catalogue anglais (i18n-en.js) n’est chargé que sous /en/.
 * - La clé de panier (maison_du_musulman_cart) et les valeurs envoyées aux API restent inchangées.
 */
(function () {
  'use strict';

  var SITE = 'https://luniversducroyant.fr';
  var PREF_KEY = 'mdm_lang';
  var lang = /^en/i.test(document.documentElement.getAttribute('lang') || '') ? 'en' : 'fr';
  var catalog = (window.MDM_MESSAGES && window.MDM_MESSAGES[lang]) || {};
  var messages = catalog.messages || {};

  function readPreference() { try { return window.localStorage.getItem(PREF_KEY); } catch (error) { return null; } }
  function savePreference(value) { try { window.localStorage.setItem(PREF_KEY, value); } catch (error) { /* stockage indisponible : sans effet */ } }

  function fill(text, values) {
    return String(text).replace(/\{(\w+)\}/g, function (whole, name) { return values && values[name] != null ? values[name] : ''; });
  }

  // t('clé', 'Texte français', { variable: valeur }) — le texte français est la valeur par défaut.
  function t(key, fr, values) {
    var text = lang === 'en' && typeof messages[key] === 'string' ? messages[key] : fr;
    return fill(text, values);
  }

  // Pluriel : en français 0 et 1 sont au singulier, en anglais seulement 1.
  function tp(key, frOne, frOther, n, values) {
    var one = lang === 'en' ? n === 1 : n < 2;
    var merged = { n: n };
    if (values) Object.keys(values).forEach(function (name) { merged[name] = values[name]; });
    return t(key + (one ? '.one' : '.other'), one ? frOne : frOther, merged);
  }

  // Adresse d’une page du site dans la langue courante : '/panier.html' → '/en/panier.html' sous /en/.
  function path(target) {
    if (lang !== 'en' || target.charAt(0) !== '/' || /^\/en(\/|$)/.test(target)) return target;
    return target === '/' ? '/en/' : '/en' + target;
  }
  function absolute(target) { return SITE + path(target); }

  // Prix en euros : « 29,90 € » en français, « €29.90 » en anglais.
  function money(value) {
    var fixed = Number(value).toFixed(2);
    return lang === 'en' ? '€' + fixed : fixed.replace('.', ',') + ' €';
  }
  function moneyFromCents(cents, currency) {
    return new Intl.NumberFormat(lang === 'en' ? 'en-GB' : 'fr-FR', { style: 'currency', currency: String(currency || 'eur').toUpperCase() }).format((cents || 0) / 100);
  }
  function formatDate(value) {
    return new Date(value).toLocaleDateString(lang === 'en' ? 'en-GB' : 'fr-FR');
  }

  // Vue localisée d’un produit du catalogue (les champs techniques variant / label / price ne changent jamais).
  function product(item) {
    var en = lang === 'en' && item.i18n && item.i18n.en ? item.i18n.en : null;
    var e = en || {};
    return {
      id: item.id,
      icon: item.icon,
      category: item.category,
      subCategory: item.subCategory,
      defaultVariant: item.defaultVariant,
      name: e.name || item.name,
      tagline: e.tagline || item.tagline,
      description: e.description || item.description,
      badge: e.badge || item.badge,
      categoryLabel: e.categoryLabel || item.categoryLabel,
      subCategoryLabel: e.subCategoryLabel || item.subCategoryLabel,
      variantLabel: en && 'variantLabel' in e ? e.variantLabel : item.variantLabel,
      variants: item.variants.map(function (variant) {
        var pair = e.variants && e.variants[variant.variant];
        return {
          variant: variant.variant,
          label: variant.label,
          price: variant.price,
          short: pair ? pair[0] : variant.label.replace(/^flacon |^bouteille /, ''),
          long: pair ? pair[1] : variant.label,
        };
      }),
      info: en && e.info ? e.info : Object.keys(item.info || {}).map(function (label) { return [label, item.info[label]]; }),
    };
  }

  // Nom et variante affichés pour une ligne de panier (le panier stocke toujours la version française).
  function cartLine(entry) {
    var source = (window.PRODUCTS || []).filter(function (candidate) { return candidate.id === entry.id; })[0];
    if (!source) return { name: entry.name, variant: entry.variant };
    var view = product(source);
    var match = view.variants.filter(function (variant) { return variant.label === entry.variant; })[0];
    return { name: view.name, variant: match ? match.long : entry.variant };
  }

  // Messages d’erreur renvoyés en français par les API : traduits à l’affichage sous /en/.
  function apiError(message) {
    if (lang !== 'en' || typeof message !== 'string') return message;
    var errors = catalog.errors || {};
    if (typeof errors[message] === 'string') return errors[message];
    var patterns = catalog.errorPatterns || [];
    for (var i = 0; i < patterns.length; i += 1) {
      var found = patterns[i][0].exec(message);
      if (found) return patterns[i][1].replace(/\$(\d)/g, function (whole, index) { return found[Number(index)] || ''; });
    }
    return message;
  }

  // Sélecteur de langue : garde la page équivalente (et sa requête), mémorise le choix explicite.
  function syncSwitcher(frTarget) {
    var links = document.querySelectorAll('[data-lang-switch] a[hreflang]');
    Array.prototype.forEach.call(links, function (link) {
      var code = link.getAttribute('hreflang');
      if (frTarget) {
        // Adresse exacte fournie par la page (produit, catégorie) : ne plus y ajouter la requête.
        link.setAttribute('href', code === 'en' ? (frTarget === '/' ? '/en/' : '/en' + frTarget) : frTarget);
        link.setAttribute('data-exact', 'true');
        return;
      }
      if (link.getAttribute('data-exact')) return;
      var base = link.getAttribute('data-base') || link.getAttribute('href');
      link.setAttribute('data-base', base);
      link.setAttribute('href', base + window.location.search + window.location.hash);
    });
  }

  // Pages dont l’adresse dépend de la requête (produit, catégorie) : hreflang et sélecteur suivent le contenu.
  function setAlternates(frTarget) {
    var enTarget = frTarget === '/' ? '/en/' : '/en' + frTarget;
    var map = { fr: SITE + frTarget, en: SITE + enTarget, 'x-default': SITE + frTarget };
    Object.keys(map).forEach(function (code) {
      var link = document.querySelector('link[rel="alternate"][hreflang="' + code + '"]');
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'alternate');
        link.setAttribute('hreflang', code);
        document.head.appendChild(link);
      }
      link.setAttribute('href', map[code]);
    });
    syncSwitcher(frTarget);
  }

  function rememberChoice(event) {
    var link = event.target && event.target.closest ? event.target.closest('[data-lang-switch] a[hreflang]') : null;
    if (link) savePreference(link.getAttribute('hreflang'));
  }
  document.addEventListener('mousedown', rememberChoice, true);
  document.addEventListener('click', rememberChoice, true);
  document.addEventListener('keydown', function (event) { if (event.key === 'Enter') rememberChoice(event); }, true);
  document.addEventListener('DOMContentLoaded', function () { syncSwitcher(); });

  window.MDM_I18N = {
    lang: lang,
    t: t,
    tp: tp,
    path: path,
    absolute: absolute,
    money: money,
    moneyFromCents: moneyFromCents,
    formatDate: formatDate,
    product: product,
    cartLine: cartLine,
    apiError: apiError,
    setAlternates: setAlternates,
    rememberLanguage: function () { savePreference(lang); },
  };

  // Un visiteur qui a choisi l’anglais retrouve l’anglais sur les pages françaises (jamais l’inverse, jamais selon l’IP).
  if (lang === 'fr' && readPreference() === 'en' && !/^\/en(\/|$)/.test(window.location.pathname)) {
    var target = window.location.pathname === '/' ? '/en/' : '/en' + window.location.pathname;
    window.location.replace(target + window.location.search + window.location.hash);
  }
}());
