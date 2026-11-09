# Charte visuelle QPM / QUOREICH GROUP

**Source fournie :** [`identite-visuelle-quoreich-group.pdf`](assets/identite-visuelle-quoreich-group.pdf) (4 pages, Canva, créée le 3 janvier 2026). Cette charte décrit l’identité visuelle; elle ne remplace pas les décisions d’architecture logicielle.

## Éléments repris

| Élément | Valeur | Usage |
| --- | --- | --- |
| Bleu de marque | `#0062DB` | Action primaire, sélection, liens et éléments de marque. Le texte blanc sur ce bleu atteint un contraste WCAG AA de 5,57:1. |
| Orange de marque | `#FF8A51` | Accent décoratif et mise en évidence ponctuelle; ne pas l’utiliser seul comme texte sur fond blanc (contraste 2,33:1). Avec du texte sombre, le contraste est 9,01:1. |
| Famille sans sérif | Montserrat | Famille indiquée dans la charte; destinée à l’interface et aux contenus fonctionnels. |
| Famille avec sérif | Playfair Display | Famille indiquée dans la charte; réservée aux titres de marque et aux mises en avant éditoriales. Cette répartition est une interprétation, car la charte ne définit pas explicitement les rôles typographiques. |

## Contenu détaillé du PDF

| Page | Contenu | Polices embarquées |
| --- | --- | --- |
| 1 | Couverture « Identité visuelle ». | Playfair Display Bold |
| 2 | Logo sur fond clair : « QUOREICH » en `#0062DB`, « GROUP » en `#0464DA`, signature « Intelligence Beyond Boundaries » en `#FF8A51`. Seuls `0062db` et `ff8a51` sont présentés comme nuanciers de la palette. | Montserrat SemiBold, Poppins Regular |
| 3 | Déclinaison du logo et de la signature en blanc sur fond sombre. | Montserrat Bold |
| 4 | Planche typographique (alphabet et chiffres `0123456789`) avec un élément décoratif `#FF751F`. | Montserrat Regular, Playfair Display Bold |

Points complémentaires, observés dans le PDF mais non désignés comme règles par la charte :

- **Signature de marque :** « Intelligence Beyond Boundaries ».
- **Graisses Montserrat utilisées :** Regular, SemiBold (logo sur fond clair) et Bold (logo sur fond sombre).
- **Poppins Regular** n’apparaît que sur la page du logo, probablement pour la signature. Ce n’est pas une troisième famille d’interface; ne pas l’embarquer dans les applications sans décision explicite.
- **`#0464DA`** est une variante très proche du bleu de marque (contraste du texte blanc 5,47:1). Utiliser `#0062DB` comme unique token primaire.
- **`#FF751F`** est un orange décoratif de la planche typographique. Il ne constitue pas un token : texte blanc 2,69:1 (insuffisant), texte noir 7,82:1.

Les statuts métier (erreur, succès, retard, priorité, approbation) gardent leurs couleurs sémantiques; l’orange de marque ne remplace donc pas le code visuel des avertissements. Les modes sombre et clair peuvent employer des variantes accessibles, en conservant ces deux couleurs comme références de marque.

## Application dans QPM

- Web et mobile utilisent les tokens centraux pour le bleu primaire et exposent l’orange comme accent de marque.
- Les formulaires, tableaux, graphiques et interactions conservent la lisibilité, les contrastes et les comportements responsive déjà définis.
- Les polices ne sont pas encore embarquées dans les applications. Avant de les appliquer partout, ajouter et valider les fichiers de police dans les bundles Web et mobile; éviter une dépendance à un chargement externe à l’exécution.
- Cette charte s’applique aux nouveaux écrans et aux retouches MVP concernés. Une refonte globale du design system reste hors périmètre du MVP.
