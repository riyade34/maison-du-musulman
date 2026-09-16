const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { getAuthenticatedUser, supabaseAdminRequest } = require('./_supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  try {
    const authentication = await getAuthenticatedUser(req);
    if (!authentication) {
      res.status(401).json({ error: 'Session client expirée' });
      return;
    }

    const sessionId = req.body?.sessionId;
    if (!sessionId || !/^cs_(test|live)_/.test(sessionId)) {
      res.status(400).json({ error: 'Session Stripe invalide' });
      return;
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
      limit: 100,
      expand: ['data.price.product'],
    });

    if (session.payment_status !== 'paid' || session.status !== 'complete') {
      res.status(409).json({ error: 'Le paiement n’est pas confirmé', code: 'PAYMENT_NOT_PAID' });
      return;
    }

    if (session.client_reference_id !== authentication.user.id || session.metadata?.user_id !== authentication.user.id) {
      res.status(403).json({ error: 'Cette commande n’appartient pas à ce compte' });
      return;
    }

    const items = lineItems.data
      .filter((line) => line.price?.product?.metadata?.product_id)
      .map((line) => ({
        product_id: line.price.product.metadata.product_id,
        name: line.price.product.name,
        variant: line.price.product.metadata.variant,
        quantity: line.quantity,
        unit_amount: line.price.unit_amount,
        amount_total: line.amount_total,
      }));

    const shippingLine = lineItems.data.find((line) => line.description === 'Livraison');
    const shipping = session.shipping_details || session.collected_information?.shipping_details || null;
    const order = {
      user_id: authentication.user.id,
      stripe_session_id: session.id,
      status: 'paid',
      currency: session.currency || 'eur',
      subtotal_cents: session.amount_subtotal || 0,
      shipping_cents: shippingLine?.amount_total || 0,
      total_cents: session.amount_total || 0,
      items,
      customer_email: session.customer_details?.email || authentication.user.email,
      shipping_address: shipping,
    };

    const insert = await supabaseAdminRequest('orders?on_conflict=stripe_session_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
      body: JSON.stringify(order),
    });

    if (!insert.ok) {
      const detail = await insert.text();
      console.error('Erreur Supabase:', detail);
      res.status(500).json({ error: 'La commande payée n’a pas pu être enregistrée' });
      return;
    }

    let rows = await insert.json();
    const duplicate = rows.length === 0;
    if (duplicate) {
      const existing = await supabaseAdminRequest(`orders?stripe_session_id=eq.${encodeURIComponent(session.id)}&select=*`);
      if (!existing.ok) throw new Error('Impossible de relire la commande existante');
      rows = await existing.json();
    }

    res.status(200).json({ order: rows[0], duplicate });
  } catch (error) {
    console.error('Erreur finalisation commande:', error);
    res.status(500).json({ error: 'Impossible de finaliser la commande' });
  }
};
