# QPM — contrat d’intégration Documents Web/Mobile

**Statut :** contrat d’intégration de départ, basé sur le code examiné le 21 octobre 2026. Il ne crée pas de nouveau endpoint. Toute nouvelle API ou migration reste à concevoir/tester avant implémentation.

## Fonctionnement actuel vérifié

Les chemins ci-dessous sont des chemins relatifs au préfixe API configuré par le client.

| Intention | Route actuelle | Réponse / effet | Consommateur |
| --- | --- | --- | --- |
| Champs disponibles pour un futur modèle WO | `GET /work-orders/{id}/report/fields` | Descripteurs stables allowlistés (clé, groupe, type, section, répétition, sensibilité); aucune valeur de l’ordre n’est renvoyée | À connecter à la bibliothèque Web après validation des règles de coût |
| Aperçu PDF WO sans archivage | `POST /work-orders/report/{id}/stream` avec `ReportConfig` | Flux `application/pdf`; pas d’objet `GeneratedDocument` créé | Web `ReportConfigModal`; Mobile `WODetailsScreen` via le thunk `getPDFReport` (configuration serveur par défaut) |
| Aperçu historique WO (compatibilité) | `GET /work-orders/report/{id}` | URL de stockage signée; route backend dépréciée conservée pour les anciennes versions | Aucun client Mobile courant après DOC-02; vérifier les versions encore distribuées avant retrait |
| Émettre/archiver un rapport WO | `POST /work-orders/{id}/report/issue` avec `ReportConfig` | `GeneratedDocumentDTO`; PDF rendu puis téléversé et empreinte SHA-256 stockée | Web `ReportConfigModal`; Mobile `WODetailsScreen` (configuration serveur par défaut, confirmation avant émission) |
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

Le catalogue `GET /work-orders/{id}/report/fields` est une métadonnée additive, issue d’une liste de bindings explicites côté serveur. Il ne retourne aucune donnée du WO, ne résout aucun chemin fourni par le client et ne transforme pas encore le PDF existant. Il vérifie d’abord la société et `canBeViewedBy` sur le WO. Les clés représentent des concepts présentés par le rapport actuel (par exemple `workOrder.title`, `asset.name`, `company.legalName`); elles ne sont pas des expressions Thymeleaf. Les champs de pièces, main-d’œuvre et coûts sont marqués `sensitive` et associés à la section `cost`, mais ce marqueur de catalogue n’est pas une autorisation. Le dépôt ne comporte pas de permission distincte « consulter les coûts » : ne pas permettre leur sélection/configuration par ce catalogue avant une décision et un contrôle d’accès dédiés ou la confirmation explicite de la politique métier existante.

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
- Le catalogue n’est qu’une liste descriptive et ne donne pas accès aux valeurs métier. Toute future résolution de champ doit rester sur une allowlist serveur, appliquer les autorisations du dossier et traiter explicitement les champs sensibles; le booléen `sensitive` du DTO ne remplace pas ces contrôles.
- Avant d’ajouter des rapports PR/PO, vérifier les droits liés aux montants, coûts, fournisseurs et périmètres de site. Les totaux sont des valeurs backend, jamais des calculs client faisant autorité.

## Tests de contrat attendus

- JSON `GeneratedDocumentDTO` partagé et compatibilité avec les clients FR/EN.
- Aperçu ne crée aucune archive; émission crée une archive; téléchargement restitue le PDF authentifié.
- Vérification de rôle, créateur/assigné, société et utilisateur dont l’accès source a été retiré. Couvrir une frontière de site uniquement après définition et implémentation d’une politique utilisateur-site, absente du modèle actuel.
- Double soumission (protection client actuelle puis décision sur idempotence serveur), erreur PDF/stockage et historique vide.
- Mobile : session expirée, téléchargement local/partage iOS et Android, réseau hors ligne; Web : ouverture d’aperçu popup et repli téléchargement.

## Audit des sources Demandes et Achats — DOC-03

- **Demande de maintenance (`Request`)** : ce n’est pas une demande d’achat. Elle hérite des champs `WorkOrderBase` (titre, description, priorité, échéances, équipement, localisation, équipe, pièces jointes et champs personnalisés) et ajoute notamment `customId`, `contact`, `requestPortal`, `audioDescription`, `cancellationReason`, `cancelled` et le WO créé après approbation. `RequestService.getById` vérifie `canBeViewedBy`; le modèle `CompanyAudit` bloque aussi le chargement inter-société dans son cycle Hibernate. L’approbation crée un WO, elle ne doit pas être répétée lors de la génération d’un document. Pas de générateur PDF de demande repéré dans les routes ou services audités.
- **Commande d’achat (`PurchaseOrder`)** : c’est l’objet achats existant; aucun modèle distinct « Purchase Request / PR » n’a été trouvé. Il expose fournisseur, catégorie, statut d’approbation, échéance d’expédition, destinataire/adresse, requisitionnaire, conditions et notes. Les lignes sont des `PartQuantity` rattachées à la commande; `PurchaseOrderController.getById` réutilise `canBeViewedBy` et remplit ces lignes. Le DTO de ligne (`PartQuantityShowDTO`) embarque un `PartMiniDTO` dont le coût est présent; le Web calcule actuellement le total dans la grille (`PurchaseOrders/index.tsx`). Pour un PDF, recalculer le total côté serveur et ne jamais reprendre un total fourni par le client. Le statut et les actions `respond`/réception relèvent du workflow métier et ne doivent pas être déclenchés par l’impression.
- **Droits et périmètre** : `Request.canBeViewedBy` utilise `REQUESTS.view` plus `viewOther`, créateur ou assigné. `PurchaseOrder.canBeViewedBy` utilise `PURCHASE_ORDERS.view` plus `viewOther` ou créateur. Les deux héritent de `CompanyAudit`; l’isolation site individuelle n’existe pas dans les modèles audités. La lecture de coûts d’achat est actuellement déjà présente dans le DTO de détail PO et consommée par le Web; aucune permission distincte « coût » n’a été trouvée. Ce constat ne justifie pas d’élargir un nouveau provider : reprendre exactement l’autorisation de source, et faire valider une politique de coût dédiée avant d’introduire des champs financiers configurables.
- **Conséquence d’implémentation** : le prochain provider doit être `Request` (sans effet d’approbation), puis `PurchaseOrder` avec lignes explicitement typées et total calculé côté serveur. Nommer le document « demande d’achat » seulement si le produit ajoute réellement un modèle PR; ne pas confondre une `Request` d’intervention et une PR.

## Décisions encore ouvertes avant DOC-03/04

- Créer éventuellement une autorité nommée `DOCUMENT_GENERATE` pour distinguer l’émission des permissions WO actuelles : DOC-01 conserve provisoirement le périmètre existant (`WORK_ORDERS.view` + `editOther`, créateur ou assigné). Ne pas élargir aux simples lecteurs sans décision produit/sécurité.
- Tester l’ouverture locale du PDF sur appareils Android et iOS et valider le repli de partage/ouverture selon les applications disponibles; le type MIME et le stockage privé sont contrôlés par le client, mais cette session n’inclut pas de test physique.
- Besoin réel de types personnalisés et de designer complet, comparé à des variantes de templates configurables existantes.
- Champs personnalisés : stockage, validation, droits et limites. Ne pas permettre de SQL, scripts ou chargement URL.
- Compatibilité/licence iText avec la distribution QPM et la licence AGPL du dépôt.
- Conservation, suppression, sauvegarde et accès des archives dans le stockage existant.
- Seuils mesurés de temps/mémoire avant d’introduire une file durable/worker isolé.
