# Orientation produit — QPM

## Direction

QPM est le nom de travail de notre version de la GMAO. La première adaptation cible les équipes de maintenance des mines. Le BTP est la deuxième étape, après validation du parcours minier. Le socle restera réutilisable dans d’autres secteurs.

L’application utilise désormais le nom court « QPM » et un symbole généré autour d’un convoyeur minier. Cette identité reste réversible tant que le nom définitif et la charte de l’entreprise ne sont pas validés.

Le produit s’appuie sur les fonctions déjà présentes dans CMMS. Il doit emprunter aux GMAO/EAM et aux grands ERP les bons repères de suivi et de traçabilité, sans reproduire leur lourdeur ni ajouter de validations qui ralentissent les équipes.

## Parcours métier de référence

1. Un utilisateur signale un problème ou crée une intervention planifiée.
2. Le responsable qualifie la demande, choisit sa priorité et l’affecte à une équipe ou à un technicien.
3. L’équipe réalise l’ordre de travail, renseigne les tâches, le temps passé et les pièces utilisées.
4. Le responsable clôt l’intervention ; l’historique de l’équipement et les coûts sont mis à jour.

Ce parcours doit rester compréhensible par un technicien sur mobile et apporter aux responsables une vue claire des retards, des pannes, des coûts et des pièces disponibles.

## Fonctions à privilégier dans le socle existant

- Sites, zones et équipements organisés selon la structure réelle du client.
- Demandes d’intervention et ordres de travail avec affectation, priorité et historique.
- Maintenance préventive et compteurs lorsque le client en a besoin.
- Stock de pièces, seuils et demandes d’achat.
- Utilisateurs, équipes, rôles et permissions simples à comprendre.
- Tableaux de bord utiles au terrain et à la supervision.
- Utilisation mobile pour les techniciens sur chantier ou en site industriel.

## Repères de conception inspirés de SAP PM

QPM peut reprendre les repères SAP PM qui clarifient le travail quotidien : équipement et emplacement bien identifiés, demande de maintenance reliée à l’ordre d’intervention, opérations réutilisables et historique consultable. La fiche équipement doit devenir le point d’entrée pour comprendre l’état d’un actif et retrouver son activité. On privilégie une vue de synthèse au-dessus des données existantes avant d’introduire de nouveaux objets métier ou des circuits d’approbation supplémentaires.

La documentation SAP décrit aussi une vue d’ensemble des actifs qui combine l’exploration de la hiérarchie, les informations clés et les ordres ou demandes ouverts. On s’en sert comme référence pour la future fiche équipement de QPM, en gardant son périmètre plus léger et en réutilisant les onglets et relations déjà présents ([SAP Asset Overview](https://help.sap.com/docs/SAP_S4HANA_CLOUD/2dfa044a255f49e89a3050daf3c61c11/e967ad67b57b499f8c41b8039f9b4c8e.html), [SAP Asset Management — Planning Maintenance Work](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/e72f747389b340229f7fa343975bfa57/41acaa2e02354a10a50dc102f60f8471.html)).

Les maintenances préventives calendaires et les déclencheurs liés aux compteurs sont deux mécanismes distincts dans le socle actuel. Le vocabulaire et l’interface doivent conserver cette distinction pour ne pas laisser croire qu’un plan en heures ou en cycles est déjà pris en charge comme une récurrence calendaire.

On privilégie d’abord la configuration existante (champs personnalisés, préférences et fonctionnalités activables) avant de créer un module métier spécifique.

## Marque et adaptation client

- QPM est un nom de travail ; son développement et sa forme longue restent à définir.
- L’identité visuelle de référence n’est pas encore arrêtée.
- Le nom, le logo, les couleurs, la devise, la langue et les coordonnées d’une entreprise cliente doivent rester des paramètres de déploiement ou d’organisation, et ne pas être inscrits en dur dans les parcours métier.
- Le dépôt officiel dispose de réglages de marque globaux ; le code vérifie un droit de licence pour le nom et les logos personnalisés. Avant d’en faire la solution multi-client, il faudra confirmer le mode de déploiement et vérifier que chaque entreprise puisse bien gérer sa propre identité.

## Garde-fous produit

- Garder un parcours d’intervention court et explicite.
- Rendre les champs spécifiques aux mines ou au BTP configurables quand ils ne sont pas communs à tous les clients.
- Ne pas imposer une hiérarchie d’actifs, une devise, un circuit d’approbation ou un vocabulaire unique à toutes les entreprises.
- Tester chaque adaptation métier avec un scénario de technicien et un scénario de responsable avant de l’étendre.

## Premier terrain pilote : mine

Le premier essai suivra un convoyeur sur un site minier : localisation, signalement ou maintenance planifiée, affectation, travail du technicien, pièces utilisées et clôture. La hiérarchie existante des sites et équipements et les compteurs seront privilégiés quand ils correspondent aux pratiques de l’entreprise. Voir [le cadrage pilote convoyeur](PILOTE-MINE-CONVOYEUR.md).

Le profil « Mines » dans les paramètres sert actuellement à identifier le secteur de l’entreprise ; il n’active pas automatiquement de champs ou de processus miniers. Les besoins de sécurité, d’autorisation d’intervention et d’arrêt d’équipement varient selon les sites et leurs procédures : ils devront être définis avec le client avant toute automatisation.

Le BTP sera cadré après ce premier essai, en réutilisant le même parcours de demande, d’affectation, d’intervention et de clôture, puis en ajoutant uniquement les adaptations nécessaires aux chantiers.
