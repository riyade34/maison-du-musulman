const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { normalizeCart } = require('../api/_cart');

test('le serveur ignore un prix falsifié et reprend le prix catalogue', () => {
  const [item] = normalizeCart([{ id: 'qamis-homme', variant: 'M', price: 0.01, qty: 2 }]);
  assert.equal(item.unitAmount, 2990);
  assert.equal(item.quantity, 2);
});

test('le serveur refuse les produits, variantes et quantités invalides', () => {
  assert.throws(() => normalizeCart([]), /Panier/);
  assert.throws(() => normalizeCart([{ id: 'inconnu', variant: 'M', qty: 1 }]), /invalide/);
  assert.throws(() => normalizeCart([{ id: 'qamis-homme', variant: 'inconnue', qty: 1 }]), /invalide/);
  assert.throws(() => normalizeCart([{ id: 'qamis-homme', variant: 'M', qty: 0 }]), /invalide/);
  assert.throws(() => normalizeCart([{ id: 'qamis-homme', variant: 'M', qty: 11 }]), /invalide/);
});

test('le retour Stripe contient un session_id et la protection anti-doublon', () => {
  const checkout = fs.readFileSync(path.join(__dirname, '../api/create-checkout-session.js'), 'utf8');
  const finalize = fs.readFileSync(path.join(__dirname, '../api/finalize-order.js'), 'utf8');
  const sql = fs.readFileSync(path.join(__dirname, '../supabase-orders.sql'), 'utf8');
  assert.match(checkout, /session_id=\{CHECKOUT_SESSION_ID\}/);
  assert.match(finalize, /on_conflict=stripe_session_id/);
  assert.match(sql, /stripe_session_id text not null unique/);
});

test('le webhook Stripe garde bodyParser désactivé (nécessaire à la vérification de signature)', () => {
  // Régression : `module.exports.config = {...}` suivi plus loin d'une
  // réaffectation `module.exports = async (req,res) => {...}` écrase le
  // config attaché plus haut. Résultat en production : Vercel reparse le
  // JSON, le corps n'est plus "brut", et stripe.webhooks.constructEvent()
  // échoue silencieusement sur CHAQUE paiement. On vérifie le comportement
  // réel du module exporté, pas juste une regex sur le texte du fichier.
  process.env.STRIPE_SECRET_KEY ||= 'sk_test_123';
  delete require.cache[require.resolve('../api/webhook')];
  const handler = require('../api/webhook');
  assert.equal(typeof handler, 'function');
  assert.equal(handler.config?.api?.bodyParser, false);
});

test('la livraison de lancement est limitée à la France et cohérente avec la page publique', () => {
  const checkout = fs.readFileSync(path.join(__dirname, '../api/create-checkout-session.js'), 'utf8');
  const shipping = fs.readFileSync(path.join(__dirname, '../public/livraison.html'), 'utf8');
  assert.match(checkout, /allowed_countries:\s*\['FR'\]/);
  assert.doesNotMatch(checkout, /allowed_countries:[^\n]*'CH'/);
  assert.match(shipping, /Livraison en France métropolitaine/);
  assert.doesNotMatch(shipping, /accepte actuellement des adresses en France, Belgique, Suisse/);
});

test('les réponses webhook ne divulguent pas le détail des erreurs de signature', () => {
  const webhook = fs.readFileSync(path.join(__dirname, '../api/webhook.js'), 'utf8');
  assert.match(webhook, /send\('Signature webhook invalide'\)/);
  assert.doesNotMatch(webhook, /send\(`Webhook Error: \$\{err\.message\}`\)/);
});

test('Vercel publie une politique de sécurité du contenu', () => {
  const vercel = JSON.parse(fs.readFileSync(path.join(__dirname, '../vercel.json'), 'utf8'));
  const headers = vercel.headers[0].headers;
  const csp = headers.find((header) => header.key === 'Content-Security-Policy');
  assert.ok(csp);
  assert.match(csp.value, /frame-ancestors 'none'/);
  assert.match(csp.value, /connect-src 'self' https:\/\/\*\.supabase\.co https:\/\/formspree\.io/);
});

test('les quantités côté interface restent alignées avec la limite serveur', () => {
  const product = fs.readFileSync(path.join(__dirname, '../public/produit.html'), 'utf8');
  const cart = fs.readFileSync(path.join(__dirname, '../public/panier.html'), 'utf8');
  assert.match(product, /if \(qty < 10\) qty\+\+/);
  assert.match(product, /Math\.min\(10,/);
  assert.match(cart, /Math\.min\(10,/);
});

test('la création de session Stripe restreint les origines de redirection (anti open-redirect)', () => {
  const source = fs.readFileSync(path.join(__dirname, '../api/create-checkout-session.js'), 'utf8');
  assert.match(source, /ALLOWED_ORIGINS/, 'doit valider req.headers.origin contre une liste blanche');
  assert.doesNotMatch(
    source,
    /const origin = req\.headers\.origin \|\|/,
    'ne doit plus faire confiance directement à req.headers.origin sans liste blanche'
  );
});

test('les pages essentielles et leurs liens existent', () => {
  const publicDir = path.join(__dirname, '../public');
  const required = ['index.html','boutique.html','categorie.html','produit.html','panier.html','succes.html','compte.html','recherche.html'];
  required.forEach((file) => assert.ok(fs.existsSync(path.join(publicDir, file)), file));
  const account = fs.readFileSync(path.join(publicDir, 'compte.html'), 'utf8');
  assert.match(account, /id="ordersList"/);
});

test('les pages légales, la rétractation en ligne et les liens de footer sont présents', () => {
  const publicDir = path.join(__dirname, '../public');
  const legalPages = ['mentions-legales.html', 'cgv.html', 'confidentialite.html', 'retours-remboursements.html', 'retractation.html'];
  legalPages.forEach((file) => assert.ok(fs.existsSync(path.join(publicDir, file)), file));
  const withdrawal = fs.readFileSync(path.join(publicDir, 'retractation.html'), 'utf8');
  assert.match(withdrawal, /Renoncer au contrat ici/);
  assert.match(withdrawal, /\/api\/withdrawal-request/);
  for (const file of ['index.html', 'boutique.html', 'contact.html', 'livraison.html', 'qui-sommes-nous.html']) {
    const source = fs.readFileSync(path.join(publicDir, file), 'utf8');
    assert.match(source, /\/mentions-legales\.html/, `${file} doit lier les mentions légales`);
    assert.match(source, /\/retractation\.html/, `${file} doit lier la fonctionnalité de rétractation`);
  }
});

test('le panier affiche les informations précontractuelles et une obligation de paiement explicite', () => {
  const cart = fs.readFileSync(path.join(__dirname, '../public/panier.html'), 'utf8');
  assert.match(cart, /Commander et payer/);
  assert.match(cart, /Livraison[^<]*:/);
  assert.match(cart, /Rétractation[^<]*:/);
  assert.match(cart, /\/cgv\.html/);
});

test('l’API de rétractation contrôle la commande, l’e-mail, les doublons et l’accusé Resend', () => {
  const source = fs.readFileSync(path.join(__dirname, '../api/withdrawal-request.js'), 'utf8');
  assert.match(source, /customer_email/);
  assert.match(source, /withdrawal_requests\?stripe_session_id=eq/);
  assert.match(source, /RESEND_API_KEY/);
  assert.match(source, /RESEND_FROM_EMAIL/);
  assert.match(source, /status: 'acknowledged'/);
  assert.match(source, /requestIsSameSite/);
  assert.match(source, /RATE_LIMIT_MAX_REQUESTS/);
  assert.match(source, /status\(429\)/);
});

test('l’API de rétractation rejette une origine tierce', async () => {
  const handler = require('../api/withdrawal-request');
  const response = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };
  await handler({
    method: 'POST',
    headers: { origin: 'https://site-malveillant.example', 'content-type': 'application/json' },
    body: {},
  }, response);
  assert.equal(response.statusCode, 403);
  assert.match(response.payload.error, /Origine non autorisée/);
});

test('l’API de rétractation exige du JSON', async () => {
  const handler = require('../api/withdrawal-request');
  const response = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };
  await handler({ method: 'POST', headers: {}, body: {} }, response);
  assert.equal(response.statusCode, 415);
});
