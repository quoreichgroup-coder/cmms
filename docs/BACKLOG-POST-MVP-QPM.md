# Index consolidé des backlogs QPM

**État de référence :** 13 novembre 2026. Cet index réconcilie les backlogs spécialisés avec le périmètre verrouillé du MVP. Il sert à choisir le prochain chantier; les documents liés gardent les détails, preuves et décisions métier.

## Règle de lecture

- **MVP à recetter** : capacité déjà implémentée dont la sortie MVP n’est pas confirmée en préproduction ou sur appareil. Ce n’est pas un nouveau développement tant qu’un défaut concret n’est pas reproduit.
- **MVP à corriger** : défaut qui bloque un critère C1–C11, contourne les droits ou met les données en risque. À traiter avant d’élargir le périmètre.
- **Post-MVP** : extension ou confort qui ne bloque pas les critères de sortie. Elle reste dans son backlog spécialisé.
- **Conditionnel** : décision métier, données ou accès externes requis avant de démarrer; ne pas coder une règle supposée.

Le périmètre et les critères officiels restent dans [MVP-PROJET-QPM.md](MVP-PROJET-QPM.md). L’état des portes de recette est tenu dans [MVP-RESTANT-2026-11-09.md](MVP-RESTANT-2026-11-09.md). Aucun item ci-dessous ne certifie une mise en production.

## Priorité immédiate — clôturer la recette MVP

| Domaine | État consolidé | Prochaine action / preuve de clôture | Référence |
| --- | --- | --- | --- |
| Environnement et livraison | Bloquant externe : validité de licence, SMTP, migration/versionnée sur instance et état CI doivent être confirmés sur la recette. Les dernières observations consignées ne suffisent pas à prouver l’état courant. | Exécuter la checklist runtime sur une préproduction autorisée; consigner commit, environnement, réponse des services et résultat CI. Ne pas conclure à partir d’un build local. | [Reste du MVP §2 et §6](MVP-RESTANT-2026-11-09.md) |
| Accès et rôles (C1) | Correctifs de sécurité documentés et tests ciblés présents; recette négative réelle par rôle/site encore ouverte. | Rejouer lecture, création, modification et refus API avec comptes représentatifs et vérifier l’isolation entre sociétés. | [Reste du MVP §3](MVP-RESTANT-2026-11-09.md), [backlog Web](WEB-UI-REDESIGN-BACKLOG.md) |
| Maintenance (C2–C4) | Plusieurs parcours sont implémentés; Task Lists, composants par opération et plans PM nécessitent une recette authentifiée. Le PM compteur a des décisions pilote explicites. | Tester persistance et relations Task List → PM/WO; résoudre avec le métier le rattrapage des seuils sautés et le blocage de la prochaine occurrence jusqu’à clôture. | [MVP maintenance](MVP-MAINTENANCE-SCOPE.md), [PM préventive](BACKLOG-MAINTENANCE-PREVENTIVE.md) |
| Mobile (C5) | Correctif de coercition Timestamp intégré et tests ciblés passés; l’APK 1.0.61 est documenté, mais appareil/payload réel non validés. `npx tsc --noEmit` reproduit des incompatibilités JSX sur `SheetProvider`, `NativeImageViewer`, `BottomTabBar`, `TabView` et l’option `tabBar` du navigateur. Expo 53 signale les dépendances conformes à son catalogue local (mode hors ligne); aucun cast de contournement n’est retenu. | Recetter l’APK Android avec API réelle. Séparément, valider une matrice de versions / migration des types React Navigation, puis exécuter typecheck et builds Android/iOS; traiter le TS comme dette de cohérence tant qu’il ne bloque pas la compilation mobile. | [MVP mobile](MVP-MOBILE-QPM.md), [Reste du MVP §3 et §6](MVP-RESTANT-2026-11-09.md) |
| Achats / documents (C6–C8) | Circuit PR/PO V1 et commandes directes sont livrés et couverts par tests ciblés; recette visuelle responsive et parcours multi-utilisateur restent à faire. Modèles PR/PO doivent être publiés sur l’instance de recette. | Faire une PR soumise puis approuvée par le bon rôle; créer un PO selon les modes permis; imprimer/apercevoir/exporter un document avec modèle publié. Vérifier que besoin planifié, réservation, réception et consommation restent distincts. | [Approbations achats](BACKLOG-APPROBATIONS-ACHATS.md), [architecture Procurement](PROCUREMENT-SAP-ARCHITECTURE.md), [Reste du MVP §3](MVP-RESTANT-2026-11-09.md) |
| Données, indicateurs et migration (C9–C10) | Validation sur copie représentative et comparaison des KPI sur données autorisées restent à produire. | Vérifier sauvegarde/restauration, migrations additives sur copie, puis rapprocher les KPI avec leurs enregistrements sources. | [MVP projet §3](MVP-PROJET-QPM.md), [Reste du MVP §3](MVP-RESTANT-2026-11-09.md) |
| Responsive (C11) | Recette Web et mobile authentifiée à plusieurs largeurs/appareils non close. | Parcourir les flux MVP à 390/768/1440 px, les états vide/erreur/refus, clavier et tactile; enregistrer captures et défauts. | [Backlog UI/UX](FINAL-UIUX-MAINTENANCE-BACKLOG.md), [redesign Web](WEB-UI-REDESIGN-BACKLOG.md) |
| Centre d’aide (si inclus dans la première mise en service) | API et UI présentes; migrations et parcours par rôle ne sont pas validés sur préproduction. Le document exige actuellement PostgreSQL 18, tandis que la dernière observation runtime citée est PostgreSQL 16.15 : cette exigence doit être vérifiée et alignée, pas supposée. | Confirmer version réellement supportée par les migrations; appliquer sur copie restaurable, vérifier répétition/idempotence et accès par rôle avant production. | [Backlog Centre d’aide](BACKLOG-CENTRE-AIDE-QPM.md) |

## Post-MVP confirmé ou conditionnel

| Chantier | Classement | Ce qui reste réellement | Référence |
| --- | --- | --- | --- |
| Approbations avancées PR/PO | Post-MVP / conditionnel | V1 livrée. Reste recette de la V1; ensuite seulement, décider si réaffectation auditée, critères site/département supplémentaires, simulation ou unification de l’historique legacy répondent à un besoin réel. | [Backlog approbations](BACKLOG-APPROBATIONS-ACHATS.md) |
| Réception et traçabilité Procurement | Post-MVP / décision métier | Le flux nouveau et les reçus immuables existent pour les PO concernés. Clarifier politique des anciens/nouveaux PO, reliquats, inspection, sur-réception, annulation/retour, unités/précisions, droits et historique avant migration/extension. Aucun backfill fiable des reçus historiques n’est établi. | [Architecture Procurement](PROCUREMENT-SAP-ARCHITECTURE.md) |
| Intégration ERP / fournisseurs | Conditionnel | Aucun connecteur SAP/Sage n’est activé; l’outbox n’équivaut pas à un consommateur durable. Nécessite système de test, identifiants, contrats, mapping et propriétaire des données. | [Audit SAP/Sage 300](AUDIT-PROCUREMENT-SAP-SAGE300.md), [architecture Procurement](PROCUREMENT-SAP-ARCHITECTURE.md) |
| Source-list fournisseur, priorités et affectation acheteur | Post-MVP / conditionnel | `Part.vendors` reste informatif; relation datée de source-list et règles d’affectation ne sont pas à inventer sans besoin pilote. | [Backlog UI/UX — PROCUREMENT-01](FINAL-UIUX-MAINTENANCE-BACKLOG.md) |
| Roster d’entreprise | Post-MVP | Étendre les shifts individuels vers rotations, équipes, sites/centres, absences, remplacements, validation, relève et présence réelle; réutiliser les entités déjà présentes. | [Backlog UI/UX — SHIFT-ROSTER-01](FINAL-UIUX-MAINTENANCE-BACKLOG.md) |
| Calendrier d’arrêts | Post-MVP | Architecture initiale documentée; règles de fenêtre et modèle opérationnel à valider avec pilote. Préserver l’historique `AssetDowntime`; ne pas modifier implicitement dates/statuts WO. | [Architecture Shutdown](SHUTDOWN-PLANNING-ARCHITECTURE.md) |
| Maintenance préventive avancée | Conditionnel au pilote | Valider les stratégies compteur/calendrier existantes; ajouter seulement les combinaisons multi-compteurs ou règles de rattrapage dont le site confirme le besoin. | [Backlog PM](BACKLOG-MAINTENANCE-PREVENTIVE.md), [recette stratégies multi-compteurs](TESTS-PM-STRATEGIES-MULTICOMPTEURS.md) |
| Centre d’aide évolué | Post-MVP | Recherche serveur, retours d’articles, analytique d’usage, contenu initial des nouvelles sociétés, optimisation des images et extension éditoriale après stabilisation/migration du socle. | [Backlog Centre d’aide HCP-05 à HCP-12](BACKLOG-CENTRE-AIDE-QPM.md) |
| Sécurité Web et exploitation | Post-MVP à traiter selon risque; certains points exigent préproduction | SEC-WEB-02 (JWT `localStorage`), CSRF et migration de session, tests auth Chromium, vérification CSP/proxy, rotation refresh et durcissement intégrations. Aucun changement de stockage de jeton sans plan de compatibilité Web/Mobile/API. | [ADR auth Web](WEB-AUTH-TOKEN-ADR-2026-10-18.md), [backlog Web](WEB-UI-REDESIGN-BACKLOG.md), [Reste du MVP §4](MVP-RESTANT-2026-11-09.md) |
| Import/export hiérarchies et iOS | Recette / conditionnel | Migration d’échange inter-environnements à valider sur base de test; iOS exige compte Apple et configuration EAS. Ils ne sont pas des travaux à fusionner avec le développement des modules. | [Reste du MVP](MVP-RESTANT-2026-11-09.md), [MVP mobile](MVP-MOBILE-QPM.md) |
| Readiness maintenance | Post-MVP dépendant | Vue explicable de disponibilité WO/pièces/arrêts/accès, uniquement quand les sources roster, shutdown et procurement sont prêtes; aucune autorisation d’exécuter ne découle d’un score. | [Backlog UI/UX — READINESS-01](FINAL-UIUX-MAINTENANCE-BACKLOG.md) |

## Corrections de cohérence appliquées dans cette révision

- `PROC-14` n’est plus marqué « non implémenté » : la V1 est livrée; la recette reste ouverte.
- Le PO possède un snapshot de prix/devise par ligne. Cela ne signifie pas que les seuils d’approbation utilisent ce total commercial : l’architecture décrit encore un montant estimatif basé sur le coût maître.
- Les réceptions immuables concernent le flux nouveau; les PO historiques gardent leur compatibilité et ne doivent pas recevoir de reçus reconstruits sans preuve.
- Les intitulés « reste à faire » des backlogs couvrent parfois recette, décision, intégration ou développement. La classe est désormais précisée ici.

## Règle de mise à jour

Quand un chantier change d’état, mettre à jour d’abord son backlog spécialisé avec la preuve (test, migration, recette ou décision), puis cet index et le statut MVP si un critère C1–C11 est concerné. Les journaux historiques peuvent rester datés; ils ne remplacent pas le statut courant placé en tête du document.
