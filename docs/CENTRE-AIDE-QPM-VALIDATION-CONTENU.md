# Centre d’aide QPM — validation éditoriale du contenu initial

**Date de revue :** 5 novembre 2026
**Périmètre :** vérification statique des routes et écrans du dépôt par rapport au catalogue initial du changelog documentaire.
**Limite :** les parcours n’ont pas été exécutés dans un navigateur avec des comptes de rôles différents. Cette revue ne vaut donc pas recette fonctionnelle ni validation de publication.

## Contenu initial repéré

Le changelog `2026_10_29_00000000001_documentation_center.xml` prévoit sept thèmes en anglais et en français :

| Thème | Article EN/FR | Permission déclarée dans le seed | État éditorial |
| --- | --- | --- | --- |
| Ordres de travail | `work-orders` | `WORK_ORDERS` | Les vues liste, calendrier et colonnes sont visibles dans l’interface; la vue charge dépend des droits et de l’offre. Les étapes de création et de confirmation doivent être relues sur un compte réel. |
| Demandes d’intervention | `maintenance-requests` | `REQUESTS` | La création et le détail existent. Les champs visibles et requis sont configurables par entreprise; éviter une liste universelle de champs. |
| Équipements | `equipment` | `ASSETS` | La liste et les vues de détail (aperçu, détails, ordres, pièces, fichiers, compteurs, indisponibilités et analyses) existent; leur disponibilité dépend des droits/données. |
| Pièces et inventaire | `parts-inventory` | `PARTS_AND_MULTIPARTS` | Les parcours pièces et ensembles existent sous `/app/inventory/parts` et `/app/inventory/sets`; les opérations de stock doivent être confirmées selon le processus et les droits de l’organisation. |
| Planning des ordres | `work-order-planning` | `WORK_ORDERS` | Le thème est semé; la vue calendrier est présente. Ne pas la présenter comme une fonction de planification complète sans recette métier. |
| Profil et préférences | `profile-preferences` | aucune | La route du profil utilisateur est `/app/account/profile`. Confirmer les préférences réellement modifiables avant de détailler des options. |
| Paramètres | `settings` | `SETTINGS` | Le module comprend plusieurs sections et les droits sont variables. Les guides doivent être ciblés par tâche et rappeler que l’accès dépend du rôle. |

Les articles utilisent le résumé et des consignes de démarrage générales. Le dépôt ne démontre pas encore une relecture métier complète de chaque procédure ni une vérification de toutes les traductions par un réviseur humain.

## Parcours vérifiés dans le code

- `/app/work-orders` ouvre le module Ordres de travail. Les vues liste et colonnes sont codées; calendrier/charge ont des restrictions supplémentaires.
- `/app/requests` ouvre la liste des demandes; la création utilise une configuration des champs pouvant masquer ou rendre des champs obligatoires.
- `/app/assets` ouvre les équipements. Une fiche équipement expose des sous-routes dédiées, mais son contenu dépend des données disponibles et des permissions.
- `/app/inventory/parts` et `/app/inventory/sets` ouvrent respectivement les pièces et ensembles.
- `/app/account/profile` ouvre le profil utilisateur.
- `/app/settings` ouvre les paramètres; `/app/settings/help-center` est la route de gestion documentaire.
- Les liens d’aide contextuelle ajoutés aux écrans ordres, demandes, équipements, inventaire et paramètres pointent vers les slugs du catalogue initial.

Ces routes et noms établissent que les écrans existent dans le code. Ils ne suffisent pas à garantir qu’un bouton est visible pour chaque rôle, qu’une fonction est activée dans chaque forfait, ni que les étapes d’un guide correspondent au paramétrage d’une entreprise.

## Règles de rédaction avant publication

1. Décrire une tâche par article et utiliser les libellés visibles dans la langue choisie.
2. Pour chaque procédure, vérifier le rôle, les droits, le forfait et les réglages d’entreprise qui conditionnent les étapes.
3. Pour les demandes, expliquer que la liste des champs dépend de la configuration et ne pas promettre un champ universel.
4. Pour les équipements, distinguer les onglets disponibles des données réellement présentes.
5. Pour les ordres, distinguer confirmation, clôture et vues optionnelles; ne pas affirmer qu’une vue ou une signature est toujours activée.
6. Faire relire les versions FR et EN par une personne bilingue; une traduction présente ne constitue pas une validation linguistique.
7. Lier les articles aux catégories et permissions QPM correspondantes. Vérifier la lecture par un rôle limité, y compris via recherche, URL directe et images.
8. Conserver le brouillon existant et publier une nouvelle version uniquement après recette sur préproduction.

## Décision pour la suite

La revue de code confirme le catalogue initial et ses routes principales; elle ne valide pas les procédures de bout en bout. L’étape nécessaire pour clore HCP-10 est une recette éditoriale dans QPM en préproduction, sur au moins un administrateur et un utilisateur à permissions limitées, avec les versions FR et EN. Cela nécessite la migration sur une base de préproduction restaurable et des comptes de démonstration; aucune de ces opérations n’a été faite pendant cette revue.

Ne pas modifier le changelog initial pour corriger le texte après son éventuelle application : toute correction ultérieure du contenu publié doit passer par l’interface d’administration ou par un changelog correctif versionné, après vérification de l’état Liquibase.

## Contrôles d’intégration du dépôt

- Les routes de consultation, d’article et d’administration existent dans le routeur React; les contrôleurs REST et les services Spring correspondants existent.
- Le changelog documentaire est référencé par `api/src/main/resources/db/master.xml`. Son XML se parse correctement. Les index JPA de catégorie ont été alignés avec la définition existante du changelog, sans toucher à la base.
- Les 122 clés de traduction `help_` ont une entrée en anglais et en français. Le typecheck TypeScript ciblé, ESLint ciblé et `git diff --check` passent.
- La recherche UI accepte plusieurs termes, normalise les accents, filtre les suggestions par catégorie et affiche le résumé avec un extrait du corps. Elle est appliquée à la liste d’articles déjà filtrée par l’API. La recherche PostgreSQL plein texte et la pagination serveur ne sont pas incluses.
- La date `updatedAt` renvoyée au lecteur public correspond maintenant à la dernière publication; une sauvegarde de brouillon non publiée ne déplace plus la date visible.
- `docker compose config --quiet` n’a pas signalé d’erreur de configuration, mais l’inspection des conteneurs échoue faute d’accès au socket Docker. Les ports locaux 3000 et 8080 ne répondent pas. Le contrôle navigateur n’a pas démarré faute de serveur X.
- La compilation Maven complète (`mvn -o -q -DskipTests compile`, heap limitée à 512 Mo) a réussi. Aucun test, migration, démarrage de conteneur ni déploiement n’a été effectué.

**Conclusion :** l’intégration dans le code est cohérente à la lecture et les contrôles frontend/structure passent. La disponibilité runtime, le démarrage API, les migrations, les parcours authentifiés et le build complet restent à confirmer sur le serveur ou en préproduction.
