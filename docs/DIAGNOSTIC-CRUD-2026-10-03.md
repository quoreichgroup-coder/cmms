# Diagnostic CRUD et chargements — 3 octobre 2026

## Périmètre et preuve de reproduction

L’application réellement servie sur `http://localhost:3000` a été testée dans Chromium avec le compte superadmin. Avant modification du code :

| Requête | Résultat réel | Conséquence |
| --- | --- | --- |
| GET /api/locations/children/0/paginated | 404, `Not found` | Chargement Locations restant actif |
| GET /api/assets/children/0/paginated | 404, `Not found` | Chargement Assets restant actif |
| POST /api/locations, nom et adresse valides | 403, `Access is denied` | Création proposée par l’UI mais interdite pour ce rôle |
| POST /api/analytics/work-orders/... | 403 | Ancienne version déployée, chargeurs de rapports persistants |
| POST /api/{locations,assets,work-orders,preventive-maintenances,users,teams}/search | 200 | Pagination conforme : content, totalElements, totalPages |

Les requêtes métier observées terminaient leur réponse ; aucune ne restait Pending. L’API runtime est `/api`, cohérente avec le proxy. Les requêtes utilisent `Authorization: Bearer …` et `Content-Type: application/json`. Les identifiants et jetons ne sont pas reproduits dans ce rapport.

Une base PostgreSQL indépendante et une autorité de licence de test ont ensuite permis les opérations mutantes sans modifier les données de l’installation actuelle. Hibernate valide le schéma ; 815 migrations sont présentes. Les colonnes id/name/company_id obligatoires et les relations parentes facultatives des emplacements et équipements existent.

## Causes exactes

1. **Racine hiérarchique et rôle** : `0` représente une racine virtuelle, mais les services Locations/Assets ne la reconnaissaient que pour ROLE_CLIENT. Pour ROLE_SUPER_ADMIN, la recherche d’une entité réelle d’identifiant 0 aboutissait à 404.
2. **État de chargement** : les thunks hiérarchiques ne réinitialisaient loadingHierarchy qu’après une réponse réussie. Une exception laissait cet état à true. Reproduit avec les vrais reducers : les deux modules restaient en chargement après 404.
3. **Permissions UI/API divergentes** : le rôle superadmin contient des tableaux de permissions étendus, mais les contrôleurs métier réservent création/modification/suppression à ROLE_CLIENT. L’interface se fondait seulement sur ces tableaux et présentait des actions refusées par Spring Security.
4. **Emplacements modifiés mais affichage ancien** : le reducer écrivait dans la Page au lieu de Page.content et ne synchronisait pas les lignes hiérarchiques ni leurs pages. La fiche sélectionnée restait également ancienne. Reproduit par une modification UI : PATCH 200 sans nouveau nom visible.
5. **PATCH partiels** : un équipement sans statut dans le payload provoquait un NullPointerException lors du calcul du changement de disponibilité ; une maintenance modifiée sans titre perdait son titre lors du mapping, puis échouait à la validation JPA. Ces erreurs 500 ont été reproduites par HTTP direct et retrouvées dans les logs du backend isolé.
6. **Version déployée** : les corrections précédentes des rapports/calendrier sont présentes dans le dépôt, mais l’installation actuelle observée renvoyait encore les refus de l’ancienne version. Reconstruire le frontend seul ne déploie pas les corrections du backend.

## Corrections et composants

- `api/.../service/LocationService.java`, `AssetService.java` : racine virtuelle accessible aux rôles disposant du droit de lecture, toujours limitée à l’entreprise du compte. Le PATCH d’équipement conserve son statut s’il est omis.
- `api/.../mapper/PreventiveMaintenanceMapper.java` : préserver le titre obligatoire lorsqu’il est omis d’une modification.
- `frontend/src/slices/location.ts`, `asset.ts` : erreurs hiérarchiques explicites, chargement arrêté dans finally, attente des appels de réinitialisation. Emplacements : mise à jour de content, hiérarchie et pages enfants ; suppression d’un identifiant inconnu ne retire plus la dernière ligne.
- `frontend/src/content/own/Locations/index.tsx`, `Assets/index.tsx` : afficher l’erreur de chargement ; le bouton existant de rechargement permet une nouvelle tentative. Emplacements : recharger après création et synchroniser la fiche sélectionnée après modification.
- `frontend/src/contexts/JWTAuthContext.tsx` : réserver les actions métier aux comptes ROLE_CLIENT, conformément aux contrôleurs. L’activation de licence conserve ses propres autorisations propriétaire/superadmin.
- `frontend/src/layouts/ExtendedSidebarLayout/Sidebar/SidebarMenu/index.tsx`, `frontend/src/content/own/PeopleAndTeams/People.tsx` : ne pas lancer les compteurs et invitations réservés aux comptes d’entreprise avec le superadmin.
- Tests : LocationServiceTest, AssetServiceTest, PreventiveMaintenancePatchMapperTest ; `frontend/scripts/hierarchy-loading.test.cjs`, exécutable par `npm run test:hierarchy`.

Aucun élargissement global de permitAll, aucune désactivation de validation, de filtrage d’entreprise ou de JWT.

## Résultats API après correction — environnement isolé

L’API utilise PATCH pour les mises à jour et renvoie actuellement 200 pour les créations.

| Module | POST | GET /id | PATCH /id | DELETE /id |
| --- | --- | --- | --- | --- |
| Locations | 200 | 200 | 200 | 200 |
| Assets | 200 | 200 | 200 | 200 |
| Work Orders | 200 | 200 | 200 | 200 |
| Preventive Maintenance | 200 | 200 | 200 | 200 |
| Teams | 200 | 200 | 200 | 200 |

Les données mises à jour ont été relues avant suppression. Les seules lignes supprimées étaient les données temporaires de diagnostic.

- Racines Locations et Assets, superadmin : 200 ; entreprise sans données : page vide, totalElements=0.
- Création Location, superadmin : 403 attendu et conservé.
- Accès anonyme à la racine : 401 attendu et conservé.
- Création de maintenance sans champs obligatoires : 400 attendu.

## Résultats UI après correction — Chromium, API et PostgreSQL réels

- Login administrateur d’entreprise et superadmin : PASS.
- Work Orders, Locations, Assets, Preventive Maintenance, People, Teams, rapport Work Orders/status et calendrier `work-orders?view=calendar` : PASS pour les deux rôles, zéro spinner persistant et zéro réponse HTTP métier >=400 sur ces parcours. Les requêtes SockJS sont traitées séparément ci-dessous.
- Locations création, persistance après actualisation, modification du nom visible et suppression : PASS, réalisées avec les formulaires UI et confirmées par réponses POST/PATCH/DELETE 200.
- Erreur hiérarchique 404 injectée dans le navigateur : message visible, chargement arrêté ; bouton de rechargement : PASS après rétablissement de l’API.
- JWT rendu invalide dans une session active : GET 401 → un seul renouvellement réel → GET 200. Aucun cycle illimité constaté.
- Tests frontend : 19 tests réussis, dont les régressions des rapports/calendrier et de la licence ; test hiérarchique vérifie également le contenu vide et les caches modifiés.
- Tests backend ciblés LocationServiceTest, AssetServiceTest, PreventiveMaintenanceServiceTest, PreventiveMaintenanceControllerTest et mapper réel : réussis.
- TypeScript, build frontend et package backend : réussis. Une première compilation frontend concurrente a été interrompue ; la compilation séparée a réussi.

## Logs historiques et limites non résolues

Les journaux de vos tentatives dans le conteneur courant ne sont **pas encore disponibles** : Docker refuse l’accès au compte de travail et sudo exige une authentification interactive. Le fichier demandé `/tmp/cmms-backend-diagnostic.log` n’a pas été fourni. Les erreurs 500 détaillées ci-dessus proviennent des reproductions isolées, pas d’un accès aux logs historiques de production.

Restent à examiner indépendamment des CRUD :

- SockJS/WebSocket : des 403 ont été observés sur l’installation actuelle ; les logs isolés contiennent des refus STOMP DISCONNECT. La configuration autorise frontend.url ; vérifier l’origine réelle et la connexion STOMP avec les journaux du déploiement. Les tests HTTP métier et CRUD ne valent pas validation des notifications en temps réel.
- Avertissement Liquibase au démarrage : ancien chemin de migration contenant un espace, fallback effectué et démarrage réussi. Ne pas renommer arbitrairement une migration historique déjà appliquée.
- Le CRUD des utilisateurs/invitations n’a pas été testé intégralement ; lecture People et CRUD Teams ont été validés. Les autres modules et tous les champs possibles des PATCH ne sont pas couverts exhaustivement.
- La nouvelle version n’est pas déployée dans les conteneurs actuels. Commande à exécuter par le compte disposant de Docker :

```bash
sudo docker compose -f docker-compose.yml -f docker-compose.license.yml up -d --build api frontend
```

Le compte superadmin reste un compte technique ; utiliser un administrateur d’entreprise pour les créations métier.
