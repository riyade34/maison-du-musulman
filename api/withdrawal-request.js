const crypto = require('node:crypto');
const { supabaseAdminRequest } = require('./_supabase');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REFERENCE_PATTERN = /^[A-Za-z0-9_-]{8,80}$/;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 8;
const rateBuckets = new Map();

const ALLOWED_ORIGINS = new Set([
  'https://luniversducroyant.fr',
  'https://maison-du-musulman.vercel.app',
  ...(process.env.SITE_URL ? [process.env.SITE_URL] : []),
  ...(process.env.VERCEL_ENV !== 'production' ? ['http://localhost:3000'] : []),
]);

function clean(value, max) { return String(value || '').trim().slice(0, max); }

function requestIsSameSite(req) {
  const origin = req.headers.origin;
  const fetchSite = req.headers['sec-fetch-site'];
  if (origin && !ALLOWED_ORIGINS.has(origin)) return false;
  return !fetchSite || fetchSite === 'same-origin' || fetchSite === 'none';
}

function requestIsRateLimited(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const key = forwarded || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const recent = (rateBuckets.get(key) || []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  rateBuckets.set(key, recent);

  // Évite qu'une instance chaude conserve indéfiniment d'anciennes adresses.
  if (rateBuckets.size > 500) {
    for (const [address, timestamps] of rateBuckets) {
      if (!timestamps.some((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS)) rateBuckets.delete(address);
    }
  }
  return recent.length > RATE_LIMIT_MAX_REQUESTS;
}

async function sendEmail({ to, subject, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return false;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, text }),
  });
  if (!response.ok) throw new Error(`Resend a refusé l'envoi (${response.status})`);
  return true;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Méthode non autorisée' }); return; }
  if (!requestIsSameSite(req)) { res.status(403).json({ error: 'Origine non autorisée.' }); return; }
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) {
    res.status(415).json({ error: 'Le contenu doit être envoyé au format JSON.' }); return;
  }
  if (requestIsRateLimited(req)) {
    res.setHeader('Retry-After', '900');
    res.status(429).json({ error: 'Trop de tentatives. Réessayez dans quelques minutes.' }); return;
  }
  try {
    const orderReference = clean(req.body?.orderReference, 80);
    const fullName = clean(req.body?.fullName, 160);
    const email = clean(req.body?.email, 254).toLowerCase();
    const scope = req.body?.scope === 'partial' ? 'partial' : 'full';
    const items = clean(req.body?.items, 1000);
    const reason = clean(req.body?.reason, 1000);
    if (fullName.length < 2 || (!UUID_PATTERN.test(orderReference) && !REFERENCE_PATTERN.test(orderReference)) || !EMAIL_PATTERN.test(email)) {
      res.status(400).json({ error: 'Référence ou adresse e-mail invalide.' }); return;
    }
    const filter = UUID_PATTERN.test(orderReference)
      ? `id=eq.${encodeURIComponent(orderReference)}`
      : `stripe_session_id=like.*${encodeURIComponent(orderReference)}`;
    const lookup = await supabaseAdminRequest(`orders?${filter}&select=id,user_id,stripe_session_id,customer_email,created_at,status,items&limit=2`);
    if (!lookup.ok) throw new Error(`Lecture commande impossible (${lookup.status})`);
    const orders = await lookup.json();
    // Le filtre `like` traite « _ » comme un joker : on ne retient que les commandes dont la référence correspond littéralement.
    const matches = UUID_PATTERN.test(orderReference) ? orders : orders.filter((row) => String(row.stripe_session_id || '').endsWith(orderReference));
    const order = matches.length === 1 && String(matches[0].customer_email || '').toLowerCase() === email ? matches[0] : null;
    if (!order) { res.status(404).json({ error: 'Aucune commande ne correspond à cette référence et cette adresse e-mail.' }); return; }
    const existing = await supabaseAdminRequest(`withdrawal_requests?stripe_session_id=eq.${encodeURIComponent(order.stripe_session_id)}&select=order_reference&limit=1`);
    if (!existing.ok) throw new Error(`Vérification de doublon impossible (${existing.status})`);
    const existingRows = await existing.json();
    if (existingRows.length) { res.status(409).json({ error: `Une demande de rétractation existe déjà pour cette commande (${existingRows[0].order_reference}).` }); return; }
    const reference = `RET-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
    const createdAt = new Date();
    const withdrawal = {
      user_id: order.user_id,
      stripe_session_id: order.stripe_session_id,
      order_reference: reference,
      full_name: fullName,
      reason: [`Portée: ${scope === 'full' ? 'commande entière' : 'partielle'}`, items ? `Produits: ${items}` : null, reason ? `Motif facultatif: ${reason}` : null].filter(Boolean).join('\n'),
      status: 'received',
      created_at: createdAt.toISOString(),
    };
    const insert = await supabaseAdminRequest('withdrawal_requests', {
      method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(withdrawal),
    });
    if (!insert.ok) throw new Error(`Enregistrement impossible (${insert.status})`);
    const rows = await insert.json();
    if (!rows.length) throw new Error('La base n’a pas confirmé l’enregistrement');
    let emailSent = false;
    try {
      const customerText = `Votre demande de rétractation a été enregistrée.\n\nRéférence : ${reference}\nCommande : ${orderReference}\nPortée : ${scope === 'full' ? 'toute la commande' : 'une partie de la commande'}\nDate : ${createdAt.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}\n\nConservez cet e-mail. Les modalités de retour sont disponibles sur le site L’Univers du Croyant.`;
      emailSent = await sendEmail({ to: email, subject: `Accusé de réception de votre rétractation ${reference}`, text: customerText });
      const notificationEmail = process.env.WITHDRAWAL_NOTIFICATION_EMAIL;
      if (emailSent && notificationEmail && EMAIL_PATTERN.test(notificationEmail)) {
        await sendEmail({ to: notificationEmail, subject: `Nouvelle rétractation ${reference}`, text: `Une demande a été enregistrée.\nRéférence : ${reference}\nCommande : ${order.id}\nClient : ${fullName} — ${email}\nPortée : ${scope}\nProduits : ${items || 'toute la commande'}\nMotif facultatif : ${reason || 'non renseigné'}` });
      }
    } catch (emailError) { console.error('Accusé de réception Resend non envoyé:', emailError.message); }
    if (emailSent) {
      await supabaseAdminRequest(`withdrawal_requests?stripe_session_id=eq.${encodeURIComponent(order.stripe_session_id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'acknowledged' }) });
    }
    res.status(201).json({ reference, emailSent });
  } catch (error) {
    console.error('Erreur demande de rétractation:', error.message);
    res.status(500).json({ error: 'La demande n’a pas pu être enregistrée. Réessayez ou contactez le vendeur.' });
  }
};
