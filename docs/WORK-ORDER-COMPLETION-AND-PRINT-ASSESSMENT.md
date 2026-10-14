# QPM — clôture des ordres de travail et rapport imprimable

**Audit statique du dépôt — 14 octobre 2026.** Ce document décrit le comportement vérifié dans le code. Il ne remplace pas un essai sur une instance QPM avec les rôles concernés.

## Conclusion rapide

Dans QPM, un WO est considéré comme terminé dès que son statut passe à `COMPLETE`. Le service renseigne alors `completedBy` et `completedOn`, arrête les temps de travail actifs, met à jour la prochaine échéance d'une maintenance préventive et déclenche les notifications/workflows de clôture. Il n'existe pas d'état distinct « travaux exécutés, en attente de validation » ni d'état de fermeture financière/administrative. Le terme « terminé » recouvre donc actuellement l'exécution et la clôture opérationnelle.

`COMPLETE` n'est pas irréversible dans l'API actuelle : une personne autorisée à modifier le WO peut lui donner un autre statut. Le service remet alors à zéro `completedBy` et `completedOn`. Aucun droit spécial ni motif de réouverture n'est exigé. L'interface Web et Mobile expose le sélecteur de statut, qui contient les quatre états `OPEN`, `IN_PROGRESS`, `ON_HOLD`, `COMPLETE`. Le verrouillage métier « terminé et impossible à rouvrir » n'est donc pas implémenté.

Le PDF QPM est déjà en **A4 paysage**, affiche une en-tête avec identité de l'entreprise et peut inclure nom légal, adresse enregistrée, numéro d'immatriculation, identifiant fiscal, téléphone et courriel. Le besoin d'en-tête légale et de paysage est largement présent dans la génération existante. En revanche, l'action nommée « Aperçu / imprimer » déclenche un téléchargement PDF et ferme la fenêtre de configuration : elle n'affiche pas un aperçu intégré avant impression.

## Comportement QPM vérifié

| Étape | Comportement actuel | Preuve |
|---|---|---|
| Exécution | Les statuts disponibles sont `OPEN`, `IN_PROGRESS`, `ON_HOLD`, `COMPLETE`; les tâches ont leur propre état. | `api/src/main/java/com/grash/model/enums/Status.java`, `mobile/models/workOrder.ts`, `mobile/screens/workOrders/WODetailsScreen.tsx` |
| Préconditions de clôture Mobile | Les exigences configurées peuvent imposer fichiers, tâches terminées, temps saisi, pièces et coûts. Si les données requises sont en cours de chargement ou en erreur, la clôture est bloquée. | `mobile/screens/workOrders/WODetailsScreen.tsx`, `mobile/utils/workOrderCompletion.ts` |
| Confirmation | Selon les préférences, QPM demande un feedback et/ou une signature; l'API vérifie la signature si le WO l'exige et vérifie l'entitlement de signature. | `mobile/screens/workOrders/WODetailsScreen.tsx`, `api/src/main/java/com/grash/service/WorkOrderService.java`, `api/src/main/java/com/grash/dto/WorkOrderChangeStatusDTO.java` |
| Effets de `COMPLETE` | Horodatage et auteur de clôture, arrêt des pointages ouverts, calcul d'événements asset/PM, notifications et workflows `WORK_ORDER_CLOSED`. | `api/src/main/java/com/grash/service/WorkOrderService.java` (`changeStatus`) |
| Réouverture | Toute transition vers un statut différent de `COMPLETE` efface auteur/date. L'API vérifie l'accès édition par rôle global, créateur ou personne assignée, mais ne limite pas les transitions depuis `COMPLETE`. | `api/src/main/java/com/grash/model/WorkOrder.java` (`canBeEditedBy`), `api/src/main/java/com/grash/service/WorkOrderService.java` (`changeStatus`) |
| Historique | Envers audite le WO avec indicateurs de champs modifiés; l'historique WO dérivé des révisions dépend de l'entitlement `WORK_ORDER_HISTORY`. | `api/src/main/java/com/grash/model/WorkOrder.java`, `api/src/main/java/com/grash/service/WorkOrderHistoryService.java` |

**Point de vigilance confirmé :** dans `changeStatus`, le service affecte `signature` et `feedback` à partir du DTO à chaque changement de statut. Les changements de statut Mobile ordinaires n'envoient que `status`; ils peuvent donc remplacer la signature et le feedback existants par `null`. Cela mérite un correctif backend dédié et un test de non-régression avant de compter sur la preuve de clôture comme dossier durable. Ne pas interpréter l'historique Envers comme une garantie que l'interface de consultation permet de restaurer ces pièces.

**Contrôle tenant à vérifier en priorité :** `changeStatus` charge le WO par son identifiant global (`findById`) puis s'appuie sur `canBeEditedBy`, qui vérifie droits généraux, créateur ou affectation, sans comparer explicitement la société du WO à celle de l'utilisateur. L'extrait audité ne suffit pas à prouver une exploitation (il faut vérifier les filtres globaux, l'authentification et reproduire sur deux sociétés de test), mais une garde explicite `workOrder.company == user.company` dans le service est nécessaire pour fermer cette classe de risque. La même vérification doit couvrir `patch`.

Les contrôles de complétude consultés sont côté Mobile; l'endpoint `PATCH /work-orders/{id}/change-status` effectue ses validations visibles de statut/signature et d'autorisation, sans réappliquer les exigences configurées fichiers/tâches/temps/pièces/coûts. Il faut vérifier si le Web applique des gardes similaires et décider si elles doivent être garanties côté serveur avant toute règle de verrouillage.

## Comparaison avec SAP EAM/PM

SAP sépare davantage les événements et statuts :

1. **Confirmation d'exécution au niveau opération/sous-opération** : documente qui a travaillé, quand, combien de temps, le travail effectué, matériaux et relevés. Une confirmation peut être partielle ou finale; l'ordre devient « final confirmé » quand toutes les opérations requises le sont. [SAP — Completion Confirmation](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/e72f747389b340229f7fa343975bfa57/18f4b853dcfcb44ce10000000a174cb4.html)
2. **TECO — fin technique** : utilisée après réalisation des travaux pour marquer l'ordre techniquement terminé et réduire les engagements ouverts. Elle peut rester réversible par une action explicite « Revoke/Cancel Technical Completion »; SAP précise aussi que certains mouvements ou confirmations peuvent encore être comptabilisés selon configuration. [SAP — Technical Completion of an Order](https://help.sap.com/doc/b183ce53118d4308e10000000a174cb4/700_SFIN3E%20006/en-US/bac9b65334e6b54ce10000000a174cb4.html), [SAP — Canceling a Technical Completion](https://help.sap.com/doc/b183ce53118d4308e10000000a174cb4/700_SFIN3E%20006/en-US/84cab65334e6b54ce10000000a174cb4.html)
3. **Clôture métier/financière (CLSD)** : intervient lorsque les coûts ne sont plus attendus, après vérification notamment du règlement et des engagements. Ce jalon est distinct de TECO; SAP documente aussi des opérations de réinitialisation de statuts dans son API selon le produit et la configuration. [SAP — Business Completion of an Order](https://help.sap.com/doc/b183ce53118d4308e10000000a174cb4/700_SFIN3E%20006/en-US/c3c9b65334e6b54ce10000000a174cb4.html), [SAP — Set Statuses for Maintenance Order](https://help.sap.com/docs/SAP_S4HANA_CLOUD/f9ba73d1b8c543c2bd2ba1666271af86/1074e4410eee4ba7b462a3781332f305.html)

La leçon produit à retenir n'est pas « rendre COMPLETE irréversible ». SAP distingue le travail fait, sa confirmation, la fin technique et la clôture financière. Une réouverture contrôlée de TECO est possible, tandis que les confirmations finales ont leurs propres règles. Les règles SAP exactes dépendent de la version/configuration; QPM ne doit pas revendiquer une conformité SAP.

## Apport et portée d'ISO 14224

ISO 14224:2016 est une norme de collecte et d'échange de données de fiabilité et de maintenance pour les équipements des secteurs pétrole, gaz et pétrochimie; sa fiche ISO indique que l'édition reste actuelle après confirmation en 2022. Elle définit un vocabulaire et une structure pour les données équipement, événements de défaillance (dont cause et conséquence) et données de maintenance (action, ressources, conséquence de maintenance, indisponibilité), ainsi que des pratiques de qualité des données. Elle **ne définit pas une séquence universelle de statuts ou une autorisation de réouverture des bons de travail**. Il faut donc l'utiliser pour structurer ce que QPM doit enregistrer à la clôture, et SAP pour comparer les étapes et contrôles du cycle d'ordre. [ISO — fiche ISO 14224:2016](https://www.iso.org/standard/64076.html)

Dans QPM, `WorkOrderBase` fournit déjà équipement, site, catégorie, description libre, fichiers, équipe/technicien et données de planification. Les temps et pièces sont des enregistrements liés, et le PDF peut exporter les tâches, heures, pièces, commentaires, historiques, feedback et signature. Il n'y a toutefois pas, dans les champs structurés WO examinés, de taxonomie de mode/cause/conséquence de défaillance ni d'action de maintenance normalisée; une partie de cette information peut être saisie en texte libre. `AssetDowntime` conserve une durée et un début, mais pas de cause typée ni de fin stockée (la fin est dérivée). Les faits présents sont donc utiles, mais ne suffisent pas à démontrer un enregistrement RM structuré conforme à ISO 14224.

Pour un QPM destiné aux sites industriels concernés, la fiche de confirmation devrait progressivement structurer — selon applicabilité, sans forcer les champs sur un travail préventif banal — le type d'événement, mode de défaillance, cause, conséquence sur équipement/système/sécurité/environnement, action corrective/préventive, pièces et ressources consommées, dates/heures d'arrêt et de remise en service, mesures après intervention, ainsi que la provenance/auteur et la qualité/complétude des données. Les dictionnaires de codes doivent rester versionnés et adaptables au contexte client; ne pas coder de prétendue conformité à partir de quelques champs ou d'un formulaire statique. Les champs structurés devront être réconciliés avec les catégories existantes et les droits d'entreprise avant de décider d'une extension API ou d'un schéma.

## Recommandation pour QPM

Pour un MVP industriel cohérent, garder `COMPLETE` comme fin de travail/fin opérationnelle et lui appliquer une réouverture explicite, autorisée et auditée, plutôt que de rendre le statut bloqué sans issue. À terme, clarifier le vocabulaire et les étapes : `Travaux exécutés`/confirmation de l'opération, `Terminé techniquement` (équivalent conceptuel TECO), puis éventuellement `Clôturé` lorsque le processus financier QPM le justifie. Ne pas ajouter de statut ou de transition en production sans décision produit et revue API.

Règles proposées à valider pour la suite :

- La clôture enregistre l'auteur/date, les tâches, le temps réel, pièces/coûts, relevés utiles, feedback et signature exigés; elle montre un récapitulatif de confirmation avant envoi.
- Après clôture, les modifications de statut/données ayant un effet sur preuve ou coûts sont bloquées par défaut.
- Une réouverture passe par une action dédiée réservée à un rôle de supervision, avec motif obligatoire, confirmation, entrée d'audit immuable, notification et conservation de l'ancienne preuve de clôture. Elle ne doit pas écraser silencieusement signature, feedback, temps ni date/auteur antérieurs.
- Le prochain appel de maintenance préventive ne doit pas être recalculé silencieusement lors d'une réouverture; l'effet doit être défini et testé.
- Les utilisateurs terrain peuvent corriger une confirmation avant clôture; après clôture, correction, annulation et réouverture sont des opérations explicites avec trace.

## Rapport d'impression existant et écarts

Le template `api/src/main/resources/templates/work-order-report.html` définit `@page { size: A4 landscape; }`. Son en-tête affiche le logo/nom d'entreprise et, si disponibles, nom légal, adresse enregistrée, numéro d'immatriculation, identifiant fiscal, téléphone, courriel et site. `WorkOrderService.generatePdfStream` injecte ces valeurs via `DocumentContextResolver`; la source légale est `CompanyLegalProfile`, gérée dans Profil entreprise → Informations légales.

Le rapport est configurable pour inclure informations WO, priorité, tâches, commentaires, historique, coûts, pièces, relations, fichiers et signature. Les documents émis sont enregistrés/consultables par `ReportConfigModal` via `POST work-orders/{id}/report/issue` et la liste `work-orders/{id}/documents`. Le modèle d'émission est donc plus proche d'un document figé que le simple téléchargement aperçu; tester qu'il conserve exactement les données, le hash et l'en-tête tels qu'émis.

Écarts et améliorations recommandées :

- Renommer l'action actuelle en « Télécharger le PDF » si elle continue à télécharger directement; proposer un vrai aperçu intégré (PDF dans nouvel onglet/visionneuse) avant la commande distincte « Émettre et archiver ».
- Rendre l'en-tête légal hiérarchisé et lisible : dénomination commerciale + raison sociale, adresse, pays, immatriculation et identifiant fiscal séparés avec leurs libellés localisés; masquer les champs absents et éviter les chaînes `null`/vides. Vérifier dans `DocumentContextResolver` la façon dont le pays est actuellement transmis, car le template identifié affiche déjà les autres champs mais pas explicitement `registrationCountry`.
- Conserver A4 paysage par défaut, comme aujourd'hui; décider si une variante portrait est réellement nécessaire après revue du contenu et des besoins d'archivage.
- Pour un document « légal », faire valider les champs et mentions obligatoires par pays par le responsable de l'entreprise; le dépôt ne suffit pas à conclure à une conformité juridique.
- Afficher clairement le statut, numéro WO, date d'émission, auteur, site, équipement/emplacement, tâches, temps, matériaux, constats, réserves, et blocs de signature adaptés au flux QPM; ne pas assimiler le champ feedback à un témoignage signé.

Le Mobile utilise actuellement l'ancienne route `GET /work-orders/report/{id}` qui génère un PDF avec la configuration par défaut et retourne un lien signé; l'aperçu configurable/émission d'archive est dans l'interface Web. Cette différence doit être traitée dans une tâche de cohérence mobile séparée, tout en réutilisant le contrat/API existant.

## Ordre de travail recommandé

1. **P0, intégrité/sécurité :** vérifier puis tester l'isolation tenant pour `changeStatus` et `patch`; corriger la mise à jour conditionnelle feedback/signature; établir et tester les transitions autorisées côté API, l'état COMPLETE et les transitions concurrentes.
2. **P1, politique métier :** adopter les distinctions « exécution confirmée », « terminé techniquement » et « clôturé » (ou explicitement décider que QPM garde son unique COMPLETE); fixer les rôles, motif et effets d'une réouverture, à la lumière des statuts SAP mais sans assimiler `COMPLETE` à TECO/CLSD automatiquement.
3. **P1/P2, qualité des données RM :** comparer le périmètre des sites/utilisateurs QPM à celui d'ISO 14224; inventorier les champs déjà disponibles, convenir de taxonomies et de règles de qualité avec des responsables maintenance/fiabilité, puis définir un contrat compatible avant toute évolution de l'API.
4. **P1, impression :** préserver A4 paysage et les données légales déjà injectées; améliorer la présentation/libellés des champs et l'aperçu avant émission/archivage.
5. **P2, alignement client :** faire utiliser au Mobile le même aperçu et la même émission que le Web si l'usage terrain le requiert.

Critères de recette prioritaires : clôture valide et invalide; rôle terrain vs superviseur; réouverture avec motif et trace; conservation de signature/feedback après transitions; effet sur pointages et PM; champs RM structurés présents/absents selon type de maintenance et cohérence des horodatages/ressources; tentative de changement après émission; document avec profil légal complet puis champs optionnels vides; aperçu puis émission; PDF A4 paysage rendu en français et anglais.

## Limites de cet audit

Revue statique du dépôt local, sans accès à l'instance de production, aux journaux de base de données, ni à une entreprise de test. Les rôles effectifs, préférences, entitlements, contenus de profil légal et rendu final du PDF doivent être testés sur une instance non-production. Ce rapport ne met pas en œuvre de changement de workflow ou de génération PDF.

## Décision métier retenue — clôture et droits

**Décision pour le MVP : `COMPLETE` signifie « exécution déclarée terminée et clôture opérationnelle »; l'ordre devient verrouillé pour l'exécution normale.** L'application ne doit pas présenter ce statut comme une clôture financière SAP (CLSD) ni comme une clôture technique SAP (TECO) strictement équivalente : QPM n'a pas les confirmations par opération ni le règlement des coûts et engagements qui donnent ce sens précis aux statuts SAP. Nous conservons les statuts/API actuels pour éviter une migration de données et une rupture de contrat.

Une réouverture restera possible uniquement comme action exceptionnelle **« Réouvrir pour correction »**, réservée aux utilisateurs ayant le droit de gestion des autres WO (`editOtherPermissions` pour `WORK_ORDERS`) et un accès à la même entreprise. Elle exigera un motif non vide, conservera l'événement de clôture initial et enregistrera l'auteur, la date, le statut précédent et le motif de réouverture. Le technicien assigné ou le créateur pourra corriger un WO actif selon les droits existants, mais ne pourra pas annuler lui-même sa clôture. La suppression reste un droit séparé et ne doit jamais servir de mécanisme de réouverture. Aucun droit de modification ou de réouverture ne doit franchir la frontière d'entreprise.

| Acteur / droit | Décision MVP |
|---|---|
| Demandeur d'une demande de maintenance | Peut suivre sa demande selon les droits existants; le fait d'avoir créé la demande ne confère pas le droit de confirmer ou rouvrir le WO qui en découle. |
| Technicien assigné ou équipe assignée | Peut enregistrer l'avancement et confirmer l'exécution en passant un WO actif à `COMPLETE`, sous réserve des contrôles de clôture applicables. Ne peut pas rouvrir un WO `COMPLETE`. |
| Créateur du WO | Garde les droits d'édition que lui donne actuellement QPM tant que le WO est actif; ne peut pas rouvrir un WO clos en sa seule qualité de créateur. |
| Planificateur / superviseur | Avec le droit `editOtherPermissions(WORK_ORDERS)`, peut administrer les WO de son entreprise et effectuer une réouverture justifiée et auditée. L'affectation des rôles concrets doit être vérifiée dans chaque entreprise; le nom du rôle seul ne vaut pas autorisation. |
| Administrateur financier | Pas de clôture financière dans le MVP. Un futur statut de clôture business exigera une capacité réelle de coûts, règlements et engagements ouverts, ainsi qu'un droit dédié. |

Avant `COMPLETE`, QPM doit appliquer côté serveur les champs rendus obligatoires par la configuration effective du WO, notamment la signature si elle est exigée et licenciée. Les exigences conditionnelles déjà exposées par le Mobile (tâches, temps, pièces, coûts et documents) doivent être consolidées et validées côté API, et non dépendre uniquement de l'interface. Ne pas imposer universellement une saisie de coûts ou de données de panne à chaque WO. Pour un WO correctif pertinent, structurer progressivement les informations de défaillance, cause/conséquence, action, ressources et indisponibilité; pour le préventif, enregistrer l'action réalisée et les mesures applicables. Cette approche suit le périmètre de données RM d'ISO 14224 sans prétendre que la norme prescrit un rôle ou un verrou de statut.

La confirmation de fin de travail doit être explicite et récapituler ce qui sera clôturé. Une fois confirmée, `COMPLETE` masque les commandes ordinaires de modification/exécution. La réouverture superviseur restaure le travail en cours sans effacer la preuve de la clôture précédente; la nouvelle clôture produit un nouvel événement. Le comportement actuel qui remplace la signature et le feedback à chaque changement de statut, et qui efface `completedBy`/`completedOn` lors d'une sortie de `COMPLETE`, doit être corrigé avant d'activer le verrouillage, faute de quoi l'audit perdrait sa continuité.

### Motifs documentaires et comparaison

SAP distingue les confirmations partielles/finales des opérations et la clôture technique du WO. Ses critères de clôture technique demandent que les données de référence/opérations soient complètes et correctes et que les opérations soient confirmées; la clôture business intervient ensuite quand les règlements et engagements le permettent. SAP permet aussi d'annuler une clôture technique sous contrôle du processus/configuration. Le modèle QPM à quatre statuts n'a ni toutes ces étapes ni le règlement financier : `COMPLETE` doit donc être traité comme la clôture opérationnelle QPM, avec réouverture contrôlée, plutôt qu'une imitation partielle de TECO/CLSD.

ISO 14224:2016, confirmée comme édition courante en 2022, porte sur la collecte et l'échange des données de fiabilité et maintenance pour les industries pétrole, gaz et pétrochimie. Elle couvre notamment les attributs d'équipement, les données de défaillance, les actions/ressources/conséquences de maintenance et les temps d'indisponibilité; elle exclut les coûts directs. Elle ne définit pas le workflow universel de clôture d'un WO ni la matrice d'autorisation. QPM peut s'en inspirer pour la qualité des données pertinentes, mais ne doit pas invoquer ISO 14224 comme source d'une règle de verrouillage ou de permission.

Sources officielles consultées le 14 octobre 2026 : [ISO 14224:2016 — fiche et périmètre](https://www.iso.org/standard/64076.html); [SAP — confirmations d'ordres](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/e72f747389b340229f7fa343975bfa57/18f4b853dcfcb44ce10000000a174cb4.html); [SAP — clôture technique d'un ordre](https://help.sap.com/doc/b183ce53118d4308e10000000a174cb4/700_SFIN3E%20006/en-US/5bcab65334e6b54ce10000000a174cb4.html); [SAP — clôture business](https://help.sap.com/doc/b183ce53118d4308e10000000a174cb4/700_SFIN3E%20006/en-US/c3c9b65334e6b54ce10000000a174cb4.html); [SAP — ordre de maintenance techniquement terminé](https://help.sap.com/docs/s4hana-cloud-best-practices/field-logistics-planning-and-execution-40g-ae/technically-complete-maintenance-order); [SAP — modification des statuts système d'un ordre](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/e72f747389b340229f7fa343975bfa57/8816295411158c24e10000000a4450e5.html).

### Application aux permissions QPM et travaux nécessaires

Le code vérifié fonde actuellement `WorkOrder.canBeEditedBy` sur `editOtherPermissions(WORK_ORDERS)`, le créateur ou l'assignation. `changeStatus` réutilise cette capacité générale; il n'a pas de garde de transition propre à `COMPLETE`, de droit dédié à la réouverture ni de champ motif. `CompanyAudit.@PostLoad` bloque actuellement le chargement inter-entreprise dans le chemin JPA ordinaire, mais les mutations de WO doivent employer explicitement une recherche `findByIdAndCompany` et des tests de non-régression afin que l'isolation ne dépende pas uniquement d'un effet de bord de chargement.

La décision est une **règle métier retenue et une cible d'implémentation**, pas une affirmation que ces contrôles sont déjà en production. Avant activation, prévoir séparément :

1. Une commande API de réouverture avec contrôle explicite entreprise + permission superviseur, motif obligatoire et audit append-only; refuser les transitions depuis `COMPLETE` via la commande ordinaire de changement de statut.
2. Des validations de clôture côté service qui correspondent aux exigences configurées, avec tests de champs requis et optionnels, licence/signature, et conservation des données non envoyées dans les transitions partielles.
3. Une vérification d'entreprise explicite pour toutes les routes de mutation (statut, édition, suppression, commentaires, tâches et consommations liées), en conservant les exceptions de comptes superviseurs prévues par le produit.
4. Des tests API par rôle (assigné, créateur, superviseur avec/sans `editOtherPermissions`, demandeur, autre entreprise), y compris accès direct à l'endpoint, doublon de requête et tentative de réouverture sans motif.

**Conclusion finale :** verrouiller la clôture opérationnelle pour le technicien; autoriser uniquement un superviseur explicitement habilité à rouvrir, avec motif et événement d'audit conservé. Réserver une éventuelle clôture business à une phase future où QPM gérera réellement les coûts et engagements. Cette règle est compatible avec les principes de séparation observés dans SAP, respecte le périmètre réel d'ISO 14224 et ne prétend pas que l'une de ces références impose le détail de la politique QPM.
