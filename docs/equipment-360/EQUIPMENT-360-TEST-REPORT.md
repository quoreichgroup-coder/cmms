# Equipment 360 — test report

**Date:** 2026-10-13

## Revalidation du client mobile Expo — 15 octobre 2026

- `npx tsc --noEmit --pretty false` réussit sur le worktree courant.
- `npm run test:mobile-regression` réussit : 20 fichiers de test, 0 échec. Le nouveau test `metro-watcher-exclusions.test.cjs` protège les exclusions des sorties Android/Gradle, du SDK local et des bundles Expo temporaires, tout en vérifiant qu’un écran source reste surveillé.
- Le bouton ± des champs de tâche `NUMBER`/`METER` respecte maintenant le minimum tactile de 48 dp via le token partagé; son libellé accessible et sa préservation des décimales sont explicitement vérifiés dans le code et le guide de recette.
- Les exports Expo réussissent depuis un dossier temporaire interne au projet : Android (2 219 modules), iOS (2 210 modules) et Web (1 883 modules). Le dossier temporaire est supprimé après export; ces bundles ne constituent pas un APK/IPA installable.
- L’export vers `/tmp` est refusé par Expo, qui exige un dossier de sortie enfant du projet; relancer l’export vers `.expo-export-*` résout ce point sans ajouter d’artefacts suivis dans Git.
- Ces contrôles prouvent le typage et le bundling des plateformes; ils ne valident pas l’affichage sur appareil, les permissions natives, le NFC, ni les réponses de l’API réelle. L’APK 1.0.59 précède les changements courants et ne les contient donc pas; utiliser QPM Dev/Metro pour la vérification rapide ou reconstruire un APK avant distribution.

## Follow-up — 2026-10-14

- Mobile scan lookup now shows an accessible progress state after QR/NFC capture and ignores duplicate callbacks while one resolution is in flight. API outcomes and permission checks are unchanged.
- Preventive maintenance details keep pull-to-refresh active until the PM details, call history, and generated work-order reads all finish.
- Work-order completion now confirms success visibly after the existing API call succeeds in both configured-details and direct-confirmation paths.
- Asset 360 Work Orders and Inspections now hide cached work orders and skip related-list reads when the current role lacks work-order view permission; a regression test covers the cache leak case.
- TypeScript, Prettier, the mobile regression suite (13 suites, 0 failures) and `git diff --check` pass. Expo exports PASS: Web (1,896 modules), Android (2,210), iOS (2,179); physical Android camera/NFC verification remains outstanding.

## Changes under test

- Asset NFC/barcode resolution checks the user's asset visibility after a same-company identifier match.
- Unknown identifiers now produce a controlled 404 instead of an unchecked `Optional.get()` failure.
- `GET /assets/{id}` obtains the equipment through `findByIdAndCompany` before checking visibility.
- `GET /work-orders/asset/{id}` now uses the shared company-scoped asset access check and filters rows by company and the existing work-order visibility rule.
- `GET /tasks/work-order/{id}` now uses the shared work-order access method; that method scopes its lookup to the user's company before checking the existing WO visibility rule.
- Mobile query values are URL-encoded.
- A create prompt is shown only for an HTTP 404 and only when the current role has `ASSETS` create permission. Other errors remain errors.
- Mobile Equipment Details now has a Maintenance tab for meter summaries, all pages of enabled preventive-maintenance plans, and recent downtime, using existing endpoints and theme tokens. Meter/PM cards open existing detail screens; access, loading, empty, error and retry states are represented without synthetic KPIs.
- Meter collection also requires the existing `METERS` view permission and filters each meter through its existing `canBeViewedBy` rule; downtime collection verifies company-scoped asset visibility before returning related data.

## Automated checks

New service tests cover denied visibility for both identifier types, unknown NFC/barcode identifiers and cross-company detail lookup behavior in `api/src/test/java/com/grash/service/AssetServiceTest.java`. Work-order company scoping and the asset-linked controller gates have corresponding service/controller tests; they remain unexecuted here due to the missing Maven toolchain.

| Check | Result |
|---|---|
| Mobile TypeScript `npx tsc --noEmit` | PASS after Equipment 360 Maintenance and Work Orders permission-state changes. |
| Full mobile regression suite `npm run test:mobile-regression` | PASS — 13 test files/suites, 0 failures (rerun after this mobile increment). |
| Expo web export `npx expo export --platform web` | PASS after the Work Orders permission-state change — Metro bundled 1,894 modules. |
| Prettier and `git diff --check` | PASS for the mobile screen and English/French translations. |
| Backend targeted Maven test | NOT RUN — `api/mvnw` is absent and system Maven is not installed. Attempting the Maven container was blocked because this workspace user cannot access `/var/run/docker.sock`. |
| Android NFC/camera physical test | NOT VERIFIED — requires NFC-capable Android hardware/native app. |
| iOS camera test | NOT VERIFIED — requires iOS device/simulator and native build. |
| Live staging authorization test | NOT VERIFIED — no staging credentials/endpoint provided in this workspace. |

## Remaining verification

- Run the new/updated API tests in a Maven-enabled environment.
- Verify the Maintenance tab visually on Expo and on a physical device with representative roles and subscription entitlements.
- Verify the NFC plugin's merged Android manifest and support on a target Android handset.
- Execute the acceptance cases in `NFC-QR-SCANNING-TECHNICAL-REVIEW.md` against staging.
- Confirm direct access to another tenant's asset and restricted-role scan are denied without disclosing equipment data.
- Do not claim offline scan support; it is not implemented.

## Hiérarchie équipement dans la fiche mobile — 13 octobre 2026

- L’onglet Détails présente maintenant les équipements enfants lorsqu’ils existent, avec cinq résultats paginés, ouverture d’une fiche enfant, accès à l’arborescence complète, et états de chargement, erreur relançable, vide et permission. L’appel utilise `GET /assets/children/{id}/paginated` existant, sans contrat ou migration.
- La vérification de ce flux a révélé que le service enfants ne scoppait pas le parent à l’entreprise et ne respectait pas la visibilité individuelle des équipements. Le service valide désormais l’accès au parent dans l’entreprise courante; les rôles avec visibilité globale reçoivent les enfants de cette entreprise, et les rôles restreints ne reçoivent que leurs équipements créés ou accessibles via affectation directe, équipe ou responsable principal. Les requêtes paginées gardent un décompte cohérent, via filtres SQL.
- Tests de service ajoutés pour parent d’une autre entreprise, parent hors visibilité et rôle restreint. Les tests Java ne sont pas exécutés dans cet environnement : Maven et `api/mvnw` sont absents; ne pas traiter ces cas comme runtime vérifiés.
- Vérifications mobiles : TypeScript, 13 suites de régression, Prettier, `git diff --check` et export Expo Web (1 894 modules) réussis. Rendu appareil Android/iOS et vérification du endpoint contre une instance réelle restent à faire.

## Consultation des inspections par ordre de travail — 14 octobre 2026

- L’onglet mobile Inspections liste les WO liés visibles; les contrôles ne sont chargés qu’à l’ouverture explicite d’un WO et proviennent de `GET /tasks/work-order/{id}`. La vue filtre `TaskType.INSPECTION`, affiche le libellé, la valeur enregistrée et les notes; elle n’invente ni date d’inspection ni métrique.
- Le chargement par WO est annulé à la fermeture/démontage et chaque groupe distingue chargement, erreur relançable et absence de tâche d’inspection. Le WO reste directement ouvrable.
- `npx tsc --noEmit`, `npm run test:mobile-regression` (13 suites, 0 échec), Prettier, `git diff --check` et `npx expo export --platform web` passent. Le test physique et les vérifications API live par rôle ne sont pas effectués ici.

## État de panne en cours dans Equipment 360 — 14 octobre 2026

- La liste des arrêts d’équipement signale maintenant explicitement `duration === 0` comme panne en cours, selon la convention employée par le service existant. Les interruptions terminées gardent leur durée calculée par le serveur. Pas de nouvel appel, écriture, durée calculée localement ou changement de statut.
- `npx tsc --noEmit`, les 13 suites de `npm run test:mobile-regression`, Prettier, `git diff --check` et `npx expo export --platform web` réussissent (1 895 modules). Le rendu sur appareil reste à confirmer.
- Attachment removal controls in Asset, Part, and Location screens now require the existing edit permission for the corresponding record; file opening remains available to read-only users. Expo exports PASS: Web (1,896 modules), Android (2,210), iOS (2,179).
- Removing a part association from an Asset now also requires the existing Asset edit permission; the linked part remains navigable.
- The Asset 360 Details tab now shows the existing manufacturer and power values from `AssetDTO`, using localized labels and the shared field component. Blank values remain omitted; no data is synthesized.
- Validation for these changes: `npx tsc --noEmit --pretty false`, Prettier, `npm run test:mobile-regression` (13 suites, 0 failures), `git diff --check`, and Expo exports PASS for Web (1,896 modules), Android (2,210), and iOS (2,179). Physical device and live role tests remain unverified.
- Meter cards in the Equipment 360 Maintenance tab now include available last/next reading dates in their screen-reader label. No API read or measurement data was added; same validation/export matrix PASS.
