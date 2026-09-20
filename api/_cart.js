const products = require('../public/catalog.js');

function normalizeCart(cart) {
  if (!Array.isArray(cart) || cart.length === 0 || cart.length > 30) {
    throw new Error('Panier vide ou invalide');
  }

  return cart.map((item) => {
    const product = products.find((candidate) => candidate.id === item.id);
    const variant = product?.variants.find((candidate) => candidate.label === item.variant);
    const quantity = Number(item.qty);

    if (!product || !variant || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      throw new Error('Un article du panier est invalide');
    }

    // Version anglaise, utilisée uniquement pour l’affichage du Checkout en anglais (repli : français).
    const english = product.i18n && product.i18n.en;
    const englishVariant = english && english.variants && english.variants[variant.variant];

    return {
      id: product.id,
      name: product.name,
      variant: variant.label,
      unitAmount: Math.round(variant.price * 100),
      quantity,
      en: {
        name: (english && english.name) || product.name,
        variant: (englishVariant && englishVariant[1]) || variant.label,
      },
    };
  });
}

module.exports = { normalizeCart };
