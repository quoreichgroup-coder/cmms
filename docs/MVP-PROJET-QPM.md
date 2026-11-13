# Périmètre verrouillé du MVP — Projet QPM

**Statut :** périmètre fonctionnel de référence pour le MVP QPM.
**Portée :** application Web, API, base de données, application mobile et services nécessaires à leur exploitation.
**Règle :** ce document définit ce qui doit fonctionner pour livrer le MVP; il ne certifie pas que chaque critère a déjà été recetté en environnement réel.

## 1. Objectif du MVP

Permettre à une organisation de gérer de bout en bout ses demandes et travaux de maintenance, de planifier la maintenance préventive, de gérer les pièces et les achats associés, puis de suivre l’exécution depuis le Web et le mobile, avec des droits cohérents et des données conservées.

Le MVP stabilise les parcours et modules déjà présents dans QPM. Il n’a pas pour objectif de transformer QPM en ERP complet ni de reproduire l’ensemble de SAP.

## 2. Périmètre fonctionnel inclus

### P0 — Fondations communes

- Connexion, session, récupération d’erreurs réseau et sélection de l’instance autorisée.
- Séparation des entreprises et sites; autorisation appliquée côté API pour chaque lecture et mutation.
- Disponibilité d’un module/entitlement et permission d’un utilisateur sont contrôlées séparément; masquer un lien de navigation ne remplace jamais l’autorisation API. Le MVP conserve la navigation actuelle et ses routes.
- Gestion des utilisateurs, équipes, rôles et permissions nécessaires aux parcours MVP.
- Paramètres opérationnels regroupés dans Settings, avec validation et retour d’erreur explicite.
- Préservation des données existantes et migrations versionnées, additives et compatibles.
- États d’interface cohérents : chargement, vide, erreur, accès refusé, réussite et nouvelle tentative.
- Comportement utilisable en responsive; aucune modification incompatible des routes ou contrats déjà utilisés par le mobile.
- Respect de la charte visuelle QPM/QUOREICH GROUP pour les éléments de marque des écrans touchés; les couleurs et polices métier conservent leurs usages sémantiques et restent accessibles.

### P0 — Cycle de maintenance

- Référentiels d’actifs, emplacements, compteurs, catégories, équipes et pièces nécessaires à un ordre.
- Fiche équipement et emplacement avec identifiants et hiérarchie, équipements installés et ordres historiques associés selon les droits et les données disponibles; distinguer historique vide, donnée inaccessible et erreur de chargement.
- Création et suivi des demandes; qualification et lien vers les ordres selon les droits existants.
- Création, planification, affectation, mise à jour, exécution et clôture d’un Work Order, avec historique, tâches, temps, pièces, commentaires et fichiers selon les fonctions disponibles.
- Task Lists : groupe et compteur générés selon les règles existantes, opérations, composants associés à la bonne opération, validation, import/export et sélection dans PM/WO.
- Plans PM calendaires ou compteur lorsqu’ils existent déjà : occurrences traçables et génération sans doublon.
- Génération PM → WO avec copie des opérations et composants comme besoins planifiés; aucune réservation ni consommation implicite.
- Recherche, filtres, navigation et pagination des listes nécessaires aux tâches quotidiennes.

### P1 — Achats et pièces

- Consultation des pièces et disponibilités selon les données existantes.
- Création d’une Purchase Requisition et soumission à un circuit d’approbation configuré avec approbateurs éligibles.
- Décision et traçabilité des approbations selon le niveau et les permissions configurés.
- Création d’un Purchase Order depuis une PR approuvée et création directe lorsque les règles de QPM l’autorisent.
- Réception et mise à jour du statut d’achat selon les parcours déjà implémentés.
- Séparation claire entre besoin planifié, demande d’achat, commande, réception, réservation et consommation.

### P1 — Documents, rapports et visibilité

- Documents attachés consultables et téléchargeables selon les autorisations.
- Modèles et sorties PDF pour Ordres de travail, Demandes de maintenance, PR et PO, avec sélection du modèle publié, aperçu, émission/archivage, réouverture pour impression et téléchargement.
- Tableaux de bord et statistiques alimentés par les vraies données, avec distinction entre zéro, absence de données, chargement, erreur et refus d’accès.
- Centre d’aide consultable et administrable par les rôles autorisés, lorsque son contenu est initialisé.

### P1 — Application mobile

- Connexion à l’instance configurée et session stable.
- Consultation des actifs, demandes et ordres autorisés.
- Parcours terrain : ouvrir un ordre, mettre à jour les tâches, consigner temps/pièces/commentaires/fichiers et clôturer si les champs obligatoires sont satisfaits.
- Synchronisation par API, retour clair en cas d’échec et protection contre les doubles soumissions.
- Affichage adapté au téléphone et compatibilité des rôles technicien, responsable et demandeur selon les fonctions mobiles existantes.

Le détail de la recette pilote mobile reste défini dans [`MVP-MOBILE-QPM.md`](MVP-MOBILE-QPM.md).

## 3. Critères de sortie du MVP projet

Le MVP est prêt à être accepté lorsque les scénarios suivants passent sur une instance de préproduction représentative, avec des comptes et données de test autorisés :

1. Un compte de chaque rôle MVP ne voit et ne modifie que les données et actions de son périmètre; les refus API sont vérifiés.
2. Une demande peut être qualifiée puis suivie jusqu’à un WO sans perte de lien ni création involontaire de doublon.
3. Une Task List avec plusieurs opérations et composants conserve ses relations après enregistrement, relecture, import/export et sélection dans un PM/WO.
4. Un PM produit les occurrences et le WO attendus; répétition d’un même déclencheur ne crée pas de WO en double.
5. Le technicien peut exécuter puis clôturer un WO sur téléphone; une erreur réseau ou validation garde un état compréhensible et ne crée pas de double envoi.
6. Un besoin de pièce reste planifié jusqu’aux actions explicites de réservation, réception ou consommation.
7. Une PR valide suit le circuit configuré; les personnes autorisées voient l’action d’approbation et l’historique. Un PO est créable selon les règles, avec ou sans PR si le mode direct est activé.
8. Les documents et rapports supportés peuvent être prévisualisés, imprimés ou exportés par les rôles autorisés.
9. Les indicateurs testés correspondent aux enregistrements source; erreur, absence et valeur nulle sont différenciées.
10. Les migrations s’exécutent sur une copie de base représentative sans perte des données existantes; les services nécessaires démarrent et leurs erreurs sont observables.
11. Les parcours P0 et P1 concernés sont vérifiés aux largeurs desktop et mobile; routes et payloads consommés par l’application mobile restent compatibles.

Les résultats doivent être enregistrés avec environnement, version/commit, rôle, scénario, résultat et limites. Un build réussi seul ne vaut pas recette fonctionnelle.

### Points de validation encore ouverts dans les backlogs consultés

- **Cycle de vie WO :** les tests de service/contrôleur sont consignés comme passés; l’intégration avec migration et droits sur une base représentative, puis les essais Android/iOS, restent indiqués comme ouverts dans [`MVP-MOBILE-QPM.md`](MVP-MOBILE-QPM.md).
- **Task Lists / PM :** vérifier avec un compte autorisé la recherche et le chargement du catalogue de pièces dans chaque opération, puis la persistance/relecture, l’import/export et la sélection d’une Task List récemment créée dans un plan PM et un WO. Vérifier aussi le chargement/enregistrement de ses paramètres (centres de travail, clés de contrôle, conditions système, unités et numérotation automatique). Les composants doivent garder leur opération, quantité, unité et emplacement; toute erreur de catalogue doit être distinguée d’un refus d’accès ou d’une liste vide.
- **PM préventif :** les cycles et registres documentés comme implémentés doivent être recettés sur un plan pilote réel (seuil/date, report, génération unique, lien occurrence-WO et clôture). Les stratégies avancées et le rattrapage multi-seuils restent post-MVP tant qu’ils ne sont pas nécessaires au scénario pilote.
- **Actifs et emplacements :** recetter sur des données représentatives la hiérarchie parent/enfant et les relations emplacement-équipement-ordres; confirmer qu’une fiche sans relation, un accès refusé et une erreur API donnent des états distincts.
- **Dashboard et statistiques :** comparer les indicateurs Web et mobile à des enregistrements source de la préproduction. Le signalement antérieur « No data » doit être considéré comme validé uniquement après cette comparaison, avec droits adaptés et distinction entre zéro réel, absence de données et panne de chargement.
- **Procurement :** la V1 et les tests ciblés sont consignés comme livrés; confirmer en recette la soumission PR, l’éligibilité/la visibilité des approbateurs, le PO direct si activé, la route de gestion des approbations, et la recette visuelle responsive dans [`BACKLOG-APPROBATIONS-ACHATS.md`](BACKLOG-APPROBATIONS-ACHATS.md).
- **Centre d’aide :** l’administration et la lecture doivent être vérifiées avec les rôles attendus; les contrôles statiques ciblés sont consignés comme passés, mais migration documentaire et recette des droits/parcours restent ouvertes dans [`BACKLOG-CENTRE-AIDE-QPM.md`](BACKLOG-CENTRE-AIDE-QPM.md).
- **Web et documents :** les parcours d’aperçu, d’émission et de réimpression PR/PO doivent être vérifiés avec des modèles publiés sur une instance, en plus des tests frontend ciblés.

Ces points sont des portes de recette, pas des fonctions à redévelopper automatiquement. Une correction de code n’est requise que si la validation démontre un défaut reproductible.

### Ordre de fermeture des portes de recette

1. **Fondations et données :** démarrage Web/API, migrations additives, sessions, accès multi-entreprise/site, permissions et états d’erreur.
2. **Maintenance P0 :** Task List avec pièces → PM → WO → exécution/clôture; contrôler persistance, doublons, recherche, import/export et responsive.
3. **Achats et documents :** PR soumise/approuvée, PO issu d’une PR et PO direct autorisé, puis aperçu/émission/réimpression/export des modèles publiés.
4. **Visibilité et aide :** réconcilier les indicateurs à la source; vérifier les articles d’aide initialisés, les rôles et la migration.
5. **Pilote mobile :** installer les artefacts correspondant au code recetté et rejouer le parcours technicien sur Android et iOS; produire une IPA/TestFlight et un appareil iOS pour fermer la recette iOS.

Cet ordre ne rend pas les améliorations hors périmètre admissibles et ne vaut pas approbation de mise en production.

### Vérifications locales pendant le verrouillage du périmètre — 5 novembre 2026

- Web : typecheck TypeScript, ESLint ciblé sur les fichiers Procurement/documents, tests ciblés modèles de documents, verrou anti-double action et séquencement PO réussis.
- API : `PartControllerMiniSearchTest` réussi (4/4); `MaintenanceTaskListUpdateTest`, `MaintenanceTaskListDefaultsTest` et `MaintenanceTaskListConfigurationServiceTest` réussis (17/17). Les routes de recherche/sélection mini existent et filtrent selon les droits d’accès aux pièces.
- Documentation : liens des trois documents de périmètre contrôlés; `git diff --check` réussi.
- Ces vérifications locales ne remplacent pas une recette authentifiée contre les services et la base de préproduction, ni l’installation mobile sur appareil.

### Vérifications complémentaires — reprise du 5 novembre 2026

- API : suites Task List, configuration et PM, `PartControllerMiniSearchTest`, `DocumentationServiceAssetAccessTest` et `MaintenanceTaskListCsvTest` réussies (**68 tests, 0 échec** selon les rapports Surefire). Les nouveaux tests CSV confirment l’ordre des opérations et leurs matériaux, ainsi que l’import des anciens fichiers sans colonne `operationOrder`; ils ne remplacent pas une recette HTTP authentifiée ou sur base représentative.
- Sécurité Centre d’aide : `DocumentationServiceAssetAccessTest` réussi (**3 tests, 0 échec**) pour l’accès d’un lecteur autorisé, le refus d’un article restreint et l’isolation interentreprise.
- Web / Centre d’aide : typecheck global, ESLint ciblé, Prettier, tests de routes/recherche/accessibilité et de documents (7/7 suites), puis build CRA basse mémoire réussis. Un avertissement de taille de bundle demeure; aucune recette navigateur authentifiée n’a été faite.
- Vérification finale UI/CSV : affichage bilingue de la ligne CSV invalide; typecheck, ESLint ciblé et build Web CRA basse mémoire réussis le 5 novembre. Le build conserve l’avertissement de bundle volumineux (chunk gzip principal d’environ 2,3 Mo); cette optimisation est à suivre séparément si elle bloque les objectifs de performance du MVP.
- Mobile : le nouvel APK `QPM-1.0.60.apk` a été généré avec succès; régressions (55), onboarding (5), disponibilités (5) et TypeScript passent. ZIP/CRC et manifeste vérifiés; appareil non testé. Empreinte et taille figurent dans [`MVP-MOBILE-QPM.md`](MVP-MOBILE-QPM.md).
- Conteneurs : `docker compose up -d --build frontend` a reconstruit les images frontend, API et renderer PDF; les trois conteneurs sont actifs. Le frontend répond en HTTP sur son port interne 3000, le renderer retourne `{"status":"ok","enabled":true}`, et Spring Boot confirme API démarrée après Liquibase (885 migrations déjà appliquées, DB PostgreSQL 16.15). L’endpoint Actuator `/actuator/health` répond toutefois **503** car le contrôle SMTP échoue avec `535` (identifiant/mot de passe refusé); le serveur démarre mais l’état de santé reste dégradé et l’envoi d’e-mails doit être corrigé.

## 4. Hors périmètre du MVP

- Intégration active avec SAP ECC/S/4HANA, Sage ou un autre ERP; seules les frontières et données déjà existantes sont préservées.
- Remplacement ou refonte générale de l’architecture, du design system ou de tous les écrans.
- Refonte complète du sidebar et activation de modules clients entièrement configurables.
- Fonctions avancées d’ERP : sourcing multi-fournisseurs, appels d’offres, contrats, facturation complète, grand livre et écritures comptables.
- Stratégies PM multi-packages complexes ou nouveaux algorithmes non nécessaires aux plans existants.
- Nouveaux modules d’IA, prédiction, fiabilité avancée ou tableaux analytiques sans critère opérationnel validé.
- Refonte mobile complète, mode hors ligne intégral ou remplacement des contrats API existants.
- Personnalisation ad hoc par client sans besoin pilote démontré.
- Optimisations d’échelle non étayées par une mesure, sauf défaut de performance empêchant un parcours MVP.

Les détails non nécessaires au lancement restent dans les backlogs spécialisés, notamment [`MVP-MAINTENANCE-SCOPE.md`](MVP-MAINTENANCE-SCOPE.md), [`BACKLOG-MAINTENANCE-PREVENTIVE.md`](BACKLOG-MAINTENANCE-PREVENTIVE.md), [`BACKLOG-APPROBATIONS-ACHATS.md`](BACKLOG-APPROBATIONS-ACHATS.md), [`BACKLOG-CENTRE-AIDE-QPM.md`](BACKLOG-CENTRE-AIDE-QPM.md) et [`WEB-UI-REDESIGN-BACKLOG.md`](WEB-UI-REDESIGN-BACKLOG.md).

## 5. Règle de contrôle des changements

Chaque demande nouvelle est classée avant développement :

- **Bloqueur MVP :** empêche un critère de sortie, entraîne une perte/corruption de données, contourne les droits ou rend un parcours P0 inexécutable. À corriger dans le MVP.
- **Post-MVP :** amélioration, nouveau module, automatisation ou changement de confort sans blocage d’un critère de sortie. À inscrire dans le backlog correspondant, sans l’ajouter au MVP en cours.

Une demande ne rentre dans le MVP qu’avec son parcours utilisateur, son rôle, son résultat attendu, ses impacts API/données/mobile et son critère de recette. Le périmètre ne change qu’après décision explicite et mise à jour de ce document.

## 6. Documents de référence

- [`BACKLOG-POST-MVP-QPM.md`](BACKLOG-POST-MVP-QPM.md) — index consolidé des chantiers, portes de recette MVP et travaux post-MVP.
- [`MVP-RESTANT-2026-11-09.md`](MVP-RESTANT-2026-11-09.md) — état observé et preuves de validation restantes.
- [`STACK.md`](STACK.md) — versions et architecture actuellement documentées.
- [`CHARTE-VISUELLE-QPM.md`](CHARTE-VISUELLE-QPM.md) — couleurs de marque et familles typographiques fournies par QUOREICH GROUP.
- [`ui-ux-assessment/02-APPLICATION-ARCHITECTURE.md`](ui-ux-assessment/02-APPLICATION-ARCHITECTURE.md) — architecture applicative et modules inventoriés.
- [`PROCUREMENT-SAP-ARCHITECTURE.md`](PROCUREMENT-SAP-ARCHITECTURE.md) — frontières actuelles du domaine achat et points d’intégration.
- [`MVP-MAINTENANCE-SCOPE.md`](MVP-MAINTENANCE-SCOPE.md) — détail du sous-périmètre maintenance.
- [`MVP-MOBILE-QPM.md`](MVP-MOBILE-QPM.md) — décision et critères de recette terrain mobile.
- [`BACKLOG-MAINTENANCE-PREVENTIVE.md`](BACKLOG-MAINTENANCE-PREVENTIVE.md) — extensions PM au-delà du socle MVP.
- [`BACKLOG-APPROBATIONS-ACHATS.md`](BACKLOG-APPROBATIONS-ACHATS.md) — backlog de configuration et d’évolution des circuits d’achat.
- [`BACKLOG-CENTRE-AIDE-QPM.md`](BACKLOG-CENTRE-AIDE-QPM.md) — validation et extensions du centre d’aide.
- [`AUDIT-PROCUREMENT-SAP-SAGE300.md`](AUDIT-PROCUREMENT-SAP-SAGE300.md) — règles d’achat et limites d’intégration connues.
