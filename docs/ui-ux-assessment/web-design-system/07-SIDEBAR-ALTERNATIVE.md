# Variante de sidebar Web QPM — contraste par surface

## Proposition

La proposition est maintenant appliquée localement à la sidebar de production : surface indigo nuit (`#101B36`), texte clair, groupes sans séparateurs décoratifs et sélection en aplat QPM (`#4B5FE8`). La navigation active est identifiée par le fond plein, le texte blanc et l'icône opaque; le repère vertical latéral est retiré. Le sélecteur de site et le bloc d'état gardent une surface intérieure discrète. Le layout utilise un contour fin pour séparer le panneau du contenu.

## Comparaison au style Web actuel

| Élément | Proposition précédente | Proposition appliquée localement |
| --- | --- | --- |
| Surface | Gris bleuté clair proposé auparavant | Indigo nuit appliqué |
| Sélection | Fond bleu très pâle et texte bleu | Fond QPM plein et texte blanc |
| Repères | Trait vertical de sélection | Aucun trait; contraste par surface |
| Séparateurs | Peu nombreux | Aucun séparateur décoratif |
| Hiérarchie | Variation légère de teinte | Contraste de surface, poids et espacement |

## Garde-fous

- Les libellés, groupes, destinations et permissions de production ne changent pas.
- Les couleurs sémantiques des statuts et priorités ne sont pas utilisées dans la navigation.
- Le choix vise à différencier clairement la navigation du contenu et à garder la sélection immédiatement repérable. La recette visuelle dans le navigateur reste nécessaire avant livraison.

## Vérification

Les ratios automatisés de la palette appliquée sont : texte principal/fond sidebar 15,47:1; texte secondaire/fond 10,97:1; texte au survol/fond 12,91:1; texte blanc/sélection QPM 5,12:1. Ils dépassent WCAG AA pour le texte courant. Tests front Web, typecheck, lint ciblé, test de contraste et build CRA de production passent. Les avertissements ESLint du build concernent des fichiers hors sidebar. Les captures desktop, tablette et mobile restent à produire dans un navigateur fonctionnel.
