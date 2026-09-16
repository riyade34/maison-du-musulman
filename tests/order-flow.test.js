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

test('les pages essentielles et leurs liens existent', () => {
  const publicDir = path.join(__dirname, '../public');
  const required = ['index.html','boutique.html','categorie.html','produit.html','panier.html','succes.html','compte.html','recherche.html'];
  required.forEach((file) => assert.ok(fs.existsSync(path.join(publicDir, file)), file));
  const account = fs.readFileSync(path.join(publicDir, 'compte.html'), 'utf8');
  assert.match(account, /id="ordersList"/);
});
