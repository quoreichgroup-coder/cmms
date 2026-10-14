# Matrice actualisée des familles mobile

Les IDs et nombres ci-dessous reprennent `../screen-inventory.json` (75 destinations actuellement montées; destinations de navigation, incluant des wrappers, sélecteurs et modales). Le registre conserve aussi MOB-068 comme trace d’un écran source Login/Register non monté. Les éléments d’implémentation et rôles précis sont à consulter dans le JSON; les écrans conditionnels dépendent des rôles et licences.

| Famille | IDs / volume | Motifs partagés à harmoniser | Priorité prototype |
|---|---|---|---:|
| Authentification | MOB-067, MOB-069–070 · 3 destinations montées | AuthFlow composite (accueil/connexion/inscription), vérification, serveur CMMS | 1 |
| Travail et WO | MOB-001–006, 013, 044, 048, 060, 062–066, 072–074 · 13 (les IDs spéciaux/stack sont dans le JSON) | Liste dense, badges de statut/priorité, détails, tâches, saisie, pièces/temps, filtres, clôture | 1 |
| Demandes | MOB-007, 021–022, 075 · 4 | Liste et recherche, création/édition, détail et transition existante vers WO | 2 |
| Actifs et emplacements | MOB-008–009, 029–034, 045, 057–058 · 11 | Identité hiérarchique, fiche 360, état d’actif, relations WO/pièces/fichiers | 2 |
| Préventif et compteurs | MOB-011, 014–018, 050 · 7 | Échéancier, occurrences, relevés, formulaires et détails de compteurs | 3 |
| Inventaire, achats et partenaires | MOB-010, 019–020, 023–028, 049, 053–054 · 12 | Listes de pièces/fournisseurs, détails liés, quantité, unités et états | 4 |
| Personnes et équipes | MOB-012, 035–039, 042, 055–056 · 9 | Profil, listes, équipe, permissions visibles et sélecteurs | 4 |
| Administration / transverses | MOB-040–043, 046–047, 051–052, 059, 061, 071, 076 · 16 | Réglages, licence, entreprise, notifications, feuilles, scans, menu Plus | 3 |

**Note d’exactitude :** les plages sont un résumé par module issu du registre; certains noms sont enregistrés sous Administration même s’ils concernent le flux WO. Le fichier JSON reste la référence par écran. Les 37 modules `mobile/components` réutilisables recensés dans l’audit précédent couvrent plus que les primitives visuelles : composants média, formulaire, relations et feuilles d’action. Harmoniser par familles sémantiques, sans réécrire chaque écran isolément.

Le registre a été rapproché des routes dans `mobile/navigation/index.tsx` le 12 octobre : 75 déclarations actives, dont les routes d’authentification `AuthFlow`, `Verify` et `CustomServer`. `AuthenticationScreen.tsx` gère les modes accueil/connexion/inscription. MOB-068 reste dans le JSON comme entrée historique non montée, avec sa relation vers MOB-067; il n’est pas compté comme destination active.

## Feuilles et composants transverses

Priorité de test de thème : `components/actionSheets/`, `screens/modals/`, `components/BasicField.tsx`, `FileUpload.tsx`, `SingleTask.tsx`, `components/form/`, `AsyncStateFeedback.tsx`, `Tag.tsx`, `ImageViewer*`, `InAppCamera.tsx`, `CustomSnackBarContext.tsx`, `CustomDateTimePicker.tsx`, navigation bottom-tab et toutes les cards d’état.
