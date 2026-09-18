# Sécurité des comptes — état constaté

Contrôle gratuit réalisé le 18 septembre 2026. Aucun secret, e-mail, adresse IP ou code de sauvegarde n'est recopié dans ce document.

## Stripe

- Authentification à deux facteurs active.
- Application d'authentification configurée.
- Clé de sécurité configurée et méthode par défaut.
- Clé d'accès configurée.
- Action gratuite restante : conserver le code de sauvegarde hors ligne dans un emplacement sûr.

## GitHub

- Protection des secrets active sur le dépôt public.
- Protection contre l'envoi de secrets active.
- Double authentification du compte non activée.
- Graphe de dépendances non activé.
- Alertes et mises à jour de sécurité Dependabot non activées.

## Actions gratuites recommandées

1. Activer la double authentification GitHub avec une application d'authentification et enregistrer les codes de récupération hors ligne.
2. Ajouter ensuite une clé d'accès ou une clé de sécurité comme méthode de secours.
3. Activer le graphe de dépendances, les alertes Dependabot et les mises à jour de sécurité du dépôt.
4. Examiner périodiquement les sessions connectées sans supprimer une session reconnue par erreur.

L'activation de la double authentification doit être effectuée avec le propriétaire du compte, car elle implique un code ou une clé personnelle.
