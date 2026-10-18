# QPM — Backlog UI/UX final et modules de maintenance

**Statut : cadrage ajouté au backlog; aucune implémentation de ce périmètre dans cette passe.**  
Ce document complète [`WEB-UI-REDESIGN-BACKLOG.md`](WEB-UI-REDESIGN-BACKLOG.md) et [`MVP-MOBILE-QPM.md`](MVP-MOBILE-QPM.md). Il conserve les routes, contrats et règles métier tant qu’un lot backend dédié n’a pas été cadré.

## Audit initial fondé sur le dépôt

| Domaine | Existant vérifié | Écart / décision de backlog |
| --- | --- | --- |
| Mobile — navigation | `mobile/navigation/index.tsx` expose Home, Work Orders, création, Requests conditionnel et More. Le gros bouton central est actuellement **Create**; Scan existe comme destination et raccourci ailleurs. | Prototyper la matrice destinations × rôles avant de déplacer le CTA central vers Scan. Un FAB de création est acceptable seulement si les destinations, permissions et parcours actuels restent accessibles. |
| Mobile — Home / Stats | `HomeScreen.tsx` et `WorkOrderStatsScreen.tsx` consomment le même endpoint d’overview et montrent des métriques OT similaires; les valeurs viennent de l’API avec états de chargement/erreur. | Dédoublonner la présentation : Home orienté tâches du jour et alertes réellement disponibles; Stats réservé aux métriques servies. Nouveaux KPI seulement après confirmation des sources API et permissions. Aucun chiffre fictif. |
| Mobile — apparence | Tokens d’apparence et thème clair/sombre existent. | Construire le pill et le bouton Scan sur les tokens QPM; traiter `#A5A6FA` comme proposition, pas comme nouveau token de marque avant vérification du contraste et de la cohérence Light/Dark. Vérifier safe-area, clavier et recouvrement. |
| Web — sidebar | `ExtendedSidebarLayout` dispose déjà d’un toggle desktop, d’une sidebar sombre indigo, d’un drawer mobile et d’états focus/actif; UX-02/UX-14 restent en recette visuelle. | La proposition de fond bleu `#4B60EE` avec sélection navy `#111D38` inverse la direction actuelle. La comparer à l’existant avant décision. Mesurer le contenu avant de fixer 216/68 px (la largeur compacte actuelle est proche de 80 px). |
| Équipes / horaires | `ShiftConfiguration`, `ShiftException`, `ShiftConfigurationController` et `ShiftConfigurationModal` existent; la configuration individuelle est utilisée par Workload. | Réutiliser les données personnelles existantes. Elles ne constituent pas un roster d’entreprise avec rotations, absences, affectations site/centre, relève ou approbation. Auditer DTO, règles et permissions avant extension. |
| Arrêts planifiés | Recherche statique dans `api/src/main/java`, `frontend/src` et `mobile` : aucun module Shutdown Calendar dédié trouvé. Les traductions d’arrêt d’urgence ne prouvent pas l’existence d’un calendrier. | Nouveau domaine probable, distinct des OT et shifts; cadrer le modèle BP versionné, l’audit trail et les contrats avant création. |
| Pièces / approvisionnement | `Part`, `PartQuantity`, `PurchaseOrder`, workflows d’achat et pages/API existent; quantités liées aux pièces, OT et commandes. | Étendre autour des objets présents : vérifier PR, réservations, réceptions partielles et suivi fournisseur avant tout nouvel écran/champ. Ne pas créer un second inventaire ou outil d’achat. |
| Préparation maintenance | Planning OT, shifts individuels, pièces et achats existent partiellement. | Aucune disponibilité/readiness complète confirmée. Indicateurs explicables seulement, avec état inconnu quand une source manque; ne jamais autoriser automatiquement l’exécution. |

Audit statique seulement : les routes présentes ne prouvent pas le fonctionnement en production. Les permissions par site, parcours multi-utilisateur et comportements sur appareil restent à valider.

## Backlog priorisé

| ID | Priorité | Portée | Dépendances |
| --- | --- | --- | --- |
| MOB-NAV-01 | P1 | Prototype puis refonte incrémentale de la navigation : pilule flottante, destinations adaptées aux rôles, CTA Scan central surélevé et More pour les modules secondaires. | Frontend existant; audit du bouton Create et de chaque permission. |
| MOB-HOME-02 | P1 | Séparer Home opérationnel et Stats analytiques; réduire les KPI répétés et mettre en avant les travaux du jour réellement assignés. | APIs actuelles d’abord; nouvel endpoint seulement si l’inventaire de données le justifie. |
| MOB-CARD-03 | P1 | Audit ciblé des rayons, surfaces internes, contraste, alignement d’icônes, clipping et densité. | UI/tokens existants; tests Light/Dark, tailles compactes et grandes polices. |
| WEB-SIDEBAR-01 | P1 | Recette et finition du toggle/sidebar : labels, footer, scroll indépendant, tablette et drawer mobile. | Complète UX-02/UX-14 existants; aucun changement de route/droit. |
| WEB-SIDEBAR-02 | P2 | Comparer fond bleu QPM / sélection navy avec la sidebar sombre actuelle et décider dimensions/contraste sur captures. | Décision visuelle avec contrôles responsive et WCAG AA; tenir compte de l’accent entreprise. |
| SHIFT-ROSTER-01 | P2 | Spécifier puis étendre le roster par site/centre : shifts et rotations configurables, équipes/personnes, repos, absences, remplacements, validation, relève et présence prévue/réelle. | Réutiliser shift config et People/Teams; migration/API probable. Import/export et détection de conflits après contrats validés. |
| SHUTDOWN-01 | P2 | Découverte, puis BP baseline/révisions immuables, planifié/réel, reports historisés, site/zone, multi-jours et import Excel avec prévisualisation. | Nouveau domaine backend, migrations, droits par site et audit. Liens OT/ressources en lecture d’abord. |
| PROCUREMENT-01 | P2 | Cartographier PurchaseOrder, PartQuantity, workflows et statuts; spécifier suivi des besoins, PR/PO, livraisons partielles, responsable et relances. | Réutiliser achats/inventaire; modèle/API seulement après audit des champs et liens existants. Transactionnalité et imports idempotents requis. |
| READINESS-01 | P3 | Afficher disponibilité, état de préparation WO, pièces, arrêt et accès équipement avec provenance et date de chaque signal. | Dépend de SHIFT-ROSTER-01, SHUTDOWN-01 et PROCUREMENT-01; aucun score non expliqué ni autorisation implicite. |

## Critères d’acceptation par phase

### Phase 1 — Mobile UI/UX

- **MOB-NAV-01** : matrice destinations × rôles; cinq emplacements maximum; noms accessibles, état actif clair et cibles tactiles adaptées. Scan n’ouvre caméra/NFC qu’après geste explicite. Le FAB Create respecte les permissions, disparaît lorsque la création est sans objet et se masque au clavier. Vérifier safe-area Android/iOS.
- **MOB-HOME-02** : Home répond à « que faire maintenant ? » avec assignations, retards, notifications et pénuries uniquement si leurs données sont accessibles. Stats regroupe les indicateurs existants; tout KPI sans source validée est absent ou indisponible.
- **MOB-CARD-03** : tokens QPM conservés, couleurs sémantiques métier inchangées; vérification WCAG AA, petit écran, texte agrandi, thèmes, lecteur d’écran et recouvrement du FAB.

### Phase 2 — Web UI/UX

- **WEB-SIDEBAR-01/02** : tester 1440, 1024, 768, 390 et 360 px, clavier, zoom, groupes, footer et drawer. Toute inversion de couleur exige une comparaison approuvée et un contrôle de contraste; routes, menus, compteurs et permissions restent identiques.

### Phase 3 — Shift Roster

- Définir avec le site pilote le fuseau, nuits traversant minuit, jours de repos, rotations configurables (ex. 7/7 et 4/4), absence, remplacement et validation. Ne pas coder ces exemples comme cycles fixes.
- Accès limité au site autorisé; historique des changements; conflits montrés avant sauvegarde; aucune écriture silencieuse. Web équipe et Mobile personnel lisent une source commune. Import Excel idempotent avec prévisualisation, erreurs par ligne et contrôle de droits.

### Phase 4 — Shutdown Calendar

- Définir BP, propriétaire, états brouillon/revue/publié, périodes multi-jours, zones, reports et heures réelles. Une révision publiée est immuable; tout report est historisé (date, acteur, motif).
- Comparaison baseline/révision/prévu/réel traçable; import validé avant écriture. Allocation d’OT/ressources reste une proposition tant qu’un superviseur autorisé ne confirme pas.

### Phase 5 — Suivi des pièces

- Auditer réservations, commandes, reçus et quantités existants. Distinguer besoin WO, réservé, commandé, reçu et restant sans double-compter les mouvements.
- Réception partielle transactionnelle; relances datées; responsable et prochaine action visibles; alertes basées sur seuils configurés. Aucune commande ni mutation de stock automatique sans action autorisée. SAP ECC reste une intégration future par backend; aucun secret dans le frontend.

### Phase 6 — Readiness et recette

- Indiquer preuves disponibles (équipe, pièces, arrêt, accès) et manques avec source/date. Une donnée absente donne « à vérifier », jamais « prêt » par défaut.
- Tester API/services, migrations réversibles, RBAC/isolement site-tenant, concurrence, imports répétés, responsive, thème, caméra/scanner sur appareil et parcours réels par rôle. Les tests statiques ne remplacent pas la recette native ni le site pilote.

## Hors périmètre avant validation des règles et contrats

- Migrations, nouveaux endpoints, droits ou stockage de roster/shutdown/procurement avant spécification métier.
- Connecteur SAP ECC direct, secrets SAP côté Web/Mobile, écritures automatiques vers SAP.
- Scan à l’ouverture d’écran, transitions WO par drag-and-drop ou autorisation d’intervention via un score.
- Capacités, KPI ou données d’exemple présentés comme des données réelles.

## Prochaine étape recommandée

Prototyper et tester **MOB-NAV-01 + MOB-HOME-02** sur les écrans/APIs présents, en parallèle de la recette responsive **WEB-SIDEBAR-01**. Avant tout changement backend, produire des spécifications séparées pour Shift Roster, Shutdown BP et Procurement Tracking avec propriétaires métier, définitions, droits site et transitions.
