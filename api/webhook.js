// Webhook Stripe — filet de sécurité qui garantit qu'une commande payée est
// TOUJOURS enregistrée, même si le client ferme l'onglet, perd sa connexion
// ou n'atteint jamais /succes.html après le paiement. api/finalize-order.js
// fait la même écriture au retour du client (pour un affichage instantané),
// et les deux sont sans risque de doublon grâce à la contrainte unique
// stripe_session_id + `resolution=ignore-duplicates` côté Supabase.
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { supabaseAdminRequest } = require('./_supabase');

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function recordPaidSession(session) {
  const userId = session.client_reference_id || session.metadata?.user_id || null;
  if (!userId) {
    // Le catalogue actuel exige un compte pour payer (voir api/create-checkout-session.js),
    // donc toute session sans user_id est anormale : on journalise sans écrire de ligne
    // invalide (orders.user_id est NOT NULL), plutôt que de faire échouer le webhook.
    console.error('Session payée sans user_id associé : commande NON enregistrée. Vérifier la configuration du checkout.');
    return;
  }

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 100,
    expand: ['data.price.product'],
  });

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
    user_id: userId,
    stripe_session_id: session.id,
    status: 'paid',
    currency: session.currency || 'eur',
    subtotal_cents: session.amount_subtotal || 0,
    shipping_cents: shippingLine?.amount_total || 0,
    total_cents: session.amount_total || 0,
    items,
    customer_email: session.customer_details?.email || null,
    shipping_address: shipping,
  };

  const insert = await supabaseAdminRequest('orders?on_conflict=stripe_session_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify(order),
  });

  if (!insert.ok) {
    const detail = await insert.text();
    throw new Error(`Échec de l'écriture Supabase (${insert.status}): ${detail}`);
  }

  const rows = await insert.json();
  if (rows.length === 0) {
    console.log('Commande déjà enregistrée (doublon webhook/finalize-order ignoré).');
  } else {
    console.log('Commande enregistrée via webhook.');
  }
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('Méthode non autorisée');
    return;
  }

  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    const rawBody = await readRawBody(req);
    if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET manquant côté serveur');
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    // Signature absente/invalide : on rejette sans traiter. C'est ce qui
    // empêche quiconque de POSTer un faux évènement "paiement réussi" sur
    // cette URL pour fabriquer une commande gratuite.
    console.error('Signature webhook invalide :', err.message);
    res.status(400).send('Signature webhook invalide');
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object;
        if (session.payment_status === 'paid') {
          await recordPaidSession(session);
        } else {
          console.log(`Session reçue avec payment_status=${session.payment_status}, en attente.`);
        }
        break;
      }
      case 'checkout.session.async_payment_failed':
      case 'checkout.session.expired':
        // Paiement annulé/expiré/échoué : aucune commande n'a été créée
        // puisqu'on n'écrit qu'au moment d'un paiement confirmé "paid".
        console.log(`Paiement non abouti (${event.type}).`);
        break;
      default:
        break;
    }
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Erreur de traitement du webhook :', err);
    // 500 pour que Stripe retente automatiquement ; l'écriture est
    // idempotente (contrainte unique stripe_session_id), un retry ne peut
    // donc jamais créer de commande en double.
    res.status(500).json({ error: 'Erreur interne' });
  }
}

// IMPORTANT : la signature Stripe doit être vérifiée sur le corps BRUT de la
// requête. Ce `config` doit être attaché à la fonction déjà définie (et non
// suivi d'une réaffectation de module.exports), sinon Vercel ignore le
// réglage, réanalyse le JSON automatiquement, et toute vérification de
// signature échoue silencieusement en production.
handler.config = { api: { bodyParser: false } };

module.exports = handler;
