const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { getAuthenticatedUser } = require('./_supabase');
const { normalizeCart } = require('./_cart');
const { normalizeLang } = require('./_lang');

const FREE_SHIPPING_THRESHOLD_CENTS = 4000;
const SHIPPING_FLAT_CENTS = 490;

// Liste blanche des origines autorisées à recevoir la redirection Stripe.
// Sans ça, un appel forgé avec un en-tête Origin arbitraire pourrait faire
// rediriger le client (après un vrai paiement) vers un site tiers une fois
// le paiement terminé (open redirect / hameçonnage post-paiement).
const ALLOWED_ORIGINS = [
  'https://luniversducroyant.fr',
  'https://maison-du-musulman.vercel.app',
  ...(process.env.SITE_URL ? [process.env.SITE_URL] : []),
  ...(process.env.VERCEL_ENV !== 'production' ? ['http://localhost:3000'] : []),
];

function resolveOrigin(req) {
  const requested = req.headers.origin;
  if (requested && ALLOWED_ORIGINS.includes(requested)) return requested;
  return ALLOWED_ORIGINS[0];
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) {
    res.status(415).json({ error: 'Le contenu doit être envoyé au format JSON' });
    return;
  }
  // Fermé par défaut : l'ouverture commerciale exige une décision explicite
  // après validation de l'identité du vendeur, des fournisseurs et de la logistique.
  if (process.env.STORE_OPEN !== 'true') {
    res.status(503).json({
      error: 'La boutique est en préparation. Le paiement sera ouvert prochainement.',
      code: 'STORE_CLOSED',
    });
    return;
  }

  try {
    const authentication = await getAuthenticatedUser(req);
    if (!authentication) {
      res.status(401).json({ error: 'Connectez-vous avant de passer commande', code: 'AUTH_REQUIRED' });
      return;
    }

    const cart = normalizeCart(req.body?.cart);
    // Langue du visiteur : « fr » ou « en » uniquement (repli « fr »). Elle ne pilote que la langue de la page
    // Stripe Checkout, une description anglaise affichée sous le nom du produit et les pages de retour.
    // Les noms enregistrés (product_data.name) et la ligne « Livraison » restent en français : le webhook
    // et finalize-order.js s’en servent pour enregistrer la commande.
    const lang = normalizeLang(req.body?.lang);
    const english = lang === 'en';
    const line_items = cart.map((item) => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: `${item.name} — ${item.variant}`,
          ...(english ? { description: `${item.en.name} — ${item.en.variant}` } : {}),
          metadata: { product_id: item.id, variant: item.variant },
        },
        unit_amount: item.unitAmount,
      },
      quantity: item.quantity,
    }));

    const subtotal = cart.reduce((sum, item) => sum + item.unitAmount * item.quantity, 0);

    if (subtotal < FREE_SHIPPING_THRESHOLD_CENTS) {
      line_items.push({
        price_data: {
          currency: 'eur',
          product_data: { name: 'Livraison', ...(english ? { description: 'Delivery' } : {}) },
          unit_amount: SHIPPING_FLAT_CENTS,
        },
        quantity: 1,
      });
    }

    const origin = resolveOrigin(req);
    const pathPrefix = english ? '/en' : '';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      client_reference_id: authentication.user.id,
      customer_email: authentication.user.email,
      metadata: { user_id: authentication.user.id },
      // Langue de la page Stripe Checkout : français ou anglais britannique (valeurs officielles de l’API Stripe).
      locale: english ? 'en-GB' : 'fr',
      success_url: `${origin}${pathPrefix}/succes.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${pathPrefix}/panier.html?paiement=annule`,
      shipping_address_collection: {
        // L'offre de lancement publiée couvre uniquement la France.
        // Les autres pays seront réactivés quand frais, TVA et douanes auront été validés.
        allowed_countries: ['FR'],
      },
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Erreur Stripe:', err);
    const isCartError = /panier|article/i.test(err.message || '');
    res.status(isCartError ? 400 : 500).json({ error: isCartError ? err.message : 'Erreur lors de la création du paiement' });
  }
};
