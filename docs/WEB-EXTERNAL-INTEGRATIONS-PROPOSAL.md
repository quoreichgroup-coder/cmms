# Proposition — QPM Integration Hub Web

**Date de recherche : 17 octobre 2026**  
**Périmètre :** proposition produit/UX et architecture cible. Aucune connexion fournisseur, API, donnée ou règle métier n'est modifiée dans cette phase.

## Tranche Web implémentée — 17 octobre 2026

La page Connecteurs est devenue un Integration Hub qui sépare les recettes de flux externes des outils QPM existants. Un assistant en trois étapes fournit des instructions Power Automate/Teams ou n8n, conduit vers les routes QPM réelles de configuration Webhooks et Clés API, puis explique comment vérifier l'exécution dans l'outil externe. Le guide n'affiche aucun état de connexion ni de livraison prétendument vérifiée.

Le guide rappelle d'utiliser une clé dédiée avec droits minimaux, de garder les secrets dans le système externe, et que QPM ne fournit pas encore de journal de livraison durable ni de retry/replay dans l'interface. SAP EAM et Microsoft/Google Calendar restent explicitement des capacités futures qui demandent un backend; aucun contrat API ni fournisseur n'a été ajouté dans cette tranche. Sources officielles de configuration des recettes : [Microsoft Teams Incoming Webhook](https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook) et [n8n Webhook node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/).

## Ce qui existe réellement dans QPM

Dans `frontend/src/content/own/Settings/Integrations/Connectors.tsx`, l'écran Connecteurs présente des liens vers deux outils QPM déjà disponibles : les clés API et les abonnements Webhook. Ce ne sont pas des connexions prêtes à SAP, Microsoft 365, Google, n8n ou Power Automate. Les écrans clés API et Webhooks consomment les fonctions API existantes.

Le backend expose la gestion des clés et abonnements (`ApiKeyController`, `WebhookEndpointController`). Les événements métier sont expédiés par `WebhookDispatchService` en tâche asynchrone, signés HMAC-SHA256; les endpoints sont validés contre les URL risquées. Le code garde le dernier `lastTriggeredAt`, mais n'expose pas de journal de livraisons, de file de reprise ou de rejeu administrable. L'écran ne doit donc pas afficher un faux état « connecté », une durée de synchronisation ou une action « réessayer » pour ces capacités absentes.

**Précision de sécurité confirmée par le code :** la clé API authentifie l’utilisateur propriétaire (`ApiKeyAuthFilter` reprend ses autorités Spring); les clés ne définissent pas de scopes propres. Le HMAC webhook est calculé sur le corps JSON uniquement; `X-Webhook-Timestamp` et `X-Webhook-Id` ne sont pas signés. Consulter [la recherche approfondie et les actions de backlog](WEB-INTEGRATIONS-DEEP-RESEARCH.md) avant de connecter un flux à une action métier.

Le formulaire Web de création d’abonnement exclut maintenant les quatre événements présents dans l’enum mais sans appel backend de distribution (`NEW_PURCHASE_ORDER`, `PURCHASE_ORDER_CHANGE`, `PURCHASE_ORDER_STATUS_CHANGE`, `WORK_ORDER_OVERDUE`). Les DTO restent inchangés pour conserver la compatibilité avec d’éventuelles configurations existantes.

## Recherche externe et implications

| Référence vérifiée | Capacité utile pour QPM | Conséquence de conception |
| --- | --- | --- |
| [SAP S/4HANA — Maintenance Order API v2](https://help.sap.com/docs/SAP_S4HANA_CLOUD/f9ba73d1b8c543c2bd2ba1666271af86/c1457e0e539740a29932fbdcf36fea3c.html?locale=en-US&state=PRODUCTION&version=LATEST) | API OData v2 pour lire, créer, modifier et supprimer des données d'ordre de maintenance. | Un connecteur SAP doit afficher le système/tenant, la société/site, la version d'API et le sens de synchronisation; la simple URL d'un webhook ne suffit pas. |
| [SAP S/4HANA — Equipment API](https://help.sap.com/docs/SAP_S4HANA_CLOUD/f9ba73d1b8c543c2bd2ba1666271af86/8ffe7c063141444489f7ac2d07f4b934.html) | API OData pour équipements, installation/démontage et pièces jointes. | Proposer d'abord un aperçu de correspondance équipement/localisation et de doublons avant toute écriture. |
| [Microsoft Power Platform — connecteurs](https://learn.microsoft.com/en-us/connectors/overview) et [connecteurs personnalisés](https://learn.microsoft.com/power-automate/developer/register-custom-api) | Connecteurs prédéfinis ou sur mesure; les connecteurs personnalisés peuvent être générés depuis OpenAPI ou créés avec des actions et déclencheurs spécifiques. | QPM peut commencer par publier une spécification OpenAPI propre et des recettes de flux, puis envisager un connecteur certifié après stabilisation des contrats. |
| [Microsoft Teams — Webhooks entrants et Workflows](https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook) | Les Workflows Teams acceptent des webhooks entrants et peuvent poster des cartes; Microsoft indique que les anciens Microsoft 365 Connectors sont en voie de retrait au profit des Workflows. | Le premier parcours Teams doit utiliser Power Automate/Workflows, pas construire une intégration sur les anciens Connectors. |
| [Microsoft Graph — création d'événements calendrier](https://learn.microsoft.com/en-us/graph/api/calendar-post-events?tabs=http&view=graph-rest-1.0) | Créer un événement dans un calendrier utilisateur ou groupe; les droits dépendent du type de calendrier et du mode délégué/application. | Une synchronisation calendrier demande OAuth et consentement serveur; le navigateur ne doit jamais porter le secret applicatif Graph. |
| [Google Calendar — notifications push](https://developers.google.com/workspace/calendar/api/guides/push) et [synchronisation incrémentale](https://developers.google.com/workspace/calendar/api/guides/sync) | Notifications webhook HTTPS par canal, expiration à gérer; synchronisation par `syncToken`, avec resynchronisation complète si le token est invalidé. | Une intégration calendrier fiable nécessite renouvellement des canaux, curseurs de sync et reprise; une simple importation ponctuelle ne constitue pas une synchronisation. |

## Direction proposée : QPM Integration Hub

Transformer Paramètres → Intégrations en un poste de pilotage, distinct des outils développeur. La page d'accueil explique d'abord les flux possibles et sépare clairement : **Outils API QPM** (clés et webhooks déjà disponibles), **Connecteurs directs** (fournisseurs à connecter), **Automatisation externe** (Power Automate/Workflows, n8n et systèmes similaires).

Chaque carte fournisseur doit montrer honnêtement son état : « Disponible via recette », « Connecteur QPM à venir », « Connecté », « Action requise » ou « Suspendu ». Les seuls états connectés doivent provenir d'une configuration persistée et vérifiée. Les cartes afficheront également le sens (QPM → outil, outil → QPM, bidirectionnel), les objets concernés, le propriétaire fonctionnel, les derniers événements uniquement si le backend les conserve, et les droits requis.

Un parcours de configuration guidé comportera : choix du fournisseur et de l'environnement → choix des données et du sens du flux → authentification côté serveur → association société/site → correspondance des identifiants et champs → aperçu/dry-run → validation puis activation. L'aperçu met en évidence les enregistrements sans correspondance et les conflits avant écriture. Aucun secret OAuth ni clé n'est rendu à nouveau après création.

La différenciation QPM proposée est un **contrat de données maintenance prêt à tester** : modèles de flux par opération (nouvel OT, changement de statut, équipement, stock), filtres par site et catégorie, aperçu de la donnée expurgée, et test d'événement avec résultat lisible par un responsable maintenance. Les statuts sensibles (approbation, clôture/TECO, annulation) ne sont jamais synchronisés en écriture sans règle de propriété explicite et confirmation dédiée.

## Fournisseurs à prioriser

1. **n8n auto-hébergé et recettes génériques webhook/API.** Premier pilote recommandé si l’équipe opère déjà n8n : ses nœuds Webhook et HTTP Request peuvent recevoir et appeler des API REST avec des credentials. La recette doit vérifier le HMAC QPM avant toute publication ou action; commencer par une notification seule.
2. **Power Automate / Teams Workflows via les capacités actuelles.** Workflows peut recevoir un webhook HTTP et publier un message ou une carte; le flux doit valider la signature QPM, et une notification ne doit pas approuver ni clôturer l’OT. Prévoir des co-propriétaires, car les Workflows sont liés à leurs propriétaires. Ne pas baser un nouveau flux sur les anciens Microsoft 365 Connectors en voie de retrait.
3. **SAP S/4HANA EAM/PM.** Connecteur direct à forte valeur entreprise, mais chantier séparé : authentification et secrets serveur, sélection du système/mandant/plant, mapping Equipment/Functional Location/Maintenance Order, identifiants externes stables, gestion ETag/version, rapprochement, reprise et audit. Commencer en lecture/aperçu, puis écrire uniquement des objets approuvés après tests d'intégration.
4. **Microsoft 365 Calendar, puis Google Calendar.** Cas d'usage : publier les interventions planifiées d'un technicien ou d'une équipe. Commencer par un flux sortant en lecture seule; une synchronisation bidirectionnelle est un chantier distinct avec OAuth, déduplication, révocation/expiration et conflits.

Ne pas commencer par un grand catalogue de logos. Les connecteurs réels doivent être livrés avec un parcours testé, une politique de permissions, un propriétaire des données et une méthode de reprise.

## Centre de santé des flux — phase suivante

Une expérience différenciante serait une page « Activité des intégrations » regroupant chaque tentative avec heure, fournisseur, objet QPM, identifiant de corrélation, résultat, réponse expurgée, latence et prochain essai. Actions : désactiver le flux, corriger la configuration, tester, rejouer un événement idempotent et exporter le journal. Cette expérience dépend d'un journal de livraison durable, d'une file de retry avec backoff, d'une idempotence, d'une politique de rétention et de permissions backend. Le backend actuel ne fournit pas ce socle; il faut donc afficher ce volet comme une capacité future et ne pas simuler ses états.

## Découpage d'implémentation recommandé

| Phase | Résultat | Changements frontend | Dépendances backend |
| --- | --- | --- | --- |
| A — Catalogue vrai | Écran qui distingue API/Webhooks existants des intégrations externes à venir; recettes Power Automate/n8n ciblées. | UX seulement; documentation exportable, navigation vers outils existants, états explicitement « à configurer ». | Aucun changement de contrat pour les recettes qui utilisent les API/Webhooks déjà présents. |
| B — Connecteur calendrier sortant | Autorisation et préférences par utilisateur; événement QPM vers calendrier externe. | Assistant OAuth et choix des flux/scope. | OAuth server-side, stockage chiffré, job sync et révocation. |
| C — SAP en lecture/aperçu | Comparaison équipement/OT QPM avec SAP avant import ou rapprochement. | Assistant, mapping visuel, écran de validation des écarts. | Adaptateur SAP/OData, secrets, mapping, pagination, ETag et audit. |
| D — Synchronisation contrôlée | Écritures permises par objet et propriétaire; conflits consultables. | Matrice de propriété et file de conflits/erreurs. | Queue fiable, idempotence, retry/replay, journal d'audit, séparation par société/site, politique de rétention. |

## Décisions à prendre avant d'activer un connecteur direct

- Quel système possède la vérité pour chaque objet : QPM, SAP, ou règle par champ?
- Est-ce que le premier pilote SAP est limité à lecture et aperçu, sans écriture?
- Pour les calendriers, les événements appartiennent-ils au technicien, à l'équipe ou à un calendrier partagé de société?
- Qui peut connecter/révoquer une intégration et consulter le journal : administrateur société, gestionnaire de site ou rôle API dédié?
- Quelle disponibilité et quelle politique de rétention exige-t-on pour les événements en échec?

**Conclusion :** rendre l'onglet Connecteurs plus riche visuellement ne suffit pas. Les capacités réelles aujourd'hui sont API keys et webhooks; l'innovation utile est un Integration Hub qui fait évoluer ces primitives vers des recettes de maintenance prêtes à tester, puis vers des connecteurs directs avec synchronisation contrôlée et traçable. Toute intégration SAP/Graph directe implique un nouveau travail backend, séparé du redesign React et à autoriser explicitement.
