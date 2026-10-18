# Cohérence Web / Mobile et proposition de roadmap

## Cohérence à partager

| Concept | Référence commune | Adaptation Web | Adaptation Mobile existante |
|---|---|---|---|
| Bleu d’authentification | `#4B5FE8` clair, `#AAB5FF` sombre (auth mobile) | Accent/action prototype | `mobile/theme/tokens.ts`, `mobile/custom-theme.ts`. |
| Surfaces et texte | couleurs sémantiques claire/sombre | grands panneaux, table dense, navigation fixe | Paper, cartes et navigation tactile. |
| Statuts/priorité | mappings métier et labels distincts | badge compact avec texte et contexte de date | badges/cartes RN adaptés à l’exécution terrain. |
| Spacing/shape | rythme conceptuel 4 px, cartes arrondies | mesures CSS pixel Web | valeurs DP `qpmLayoutTokens`, tailles tactiles. |
| Apparence personnel | mode personnel indépendant de l’identité client | préférence Clair/Sombre/Système proposée | `AppearanceContext` persiste Clair/Sombre/Système. |
| Brand entreprise | logo, accent et configuration propriétaire | domaine séparé du thème personnel | réglages société et logo séparés des tokens utilisateur. |
| Densité / navigation | priorité à l’action et à la lisibilité | sidebar, filtres, table et panneaux larges | bottom/tab navigation, cartes et actions de terrain. |

Ne pas partager des pixels identiques entre MUI et React Native; partager intention, sémantique, ordre d’information et token de rôle.

## Phases recommandées après revue visuelle

1. **Validation prototype** — revue superviseur/planificateur/technicien/admin; baselines réelles Web et Mobile; décider du mode sombre Web, de « Système » et de l’accent company/user.
2. **Sécurité et autorisation séparées** — corriger puis tester SEC-WEB-01 (API-key cross-tenant) côté API dans un changement à part; auditer les cas auth/logout et les routes. Ne pas traiter des défauts serveur comme des changements de design.
3. **Fondation Web à faible risque** — créer des tokens dans thème MUI et contrats de composants sans changer routes, props métier ou calls API; tests screenshots et focus; feature flag si l’architecture le permet.
4. **Pilote WO** — WEB-054/055, filtres et détail. Conserver filtres/query, payloads, droits, transitions, complétion et historique. Comparer même scénarios/données avant-après.
5. **Demandes** — WEB-045/046 après stabilité du pilote, garder les décisions, validations et règles serveur.
6. **Equipment 360** — WEB-062–069, brancher progressivement sur les mêmes selectors/services existants; ne pas afficher KPI/état absent de l’API.
7. **Dashboard / PM / autres modules** — une famille à la fois après acceptance et surveillance des régressions.
8. **Apparence** — régler thème persisté et système respectueux du premier rendu seulement après design et préférence produit approuvés; couvrir accents entreprise et tenant.

## Dépendances sécurité / RBC

Le défaut de suppression API key sans tenant check est une dépendance P0 distincte documentée dans `docs/WEB-UI-SECURITY-AUDIT-2026-10-14.md` (SEC-WEB-01). Le prototype n’affiche pas de menu Administration ni le bouton de suppression API key. Le visuel ne remplace ni les contrôles serveur ni l’isolation de tenant.

RBAC de toute version réelle doit garder `hasViewPermission`/`hasCreatePermission`/`hasEditPermission`/`hasDeletePermission` et les guards backend/services. Le prototype n’authentifie pas et ne prouve aucune permission.
