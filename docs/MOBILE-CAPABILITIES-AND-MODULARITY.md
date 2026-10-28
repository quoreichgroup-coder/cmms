# Capacités mobiles et activation modulaire

**Audit du dépôt :** 27 octobre 2026
**Périmètre :** application `mobile/`; inventaire du code et de ses garde-fous, pas une recette sur téléphone.

## Capacités visibles dans l’application

| Domaine | Capacité mobile constatée | Limite / condition |
|---|---|---|
| Ordres de travail | Consultation, création, modification, affectation disponible selon rôles, tâches et checklist, compteurs, temps et coûts supplémentaires, clôture/signature | Les droits et entitlements conditionnent les actions. Les écrans mobiles ne remplacent pas la planification d’équipe Web. |
| Rapports WO | Ouvrir le PDF non archivé dans le lecteur du téléphone, émettre après aperçu et confirmation, parcourir l’historique et télécharger une copie archivée | Utilise la configuration de rapport par défaut côté serveur; pas de sélection de template/sections dans l’app. L’aperçu doit être recetté sur Android/iOS. |
| Maintenance préventive | Consultation et accès aux OT issus des plans, formulaires de terrain | La configuration/calendrier et l’administration restent principalement Web; l’entrée mobile et l’écran vérifient permission et option `PREVENTIVE_MAINTENANCE` du plan. |
| Équipements et pièces | Recherche, détails, création selon permissions, pièces et mouvements associés aux OT | Scanner code-barres intégré; NFC dépend du support matériel et de l’entitlement `NFC_BARCODE`. |
| Formulaires terrain | Champs configurables, photos/fichiers, audio/notes vocales, code-barres, NFC pris en charge, signature | Fichiers : option `FILE` + entitlement `FILE_ATTACHMENTS`; audio : entitlement `VOICE_NOTES`; signature : option `SIGNATURE` + entitlement `SIGNATURE_CAPTURE`; NFC : entitlement `NFC_BARCODE` et plateforme native compatible. |
| Demandes | Consultation, création et suivi selon rôle et configuration de l’entreprise | Le portail public et ses paramètres sont administrés côté Web. |
| Statistiques | Aperçu des OT et écran mobile de statistiques | Le plan doit activer `ANALYTICS` et le rôle doit donner la permission; les appels API appliquent aussi ce contrôle. |
| Achats | Liste paginée et actualisable des PO; détail fournisseur, échéance, statut, lignes, résumé des quantités par unité et estimation calculée avec les coûts courants; première saisie de réception partielle en ligne | La consultation exige `PURCHASE_ORDERS` + l’option de plan `PURCHASE_ORDER`; la réception exige aussi `PURCHASE_RECEIPTS` dans `editOtherPermissions`, et sa lecture exige `PURCHASE_RECEIPTS` dans `viewPermissions`. L’app soumet uniquement les quantités saisies au contrat serveur idempotent; le serveur renvoie les reliquats et applique le stock. La recette Android/iOS, les PR mobile, scan/photo et l’offline restent au backlog. Le résumé de coût est une estimation, pas un prix PO figé. |
| Disponibilités de quart | Consultation de sa propre configuration hebdomadaire et des exceptions à venir | Ce n’est ni un roster publié ni une affectation confirmée. La planification des capacités est une fonction modulaire; son écran est maintenant masqué et protégé dans l’UI mobile lorsque le plan ou la licence `RESOURCE_PLANNING` manque. |
| Notifications | Notifications et mises à jour de session temps réel présentes dans le code | Dépendent de la connexion et du service serveur; elles ne constituent pas un mode hors ligne. |

## Principe d’activation

Comme dans l’approche SAP d’extensibilité, le noyau métier QPM garde des contrats stables et chaque capacité optionnelle est activée explicitement. Une fonction ne devrait apparaître et agir que si le besoin métier est retenu, si le plan et la licence la couvrent, et si le rôle de l’utilisateur l’autorise. La configuration d’un connecteur fournisseur/ERP doit s’ajouter à ces contrôles, être propre à l’entreprise et rester côté serveur pour les secrets. La navigation mobile masque les fonctions indisponibles; le serveur reste l’autorité sur les opérations et les données.

Les écarts d’activation mobile relevés ont été alignés : écrans PM et statistiques vérifient option et permission; disponibilités de quart vérifie plan, licence et permissions; clôture avec signature vérifie option `SIGNATURE` et entitlement `SIGNATURE_CAPTURE`; formulaires de demande désactivent l’enregistrement audio si `VOICE_NOTES` manque; et le module compteurs vérifie maintenant l’option `METER` dans « Plus », Asset 360, ses écrans et sélecteurs directs. Fichiers et scan NFC/code-barres exigent déjà permission, option/entitlement et capacité plateforme là où applicable. Le endpoint personnel `GET /shift-configurations/me` reste en lecture seule et ne déclenche aucun calcul ou changement de planning; l’API reste l’autorité sur les opérations et les données.

## Écarts mobiles prioritaires

1. **Achats opérationnels — première saisie de réception livrée** : approbation et réception restent des actions distinctes; le rôle de lecture PO n’accorde aucune permission de réception. L’écran mobile ouvre un PO admissible, montre les lignes/reliquats renvoyés par le serveur, permet une saisie partielle avec clavier décimal, référence facultative et confirmation. La clé d’idempotence reste stable lors d’un retry inchangé. L’historique respecte le droit distinct `PURCHASE_RECEIPTS`. Recette tactile Android/iOS encore requise; file « à recevoir », scan/photo, PR mobile et hors ligne restent au backlog.
2. **Capacité/roster** : clarifier si le mobile doit montrer le roster publié, les affectations personnelles ou seulement les disponibilités déclarées. Ce sont trois données différentes; ne pas présenter une disponibilité comme un quart assigné.
3. **Mode hors ligne** : Redux persiste une partie de l’état local dans AsyncStorage et l’application détecte certains états réseau avec des reprises locales. L’audit n’a pas trouvé de file générale de mutations avec synchronisation et résolution de conflits; cela ne constitue donc pas une capacité garantie de travail hors ligne de bout en bout.
4. **Intégrations ERP/fournisseurs** : aucune connexion ERP directe n’est à exposer dans le mobile. L’app doit consommer les contrats QPM; configuration, credentials, reprises et mapping restent dans les adaptateurs serveur modulaires décrits dans `PROCUREMENT-SAP-ARCHITECTURE.md`.

## Référence de processus

SAP sépare les demandes, l’approbation, la commande et la réception; les réceptions partielles restent rattachées à la commande et peuvent être multiples. Ses arrangements de communication associent un scénario à un système et à des API. Cela appuie une activation par besoin et par interface publiée, au lieu d’un connecteur monolithique activé implicitement. Voir [workflow SAP des demandes d’achat](https://help.sap.com/docs/buying-invoicing/purchasing-guide-for-procurement-professionals/about-workflow-of-purchase-requisitions-8b3f5dbe7a7b4427a1039a46dfe475d3), [réceptions SAP](https://help.sap.com/docs/buying-invoicing/purchasing-guide-for-procurement-professionals/about-receiving) et [arrangements de communication SAP](https://help.sap.com/docs/SAP_EXTENSIBILITY_EXPLORER/8ce29283d61a4bca96e9e7d87c95baa3/a53d6d9c482f47a1b9e65712db544d70.html).

## Contrat d’expérience achats Web/mobile

| Besoin | Web | Mobile |
|---|---|---|
| Comprendre l’engagement | Grille dense avec recherche/tri, détail complet et coût clairement estimatif tant que le snapshot n’existe pas. | Cartes empilées, aperçu limité puis détail vertical; ne pas supprimer les lignes longues ou leurs unités. |
| Préparer / éditer | Création/édition atomique des brouillons multi-lignes, rôles serveur et erreurs par champ. | Pas d’édition de commande dans la première tranche mobile; les besoins peuvent ultérieurement être soumis depuis l’OT via une PR liée. |
| Approuver | File/revue sur Web, séparation explicite de l’approbateur et du demandeur quand le rôle le demande. | Une action d’approbation n’est ajoutée qu’avec un besoin mobile mesuré et un droit distinct; elle ne réalise jamais une réception ou un mouvement de stock. |
| Recevoir | Revue d’ensemble, corrections compensatoires contrôlées, filtres et historique. | Tâche courte par commande puis ligne, réception partielle contrôlée, saisie adaptée au clavier, réponse autoritaire et reprise après erreur réseau. Aucun état local ne doit prétendre que le stock a changé avant confirmation serveur. |

Le contrôle responsive des interfaces Web se fait au minimum en large, tablette et téléphone, y compris clavier et panneaux; la recette mobile se fait sur Android et iOS pour safe-area, grande police, tap targets, lecteur de code-barres et erreurs réseau. Les tests de contrat/API peuvent couvrir les invariants, mais ne remplacent pas ces recettes visuelles et tactiles. Voir les lots et décisions d’architecture dans [`PROCUREMENT-SAP-ARCHITECTURE.md`](PROCUREMENT-SAP-ARCHITECTURE.md).
