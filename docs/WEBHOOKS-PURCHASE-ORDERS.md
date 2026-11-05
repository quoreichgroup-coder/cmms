# Contrat des webhooks de bons de commande

Cette note décrit les événements PO durables actuellement émis par QPM. Elle reflète l’implémentation et ne s’applique pas aux événements d’autres modules, qui utilisent encore leur chemin de livraison distinct.

## Événements

| `X-Webhook-Event` | Déclencheur | Champs d’événement |
| --- | --- | --- |
| `NEW_PURCHASE_ORDER` | Création du bon de commande | `purchaseOrderId`, `purchaseOrderNumber`, `status` |
| `PURCHASE_ORDER_CHANGE` | Modification d’en-tête ou de lignes | `purchaseOrderId`, `purchaseOrderNumber`, `status` |
| `PURCHASE_ORDER_STATUS_CHANGE` | Changement de statut | `purchaseOrderId`, `purchaseOrderNumber`, `previousStatus`, `status` |

Tous les payloads ajoutent `companyId`, `occurredAt` et `purchaseOrder`. `occurredAt` est l’heure de l’événement enregistrée dans l’outbox, pas l’heure de chaque tentative de livraison. `purchaseOrder` est `null` si la souscription n’active pas la sérialisation du document. Sinon, l’objet inclut actuellement `id`, `number`, `status`, `vendorId` et `categoryId`. Ce snapshot volontairement minimal ne contient ni prix, ni lignes, ni données personnelles.

Exemple de changement de statut (identifiants et date illustratifs) :

```json
{
  "purchaseOrderId": 847,
  "purchaseOrderNumber": "PO-2026-00847",
  "previousStatus": "PENDING",
  "status": "APPROVED",
  "companyId": 12,
  "occurredAt": "2026-11-05T11:30:00.000+00:00",
  "purchaseOrder": {
    "id": 847,
    "number": "PO-2026-00847",
    "status": "APPROVED",
    "vendorId": 91,
    "categoryId": 6
  }
}
```

## Vérifier l’authenticité

QPM envoie une requête `POST` avec `Content-Type: application/json` et les en-têtes :

- `X-Webhook-Signature`: HMAC-SHA256 du corps JSON brut en UTF-8, encodé en hexadécimal minuscule, sans préfixe.
- `X-Webhook-Timestamp`: heure de signature en millisecondes Unix. La signature couvre le corps, pas cet horodatage.
- `X-Webhook-Id`: identifiant stable pour cet événement et ce destinataire; il reste identique lors des tentatives et du rejeu manuel.
- `X-Webhook-Event`: nom de l’événement indiqué dans le tableau.

Calculez la signature sur les octets bruts reçus avant le parsing JSON et comparez-la en temps constant avec la valeur attendue, en utilisant le secret de la souscription. N’appliquez pas de reformatage JSON avant le calcul. L’horodatage peut servir à votre propre politique anti-rejeu, mais il n’est pas signé par QPM dans le contrat actuel.

## Accusé de réception, répétitions et ordre

- Répondez par un statut HTTP `2xx` après avoir accepté l’événement. Les erreurs et statuts non-2xx déclenchent un nouvel essai.
- La livraison est au moins une fois, pas exactement une fois. Dédupliquez durablement sur `X-Webhook-Id` avant d’appliquer vos effets métier.
- Si une même entrée outbox vise plusieurs destinataires et qu’un seul échoue, les destinataires ayant déjà répondu `2xx` peuvent recevoir de nouveau le même événement. L’identifiant de livraison est propre au destinataire, ce qui leur permet de dédupliquer indépendamment.
- QPM réessaie jusqu’à 8 tentatives, avec délais exponentiels à partir de 30 secondes (plafond configuré de 6 heures), puis place l’événement en dead letter. Un administrateur peut le rejouer depuis **Settings → Integrations → Webhooks**.
- Il n’y a pas de garantie d’ordre entre événements distincts. Utilisez le statut courant et votre propre version métier si l’ordre est important.
- La liste des destinataires est prise au moment de l’événement : une souscription créée après coup ne reçoit pas l’historique. Une souscription désactivée au moment d’une tentative est ignorée.

## Rétention

La politique de purge des événements livrés et dead letters n’est pas encore définie. L’outbox ne doit pas être considérée comme une archive métier permanente; le délai de rétention et le traitement des dead letters avant purge restent à décider avec l’exploitation.
