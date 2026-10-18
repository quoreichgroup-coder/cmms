# Vérification, états, accessibilité et retour arrière

## Liste de contrôle

- [ ] Capturer production actuelle et prototype pour écran, même rôle, même données, aux largeurs 1440, 1024, 768, 390 et 375 px.
- [ ] Vérifier que la table passe à une liste réordonnée en petits écrans; aucune information critique ne disparaît.
- [ ] Vérifier clavier complet : sidebar/menu, recherche, filtres, ligne table via Entrée, onglets, dialogues, Escape, focus retour.
- [ ] Vérifier focus visible, nom accessible des icônes, contraste calculé des textes/badges, zoom 200 %, reflow et lecteurs d’écran.
- [ ] Essayer chaînes longues en français/anglais, noms d’équipement et IDs larges.
- [ ] Distinguer erreur/retry, vide, refus, hors-entitlement, chargement, sauvegarde et succès; messages non-colour-only.
- [ ] Vérifier mode clair, sombre, système et priorité tenant/user; réduire le mouvement.
- [ ] Pour intégration réelle seulement : comparer les routes ouvertes, query params, appels/verb/payloads, droits et résultat API avant/après via HAR ou tests de contrat approuvés.
- [ ] Contrôler WO création/exécution/complétion/réouverture et confirmation de demande comme parcours séparés; ne pas changer transitions dans lot design.
- [ ] Confirmer SEC-WEB-01 corrigé/testé indépendamment avant de retoucher l’administration API keys.

## États effectivement visibles dans le prototype

| État | Démonstration |
|---|---|
| Chargement | `LinearProgress` dans la galerie composant. |
| Vide | aucune ligne WO quand la recherche ne correspond pas, avec reset. |
| Erreur | bannière avec action réessayer dans la galerie; illustrative only. |
| Accès / notice | bannière info « état distinct »; aucun véritable contrôle de permission. |
| Succès | Toast de dialogue annoté « démonstration uniquement ». |
| Désactivé | contrôles pagination désactivés dans liste; critères illustratifs. |

Ces états démontrent la présentation et non les réponses/erreurs de l’API.

## Risques et rollback proposés

Le prototype est non lié à la production et son retour arrière consiste à ne pas merger/porter les fichiers de `prototypes/qpm-web-ui/`. Pour portage progressif, faire des changements limités à un module/recette, conserver thème et composants actuels jusqu’à comparaison, livrer derrière le mécanisme de déploiement/feature flag s’il existe, et revenir au renderer précédent en cas de régression. Les migrations de thème global, auth, API, permissions et logique métier sont hors de ce scope. Ajouter comparaison de requêtes, tests route, tests de droits serveur et screenshot baselines par module.

## Résultat QA — 14 octobre 2026

- `npm run build` dans `prototypes/qpm-web-ui/` : **réussi**, avec React 17.0.2, MUI 5.8.2, Emotion déjà présents dans `frontend/node_modules`.
- API : aucun service/client/Redux API importé par le prototype; aucune route API, permission, statut ou donnée de production modifiée par ce lot.
- Capture automatisée et revue browser : **non exécutées**. Le navigateur Snap local refuse de démarrer (`snapd.apparmor` absent); le navigateur Chrome DevTools distant ne trouve pas `/opt/google/chrome/chrome`; le serveur HTTP local est interdit par le sandbox. Il n’existe pas de baseline de capture authentifiée de production dans le dépôt.
- Conséquence : screenshots « before/after », inspection visuelle réelle, interaction navigateur et test Lighthouse/WCAG sont **à faire** avant une décision d’approbation. Les captures ne sont pas fabriquées.
- La compilation ne prouve pas l’absence de débordement, le focus réel, la parité de navigateur ou le contraste WCAG complet. Ces points restent **non vérifiés**.
