const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { normalizeLang, SUPPORTED_LANGS } = require('../api/_lang');
const { normalizeCart } = require('../api/_cart');

const publicDir = path.join(__dirname, '../public');
const read = (file) => fs.readFileSync(path.join(publicDir, file), 'utf8');

function fakeResponse() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
    setHeader() {},
  };
}

test('la langue reçue du navigateur est limitée à « fr » et « en » (repli « fr »)', () => {
  assert.deepEqual([...SUPPORTED_LANGS], ['fr', 'en']);
  assert.equal(normalizeLang('fr'), 'fr');
  assert.equal(normalizeLang('en'), 'en');
  for (const invalid of [undefined, null, '', 'de', 'EN', 'En', 'fr-FR', 'en-GB', ' en', 'en ', '../en', '/en/', 'en\nfr', '<script>alert(1)</script>', ['en'], { toString: () => 'en' }, 1, true]) {
    assert.equal(normalizeLang(invalid), 'fr', `valeur refusée : ${JSON.stringify(invalid)}`);
  }
});

test('le navigateur envoie sa langue au paiement et à la rétractation (lang = fr ou en selon la page)', () => {
  for (const file of ['panier.html', 'en/panier.html']) {
    assert.match(read(file), /body: JSON\.stringify\(\{ cart, lang: I18N\.lang \}\)/, `${file} : langue envoyée avec le panier`);
  }
  for (const file of ['retractation.html', 'en/retractation.html']) {
    assert.match(read(file), /reason: form\.reason\.value\.trim\(\), lang: I18N\.lang \}/, `${file} : langue envoyée avec la rétractation`);
  }
  assert.match(read('en/panier.html'), /<html lang="en"/);
  assert.match(read('panier.html'), /<html lang="fr"/);
  // I18N.lang vaut exactement « fr » ou « en » (défini par <html lang>).
  const vm = require('node:vm');
  for (const [attribute, expected] of [['en', 'en'], ['fr', 'fr'], ['de', 'fr'], [null, 'fr']]) {
    const context = { window: { localStorage: { getItem: () => null, setItem() {} }, location: { pathname: '/', search: '', hash: '', replace() {} }, PRODUCTS: [] }, document: { documentElement: { getAttribute: () => attribute }, addEventListener() {}, querySelectorAll: () => [] } };
    context.window.window = context.window;
    vm.createContext(context);
    vm.runInContext(read('i18n.js'), context);
    assert.equal(context.window.MDM_I18N.lang, expected, `<html lang="${attribute}">`);
  }
});

test('le panier normalisé garde ses champs techniques et ajoute la version anglaise pour l’affichage', () => {
  const [item] = normalizeCart([{ id: 'chapelet-33', variant: 'Modèle unique', qty: 1 }]);
  assert.equal(item.id, 'chapelet-33');
  assert.equal(item.name, 'Chapelet compact (33 grains)');
  assert.equal(item.variant, 'Modèle unique');
  assert.equal(item.unitAmount, 690);
  assert.equal(item.quantity, 1);
  assert.deepEqual({ ...item.en }, { name: 'Compact tasbih (33 beads)', variant: 'Single model' });
});

/* --- Checkout : Stripe et Supabase simulés, aucun réseau, aucun paiement --- */
function loadCheckout({ storeOpen }) {
  const created = [];
  const stripePath = require.resolve('stripe');
  const supabasePath = require.resolve('../api/_supabase');
  const checkoutPath = require.resolve('../api/create-checkout-session');
  const saved = {
    stripe: require.cache[stripePath], supabase: require.cache[supabasePath], checkout: require.cache[checkoutPath],
    storeOpen: process.env.STORE_OPEN, vercelEnv: process.env.VERCEL_ENV,
  };
  const stub = (file, exports) => ({ id: file, filename: file, loaded: true, exports });
  require.cache[stripePath] = stub(stripePath, () => ({ checkout: { sessions: { create: async (params) => { created.push(params); return { url: 'https://checkout.stripe.test/session' }; } } } }));
  require.cache[supabasePath] = stub(supabasePath, { getAuthenticatedUser: async () => ({ user: { id: 'user-1', email: 'client@example.com' } }), supabaseAdminRequest: async () => { throw new Error('aucun appel Supabase attendu'); } });
  delete require.cache[checkoutPath];
  if (storeOpen) process.env.STORE_OPEN = 'true'; else delete process.env.STORE_OPEN;
  delete process.env.VERCEL_ENV;
  const handler = require('../api/create-checkout-session');
  const restore = () => {
    for (const [file, entry] of [[stripePath, saved.stripe], [supabasePath, saved.supabase], [checkoutPath, saved.checkout]]) {
      if (entry) require.cache[file] = entry; else delete require.cache[file];
    }
    if (saved.storeOpen === undefined) delete process.env.STORE_OPEN; else process.env.STORE_OPEN = saved.storeOpen;
    if (saved.vercelEnv === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = saved.vercelEnv;
  };
  return { handler, created, restore };
}

async function checkout(handler, body) {
  const response = fakeResponse();
  await handler({ method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://luniversducroyant.fr' }, body }, response);
  return response;
}
const CART = [{ id: 'chapelet-33', variant: 'Modèle unique', qty: 1 }];

test('Checkout : français → page Stripe en français, pages de retour françaises, libellés inchangés', async () => {
  const { handler, created, restore } = loadCheckout({ storeOpen: true });
  try {
    for (const body of [{ cart: CART, lang: 'fr' }, { cart: CART }]) {
      created.length = 0;
      const response = await checkout(handler, body);
      assert.equal(response.statusCode, 200);
      assert.equal(response.payload.url, 'https://checkout.stripe.test/session');
      const [params] = created;
      assert.equal(params.locale, 'fr');
      assert.equal(params.success_url, 'https://luniversducroyant.fr/succes.html?session_id={CHECKOUT_SESSION_ID}');
      assert.equal(params.cancel_url, 'https://luniversducroyant.fr/panier.html?paiement=annule');
      const [product, shipping] = params.line_items;
      assert.equal(product.price_data.product_data.name, 'Chapelet compact (33 grains) — Modèle unique');
      assert.equal('description' in product.price_data.product_data, false, 'aucune description ajoutée en français');
      assert.deepEqual({ ...product.price_data.product_data.metadata }, { product_id: 'chapelet-33', variant: 'Modèle unique' });
      assert.equal(product.price_data.unit_amount, 690);
      assert.equal(shipping.price_data.product_data.name, 'Livraison');
      assert.equal(shipping.price_data.unit_amount, 490);
      assert.equal(params.mode, 'payment');
      assert.deepEqual([...params.shipping_address_collection.allowed_countries], ['FR']);
    }
  } finally { restore(); }
});

test('Checkout : anglais → page Stripe en anglais (en-GB), retour vers /en/, données d’enregistrement inchangées', async () => {
  const { handler, created, restore } = loadCheckout({ storeOpen: true });
  try {
    const response = await checkout(handler, { cart: CART, lang: 'en' });
    assert.equal(response.statusCode, 200);
    const [params] = created;
    assert.equal(params.locale, 'en-GB');
    assert.equal(params.success_url, 'https://luniversducroyant.fr/en/succes.html?session_id={CHECKOUT_SESSION_ID}');
    assert.equal(params.cancel_url, 'https://luniversducroyant.fr/en/panier.html?paiement=annule');
    const [product, shipping] = params.line_items;
    // Ce que lisent le webhook et finalize-order.js reste identique : nom du produit, métadonnées et libellé « Livraison ».
    assert.equal(product.price_data.product_data.name, 'Chapelet compact (33 grains) — Modèle unique');
    assert.deepEqual({ ...product.price_data.product_data.metadata }, { product_id: 'chapelet-33', variant: 'Modèle unique' });
    assert.equal(shipping.price_data.product_data.name, 'Livraison');
    // Seul l’affichage change : description anglaise sous le nom.
    assert.equal(product.price_data.product_data.description, 'Compact tasbih (33 beads) — Single model');
    assert.equal(shipping.price_data.product_data.description, 'Delivery');
    assert.equal(product.price_data.unit_amount, 690);
    assert.equal(product.quantity, 1);
  } finally { restore(); }
});

test('Checkout : langue absente ou invalide → repli sur le français, jamais de valeur injectée', async () => {
  const { handler, created, restore } = loadCheckout({ storeOpen: true });
  try {
    for (const lang of ['de', 'EN', 'en-GB', '../../evil', '/en/', '<img src=x onerror=alert(1)>', ['en'], { lang: 'en' }, 0, null]) {
      created.length = 0;
      const response = await checkout(handler, { cart: CART, lang });
      assert.equal(response.statusCode, 200, JSON.stringify(lang));
      const [params] = created;
      assert.equal(params.locale, 'fr', `locale pour ${JSON.stringify(lang)}`);
      assert.equal(params.success_url, 'https://luniversducroyant.fr/succes.html?session_id={CHECKOUT_SESSION_ID}');
      assert.equal(params.cancel_url, 'https://luniversducroyant.fr/panier.html?paiement=annule');
      assert.equal('description' in params.line_items[0].price_data.product_data, false);
    }
  } finally { restore(); }
});

test('Checkout : la boutique fermée refuse toujours (STORE_CLOSED), quelle que soit la langue, sans appeler Stripe', async () => {
  const { handler, created, restore } = loadCheckout({ storeOpen: false });
  try {
    for (const lang of ['fr', 'en', 'xx', undefined]) {
      const response = await checkout(handler, { cart: CART, lang });
      assert.equal(response.statusCode, 503);
      assert.equal(response.payload.code, 'STORE_CLOSED');
    }
    assert.equal(created.length, 0, 'aucune session Stripe créée');
  } finally { restore(); }
});

/* --- E-mail de rétractation : fetch simulé, aucun vrai e-mail, aucune vraie demande --- */
async function withdraw(lang, index) {
  const savedFetch = global.fetch;
  const names = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'WITHDRAWAL_NOTIFICATION_EMAIL', 'VERCEL_ENV'];
  const saved = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  Object.assign(process.env, {
    SUPABASE_URL: 'https://supabase.test', SUPABASE_SERVICE_ROLE_KEY: 'service-role-test',
    RESEND_API_KEY: 'cle-factice-pour-test-uniquement', RESEND_FROM_EMAIL: 'Test <expediteur@test.example>',
    WITHDRAWAL_NOTIFICATION_EMAIL: 'boutique@test.example',
  });
  delete process.env.VERCEL_ENV;
  delete require.cache[require.resolve('../api/_supabase')];
  delete require.cache[require.resolve('../api/withdrawal-request')];
  const handler = require('../api/withdrawal-request');
  const orderRow = { id: '11111111-1111-4111-8111-111111111111', user_id: 'u1', stripe_session_id: 'cs_live_abcdefgh1234', customer_email: 'client@example.com' };
  const emails = [];
  const urls = [];
  global.fetch = async (url, options = {}) => {
    urls.push(String(url));
    const reply = (data) => ({ ok: true, status: 200, json: async () => data });
    if (String(url) === 'https://api.resend.com/emails') { emails.push(JSON.parse(options.body)); return reply({ id: 'email-factice' }); }
    if (String(url).includes('/rest/v1/orders?')) return reply([orderRow]);
    if (String(url).includes('/rest/v1/withdrawal_requests?') && (options.method || 'GET') === 'GET') return reply([]);
    return reply([{ id: 1 }]);
  };
  const response = fakeResponse();
  try {
    const body = { orderReference: 'efgh1234', fullName: 'Client Test', email: 'client@example.com', scope: 'partial' };
    if (lang !== undefined) body.lang = lang;
    await handler({ method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': `203.0.113.${index}` }, body }, response);
  } finally {
    global.fetch = savedFetch;
    for (const name of names) { if (saved[name] === undefined) delete process.env[name]; else process.env[name] = saved[name]; }
    delete require.cache[require.resolve('../api/_supabase')];
    delete require.cache[require.resolve('../api/withdrawal-request')];
  }
  assert.ok(urls.every((url) => url.startsWith('https://supabase.test/') || url === 'https://api.resend.com/emails'), 'aucun appel réseau réel');
  return { response, emails };
}

test('Rétractation : lang = en → accusé au client en anglais, notification interne en français', async () => {
  const { response, emails } = await withdraw('en', 11);
  assert.equal(response.statusCode, 201);
  assert.equal(response.payload.emailSent, true);
  assert.equal(emails.length, 2);
  const [customer, internal] = emails;
  assert.deepEqual(customer.to, ['client@example.com']);
  assert.match(customer.subject, /^Acknowledgement of receipt of your withdrawal RET-[0-9A-F]{8}$/);
  assert.match(customer.text, /^Your withdrawal request has been recorded\.\n\nReference: RET-[0-9A-F]{8}\nOrder: efgh1234\nScope: part of the order\nDate: /);
  assert.match(customer.text, /Please keep this email\. The return instructions are available on the L’Univers du Croyant website\.$/);
  assert.doesNotMatch(customer.text + customer.subject, /[àâçéèêëîïôùûü]|rétractation|Référence/i, 'aucun texte français dans l’e-mail client anglais');
  assert.deepEqual(internal.to, ['boutique@test.example']);
  assert.match(internal.subject, /^Nouvelle rétractation RET-/);
  assert.match(internal.text, /^Une demande a été enregistrée\./);
});

test('Rétractation : lang = fr, absente ou invalide → accusé client en français inchangé', async () => {
  let index = 20;
  for (const lang of ['fr', undefined, 'de', 'EN', 'en-GB', '<script>', ['en']]) {
    const { response, emails } = await withdraw(lang, index += 1);
    assert.equal(response.statusCode, 201, JSON.stringify(lang));
    const [customer, internal] = emails;
    assert.match(customer.subject, /^Accusé de réception de votre rétractation RET-[0-9A-F]{8}$/, JSON.stringify(lang));
    assert.match(customer.text, /^Votre demande de rétractation a été enregistrée\.\n\nRéférence : RET-[0-9A-F]{8}\nCommande : efgh1234\nPortée : une partie de la commande\nDate : /);
    assert.match(customer.text, /Conservez cet e-mail\. Les modalités de retour sont disponibles sur le site L’Univers du Croyant\.$/);
    assert.match(internal.subject, /^Nouvelle rétractation RET-/);
  }
});

test('les deux versions de l’accusé transmettent les mêmes informations', async () => {
  const fr = (await withdraw('fr', 40)).emails[0].text;
  const en = (await withdraw('en', 41)).emails[0].text;
  const lines = (text) => text.split('\n').filter(Boolean);
  assert.equal(lines(fr).length, lines(en).length, 'même structure (annonce, référence, commande, portée, date, conservation)');
  for (const email of [fr, en]) {
    assert.match(email, /RET-[0-9A-F]{8}/);
    assert.match(email, /efgh1234/);
  }
});

test('rien de sensible n’a changé : clés, webhook, enregistrement des commandes et libellés lus par Stripe', () => {
  const apiDir = path.join(__dirname, '../api');
  const src = (name) => fs.readFileSync(path.join(apiDir, name), 'utf8');
  assert.doesNotMatch(src('withdrawal-request.js') + src('create-checkout-session.js') + src('_lang.js'), /sk_live|sk_test|whsec_|re_[A-Za-z0-9]{10,}/, 'aucun secret dans le code');
  assert.match(src('webhook.js'), /line\.description === 'Livraison'/);
  assert.match(src('finalize-order.js'), /line\.description === 'Livraison'/);
  assert.match(src('webhook.js'), /name: line\.price\.product\.name/);
  assert.match(src('create-checkout-session.js'), /product_data: \{ name: 'Livraison'/);
  assert.match(src('create-checkout-session.js'), /process\.env\.STORE_OPEN !== 'true'/);
  assert.match(src('withdrawal-request.js'), /const apiKey = process\.env\.RESEND_API_KEY;/);
  assert.match(src('withdrawal-request.js'), /const notificationEmail = process\.env\.WITHDRAWAL_NOTIFICATION_EMAIL;/);
});
