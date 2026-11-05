# PROC-14 — Approbations PR / PO : V1 légère et responsive

Date : 28 octobre–5 novembre 2026. Statut : **V1 implémentée; régressions ciblées backend/web/mobile passées; la dernière migration sites PR/PO n'a pas été appliquée à PostgreSQL dans cet environnement. Recette visuelle authentifiée et parcours de bout en bout en environnement QPM restent à valider.** Les résultats initiaux PostgreSQL/Testcontainers de la migration des politiques (29 octobre) restent valides; ils ne couvrent pas les changements de schéma ultérieurs décrits dans l'audit Procurement. Priorité proposée : P1 dans le chantier Procurement. Ce document précise et étend PROC-14 aux PO; il ne crée pas un chantier concurrent.

## 1. Capacité attendue

Permettre à un administrateur autorisé de configurer des circuits d'approbation pour les demandes d'achat (PR) et bons de commande (PO), puis de consulter les décisions réellement enregistrées. L'interface doit rester compréhensible sans connaissance technique : une liste de politiques, une page de configuration en trois sections et un historique en lecture seule.

Direction retenue : **paramétrage de politique + étapes verticales**, sans éditeur graphique. Réutiliser MUI, les icônes Material, les thèmes/tokens et composants QPM. L'ajout de shadcn/ui, Tailwind ou Lucide n'est pas nécessaire dans la V1 et multiplierait les conventions visuelles.

Références internes : [guide de design](design.md), [architecture achats](PROCUREMENT-SAP-ARCHITECTURE.md), [recherche SAP sur les workflows PR/PO](RECHERCHE-SAP-APPROBATIONS-ACHATS.md), [backlog général](FINAL-UIUX-MAINTENANCE-BACKLOG.md). Les écarts initiaux ci-dessous décrivent l'état avant l'implémentation directe; l'état actuel et les vérifications sont résumés en section 7.

### Existant vérifié et écarts

| Domaine | Existant à réutiliser | Écart vers la proposition |
| --- | --- | --- |
| Circuit PR | Une configuration par société, jusqu'à cinq utilisateurs uniques ordonnés; copie des IDs et de la version lors de la soumission; décisions historisées. | Pas de politiques nommées multiples, brouillon/activation de politique, sélection par conditions ou approbation par rôle. |
| Interface PR | Page de configuration dans Paramètres → Fonctionnalités → Workflows; ajout, retrait, montée/descente et sauvegarde d'étapes. | Faire évoluer cette base, conserver son accès et éviter deux paramétrages concurrents. |
| Configuration vide PR | La PR reste en attente dans la file partagée historique; un approbateur autorisé distinct du demandeur peut décider. | Ce n'est pas une auto-approbation. Préserver explicitement ce mode pour les documents historiques pendant la transition. |
| Décision PO | Droit distinct `PURCHASE_ORDER_APPROVAL`, service transactionnel de décision partagé par le contrôleur et les workflows. | Ce service n'est pas un moteur de politiques multi-étapes; il faut protéger tous ses chemins d'appel. |
| Données monétaires | Le coût d'une ligne PO dépend actuellement de `quantity × Part.cost`; les lignes PR portent article et quantité. La devise existe dans les préférences de société. | Ni ce coût courant ni la devise actuelle ne constituent un montant contractuel figé du document. Les règles monétaires exigent une base de calcul et des snapshots. |
| Société / site / département | Société sur PR/PO; référentiel `Site` et portée utilisateur existants. | Aucun champ site direct ni département n'a été trouvé dans les modèles PR/PO inspectés. Leur présence dans un menu ne suffit pas à rendre ces critères utilisables. |
| Historique | JSON de décisions sur PR et métadonnées de dernière décision; version de configuration PR. | Pas d'historique unifié PR/PO ni de journal complet des versions/activations de politiques identifié dans les éléments inspectés. |

Points d'entrée du code : [configuration PR](../api/src/main/java/com/grash/model/PurchaseRequisitionApprovalConfig.java), [contrôleur PR](../api/src/main/java/com/grash/controller/PurchaseRequisitionController.java), [éditeur existant](../frontend/src/content/own/Settings/Features/Workflows/PurchaseRequisitionApproval.tsx), [décision PO](../api/src/main/java/com/grash/service/PurchaseOrderApprovalService.java), [contrôleur PO](../api/src/main/java/com/grash/controller/PurchaseOrderController.java), [workflows PO](../api/src/main/java/com/grash/service/WorkflowService.java), [coût des lignes](../api/src/main/java/com/grash/model/PartQuantity.java), [tokens QPM](../frontend/src/theme/tokens.ts).

## 2. Contraintes et simplifications V1

### Règles fixes issues du besoin

- Approbations séquentielles uniquement, au niveau du document; aucune approbation parallèle ou par ligne.
- L'instance V1 est rattachée à l'en-tête PR/PO, même si SAP autorise aussi des workflows PR par poste. Un workflow par ligne n'est pas simulé tant que son modèle d'affectation et de conversion n'existe pas dans QPM.
- Politiques et décisions persistées dans PostgreSQL, validées par Spring Boot; l'état du navigateur n'est jamais la source de vérité.
- Administration réservée aux personnes autorisées; décision réservée à l'approbateur éligible de l'étape active. Les vérifications s'appliquent aussi en accès API direct.
- Isolation par société, contrôle de la portée site quand elle est réellement modélisée, et sélecteurs limités aux données accessibles.
- Une politique QPM activée sans correspondance bloque le dépôt; aucune politique gérée ne provoque une approbation implicite. Les sociétés qui n'ont jamais activé ces politiques conservent leur routage historique. Une modification de politique ne change jamais silencieusement les documents en cours.
- Historique conservé; aucune suppression physique d'une version déjà utilisée. Aucune fausse décision ou reconstitution inventée des anciens événements.
- L'approbation d'une PR n'approuve pas le PO créé ensuite. Une étape intermédiaire ne doit ni créditer le stock ni déclencher les effets d'une approbation finale.

### Choix V1 proposés pour garder l'interface légère

Ces choix constituent la cible du backlog; les arbitrages métier restant à confirmer sont regroupés en section 5.

| Point du brief | Cible légère |
| --- | --- |
| Type de document dans les informations et dans les conditions | PR ou PO choisi une seule fois dans les informations générales; pas de condition redondante « Type = PR ». |
| Société / Business Unit | Société courante affichée en lecture seule, dérivée côté serveur. Pas de nouveau référentiel Business Unit dans ce chantier. |
| Plant / Site | Une seule sélection de portée, facultative si supportée; pas de doublon dans le constructeur de conditions. Ne pas confondre `Site` et poste technique `Location`. |
| Département | Sélecteur uniquement après existence d'un référentiel et d'un lien fiable avec le document. Pas de texte libre simulant un département. |
| Règles | Conditions à plat reliées par ET; champs et opérateurs proposés selon leur type. Pas de groupe imbriqué ni de code. |
| Étapes | Conserver la limite actuelle de 1 à 5 étapes pour la première livraison; numéro automatique, nom prérempli et modifiable, approbateur Utilisateur ou Rôle. |
| « Approbation requise : oui/non » | Toutes les étapes sont obligatoires en V1. Reporter l'option facultative tant que ses effets sur le résultat ne sont pas définis; aucun saut implicite. |
| Rôle comportant plusieurs personnes | Proposition : un seul vote d'un membre éligible termine l'étape, libellé clairement. Le mode « tous doivent approuver » est reporté. |
| Chevauchement des politiques | Autoriser plusieurs politiques actives à priorités distinctes; vérifier de la priorité numérique la plus basse à la plus haute, puis appliquer la première qui correspond. Une priorité active est unique par société/type; les conditions d'une politique sont reliées par ET. Prévoir une politique générale explicite comme repli. |
| Suppression | Autoriser seulement un brouillon jamais utilisé, sous réserve du droit; proposer Désactiver pour les politiques ayant servi. |

Une politique sans condition reste possible : « Tous les documents de ce type dans cette portée », affiché explicitement et confirmé avant activation. Ce n'est pas un circuit sans approbateur. Comme chez SAP, l'ordre de priorité rend le choix déterministe lorsqu'une politique générale et une politique spécifique se recouvrent.

## 3. Contrat fonctionnel et technique

### Surfaces et navigation

Conserver les entrées PR et PO dans Approvisionnement. Ajouter **Gestion des approbations**, repliable, avec **Politiques d'approbation** et **Historique**. Réutiliser le filtrage des menus par permissions et module actif; un lien masqué n'est pas un contrôle de sécurité. Conserver un raccourci depuis l'actuel écran de paramètres, vers la même configuration, et maintenir l'ancienne URL utilisable.

Acteurs : administrateur de politique, demandeur/créateur du document, approbateur assigné et lecteur autorisé de l'historique. Le droit d'approuver ne donne pas automatiquement le droit d'administrer les politiques ni celui de lire tout l'historique.

Un approbateur PO doit aussi avoir les droits de lecture et de lecture des autres PO : les listes et fiches PO restent protégées par ces droits, contrairement à la file PR qui expose les demandes en attente à ses approbateurs. Le sélecteur et l'activation filtrent/refusent les rôles PO incapables d'ouvrir le document sur Web ou mobile; le droit de décision côté serveur reste vérifié séparément.

### Liste des politiques

- Titre, description courte, recherche par nom, filtres Type (Tous/PR/PO) et État (Tous/Brouillon/Actif/Inactif), bouton **Créer une politique**.
- Colonnes desktop : nom, type, résumé des conditions/portée, nombre d'étapes, état, menu Actions. Badges avec texte; éviter l'affichage de toutes les règles dans une cellule.
- Actions selon droit et état : Voir, Modifier, Dupliquer, Activer/Désactiver, Supprimer si autorisé. Dupliquer crée toujours un brouillon.
- Pagination serveur; filtres conservés au retour de l'éditeur; chargement, erreur relançable, liste vide et aucun résultat distingués. Pas de récupération de tout l'historique pour filtrer localement.

### Éditeur : une page, trois sections

**A. Informations générales.** Nom et type obligatoires, description facultative, société courante, portée site si disponible. L'état est un badge résultant de l'action Enregistrer/Activer/Désactiver, pas un select permettant de contourner l'activation. La Business Unit n'est pas ajoutée comme nouveau module.

**B. Conditions d'application.** Ligne « Champ → Opérateur → Valeur », bouton Ajouter et retrait accessible. Montant : `=`, `≠`, `>`, `≥`, `<`, `≤`; site/département, si supportés : `=` ou `≠` avec sélecteur recherchable. Le changement de champ réinitialise opérateur/valeur incompatibles. Afficher la devise de la politique et la portée déjà choisie, sans les redemander sur chaque ligne. Refuser valeurs absentes, bornes contradictoires et références étrangères/inaccessibles; ne jamais interpréter une donnée manquante comme zéro ou comme une condition satisfaite.

**C. Étapes d'approbation.** Cartes numérotées verticales, reliées discrètement, la carte en édition ouverte et les autres résumées. Résumé : nom, rôle/utilisateur sélectionné, état Configuré/À compléter. Ajouter, modifier, retirer, déplacer vers le haut/bas avec boutons utilisables au clavier et au toucher; renuméroter automatiquement. Ne pas préchoisir silencieusement un utilisateur lors de l'ajout. Prévenir si le retrait d'une étape configurée fait perdre sa saisie.

Zone d'actions persistante : **Annuler**, **Enregistrer le brouillon**, **Aperçu**, **Activer**. Rendre la hiérarchie claire : activation primaire, sauvegarde secondaire, aperçu et annulation discrets; les quatre actions restent accessibles sans imposer une rangée trop large. Signaler les modifications non enregistrées, protéger la sortie et bloquer la double soumission. En cas d'échec, conserver la saisie et montrer les erreurs auprès des champs concernés.

### Aperçu et activation

L'aperçu présente nom, type, portée, conditions lisibles, séquence des étapes et destinataires, puis « Approbation finale après validation de toutes les étapes ». C'est une prévisualisation de configuration, sans décision ni activation réelle. Les champs incomplets restent signalés; ne pas représenter un circuit incomplet comme valide.

La validation serveur d'activation vérifie champs requis, au moins une étape, éligibilité des approbateurs et conditions typées/cohérentes. Les priorités sont uniques par société/type actif; un chevauchement entre priorités distinctes est résolu par « première correspondance ». L'écriture et la vérification des politiques concurrentes sont atomiques; retourner un conflit explicite sans succès optimiste trompeur.

Pour les montants, la comparaison doit utiliser une valeur décimale et une devise figées côté serveur. Les libellés localisés ne sont pas stockés comme valeurs métier. Aucune conversion de devise implicite; montant/devise inconnus bloquent la sélection d'une politique monétaire avec une explication.

### Cycle des politiques et des documents

- **Brouillon → Actif → Inactif** : brouillon incomplet enregistrable; activation strictement validée; désactivation auditée. Réactiver exige les mêmes validations. Une politique inactive ne démarre plus de nouveaux circuits mais les documents déjà engagés continuent leur version.
- Modifier une politique active crée une nouvelle révision brouillon. L'activation de cette révision remplace atomiquement la version courante; les instances existantes gardent leur snapshot. Pas d'édition en place de la version utilisée.
- Pour un nouveau document régi par les politiques, figer à la soumission le type, la base des conditions, la politique/révision et les étapes/destinataires résolus. Si aucune politique ne correspond, bloquer l'entrée dans le circuit avec une action claire pour contacter l'administrateur; si plusieurs correspondent, retenir la première par priorité explicite et stable.
- Une décision positive avance d'une seule étape. Un rejet motivé termine le circuit; aucune étape ultérieure n'est exécutée. L'approbation finale n'intervient qu'après toutes les étapes obligatoires.
- V1 proposée : auto-approbation interdite, sans option de dérogation; exclure le demandeur PR et le créateur/demandeur PO identifié de la liste des candidats. Revalider compte actif, droits et portée au moment de décider. Si aucun candidat n'est éligible, montrer le blocage, sans le contourner.
- Pour un rôle, figer les candidats à la soumission et ne pas injecter de nouveaux membres silencieusement dans les dossiers en cours. Le remplacement d'un approbateur parti/inactif exige une procédure explicite et auditée à cadrer; il ne doit jamais produire une approbation automatique.
- Les modifications de montant, devise, portée ou lignes pendant un circuit ne doivent pas invalider silencieusement le snapshot : proposition V1, les bloquer jusqu'à rejet/retrait et nouvelle soumission selon le cycle réellement disponible.

### Persistance, API et compatibilité

Réutiliser l'identité société, utilisateurs, rôles, sites, documents PR/PO et service de transition PO. Ajouter seulement les structures manquantes : définitions/révisions de politiques, conditions typées, étapes, instance/snapshot rattachée au document et événements durables. Choisir le schéma minimal compatible avec l'historique PR existant; ne pas créer un second inventaire ni deux moteurs d'approbation concurrents.

Contrats V1 maintenant disponibles : API de recherche/lecture/création/modification/duplication/activation/désactivation des politiques, cibles d'approbateur, historique paginé et résumé d'approbation d'un document. Les décisions passent par les endpoints PR/PO existants, adaptés pour appliquer le circuit actif côté serveur.

Les lectures/écritures contrôlent tenant, permission, disponibilité Procurement et version attendue. Un enregistrement concurrent renvoie un conflit récupérable au lieu d'écraser une autre modification. Les décisions et l'avancement sont transactionnels, protégés contre double clic, retry réseau et double vote simultané; les effets métier terminaux ne sont appliqués qu'une fois.

**Points de passage PO à couvrir :** décision manuelle `/respond`, `approveOnSubmit`, création/modification avec lignes et actions `APPROVE`/`REJECT` des workflows. Ils ne doivent pas permettre de sauter les étapes d'un document régi par une politique. Utiliser le service PO existant pour la transition finale et ses effets; les approbations intermédiaires restent sans effet sur stock/réception ni libération des quantités PR.

Préserver les deux versions de réception : les nouveaux PO `receivingWorkflowEnabled=true` ne créditent le stock qu'au reçu; les anciens PO gardent leur effet historique lors de la décision finale. Le rejet final garde la libération transactionnelle des quantités PR existante. Ce chantier ne redéfinit pas la réception.

Compatibilité livrée sans import automatique : les entreprises qui n'ont jamais activé une politique QPM gardent les circuits PR/PO historiques. Les PR déjà soumises gardent leurs IDs/version copiés; les politiques QPM ne réécrivent pas les décisions passées. Les workflows PO historiques ne peuvent pas décider à la place d'une politique QPM active. Après activation d'une politique, la désactivation sans remplacement bloque le dépôt au lieu de réactiver silencieusement un ancien flux.

### Historique réel

Page en lecture seule : numéro de document et lien autorisé, type, politique/révision, niveau, acteur, décision, date/heure et commentaire. Recherche et filtres type/décision/période/politique, pagination serveur et distinction « aucun événement » / erreur de chargement. Afficher les anciennes décisions sans politique comme **Circuit historique**, sans fabriquer de niveau, de nom de politique ou d'heure inconnus.

Le journal des décisions et celui des modifications de configuration sont distincts : tracer aussi acteur/date/version d'une activation, désactivation ou révision. L'historique et le snapshot restent lisibles après désactivation d'un compte ou d'une politique. Ne pas remplacer un historique illisible par une liste vide signalée comme authentique; exposer l'erreur et conserver la donnée pour diagnostic. Notifications et retours UI ne partent qu'après validation de la transaction.

### Responsive, accessibilité et performance

| Surface | Comportement attendu |
| --- | --- |
| Desktop | Liste compacte; éditeur centré de largeur limitée; champs généraux sur deux colonnes quand ils tiennent; étapes verticales. |
| Tablette | Deux colonnes seulement si les libellés/contrôles restent lisibles; conditions se réorganisant sans défilement horizontal; menus tactiles. |
| Téléphone Web | Liste en cartes synthétiques, filtres repliables avec nombre actif, sections et champs empilés, étapes extensibles; aperçu plein écran; barre d'actions sur plusieurs lignes si nécessaire. |
| React Native | Conserver les parcours de décision PR/PO existants. Le dialogue de décision charge maintenant la politique et l'étape courante avant confirmation; l'API demeure l'autorité. L'éditeur d'administration reste Web. |

Vérifier 360/390, 768, 1024 et 1440 px, puis les libellés FR/EN et le zoom. Aucun champ ni bouton ne doit être caché sous la barre persistante ou le clavier. Cibles tactiles proposées d'au moins 44 × 44 px, focus visible, libellés explicites, état sans couleur seule, erreurs associées au champ, annonce du résultat et retour du focus après fermeture d'aperçu. Réduire les animations selon la préférence système; aucune animation ne retarde la saisie.

Réutiliser les composants existants avant toute extraction. Candidats : liste/cartes, éditeur de conditions, liste/cartes d'étapes, sélection d'approbateur, aperçu; état de page et accès API selon les conventions Redux/client existantes. Ne pas créer systématiquement un hook/service par composant. Paginer les listes et les sélecteurs si nécessaire, éviter le chargement de toutes les décisions et les appels par ligne.

## 4. Hors périmètre de la V1

BPMN, React Flow, glisser-déposer, branches parallèles, conditions OU imbriquées, scripts, IA, approbation par article, mode tous-les-membres d'un rôle, étapes facultatives, délégations automatiques, escalades/SLA complexes, conversion multidevise, nouveaux modules Département/Business Unit et éditeur natif. La simulation sur un véritable document avec diagnostic de sélection peut suivre l'aperçu de configuration; elle n'est pas simulée par des données inventées dans la V1.

## 5. Décisions ouvertes avant les lots concernés

| Décision | Proposition légère / point à confirmer | Lot bloqué |
| --- | --- | --- |
| Montant PR et PO | **V1 décidé :** estimation `quantité × Part.cost`, devise société, calculée côté serveur et figée au dépôt; ce n'est pas un engagement fournisseur HT/TTC. | En backlog : prix/totaux contractuels, taxes/remises et conversion multidevise. |
| Site / département | **V1 décidé :** ces critères ne sont pas proposés faute de source cohérente sur les deux documents. | En backlog jusqu'à la fiabilisation des relations. |
| Étapes requises et rôles | **V1 décidé :** 1 à 5 étapes obligatoires et séquentielles; rôle ou utilisateur; candidats distincts possibles validés côté serveur. | Les étapes facultatives et branches restent exclues. |
| Candidat devenu indisponible | Les candidats sont figés, mais leur compte et leurs permissions sont revérifiés au moment de décider. | En backlog : réaffectation administrative avec motif et audit. |
| Politiques qui se recouvrent | **V1 décidé :** priorité unique par type, conditions ET, première correspondance; après activation d'une politique, aucune correspondance bloque la soumission. | En backlog : simulation de sélection sur un document réel avant activation. |
| Administration et lecture | **V1 décidé :** politiques/historique dans Settings, lecture et modification distinguées par permission SETTINGS; décision PR/PO reste séparée. | En backlog : vue unifiée avec les anciennes décisions JSON. |
| Bascule et compatibilité PO | **V1 décidé :** politiques démarrées à la soumission, version figée, actions workflow APPROVE/REJECT historiques ignorées sur un PO gouverné. | En backlog : revue de recette pour chaque configuration préexistante et plan de migration ERP. |

### Audit des sources de données — 29 octobre 2026

Vérification des modèles `PurchaseRequisition`, `PurchaseRequisitionLine`, `PurchaseOrder` et `PartQuantity` : les lignes PR stockent article et quantité; les lignes PO stockent article et quantité. Le coût PO est calculé comme `quantity × Part.cost`, donc peut varier si le coût maître de l'article change. Aucun prix unitaire, montant total contractuel ou devise n'est figé sur la ligne ou le document. La devise de société seule ne permet pas de reconstruire le montant au moment de la demande.

Les PR/PO portent la société mais pas de site ni département directs. Une PR peut référencer un ordre de travail dans certains cas; cette relation partielle ne définit pas le site de toutes les demandes et ne donne pas de département métier fiable. Le référentiel `Site` et la portée des utilisateurs ne remplacent pas une relation document-site.

**Décision de mise en œuvre V1 :** le critère offert dans l'éditeur est nommé « montant estimé des pièces » et calcule côté serveur la somme décimale `quantité × Part.cost` à la soumission PR/PO. Le montant est arrondi HALF_UP à quatre décimales (précision du snapshot PostgreSQL), puis figé avec la devise société dans l'instance afin que les changements ultérieurs du coût maître n'altèrent pas le routage démarré. Les prix, montants contractuels, taxes, frais et remises ne sont pas disponibles; l'interface l'explique et ne présente pas cette estimation comme prix fournisseur. Site/département restent désactivés tant que les relations documentaires ne sont pas fiables.

Les décisions V1 appliquées et les limites restantes sont consignées en section 7; les éléments non résolus restent des entrées de backlog et ne sont pas présentés comme des réglages utilisables.

## 6. Lots de réalisation et passage à l'implémentation

Ce plan décrit le séquencement initial de PROC-14. La réalisation de la première tranche est terminée; consulter la section 7 pour l'état réel et les tests. Les lots restants sont des extensions, pas des travaux nécessaires pour utiliser le circuit V1.

| Lot | Priorité | Livrable et acceptation | Dépendances |
| --- | --- | --- | --- |
| PROC-14A — contrats et données | P1 | Matrice des champs réellement disponibles, droits, définitions de montant, cycle PO, résolution des destinataires et scénarios de bascule consignés; garde-fous métier approuvés pour le lot développé. | Décisions de section 5; audit courant. |
| PROC-14B — structure UX | P1 | Wireframes liste/éditeur/aperçu/historique, états vide/erreur/interdit, et variantes 390/768/1440 px. Un administrateur retrouve conditions et étapes sans ouvrir plusieurs modales. | Aucune migration; réutiliser l'éditeur PR et les tokens. |
| PROC-14C — persistance et politiques | P1 | CRUD brouillon, révisions, activation atomique, validation et collisions; migrations additives sur base de recette; une mise à jour concurrente ne perd aucune modification. | A; implémenter seulement les critères dont les sources sont validées. |
| PROC-14D — éditeur et liste connectés | P1 | Sections A/B/C, filtres, duplication, réordonnancement, aperçu et barre d'actions; sauvegarde réelle, erreurs contextualisées et saisie conservée. Aucune fonction indisponible présentée comme utilisable. | B + C; inclut les conditions typées disponibles. |
| PROC-14E — exécution PR | P1 | Sélection serveur et snapshot à soumission, étapes Utilisateur/Rôle, décisions sans auto-approbation ni double vote; les PR déjà en cours restent inchangées. | A + C; adaptateur de la configuration PR actuelle. |
| PROC-14F — exécution PO | P1 | Même contrat de politique sur tous les points d'entrée PO, transition finale via le service existant; PR et PO restent indépendants; aucun effet de stock intermédiaire. | E, règles de soumission et inventaire des automatismes validés. |
| PROC-14G — historique | P1 | Vue paginée de vrais événements PR/PO, lien document selon droit, circuit historique identifié; modifications de politique auditables et versions utilisées non supprimables. | C + E/F; lecture du JSON historique sans inventer les champs absents. |
| PROC-14H — recette et bascule | P1 | Parcours multi-utilisateur/API et responsive vérifiés, migration ancienne configuration et compatibilité PO testées; preuves de réussite/échec et limites consignées. | C à G; aucune livraison déclarée sur la seule base d'une capture. |
| PROC-14I — complément natif | P2 | Évaluer l'affichage politique/niveau/historique dans les écrans existants; conserver les décisions autorisées, tester sur Android/iOS. | Contrats stables et besoin terrain; éditeur natif exclu. |

### Scénarios de recette indispensables

1. Créer une politique PR brouillon, ajouter deux étapes, les réordonner, sauvegarder puis recharger : valeurs et ordre conservés; droits et état cohérents.
2. Activer avec un champ manquant, un approbateur inéligible, des bornes impossibles ou un chevauchement : refus serveur, champ/politique en cause explicite. Deux activations simultanées ne créent pas d'ambiguïté.
3. Pour des seuils de 500 000 dans la devise configurée, vérifier exactement 500 000 et la première valeur supérieure selon sa précision; refus si devise ou montant source manque. Ce nombre n'est ni une constante produit ni une devise XOF imposée.
4. Soumettre une PR, approuver le premier niveau : elle reste en attente; seul le dernier niveau approuve. Refus d'auto-approbation, hors ordre, hors droit ou hors société; motif requis au rejet.
5. Changer puis désactiver une politique pendant une approbation : le document conserve sa version et ses étapes; un nouveau document sans politique correspondante n'est pas approuvé automatiquement.
6. Faire deux décisions concurrentes/rejouer une requête après timeout : un seul événement et un seul avancement effectif; la réponse permet au client de retrouver l'état réel.
7. Un document régi par une politique PO ne saute aucune étape via décision directe, `approveOnSubmit` ou workflow. La transition finale conserve les règles de réception et de libération PR; approbation PR ≠ approbation PO.
8. Historique chargé depuis la base, refus de suppression d'une version utilisée, lecture limitée au rôle; ancien circuit sans champs nouveaux affiché honnêtement.
9. Sur téléphone/tablette/desktop, créer et modifier une politique au clavier et au toucher, ouvrir/fermer l'aperçu, récupérer d'une erreur serveur et retrouver les filtres; aucun débordement horizontal ni action masquée.

## 7. État de l’implémentation directe — 29 octobre 2026

La première tranche est implémentée dans le code; la vérification complète et la recette restent en cours :

- **Livré dans le code :** pages web de politiques, création/édition de brouillon, duplication et révision, activation/désactivation, aperçu séquentiel, historique des décisions issues du nouveau circuit, sélection d’utilisateurs/rôles éligibles et affichage de la progression PR/PO. Interface responsive basée sur les composants MUI existants; la navigation et les droits Settings existants sont réutilisés.
- **Livré dans le code :** stockage PostgreSQL versionné, audit append-only, endpoints tenant-scopés, snapshot à la soumission, approbations séquentielles par utilisateur ou rôle, prévention de l’auto-approbation, refus explicite si une politique a été désactivée sans remplacement, et garde contre les effets d’inventaire aux étapes PO intermédiaires. Les PO avec réception activée ne créditent le stock qu'à la réception; le mode historique sans réception crédite à la décision finale. Les anciens documents gardent leur circuit existant; les nouvelles politiques ne réécrivent pas leurs validations.
- **Logique SAP appliquée :** les routes de création de PO démarrent l'approbation après persistance des lignes; un PO gouverné ne peut plus être modifié pendant son circuit. Le moteur classe les politiques actives par priorité, évalue les conditions en ET et choisit la première correspondance. Le montant estimé est figé sur l'instance avec la devise de société. Aucun fallback d'approbation automatique n'est ajouté; une politique générale est une règle explicite qui requiert elle aussi des approbateurs.
- **UX Settings mise à jour :** l’entrée PR Approval reprend le bouton primaire Create Workflow; l’ancienne configuration affiche le lien vers la gestion centralisée et une liste verticale numérotée. Après activation d'une politique centralisée, l'ancien éditeur est désactivé et l'API refuse les sauvegardes même si la politique a été ensuite désactivée. L’ajout d’un niveau ne sélectionne plus un utilisateur par défaut et signale les sélections manquantes. Les listes passent en cartes et les règles s'empilent jusqu'au breakpoint 1200 px pour préserver la largeur disponible avec la barre latérale.
- **Décisions mobiles renforcées :** sur PR et PO, le dialogue de décision demande le résumé serveur du circuit avant d'activer Confirmer; il affiche politique/version/niveau courant et bloque un approbateur non éligible. Sur PO, un commentaire est demandé pour un rejet gouverné par politique. Les anciens circuits sans résumé conservent leur mécanisme historique.
- **Preuve mobile ajoutée :** le test `procurement-approval-mobile.test.cjs` vérifie l'appel du résumé PR/PO, l'envoi des décisions, le blocage d'un décideur non éligible et l'affichage du montant estimé avec sa devise; il est inclus dans `test:mobile-regression`.
- **Limite fonctionnelle explicite :** cette tranche accepte des règles de montant estimé uniquement; le site/département restent indisponibles. Jusqu’à cinq niveaux séquentiels obligatoires. Les événements d'historique exposent les décisions réelles du nouveau moteur; les anciennes entrées restent dans leur stockage historique d’origine.
- **À terminer avant une recette de mise en service :** test responsive visuel des écrans privés et scénarios API PR/PO contre une instance QPM de recette, ainsi que revue métier de la règle de remplacement. La migration et les contraintes ont passé les 3 tests Testcontainers PostgreSQL 16; l'instance applicative complète n'a pas été démarrée. L'historique legacy unifié, le montant contractuel réel, site/département et l'extension native restent au backlog.
- **Garde PO renforcée pendant la revue :** un PO soumis à une politique ne peut pas être modifié/supprimé via les endpoints d'édition courants; les workflows historiques ne peuvent pas décider à sa place; une étape PO intermédiaire n'ajoute jamais de stock. Le test couvre aussi le crédit historique à l'approbation finale lorsque la réception est désactivée.
- **Droits d'émission et entitlement vérifiés :** l'API et l'interface bloquent l'émission officielle d'un PDF PR pour un lecteur qui n'est ni demandeur ni rôle d'édition. Les routes de recherche, détail, lignes, catégories, réceptions, modèles, previews, archives et téléchargements PR/PO exigent aussi que Procurement soit activé pour l'abonnement; les permissions de lecture sur le document restent revérifiées.
- **Tests de cette tranche :** tests backend ciblés sur les providers, le rendu PDF, les validations, le service/controller d'approbation et les transitions PO; les résultats chiffrés récents sont listés dans les vérifications ci-dessous.

**Vérifications au 29 octobre 2026 :** compilation backend et 92 tests ciblés réussis : `GeneratedDocumentServiceTest` (28), `ConfigurableWorkOrderReportRendererTest` (9), `ProcurementDocumentDataProviderTest` (4), `ReportTemplateConfigurationValidatorTest` (12), `ProcurementApprovalServiceTest` (27), `ProcurementApprovalControllerTest` (6), `PurchaseOrderApprovalGovernedInventoryTest` (2), `PurchaseOrderApprovalConcurrencyTest` (1) et `ProcurementApprovalMigrationIntegrationTest` (3). Les tests statiques de régression web/mobile passent (7 et 2); les typechecks complets Web et mobile et ESLint web ciblé passent. La suite mobile complète passe également avec 55 scripts et 10 tests Jest. Le build Web de production et le package Spring Boot (`api/target/app.jar`) ont été générés avec succès; le Web utilise le typecheck séparé en mode faible mémoire. L'export Expo Android a compilé les 2 259 modules et produit un bundle Hermes de 9,66 Mo. Le build Android debug natif a réussi avec Gradle 8.11.1; l'APK est disponible dans `mobile/android/app/build/outputs/apk/debug/app-debug.apk` (debug, non destiné à la distribution). L'installation et le lancement sur appareil restent non vérifiés, car aucun appareil/emulateur ADB n'est connecté. Les 3 tests Testcontainers valident l'application et les contraintes de la migration sur PostgreSQL 16; un défaut du test de transaction détecté à la première exécution est corrigé. Chromium headless affiche la route publique de connexion à 390 px, mais les pages privées d'approbation n'ont pas été inspectées sans session QA et API active.

### Prochaine reprise recommandée

1. Faire la recette visuelle des politiques et de Settings → Workflows sur 390, 768 et 1440 px, en FR/EN; corriger les défauts de reflow et de libellés.
2. Compléter la recette visuelle responsive mobile/web et vérifier l'affichage de l'éligibilité sur les listes. Le serveur continue de refuser les décisions non éligibles même si un bouton d'entrée reste visible.
3. Exécuter les scénarios API PR/PO et l'impression avec comptes de recette sur une instance QPM complète; les builds Web, backend et Android debug ainsi que la migration isolée PostgreSQL sont désormais validés localement.
4. Ajouter un prix fournisseur figé au PO et des totaux contractuels (devise, taxes, frais/remises) avant d'étendre les seuils à un engagement réel; ajouter site/département après fiabilisation de leurs relations aux documents.

### Mise à jour de l'audit Procurement — 5 novembre 2026

Les points 3 et 4 ci-dessus sont partiellement dépassés par les changements présents dans l'arbre de travail : prix fournisseur et devise figés, total de contrat séparé de l'estimation inventaire, sites par ligne PR/PO, visibilité par site, CSV et champs d'impression ont été ajoutés. Les règles d'approbation par département/site restent indisponibles tant que leur sémantique métier n'est déterminée; taxes, frais, remises et unité d'achat restent hors V1.

- **Recette intégrée à faire** : migration Liquibase sur PostgreSQL, parcours authentifiés PR/PO, rendu d'un modèle imprimable publié et vérification visuelle responsive Web/mobile sur appareil ou navigateur QA.
- **P1 — cycle de vie PO** : ajouter l'annulation du solde non reçu et les retours des quantités déjà réceptionnées avec motif, références de réception, écriture stock compensatoire, libération des reliquats PR et audit; la suppression des PO approuvés/réceptionnés est refusée en attendant.
- **P1/P2 — webhooks PO** : les événements `NEW_PURCHASE_ORDER`, `PURCHASE_ORDER_CHANGE` et `PURCHASE_ORDER_STATUS_CHANGE` existent dans l'enum mais ne sont pas émis. Définir un payload documenté, émettre après commit, et tester création, modification et transitions d'approbation avant de présenter ces abonnements comme actifs.
- **Connexion Sage 300** : capacité non activée. Il faut un serveur Web API et une société Sage de recette, des identifiants techniques fournis de manière sécurisée, les correspondances article/fournisseur/devise/site et une stratégie de reprise idempotente; ne pas stocker de secret dans le client Web.
- **État de vérification** : le 5 novembre, 115 tests ciblés API réussissent sans échec; le package `api/target/app.jar` est reconstruit. Le test Testcontainers de migration ne peut s'exécuter ici faute de socket Docker; voir [l'audit Procurement SAP/Sage](AUDIT-PROCUREMENT-SAP-SAGE300.md) pour le détail et les autres limites d'environnement.

### Contrôles complémentaires du 5 novembre 2026 (04:26 UTC)

- Le build Web après les traductions récentes est **non certifié** : compilation restée sans progression visible, sans bundle ni manifeste; la sortie partielle a été supprimée. Typechecks Web/mobile et suites ciblées restent verts, et le build antérieur certifié reste le dernier artefact exploitable.
- Les retours et annulations de PO approuvés/réceptionnés demeurent absents; leur implémentation doit compenser le stock reçu, recalculer les reliquats PR et conserver les références d'audit.
- Les webhooks PO sont bien absents. Avant de les annoncer fonctionnels, définir le payload stable et ajouter une livraison durable/rejouable après commit; le dispatcher asynchrone existant seul ne garantit pas la remise.
- **Correctif ajouté le 5 novembre, 04:33 UTC** : sélection et réaffectation d'un niveau d'approbation bloqué vérifient maintenant l'accès au document et à tous ses sites; une portée hors site renvoie 404 sans révéler de cible ni modifier le circuit. `ProcurementApprovalControllerTest` passe (8/8).

### Suivi du 5 novembre 2026 — 12:15 UTC

- **Terminé dans cette reprise** : notifications PO centralisées sur création directe et conversion PR→PO, exécutées après commit; le formulaire PO distingue désormais l'erreur de prix fournisseur de l'erreur de quantité. Tests backend ciblés (8) verts; ESLint et typecheck frontend verts.
- **Toujours ouvert** : recette visuelle Procurement authentifiée à 390/768/1440 px; cycle sécurisé d'annulation et retour PO; purge/rétention outbox; test réel webhook vers endpoint autorisé; validation métier des WO000026–WO000028; environnement d'intégration Sage 300. Le build Web optimisé et les deux images locales ont depuis été reconstruits avec succès; voir l'audit pour leurs digests.
- **Mise à jour de statut historique** : les sections antérieures qui décrivent les webhooks PO comme absents sont dépassées par l'outbox persistante et la console dead-letter décrites dans `AUDIT-PROCUREMENT-SAP-SAGE300.md`; restent leur politique de rétention et le smoke test externe.
