# Backlog — Centre d’aide QPM

**Objectif :** faire du Centre d’aide la documentation officielle de QPM, consultable et administrable par organisation, sans remplacer les conventions d’interface, d’API, de stockage ou d’autorisations déjà présentes dans QPM.

**État de référence :** 5 novembre 2026. Les changements décrits comme « présents dans le dépôt » sont dans l’arbre de travail; ils ne sont pas considérés comme déployés en production.

## État livré dans le dépôt

| Domaine | État constaté | Limite de validation |
| --- | --- | --- |
| Expérience de consultation | Page d’accueil, recherche locale, navigation par guides, article, sommaire et adaptation responsive présents dans `frontend/src/content/own/HelpCenter/index.tsx`. Les images sont chargées avec la session et affichées via des URL temporaires locales. | Typecheck ciblé des fichiers du Centre d’aide réussi; build CRA complet non obtenu, voir HCP-01. |
| API documentaire | API de lecture et d’administration, portée par organisation, visibilité par permission QPM, catégories, états brouillon/publié/archivé et copie du contenu publié présents dans l’API Spring. L’accès aux images exige une session, vérifie les autorisations de l’article et renvoie `no-store`. | Compilation Maven réussie après les vérifications d’accès image; aucune recette API authentifiée exécutée. |
| Administration | Écran de gestion des catégories et articles, éditeur riche, prévisualisation, publication, archivage et téléversement d’images présents dans `frontend/src/content/own/Settings/HelpCenterAdmin.tsx`. | Typecheck ciblé réussi; parcours utilisateur non testé. |
| Persistance | Changelog Liquibase additif, tables et préchargement bilingue des guides pour les entreprises existantes. Inclus dans `api/src/main/resources/db/master.xml`. | XML valide; migration non appliquée à une base et pas de vérification PostgreSQL 18. |
| Images | Téléversement limité aux PNG/JPEG/WebP (10 Mo), stockage via le fournisseur déjà configuré, HTML nettoyé côté serveur. La lecture est authentifiée et limitée selon les articles publiés visibles par l’utilisateur. L’administration demande une description alternative ou la déclaration décorative et permet de modifier la description d’une image existante. | Typecheck ciblé passé; recette navigateur/API sur différents rôles non effectuée. |
| Recherche | Recherche sur titre, résumé, contenu et mots-clés à travers les articles publiés de l’organisation. | Filtrage en mémoire après chargement de la liste; pas encore de recherche PostgreSQL plein texte, extraits ou surlignage. |

## Ordre de réalisation

Les priorités P0 sont des critères de sortie avant toute annonce de disponibilité. Les lots P1 et P2 suivent après stabilisation du socle. Aucun lot ne doit supprimer ou réinitialiser les données documentaires.

### P0 — Stabiliser et valider le socle livré

#### HCP-01 — Vérifier le frontend et corriger les erreurs de compilation

**Statut :** typecheck ciblé réussi; build CRA complet reste à confirmer. Deux builds (dont un sans sourcemaps) ont quitté prématurément avec le message « process exited too early », probablement par manque mémoire; une troisième tentative à heap limité a été interrompue après plusieurs minutes sans progrès visible. La machine n’avait qu’environ 2,4 Go de mémoire disponible au démarrage. **Dépendances :** aucune.

- Exécuter le typecheck et le build de production Web dans l’environnement du dépôt.
- Corriger les erreurs introduites par le Centre d’aide sans retoucher les modules QPM hors périmètre.
- Vérifier les traductions FR/EN, le routage `help/:slug` et la route d’administration `settings/help-center`.
- Vérifier que l’API qui répond avec zéro article affiche un état vide et ne révèle pas les anciens guides statiques. Le fallback statique ne doit servir qu’en cas d’échec de chargement.

**Acceptation :** typecheck et build réussissent; la page d’accueil, une URL d’article, une liste vide et les deux routes d’administration/consultation fonctionnent sans erreur console critique.

**Vérifications partielles du 29 octobre 2026 :** le typecheck TypeScript ciblé (avec le `tsconfig` du projet et les fichiers d’environnement globaux) passe. Le build de production n’a pas été validé; relancer dans un environnement disposant de davantage de mémoire avant livraison.

#### HCP-02 — Valider la migration documentaire sans risque pour les données

**Statut :** à faire. **Dépendances :** HCP-01 non bloquante; base de préproduction PostgreSQL 18 requise.

- Appliquer le changelog sur une base de préproduction représentative et confirmer que les tables, contraintes, séquences et index correspondent aux entités JPA.
- Confirmer le préchargement des catégories et guides anglais/français pour les entreprises existantes, ainsi que les permissions associées.
- Confirmer l’idempotence Liquibase au second démarrage et vérifier que le rollback n’efface pas le contenu client.
- Documenter la procédure de sauvegarde/restauration et la sortie de migration. Ne pas lancer la migration en production avant validation de cette recette.

**Acceptation :** migration initiale puis second démarrage réussis; décompte et langues des guides vérifiés; données préexistantes inchangées; rollback documenté et non destructif.

#### HCP-03 — Recetter les parcours et les droits QPM

**Statut :** à faire. **Dépendances :** HCP-01, HCP-02.

- Recetter comme administrateur : créer/modifier/réordonner une catégorie et un article, enregistrer un brouillon, prévisualiser, publier, modifier après publication et archiver.
- Recetter comme utilisateur ordinaire : lecture seule, visibilité selon permissions, absence des brouillons et articles archivés.
- Vérifier les accès directs par slug, les recherches, les catégories sans article et les droits de gestion via le rôle QPM existant.
- Vérifier les cas d’erreur réseau, de contenu vide, de slug dupliqué, de catégorie inactive et d’upload refusé.

**Acceptation :** les cas permettent de confirmer que l’API est l’autorité des droits; aucun utilisateur ne peut gérer la documentation sans droit Settings existant ou propriété de l’entreprise.

#### HCP-04 — Fermer l’accès non autorisé aux images documentaires

**Statut :** garde-fous d’accès implémentés dans l’arbre de travail; recette négative/positive à faire avant production. **Dépendances :** HCP-03 pour la recette.

- `GET /documentation/assets/{assetId}` exige maintenant une session et limite la lecture à l’entreprise de l’utilisateur; un administrateur documentaire peut lire les ressources de sa société, et un lecteur doit avoir au moins un article publié visible qui référence l’image.
- Le frontend récupère les images avec l’en-tête d’authentification puis les affiche avec des URL Blob locales; celles de la page publique sont révoquées au changement d’article, celles de l’éditeur au démontage du composant. La réponse API utilise `Cache-Control: private, no-store`.
- Recetter la livraison authentifiée dans le navigateur, y compris la prévisualisation et l’éditeur riche, avant production.
- Vérifier le statut d’un article, l’organisation, les permissions de module et les images conservées après archivage.
- Ajouter des limites adaptées aux fichiers servis et des en-têtes de sécurité/cache cohérents avec le choix d’accès.

**Acceptation :** une image d’un article restreint ne peut pas être récupérée par un utilisateur non autorisé, même avec son URL; les lecteurs autorisés continuent de voir l’image.

### P1 — Compléter l’expérience documentaire

#### HCP-05 — Fiabiliser la recherche et la découverte

**Statut :** à faire. **Dépendances :** HCP-01 à HCP-04.

- Indexer les champs publiés pertinents avec la recherche plein texte PostgreSQL, en respectant entreprise, langue, statut et permissions.
- Ajouter classement, extraits de correspondance et surlignage sûr des termes; éviter de transférer tous les contenus à chaque recherche si le volume augmente.
- Ajouter suggestions instantanées, navigation clavier, filtres par catégorie et états vide/erreur.
- Vérifier que les brouillons et articles cachés ne sont jamais présents dans les résultats ni les extraits.

**Acceptation :** recherche réactive sur titre, mots-clés, résumé et corps; résultats correctement classés et autorisés; clavier et état vide utilisables.

#### HCP-06 — Enregistrer l’avis sur les articles

**Statut :** à faire. **Dépendances :** HCP-03.

- Ajouter le choix simple « utile / pas utile » avec stockage rattaché à l’article, à l’entreprise et à l’événement utilisateur selon les règles de confidentialité QPM.
- Empêcher les doublons abusifs et définir l’effet des modifications/archivages d’articles sur les retours.
- Ajouter une consultation agrégée réservée aux administrateurs documentaires; ne pas exposer les identités dans les agrégats ordinaires.

**Acceptation :** le retour est enregistré une seule fois selon la règle retenue, confirmé à l’utilisateur, et consultable uniquement par les rôles autorisés.

#### HCP-07 — Ajouter les liens d’aide contextuelle

**Statut :** liens ajoutés aux écrans Ordres de travail, Demandes, Équipements, Inventaire et Paramètres avec un composant réutilisable et des alias pour anciens slugs; recette de contenu et d’accès reste à faire. **Dépendances :** HCP-03, HCP-05 pour généraliser.

- Fournir une convention réutilisable pour lier chaque écran QPM à un article publié par son slug ou identifiant stable.
- Les premiers écrans reliés sont Work Orders, demandes, équipements, stock et administration. Valider chaque guide et masquer les liens pour les permissions insuffisantes avant généralisation.
- Vérifier les permissions avant d’afficher ou d’ouvrir l’article; ne pas interrompre l’opération en cours.

**Acceptation :** chaque lien ouvre l’article pertinent, respecte les droits et ne produit pas de lien mort si l’article est retiré.

**Vérification partielle du 29 octobre 2026 :** liens `/app/help/{work-orders,maintenance-requests,equipment,parts-inventory,settings}` présents dans les écrans correspondants; les alias prennent en charge les slugs des guides statiques. L’API filtre toujours les articles par permission QPM. Typecheck TypeScript ciblé, ESLint ciblé et `git diff --check` réussis; recette navigateur restante. Aucune migration appliquée.

#### HCP-08 — Améliorer la gestion des images

**Statut :** description alternative demandée après ajout, modifiable pour une image sélectionnée, image décorative prise en charge, et agrandissement des images descriptives utilisable au clavier; optimisation, annotations et recette restent à faire. **Dépendances :** HCP-04.

- Rendre le texte alternatif éditable et requis ou explicitement décoratif; préserver légende et dimensions utiles.
- Vérifier limites de taille, signature réelle du fichier, noms sûrs, stockage privé, erreur de fournisseur, cache et suppression contrôlée des objets orphelins.
- Ajouter le zoom accessible, l’optimisation ou redimensionnement selon les capacités déjà disponibles, et une prévisualisation d’annotations si le besoin est confirmé.

**Acceptation :** chaque image a un traitement accessible, les uploads refusés donnent une explication claire et aucun objet client n’est supprimé sans vérification de référence.

**Vérification partielle du 29 octobre 2026 :** l’éditeur demande un texte alternatif non vide ou la confirmation que l’image est décorative; annuler l’ajout retire l’image du brouillon. Une image existante sélectionnée peut rouvrir le formulaire pour modifier sa description. Le rendu conserve `alt=""` pour les images décoratives. Typecheck TypeScript ciblé, ESLint ciblé et `git diff --check` réussis. Aucune migration n’a été appliquée.

**Mise à jour du 5 novembre 2026 :** les images avec texte alternatif sont tabulables et ouvrent l’aperçu avec Entrée/Espace; l’aperçu conserve le texte alternatif de l’image. Les images déclarées décoratives ne deviennent pas des contrôles interactifs. Aucun changement de schéma ni migration.

### P2 — Exploitation éditoriale et évolutivité

#### HCP-09 — Revoir le cycle de vie des catégories et articles

**Statut :** restauration explicite ajoutée à l’API et à l’interface; recette des transitions et audit des effets reste à faire. Aucun changement de schéma requis. **Dépendances :** HCP-03.

- Définir et implémenter la restauration d’un article ou d’une catégorie archivée, si les administrateurs doivent pouvoir corriger un archivage accidentel.
- Définir le traitement des articles lorsqu’une catégorie est archivée; éviter toute suppression en cascade visible ou perte de contenu inattendue.
- Ajouter une confirmation aux actions irréversibles ou à portée large et garder les brouillons distincts des versions publiées.

**Acceptation :** les transitions sont explicites, auditables, réversibles selon la règle choisie et n’effacent aucune documentation.

**Vérification partielle du 29 octobre 2026 :** restaurer une catégorie la réactive; restaurer un article le remet en brouillon afin qu’il ne redevienne pas visible avant une nouvelle publication. Le contenu et sa copie publiée restent conservés. Typecheck, ESLint ciblé et compilation backend réussis. Aucune migration n’a été appliquée.

#### HCP-10 — Structurer les contenus et compléter le bilingue

**Statut :** à faire. **Dépendances :** HCP-03.

- Faire relire les sept guides migrés contre l’interface et les workflows réellement disponibles dans QPM; corriger les formulations génériques et chemins de navigation non vérifiés.
- Maintenir les versions FR/EN liées ou clairement identifiables, avec indication lorsqu’une traduction est absente ou obsolète.
- Ajouter les catégories et guides des modules réellement disponibles, en évitant de documenter des fonctions non livrées.
- Définir qui rédige, qui révise, qui publie et la convention de date de mise à jour.

**Acceptation :** parcours documentés reproductibles dans la version actuelle de QPM, contenu français et anglais cohérent et articles focalisés sur une tâche.

#### HCP-11 — Fournir le contenu initial aux nouvelles entreprises

**Statut :** à faire. **Dépendances :** HCP-02, HCP-10.

- La migration précharge les entreprises qui existent à sa date d’application; définir l’initialisation pour les nouvelles entreprises créées après celle-ci.
- Réutiliser les mêmes guides versionnés, dans une transaction sûre, sans créer de doublons ni écraser les personnalisations des organisations.
- Définir si les contenus de départ sont copiés comme contenu éditable propre à l’entreprise ou fournis par catalogue partagé.

**Acceptation :** une entreprise nouvelle reçoit une seule fois le contenu de base publié dans sa langue, et les modifications de l’entreprise ne sont pas remplacées lors des déploiements futurs.

#### HCP-12 — Mesurer l’usage et préparer les performances

**Statut :** à faire. **Dépendances :** HCP-05, HCP-06.

- Définir les événements minimaux : consultation, recherche sans résultat, retour utile/non utile, sans enregistrer de données personnelles superflues.
- Ajouter agrégats d’usage accessibles seulement aux administrateurs autorisés et une politique de rétention.
- Mesurer pagination, volumétrie, latence et coût des listes; introduire pagination serveur quand les mesures le justifient.

**Acceptation :** métriques utiles à l’amélioration des contenus, accès contrôlé, rétention documentée et comportement performant sur une volumétrie pilote convenue.

## Critères de sortie de la première mise en service

- HCP-01 à HCP-04 terminés et validés sur préproduction.
- Migration appliquée et vérifiée sur une sauvegarde restaurable avant changement de production.
- Build frontend et backend réussis; recette authentifiée FR/EN faite avec au moins un administrateur, un utilisateur avec permissions limitées et une entreprise existante.
- Aucune erreur critique API/console, aucun accès à un contenu restreint via article, recherche ou image.
- Déploiement effectué via le flux versionné du dépôt; contrôle de santé HTTP et vérification fonctionnelle après déploiement.

## Hors périmètre actuel

- Plateforme complète de knowledge management ou workflow éditorial complexe.
- Commentaires, forum, génération automatique de documentation ou intégrations externes.
- Recherche basée sur un nouveau moteur/une infrastructure séparée avant que PostgreSQL soit mesuré insuffisant.
- Traductions automatiques publiées sans revue humaine.
- Suppression physique automatique des images ou du contenu documentaire sans preuve qu’aucun article publié, brouillon ou archivé ne les référence.
