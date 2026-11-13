# Reste à faire pour clôturer le MVP QPM — mise à jour du 13 novembre 2026

Synthèse établie après l’audit du 9 novembre 2026 et les vérifications locales du 13 novembre. Les critères C1–C11 sont ceux de [MVP-PROJET-QPM.md](MVP-PROJET-QPM.md) §3. L’état vérifié est la branche `projet`, commit `f8ca6341`, synchronisée avec `origin/projet`. Les portes de recette réelle restent ouvertes; un build ou des tests automatisés ne les remplacent pas.

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
| C3 Listes de tâches (persistance, import/export CSV, sélection PM/OT) | Fait, non validé | Contrôle authentifié du catalogue de pièces par opération |
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
- **UX** : garde de saisie sur la page de création de BC et les modales de pièces ; validation en ligne des quantités reçues et des champs de DA ; couleur « Terminé » à aligner entre Web (vert) et mobile (gris) ; écran Expo `ModalScreen` résiduel ; polices de la charte (Montserrat/Playfair) à embarquer localement.
- **Tests** : 8 tests front basés sur le texte source échouaient déjà avant ces changements (icônes outlined, messages d’export, suppression checklist/fichier, signature webhook, sélection de checklist de workflow) ; erreurs de typage mobile React 19 préexistantes (`SheetProvider`, `BottomTabBar`).

## 5. Incohérences documentaires à corriger

1. Statut du circuit d’approbation : `FINAL-UIUX-MAINTENANCE-BACKLOG.md` (non implémenté) contre `BACKLOG-APPROBATIONS-ACHATS.md` (V1 implémentée, confirmé par le code).
2. Modèle de BC : réceptions et file de réception existent désormais (le backlog du 20 octobre l’ignore).
3. Aperçu PDF Web : ouvre une fenêtre de visualisation (`MVP-MOBILE-QPM.md` parle encore d’un simple téléchargement).
4. Version PostgreSQL et état de la migration documentation (la dernière observation consignait PostgreSQL 16.15; le backlog du centre d’aide demande une validation sur PostgreSQL 18).
5. Santé : `/actuator/health` en 503 contre « health-check API 200 » (endpoints différents, à expliciter).
6. URL API mobile : `ETAT-REPRISE.md` cite `169-58-86-7.sslip.io`, le code utilise `eam.quoreichgroup.bf`.
7. Prochaine étape « installer 1.0.59 » obsolète : l’APK courant documenté est 1.0.61.
8. L’expiration de la licence n’apparaît pas dans l’ordre des jalons de `MVP-PROJET-QPM.md` §3.

## 6. Vérifications locales — 13 novembre 2026

- Web : `npm run typecheck`, les suites approbation, PM, documents et erreurs API, et le build de production passent. Le build signale un avertissement ESLint de mise en forme dans `SiteLogoControl.tsx` (non bloquant).
- API : les rapports Surefire pour Task Lists, recherche de pièces, PM préventive, approbation achats et accès aux documents indiquent 120 tests réussis, sans échec ni erreur.
- Mobile : 57 tests de régression, 5 tests onboarding et 5 tests disponibilité équipe passent. Le contrôle `npx tsc --noEmit` échoue encore sur les types JSX de bibliothèques React Native, notamment `SheetProvider`, `BottomTabBar` et `TabView`.
- Android : l’APK 1.0.61 est présent dans `mobile/dist/`; SHA-256 `02dde8e33e9ddde7f89ceacd6414a7883c68db4c5ea59189e115d05991bf1bb1`. L’installation et les parcours terrain ne sont pas vérifiés sur appareil.
- CI : le connecteur GitHub ne retourne aucun statut ni workflow associé au commit `f8ca6341916548b48917066d3b6444bd7ac0c440`; la réussite CI n’est donc pas confirmée.
- Runtime (contrôles en lecture seule) : conteneurs API/Web/renderer/PostgreSQL actifs; PostgreSQL accepte les connexions, Web répond HTTP 200 et renderer PDF HTTP 200. `/actuator/health` répond toujours HTTP 503 et une erreur SMTP 535 apparaît dans les journaux API des six dernières heures.
