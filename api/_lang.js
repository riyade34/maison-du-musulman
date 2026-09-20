// Langue transmise par le navigateur (« fr » ou « en »). Liste blanche stricte :
// toute autre valeur (absente, inconnue, tableau, objet, chaîne piégée…) retombe sur « fr ».
// La valeur retournée n’est jamais celle reçue mais l’une des deux constantes ci-dessous.
const SUPPORTED_LANGS = ['fr', 'en'];

function normalizeLang(value) {
  return typeof value === 'string' && SUPPORTED_LANGS.includes(value) ? value : 'fr';
}

module.exports = { SUPPORTED_LANGS, normalizeLang };
