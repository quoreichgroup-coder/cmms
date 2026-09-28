# Pilote minier — convoyeur

## But

Configurer un convoyeur dans QPM et suivre une intervention corrective de bout en bout avec les fonctions existantes. Le profil « Mines » identifie le secteur de l’entreprise ; il ne crée pas encore de réglages automatiques.

## Configuration de départ

1. Dans les paramètres de l’entreprise, choisir le secteur « Mines ».
2. Représenter les emplacements avec la hiérarchie des lieux existante (par exemple le site, la zone de traitement et l’atelier, selon l’organisation du client).
3. Créer la catégorie d’équipement « Convoyeur », puis enregistrer le convoyeur avec son identifiant, son emplacement, son état et les informations constructeur disponibles.
4. Utiliser la relation parent-enfant des équipements seulement si l’entreprise veut suivre séparément des composants comme l’entraînement ou le réducteur.
5. Si un compteur existe, associer au convoyeur un compteur avec l’unité réellement utilisée par le site. Les relevés et les déclencheurs d’ordre au seuil sont déjà pris en charge ; ils sont configurés séparément d’une maintenance préventive calendaire.
6. Créer une demande ou un ordre de travail lié au convoyeur ; affecter l’équipe, planifier les tâches, enregistrer le temps et les pièces utilisées, puis clôturer et conserver l’historique.

## Champs spécifiques éventuels

Les champs personnalisés d’équipement sont déjà configurables dans **Paramètres → Fonctionnalités → Équipements → Champs personnalisés** et sont disponibles dans les formulaires de création et de modification des équipements. Il n’est donc pas nécessaire d’ajouter des champs propres aux mines au modèle commun.

Avant de les créer, confirmer avec le site le libellé, le type de donnée, l’unité ou le format attendu et le caractère obligatoire. Exemples à examiner : code de ligne, longueur ou largeur de bande, type de bande et moteur associé. Les laisser facultatifs si la donnée ne concerne pas tous les sites. L’unité du compteur reste le champ standard du compteur ; ne pas la dupliquer comme champ d’équipement sans besoin confirmé.

Pour un convoyeur à bande, une fiche technique fabricant consultée donne comme caractéristiques possibles la longueur totale, la largeur, la résistance à la traction, le nombre de plis ou de câbles, l’épaisseur des revêtements supérieur et inférieur, la qualité du revêtement, l’épaisseur de la bande et le matériau de carcasse. Ce sont des candidats à valider selon les usages de maintenance du site, pas un formulaire obligatoire universel. Réutiliser l’identifiant standard de l’équipement pour le code d’actif ; si le moteur est suivi comme équipement, préférer la relation parent-enfant à un champ texte libre.

La norme ISO 14224 est centrée sur les industries pétrolière, gazière et pétrochimique ; son découpage en données équipement, défaillances et maintenance constitue un repère de structuration, pas une exigence normative à imposer à un site minier.

## Repères inspirés de SAP PM, adaptés à QPM

On retient de SAP PM les notions qui rendent le suivi industriel plus lisible, sans reproduire ses transactions ni sa complexité :

- **Objet technique** : le convoyeur est l’équipement suivi ; son emplacement et ses éventuels sous-équipements décrivent où il se trouve et de quoi il est composé. QPM fournit déjà les équipements, les emplacements hiérarchiques et la relation parent-enfant.
- **Signalement puis intervention** : la demande décrit le symptôme constaté ; l’ordre de travail porte l’affectation et l’exécution. Le parcours pilote doit garder ce lien visible et l’historique consultable depuis l’équipement.
- **Opérations répétables** : les tâches et checklists peuvent servir de trame réutilisable lorsque la fonction est disponible dans l’offre du client. La trame doit être validée par le site et ne pas remplacer ses procédures de sécurité.
- **Compteurs** : les relevés donnent le contexte d’usage et peuvent déclencher un ordre selon un seuil configuré. Ils ne constituent pas, dans le fonctionnement actuel, une périodicité préventive exprimée en heures ou en cycles.

Pour l’expérience terrain, la fiche convoyeur devrait permettre de retrouver rapidement son emplacement, son état, ses demandes et ordres récents, ses relevés de compteur et ses pièces liées. La vue d’ensemble de l’équipement rassemble maintenant ses informations clés, ses ordres récents, ses sous-équipements directs, un aperçu des arrêts, les échéances de maintenance préventive et les pièces liées et jusqu’à quatre compteurs avec leur dernier relevé et la prochaine date de relevé. Les compteurs apparaissent selon les droits et les fonctionnalités disponibles pour l’organisation. Les onglets permettent de consulter les listes complètes. Les demandes liées sont consultables par pages de quatre, avec leur statut et un lien vers l’ordre associé, selon les droits de consultation. Une liste des quatre premières pièces liées permet aussi d’accéder à leurs fiches ; elle ne représente pas une quantité en stock.

## Entretien préventif et sécurité

Les maintenances préventives récurrentes suivent actuellement une date planifiée ou une date d’achèvement. La fréquence minimale entre deux relevés d’un même compteur est un autre réglage (en jours, appliqué selon le fuseau horaire de l’entreprise) ; ce n’est pas une échéance de maintenance.

Un déclencheur distinct compare chaque nouveau relevé au seuil configuré : `MORE_THAN` ne correspond que si le relevé est strictement supérieur, et `LESS_THAN` seulement s’il est strictement inférieur (l’égalité ne déclenche pas). À l’état actuel du code, chaque relevé qui reste du côté déclencheur crée un nouvel ordre de travail. Les propriétés API `recurrent` et `waitBefore` ne sont pas appliquées par ce traitement. Il faut donc éviter de présenter le comportement comme « un seul ordre au franchissement », et confirmer la règle de répétition avant tout usage opérationnel. Les modifications de relevés réévaluent aussi les déclencheurs.

Le contenu des inspections, les périodicités, les seuils, la règle de répétition et les critères d’arrêt doivent venir de la documentation de l’équipement et des procédures validées du site. QPM ne doit pas imposer une consigne de consignation ou une séquence de sécurité générique.

### Contrôles du pilote — champs et compteurs

- Configurer d’abord les champs d’équipement confirmés comme facultatifs, puis créer et modifier un convoyeur pour vérifier leur affichage et la conservation des valeurs.
- Vérifier que l’unité standard du compteur et sa fréquence minimale de relevé en jours correspondent à la pratique du site. La fréquence limite la saisie des relevés ; elle ne planifie pas un ordre de maintenance.
- Pour un plan préventif, vérifier séparément la récurrence calendaire selon la date planifiée ou la date d’achèvement, ainsi que les plans désactivés et la prochaine échéance affichée.
- En environnement de test, vérifier un seuil `MORE_THAN` avec une valeur en dessous, exactement égale et au-dessus ; répéter pour `LESS_THAN`. Seuls les cas strictement au-dessus ou au-dessous doivent déclencher.
- Faire deux relevés successifs du même côté du seuil et modifier un relevé déjà enregistré : le comportement actuel peut créer un ordre à chaque évaluation. Ne pas tester ceci sur des données de production.
- Traiter la répétition et le délai avant action comme des décisions ouvertes : les propriétés `recurrent` et `waitBefore` ne sont pas prises en compte par la génération d’ordres actuelle.
- Sans le forfait des compteurs, vérifier que la synthèse affiche l’information d’upgrade sans appeler les API de relevés ; avec le forfait, vérifier l’affichage normal. Sans la licence `CONDITION_BASED_PM`, le déclencheur doit rester consultable, afficher la demande de licence au propriétaire et ne proposer ni création ni modification.

### Sources consultées

- [ISO 14224:2016 — périmètre et catégories de données de fiabilité et maintenance](https://www.iso.org/standard/64076.html).
- [Fenner Dunlop — exemple de fiche d’inspection d’une bande en service](https://www.fennerdunlopemea.com/app/uploads/2021_November_Quality-matters.-DCI.pdf), pour les dimensions et caractéristiques de carcasse/revêtements.
- [SAP Help — compteurs et maintenance basée sur la performance](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/f7d969cde600466b96094e772632c3f3/bfa7ce5314894208e10000000a174cb4.html).
- [SAP Help — structure des documents de relevé](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/21aead0c98bd4755abdacd91c99e3393/726cb65334e6b54ce10000000a174cb4.html), notamment compteur/unité, valeur horodatée et employé ayant effectué le relevé.

## Scénario pilote à valider

- Le demandeur identifie le convoyeur et décrit le problème observé.
- Le responsable affecte la demande à l’équipe compétente et précise l’échéance selon les règles du site.
- Le technicien documente le diagnostic, le travail réalisé, les pièces et la durée d’arrêt si l’entreprise souhaite la suivre.
- Le responsable clôt l’ordre de travail après vérification selon la procédure du site.

La prochaine personnalisation du formulaire dépendra des pratiques confirmées : identifiant des convoyeurs, structure des emplacements, unité de compteur et informations requises à la clôture.


## Vérification de la synthèse équipement

- Ouvrir un équipement depuis la liste : la vue d’ensemble doit être sélectionnée.
- Vérifier les liens vers l’emplacement, l’équipement parent et les ordres récents.
- Avec les droits compteurs, vérifier les valeurs, unités et dates ; une valeur nulle doit rester affichée comme `0`.
- Vérifier un équipement sans compteur et un compteur sans relevé : les messages doivent distinguer ces deux situations.
- Contrôler les états de chargement et d’erreur réseau, puis le bouton Réessayer de la liste des compteurs.
- Vérifier la lisibilité sur mobile et la navigation au clavier.

## Fonctions affichant une demande de mise à niveau

Le socle comprend déjà des contrôles de disponibilité pour les compteurs, les checklists, les fichiers, les achats, les analyses, les rôles personnalisés, les workflows, les imports CSV, la planification des ressources et certaines options des interventions (temps, coûts, signature). Les portails de demandes et les intégrations API disposent également de contrôles dédiés.

Ces fonctions font partie des points à examiner pour le pilote. Leur présence dans le code ne signifie pas qu’elles sont actives pour l’organisation courante. Pour chaque besoin confirmé, vérifier ensemble le parcours utilisateur, la disponibilité côté serveur et les droits du rôle ; ne pas se limiter à masquer le message de mise à niveau dans l’interface. Les fonctions du forfait et les entitlements de licence sont deux contrôles distincts : vérifier aussi `/api/license/state`. Pour les tests automatisés, couvrir les deux résultats d’entitlement ; pour un test visuel de bout en bout, utiliser une licence de test ou staging valide.


### Demandes et pièces dans la vue d’ensemble

- Tester un équipement avec des demandes en attente, approuvées et rejetées : les statuts doivent correspondre à la liste des demandes.
- Avec plus de quatre demandes, parcourir les pages et vérifier que seules les demandes de cet équipement apparaissent.
- Ouvrir une demande approuvée puis l’ordre associé ; vérifier le parcours avec un rôle limité à ses propres demandes.
- Changer d’équipement pendant un chargement : aucune réponse de l’ancien équipement ne doit apparaître dans le nouveau.
- Vérifier les liens des pièces et le message d’absence de pièces. Les quantités de stock restent consultables depuis les fiches des pièces.

- Si le convoyeur a des sous-équipements, confirmer que seules les relations directes sont listées et que l’ouverture d’un sous-équipement charge sa propre fiche.

- Vérifier l’état « Arrêt en cours » pour un arrêt dont la durée atteint l’heure actuelle, et l’état « En fonctionnement » lorsqu’aucun arrêt n’est actif.
- Comparer la durée cumulée et les quatre derniers événements à l’historique complet des arrêts.

- Avec un rôle autorisé et une offre incluant le préventif, confirmer que les plans désactivés sont ignorés et que les prochaines échéances actives s’affichent dans l’ordre chronologique.
- Sans la fonction dans le forfait, vérifier le message de mise à niveau et que le bouton n’apparaît que pour le propriétaire de l’organisation.

- Depuis la vue d’ensemble, utiliser « Planifier » : le formulaire de maintenance préventive doit s’ouvrir avec le convoyeur sélectionné. Répéter après un rechargement direct de l’écran pour vérifier le chargement de l’équipement avant l’ouverture.

- Dans la synthèse, vérifier que les documents ne sont visibles qu’avec les droits fichiers et le forfait correspondant ; l’aperçu propose la mise à niveau sans exposer les liens lorsqu’elle manque.

- Pour un parent comportant plus de cinq enfants directs, charger les pages suivantes dans la fiche et vérifier qu’aucun enfant n’est répété ou omis.
