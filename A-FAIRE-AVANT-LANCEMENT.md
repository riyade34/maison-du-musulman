# À faire avant lancement

Mise à jour du 19 septembre 2026.

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
- [x] 19 tests automatisés passent (contrôle du panier et test SEO étendu le 18 septembre 2026 ; test de la recherche de commande par référence ajouté le 19 septembre 2026).
- [x] Panier : un stockage local corrompu (objet, texte, `null`) est ignoré au lieu de faire planter la page ; la rétractation n'interprète plus `_` comme un joker dans la référence de commande.
- [x] Responsive contrôlé sur les parcours principaux ; débordements mobiles corrigés.
- [ ] Alléger les images (6 PNG de 0,9 à 1,9 Mo, environ 7,5 Mo au total ; l'accueil en charge environ 5,6 Mo) : convertir en WebP ou JPEG sans changer le design, y compris l'image Open Graph.
- [ ] Une fois le catalogue et les prix confirmés : ajouter les fiches produits au `sitemap.xml`.
- [x] Panier : prix, nom et icône affichés reprennent le catalogue courant (plus de prix périmé issu du navigateur) et le HTML stocké est neutralisé.

## Livraison et catalogue

- [x] Livraison limitée à la France métropolitaine pour le lancement.
- [ ] Confirmer le vrai prix du flacon d'huile de nigelle 30 ml (1,05 € actuellement). Ne pas le modifier sans source fiable.

## GitHub et Vercel

- [x] Les correctifs principaux ont été publiés sur `main`.
- [x] SEO de base publié dans la mise à jour du 18 septembre 2026 : balises canoniques, Open Graph, descriptions des pages légales, `sitemap.xml` complété, `robots.txt`, page de recherche en noindex. Cette mise à jour REMPLACE le commit local `a82debb` (non récupérable au moment de l'audit) : ne pas pousser `a82debb`.
- [x] Déploiement Vercel de la mise à jour du 18 septembre (`0d5e340`) vérifié en Production le 19 septembre 2026 : fichiers servis identiques au dépôt, `/sitemap.xml` à 13 URLs, `/api/store-status` renvoie `open:false`.
- [ ] Vérifier le déploiement Vercel du correctif du 19 septembre 2026 (statut « Ready », panier et `/api/store-status` toujours fermés).
- [ ] Quand le nom et le domaine définitifs seront choisis, remplacer `https://maison-du-musulman.vercel.app` dans `public/*.html`, `public/sitemap.xml` et `public/robots.txt`, ainsi que le nom « Maison du Musulman » dans les données structurées de `public/index.html`.
- [x] Projet Vercel relié au bon dépôt et à la branche `main`.
- [x] Domaine `maison-du-musulman.vercel.app` actif.
- [x] Runtime Node.js 24.x et dossier de sortie `public`.
- [x] Protection GitHub contre les secrets et les poussées contenant des secrets active.
- [ ] Activer la double authentification du compte GitHub.
- [ ] Activer le graphe de dépendances, les alertes Dependabot et les mises à jour de sécurité.
- [x] `SITE_URL=https://maison-du-musulman.vercel.app` configuré en Production.
- [ ] Configurer `RESEND_API_KEY`, `RESEND_FROM_EMAIL` et `WITHDRAWAL_NOTIFICATION_EMAIL` si les accusés de rétractation par e-mail doivent être actifs au lancement.

## Supabase

- [x] Projet sain ; tables `orders` et `withdrawal_requests` présentes avec RLS.
- [x] Site URL : `https://maison-du-musulman.vercel.app`.
- [x] Redirect URL : `https://maison-du-musulman.vercel.app/compte.html`.
- [ ] Activer « Prevent use of leaked passwords » dans Authentication > Sign In / Providers > Email.
- [ ] Supprimer les données de test de préproduction si elles ne doivent pas rester dans la base de production.

## Stripe

- [x] `STRIPE_SECRET_KEY` LIVE vérifiée côté Vercel Production sans exposer sa valeur.
- [x] Webhook LIVE configuré vers `https://maison-du-musulman.vercel.app/api/webhook`.
- [x] Événements LIVE requis configurés : `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed` et `checkout.session.expired`.
- [x] `STRIPE_WEBHOOK_SECRET` synchronisé avec l'endpoint LIVE.
- [x] Authentification Stripe renforcée contrôlée : application d'authentification, clé de sécurité et clé d'accès configurées.
- [x] Vente réelle verrouillée par défaut tant que `STORE_OPEN` n'est pas explicitement défini à `true`.
- [ ] Effectuer un achat réel de faible montant uniquement lorsque le prix, les mentions obligatoires et l'expédition sont validés.
- [ ] Définir `STORE_OPEN=true` en Production seulement après la validation finale de tous les éléments ci-dessous.

## Informations commerciales et légales à fournir par le propriétaire

- [ ] Identité/raison sociale, forme juridique, adresse, SIRET/RCS/RNE, TVA, e-mail et téléphone.
- [ ] Transporteur, adresse de retour, prise en charge des frais de retour et médiateur de la consommation.
- [ ] Adresse e-mail dédiée aux demandes RGPD.

Ces champs ne doivent pas être inventés ni remplacés automatiquement.

## Marque, domaines et fournisseurs

- [x] Recherche exacte préliminaire INPI/FR/EU/WO effectuée : aucune marque exacte en vigueur trouvée.
- [x] Antériorité commerciale Bayt Al-Muslim identifiée et documentée.
- [x] Variantes principales `.fr` et `.com` contrôlées le 18 septembre 2026.
- [x] Dossier de préparation INPI et projet de libellé créés dans `PREPARATION-MARQUE-DOMAINES.md`.
- [x] Checklist de contrôle fournisseurs créée dans `CONTROLE-FOURNISSEURS.md`.
- [ ] Commander la recherche de similarités INPI (paiement et décision du propriétaire).
- [ ] Faire interpréter Bayt Al-Muslim par un CPI ou un avocat.
- [ ] Réserver les domaines prioritaires après validation du nom.
- [ ] Déposer la marque après validation des classes et du déposant.
