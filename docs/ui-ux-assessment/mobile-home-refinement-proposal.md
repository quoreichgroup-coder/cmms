# Proposition de raffinement de l’Accueil mobile QPM

**Statut : approuvée et intégrée dans l’Accueil mobile — 14 octobre 2026.**

## Référence et écran actuel

La référence locale [`Home.png`](../../../images/mobile/Home.png) présente une hiérarchie simple : titre et notification, quatre cartes de statuts sous « My orders », un bloc d’alertes, deux actions d’ajout/scan et une navigation inférieure.

L’écran actuel est [`HomeScreen.tsx`](../../../mobile/screens/HomeScreen.tsx). Il affiche déjà les données dynamiques du tableau de bord dans une carte de bienvenue QPM, des raccourcis avec scan, les préférences de filtre assigné, et six cartes filtrables (ouvert, en attente, en cours, terminé, aujourd’hui, priorité haute). La navigation inférieure appartient au navigateur d’onglets existant.

## Direction proposée : reprendre les repères, garder la structure QPM

- **Conserver** la carte bleue QPM, la salutation, la date, le compte réel des ordres et le raccourci vers la liste. Elle porte l’identité QPM et n’a pas d’équivalent fonctionnel exact dans la référence.
- **Rapprocher** les cartes de statuts de la référence : conserver une grille compacte à deux colonnes, des angles arrondis, une icône dans un petit disque teinté selon le token sémantique du statut, un compteur lisible et un libellé. Les cartes restent tactiles et conservent leur filtre actuel.
- **Garder les six indicateurs** existants. Les quatre statuts restent en premier; « Aujourd’hui » et « Priorité haute » restent visibles comme indicateurs opérationnels, sans supprimer de métrique ni ajouter de nouveau calcul.
- **Rendre le scan plus évident** en donnant au raccourci un libellé « Scanner » à côté de l’icône; garder les raccourcis statistiques, notifications et équipements ainsi que leurs permissions actuelles.
- **Ne pas ajouter le bloc “Alerts” de la référence pour l’instant** : aucun agrégat QPM équivalent n’a été vérifié dans les données déjà utilisées par `HomeScreen`. Ne pas inventer total d’alertes ou répartition de sévérité.
- **Garder la navigation QPM existante**. Les cinq onglets de la référence ne remplacent pas les routes et permissions actuelles.

## Composition cible

1. En-tête de bienvenue QPM existant, légèrement plus compact uniquement si les essais sur petit écran le justifient.
2. Actions rapides, avec Scan libellé et les raccourcis existants.
3. Préférence « ordres assignés » conservée, car elle change réellement le périmètre des compteurs.
4. Titre « Ordres de travail » et grille de six cartes filtrables; icône circulaire et compteur comme repères empruntés à la référence.
5. Barre d’onglets QPM inchangée.

```text
[ QPM · Home / date                               ]
[ Bonjour, prénom                                 ]
[ compte réel des WO                  [Ordres →]  ]

[ Scanner ] [ Statistiques ] [ Notifications ] [ Actifs ]
[ Ordres assignés à moi                 (switch) ]

Ordres de travail
[ icône  Ouverts             ] [ icône  En cours      ]
[       compteur + filtre    ] [       compteur + filtre]
[ icône  En attente          ] [ icône  Terminés      ]
[       compteur + filtre    ] [       compteur + filtre]
[ Aujourd’hui                ] [ Priorité haute       ]

[ onglets QPM existants                         ]
```

## Garde-fous et validation visuelle

- Réutiliser `getStatusColor`, les tokens `successContainer`, `warningContainer`, `errorContainer`, `infoContainer` et la palette neutre; ne pas coder de nouvelles couleurs de statut.
- Les valeurs restent issues de `getMobileOverviewStats`; les interactions de carte conservent leurs `filterFields`. Aucun endpoint, payload, permission ou comportement d’authentification ne change.
- Comparer la composition sur petit Android et grand écran, en thèmes clair/sombre; contrôler les noms accessibles des raccourcis et compteurs, le contraste, le défilement et l’espace au-dessus de la barre d’onglets.
- N’ajouter aucun panneau d’alertes ou score de santé sans source de données QPM vérifiée.

Cette proposition adapte les repères de la référence plutôt que de remplacer l’Accueil existant. L’implémentation conserve les données, filtres, permissions et destinations existants. L’aperçu de bundle passe sur Web et Android; iOS et le rendu réel sur appareil restent en vérification. Cela ne vaut pas encore approbation visuelle finale.
