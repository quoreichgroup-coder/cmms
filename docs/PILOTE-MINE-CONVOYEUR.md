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

Ne créer des champs personnalisés qu’après confirmation par l’équipe cliente. Exemples à examiner : code de ligne, longueur ou largeur de bande, type de bande, moteur associé et unité de compteur. Garder les champs facultatifs lorsqu’ils ne sont pas nécessaires à tous les sites.

## Repères inspirés de SAP PM, adaptés à QPM

On retient de SAP PM les notions qui rendent le suivi industriel plus lisible, sans reproduire ses transactions ni sa complexité :

- **Objet technique** : le convoyeur est l’équipement suivi ; son emplacement et ses éventuels sous-équipements décrivent où il se trouve et de quoi il est composé. QPM fournit déjà les équipements, les emplacements hiérarchiques et la relation parent-enfant.
- **Signalement puis intervention** : la demande décrit le symptôme constaté ; l’ordre de travail porte l’affectation et l’exécution. Le parcours pilote doit garder ce lien visible et l’historique consultable depuis l’équipement.
- **Opérations répétables** : les tâches et checklists peuvent servir de trame réutilisable lorsque la fonction est disponible dans l’offre du client. La trame doit être validée par le site et ne pas remplacer ses procédures de sécurité.
- **Compteurs** : les relevés donnent le contexte d’usage et peuvent déclencher un ordre selon un seuil configuré. Ils ne constituent pas, dans le fonctionnement actuel, une périodicité préventive exprimée en heures ou en cycles.

Pour l’expérience terrain, la fiche convoyeur devrait permettre de retrouver rapidement son emplacement, son état, ses demandes et ordres récents, ses relevés de compteur et ses pièces liées. QPM répartit aujourd’hui ces informations entre plusieurs onglets de l’équipement ; les rassembler en une vue de synthèse est une piste d’interface, pas une capacité déjà réalisée.

## Entretien préventif et sécurité

Les maintenances préventives récurrentes suivent actuellement une date planifiée ou une date d’achèvement. Un déclencheur distinct peut créer un ordre à partir d’un relevé qui passe au-dessus ou au-dessous d’un seuil ; valider son comportement et son paramétrage avant de l’utiliser en production. Le contenu des inspections, les périodicités et les critères d’arrêt doivent venir de la documentation de l’équipement et des procédures validées du site. QPM ne doit pas imposer une consigne de consignation ou une séquence de sécurité générique.

## Scénario pilote à valider

- Le demandeur identifie le convoyeur et décrit le problème observé.
- Le responsable affecte la demande à l’équipe compétente et précise l’échéance selon les règles du site.
- Le technicien documente le diagnostic, le travail réalisé, les pièces et la durée d’arrêt si l’entreprise souhaite la suivre.
- Le responsable clôt l’ordre de travail après vérification selon la procédure du site.

La prochaine personnalisation du formulaire dépendra des pratiques confirmées : identifiant des convoyeurs, structure des emplacements, unité de compteur et informations requises à la clôture.
