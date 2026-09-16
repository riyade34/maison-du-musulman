const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { getAuthenticatedUser } = require('./_supabase');
const { normalizeCart } = require('./_cart');

const FREE_SHIPPING_THRESHOLD_CENTS = 4000;
const SHIPPING_FLAT_CENTS = 490;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  try {
    const authentication = await getAuthenticatedUser(req);
    if (!authentication) {
      res.status(401).json({ error: 'Connectez-vous avant de passer commande', code: 'AUTH_REQUIRED' });
      return;
    }

    const cart = normalizeCart(req.body?.cart);
    const line_items = cart.map((item) => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: `${item.name} — ${item.variant}`,
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
          product_data: { name: 'Livraison' },
          unit_amount: SHIPPING_FLAT_CENTS,
        },
        quantity: 1,
      });
    }

    const origin = req.headers.origin || 'https://maison-du-musulman.vercel.app';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      client_reference_id: authentication.user.id,
      customer_email: authentication.user.email,
      metadata: { user_id: authentication.user.id },
      success_url: `${origin}/succes.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/panier.html?paiement=annule`,
      shipping_address_collection: {
        allowed_countries: ['FR', 'BE', 'CH', 'LU'],
      },
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Erreur Stripe:', err);
    const isCartError = /panier|article/i.test(err.message || '');
    res.status(isCartError ? 400 : 500).json({ error: isCartError ? err.message : 'Erreur lors de la création du paiement' });
  }
};
