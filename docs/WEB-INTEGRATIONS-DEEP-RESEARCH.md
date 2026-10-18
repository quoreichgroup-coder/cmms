# Recherche approfondie — intégrations Web QPM

**Recherche vérifiée le 17 octobre 2026**  
**Portée :** améliorer le parcours Web d’intégration à partir des fonctions déjà présentes. Aucun fournisseur n’est connecté pendant cette recherche. Aucun contrat d’API, droit, flux métier ou dépendance applicative n’est modifié.

## Décision produit

Faire évoluer l’onglet Connecteurs en **catalogue de recettes guidées**, et non en faux écran de connexions actives. Pour le premier pilote, privilégier une automatisation sortante, à faible risque, qui notifie une équipe à propos d’un événement QPM. Le meilleur ordre est :

1. Recette n8n auto-hébergé pour recevoir et vérifier les webhooks QPM, puis transformer un événement en notification Teams/e-mail.
2. Recette Power Automate/Teams lorsque le flux comprend une étape de vérification HMAC ou un service de validation approuvé.
3. SAP EAM/PM en lecture et rapprochement d’abord, via le middleware choisi par l’entreprise (SAP Integration Suite si disponible, ou un middleware déjà gouverné), sans écriture automatique de statuts sensibles.

Les clés API et webhooks existants suffisent pour expérimenter des flux externes. Ils ne suffisent pas à fournir une intégration SAP directe, une synchronisation durable, ou une garantie de reprise/audit. Le Hub doit afficher ces frontières et indiquer les prérequis avant de guider vers une configuration.

## Capacités vérifiées dans le dépôt

| Fonction | Preuve dans le dépôt | Conséquence |
| --- | --- | --- |
| Abonnements QPM Webhook filtrables | `api/src/main/java/com/grash/model/WebhookEndpoint.java`, `api/src/main/java/com/grash/model/enums/webhook/WebhookEvent.java`, `frontend/src/models/owns/webhookEndpoint.ts` | Les événements effectivement distribués incluent OT nouveau/modifié/statut, demande, équipement, pièce/quantité, fournisseur, commentaire et localisation. Les quatre constantes `NEW_PURCHASE_ORDER`, `PURCHASE_ORDER_CHANGE`, `PURCHASE_ORDER_STATUS_CHANGE` et `WORK_ORDER_OVERDUE` sont déclarées mais aucun dispatch backend n’a été trouvé. Le formulaire web ne les propose donc plus; les DTO restent compatibles avec les configurations anciennes. |
| Envoi asynchrone signé | `api/src/main/java/com/grash/service/WebhookDispatchService.java` | POST JSON avec `X-Webhook-Signature`, `X-Webhook-Timestamp`, `X-Webhook-Id` et `X-Webhook-Event`; signature HMAC-SHA256 hex calculée sur le JSON exact du corps. |
| Livraison et observabilité | `WebhookDispatchService` met à jour `lastTriggeredAt` après un envoi réussi et journalise les erreurs côté service. Le modèle ne conserve pas de statut, corps/réponse expurgés, tentative, ou file de retry/replay. | L’interface peut montrer la dernière réussite selon le champ existant, mais ne peut pas montrer une santé complète ni proposer un rejeu fiable. |
| Clés QPM | `api/src/main/java/com/grash/model/ApiKey.java`, `ApiKeyService.java`, `ApiKeyAuthFilter.java` | La clé authentifie le `User` propriétaire; les autorités Spring de ce compte sont reprises. La clé a expiration/révocation et suivi d’usage, mais aucun scope indépendant. Une clé ne peut pas être décrite comme « droits minimaux propres à la clé ». |
| Paramètres d’intégration Web | `frontend/src/content/own/Settings/Integrations/Connectors.tsx`, `IntegrationSetupDialog.tsx`, `Webhooks.tsx` | Le Hub propose des guides et des routes d’administration QPM. Il ne dispose pas d’un état de connexion SAP/Microsoft/n8n ni d’un test de livraison serveur. |

### Risque de rejeu à traiter

Le corps est authentifié par HMAC, mais `X-Webhook-Timestamp` et `X-Webhook-Id` sont envoyés hors du calcul de signature. Un consommateur ne peut donc pas, à partir de ces en-têtes seuls, prouver que l’identifiant et l’horodatage correspondent au corps signé ou faire une déduplication résistante à leur altération. Un même couple corps/signature peut aussi être rejoué. Pour des notifications non sensibles, le consommateur doit garder une déduplication locale et ne déclencher aucune action métier irréversible. Avant un connecteur d’écriture ou une exposition plus large, prévoir côté backend une signature sur une représentation canonique incluant l’horodatage, une fenêtre anti-rejeu vérifiable, et un identifiant stable de livraison.

Les clés API héritant du compte utilisateur, créer une clé pour une automatisation augmente la surface d’exposition de tous les endpoints autorisés à ce compte. Avant toute utilisation réelle, déterminer le rôle QPM le plus restreint applicable, utiliser un compte d’intégration dédié si la politique d’identité de l’organisation le permet, appliquer expiration/révocation, et ne jamais copier une clé d’administrateur dans un outil externe. La vraie correction durable est l’ajout de scopes de clé côté API et une autorisation testée endpoint par endpoint; cette évolution est hors du périmètre UI seul.

## Comparaison des options

| Option | Ce qu’elle apporte ici | Limites et risques | Recommandation QPM |
| --- | --- | --- | --- |
| n8n auto-hébergé | Un nœud Webhook reçoit les événements et distingue URL test et production; il accepte une authentification par Basic, Header ou JWT. Le nœud HTTP Request appelle des API REST avec des credentials génériques ou OAuth2. | L’équipe opère l’instance, ses secrets et les journaux. La vérification HMAC du corps QPM doit être construite et testée, et dépend de la possibilité de lire le corps brut. Ne pas afficher « connecté » depuis QPM. | Premier guide technique pour équipes qui disposent déjà de n8n; commencer par notification seule après validation de signature. |
| Power Automate / Teams Workflows | Workflows Teams peut recevoir un webhook HTTP, transformer son contenu et publier une carte ou un message dans un canal. Power Automate accepte aussi des connecteurs personnalisés basés sur OpenAPI. | Le point d’entrée HTTP n’est pas un connecteur QPM. Un webhook entrant Teams direct attend un format de message Teams et ne valide pas à lui seul la signature QPM. Les Workflows sont liés à des propriétaires, et l’abandon du propriétaire est un risque de continuité. Authentification OAuth du trigger HTTP disponible selon déploiement/région, mais QPM envoie actuellement HMAC, pas un jeton Entra. | Montrer une recette sous condition de vérification HMAC, privilégier Workflows aux anciens Microsoft 365 Connectors, prévoir deux propriétaires. |
| SAP S/4HANA EAM/PM | Les API standard `API_EQUIPMENT` et `API_MAINTENANCEORDER;v=2` offrent des opérations OData pour consulter et gérer des données. SAP Integration Suite fournit intégration, gestion des API et options de contrôle d’accès. | Version/déploiement SAP, communication arrangement, OAuth/certificats, société/plant, données étendues, statut phase-control et règles client varient. Les API SAP peuvent créer/modifier des équipements/OT ou changer des statuts. La correspondance d’objets et la propriété des données sont à décider. | Démarrer par import/lecture et aperçu des écarts, puis pilote limité aux objets et champs dont le système maître est défini. Écarter clôture/TECO et écritures destructrices du premier pilote. |
| Microsoft Graph Calendar / Google Calendar | Peut publier un planning attribué à une personne ou une équipe. | Requiert OAuth consentement, gestion de révocation, correspondance identités, conflits, récurrence et resynchronisation; aucune connexion native QPM vérifiée. | Reporter après preuve de valeur; démarrer par export ou flux unidirectionnel, pas par synchronisation bidirectionnelle. |

## Recettes recommandées avec les outils actuels

### A. Notifier un OT nouveau ou modifié (sortant, pilote)

1. Dans QPM, créer un endpoint `NEW_WORK_ORDER` ou `WORK_ORDER_CHANGE`; limiter les champs de l’OT si l’événement le permet. Les événements proposés dans le formulaire ont été comparés aux appels dispatch du backend; les constantes enum non distribuées sont exclues.
2. Utiliser un workflow n8n/Teams de test avant l’URL de production.
3. Avant d’envoyer un message, vérifier HMAC-SHA256 sur les octets exacts du corps et écarter les signatures invalides. L’en-tête d’événement est informatif; comparer aussi l’événement du corps quand disponible, sans supposer un schéma non publié.
4. Dédupliquer côté workflow, filtrer les informations personnelles, puis poster une carte de notification; aucun bouton de carte ne doit clôturer/approuver l’OT.
5. Vérifier une exécution valide, une signature altérée, un événement répété, une erreur distante et le traitement d’un payload minimal.

Les champs exacts du payload sérialisé dépendent de l’entité et de l’option `serialize`; documenter le schéma avec un exemple expurgé issu d’un vrai test QPM avant de publier un modèle importable. Ne pas fabriquer d’exemple de payload.

### B. Alerter sur une demande et laisser la décision dans QPM

1. S’abonner à `NEW_REQUEST` ou `WORK_REQUEST_STATUS_CHANGE` selon l’objectif.
2. Poster une notification vers l’équipe de triage après vérification de la signature.
3. L’approbateur ouvre la demande dans QPM pour approuver/rejeter. Ne pas coder une approbation via une action générique avant de connaître les permissions/contrôles API de ce tenant.

### C. Alerte de stock

1. Utiliser `PART_QUANTITY_CHANGED` et/ou `PART_CHANGE`; vérifier que le flux est filtré sur les références et sites pertinents.
2. Alerter le magasinier; ne pas créer ou recevoir automatiquement une commande lors du premier pilote.
3. Ajouter ensuite une étape d’achat seulement après validation des endpoints, des permissions et de l’idempotence.

### D. SAP, première tranche contrôlée

1. Identifier avant configuration la version SAP (S/4HANA Cloud Public/Private ou On-Premise), le tenant, le plant, et le middleware autorisé.
2. Choisir le maître par objet/champ : équipement, localisation technique, OT, opérations, pièces et statut. Conserver l’identifiant externe SAP et une clé QPM stable; ne pas rapprocher seulement sur le libellé.
3. Lire un échantillon des équipements et OT via les API standard SAP au moyen du middleware et produire un tableau d’aperçu : correspondance certaine, introuvable, doublon, champ conflictuel.
4. N’autoriser les écritures que pour un petit groupe de données après validation métier; conserver les statuts SAP sensibles sous le contrôle de l’outil maître.
5. Tracer `company/site`, identifiant de corrélation, horodatage, résultat et reprise dans un journal durable côté backend/middleware.

## Amélioration du Web Integration Hub

1. Renommer la section actuelle « Automatisations externes » en **Recettes de flux** et afficher pour chaque recette : sens, événements QPM exacts, outil compatible, validation de signature nécessaire, et action humaine attendue.
2. Ajouter une recette en vedette « OT → notification Teams » et « Demande → file de triage », et une recette d’intégration SAP intitulée **Étude de connexion / lecture seule**, sans bouton d’activation.
3. Remplacer les instructions vagues par un parcours concret : choisir événement → créer endpoint QPM → copier le secret une seule fois vers un coffre/credential du middleware → vérifier signature → tester → publier.
4. Corriger l’avertissement de clés : elles héritent des droits du compte, elles n’ont pas de scopes individuels; expliquer le compte d’intégration, expiration et révocation sans promettre une isolation absente.
5. Distinguer « guide disponible » de « opération testée ». Ne montrer une livraison ni une synchronisation que si un futur contrat backend persistant en fournit la preuve.
6. Garder le Hub frontend-only pour cette tranche; consigner séparément les prérequis API de sécurité et d’audit avant tout connecteur direct.

### Tranche UI réalisée après approbation

- Le Hub affiche trois recettes basées sur les événements effectivement distribués : création/changement d’état OT, nouvelle demande/changement de décision, modification de pièce/quantité.
- Chaque recette montre ses événements QPM exacts et mène à l’écran réel de configuration Webhooks; elle précise que la décision et l’action métier restent dans QPM.
- Les descriptions SAP indiquent maintenant que le pilote réalisable avec l’architecture actuelle est lecture/aperçu via un middleware de l’entreprise, et que QPM ne possède pas de connexion directe active.
- Les textes de sécurité du Hub rappellent les limites de scopes des clés API et la validation HMAC exigée du destinataire.
- Vérification ciblée de ces événements contre les appels de dispatch backend. Aucun code API, permission, donnée, schéma ou flux métier n’a été modifié.

## Backlog à ajouter

### P0 — sécurité des intégrations sortantes et API keys

- Authentifier le `timestamp` et l’identifiant de livraison dans la signature; définir la fenêtre anti-rejeu et tests unitaires vérifiant une signature altérée, une ancienne date et un doublon.
- Introduire des scopes de clés API ou un principal d’intégration borné par endpoints, entreprise/site et expiration; tests de contrôle d’accès négatifs.
- Ajouter une politique d’accès réseau/HTTPS pour URL webhook, limites de timeout, tailles et taux; vérifier aussi la résistance SSRF après DNS/résolution et redirections.

### P1 — observabilité et parcours de recette

- Persister les tentatives de livraison, statut HTTP, durée, identifiant corrélé et réponse expurgée; inclure retry avec backoff, idempotence et redrive autorisé.
- Exposer des schémas de payload versionnés et un endpoint de test inoffensif pour produire des exemples réels expurgés.
- Ajouter dans le Hub les recettes en lecture/notification décrites plus haut, sans faux état de connexion.

### P2 — SAP / calendriers

- Spécifier pilote SAP lecture seule, mapping des objets, versions API prises en charge, auth, propriétaire des données, scopes par plant, conflits, audit et procédure de reprise.
- Spécifier calendrier sortant, association technicien/équipe, événements annulés, fréquence, révocation OAuth et resynchronisation.

## Références officielles consultées

- SAP — [API Equipment (API_EQUIPMENT), S/4HANA Cloud](https://help.sap.com/docs/SAP_S4HANA_CLOUD/f9ba73d1b8c543c2bd2ba1666271af86/8ffe7c063141444489f7ac2d07f4b934.html) et [opérations de l’Equipment API](https://help.sap.com/docs/SAP_S4HANA_CLOUD/f9ba73d1b8c543c2bd2ba1666271af86/d1e3c797d3f44120b552d0e64680e445.html).
- SAP — [opérations Maintenance Order API v2](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/9a02a02d849d4b38a7320d94a71d2a22/c5a499aa5b614e53acc235c361aac098.html?locale=en-US), y compris opérations de lecture et actions de statuts.
- SAP — [API Management dans Integration Suite](https://help.sap.com/docs/integration-suite/isuite-integrations-and-apis/api-management) et [options d’authentification inbound](https://help.sap.com/docs/integration-suite/sap-integration-suite/identity-and-access-management-for-cloud-integration?locale=en-US).
- n8n — [Webhook node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/) (URLs test/prod, auth, IP allowlist, réponse) et [HTTP Request node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/) (REST, credentials, OAuth, pagination, statuts de réponse).
- Microsoft — [Teams Workflows et Incoming Webhooks](https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook) (retrait progressif des anciens Connectors, flux liés à leurs propriétaires, limites et Workflows), [sécuriser le trigger HTTP Power Automate avec OAuth](https://learn.microsoft.com/en-us/power-automate/oauth-authentication), [protéger les entrées/sorties sensibles dans l’historique de run](https://learn.microsoft.com/en-us/power-automate/guidance/coding-guidelines/use-secure-inputs-outputs-triggers), [connecteurs personnalisés OpenAPI](https://learn.microsoft.com/en-us/connectors/custom-connectors/define-openapi-definition).

**Conclusion :** l’amélioration immédiate qui respecte les contrats existants est le Hub de recettes et l’accompagnement de configuration, avec n8n/Workflows comme moteurs externes et QPM comme source des événements. Le connecteur SAP direct, le write-back et le statut de santé consolidé dépendent de travaux d’API, de sécurité et de livraison durable; ils ne doivent pas être simulés par le frontend.
