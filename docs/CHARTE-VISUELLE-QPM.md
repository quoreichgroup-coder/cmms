# Charte visuelle QPM / QUOREICH GROUP

**Source fournie :** [`identite-visuelle-quoreich-group.pdf`](assets/identite-visuelle-quoreich-group.pdf) (4 pages, Canva, créée le 3 janvier 2026). Cette charte décrit l’identité visuelle; elle ne remplace pas les décisions d’architecture logicielle.

## Éléments repris

| Élément | Valeur | Usage |
| --- | --- | --- |
| Bleu de marque | `#0062DB` | Action primaire, sélection, liens et éléments de marque. Le texte blanc sur ce bleu atteint un contraste WCAG AA de 5,57:1. |
| Orange de marque | `#FF8A51` | Accent décoratif et mise en évidence ponctuelle; ne pas l’utiliser seul comme texte sur fond blanc (contraste 2,33:1). Avec du texte sombre, le contraste est 9,01:1. |
| Famille sans sérif | Montserrat | Famille indiquée dans la charte; destinée à l’interface et aux contenus fonctionnels. |
| Famille avec sérif | Playfair Display | Famille indiquée dans la charte; réservée aux titres de marque et aux mises en avant éditoriales. Cette répartition est une interprétation, car la charte ne définit pas explicitement les rôles typographiques. |

Les statuts métier (erreur, succès, retard, priorité, approbation) gardent leurs couleurs sémantiques; l’orange de marque ne remplace donc pas le code visuel des avertissements. Les modes sombre et clair peuvent employer des variantes accessibles, en conservant ces deux couleurs comme références de marque.

## Application dans QPM

- Web et mobile utilisent les tokens centraux pour le bleu primaire et exposent l’orange comme accent de marque.
- Les formulaires, tableaux, graphiques et interactions conservent la lisibilité, les contrastes et les comportements responsive déjà définis.
- Les polices ne sont pas encore embarquées dans les applications. Avant de les appliquer partout, ajouter et valider les fichiers de police dans les bundles Web et mobile; éviter une dépendance à un chargement externe à l’exécution.
- Cette charte s’applique aux nouveaux écrans et aux retouches MVP concernés. Une refonte globale du design system reste hors périmètre du MVP.
