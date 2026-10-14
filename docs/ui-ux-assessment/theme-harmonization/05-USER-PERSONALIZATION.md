# Personnalisation de l’apparence

## Parcours proposé

Ajouter sous **Profil → Paramètres → Apparence** une entrée localisée qui ouvre un écran simple avec trois choix exclusifs : **Clair**, **Sombre**, **Système**. Le choix courant est visible, immédiatement appliqué et enregistré localement. Un bouton « Restaurer les paramètres par défaut » rétablit System et l’accent QPM standard.

Un aperçu à faible risque montre échantillons de fond, carte, champ, bouton et badge d’ordre; il suit la préférence pendant que l’utilisateur choisit. Les badges Open, On Hold, In Progress, Completed, Overdue et Priority affichent toujours leur texte. L’écran doit rester utilisable au clavier et lecteur d’écran.

## Accent

Ne pas exposer une roue chromatique en première livraison. Un accent approuvé peut être ajouté ultérieurement à une courte sélection vérifiée, avec nom, aperçu, contrastes et préservation des couleurs sémantiques. Le bleu d’authentification est la valeur par défaut. Aucun accent utilisateur ne recolore success/error/warning ni statut industriel.

## Persistance et API

Une clé de préférence locale versionnée dans AsyncStorage est compatible avec les dépendances existantes. L’inventaire du profil et de `AuthContext` n’a pas révélé de champ d’apparence ni d’API identifié à synchroniser. Ne pas étendre un DTO ou appeler une API hypothétique : préférences serveur restent optionnelles et nécessitent une preuve d’un champ/contrat existant et une autorisation métier distincte. En cas d’ajout ultérieur compatible, locale gagne temporairement pendant l’amorçage, puis une règle de résolution documentée évite l’écrasement silencieux.

## Vie du compte

Réglage attaché à l’appareil, non à l’utilisateur : conserver après logout, changement d’entreprise/serveur, connexion LDAP et changement de compte. Effacer les jetons ne doit pas effacer l’apparence. System suit `useColorScheme`; choix explicite ne doit pas bouger avec les changements système.
