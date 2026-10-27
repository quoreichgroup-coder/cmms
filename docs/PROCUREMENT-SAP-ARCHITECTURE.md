# Procurement — architecture cible inspirée de SAP

**État :** cadrage et premier socle d’identité d’intégration, 27 octobre 2026
**Portée :** achats de pièces, réception et intégrations ERP/fournisseurs dans QPM.

## Synthèse

QPM doit garder un noyau métier d’approvisionnement indépendant des connecteurs : les besoins, commandes, réceptions et mouvements de stock ont des identifiants QPM et leurs propres règles. Les ERP, fournisseurs et exports s’intègrent par des adaptateurs côté serveur, avec références externes et synchronisation rejouable. Le frontend et le mobile consomment les mêmes contrats QPM; ils ne portent ni secrets ERP ni logique de rapprochement.

SAP est une référence de processus et d’extensibilité, pas un modèle à recopier à l’identique. Les pages SAP consultées décrivent des parcours distincts de demande d’achat, approbation, commande et réception; l’approvisionnement d’une demande peut être traité par article et les réceptions partielles restent suivies jusqu’à complétion. Les capacités et statuts exacts varient selon le produit SAP et sa configuration. [Workflow des demandes d’achat](https://help.sap.com/docs/buying-invoicing/purchasing-guide-for-procurement-professionals/about-workflow-of-purchase-requisitions-8b3f5dbe7a7b4427a1039a46dfe475d3), [processus de commande](https://help.sap.com/docs/buying-invoicing/purchasing-guide-for-procurement-professionals/purchase-order-process-6b32ab8fc1da1014bbcef40b7787d981)

Dans SAP, la réception référence le document d’achat et alimente son historique; elle est la trace permettant de contrôler les quantités reçues et de rapprocher la suite du processus. Les API d’achat publiées sont des contrats ERP documentés, tandis que l’extensibilité est conçue autour de champs/scénarios supportés et d’interfaces publiées. [Réceptions de commande](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/91b21005dded4984bcccf4a69ae1300c/a363bd534f22b44ce10000000a174cb4.html?ai=true), [API Purchase Order](https://help.sap.com/docs/SAP_S4HANA_CLOUD/0e602d466b99490187fcbb30d1dc897c/c89eec80ec2043d980cb7b8c89e0a00a.html), [extensibilité S/4HANA Cloud](https://help.sap.com/docs/SAP_S4HANA_CLOUD/0f69f8fb28ac4bf48d2b57b9637e81fa/533228e1e854433ab16d013f161ca509.html)

## État QPM constaté

- `PurchaseOrder` porte fournisseur, catégorie, approbation (`PENDING`, `APPROVED`, `REJECTED`) et date de livraison attendue.
- `PartQuantity` représente les lignes de commande et les quantités de pièces; elle est aussi utilisée pour les pièces affectées aux OT. Elle ne porte pas de quantité reçue.
- `Part.nonStock` distingue les pièces de stock des consommables/non-stock; les parcours OT et le réapprovisionnement manuel ignorent déjà le stock de ces pièces. L’approbation PO suit maintenant la même règle au lieu d’augmenter leur quantité en stock.
- `Part.vendors` est une association fournisseur facultative, alimentée depuis le formulaire Pièce; elle ne porte ni fournisseur préféré, ni date d’effet, ni référence article fournisseur, ni prix/délai/quantité minimale. **Décision de cadrage : elle reste informative** et ne filtre/ne bloque pas les PO. Les PO continuent de vérifier que le fournisseur et les pièces appartiennent à la société. Une vraie source-list exclusive exigera un objet dédié et daté, une migration des liens incomplets, un filtre dans les formulaires Web/mobile et la même validation côté API; ne pas détourner la simple association actuelle en règle d’achat.
- `PurchaseOrderCategory` ne porte qu’un nom et un rattachement aux paramètres société; elle n’identifie pas un type de ligne ni une commande de service. Le formulaire Web actuel exige au moins une ligne `Part`; le modèle/API peuvent contenir des PO sans `PartQuantity` (imports et données historiques compris). Un libellé de catégorie tel que « Service » ne suffit donc pas à choisir les règles de stock.
- `POST /purchase-orders`, `PATCH /purchase-orders/{id}`, `PATCH /purchase-orders/{id}/respond`, `DELETE /purchase-orders/{id}`, et `/part-quantities` sont les contrats existants.
- `PurchaseOrderController.respond(approved=true)` augmente le stock des lignes de pièces stockées au moment de l’approbation et publie le webhook après commit; `Part.nonStock=true` n’augmente pas l’inventaire. L’approbation historique a donc un effet inventaire uniquement pour les pièces stockées. Le PO et les pièces concernées sont verrouillés par ID croissant, comme pour les consommations d’OT, afin d’éviter les mises à jour concurrentes perdues.
- La création force le statut `PENDING` côté service, même si le corps de requête essaie de fournir `APPROVED`. L’approbation manuelle et l’action workflow `APPROVE` passent par la même transition transactionnelle : verrou du PO, crédit des lignes stockées/pièces verrouillées par ID, statut approuvé et webhook après commit. Le rejet partagé ne crédite pas le stock. Aucune intégration ERP n’est encore raccordée.
- Le même service d’approbation refuse maintenant une quantité PO non finie, nulle ou négative avant tout mouvement. Le contrôle protège également les données PO historiques, tandis que les routes de mutation valident déjà les nouveaux nombres.
- La correction `nonStock` est prospective : aucun retrait automatique n’est appliqué au stock existant. QPM n’enregistre ni la valeur `nonStock` au moment de l’approbation, ni un mouvement d’inventaire lié au PO; l’état actuel de la pièce ne permet donc pas de reconstruire sûrement le stock ancien. Toute réconciliation doit être explicite et auditable.
- Vérification complémentaire du registre `PartTransaction` : il référence une pièce et éventuellement un OT, mais pas un PO ni une ligne PO. Les entrées de restock reçoivent une description texte; l’approbation PO modifie directement `Part.quantity` sans créer de transaction. Ce registre ne peut donc pas servir à identifier sans ambiguïté quels soldes actuels proviennent d’anciens PO approuvés, et ne permet pas un backfill fiable des reçus. Préserver l’effet historique par défaut; une réconciliation nécessitera un rapprochement externe/manuel traçable ou une bascule seulement pour les nouveaux PO.
- Un workflow configuré sur `PURCHASE_ORDER_CREATED` peut approuver immédiatement le PO créé. Comme l’approbation partage le même crédit de stock, ces configurations rendent le stock disponible dès la création; elles doivent être inventoriées avant de séparer approbation et réception. Le partage élimine la divergence entre approbation manuelle et workflow, mais ne change pas cette sémantique historique.
- Une commande déjà approuvée ne peut plus être modifiée ou supprimée, ni voir ses lignes ajoutées, retirées ou ajustées. Les mutations de lignes et les deux parcours d’approbation prennent le même verrou sur le PO pour éviter qu’une édition concurrente passe pendant le crédit de stock. Une future correction/annulation devra être un mouvement métier explicite, avec droits et historique, et non une mutation ou suppression physique.
- Aucun modèle de demande d’achat distinct (`PurchaseRequisition`) n’a été repéré lors de l’audit précédent. Il ne faut pas confondre un besoin issu d’un OT avec une demande d’achat déjà approuvée.

## Cible modulaire QPM

```text
Besoin (OT / réapprovisionnement / demande future)
                    │
                    ▼
         Décision et approbation d'achat
                    │
                    ▼
            Purchase Order QPM
             │              │
             ▼              ▼
       Réceptions        Adaptateurs
       partielles        ├─ SAP
             │           ├─ ERP tiers
             ▼           └─ fournisseur / fichier
     Mouvement stock
```

Les documents QPM sont la source de vérité opérationnelle locale. Un adaptateur ne modifie pas le stock directement : il traduit et synchronise commandes ou événements de réception via des services métier QPM autorisés. Chaque intégration est activable séparément par entreprise, désactivée tant que le besoin et son fournisseur ne sont pas configurés, et remplaçable sans changer l’écran ou le modèle de commande. L’activation du connecteur ne contourne ni la fonction de plan, ni les droits, ni les règles métier QPM. Côté mobile, le même contrat QPM est consommé; le client ne choisit pas le connecteur ni ne stocke ses credentials.

### Écart à traiter pour une activation réellement modulaire

Le contrôle du module a été centralisé dans `PurchaseOrderPolicyService` pour les mutations PO/lignes : création, édition, approbation/refus, suppression et CRUD des lignes. Le contrôle effectif est côté API; les écrans Web/mobile restent une aide d’interface. La consultation et l’export des PO historiques restent soumis à la permission de lecture et à l’isolation du tenant, sans entitlement, conformément à la politique recommandée de données historiques consultables après désactivation.

La règle appliquée sépare consultation/export historique des nouvelles mutations métier. Le déclenchement des workflows `PURCHASE_ORDER_CREATED/UPDATED` passe par les routes mutantes qui vérifient le module; aucun workflow ne peut donc muter un PO via les appels actuels sans passer par cette vérification. Une désactivation ne déclenche pas de mutation de stock et ne rend pas les données historiques impossibles à auditer. La future réception et intégration garderont des droits additionnels propres.

L’API refuse aussi la création ou modification d’un workflow qui contient un trigger, une condition ou une action PO quand `PURCHASE_ORDER` est désactivé. L’action `PART_UPDATED → CREATE_PURCHASE_ORDER` est actuellement un `TODO` dans `WorkflowService.runPart`; l’API la refuse explicitement (501) et l’éditeur ne l’offre plus. Les anciens workflows de ce type restent consultables/supprimables avec un avertissement. Les nouveaux triggers PO sont masqués sans le module; les workflows PO persistés restent visibles et supprimables pour le nettoyage, mais leur édition est verrouillée sans entitlement. Cette protection d’interface complète la validation serveur; elle ne remplace pas l’entitlement côté API.

Les routes Client de détail, modification et suppression vérifient maintenant que le workflow appartient à la société courante avant de le lire ou modifier; elles n’opèrent plus sur un ID global fourni par le client. Les écritures sont transactionnelles, y compris l’édition qui remplace le workflow, afin qu’un échec de recréation annule aussi la suppression. Cela préserve les limites de tenant du noyau Procurement et empêche une sauvegarde partielle de règle d’approbation.

### Contrats d’intégration à retenir

1. Une référence externe est qualifiée par `company + provider/sourceSystem + objectType + externalId`; elle est unique dans ce périmètre et n’écrase jamais l’ID QPM.
2. Les imports et événements entrants ont une clé d’idempotence stable, leur date/source et leur état de traitement. Un retry ne peut pas doubler une commande, une réception ou un mouvement.
3. L’API publique QPM reste versionnée et indépendante du format SAP. La conversion SAP/OData/XML appartient à l’adaptateur backend.
4. Les secrets et arrangements de communication sont stockés et consommés côté serveur; les journaux exposent les erreurs utiles sans credentials.
5. Les champs spécifiques restent des extensions déclarées et validées avec leur mapping, pas des propriétés arbitraires qui modifient les règles du noyau.
6. Les mêmes objets et permissions alimentent Web et mobile. Les vues mobiles peuvent être plus légères, mais elles ne créent pas une seconde vérité d’inventaire.

Audit des appelants dans ce dépôt au 27 octobre 2026 : les formulaires Web de création/édition utilisent les routes atomiques; le détail mobile appelle `GET /purchase-orders/{id}` et la liste mobile utilise la recherche paginée en lecture. Les anciennes actions Redux `add/editPurchaseOrder` et celles de création/réponse mobile sont encore déclarées, mais aucun écran mobile actif ne les appelle; le test de régression existant vérifie le parcours lecture seule. Aucun connecteur ou autre appelant interne aux anciennes séquences n’a été trouvé dans `frontend/src` et `mobile/`. Cela ne prouve pas l’absence de scripts/API clients externes : garder les anciennes routes compatibles et demander l’inventaire aux intégrateurs avant toute suppression ou changement sémantique.

## Réception et compatibilité historique

L’approbation et la réception doivent devenir des actions séparées pour les nouvelles commandes qui utilisent le flux de réception. Une réception est liée à une ligne de commande et porte quantité, unité, date, acteur, site/magasin, référence de livraison éventuelle et clé d’idempotence. La réception acceptée et le mouvement de stock doivent être écrits dans une transaction; le webhook est publié après commit. Les annulations sont des contre-mouvements traçables plutôt qu’un effacement.

**Ne pas activer les réceptions partielles sur les anciennes commandes en l’état.** Elles ont pu créditer leur quantité complète lors de l’approbation. La migration doit reprendre leur état d’inventaire constaté sans fabriquer de réception physique. Il faut une stratégie de backfill/historique vérifiable, puis une bascule explicite pour les nouveaux bons. L’approbation seule doit continuer à respecter le comportement actuel jusqu’à ce que cette migration et les impacts mobile/API soient prêts ensemble.

Les règles de quantité excessive, unités, inspection/stock bloqué, clôture d’un reliquat et annulation doivent être configurables ou décidées métier avant l’API finale. Le noyau peut fournir les invariants transactionnels et l’historique; les intégrations ne doivent pas contourner ces règles.

### Contrat API candidat pour PROC-03 — à valider avant développement

La séparation minimale proposée est `POST /purchase-orders/{poId}/receipts` pour une réception, `GET /purchase-orders/{poId}/receipts` pour son historique et une commande explicite d’annulation compensatoire sur le reçu. Ces noms sont une proposition de conception, pas des routes déjà disponibles.

- La requête désigne chaque ligne par l’ID `PartQuantity` du PO et sa quantité reçue; site/magasin, unité et inspection ne sont requis qu’après décisions métier. L’horodatage et l’acteur viennent du serveur.
- L’API vérifie tenant, permission de réception, module actif, PO éligible, appartenance de chaque ligne, quantité positive et reliquat. Une réception répétée avec la même clé d’idempotence et le même contenu retourne le résultat déjà créé; réutiliser la clé avec un contenu différent donne `409`.
- Une transaction verrouille le PO puis les pièces concernées par ID croissant, vérifie le cumul reçu, écrit le reçu et les lignes immuables ainsi que le mouvement de stock. Le cumul et le stock ne sont pas fournis comme valeurs de vérité par le client. Webhooks sortent après commit; aucun `PATCH`/`DELETE` ne réécrit une réception validée.
- La réponse présente reçu, quantité reçue cumulée, reliquat et stock faisant autorité après la mutation. Une annulation crée une compensation liée au reçu initial; elle revérifie droits et stock disponible, et peut être refusée si la quantité a déjà été consommée.
- Le mode historique conserve l’effet actuel d’approbation. Les nouveaux PO versionnés utilisent une approbation sans crédit de stock et n’augmentent le stock qu’à la réception. Les workflows d’auto-approbation doivent respecter la version du PO et ne jamais fabriquer une réception.

**À trancher avant de figer ce contrat :** unités et précision, stratégie site/magasin face au stock actuel du modèle `Part`, sur-réception, inspection/stock bloqué, reliquat, politique d’annulation si le stock a été consommé, et droits par rôle/site. Ces questions conditionnent les DTOs, contraintes et migrations; la proposition n’autorise donc pas encore un endpoint ni une évolution de stock.

## Lots de réalisation

| Lot | Résultat vérifiable | Dépendance / garde-fou |
|---|---|---|
| PROC-01 — Contrats et inventaire | Carte du domaine, des liens, droits, événements et usages Web/mobile; noms d’objets/API stables. | En cours; le périmètre mobile est documenté dans [`MOBILE-CAPABILITIES-AND-MODULARITY.md`](MOBILE-CAPABILITIES-AND-MODULARITY.md), mais les contrats complets restent à finaliser. |
| PROC-02 — Identité d’intégration | Références externes par entreprise/source, journal d’import et idempotence. | Références et registre d’événements idempotents ajoutés; les insertions concurrentes d’une même référence ou clé d’événement se résolvent par la contrainte unique puis une relecture idempotente. Le lease est récupérable à la demande; restent une politique de rétention/purge et son consommateur. Aucun adaptateur n’est encore branché. Migration additive; aucune mutation de stock. |
| PROC-03 — Réception locale | Réceptions et lignes immuables, reliquat calculé, mouvements transactionnels, annulation compensatoire. | Stratégie historique et décisions unités/inspection/sur-réception. |
| PROC-04 — Connecteur de référence | Interface backend + premier adaptateur configurable (SAP ou import standard), reprises et erreurs visibles. | PROC-02/03; aucun accès externe direct depuis UI/mobile. |
| PROC-05 — Expérience opérationnelle | File à commander/recevoir, dates, responsable, prochaine action, états vide/erreur, vues Web/mobile alignées. | Lire des contrats réels; pas de statut ou quantité simulés. |
| PROC-06 — Demandes d’achat | Modèle et approbation de demandes seulement après définition des sources de besoin et leur conversion/consolidation en PO. | Éviter le doublon OT/réapprovisionnement/PR. |

## Décisions requises avant PROC-03

- La réception est-elle confirmée par ligne et par site/magasin?
- QPM accepte-t-il les quantités décimales, et quelles unités sont supportées/conversions autorisées?
- Une sur-réception est-elle interdite ou tolérée jusqu’à un seuil par ligne?
- Existe-t-il une inspection et un stock bloqué avant disponibilité aux OT?
- Qui peut clore le reliquat, annuler une réception et corriger une erreur?
- Quel périmètre historique peut être traité comme déjà crédité au stock, et quelle preuve l’audite?
- Premier raccordement : SAP, CSV/API générique ou fournisseur précis? Quelles références QPM/SAP servent au rapprochement?

Ces points ne bloquent pas le cadrage ni le travail additif PROC-02. Ils bloquent une mutation sûre du flux d’approbation et l’activation de la réception physique.

### Proposition de valeurs par défaut QPM pour fermer les décisions

Ce tableau prépare une décision produit; ce ne sont ni des standards imposés par SAP ni des règles déjà appliquées par QPM.

| Sujet | Proposition de départ | Motif et limite |
|---|---|---|
| Bascule historique | Garder le crédit de stock à l’approbation pour les anciens PO; activer la réception uniquement sur les nouveaux PO marqués par une version de flux. | Évite de fabriquer des reçus passés et rend la migration vérifiable. |
| Site / magasin | Réception société/pièce au premier lot; ne pas simuler des magasins tant que le stock `Part` n’est pas ventilé par emplacement. | Le stock actuel est porté sur `Part`, sans quantité par site ou magasin. |
| Quantités et unités | Exiger la même unité que la ligne; refuser conversions et unités ambiguës; reprendre la précision déjà autorisée pour la pièce et ne jamais convertir silencieusement. | La propriété d’unité est un libellé texte, sans table de conversion ni précision normalisée. |
| Sur-réception | Refuser toute quantité qui ferait dépasser la quantité commandée cumulée. | La tolérance et les règles d’achat par fournisseur ne sont pas modélisées. Une tolérance future doit être explicite par entreprise ou ligne. |
| Inspection / stock bloqué | N’ajouter aucun état d’inspection implicite au premier lot; exiger un processus Qualité distinct avant de promettre du stock bloqué. | Le modèle de stock courant n’a pas de statut de quarantaine. La mise à disposition directe du stock reste une décision métier à confirmer. |
| Reliquat | Garder la ligne ouverte jusqu’à réception complète ou clôture manuelle explicite par une capacité autorisée; ne pas clôturer automatiquement à une réception partielle. | Préserve le suivi d’engagement et l’audit du restant. |
| Annulation / erreur | Contre-mouvement immuable et lié au reçu initial; refuser si la quantité à reprendre a déjà été consommée. | L’inventaire ne doit pas devenir négatif par correction rétroactive. |
| Permissions | Séparer création de brouillon, approbation, réception, inspection, annulation et administration de connecteur; migration additive des rôles avec valeurs par défaut documentées. | `PURCHASE_ORDERS` mélange aujourd’hui édition et approbation et ne définit pas de droits de réception. |
| Mobile et réseau | Même API que Web, geste de réception confirmé, réponse serveur autoritaire; scan/photo optionnels, pas de mode hors ligne au premier lot. | Réutilise les capacités mobiles existantes sans promettre une file offline idempotente qui n’existe pas encore. |

Ordre recommandé après validation de ces règles : contrats et migration de mode; service de réception transactionnel/idempotent; permissions et audit; UI Web d’administration/revue; parcours mobile de réception; puis adaptateur SAP/ERP. Une ligne qui n’est pas une pièce doit être typée explicitement avant de partager ce contrat.

## Socle PROC-02 — références d’objets

La table `integration_object_reference` réserve une correspondance QPM/externe par `company_id + provider_key + object_type + external_id`; l’ID local est stocké en chaîne afin de prendre en charge les clés numériques et UUID. Les clés provider/type sont normalisées en majuscules. `IntegrationObjectReferenceService.register` est idempotent pour une correspondance identique et refuse (`409`) qu’une référence déjà enregistrée soit rattachée à un autre objet QPM. La contrainte unique en base protège aussi l’identité persistée.

La table `integration_event_receipt` conserve une clé d’idempotence par entreprise/provider, le type et le SHA-256 du contenu, les états `PROCESSING/PROCESSED/FAILED`, le nombre de tentatives et un code d’erreur borné. Le code d’erreur n’accepte que des caractères de code (`A-Z`, chiffres, point, tiret, souligné), sans message libre ni détail d’exception. `IntegrationEventReceiptService.claim` n’autorise le traitement qu’une fois, refuse la réutilisation d’une clé pour un autre contenu et permet de réclamer un événement échoué. `findStaleProcessing` fournit à un futur worker un lot borné de candidats par entreprise/provider; un index correspond désormais au filtre et au tri `last_attempt_at`. Chaque candidat doit encore passer par `reclaimStaleProcessing`, qui relit et verrouille le reçu. Cette dernière reprend un reçu en cours uniquement si `lastAttemptAt` précède un seuil de lease fourni par l’appelant; le seuil doit être fourni et ne peut pas se situer dans le futur, et le verrou transactionnel sérialise les récupérations concurrentes. La valeur `attemptCount` sert de génération de claim : `markProcessed`/`markFailed` exigent la génération reçue et refusent (`409`) une ancienne tentative après reprise. Le service ne choisit pas la durée du lease et aucun ordonnanceur/consommateur ne l’appelle encore. Ce fencing protège l’état du reçu, mais un worker doit aussi rendre les mutations métier idempotentes (ou les exécuter dans une transaction qui vérifie la génération) : un lease expiré ne peut pas arrêter un ancien processus encore actif. Aucun payload brut ni secret n’est stocké. L’insertion concurrente d’une même clé passe par une transaction isolée `REQUIRES_NEW`; après conflit sur la contrainte unique, le claim relit l’état gagnant et autorise le travail uniquement si son état/digest le permettent.

Ces services restent des primitives backend internes : aucune route publique, aucun adaptateur SAP, aucune synchronisation de PO et aucun effet de stock ne sont encore branchés. La reprise d’un reçu abandonné est maintenant disponible à la demande avec un seuil fourni, mais reste inactive tant qu’un consommateur n’applique pas une durée de lease et une politique de rétention/purge validées.

### Surface mobile liée aux achats

L’app mobile expose une liste et une fiche de bon de commande en lecture seule, conditionnées par l’option de plan `PURCHASE_ORDER` et la permission `PURCHASE_ORDERS`. La fiche charge le PO par son identifiant via l’API existante et affiche ses lignes complètes, son fournisseur, son statut et les informations logistiques disponibles; elle ne crée, n’approuve, ne modifie, ne supprime et ne reçoit pas les commandes. L’API détail revérifie le tenant et le droit de consultation au niveau du PO. Les intégrations SAP/fournisseurs ne doivent donc pas être ajoutées dans le client mobile. Quand PROC-03 définit un contrat QPM de réception et ses règles de stock, un écran mobile limité aux gestes terrain pourra l’utiliser par les mêmes APIs que le Web, derrière l’activation du module et les permissions serveur. Inventaire complet dans [`MOBILE-CAPABILITIES-AND-MODULARITY.md`](MOBILE-CAPABILITIES-AND-MODULARITY.md).

### Écart d’expérience Web / Mobile observé

| Parcours | Web actuel | Mobile actuel après cette tranche | Ligne de conduite |
|---|---|---|---|
| Liste / recherche | Grille avec pagination serveur et ouverture d’un panneau latéral réactif (90 % mobile, 70 % petit écran, 50 % écran moyen). | Liste paginée, actualisable par glissement, cartes adaptées à l’écran. | Partager les critères métier et états d’accès; garder la grille dense au Web et les cartes lisibles au téléphone. |
| Détail | Onglets informations, pièces, livraison et notes. | Fiche verticale qui charge chaque ligne et les champs disponibles. | Même API/données; sections vides masquées sur mobile, pas de fausses quantités reçues. |
| Actions | Créer, éditer, supprimer un brouillon, modifier lignes, approuver/refuser. | Consultation seulement. | Ne pas ajouter ces boutons par parité visuelle; réserver l’approbation Web et créer un geste mobile distinct uniquement quand son contrat métier existe. |
| Réception | Pas de quantité reçue ni de document de réception dans le domaine actuel. | Aucune réception ni modification de stock. | PROC-03 doit définir API et historique avant les deux interfaces; ensuite Web pour revue/exception et mobile pour réception terrain sur le même contrat. |

La création Web et le détail doivent encore être vérifiés aux viewports téléphone/tablette lors de la recette; le panneau latéral est explicitement redimensionné selon le breakpoint mais cette revue statique ne remplace pas une recette visuelle. Toute évolution UI Procurement conserve cette vérification responsive dans son DoD.

**Cible mobile après validation de PROC-03 :** conserver la consultation des bons et de leurs lignes, puis proposer une action terrain « enregistrer une réception » sur une ligne admissible. Selon les règles métier retenues, cette action pourra saisir la quantité et l’unité autorisées, scanner une référence article si elle existe déjà, joindre une photo via les capacités de fichiers existantes et afficher la confirmation/erreur renvoyée par QPM. La quantité disponible, le reliquat et le stock proviendront toujours de l’API après enregistrement. Aucune réception hors ligne n’est promise : le dépôt local de Redux n’est pas une file générale de mutations idempotentes. L’écran ne sera activé qu’avec le droit serveur de réception, l’option/licence du module et un contrat QPM protégé par clé d’idempotence. L’approbation ne sera pas exposée comme un raccourci de réception.

## Ligne de conduite approfondie — SAP et applications de référence

Recherche documentaire effectuée le 27 octobre 2026. Les produits ne suivent pas tous le même découpage fonctionnel; retenir leurs invariants, et pas une parité de menus.

| Référence | Pattern observé | Application QPM |
|---|---|---|
| SAP S/4HANA | Le reçu cite la commande, préremplit ses articles/quantités, met à jour l’historique de ligne et permet de contrôler sous-livraison/sur-livraison. La réception met aussi à jour les processus stock et qualité selon la configuration. | Toute réception QPM cible une ligne de PO et produit un document d’historique et un mouvement stock reliés dans une transaction. Le schéma et les unités restent à décider avant PROC-03. |
| SAP Ariba Mobile | Le mobile présente une file « à réceptionner », permet l’acceptation/rejet complet ou partiel et masque l’action derrière un groupe de réception et un paramètre d’activation du site. | Le mobile QPM visera d’abord le rôle magasin/réception avec file filtrée et action par ligne; activation par plan/licence et permission, sans accès mobile par défaut à tous les rôles. |
| IBM Maximo Mobile | La réception est un espace de travail magasinier dédié : recherche de PO, scan, réception partielle, inspection/retour; le parcours peut être mis en pause et reprend ensuite. La réception offline est une capacité explicitement construite. | Reprendre le parcours de tâche terrain court et traçable. Ne pas promettre reprise/offline avant une file durable, une idempotence et une résolution de conflits démontrées dans QPM. |
| Limble / UpKeep | Une demande d’achat peut partir d’une tâche/OT et rester reliée au besoin; l’approbation reste une étape distincte. UpKeep documente aussi, en septembre 2026, la création mobile depuis l’OT, le suivi des statuts et l’anti-doublon de demande sur l’OT. | À terme, démarrer une demande depuis un OT peut réduire la ressaisie. Cela dépend d’un modèle de demande distinct, des règles de consolidation des besoins et de l’approbation: c’est PROC-06, pas une création directe de PO mobile. |

Les références soutiennent trois principes à conserver dans toute tranche : un besoin métier reste lié à sa source; approbation, commande et réception sont des documents/étapes distincts; et chaque reçu reste consultable dans l’historique de la ligne. SAP Ariba Mobile distingue notamment la file de réceptions, les rôles de réception et l’acceptation/rejet partiels; Maximo Mobile documente scan et réception partielle, inspection/retour et hors-ligne comme une capacité dédiée. SAP décrit une source-list comme des enregistrements par article/organisation avec période de validité et comportement de source fixe/bloquée; c’est plus riche qu’une simple liste de fournisseurs liés à une pièce. Les fiches info achat SAP portent aussi les unités de commande et changements de prix dans le temps, ce qui justifie de garder prix convenu distinct du coût de stock courant. Ces fonctions mobiles et master data sont des exemples de périmètre, pas la preuve que QPM dispose déjà des mêmes contrôles. [SAP Ariba Mobile — réception](https://help.sap.com/docs/buying-invoicing/sap-ariba-procurement-mobile-app-guide/receiving-items-in-sap-ariba-procurement-mobile-app), [SAP — historique de PO](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/ee6ff9b281d8448f96b4fe6c89f2bdc8/1c5ef1f414f74b1bba6967346c59c1d6.html), [IBM Maximo Mobile — réception](https://www.ibm.com/docs/en/masv-and-l/maximo-manage/cd?topic=overview-maximo-mobile), [SAP — source-list et validité](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/af9ef57f504840d2b81be8667206d485/7b7fb65334e6b54ce10000000a174cb4.html?locale=en-US), [SAP — données master achats](https://help.sap.com/docs/SAP_ERP/967e1c2a6a8c4183b7e07d28e7574445/3a7eb65334e6b54ce10000000a174cb4.html?locale=en-US&state=PRODUCTION&version=6.18.latest)

### Décisions de conduite QPM

| Décision | Règle retenue pour le produit | Conséquence pratique |
|---|---|---|
| Référentiel maître | QPM garde l’ID et l’état métier; SAP/ERP est raccordé par adaptateur backend et références qualifiées par entreprise/source/type/ID externe. | Aucune logique SAP, aucun secret ni mapping propriétaire dans React Native ou le navigateur. Export/import reste possible sans connecteur activé. |
| Lien besoin → achat | Une future demande d’achat conserve l’OT/réapprovisionnement source et ses quantités; la consolidation en PO est visible et ne détruit pas l’origine. | Ne pas créer automatiquement un PO à partir d’une ligne de stock faible ou d’un OT sans étape d’approbation/consolidation. Traiter cela dans PROC-06. |
| Fournisseur de pièce | `Part.vendors` est une indication, pas une source-list d’approvisionnement. | Aucune restriction cachée de sélection. Une future source-list contraignante est un objet Procurement activable, daté et auditable avec stratégie de migration. |
| Prix | Chaque ligne de commande doit porter à terme une description/unité et un prix convenu figés au moment de l’ajout, distincts du coût courant de `Part`. | Les bons existants restent des estimations calculées depuis le coût actuel. Ne pas afficher cette estimation comme dépense réelle ni réécrire les montants historiques. Ajouter le snapshot de prix dans un lot séparé avant rapprochement facture. |
| Approbation et stock | L’approbation autorise l’engagement d’achat; seule la réception acceptée crée le mouvement stock des nouvelles commandes versionnées. | Garder le flux historique d’approbation/crédit inchangé tant que la migration prouvant l’état initial et la version de flux n’est pas prête. Ne jamais “backfiller” un reçu supposé. |
| Réception | Reçu immuable au niveau ligne, partiel, reliquat dérivé par le serveur; correction par compensation liée. Premier lot sans magasins/quarantaine tant que le domaine Stock/Qualité ne les supporte pas. | L’acceptation doit être explicite; les quantités reçues et stockées ne viennent jamais du client. Le reçu et son mouvement sont transactionnels et idempotents. |
| Séparation des droits | Lecture PO, édition brouillon, soumission/approbation, réception, clôture de reliquat, compensation et administration d’intégration sont des capacités distinctes. | Le rôle général `PURCHASE_ORDERS` peut rester la lecture, mais n’accorde pas implicitement réception ou compensation. Ajouter droits serveur et UX seulement avec un plan de migration des rôles. |
| Mobile | Le mobile est l’espace de consultation terrain puis de réception si l’utilisateur a le droit; le Web conserve administration, édition complexe, revue et exceptions. | Une seule API et un seul calcul de stock. La réception mobile est online-only au premier lot; scan/photo sont facultatifs et ne changent pas les règles. |
| Activation | Entitlement entreprise + permission de rôle + éventuel paramètre de site doivent tous autoriser la capacité. | Désactiver le module masque les nouvelles mutations et intégrations; la consultation historique reste disponible selon le droit de lecture. Les réceptions et transferts ne sont pas des toggles implicites ajoutés au module existant. |

### Séquencement des prochaines tranches

1. **PROC-03A — contrat et migration** : choisir le mode historique/nouveau par bon, décrire la preuve d’inventaire de bascule, formaliser unité/précision, droits et audit; vérifier les anciennes routes, imports et workflows d’approbation. Aucun mouvement de stock supplémentaire.
2. **PROC-03B — API serveur** : entités immuables reçu/lignes, idempotence, verrouillage du PO et des pièces, cumul/reliquat côté serveur, mouvement transactionnel, webhook après commit et compensation contrôlée. Pas d’interface qui simule les reçus.
3. **PROC-03C — Web puis mobile** : Web crée/recherche/revoit et expose l’historique; mobile reçoit les lignes admissibles avec quantité, confirmation, reprise d’erreur, confirmation serveur et accessibilité. Valider responsive tablette/téléphone, safe-area, clavier, états réseau et droits sur appareil.
4. **PROC-04/05 — intégration et file opérationnelle** : commencer par import/export générique idempotent si aucun tenant pilote SAP n’est prêt; connecter les adapters via les contrats QPM. Construire ensuite les files “à approuver/à recevoir” avec des filtres serveur et des liens de source, sans dupliquer la vérité.
5. **PROC-06 — demandes** : établir conversion et consolidation par fournisseur/unité et garder traçabilité vers l’OT; l’application mobile peut soumettre une demande liée à l’OT avant d’avoir le droit de créer un PO.

Chaque tranche a comme DoD : droits vérifiés côté serveur, isolation tenant, lignes et relation source cohérentes, erreurs et doublons explicitement traités, compatibilité du client mobile documentée, et recette responsive Web + appareil mobile. Les migrations doivent être additives et tolérer les anciens clients; on ne retire une route existante qu’après inventaire des usages externes et période de transition.

### Ordre d’implémentation retenu

1. **Garder le comportement historique sûr** : les anciens PO approuvés ont pu créditer le stock entier; ne pas changer leur traitement sans backfill vérifiable et plan de bascule.
   **Mutations Web atomiques livrées le 27 octobre 2026 :** le formulaire Web utilise `POST /purchase-orders/with-lines` et `PATCH /purchase-orders/{id}/with-lines`. Ils valident le tenant, les articles et les quantités puis enregistrent l’en-tête et toutes les lignes dans une transaction avant de lancer les workflows `PURCHASE_ORDER_CREATED` ou `PURCHASE_ORDER_UPDATED`. Seuls les workflows activés sont exécutés. L’option d’approbation directe à la création n’est appliquée que si un workflow n’a pas déjà changé le statut. Les notifications et emails de création sont envoyés après commit; un échec de notification est journalisé sans faire croire au client que le PO n’a pas été créé. Les routes historiques restent disponibles pour compatibilité, donc les intégrations et clients externes qui séparent l’en-tête et les lignes doivent migrer vers ces contrats atomiques. L’action de workflow `ASSIGN_CATEGORY`, auparavant affichée mais ignorée à l’exécution des PO, met maintenant à jour la catégorie; les références de catégorie et fournisseur sont contrôlées au paramétrage et à l’exécution dans la société du PO. L’action SEND_REMINDER_EMAIL n’étant pas encore exécutée, elle est maintenant refusée par l’API et les workflows existants sont signalés comme non modifiables, avec suppression possible. L’app mobile ne propose pas actuellement la création ni l’édition d’un PO.
2. **Finaliser le contrat métier PROC-03** : décider unités et précision, magasin/site, inspection/stock bloqué, sur-réception, reliquat/clôture, correction/annulation et droits. Chaque réception doit référencer le PO et ses lignes; quantité et mouvement sont idempotents et atomiques.
3. **Activer de manière progressive** : un mode de réception QPM ne s’applique qu’aux nouvelles commandes identifiées par un champ/version/feature explicite après migration; approbation et réception sont deux permissions et deux transitions séparées. Aucun utilisateur mobile ne peut modifier le stock directement.
4. **Ajouter le parcours Web puis mobile sur les mêmes APIs** : Web gère configuration, revue et exceptions; mobile favorise une tâche à la fois, scan/recherche, saisie ligne par ligne, confirmation explicite et résultat synchronisé depuis le serveur. Pas de formulaire desktop réduit sur téléphone.
5. **Brancher les intégrations ensuite** : définir un contrat d’adaptateur provider-neutral, choisir le premier système client, puis transformer les événements ERP au format QPM côté serveur. Rejouer le même événement ne crée ni deuxième reçu, ni doublon de stock; les credentials ne quittent jamais le serveur.
6. **Ouvrir PROC-06 après le flux de commande/réception** : vérifier les sources de besoin (OT, seuil de réapprovisionnement, demandes libres), les doublons, l’agrégation par fournisseur/site et le cycle d’approbation avant de créer `PurchaseRequisition`.

### Activation et autorisations modulaires

L’état du code au 27 octobre 2026 expose un seul entitlement de plan `PURCHASE_ORDER` et une permission `PURCHASE_ORDERS` qui couvre création, lecture, édition et suppression; `PurchaseOrder.canBeEditedBy` autorise le créateur ou le rôle avec édition générale. Ce modèle n’exprime pas de manière indépendante qui peut approuver, réceptionner, annuler un reçu ou administrer un connecteur.

Avant PROC-03/04/06, auditer les valeurs de rôles déjà persistées et définir les nouveaux contrôles séparément :

| Capacité | Contrôle futur à définir | Garde-fou de compatibilité |
|---|---|---|
| Consulter les PO | Permission de lecture actuelle + entitlement PO actuel | Aucun changement de visibilité existante. |
| Créer/éditer une demande | Permission de demande dédiée + module/option de demande | Pas de PO approuvé créé implicitement depuis une OT. |
| Créer/éditer un PO brouillon | Permission d’achat actuelle ou permission PO dédiée | Garder l’approbation serveur obligatoire; jamais accepter `APPROVED` depuis le client. |
| Approuver/rejeter | Permission d’approbation dédiée | Une nouvelle permission doit avoir une migration/valeur par défaut expliquée; l’édition générale ne doit pas accorder silencieusement une approbation privilégiée. |
| Réceptionner/inspecter/annuler | Permissions distinctes de réception et d’annulation | Receveur autorisé au site/magasin; refus métier si option ou module inactif. |
| Gérer un connecteur | Permission admin intégration + activation par entreprise | Configuration, secrets et jobs côté serveur; pas dans Web/mobile du technicien. |

Les noms proposés décrivent des capacités, pas des enums déjà disponibles ni une décision de plan tarifaire. L’implémentation doit préserver les rôles existants à travers une migration additive, avec contrôle tenant/site côté API; masquer un bouton n’est jamais l’autorisation réelle.

### Cohérence de la création PO et des workflows

La création Web est aujourd’hui divisée en deux appels : `POST /purchase-orders` crée le bon et exécute immédiatement `PURCHASE_ORDER_CREATED`; ensuite le client enregistre ses lignes via `PATCH /part-quantities/purchase-order/{id}`. Un workflow d’approbation peut donc verrouiller le PO avant l’ajout des lignes, qui sera refusé. Le formulaire Web actuel exige au moins une pièce. Le modèle sait distinguer une pièce stockée de `Part.nonStock`, mais n’a pas de type de ligne générique pour service sans `Part`; les catégories sont des noms libres et ne définissent pas ce type. Ne pas contourner ce cas en refusant tous les bons vides ni en interprétant les catégories comme règles comptables ou de stock.

La cible est un contrat de création côté serveur qui valide et persiste l’en-tête et les lignes dans la même transaction, puis déclenche workflows, notifications et intégrations après commit. Il faut d’abord décider si le périmètre inclut des lignes de service sans `Part`; les pièces non-stock existantes sont représentées par `Part.nonStock` et ne sont pas des lignes de service génériques. L’absence de ligne ne distingue pas à elle seule un service valide d’un PO d’inventaire incomplet. Aucune ligne ne doit produire un mouvement de stock implicite. Adapter le client Web et tout client API au contrat versionné, puis vérifier l’idempotence des workflows lors des retries. Ce chantier précède toute approbation Procurement automatisée, intégration ERP ou réception physique.

### Jalons qui débloquent le mobile

- **Maintenant** : consultation des PO et lignes, ouverture depuis les notifications, actualisation/pagination fiables, unité de chaque ligne, quantités groupées par unité et coût estimatif formaté avec la devise société; garder l’activation `PURCHASE_ORDER` et permission de consultation déjà présentes. Ce coût réutilise le coût courant des pièces comme la grille Web, et ne constitue pas un prix d’achat figé. Importer ou connecter des unités hétérogènes exigera une normalisation de leurs codes et conversions.
- **Après PROC-03** : réception partielle ou complète selon règle approuvée, quantité/ligne autorisée, recherche/scan, preuve photo optionnelle, résumé avant envoi, puis confirmation serveur et reliquat restant.
- **Après PROC-02 consommé par un adaptateur** : synchronisation d’état externe visible avec source et date; ne jamais afficher un statut ERP comme une mutation locale QPM.
- **Seulement après un vrai socle offline** : mise en file locale avec clé d’idempotence persistée, indicateur à synchroniser, reprise après redémarrage, retour de conflit et prévention de doubles mouvements. Aujourd’hui le mobile ne fournit pas cette garantie.

Références officielles / documentation produit : [SAP S/4HANA — goods receipts for purchase orders](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/91b21005dded4984bcccf4a69ae1300c/a363bd534f22b44ce10000000a174cb4.html?ai=true), [SAP — historique de commande et mouvements de réception](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/91b21005dded4984bcccf4a69ae1300c/ac63bd534f22b44ce10000000a174cb4.html), [SAP Ariba — guide mobile achats](https://help.sap.com/doc/a98d048991094230a1416d8a17b2c688/2508/en-US/ProcurementMobile_1.pdf), [IBM Maximo — Maximo Mobile overview / Receiving](https://www.ibm.com/docs/en/masv-and-l/maximo-manage/cd?topic=overview-maximo-mobile), [Limble — demandes d’achat depuis une tâche](https://help.limblecmms.com/en/articles/4303677-submitting-a-purchase-request), [UpKeep — commandes mobiles depuis un OT (11 septembre 2026)](https://upkeep.com/blog/mobile-purchase-orders/).
