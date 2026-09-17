# À faire avant lancement

Mise à jour du 17 septembre 2026.

## Code et sécurité

- [x] Les prix, variantes et quantités sont recalculés et validés côté serveur.
- [x] Les quantités sont limitées à 10 côté interface et côté serveur.
- [x] Le webhook Stripe vérifie la signature sur le corps brut et reste idempotent.
- [x] Les erreurs techniques du webhook ne sont pas renvoyées au client.
- [x] Les identifiants de session Stripe ne sont plus écrits dans les logs applicatifs.
- [x] Les origines de redirection Stripe sont limitées à la liste blanche du site.
- [x] Les endpoints JSON refusent les autres types de contenu.
- [x] Les en-têtes HTTP de sécurité incluent une Content-Security-Policy.
- [x] Audit des dépendances : aucune vulnérabilité connue.
- [x] 15 tests automatisés passent.
- [x] Responsive contrôlé sur les parcours principaux ; débordements mobiles corrigés.

## Livraison et catalogue

- [x] Livraison limitée à la France métropolitaine pour le lancement.
- [ ] Confirmer le vrai prix du flacon d'huile de nigelle 30 ml (1,05 € actuellement). Ne pas le modifier sans source fiable.

## GitHub et Vercel

- [ ] Pousser le commit final sur `main`.
- [ ] Vérifier le nouveau déploiement Vercel et ses logs après le push.
- [x] Projet Vercel relié au bon dépôt et à la branche `main`.
- [x] Domaine `maison-du-musulman.vercel.app` actif.
- [x] Runtime Node.js 24.x et dossier de sortie `public`.
- [x] `SITE_URL=https://maison-du-musulman.vercel.app` configuré en Production.
- [ ] Configurer `RESEND_API_KEY`, `RESEND_FROM_EMAIL` et `WITHDRAWAL_NOTIFICATION_EMAIL` si les accusés de rétractation par e-mail doivent être actifs au lancement.

## Supabase

- [x] Projet sain ; tables `orders` et `withdrawal_requests` présentes avec RLS.
- [x] Site URL : `https://maison-du-musulman.vercel.app`.
- [x] Redirect URL : `https://maison-du-musulman.vercel.app/compte.html`.
- [ ] Activer « Prevent use of leaked passwords » dans Authentication > Sign In / Providers > Email.
- [ ] Supprimer les données de test de préproduction si elles ne doivent pas rester dans la base de production.

## Stripe

- [ ] Confirmer que `STRIPE_SECRET_KEY` est une clé LIVE.
- [ ] Confirmer que le webhook LIVE cible `https://maison-du-musulman.vercel.app/api/webhook`.
- [ ] Vérifier que le webhook écoute au minimum `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed` et `checkout.session.expired`.
- [ ] Confirmer que `STRIPE_WEBHOOK_SECRET` correspond à cet endpoint LIVE.
- [ ] Effectuer un achat réel de faible montant uniquement lorsque le prix, les mentions obligatoires et l'expédition sont validés.

## Informations commerciales et légales à fournir par le propriétaire

- [ ] Identité/raison sociale, forme juridique, adresse, SIRET/RCS/RNE, TVA, e-mail et téléphone.
- [ ] Transporteur, adresse de retour, prise en charge des frais de retour et médiateur de la consommation.
- [ ] Adresse e-mail dédiée aux demandes RGPD.

Ces champs ne doivent pas être inventés ni remplacés automatiquement.
