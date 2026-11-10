# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

QPM (QUOREICH GROUP) is a modified fork of Atlas CMMS (AGPLv3): a self-hosted maintenance management system (work orders, preventive maintenance, assets, inventory, procurement/approvals, requests). Most project docs (`docs/`, `CMMS-WORKFLOW.md`) are written in French. Release scope and acceptance criteria: `docs/MVP-PROJET-QPM.md`; visual identity: `docs/CHARTE-VISUELLE-QPM.md`; declared stack/versions: `docs/STACK.md`.

## Repository layout (monorepo)

| Dir | What | Stack |
|---|---|---|
| `api/` | Central REST API (package `com.grash`) | Java 17, Spring Boot 3.5, JPA/Hibernate, Liquibase, Quartz, WebSocket/STOMP |
| `frontend/` | Web SPA | React 17, TypeScript, CRA via `react-app-rewired`, MUI 5, Redux Toolkit |
| `mobile/` | Android/iOS app | Expo SDK 53 / React Native 0.79 with `expo-dev-client` (not Expo Go) |
| `pdfme-renderer/` | PDF rendering microservice called by the API | Node 22, PDFme 6.2.8 |
| `license-authority/` | Separate licensing service with its own DB, reached by the API over the internal Docker network `atlas-license-internal` | Java 17, Spring Boot, JDBC |
| `monitoring/` | Prometheus/Grafana config | |

Production request path: Caddy (TLS) → nginx (routing) → `frontend` / `api`; API uses PostgreSQL, MinIO (object storage), `pdfme-renderer`, and `license-internal`. All defined in `docker-compose.yml`.

## Commands

### API (`api/`)
- Run locally: `mvn spring-boot:run` (needs PostgreSQL db `atlas` on `localhost:5432`; `dev` profile defaults `rootUser`/`mypassword`, override with `DB_URL`, `DB_USER`, `DB_PWD`).
- All tests: `mvn test` (CI sets `SPRING_PROFILES_ACTIVE=test`; integration tests use Testcontainers, so Docker must be available).
- Single test: `mvn test -Dtest=AssetServiceTest` or `-Dtest="AssetServiceTest#methodName"`.
- Coverage for a test (JaCoCo → `api/htmlReport/`): `mvn -o prepare-package -Dtest=AssetServiceTest`.

### Frontend (`frontend/`)
- `npm start`, `npm run build`, `npm run typecheck`, `npm run lint`.
- Tests are standalone Node test files in `frontend/scripts/*.test.cjs`, exposed as many `test:*` npm scripts (see `package.json`). Run one: `node --test scripts/<name>.test.cjs`.

### Mobile (`mobile/`)
- Dev: `npm start` (dev client), `npm run start:lan` / `npm run start:tunnel`; quick UI preview in browser: `npm run web -- --localhost --port 8082`.
- Tests: `npm run test:mobile-regression` (aggregate of `scripts/*.test.cjs` + selected jest suites); single: `node --test scripts/<name>.test.cjs` or `npx jest <path>`.
- APKs: `npm run build:apk`, `npm run build:dev-apk` (package `com.atlas.cmms.dev`). Version bump: `npm run bump-version`.

### pdfme-renderer
- `npm start`, `npm test` (`node --test`).

### Full stack (Docker)
- First time: `docker network inspect atlas-license-internal >/dev/null 2>&1 || docker network create --internal atlas-license-internal`, then `docker compose up -d --build`. App on http://localhost:3000.
- After API/frontend changes: `docker compose up -d --build api frontend && docker compose restart nginx`.

## Database migrations (Liquibase)

- Changelogs: `api/src/main/resources/db/changelog/`, included from `db/master.xml`. Filenames are `YYYY_MM_DD_<timestamp>_<description>.xml`. Hibernate runs with `ddl-auto: validate`, so every entity change needs a matching changeset.
- Always add `onDelete="CASCADE"` to foreign keys, or `onDelete="SET NULL"` if the column is nullable.
- A new table whose entity extends `CompanyAudit` needs a sequence: `<createSequence sequenceName="new_table_seq" startValue="1" incrementBy="50"/>`.

## API test conventions (from `api/src/test/java/com/grash/agents.md`)

- Service unit tests: Mockito only (`MockitoExtension`, `@Mock`, `@InjectMocks`); no `@SpringBootTest`. Named `<Class>Test`.
- Controller tests: `@WebMvcTest` + `MockMvc` + `@MockBean` services; assert status, `jsonPath`, and `@PreAuthorize`/RBAC cases. No `@SpringBootTest`. Named `<Class>Test`.
- Integration tests: `@SpringBootTest`/`@DataJpaTest` against the real test DB; cover persistence, cascades, custom queries; call `EntityManager.clear()` after saves. Named `<Class>IntegrationTest`.

## Visual identity

- Brand tokens are centralized in `frontend/src/theme/tokens.ts` and `mobile/theme/tokens.ts`: primary `#0062DB`, accent `#FF8A51`. Source PDF and rules: `docs/assets/identite-visuelle-quoreich-group.pdf`, `docs/CHARTE-VISUELLE-QPM.md`.
- The orange is decorative only: never use it as text on white (2.33:1 contrast). Status/priority/approval colors are semantic and must not be replaced by brand colors.
- Web uses Montserrat bundled from `@fontsource/montserrat` (imported in `frontend/src/index.tsx`); mobile still uses system fonts. Never load fonts from an external CDN at runtime (`frontend/scripts/web-typography.test.cjs` guards this).
- UI/UX working conventions: `docs/design.md`.

## Rebrand constraints

User-visible text must say QPM; the only allowed Atlas mention is the AGPL attribution (`open_source_upstream` key, README Licensing). Persistent identifiers that still contain `atlas` (Compose project/volumes/containers, DB `atlas`, bucket `atlas-bucket`, network `atlas-license-internal`, Docker images, mobile app IDs/schemes) are kept on purpose — see `docs/REBRANDING-AUDIT.md` before touching them. `frontend/scripts/rebrand-visible-copy.test.cjs` guards this.

## Translations

Frontend translations live in `frontend/src/i18n/translations/` (mobile: `mobile/i18n/translations/`). Every literal `t('key')` must exist in `en.ts` and `fr.ts`; `npm run test:i18n-keys` (web and mobile) enforces it. When adding/translating keys: translate values only, keep keys unchanged, and add keys only to the languages requested (not to every language file).

## Branches, CI and deployment

- `main` mirrors `upstream` (Grashjs/cmms) and must stay unmodified. `projet` is the working branch; the only allowed push target is `origin/projet`. Never push to `upstream` or force-sync `projet` onto upstream. Upstream integration is done via merge on an `integration/upstream-YYYY-MM-DD` branch (see `CMMS-WORKFLOW.md`).
- Pushing to `projet` triggers `.github/workflows/main-ci.yml`: detects changes in `api/`/`frontend/` since the `deployed-backend`/`deployed-frontend` tags, runs `mvn test`, a self-host smoke test, builds/pushes Docker images, and deploys to the VPS. `mobile-update.yml` publishes EAS updates from `projet`. A push alone does not prove production is updated; check the workflow and health checks before reporting a deployment as done.
- Per `docs/DEVELOPMENT-WORKFLOW-RULES.md`: develop and install dependencies locally, commit lockfiles (`package-lock.json`, `pom.xml`); never patch code or install dependencies inside production containers.
- Do not commit `.env*`, `.initial-admin-credentials`, `.initial-company-license`, `license-authority/secrets/`, or build artifacts such as `mobile/*.apk`.
