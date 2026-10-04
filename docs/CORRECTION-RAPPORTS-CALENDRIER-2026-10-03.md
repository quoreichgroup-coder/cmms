# Rapports et calendrier : chargements bloqués

## Diagnostic

Le compte superadmin était accepté par l’interface mais refusé par les endpoints de rapports et `/work-orders/events` (HTTP 403). Les 40 thunks de rapports et le calendrier ne libéraient pas leur chargement après un échec HTTP. Les statistiques d’âge utilisaient aussi un mauvais indicateur de chargement ; le rapport de temps de réparation des actifs suivait celui des indisponibilités.

## Correction

- Les lectures de rapports et du calendrier acceptent désormais le superadmin. `User.canSeeAnalytics()` traite ce rôle sans exiger un abonnement de société ; un compte client sans abonnement est refusé proprement. Les clients conservent leurs permissions et leurs exigences d’abonnement.
- `Helper.resolveCompanyId` et les filtres de données sont conservés : le superadmin ne peut pas sélectionner une société étrangère sans relation autorisée.
- Les chargements des rapports se terminent dans `finally`. Une erreur est affichée dans chaque carte, avec une action « Réessayer » ; les données précédentes ne sont pas affichées comme un résultat valide d’une requête échouée.
- Le calendrier possède son propre état de chargement et d’erreur. Une réponse d’une ancienne période ne remplace plus la période courante. Un callback `datesSet` portant les mêmes dates ne déclenche pas une nouvelle requête.

## Vérifications

- `npm run test:reports` : 7 tests, couvrant les 40 requêtes de rapports, le retry calendrier et les réponses obsolètes.
- `npm run test:license-ui` : 7 tests de non-régression du parcours licence.
- Tests backend : AnalyticsAccessScopeTest, AnalyticsMethodSecurityTest, WorkOrderControllerTest, WorkOrderServiceTest et HelperTest. Accès superadmin testé avec Spring Method Security réel ; refus interentreprises et rôles non autorisés vérifiés.
- Compilation TypeScript et build de production frontend vérifiés.
- Chromium : les neuf routes de rapports et le calendrier vérifiés avec les réponses 403 de l’API courante ; loaders arrêtés, erreur visible, retry fonctionnel, absence de boucle calendrier. Cette vérification porte sur le traitement des erreurs ; les endpoints corrigés sont vérifiés séparément dans les tests backend.

Test navigateur reproductible : `QPM_PLAYWRIGHT_MODULE=/chemin/vers/playwright node scripts/reports-calendar-errors.e2e.cjs` depuis frontend, après `npm run build`, avec l’application locale démarrée. Par défaut les réponses 403 sont simulées pour rester reproductibles après déploiement ; `QPM_REPORT_REAL_ERRORS=1` utilise les réponses réelles. Le script lit les identifiants locaux ignorés par Git et n’imprime ni mots de passe ni jetons.

## Application sur l’installation locale

Les tests utilisent le frontend construit sans remplacer les conteneurs en cours. Pour appliquer les derniers changements :

```bash
sudo docker compose -f docker-compose.yml -f docker-compose.license.yml up -d --build api frontend
```

Recharger ensuite le navigateur avec Ctrl + Maj + R.
