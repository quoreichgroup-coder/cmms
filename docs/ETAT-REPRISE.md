# État de reprise — 3 octobre 2026

## Point retrouvé

La branche de travail est `projet`. Le dernier commit est `fc1a9a0e` (installation des dépendances VPS). Les adaptations QPM et le cadrage du pilote minier existent déjà. Le chantier le plus récent dans les fichiers locaux concerne la marque QUOREICH et son autorité de licences ; ces changements ne sont pas encore enregistrés dans un commit.

Le module `license-authority/` contient une API d’administration, une console web, la signature Ed25519 et le suivi des activations production/préproduction. Le backend client contient la vérification des baux, le cache, les limites de sièges et un filtre de lecture seule. Leur présence dans le code ne vaut pas validation de fonctionnement en production.

## Travail de cette reprise

- Conversion des dates de création des licences en `java.sql.Timestamp` pour leur transmission à PostgreSQL via JDBC.
- Vérification de la disponibilité du créneau avant de réactiver une ancienne installation ; un créneau occupé renvoie un conflit HTTP 409.
- Ajout de trois tests unitaires : dates JDBC, licence perpétuelle sans dates de fin et réactivation sur un créneau occupé.
- Mise à jour de la documentation de licences pour mentionner la console existante.
- Correction du chemin local dans le guide de travail Git.

## Suite de la reprise

- Java 17 et Maven 3.9.9 ont été téléchargés dans `/tmp/qpm-validation` pour exécuter les validations sans installation système. Le cache Maven est également dans ce dossier temporaire.
- Le mock incomplet du test de réactivation a été corrigé après son premier passage réel.
- Les erreurs HTTP temporaires (notamment 408 et 429) ne rendent plus une installation en lecture seule tant que son bail signé reste valide. Les refus 403, 404 et 409 bloquent toujours les écritures.
- Le filtre de lecture seule tient compte du chemin de contexte du serveur, notamment pour conserver la connexion sous `/api`.
- Les invitations, réactivations et changements entre rôles complets et légers contrôlent maintenant la limite du type de siège concerné.
- Les résultats de compilation Java sont ignorés par Git.

## Contrôles simultanés et client réel

- `LicenseSeatService` centralise les limites complètes/légères, les transitions de rôle et les réactivations groupées. `LicenseSeatRepository` utilise un verrou consultatif PostgreSQL partagé jusqu’à la validation ou l’annulation de la transaction.
- Les créations classiques, réactivations, changements de rôle, créations SSO/OAuth, provisioning LDAP et activations par abonnement utilisent ce contrôle. Les comptes déjà activés ne sont pas considérés comme des sièges supplémentaires par le contrôle de licence.
- Le compteur voit les écritures JPA en attente grâce à un `flush` effectué sous le verrou avant la lecture des totaux. Les réactivations chargent l’état courant après acquisition du verrou pour éviter les données périmées du contexte de persistence.
- La création d’une organisation par OAuth est maintenant incluse dans une transaction ; un refus de quota annule son provisioning.
- Les essais d’intégration utilisent le gestionnaire JPA réel, PostgreSQL réel et un JAR d’autorité lancé sur un port local temporaire. Les schémas, clés et processus de test sont isolés de l’installation existante.
- Le client réel a été vérifié pour l’activation, le redémarrage hors ligne, la révocation avec blocage des écritures et maintien des exports, ainsi que le refus des baux copiés ou modifiés.

## Vérifications effectuées et limites

- Autorité : `mvn -f license-authority/pom.xml verify` passe sur PostgreSQL 18 isolé, avec **10 tests réussis** (3 unitaires et 7 d’intégration) et production du JAR exécutable.
- API principale : compilation réussie et **214 tests réussis**, aucun échec, aucune erreur, aucun test ignoré dans la sélection.
- Sélection API : tests de licences, contrôle commun des sièges, utilisateurs, abonnements, SSO et LDAP, plus `LicenseSeatConcurrencyIntegrationTest` (6 tests) et `QuoreichAuthorityClientIntegrationTest` (4 tests).
- Les tests couvrent signatures Ed25519, expiration du bail et du contrat, empreinte et environnement, refus de l’autorité, erreurs temporaires, accès lecture/export, écritures bloquées, connexion et limites des sièges. Les parcours invitation, réactivation et changement de rôle sont aussi exercés.
- `git diff --check` passe.

- Frontend : `npm ci --ignore-scripts --no-audit --no-fund` et `npm run build` réussissent avec Node.js 22.14.0 temporaire. La compilation conserve dix avertissements de sourcemaps absentes dans `@jackstenglein/mui-mentions` et `stylis-plugin-rtl`.
- Console : `npm run test:license-console` passe avec **2 tests réussis**. Le formulaire conserve désormais sa référence après une opération asynchrone, et les dates annoncées UTC sont réellement transmises en UTC.
- PostgreSQL temporaire : base `qpm_license_test`, port local 55439, données sous `/tmp/qpm-validation/pgdata`. La suite utilise un schéma aléatoire supprimé après les tests et des clés éphémères ; le serveur temporaire est arrêté à la fin de la validation.

La validation initiale comptait **226 tests réussis**. Elle a depuis été complétée par la validation métier ci-dessous. La suite API entière n’a pas été exécutée. L’accès Docker demande une authentification administrateur. Aucun déploiement ni changement du fournisseur de licences n’a été effectué.

Pour reproduire les tests API dans un environnement Java 17/Maven :

```sh
mvn -f api/pom.xml -Dtest=LicenseSeatServiceTest,UserLicenseSeatTest,UserServiceTest,SubscriptionServiceTest,OAuth2AuthenticationSuccessHandlerTest,LdapServiceTest,QuoreichLicenseClientTest,LicenseReadOnlyFilterTest,LicenseServiceTest test
```

Les dix tests d’intégration API nécessitent les variables `QPM_LICENSE_TEST_DB_URL` et `QPM_LICENSE_AUTHORITY_TEST_JAR`. Le guide de licences donne la commande ; la base temporaire doit être démarrée pour les reproduire. La sélection totale de 214 tests a été exécutée avec ces variables, sans test ignoré.

## Prochaine étape

### Identifiants et licence de l’installation existante

- La connexion superadmin de l’installation sur le port 3000 a été vérifiée avec les identifiants privés de `.initial-admin-credentials` ; le rôle retourné est `ROLE_SUPER_ADMIN`. La session de vérification a été fermée. Aucun mot de passe ni jeton n’est enregistré dans ce document.
- Son état de licence est actuellement `hasLicense=false`, `valid=false`, `previewMode=false`. La configuration racine ne fournit aucune `LICENSE_KEY` ni `LICENSE_PROVIDER` ; Compose conserve alors son fournisseur par défaut `KEYGEN`.
- Une autorité persistante est accessible sur le port 8081, avec sa configuration dans `license-authority/.env`. Sa clé privée configurée correspond à la clé publique de l’application. L’API d’administration est authentifiable.
- L’émission demandée renvoie HTTP 500. La liste est toujours vide après cette tentative : aucune clé activable n’a été créée. Ne pas présenter une clé de l’ancien pilote isolé comme une licence de cette installation.
- La demande non secrète est prête dans `license-authority/requests/local-test-license.json` : test ENTERPRISE de 30 jours, 10 utilisateurs complets et 10 légers. Les paramètres commerciaux restent à confirmer pour une licence définitive.
- L’accès au socket Docker est refusé à l’utilisateur de la session ; `sudo -n` demande une authentification interactive. Il faut diagnostiquer les logs de l’autorité et mettre à jour son service avant de réémettre. Le JAR et le source corrigés ont déjà passé les tests du rapport de validation.
- Le fichier `.initial-company-license` est réservé au stockage privé de la clé retournée une seule fois et est ignoré par Git. Il n’existe pas encore.
- Après émission, l’activation réelle nécessite la configuration délibérée de `LICENSE_PROVIDER=QUOREICH`, de la clé et d’une URL d’autorité joignable depuis le backend. L’installation existante n’a pas été basculée automatiquement.
- Les essais natifs restent indisponibles dans cette session Linux : aucun `adb`, émulateur Android ou Xcode, aucun accès KVM et aucune dépendance mobile installée. Les validations web et les tests des thunks déjà effectués restent décrits dans le rapport.

### Validation métier du 3 octobre 2026

La reprise suivante a exécuté **971 tests API**, **10 tests de l’autorité**, **4 tests mobiles**, **2 tests de console** et **5 tests de la synthèse préventive**, tous réussis. Le parcours a aussi été exercé dans Chromium : **10 contrôles métier réussis**, plus les **2 scénarios réels de seuils**. Le rapport et les captures sont dans [VALIDATION-PILOTE-2026-10-03.md](VALIDATION-PILOTE-2026-10-03.md).

L’approbation, le travail du technicien, la consommation de pièce, la clôture, le refus d’approbation pour le demandeur et l’isolation d’une pièce étrangère sont vérifiés. Les essais ont corrigé le tri impossible de la synthèse préventive, son double affichage, la colonne emplacement des demandes, la réflexion sur les identifiants numériques dans `TenantAspect` et le débordement du titre mobile.

Le navigateur fonctionne avec des bibliothèques temporaires extraites sous `/tmp`. Les services de test sont arrêtés après les essais. Les fichiers et signatures avec stockage externe, les notifications en temps réel et l’application native Android/iOS restent à valider.

### Avancement du pilote mobile

- L’approbation et le rejet d’une demande affichent maintenant le message d’erreur du serveur et libèrent leur indicateur de chargement en cas d’échec. La navigation reste réservée au succès.
- Le motif de rejet est encodé dans l’URL : les caractères `&`, `?`, `#`, `+` et les accents sont conservés.
- Quatre tests ciblés des thunks mobiles réussissent : création de l’ordre lié, conservation du motif et absence de mise à jour locale après un refus du serveur pour chacune des deux opérations.
- Commande avec les dépendances mobiles installées : `cd mobile && npm run test:request-pilot`. La validation actuelle utilise les dépendances TypeScript/Redux déjà installées dans le frontend, via `NODE_PATH=./frontend/node_modules node --test mobile/scripts/request-pilot.test.cjs` depuis la racine.
- Le packaging de l’API complète réussit (`api/target/app.jar`). Cela ne valide pas encore son démarrage avec toutes ses migrations.
- Le blocage initial du navigateur est résolu : les bibliothèques ont été extraites dans `/tmp` et le parcours web a été exercé. Aucun essai natif Android/iOS n’est déclaré réussi. L’installation existante n’a pas été modifiée.

1. Compléter la validation sur appareil Android/iOS, avec stockage documentaire et notifications, puis confirmer les données et procédures du site minier réel. Le parcours web technicien/responsable et le web responsive sont désormais exercés sur le pilote isolé.
2. Examiner et organiser l’ensemble des changements locaux avant leur enregistrement. Le guide de validation reproductible est dans `dev-docs/QUOREICH-Licensing-Policy.md`.
3. Préparer les contrôles de déploiement et de bascule vers QUOREICH, en vérifiant la configuration de l’autorité, de la clé publique et des volumes persistants sur l’environnement cible.

Le contrôle simultané des sièges est validé avec l’isolation PostgreSQL `READ COMMITTED`. Les accès directs en base et tout nouveau chemin de provisioning doivent respecter le même verrou. Un long traitement LDAP peut retarder les autres modifications de comptes jusqu’à sa fin.

Le fournisseur reste celui configuré pour l’installation existante. La bascule vers QUOREICH doit suivre `dev-docs/QUOREICH-Licensing-Policy.md` après validation de l’autorité et de la clé publique.

### Autorité reconstruite et licence émise — 2026-10-03

Après reconstruction Docker par l’utilisateur, émission réelle réussie : ENTERPRISE, abonnement de test de 30 jours, 10 places complètes et 10 légères, expiration le 2026-11-02 à 18:40 UTC. Clé conservée exclusivement dans `.initial-company-license` (ignoré par Git, permissions 600). Signature Ed25519 vérifiée avec la clé publique de l’application ; activation PREPRODUCTION de contrôle désactivée et absence d’activation active vérifiée. La configuration de l’application n’a pas été modifiée : le passage à LICENSE_PROVIDER=QUOREICH et une URL d’autorité joignable depuis le conteneur API restent nécessaires pour utiliser cette clé.

### Correction des interfaces et préparation activation — 2026-10-03

Erreur reproduite sur `/app/people-teams/people` avec superadmin : `generalPreferences.currency` vaut null pour la société 1 ; le formatter partagé levait une exception en lisant `.code`. Correction : afficher le montant sans unité lorsqu’aucune devise n’est configurée, conserver le format des devises existantes, permettre les préférences absentes et utiliser UTC si le fuseau est absent. Trois tests du provider réel passent (`node --test scripts/company-settings.test.cjs` depuis frontend). Build production réussi avec avertissements de dépendances.

La configuration privée `.env` est maintenant préparée avec LICENSE_PROVIDER=QUOREICH, la clé émise, LICENSE_ENVIRONMENT=PRODUCTION et LICENSE_AUTHORITY_URL=http://license-authority:8080. `docker-compose.license.yml` connecte l’API au réseau externe existant `license-authority_default` (nom confirmé par Compose). Pour appliquer activation et correctif : `sudo docker compose -f docker-compose.yml -f docker-compose.license.yml up -d --build api frontend`. Accès au socket Docker toujours refusé à l’agent ; aucune activation de l’installation réelle ne doit être annoncée avant redémarrage et lecture de `/api/license/state` avec valid=true. Utiliser cet override lors des futurs déploiements de l’API.

### Activation UI entreprise — 2026-10-03

Parcours implémenté dans **Mon entreprise → Licence de l’entreprise** : saisie d’une clé, activation/renouvellement, état, édition, client, places et expiration. Propriétaire ou superadmin uniquement ; les autres utilisateurs voient l’état. Backend : `/license/activation-config` et POST `/license/activate`, contrôles de droits, signature et dates, erreurs explicites. Activation autorisée en lecture seule pour renouveler. Clé et bail conservés ensemble dans un fichier privé remplacé atomiquement, chargé au redémarrage et utilisé pour les renouvellements automatiques. Un échec d’activation préserve la licence locale précédente.

Vérification : 31 tests backend ciblés passent (client, filtre, contrôleur) ; 5 tests React/Redux du formulaire passent, y compris réponse lente, refus, absence de configuration et absence de stockage navigateur. Build frontend réussi sans sourcemaps après deux arrêts de compilation liés aux ressources pendant la reconstruction Docker.

La reconstruction lancée par l’utilisateur a effectivement activé la licence actuelle : GET `/api/license/state` retourne HTTP 200, valid=true, readOnly=false, ENTERPRISE, PRODUCTION, 10 places complètes et 10 légères. Le nouveau formulaire nécessite la version reconstruite avec les derniers changements ; vérifier sa présence après déploiement.

Validation finale du parcours UI : erreur existante Helmet dans la fiche entreprise corrigée (titre constitué d’une chaîne unique, nom absent pris en charge), 2 tests supplémentaires passent. Chromium confirme formulaire visible, erreur 409 lisible, nouvelle tentative possible, activation et mise à jour Redux, champ clé effacé, absence de clé dans localStorage, état affiché après rechargement. Ce contrôle utilise l’authentification et la société réelles avec réponses de licences simulées, sans changer la licence actuellement active. Total ciblé : 31 tests backend et 7 tests UI, build production réussi. Tests UI reproductibles : `npm run test:license-ui` depuis frontend. Derniers changements à déployer avec la commande Compose utilisant docker-compose.license.yml.

### Rapports et calendrier corrigés — 2026-10-03

Refus HTTP 403 du superadmin aux rapports et événements reproduits. Correction limitée aux lectures : les endpoints acceptent les rôles client/superadmin ; canSeeAnalytics traite le superadmin sans abonnement et refuse proprement les clients sans abonnement. Helper.resolveCompanyId et les contrôles de scope du calendrier conservés. Les 40 thunks de rapports terminent leurs chargements dans finally, les cartes affichent une erreur et proposent Réessayer. Deux mauvais indicateurs de chargement corrigés. Calendrier : chargement propre, erreur/retry, réponses obsolètes ignorées, dates identiques sans nouvelle requête.

Validation finale : 392 tests backend ciblés réussis, 7 tests rapports/calendrier et 7 tests UI licence réussis ; build frontend et typage TypeScript réussis. Les neuf routes de rapports et le calendrier vérifiés dans Chromium sur les erreurs HTTP 403 réelles de l’API courante. L’accès corrigé est testé séparément avec Spring Method Security réel, y compris le refus d’une société étrangère. Voir docs/CORRECTION-RAPPORTS-CALENDRIER-2026-10-03.md.

Publication demandée par l’utilisateur : branche projet, origin https://github.com/quoreichgroup-coder/cmms.git. Les fichiers privés et les trois fichiers vides api/nginx* restent hors commit. Contrôle des secrets locaux sur les fichiers préparés : aucun secret trouvé. Les conteneurs locaux nécessitent la reconstruction pour appliquer ces derniers correctifs.

## Diagnostic CRUD complémentaire

Le diagnostic du 3 octobre a reproduit les 404 des racines Locations/Assets et les refus de création avec le superadmin. Les corrections et validations HTTP/navigateur sont détaillées dans [DIAGNOSTIC-CRUD-2026-10-03.md](DIAGNOSTIC-CRUD-2026-10-03.md). Les tests ont utilisé une base isolée. Les logs historiques Docker restent à fournir et les nouveaux correctifs doivent encore être reconstruits dans les conteneurs actuels.

### HTTPS public et APK mobile — 2026-10-04

Le serveur est maintenant joignable sur `169-58-86-7.sslip.io`. Après ouverture des ports 80/443 et démarrage du service Caddy, le certificat est valide et approuvé ; le site renvoie HTTP 200 et `/api/instance-config` répond HTTP 200 à travers Caddy. Le certificat arrive à échéance le 2 janvier 2027 et son renouvellement est géré par Caddy.

L’APK Android **1.0.52**, versionCode 35, est généré et signé dans `mobile/dist/QPM-1.0.52.apk`. Sa signature est identique à celle de la version 1.0.51, permettant une mise à jour sans désinstallation. Les taps de notification au démarrage à froid sont traités après authentification et initialisation de la navigation, avec validation de l’identifiant avant redirection. L’initialisation après connexion choisit la langue utilisateur, puis celle de l’entreprise, puis l’anglais si les préférences sont absentes. L’APK pointe sur `https://169-58-86-7.sslip.io/api/`. Les 53 tests mobiles passent ; `tsc --noEmit`, la vérification de signature et `git diff --check` passent. Aucun appareil Android/ADB n’est connecté pour un essai visuel natif. Les anciennes URL mobiles mémorisées doivent être effacées depuis **Serveur personnalisé → Réinitialiser**. Les tests de push réel restent suspendus à la configuration Firebase.

Les imports/exports web attendent les confirmations STOMP. Si aucune confirmation n’arrive, le nouvel utilitaire arrête l’indicateur après 120 secondes, libère l’abonnement et demande de vérifier si les données ont déjà été traitées avant une nouvelle tentative. Trois tests du helper passent. Le build web complet passe avec les avertissements de sourcemaps de dépendances connus. Dix tests backend WebSocket/sécurité passent. Le problème d’un éventuel HTTP 403 sur l’installation courante n’a pas été reproduit de nouveau ; cette amélioration évite l’attente infinie mais ne prouve pas le transport STOMP en production.

### Retour de connexion Android et suite iOS — 2026-10-04

L’utilisateur confirme que l’APK 1.0.50 permet la connexion. L’APK courant reste 1.0.52 et utilise la même URL HTTPS. Le parcours de connexion iOS partage l’API, et sa configuration version 1.0.52, bundle `com.cmms.atlas`, build local 6 et URL API sont cohérents. Le démarrage iOS ne configure Firebase que si `GoogleService-Info.plist` est présent ; le fichier est absent ici et Firebase est optionnel pour démarrer.

L’audit Expo passe 15/17 contrôles ; `expo config`, `expo install --check`, TypeScript et les tests mobiles passent. Pas de build/signature IPA possible sur cette machine Linux sans Xcode, EAS CLI ni session Expo. `eas.json` requiert maintenant EAS CLI 12 minimum, requis pour la gestion distante des numéros de build. Avant diffusion iOS, il faut lier le projet EAS et fournir son `EAS_PROJECT_ID`, puis construire/signer via macOS/EAS et vérifier les droits APNs de distribution. Ajouter la configuration Firebase iOS sur EAS seulement si les notifications/Analytics Firebase sont requises.

Les six menus web d’export affichent maintenant le vrai message d’erreur connexion/STOMP via le helper existant, avec un texte de secours et possibilité de réessayer. Les tests des écrans d’export et du helper passent (4 tests), TypeScript et `git diff --check` passent. Aucun déploiement ni publication n’a été effectué.

Vérification publique temps réel sans compte ni jeton : GET `/api/ws/info` avec l’Origin du site répond 200 et autorise exactement cette origine ; le même endpoint avec `https://localhost:3000` répond 403 ; le handshake WebSocket avec l’Origin public répond 101 à travers Caddy et nginx. Cela confirme les étapes SockJS/CORS/proxy. La suite exige un frame STOMP CONNECT authentifié ; le client fournit le JWT dans l’en-tête STOMP `token`. Un jeton absent, expiré, invalide ou révoqué est refusé par conception. Le 403 initial n’est pas attribuable précisément sans le frame CONNECT ou les logs backend, encore indisponibles via le socket Docker.

### Pièces jointes et photos mobiles — 2026-10-04

Le parcours commun d’upload normalise maintenant les noms et MIME types des photos et documents, y compris les URI sans extension et les images dont Expo fournit le MIME séparément. Sur iOS, l’ouverture de la photothèque ne demande plus l’autorisation complète des photos; le sélecteur demande une représentation compatible. Les chemins concernés couvrent l’upload générique, les images des tâches d’intervention et les pièces jointes des commentaires. Les tests ciblés de métadonnées/MIME, sélection multiplateforme et multipart passent. Cela reste à confirmer sur appareils physiques iOS et Android, car aucun appareil n’est connecté ici.

La version **1.0.53**, versionCode 36 (iOS build 7), a été compilée dans `mobile/dist/QPM-1.0.53.apk`. La signature est valide et son empreinte de certificat SHA-256 est identique à celle de 1.0.52, donc la mise à jour Android conserve le même signataire. SHA-256 APK : `57e23cebc9d0abfef936ba78884de85c74986cc582aa185db9db05f7242e3a74`. Les 55 tests mobiles, `tsc --noEmit` et `expo install --check` passent. Les guides d’installation Android pointent désormais vers 1.0.53. Aucun test d’upload réel sur téléphone, de notifications push Firebase ou build IPA iOS n’a été effectué.

### Contrôle préalable de bascule QUOREICH — 2026-10-04

Ajout de `scripts/preflight-quoreich-cutover.sh`, un contrôle local en lecture seule avant reconstruction : fournisseur QUOREICH, URL d’autorité, clé publique Ed25519, environnement, emplacement persistant du bail et de l’empreinte, validation Compose, volume `license_cache` et réseau Docker de l’autorité. Le préflight passe sur le `.env` local; les essais avec KEYGEN et HTTP distant échouent comme attendu. L’endpoint local de santé de l’autorité répond HTTP 200 (`{"status":"ok"}`). La procédure est ajoutée à `dev-docs/QUOREICH-Licensing-Policy.md`.

Vérification en lecture seule de l’installation HTTPS : GET `/api/license/state` répond HTTP 200 avec `valid=true`, `readOnly=false`, édition ENTERPRISE, environnement PRODUCTION et échéance au 2 novembre 2026. La réponse ne contient ni clé de licence ni jeton. L’instance en ligne est donc actuellement activée. Aucun conteneur n’a été redémarré par ce travail. Une checklist d’essai photo/document Android et iOS est ajoutée à `mobile/INSTALLER-APK.md`. La prochaine suite est la revue des changements locaux avant enregistrement; les tests réels d’upload, notifications et fonctionnement iOS/Android nécessitent encore les téléphones.

Première passe de revue locale : aucun fichier n’est indexé et `git diff --check` passe. Les changements forment plusieurs lots (reverse proxy/Caddy, correctifs API/UI de licences et rapports, contrats d’import/export, préparation et versionnement mobile). Les trois fichiers vides `api/nginx`, `api/nginx:80` et `api/nginx:800.0.0.0:3000` sont des résidus hors périmètre et restent à exclure. Le lockfile mobile reflète aussi le passage Sentry de 8.26 à 6.14; la compilation 1.0.53 réussit, mais cette mise à niveau/downgrade mérite une vérification de compatibilité distincte avant un enregistrement global des lots.

### Avertissement des déclencheurs compteur — 2026-10-04

Le prochain point produit concerne la répétition des ordres générés par seuil compteur. La fiche affiche maintenant un avertissement lorsqu’un déclencheur est présent, et les formulaires de création/modification présentent le même avertissement renforcé. Aucun comportement backend n’a changé : chaque relevé du côté déclencheur peut toujours créer un ordre. La décision sur l’effet de `recurrent` et `waitBefore` reste à valider avec le site; l’implémentation dépend de cette règle. Les trois fichiers temporaires `api/nginx*` restent non suivis et exclus.

### Déclencheurs compteur et cadence WEEKLY PM — 2026-10-04

Les seuils génèrent désormais au plus un ordre par franchissement. Le délai `waitBefore` est en secondes et exige que le seuil reste actif; Quartz annule ou revalide le déclenchement différé au dernier relevé avant de créer l’ordre. Les déclencheurs non récurrents restent à usage unique; les récurrents se réarment après retour à l’état normal. Une migration Liquibase ajoute l’état de déclenchement et initialise les seuils déjà actifs comme consommés pour éviter un doublon immédiat après déploiement. Les formulaires exposent maintenant ces deux paramètres.

Correction WEEKLY PM : les occurrences `COMPLETED_DATE` sont déjà calculées à partir de la clôture précédente. Le filtre d’intervalle ancré à `startsOn` ne s’applique qu’aux récurrences `SCHEDULED_DATE`, afin d’éviter de sauter une occurrence hebdomadaire après une clôture tardive. Le script isolé `frontend/scripts/mine-meter-pilot.cjs` couvre les deux sens de seuil, l’égalité, l’attente, l’annulation, l’absence de doublon et le réarmement. Il requiert toujours sa fixture/base de pilote; tests ciblés de `ScheduleService` et de la politique de seuil sont exécutés localement.

La base locale contient le PM `WEEKLY BEARING INSPECTION`, enregistré `DAILY` avec une fréquence de 7 jours et sans jours de semaine. Le traitement utilise maintenant des intervalles Quartz calendaires dans le fuseau de l’entreprise et conserve l’heure locale lors du changement d’heure pour les cadences quotidiennes, mensuelles et annuelles. L’enregistrement n’a pas été modifié. Le rebuild backend a été appliqué; Liquibase a terminé et `/health-check` répond HTTP 200. Le trigger de ce PM est bien `CAL_INT`.

L’écran de création et de modification PM affiche maintenant un aperçu non persistant des huit prochaines occurrences selon les valeurs du formulaire et le fuseau de l’entreprise. Les récurrences basées sur l’achèvement indiquent que les dates après la première supposent une clôture à la date prévue. Les tests d’aperçu couvrent le changement d’heure, la cadence hebdomadaire multiple, les jours choisis et la date de fin. Les builds frontend local et Docker passent; les avertissements de source maps tierces restent inchangés.

La comparaison SAP et les écarts fonctionnels restants sont suivis dans [BACKLOG-MAINTENANCE-PREVENTIVE.md](BACKLOG-MAINTENANCE-PREVENTIVE.md). En particulier, un déclencheur au seuil n’est pas un plan récurrent basé sur un cycle compteur; cette évolution doit conserver deux parcours distincts.

### Historique des appels PM — 2026-10-04

La fiche de PM expose maintenant les ordres générés sous forme d’historique paginé, avec ID personnalisé, date de création, échéance et statut. La route `/preventive-maintenances/{id}/work-order-history` requiert le rôle client, vérifie le droit de visibilité sur le PM et borne la taille de page à 100. Les tests vérifient le contrat paginé et le refus des autres rôles. Cela complète les ordres déjà créés seulement; les occurrences prévues sans ordre et les appels ignorés/reportés nécessitent toujours une entité d’historique durable distincte. Les cycles PM basés sur compteur restent la prochaine tranche fonctionnelle.

## Stabilisation des rapports analytiques — 9 octobre 2026

Les 13 widgets signalés sur les rapports **Time and Cost**, **Incomplete Work Orders** et **Work Order Analysis** partageaient le traitement d’accès analytique. Les anciennes traces de navigateur disponibles montrent des refus HTTP 403; l’ancien client transformait parfois une réponse vide ou `null` en erreur opaque. Le code actuel contient le contrôle d’accès superadmin sans abonnement, garde le périmètre société, libère les états de chargement dans les thunks et affiche un message exploitable avec possibilité de réessayer. Le client API conserve aussi le statut HTTP et le corps de réponse pour éviter le message littéral `null`.

Vérifications ciblées du 9 octobre :

- `node --test scripts/report-loading.test.cjs scripts/api-error-message.test.cjs scripts/api-client-errors.test.cjs` depuis `frontend` : **3 suites réussies**, dont le contrôle des 40 thunks analytiques et du calendrier.
- `AnalyticsAccessScopeTest` : **5 tests réussis** dans une copie temporaire de l’API.
- `AnalyticsMethodSecurityTest` : non validé dans cet environnement. Mockito/Byte Buddy ne peut pas s’attacher à la JVM ici; l’échec est environnemental, sans assertion métier échouée.
- Build frontend : arrêté par manque de mémoire. Les conteneurs locaux ne sont pas accessibles depuis cette session; aucun statut d’API live après reconstruction n’est revendiqué.

Le correctif reste à confirmer sur l’instance après reconstruction de l’API et du frontend. Si un widget échoue encore, relever le statut HTTP et le corps expurgé dans l’onglet Network; ne partager aucun jeton ni secret.

## Suite du MVP

Le guide [`TESTS-PM-STRATEGIES-MULTICOMPTEURS.md`](TESTS-PM-STRATEGIES-MULTICOMPTEURS.md) marque encore les tests multi-compteurs OR/AND, les reports, certains relevés de seuil et les contrôles mobile/droits comme à faire ou partiels. La priorité est de terminer ces scénarios terrain et de confirmer les rapports avec les réponses live. La refonte UI/UX et le branding viendront après cette validation, comme prévu dans [`BACKLOG-MAINTENANCE-PREVENTIVE.md`](BACKLOG-MAINTENANCE-PREVENTIVE.md).

## Revue globale du projet et préparation UI/UX — 2026-10-10

La revue ciblée du dépôt, des routes web/mobile et de `docs/design.md` est consignée dans [`AUDIT-ETAT-PROJET-UI-UX-2026-10-10.md`](AUDIT-ETAT-PROJET-UI-UX-2026-10-10.md). QPM contient les domaines CMMS/EAM principaux et la version source mobile indique 1.0.55; cela ne confirme ni l’état de l’instance courante ni la disponibilité d’un APK/IPA de cette version.

**État opérationnel à confirmer avant toute recette utilisateur :** les derniers journaux communiqués le 9 octobre montrent le backend en redémarrage après échec de validation Hibernate/JPA (`request.site_id`, `work_order_aud.site_mod`, puis séquence `company_configuration_audit_seq`). Liquibase annonçait alors que les 836 changesets étaient à jour et les requêtes `/api/health-check` via nginx renvoyaient 502. Des migrations correctives figurent depuis dans le dépôt local, mais aucun résultat ultérieur de démarrage stable et de contrôle HTTP n’est consigné ici. Ne pas considérer ces endpoints comme réparés tant que `docker compose ps`, les logs et les réponses HTTP ne le prouvent pas.

Les changements locaux touchent plusieurs chantiers, notamment PM/compteurs, société/sites/documents, API/frontend/mobile et le proxy. Ils n’ont pas été commités par cette revue. La validation visuelle authentifiée, la recette des écrans réels et les tests sur appareils ne sont pas revendiqués. Le rapport distingue le code repéré, les anciennes validations datées et ce qui reste à exercer.

La refonte est préparée selon la séquence **stabilisation → recette MVP → recherche et baseline UI/UX → prototype → implémentation responsive web et native → branding**. La recherche de références externes et la validation de prototypes n’ont pas commencé; elles sont à réaliser avant un redesign majeur, comme l’exige [`design.md`](design.md).
