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

test('la vente réelle reste fermée par défaut jusqu’à validation du lancement', () => {
  const checkout = fs.readFileSync(path.join(__dirname, '../api/create-checkout-session.js'), 'utf8');
  const status = fs.readFileSync(path.join(__dirname, '../api/store-status.js'), 'utf8');
  const cart = fs.readFileSync(path.join(__dirname, '../public/panier.html'), 'utf8');
  assert.match(checkout, /process\.env\.STORE_OPEN !== 'true'/);
  assert.match(checkout, /code: 'STORE_CLOSED'/);
  assert.match(status, /open: process\.env\.STORE_OPEN === 'true'/);
  assert.match(cart, /Ouverture prochaine/);
  assert.match(cart, /\/api\/store-status/);
});

test('les pages essentielles et leurs liens existent', () => {
  const publicDir = path.join(__dirname, '../public');
  const required = ['index.html','boutique.html','categorie.html','produit.html','panier.html','succes.html','compte.html','recherche.html'];
  required.forEach((file) => assert.ok(fs.existsSync(path.join(publicDir, file)), file));
  const account = fs.readFileSync(path.join(publicDir, 'compte.html'), 'utf8');
  assert.match(account, /id="ordersList"/);
});

test('le SEO de base distingue les pages publiques des parcours privés', () => {
  const publicDir = path.join(__dirname, '../public');
  for (const file of ['index.html', 'boutique.html', 'categorie.html', 'produit.html', 'contact.html', 'livraison.html', 'qui-sommes-nous.html']) {
    const source = fs.readFileSync(path.join(publicDir, file), 'utf8');
    assert.match(source, /<meta name="description" content="[^"]+">/, `${file} doit avoir une description`);
  }
  for (const file of ['compte.html', 'panier.html', 'succes.html']) {
    const source = fs.readFileSync(path.join(publicDir, file), 'utf8');
    assert.match(source, /<meta name="robots" content="noindex,/i, `${file} ne doit pas être indexée`);
  }
  assert.match(fs.readFileSync(path.join(publicDir, 'categorie.html'), 'utf8'), /<h1[^>]*id="pageTitle"/);
  assert.match(fs.readFileSync(path.join(publicDir, 'panier.html'), 'utf8'), /<h1[^>]*>Mon panier<\/h1>/);
  // SEO : canonique + Open Graph sur les pages publiques, rien sur les parcours privés.
  const site = 'https://luniversducroyant.fr';
  const indexable = ['index.html', 'boutique.html', 'qui-sommes-nous.html', 'contact.html', 'livraison.html', 'mentions-legales.html', 'cgv.html', 'confidentialite.html', 'retours-remboursements.html'];
  for (const file of indexable) {
    const source = fs.readFileSync(path.join(publicDir, file), 'utf8');
    const expected = file === 'index.html' ? `${site}/` : `${site}/${file}`;
    assert.ok(source.includes(`<link rel="canonical" href="${expected}">`), `${file} doit avoir sa balise canonique`);
    assert.match(source, /<meta name="description" content="[^"]+">/, `${file} doit avoir une description`);
    assert.match(source, /<meta property="og:title" content="[^"]+">/, `${file} doit avoir og:title`);
    assert.match(source, /<meta property="og:image" content="https:\/\/luniversducroyant\.fr\/assets\/[^"]+">/, `${file} doit avoir og:image`);
    assert.match(source, /<meta name="twitter:card" content="summary_large_image">/, `${file} doit avoir twitter:card`);
  }
  for (const file of ['compte.html', 'panier.html', 'succes.html', 'retractation.html', 'recherche.html']) {
    const source = fs.readFileSync(path.join(publicDir, file), 'utf8');
    assert.doesNotMatch(source, /rel="canonical"/, `${file} (privé ou sans valeur SEO) ne doit pas avoir de canonique`);
    assert.match(source, /<meta name="robots" content="noindex,/i, `${file} ne doit pas être indexée`);
  }
  for (const file of ['produit.html', 'categorie.html']) {
    const source = fs.readFileSync(path.join(publicDir, file), 'utf8');
    assert.match(source, /<link rel="canonical" href="https:\/\/luniversducroyant\.fr\/[^"]+">/, `${file} doit avoir une canonique par défaut`);
    assert.match(source, /querySelector\('link\[rel="canonical"\]'\)\.href/, `${file} doit mettre à jour la canonique selon le contenu`);
  }
  assert.match(fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8'), /<script type="application\/ld\+json">[^<]*"@type":"Organization"/);
  assert.doesNotMatch(fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8'), /"@type":"Product"|"@type":"Offer"/, 'pas de données produit structurées tant que le catalogue n’est pas confirmé');

  // Sitemap et robots.txt : uniquement des pages publiques existantes.
  const sitemap = fs.readFileSync(path.join(publicDir, 'sitemap.xml'), 'utf8');
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.ok(locations.length >= 12);
  for (const location of locations) {
    assert.ok(location.startsWith(site), location);
    const page = location.slice(site.length).split('?')[0].replace(/^\//, '') || 'index.html';
    assert.ok(fs.existsSync(path.join(publicDir, page)), `${location} doit exister`);
    assert.doesNotMatch(page, /^(compte|panier|succes|retractation|recherche)\.html$/, `${location} ne doit pas figurer au sitemap`);
  }
  const robots = fs.readFileSync(path.join(publicDir, 'robots.txt'), 'utf8');
  assert.match(robots, /Sitemap: https:\/\/luniversducroyant\.fr\/sitemap\.xml/);
  assert.match(robots, /Disallow: \/api\//);
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

test('le panier affiché reprend prix, nom et icône du catalogue et neutralise le HTML stocké', () => {
  const vm = require('node:vm');
  const cart = fs.readFileSync(path.join(__dirname, '../public/panier.html'), 'utf8');
  assert.match(cart, /<script src="\/catalog\.js"><\/script>/);
  const start = cart.indexOf('function escapeHtml');
  const end = cart.indexOf('let cart = normalizeStoredCart');
  assert.ok(start > -1 && end > start, 'fonctions de normalisation introuvables');
  const products = require('../public/catalog.js');
  const context = { window: { PRODUCTS: products } };
  vm.createContext(context);
  vm.runInContext(cart.slice(start, end) + ';this.normalizeStoredCart = normalizeStoredCart; this.escapeHtml = escapeHtml;', context);
  const result = context.normalizeStoredCart([
    { id: 'qamis-homme', variant: 'M', price: 0.01, qty: 2, name: '<img src=x onerror=alert(1)>', icon: '<b>' },
    { id: 'qamis-homme', variant: 'M', price: 5, qty: 9 },
    { id: 'inconnu', variant: 'M', qty: 1 },
    { id: 'qamis-homme', variant: 'variante-inexistante', qty: 1 },
    { id: 'qamis-homme', variant: 'XL', qty: 0 },
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].price, 29.9);
  assert.equal(result[0].name, 'Qamis homme — Blanc');
  assert.equal(result[0].qty, 10);
  assert.equal(context.escapeHtml('<img src=x onerror="a">'), '&lt;img src=x onerror=&quot;a&quot;&gt;');
  // Un stockage local corrompu (objet, chaîne, null) ne doit jamais faire planter l'affichage du panier.
  for (const corrupted of [{ a: 1 }, 'texte', null, 42]) {
    const cleaned = context.normalizeStoredCart(corrupted);
    assert.ok(Array.isArray(cleaned) && cleaned.length === 0, `stockage corrompu ${JSON.stringify(corrupted)} ignoré`);
  }
});

test('la rétractation ne traite pas « _ » comme un joker pour retrouver une commande', async () => {
  const savedFetch = global.fetch;
  const savedEnv = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
  process.env.SUPABASE_URL = 'https://supabase.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test';
  delete require.cache[require.resolve('../api/_supabase')];
  delete require.cache[require.resolve('../api/withdrawal-request')];
  const handler = require('../api/withdrawal-request');
  const orderRow = { id: '11111111-1111-4111-8111-111111111111', user_id: 'u1', stripe_session_id: 'cs_live_abcdefgh1234', customer_email: 'client@example.com' };
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method || 'GET' });
    const reply = (data) => ({ ok: true, status: 200, json: async () => data });
    if (String(url).includes('/rest/v1/orders?')) return reply([orderRow]);
    if (String(url).includes('/rest/v1/withdrawal_requests?') && (options.method || 'GET') === 'GET') return reply([]);
    return reply([{ id: 1 }]);
  };
  const call = async (orderReference) => {
    const response = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(payload) { this.payload = payload; return this; },
      setHeader() {},
    };
    await handler({
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.7' },
      body: { orderReference, fullName: 'Client Test', email: 'client@example.com', scope: 'full' },
    }, response);
    return response;
  };
  try {
    const wildcard = await call('________');
    assert.equal(wildcard.statusCode, 404, 'un motif fait de « _ » ne doit désigner aucune commande');
    assert.ok(!calls.some((entry) => entry.method === 'POST'), 'aucune rétractation ne doit être enregistrée');
    const literal = await call('efgh1234');
    assert.equal(literal.statusCode, 201, 'la fin littérale de la référence Stripe reste acceptée');
    assert.match(literal.payload.reference, /^RET-/);
  } finally {
    global.fetch = savedFetch;
    if (savedEnv.url === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = savedEnv.url;
    if (savedEnv.key === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = savedEnv.key;
    delete require.cache[require.resolve('../api/_supabase')];
    delete require.cache[require.resolve('../api/withdrawal-request')];
  }
});

test('les images affichées aux visiteurs existent et restent légères', () => {
  const publicDir = path.join(__dirname, '../public');
  const maxBytes = 300 * 1024;
  let checked = 0;
  for (const page of fs.readdirSync(publicDir).filter((file) => file.endsWith('.html'))) {
    const source = fs.readFileSync(path.join(publicDir, page), 'utf8');
    for (const match of source.matchAll(/<img\b[^>]*\bsrc="(\/assets\/[^"]+)"/g)) {
      const file = path.join(publicDir, match[1]);
      assert.ok(fs.existsSync(file), `${page} : ${match[1]} doit exister`);
      assert.ok(fs.statSync(file).size <= maxBytes, `${page} : ${match[1]} dépasse ${maxBytes / 1024} Ko`);
      checked += 1;
    }
  }
  assert.ok(checked >= 10, 'les images de l’accueil et de la boutique doivent être contrôlées');
});

test('la clé d’administration Supabase est refusée hors production', async () => {
  const savedFetch = global.fetch;
  const saved = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY, env: process.env.VERCEL_ENV };
  process.env.SUPABASE_URL = 'https://supabase.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test';
  delete require.cache[require.resolve('../api/_supabase')];
  const { supabaseAdminRequest } = require('../api/_supabase');
  const calls = [];
  global.fetch = async (url) => { calls.push(String(url)); return { ok: true }; };
  try {
    for (const environment of ['preview', 'development']) {
      process.env.VERCEL_ENV = environment;
      await assert.rejects(() => supabaseAdminRequest('orders'), /hors production/, `clé refusée en ${environment}`);
    }
    assert.equal(calls.length, 0, 'aucune requête d’administration ne doit partir hors production');
    process.env.VERCEL_ENV = 'production';
    await supabaseAdminRequest('orders');
    assert.equal(calls.length, 1, 'la clé reste utilisable en production');
  } finally {
    global.fetch = savedFetch;
    for (const [name, value] of [['SUPABASE_URL', saved.url], ['SUPABASE_SERVICE_ROLE_KEY', saved.key], ['VERCEL_ENV', saved.env]]) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
    delete require.cache[require.resolve('../api/_supabase')];
  }
});

test('la marque affichée est « L’Univers du Croyant » et l’ancien nom visible a disparu', () => {
  const publicDir = path.join(__dirname, '../public');
  const files = fs.readdirSync(publicDir).filter(name => /\.(html|js|css)$/.test(name)).map(name => path.join(publicDir, name));
  files.push(path.join(__dirname, '../api/withdrawal-request.js'));
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /maison du musulman/i, `${path.basename(file)} affiche encore l’ancien nom`);
  }
  const home = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  assert.match(home, /<title>L’Univers du Croyant<\/title>/);
  assert.match(home, /<meta property="og:site_name" content="L’Univers du Croyant">/);
  assert.match(home, /"@type":"Organization"[^}]*"name":"L’Univers du Croyant"/);
});

test('les URLs publiques utilisent le domaine officiel et l’API l’accepte comme origine', () => {
  const publicDir = path.join(__dirname, '../public');
  const files = fs.readdirSync(publicDir).filter(name => /\.(html|js|css|txt|xml)$/.test(name));
  for (const name of files) {
    const source = fs.readFileSync(path.join(publicDir, name), 'utf8');
    assert.doesNotMatch(source, /maison-du-musulman\.vercel\.app/, `${name} pointe encore vers l’ancien domaine`);
  }
  for (const name of ['create-checkout-session.js', 'withdrawal-request.js']) {
    const source = fs.readFileSync(path.join(__dirname, '../api', name), 'utf8');
    assert.ok(source.includes("'https://luniversducroyant.fr',"), `${name} doit accepter le domaine officiel`);
  }
  const checkout = fs.readFileSync(path.join(__dirname, '../api/create-checkout-session.js'), 'utf8');
  assert.match(checkout, /ALLOWED_ORIGINS = \[\s*'https:\/\/luniversducroyant\.fr'/, 'le domaine officiel est l’origine de retour Stripe par défaut');
});
