# Audit visuel de l’authentification

Références principales : `mobile/screens/auth/AuthenticationScreen.tsx` et `VerifyScreen.tsx`. L’authentification existante est un écran fonctionnel connecté au `AuthContext`; les observations ci-dessous décrivent son style, pas un prototype statique.

## Composition observée

- En-tête bleu plein écran de largeur, hauteur fixe de 245 px, avec 8 lignes de contour elliptiques translucides; il n’y a pas de dégradé dans le code observé.
- Logo et navigation en haut; copie alignée en bas de l’en-tête. Deux grandes formes blanches arrondies superposées créent la vague entre l’en-tête et le contenu.
- Zone de contenu blanche, marge horizontale autour de 30 px; champs minimalistes `TextInput` Paper `flat` avec soulignement, libellés séparés, retour d’erreur et commande afficher/masquer le mot de passe.
- Bouton d’action primaire Paper, hauteur de contenu minimale 48 px, rayon 15 px; liens secondaires compacts; bouton ancré dans un pied de page blanc séparé par une bordure fine.
- Les formulaires restent connectés aux mécanismes existants : login/register, LDAP, instance config, vérification d’adresse et états d’erreur/chargement.

## Palette source lue dans les styles

| Usage | Valeur existante | Source |
|---|---|---|
| Bleu QPM principal d’origine | `#5569FF` | Palette d’authentification avant harmonisation; 4,33:1 sur blanc, donc insuffisant pour petit texte normal |
| Bleu QPM accessible actuel | `#4B5FE8` | `theme/tokens.ts` Light; utilisé pour les liens, titres et en-tête via Paper/QPM, contraste 5,12:1 sur blanc |
| Bleu logo | `#4055DD` | texte du monogramme |
| Encre forte | `#202943` | titres |
| Texte secondaire | `#737D95` | description/notes |
| Libellé | `#69738D` | labels de champs |
| Lavande pâle | `#F6F7FF` | tuile d’icône |
| Bordure lavande | `#DFE3FF` | tuiles et contrôles |
| Surface informative | `#EEF0FF` | encart de compte |
| Texte informatif | `#4D5BB5` | encart de compte |
| Séparateur | `#F0F1F7` | haut du footer |
| Contours | blanc à 18 % / 35 % d’opacité | décoration et boutons sur l’en-tête |

Le texte secondaire source `#737D95` donne ~4,12:1 sur blanc; les tokens actuels utilisent `#5E687E`. Le primaire source `#5569FF` donne ~4,33:1, et le token courant `#4B5FE8` atteint ~5,12:1 sur blanc. Les petites légendes de marque, libellés, aides et erreurs sont à 12 px minimum. Le hero s’adapte à la hauteur réellement rendue de son texte et à l’échelle de police; les lignes, le retour et les champs suivent également cette échelle. Contrôler encore les retours à la ligne, la hauteur du hero et la place restante aux champs sur petits appareils avec une grande taille de texte.

## Typographie et géométrie

Aucune famille personnalisée n’est fixée dans ces écrans; les `Text` suivent les variantes Material 3 puis ajoutent des graisses 700/800/900. Après le lot typographique, les petits textes d’information visibles commencent à 12 px; bouton, retour et titre gardent leurs variantes actuelles. Titres avec lignes 32–33 px. Espacements repérés : 8, 10, 12, 14, 15, 19, 26 et 30 px. Rayons : 9, 10, 11, 15, 18 et 20 px. Ces mesures sont le rendu actuel, pas une échelle cohérente.

## Direction de conservation

Garder le bleu QPM, l’en-tête topographique, la séparation en vague, le champ souligné et la hiérarchie calme. Transformer les valeurs décoratives en tokens dédiés, revoir les tailles de texte de petite légende et piloter le contraste. En mode sombre, préserver les lignes de contour et la composition; remplacer les surfaces blanches par les surfaces sombres sémantiques plutôt que simplement inverser chaque pixel.
