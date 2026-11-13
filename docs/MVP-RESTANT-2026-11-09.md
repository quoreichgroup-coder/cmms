# Reste à faire pour clôturer le MVP QPM — mise à jour du 13 novembre 2026

Synthèse établie après l’audit du 9 novembre 2026 et les vérifications locales du 13 novembre. Les critères C1–C11 sont ceux de [MVP-PROJET-QPM.md](MVP-PROJET-QPM.md) §3. Le dernier commit présent avant les changements de santé est `28f6efdb` sur la branche `projet`; la synchronisation distante doit être confirmée séparément. Les portes de recette réelle restent ouvertes; un build ou des tests automatisés ne les remplacent pas.

## 1. Corrigé sur la branche (à valider en recette)

| Domaine | Correction | Preuve |
| --- | --- | --- |
| Sécurité critique | Création de rôle/relevé/BC/catégories etc. : l’`id` fourni par le client est ignoré (plus d’écrasement d’un rôle global ou d’une autre société) | `RoleServiceTest`, contrôleurs `*Controller#create` |
| Sécurité critique | Inscription dans une société existante : invitation obligatoire ; lien d’invitation e-mail avec jeton secret (colonne `user_invitation.token`) | `UserServiceTest$Signup`, changelog `2026_11_09_…_user_invitation_token.xml` |
| Sécurité haute | Portail de demande public : relations internes ignorées, pièces jointes limitées aux fichiers déposés via ce portail | `RequestServiceTest$CreateFromPortalTests` |
| Sécurité haute | Fichiers HTML/SVG/XML/JS stockés en `application/octet-stream` (plus d’exécution sur l’origine de l’application) | `HelperTest$SafeStorageContentType` |
| Sécurité haute | Mot de passe/rôle d’un autre utilisateur : privilèges ≥ cible exigés, propriétaire protégé, pas d’octroi de permissions non détenues | `UserServiceTest$PatchUserRole`, `RoleServiceTest$AssertCanGrantRole` |
| Sécurité haute | SSO : liaison d’un compte existant seulement sur e-mail vérifié, identité fournisseur vérifiée ensuite, liste `ALLOWED_ORGANIZATION_ADMINS` appliquée | `OAuth2AuthenticationSuccessHandlerTest` |
| Sécurité moyenne | `bypass` d’upload limité aux photos de profil ; `demo` ignoré à l’inscription ; cookie `swagger_jwt` refusé ; export CSV protégé contre l’injection de formules ; création de compte démo publique désactivée par défaut (`demo.public-account-enabled`) ; contrôle multi-société étendu aux requêtes PUT | tests ciblés + suite API complète |
| UX | Plus aucune clé de traduction brute (Web + mobile, FR/EN), tests de non-régression `test:i18n-keys` | `frontend/scripts/i18n-keys.test.cjs`, `mobile/scripts/i18n-keys.test.cjs` |
| UX | Confirmation avant perte de saisie (DA, éditeur du centre d’aide), états chargement/erreur/indisponible du centre d’aide, confirmation d’archivage, libellés accessibles des boutons icônes, actions de commentaire visibles au clavier/tactile, stock bas non signalé par la seule couleur, couleurs de marque | revue + tests front |
| Rebranding | Texte visible QPM (Web, mobile, e-mails, README, politique de sécurité), site amont `home/` et licence commerciale amont retirés ; identifiants techniques conservés documentés | [REBRANDING-AUDIT.md](REBRANDING-AUDIT.md), `rebrand-visible-copy.test.cjs` |

## 2. Bloquants de recette (hors code)

| # | Action | Responsable | Débloque |
| --- | --- | --- | --- |
| 1 | Vérifier que la licence de recette est valide (la dernière trace connue indiquait une expiration le 2026-11-02) | QUOREICH GROUP / autorité de licences | Toute la recette authentifiée |
| 2 | Vérifier/corriger SMTP : le dernier état documenté indiquait `/actuator/health` en 503 avec erreur 535; état courant non accessible depuis cet environnement | Exploitation | Invitations et récupération de mot de passe |
| 3 | Vérifier le workflow GitHub Actions, l’application Liquibase `user_invitation.token` et la santé HTTP sur l’instance | Équipe dev / exploitation | Validation de livraison |
| 4 | Installer l’APK 1.0.61 sur Android et tester App Links; comparer l’empreinte publiée dans `assetlinks.json` | Équipe mobile | C5 |

## 3. Critères MVP restant à valider

| Critère | État | Reste à faire |
| --- | --- | --- |
| C1 Matrice des rôles et refus API | Non démarré | Rejouer les refus par rôle ; inclure les nouveaux contrôles (invitation, privilèges, portail public) |
| C2 Demande → OT sans doublon | Fait, non validé | Recette avec licence valide |
| C3 Listes de tâches (persistance, import/export CSV, sélection PM/OT) | Fait, non validé | La recherche de pièces par opération utilise les endpoints paginés/scopés `/parts/mini/search` et `/parts/mini/selected`; leurs 4 tests unitaires passent. Reste le parcours authentifié de bout en bout et la persistance des lignes sur l’instance. |
| C4 PM : occurrences/OT attendus, sans doublon | Partiel | Tests 02, 04, 05, 06B–F de [TESTS-PM-STRATEGIES-MULTICOMPTEURS.md](TESTS-PM-STRATEGIES-MULTICOMPTEURS.md) ; décisions pilote (rattrapage des seuils sautés, blocage jusqu’à clôture) |
| C5 Technicien exécute et clôture un OT sur téléphone | Fait, non validé | Installer APK 1.0.61 sur appareil Android; reproduire MOB-WO-04 (conversion Timestamp) avec une trace réelle |
| C6 Besoin en pièces « planifié » jusqu’à action explicite | Fait, non validé | Recette |
| C7 Circuit d’approbation DA ; BC depuis DA ou direct | Fait, non validé | Contrôle responsive 390/768/1440 ; comptes approbateurs |
| C8 PDF OT/DA/DI/BC : aperçu, émission, réimpression | Fait, non validé | Modèles publiés sur l’instance |
| C9 Indicateurs Web/mobile = enregistrements sources | Non démarré | Comparaison sur données réelles |
| C10 Migrations sur copie représentative | Partiel | Procédure sauvegarde/restauration + nouvelle migration du 9 novembre |
| C11 Contrôle responsive connecté | Non démarré | Navigateur de recette avec session |
| Centre d’aide HCP-02/HCP-03 | Non démarré | Clarifier l’état réel de la migration (PostgreSQL 16 en production, la doc exige 18) ; parcours par rôle |
| iOS | Non démarré | `EAS_PROJECT_ID`, compte Apple, build IPA |
| Journal de résultats (environnement, commit, rôle, scénario, résultat) | Non démarré | À tenir pendant la recette |

## 4. Améliorations identifiées, non réalisées

- **Sécurité** : jetons JWT en `localStorage` (SEC-WEB-02, ADR existant) ; types de jetons de vérification distincts et usage unique (activation/réinitialisation/suppression), réinitialisation sans mot de passe envoyé par e-mail ; liaison DNS des webhooks sortants (rebinding) ; signature de l’horodatage des webhooks ; verrou de rotation des jetons de rafraîchissement ; vérification en préproduction du contournement de chemin `/admin;x/` de l’autorité de licences et de la résolution d’IP derrière Caddy/nginx ; compte MinIO dédié au lieu du compte racine. Le verrouillage de connexion par e-mail est conservé (protection contre la force brute) : à arbitrer si les verrouillages abusifs deviennent un problème.
- **UX** : la création de BC et les formulaires DA demandent confirmation avant abandon; les modales de réapprovisionnement et de sélection des pièces confirment aussi la perte des saisies non enregistrées; les quantités de réception sont contrôlées en ligne et le bouton est bloqué si elles dépassent le restant; le statut OT « Terminé » utilise le vert Web/mobile; le résidu Expo `ModalScreen` n’existe plus dans la navigation (supprimé dans `8bf6bcbe`). La quantité d’une ligne DA invalide, auparavant signalée seulement à l’envoi, s’affiche maintenant sous le sélecteur de pièces. Montserrat est déjà embarquée localement dans les deux clients; Playfair Display n’est pas utilisée par les écrans actuels et ne sera nécessaire que si une interface éditoriale est ajoutée.
- **Tests** : les checks ciblés antérieurement en échec sont recalés sur les implémentations actuelles. Les variantes d’icônes MUI Outline manquantes ont été corrigées; les assertions obsolètes et les dépendances de test manquantes ont été ajustées. Voir les vérifications Web du 13 novembre ci-dessous.

## 5. Incohérences documentaires à corriger

Les principales divergences d’état ont été reportées dans l’[index consolidé](BACKLOG-POST-MVP-QPM.md). Les éléments suivants restent à vérifier ou à aligner avant de les déclarer clos :

1. **Base Centre d’aide** : le backlog demande PostgreSQL 18, tandis que la dernière observation runtime consignée ici est PostgreSQL 16.15. Confirmer la version réellement supportée par les migrations et corriger l’exigence documentaire si elle est obsolète.
2. **Santé runtime** : `/actuator/health` répond 503 alors qu’un autre contrôle HTTP peut réussir; vérifier chaque endpoint et son dépendance avant de conclure que l’API est saine.
3. **URL API mobile** : `ETAT-REPRISE.md` cite `169-58-86-7.sslip.io`, alors que la configuration mobile du dépôt utilise `eam.quoreichgroup.bf`. Vérifier l’URL attendue pour l’environnement de recette.
4. **Licence et recette** : la dernière trace mentionne une expiration le 2 novembre 2026; l’état actuel doit être confirmé par l’autorité de licences avant les parcours authentifiés.

Les journaux datés des autres documents conservent leur contexte historique; consulter l’index consolidé pour éviter de prendre une note ancienne pour le statut courant.

## 6. Vérifications locales — 13 novembre 2026

- Web : `npm run typecheck`, les suites approbation, PM, documents et erreurs API, et le build de production passent. Le 13 novembre, le typecheck a été relancé après le correctif d’icônes et passe; 9 scripts de régression ciblés (exports, suppression, sélection checklist, contrat webhook, icônes) passent aussi. Le build signale un avertissement ESLint de mise en forme dans `SiteLogoControl.tsx` (non bloquant).
- Web, reprise UX : `npm run typecheck` passe après l’ajout de validation inline des quantités DA et de confirmations d’abandon pour réapprovisionnement et sélection de pièces; `purchase-order-parts-form.test.cjs` et `part-quantity-responsive.test.cjs` passent (2/2).
- API : les rapports Surefire pour Task Lists, recherche de pièces, PM préventive, approbation achats et accès aux documents indiquent 120 tests réussis, sans échec ni erreur.
- API, reprises du 13 novembre : les tests pagination/scoping du catalogue de pièces et santé DB passent (6 tests); les tests du grant OAuth passent (3 tests), y compris l’expiration exacte à 60 secondes; le contrôleur OAuth passe en MockMvc (4 tests), dont l’échange POST avec session, réponse JSON et `Cache-Control: no-store`. La suite combinée de ces quatre classes passe (13 tests). Ces tests locaux ne valident pas les cookies/CORS derrière le proxy ni le comportement multi-instance, qui restent à vérifier en préproduction.
- Mobile : après l’alignement TypeScript, `npx tsc --noEmit --pretty false` passe; `npm run test:mobile-regression` passe (57 tests + 5 onboarding + 5 shifts); l’export Expo Android et iOS passe (2 261 modules Android, 2 252 iOS). Ce dernier produit des bundles JavaScript et ne constitue pas un build APK/IPA ni une recette appareil. Aucun cast ni changement de dépendance.
- Android : l’APK 1.0.61 est présent dans `mobile/dist/`; SHA-256 `02dde8e33e9ddde7f89ceacd6414a7883c68db4c5ea59189e115d05991bf1bb1`. L’installation et les parcours terrain ne sont pas vérifiés sur appareil.
- CI : le connecteur GitHub ne retourne aucun statut ni workflow associé au commit `f8ca6341916548b48917066d3b6444bd7ac0c440`; la réussite CI n’est donc pas confirmée.
- Runtime (contrôles en lecture seule) : conteneurs API/Web/renderer/PostgreSQL actifs; PostgreSQL accepte les connexions, Web répond HTTP 200 et renderer PDF HTTP 200. `/actuator/health` répond toujours HTTP 503 et une erreur SMTP 535 apparaît dans les journaux API des six dernières heures.
- Recontrôle ultérieur dans une session sans accès au socket Docker ni au réseau de recette : l’état runtime courant n’a pas pu être vérifié. L’audit du code a révélé que `/health-check` utilisait un indicateur toujours `UP`; il vérifie maintenant PostgreSQL avec `SELECT 1`, et répond `DOWN` en cas d’échec sans exposer l’exception. `mvn -f api/pom.xml -Dtest=CustomHealthIndicatorTest test` passe (2 tests). Ce correctif local n’atteste pas du déploiement sur l’instance.
- API : `mvn -f api/pom.xml -Dtest=PartControllerMiniSearchTest,CustomHealthIndicatorTest test` passe (6 tests); la recherche paginée/scopée des pièces et le contrôle DB de `/health-check` sont couverts. L’accès et l’usage authentifiés en préproduction restent à recetter.
