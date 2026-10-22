# QPM — contrat d’intégration Documents Web/Mobile

**Statut :** au 22 octobre 2026, DOC-03/04/05 sont implémentés localement, DOC-06 fournit la bibliothèque Web et DOC-07 couvre les rapports PDF de demandes (modèle, aperçu, émission archivée, historique et téléchargement). Le changelog courant a été rejoué depuis zéro sur PostgreSQL 18 temporaire : 849 changesets appliqués, Hibernate `ddl-auto=validate` réussi et Spring Boot démarré. La validation technique locale de DOC-07 est terminée; seule la recette visuelle authentifiée reste à faire avant acceptation de déploiement. Le build CRA passe en mode faible mémoire. Aucune migration ni aucun déploiement de production n’a été effectué.

## Fonctionnement actuel vérifié

Les chemins ci-dessous sont des chemins relatifs au préfixe API configuré par le client.

| Intention | Route actuelle | Réponse / effet | Consommateur |
| --- | --- | --- | --- |
| Champs disponibles pour un futur modèle WO | `GET /work-orders/{id}/report/fields` | Descripteurs stables allowlistés (clé, groupe, type, section, répétition, sensibilité, `valueSupported`); aucune valeur de l’ordre n’est renvoyée | Pas encore consommé directement; la bibliothèque Web utilise sa liste de champs WO v1 validée côté serveur |
| Valeurs pour aperçu de bindings WO | `POST /work-orders/{id}/report/preview-data` avec `{ "fields": ["workOrder.title"] }` | Objet clé/valeur limité aux clés explicitement prises en charge par `WorkOrderReportDataProvider`; société + `canBeViewedBy` revérifiés; champ non pris en charge ou sensible refusé en 400 | Pas consommé directement par Web/Mobile; le renderer DOC-05 invoque le même provider serveur |
| Aperçu PDF WO sans archivage | `POST /work-orders/report/{id}/stream` avec `ReportConfig` | Flux `application/pdf`; pas d’objet `GeneratedDocument` créé | Web `ReportConfigModal`; Mobile `WODetailsScreen` via le thunk `getPDFReport` (configuration serveur par défaut) |
| Aperçu historique WO (compatibilité) | `GET /work-orders/report/{id}` | URL de stockage signée; route backend dépréciée conservée pour les anciennes versions | Aucun client Mobile courant après DOC-02; vérifier les versions encore distribuées avant retrait |
| Émettre/archiver un rapport WO | `POST /work-orders/{id}/report/issue` avec `ReportConfig` | `GeneratedDocumentDTO`; PDF rendu puis téléversé et empreinte SHA-256 stockée | Web `ReportConfigModal`; Mobile `WODetailsScreen` (configuration serveur par défaut, confirmation avant émission) |
| Choisir un template WO publié | `GET /work-orders/{id}/report/templates` | DTO de sélection minimal (id, nom, version publiée, défaut); seulement les templates publiés du tenant et après vérification de visibilité au WO | Web `ReportConfigModal` |
| Émettre/archiver depuis un template publié | `POST /work-orders/{id}/report/issue-template/{templateId}` | Même contrôle d’émission; template publié du tenant courant seulement; PDF et instantané archivés avec `templateVersionId` et le numéro de version exact | Web `ReportConfigModal` |
| Prévisualiser un template publié | `POST /work-orders/{id}/report/preview-template/{templateId}` | PDF `application/pdf` privé sans cache; recontrôle tenant et visibilité WO; n’archive rien et ne change aucun statut | Web `ReportConfigModal` |
| Prévisualiser depuis la bibliothèque | `POST /document-templates/{id}/preview-pdf?workOrderId={id}` | Brouillon courant si présent, sinon version publiée; lecture `DOCUMENT_TEMPLATES.view` (ou `SETTINGS.view` rétrocompatible) + tenant + accès WO vérifiés; PDF `private, no-store`, sans archive | Web Gestion des rapports → Modèles de documents |
| Historique des rapports émis | `GET /work-orders/{id}/documents` | Liste de `GeneratedDocumentDTO` autorisée sur le WO | Web `ReportConfigModal`; Mobile `WODetailsScreen` |
| Télécharger un rapport émis | `GET /documents/{id}/download` | Octets PDF en téléchargement; société et accès courant à la source contrôlés | Web `ReportConfigModal`; Mobile `WODetailsScreen` |

L’ancienne route de prévisualisation signée reste marquée `@Deprecated` au backend, mais aucun client courant du dépôt ne l’utilise. Mobile consomme maintenant tout le cycle (aperçu, émission, historique et téléchargement) par les routes authentifiées existantes; son aperçu et ses téléchargements sont conservés dans le répertoire privé de l’application et validés comme `application/pdf`. La route legacy reste disponible pour les versions déjà distribuées.

## Sémantique commune à conserver

1. **Aperçu** : rendu temporaire du dossier visible; ne crée pas d’archive et ne change aucun statut métier.
2. **Émission** : produit une copie officielle archivée avec acteur, horodatage, société/site, source, version et empreinte; elle ne modifie pas le WO.
3. **Historique** : liste les seules archives que l’utilisateur peut encore consulter selon les contrôles d’accès au dossier source.
4. **Téléchargement** : requête authentifiée vers QPM, avec autorisation revalidée côté serveur; ne pas remplacer par une URL publique permanente.
5. Le Web et le Mobile consomment le même format de métadonnées, mais l’aperçu et l’archive restent deux actions distinctes.

## DTO actuel d’archive

`GeneratedDocumentDTO` expose actuellement `id`, `documentType`, `sourceType`, `sourceId`, `siteId`, `fileName`, `sha256`, `locale`, `templateVersion`, `issuedAt` et `issuedBy`. Il n’expose ni contenu PDF ni chemin de stockage. Le client ne fournit jamais `companyId`, `siteId`, `issuedBy`, `storagePath`, hash ou version autoritative; le backend dérive et enregistre ces valeurs.

`ReportConfig` représente aujourd’hui une liste de booléens de sections (coûts, commentaires, tâches, historique, temps estimé, localisation, priorité, relations, fichiers, signature, informations WO). Ce DTO doit rester le contrat courant jusqu’à ce qu’un schéma versionné et sa migration de compatibilité soient approuvés.

Le catalogue `GET /work-orders/{id}/report/fields` est une métadonnée additive, issue d’une liste de bindings explicites côté serveur. Chaque descripteur indique désormais `valueSupported`, afin qu’une future interface ne confonde pas l’existence conceptuelle d’un champ et sa résolution déjà disponible. `POST /work-orders/{id}/report/preview-data` résout actuellement un sous-ensemble non financier : identité et description WO, statut/priorité, dates, durée estimée, catégorie, équipe, exécutant/assignés, équipement, numéro de série, localisation, site et identité/légal de la société. Chaque valeur est produite côté serveur uniquement si sa clé est dans l’allowlist; les champs non demandés ne sont pas renvoyés. La société et `canBeViewedBy` sont vérifiés avant résolution. Les clés envoyées ne sont jamais interprétées comme expressions Thymeleaf, chemins d’objet, SQL ou scripts. À ce stade, signature, champs personnalisés, tâches, commentaires, historique, relations, fichiers et coûts sont marqués non pris en charge et sont refusés par le resolver. Les champs de coûts restent marqués `sensitive`; ce marqueur de catalogue n’est pas une autorisation. Aucune permission distincte « consulter les coûts » n’a été trouvée : ne pas les activer avant décision de politique et contrôle serveur.

## Contrat de migration client

- Web conserve les routes d’aperçu, d’émission, d’historique et téléchargement déjà connectées; aucun changement de navigation n’est nécessaire pour la première intégration.
- Mobile consomme le flux d’aperçu authentifié sans archive, l’émission officielle après confirmation, l’historique et le téléchargement authentifié; son client utilise le `ReportConfig` par défaut du serveur et ne propose pas encore la sélection des sections. Garder l’ancienne route disponible pendant la transition de version; ne pas interpréter une URL signée comme un document officiellement archivé.
- Toute évolution doit être additive : nouveaux DTO/chemins à côté des routes actuelles, puis bascule Web/Mobile, instrumentation d’usage et retrait de l’ancienne route seulement après preuve qu’aucune version supportée ne l’appelle.
- Les appels de téléchargement doivent gérer les réponses non-2xx sans ouvrir une URL arbitraire; l’authentification, le nom de fichier et le type MIME sont validés aux frontières du client.
- L’action d’émission peut actuellement créer plusieurs copies si répétée. Le client doit éviter le double clic; une idempotency key côté serveur ne sera ajoutée qu’avec un contrat explicite.

## Contrôles de sécurité

- Contrôleur : rôle client requis; service : société et permission d’objet. Le lot DOC-01 a introduit une règle d’autorisation dédiée, permettant l’émission par le créateur autorisé d’un WO clôturé sans le rendre modifiable.
- Le téléchargement d’un rapport WO vérifie la société de l’archive puis l’accès actuel au WO; la perte ultérieure d’accès au dossier bloque le téléchargement.
- Le modèle utilisateur audité ne comporte pas d’affectation individuelle à un site; `siteId` de l’archive est une métadonnée. Le cloisonnement est actuellement société + accès objet. Ne pas présenter une isolation utilisateur-site comme existante; si elle est requise, cadrer un chantier sécurité transversal.
- Toute nouvelle route doit vérifier la source métier après résolution serveur, et ne jamais faire confiance à un ID de tenant ou à une liaison de champ fournie par le navigateur.
- Le catalogue n’est qu’une liste descriptive; la route de prévisualisation applique une allowlist serveur indépendante et les autorisations du dossier. Une clé inconnue ou non prise en charge est refusée; le booléen `sensitive` du DTO ne remplace pas ces contrôles.
- DOC-05 ajoute une route d’émission distincte de l’ancien `ReportConfig`, ainsi qu’un aperçu PDF non archivé avant émission. Ces routes ne prennent ni configuration, ni valeurs de champ, ni société du client : le serveur charge la version publiée associée au tenant, valide sa configuration, résout les clés via le provider autorisé, puis rend le PDF. L’émission archive le PDF et l’instantané; l’aperçu ne crée aucun document. Le lien vers la version est protégé contre suppression par FK `RESTRICT`; les anciens appels continuent à suivre l’ancien renderer.
- Avant d’ajouter des rapports PR/PO, vérifier les droits liés aux montants, coûts, fournisseurs et périmètres de site. Les totaux sont des valeurs backend, jamais des calculs client faisant autorité.

## Tests de contrat attendus

- JSON `GeneratedDocumentDTO` partagé et compatibilité avec les clients FR/EN.
- Aperçu ne crée aucune archive; émission crée une archive; téléchargement restitue le PDF authentifié.
- L’émission par template refuse brouillons, templates d’un autre tenant et données non allowlistées; l’archive référence la version publiée exacte et conserve le snapshot de configuration et valeurs.
- Vérification de rôle, créateur/assigné, société et utilisateur dont l’accès source a été retiré. Couvrir une frontière de site uniquement après définition et implémentation d’une politique utilisateur-site, absente du modèle actuel.
- Double soumission (protection client actuelle puis décision sur idempotence serveur), erreur PDF/stockage et historique vide.
- Mobile : session expirée, téléchargement local/partage iOS et Android, réseau hors ligne; Web : ouverture d’aperçu popup et repli téléchargement.

DOC-03 couvre maintenant le nouveau binding HTTP et les contrôles du provider : `GeneratedDocumentControllerTest` (**2**), `WorkOrderReportDataProviderTest` (**3**) et `GeneratedDocumentServiceTest` (**11**) passent ensemble, soit **16 tests, 0 échec**. La recette d’API authentifiée en environnement reste à faire.

### DOC-04 — bibliothèque versionnée (API backend locale)

- `GET /document-templates/types` retourne les types actifs système et société sous forme de DTO.
- `GET /document-templates` retourne uniquement les templates de la société authentifiée.
- `GET /document-templates/{id}/versions` retourne l’historique des versions uniquement si le template appartient à la société courante et que l’utilisateur peut consulter SETTINGS.
- `POST /document-templates/{id}/preview-pdf?workOrderId={id}` rend le brouillon courant ou, en son absence, la version publiée; l’accès SETTINGS, la société et la visibilité du WO sont revérifiés. La réponse est privée/non-cacheable et ne crée aucune archive.
- `POST /document-templates/{id}/preview-data?workOrderId={id}` résout uniquement les champs sélectionnés du brouillon (ou de la dernière version publiée si aucun brouillon n’existe), après validation du provider et du droit de lecture du WO.
- `POST /document-templates` crée un template et le brouillon v1; `PUT /document-templates/{id}` modifie le brouillon ou crée la version suivante.
- `POST /document-templates/{id}/publish?makeDefault=true|false` publie après validation; `POST /document-templates/{id}/archive` archive sans supprimer l’historique.
- Le JSON v1 accepte seulement les propriétés déclaratives prévues (A4/Letter, orientation, marge 5–30 mm, styles/options connus et bindings supportés). Propriétés inconnues ou valeur exécutable sont refusées.
- Gestion réservée au propriétaire de société, à un rôle avec `DOCUMENT_TEMPLATES.view` et `DOCUMENT_TEMPLATES.editOther`, ou à un rôle historique avec `SETTINGS.view` et `SETTINGS.editOther`. Le tenant est dérivé du principal authentifié. Le type système `WORK_ORDER` est seedé par Liquibase et ne peut pas être modifié depuis l’API.
- La base empêche `UPDATE`/`DELETE` des versions publiées. La migration additive a été validée en replay complet sur une base PostgreSQL jetable; les séquences JPA requises ont été incluses après le contrôle Hibernate. Non appliquée à la production. DOC-05 ajoute les routes dédiées et le rendu configurable tout en gardant `ReportConfig` comme fallback.

Le lot ciblé DOC-03/DOC-04 passe (**22 tests, 0 échec**) : provider WO (3), controller DOC-03 (2), service GeneratedDocument (11), validation de configuration (3), isolation/permissions DocumentTemplateService (3). `mvn -o -q -DskipTests compile` réussit. En complément, le changelog complet a été rejoué sur PostgreSQL 16 jetable : les changementsets DOC ont été appliqués, Hibernate `ddl-auto=validate` a réussi et Spring Boot a démarré. Environnement temporaire uniquement; la production n’a pas été modifiée.

## Audit des sources Demandes et Achats — DOC-03

- **Demande de maintenance (`Request`)** : ce n’est pas une demande d’achat. Elle hérite des champs `WorkOrderBase` (titre, description, priorité, échéances, équipement, localisation, équipe, pièces jointes et champs personnalisés) et ajoute notamment `customId`, `contact`, `requestPortal`, `audioDescription`, `cancellationReason`, `cancelled` et le WO créé après approbation. DOC-07 fournit un catalogue et une allowlist non financière, un aperçu PDF sans archive, l’émission depuis un template publié, l’historique et le téléchargement authentifié. Les droits revalident tenant + visibilité de la demande; l’émission exige aussi le droit d’édition existant. Audio, fichiers, champs personnalisés, motif d’annulation et WO lié ne sont pas exposés. L’approbation et la création d’un WO ne sont jamais appelées par le rendu.
- **Commande d’achat (`PurchaseOrder`)** : c’est l’objet achats existant; aucun modèle distinct « Purchase Request / PR » n’a été trouvé. Il expose fournisseur, catégorie, statut d’approbation, échéance d’expédition, destinataire/adresse, requisitionnaire, conditions et notes. Les lignes sont des `PartQuantity` rattachées à la commande; `PurchaseOrderController.getById` réutilise `canBeViewedBy` et remplit ces lignes. Le DTO de ligne (`PartQuantityShowDTO`) embarque un `PartMiniDTO` dont le coût est présent; le Web calcule actuellement le total dans la grille (`PurchaseOrders/index.tsx`). Pour un PDF, recalculer le total côté serveur et ne jamais reprendre un total fourni par le client. Le statut et les actions `respond`/réception relèvent du workflow métier et ne doivent pas être déclenchés par l’impression.
- **Droits et périmètre** : `Request.canBeViewedBy` utilise `REQUESTS.view` plus `viewOther`, créateur ou assigné. `PurchaseOrder.canBeViewedBy` utilise `PURCHASE_ORDERS.view` plus `viewOther` ou créateur. Les deux héritent de `CompanyAudit`; l’isolation site individuelle n’existe pas dans les modèles audités. La lecture de coûts d’achat est actuellement déjà présente dans le DTO de détail PO et consommée par le Web; aucune permission distincte « coût » n’a été trouvée. Ce constat ne justifie pas d’élargir un nouveau provider : reprendre exactement l’autorisation de source, et faire valider une politique de coût dédiée avant d’introduire des champs financiers configurables.

### Autorisations de la bibliothèque de rapports

- Le menu expose **Gestion des rapports** vers `/app/settings/documents`; les utilisateurs historiques ayant `SETTINGS.view` la voient toujours. Les rôles peuvent maintenant recevoir `DOCUMENT_TEMPLATES` séparément, avec `view` pour consulter, `create` pour créer/copier et `editOther` pour modifier, publier et archiver.
- Le layout Paramètres autorise un rôle ayant seulement `DOCUMENT_TEMPLATES.view` à ouvrir exclusivement la bibliothèque de modèles; il ne lui donne pas accès aux autres écrans Paramètres. Les appels API vérifient les mêmes droits et gardent le scope de société. La permission Settings historique reste un chemin compatible.
- La nouvelle valeur d’enum est ajoutée en dernier afin de ne pas déplacer les ordinales persistées existantes. Les rôles par défaut non administrateurs ne reçoivent pas ce droit implicitement; l’administrateur peut l’attribuer dans la matrice des rôles.
- **Conséquence d’implémentation** : le provider et le cycle PDF `Request` sont livrés localement. `PurchaseOrder` reste un provider séparé avec lignes explicitement typées et total calculé côté serveur, après décision sur les droits de consultation des montants. Nommer le document « demande d’achat » seulement si le produit ajoute réellement un modèle PR; ne pas confondre une `Request` d’intervention et une PR.

## Décisions encore ouvertes avant DOC-03/04

- Créer éventuellement une autorité nommée `DOCUMENT_GENERATE` pour distinguer l’émission des permissions WO actuelles : DOC-01 conserve provisoirement le périmètre existant (`WORK_ORDERS.view` + `editOther`, créateur ou assigné). Ne pas élargir aux simples lecteurs sans décision produit/sécurité.
- Tester l’ouverture locale du PDF sur appareils Android et iOS et valider le repli de partage/ouverture selon les applications disponibles; le type MIME et le stockage privé sont contrôlés par le client, mais cette session n’inclut pas de test physique.
- Besoin réel de types personnalisés et de designer complet, comparé à des variantes de templates configurables existantes.
- Champs personnalisés : stockage, validation, droits et limites. Ne pas permettre de SQL, scripts ou chargement URL.
- Compatibilité/licence iText avec la distribution QPM et la licence AGPL du dépôt.
- Conservation, suppression, sauvegarde et accès des archives dans le stockage existant.
- Seuils mesurés de temps/mémoire avant d’introduire une file durable/worker isolé.

### DOC-07 — provider Request v1 (historique, remplacé par v2) — 22 octobre 2026

- Routes ajoutées : `GET /requests/{id}/report/fields` et `POST /requests/{id}/report/preview-data`. Elles utilisent l’utilisateur authentifié, vérifient l’entreprise puis `Request.canBeViewedBy`, et renvoient uniquement les valeurs demandées. Une demande d’une autre entreprise est traitée comme introuvable.
- L’allowlist couvre l’identifiant, titre, description, priorité, échéance, durée estimée, contact, indicateur d’annulation, équipement, numéro de série, localisation, équipe, site et identité légale de l’entreprise. Audio, pièces jointes, champs personnalisés, motif d’annulation, identifiants de personnes, coûts et WO lié restent exclus.
- À cette étape, le provider n’émettait pas encore de PDF. Cette limite a été levée par l’incrément v2 ci-dessous.
- Validation de cette étape historique : **28 tests, 0 échec/erreur** (7 contrôleur, 19 service, 2 provider).

### DOC-07 — cycle de rapport PDF Request v2 — 22 octobre 2026

- Le registre système reçoit le type `REQUEST` / provider `REQUEST` par le changementset additif `2026_10_22_document_templates_4_seed_request_type`. La bibliothèque Paramètres → Modèles de documents permet de créer et gérer un template Request avec le même moteur validé, les mêmes versions publiées immuables et les champs Request allowlistés. Le formulaire de template continue aussi de gérer `WORK_ORDER`.
- Le détail de demande propose un dialogue de rapport : choisir un template publié, ouvrir un aperçu PDF privé sans archivage, émettre une archive à partir de la version publiée, consulter l’historique et télécharger chaque PDF. Le chemin d’émission revalide l’entreprise, la visibilité et le droit d’édition existant; les routes d’aperçu, de liste et de téléchargement revalident la visibilité actuelle. L’émission ne modifie ni le statut de la demande ni la conversion en WO.
- La prévisualisation d’un template Request depuis la bibliothèque utilise un `requestId` autorisé et sélectionne le brouillon courant ou, en l’absence de brouillon, la version publiée. Les réponses PDF sont `private, no-store`. L’archive conserve le hash, le snapshot de rendu et l’identifiant/version exacte du template.
- Validation locale : **38 tests ciblés, 0 échec/erreur** (24 service GeneratedDocument, 9 contrôleur GeneratedDocument, 1 contrôleur DocumentTemplate, 2 provider Request, 2 renderer). Deux tests supplémentaires couvrent le refus d’aperçu et de liste de templates sans visibilité actuelle sur la demande. TypeScript Web, ESLint ciblé et build CRA production passent. Le changelog courant a été appliqué sur une base PostgreSQL 18 temporaire neuve (**849 changesets**); Hibernate `ddl-auto=validate` et le démarrage complet Spring Boot ont réussi. `git diff --check` est propre. La recette visuelle authentifiée reste un contrôle d’acceptation avant déploiement. Aucun déploiement ni changement de données de production.
- Hors périmètre maintenu : rapport `PurchaseOrder` / PR. Une politique métier sur les coûts doit être validée avant exposition, et l’entité existante est un Purchase Order, pas une Purchase Request.

#### Recette d’acceptation Web DOC-07

À effectuer sur un environnement de recette avec un utilisateur authentifié ayant les permissions habituelles de demandes et un template `REQUEST` publié :

1. Ouvrir une demande accessible et vérifier que l’action « Rapport de demande de maintenance » apparaît pour un utilisateur autorisé à la modifier.
2. Ouvrir le dialogue, vérifier le choix du template publié (nom, version, défaut), puis prévisualiser le PDF. L’aperçu doit s’ouvrir sans créer d’entrée d’historique.
3. Émettre le rapport, vérifier le message de succès, une nouvelle entrée d’historique, le hash/version affichés, puis télécharger et ouvrir le PDF.
4. Vérifier le cas sans template publié : l’information d’absence s’affiche et les actions aperçu/émission restent désactivées.
5. Avec un utilisateur qui peut voir mais pas modifier la demande, vérifier l’absence de l’action d’émission et que l’API refuse quand même une émission appelée directement.
6. Avec un utilisateur qui ne peut pas voir la demande, vérifier que l’aperçu, l’historique et le téléchargement sont refusés; retirer ensuite l’accès après émission et confirmer que le téléchargement est refusé à nouveau.
7. Vérifier que l’émission laisse le statut et le lien éventuel vers un OT inchangés, et que les libellés Français/Anglais sont corrects.

Preuve locale de l’obstacle à la recette : `/snap/bin/chromium --version` retourne `snap-confine ... Refusing to continue`; les outils de navigateur disponibles ne trouvent pas d’exécutable Chromium/Chrome exploitable. La recette reste donc une action d’acceptation sur un navigateur/environnement de recette autorisé, pas un échec du test applicatif.
