# Évaluation d’impact d’implémentation

## Portée et isolation

Les fichiers de maquette résident exclusivement dans `docs/ui-ux-assessment/prototypes/`. Les interfaces sont servies comme HTML/CSS/JS statiques. Aucun fichier React de production, API, base de données, configuration de sécurité, licence ou règle métier n’est modifié. Aucun paquet n’est ajouté.

Le lancement se fait avec Python standard (`python3 -m http.server`). Les scripts utilisent seulement le DOM natif. Les exemples statiques ne représentent ni la forme des payloads, ni l’authentification, ni les permissions serveur.

## Patterns livrés dans le prototype

- Supervision Web à trois colonnes actionnables, file WO filtrable, tiroir de détail et création groupée.
- Accueil technicien centré sur la journée et la prochaine intervention, avec liste et détail tactile.
- Fiche équipement alignée sur la capture QPM: barre d’onglets, identité/actions, trois indicateurs puis paires de panneaux.
- Calendrier PM mensuel avec échéances et registre d’appels séparant occurrence prévue et WO généré.
- Comparaisons locales disponibles dans `reference-comparison.html`; liens externes référencés avec leurs limites d’images.

## Éléments à réutiliser lors d’une phase approuvée

- S’appuyer sur les composants MUI existants et les tokens approuvés; ne pas recopier ce CSS artisanal dans le produit.
- Vérifier les composants de navigation, liste, formulaire, badge et fiche Asset de l’application avant toute consolidation.
- Conserver les écrans, contrats d’API et droits existants; le prototype n’autorise aucun changement fonctionnel.
- Sur mobile, adapter les patterns à React Native/Paper et à la navigation Expo; le HTML mobile n’est qu’un prototype tactile visuel.

## Dépendances de validation

1. L’application QPM doit démarrer avec son schéma Liquibase/Hibernate cohérent et ses endpoints joignables.
2. L’équipe produit doit valider les noms, statuts, priorités, données essentielles et distinction demande/WO.
3. Un technicien et un superviseur doivent effectuer les scénarios de la checklist.
4. Les contrastes, tailles tactiles, lecteurs d’écran, clavier et responsive doivent être vérifiés sur plateformes ciblées.
5. Les équipes Web/Mobile doivent estimer les écarts entre composants existants et patterns approuvés.

## Impacts et risques si la direction est approuvée

| Sujet | Impact attendu | Risque à maîtriser |
|---|---|---|
| Web Operations | Composition visuelle des listes, filtres et détail contextualisé | Densité de table et comportement des écrans intermédiaires |
| Mobile Technician | Hiérarchie des tâches, cartes, navigation bas d’écran et actions rapides | Régression de parcours, clavier, petits écrans et plateformes natives |
| Asset 360 | Regroupement visuel de données déjà accessibles par onglets | Requêtes multiples, pagination et fraîcheur; ne pas supposer un endpoint agrégé |
| Tokens et badges | Cohérence visuelle sur les deux clients | Contrastes et sémantique réelle des statuts à valider |
| États UI | Traitement explicite des réponses vides/erreurs/permission | Nécessite de conserver le comportement API et les autorisations actuelles |

## Limites de vérification de cette livraison

Le contrôle structurel HTML a réussi pour toutes les pages. Le shell de cet environnement ne contient pas Node.js; `node --check` n’a donc pas pu être exécuté. Le rendu Chromium des versions actuelles reste à refaire après cette livraison; les interactions et états nécessitent une recette manuelle au navigateur, et l’accessibilité lecteur d’écran/tactile ainsi que les contrastes mesurés ne sont pas certifiés. L’application QPM réelle a précédemment renvoyé un 502 lié au démarrage Hibernate/schema ; aucune comparaison de runtime avec l’application connectée ni test API ne peut être affirmé. La recette interactive utilisateur reste à effectuer selon `README.md`.

## Gate de suite

La maquette s’arrête ici. Le portage en production nécessite une approbation explicite du prototype final et un plan de livraison distinct, écran par écran, avec tests de non-régression. Aucun changement métier ou backend n’est inclus ni anticipé comme acquis.
