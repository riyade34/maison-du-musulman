const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  try {
    const { cart } = req.body;

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      res.status(400).json({ error: 'Panier vide ou invalide' });
      return;
    }

    const line_items = cart.map((item) => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: `${item.name} — ${item.variant}`,
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.qty,
    }));

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const FREE_SHIPPING_THRESHOLD = 40;
    const SHIPPING_FLAT = 4.9;

    if (subtotal < FREE_SHIPPING_THRESHOLD) {
      line_items.push({
        price_data: {
          currency: 'eur',
          product_data: { name: 'Livraison' },
          unit_amount: Math.round(SHIPPING_FLAT * 100),
        },
        quantity: 1,
      });
    }

    const origin = req.headers.origin || 'https://votre-site.vercel.app';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${origin}/succes.html`,
      cancel_url: `${origin}/panier.html`,
      shipping_address_collection: {
        allowed_countries: ['FR', 'BE', 'CH', 'LU'],
      },
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Erreur Stripe:', err);
    res.status(500).json({ error: 'Erreur lors de la création du paiement' });
  }
};
