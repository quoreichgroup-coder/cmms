# QUOREICH QPM licensing operations

QPM uses a separate QUOREICH License Authority for new QUOREICH licenses. The authority issues signed Ed25519 leases; each customer installation verifies the lease with a public key and does not receive the signing key. Licenses support subscriptions with an end date and perpetual terms with optional maintenance expiry. Full and light seats are enforced separately. The authority permits one active production and one active preproduction activation per license.

The customer application currently defaults to the existing Keygen provider for migration compatibility. Set `LICENSE_PROVIDER=QUOREICH` only after the authority is deployed, the public key is installed, and a QUOREICH license key is issued. Keep the legacy provider and data intact until that cutover is deliberate.

## Signing keys

Create the Ed25519 pair on the protected authority host, outside this repository. Keep the private key in a root-readable secrets directory and make only the public key available to application instances:

```sh
umask 077
openssl genpkey -algorithm Ed25519 -out license-private.pem
openssl pkey -in license-private.pem -pubout -out ed25519-public.pem
```

Set `LICENSE_PRIVATE_KEY_FILE` to the protected private key path for the authority Compose project. Copy `ed25519-public.pem` to the customer application's `license-public/ed25519-public.pem`; that directory is mounted read-only by the backend. Back up the private key securely: losing it prevents issuing new leases, while replacing it invalidates leases signed by the previous key.

## Deploy authority

Run the separate Compose project from `license-authority/`. Provide a private `.env` with strong random values for `LICENSE_DB_USER`, `LICENSE_DB_PASSWORD`, and `LICENSE_ADMIN_TOKEN`, plus the private key path. The included Compose file binds port 8081 to loopback; put an authenticated TLS reverse proxy in front of it before connecting remote customer installations. Do not publish the admin token or expose the admin API to the public internet.

For local administration through SSH, open a tunnel with `ssh -L 8081:127.0.0.1:8081 abdouramane@SERVER_IP`, then browse to `http://localhost:8081/`. Enter the `LICENSE_ADMIN_TOKEN` from the protected `license-authority/.env` file in the console; the page keeps it in memory only.

## Issue and manage a license

Administrative requests use `Authorization: Bearer $LICENSE_ADMIN_TOKEN`. License keys are returned only once on creation; the authority stores their SHA-256 hashes. Example subscription request:

```sh
curl --fail-with-body -X POST "$AUTHORITY_URL/admin/licenses" \
  -H "Authorization: Bearer $LICENSE_ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "customerName":"Example customer",
    "edition":"ENTERPRISE",
    "licenseType":"SUBSCRIPTION",
    "seatsFull":25,
    "seatsLight":100,
    "entitlements":["SSO","WORKFLOW","API_ACCESS"],
    "startsAt":"2026-10-02T00:00:00Z",
    "expiresAt":"2027-10-02T00:00:00Z",
    "maintenanceUntil":"2027-10-02T00:00:00Z"
  }'
```

Use `"licenseType":"PERPETUAL"` and omit `expiresAt` for perpetual terms; `maintenanceUntil` remains optional. Entitlements must use names from `LicenseEntitlement`. Prices and editions are commercial configuration decisions and are intentionally not hard-coded here.

Other administrative endpoints:

- `GET /admin/licenses` lists license metadata, not keys.
- `GET /admin/licenses/{id}/activations` and `/events` show activations and audit history.
- `POST /admin/licenses/{id}/revoke` revokes a license. An already-issued offline lease remains usable until its 30-day expiry window ends.
- `POST /admin/licenses/activations/{activationId}/deactivate` frees an activation slot.

## Connect a customer installation

Set these values in that installation's private `.env` and restart/recreate its backend:

```env
LICENSE_PROVIDER=QUOREICH
LICENSE_KEY=<issued-key>
LICENSE_AUTHORITY_URL=https://licenses.example.com
LICENSE_PUBLIC_KEY_PATH=/run/license-public/ed25519-public.pem
LICENSE_ENVIRONMENT=PRODUCTION
```

Set `LICENSE_ENVIRONMENT=PREPRODUCTION` for its single preproduction slot. Do not copy a production fingerprint to a different server. The backend creates and persists its installation fingerprint and signed lease in the `license_cache` volume. The backend contacts the authority at startup and then at most every 12 hours; a valid lease allows up to 30 days offline. An explicit activation rejection (HTTP 403, 404 or 409), an expired lease, or an unverifiable lease blocks writes with HTTP 423 while read and export operations remain available. Temporary HTTP failures such as 408 or 429 preserve a still-valid signed offline lease. A newly unlicensed instance is not forced into read-only mode, allowing activation and first-time setup.

## Current scope and migration notes

The authority exposes a secured REST administration API and a graphical QUOREICH operator console at `/`. The console supports issuing and listing licenses, inspecting activations, freeing an installation slot, and revoking licenses. Audit events are available through the REST API. License issuance is quote-based and pricing is not encoded in application logic. The source repository is AGPLv3, including this authority under the repository's license. Branding identity is fixed as QUOREICH for the derivative and does not depend on a paid upstream branding entitlement; upstream copyright and source links remain in the application notices.

The change from Keygen to QUOREICH is an explicit deployment step. The repository intentionally does not silently change an existing installation's provider, since that could remove currently valid commercial entitlements before the new authority and key are configured.

## Validation before cutover

Run unit tests and build the authority with Java 17 and Maven:

```sh
mvn -f license-authority/pom.xml verify
```

PostgreSQL integration tests run only when `QPM_LICENSE_TEST_DB_URL` is supplied. Use a database reserved for tests. The suite creates and removes a uniquely named schema and uses ephemeral signing keys; it does not use the deployed authority's keys. The database user needs permission to create schemas.

```sh
QPM_LICENSE_TEST_DB_URL=jdbc:postgresql://127.0.0.1:55439/qpm_license_test \
QPM_LICENSE_TEST_DB_USER=qpm_test \
mvn -f license-authority/pom.xml verify
```

Set `QPM_LICENSE_TEST_DB_PASSWORD` privately when required. Tests cover administration authentication, subscription/perpetual persistence, hidden license keys, signature verification, replacement and revocation, and simultaneous activation requests. Without the database variable, the integration class is skipped.

With the frontend dependencies installed, run its production build and console regression tests from `frontend/` (Node.js 20 or later):

```sh
npm run build
npm run test:license-console
```

The console tests use jsdom to exercise asynchronous issuance and dates labelled UTC in a browser with the Europe/Berlin timezone.

## Concurrent seat enforcement

With a valid QUOREICH license, account creation, reactivation and role changes share a PostgreSQL transaction-level advisory lock through `LicenseSeatService`. The lock is held until the caller commits or rolls back. Quota checks flush pending JPA writes before counting users, so several creations in one transaction cannot reuse the same apparent place. The supported transaction isolation is PostgreSQL's default `READ COMMITTED`.

Full seats count enabled customer users whose role is paid; light seats count enabled customer users whose role is not paid. Demo organizations and superadmin roles are excluded. Invitations check capacity but do not reserve a seat; acceptance checks again. LDAP provisioning and role mapping, new OAuth/SSO accounts and bulk subscription reactivation use the same guard. An unlimited-user entitlement skips quota comparisons. New OAuth account provisioning is transactional, so a rejected quota rolls back the organization and account creation together.

These operations serialize across processes connected to the same database. A long LDAP sync transaction may delay other account changes until it completes. Direct database edits and future provisioning paths must not bypass the guard. This mechanism does not allocate one license across several independent customer databases.

To run the API's isolated PostgreSQL concurrency checks and its real client/authority tests, build the authority JAR first, use a database reserved for tests, and supply its absolute JAR path:

```sh
QPM_LICENSE_TEST_DB_URL=jdbc:postgresql://127.0.0.1:55439/qpm_license_test \
QPM_LICENSE_AUTHORITY_TEST_JAR=/absolute/path/to/cmms/license-authority/target/license-authority-0.1.0.jar \
mvn -f api/pom.xml -Dtest=LicenseSeatConcurrencyIntegrationTest,QuoreichAuthorityClientIntegrationTest test
```

The tests create and remove separate random schemas and use ephemeral keys. The client test launches the authority on a temporary loopback port, checks online activation and a restart using an offline lease, and verifies that revocation blocks writes while the read/export filter still permits access. It also verifies copied and modified cached leases. The concurrency tests use the real JPA transaction manager and PostgreSQL repository, including deferred inserts and rollback.

## Activation depuis l’interface QPM

Sur une installation QUOREICH configurée par son administrateur, le propriétaire de l’entreprise ou le superadmin ouvre **Mon entreprise → Licence de l’entreprise**, saisit la clé reçue, puis clique sur **Activer la licence**. Le formulaire sert aussi au renouvellement après expiration. L’état, l’édition, le client, les places et l’expiration sont affichés. La licence couvre l’installation QPM ; cette interface ne crée pas une licence distincte pour chaque organisation hébergée.

Le serveur doit être provisionné une seule fois avec `LICENSE_PROVIDER=QUOREICH`, une URL d’autorité accessible depuis l’API, la clé publique Ed25519 et un chemin de cache persistant. Aucune clé privée ou jeton d’administration de l’autorité ne doit être fourni à l’application. `LICENSE_KEY` peut rester vide : la clé saisie dans l’interface est enregistrée avec le bail signé dans `<LICENSE_CACHE_PATH>.activation.json`. Ce fichier privé (600 sur POSIX) est remplacé atomiquement et chargé au démarrage ; il prime sur la clé d’environnement. Les renouvellements automatiques utilisent cette clé persistée. Conserver le volume `license_cache` lors des mises à jour et protéger ses sauvegardes.

L’API expose `POST /license/activate` (corps `{ "licenseKey": "clé reçue" }`) et `GET /license/activation-config`, réservés au propriétaire ou au superadmin authentifié. L’activation reste autorisée par le filtre de lecture seule, mais reste soumise au contrôle d’accès du contrôleur. Signature, installation, environnement et dates sont vérifiés avant tout remplacement. Un échec conserve la licence locale précédente. La clé n’est renvoyée ni dans la réponse ni dans l’état public, et n’est pas conservée dans le stockage du navigateur.

Pour l’installation Docker locale avec l’autorité déjà démarrée : `sudo docker compose -f docker-compose.yml -f docker-compose.license.yml up -d --build api frontend`. Cet override relie l’API au réseau de l’autorité existante. L’entreprise n’a ensuite aucune commande à exécuter pour activer ou renouveler sa clé.

Validation du parcours : `npm run test:license-ui` depuis frontend (7 tests React/Redux/Helmet). Backend : tests QuoreichLicenseClientTest, LicenseReadOnlyFilterTest et LicenseControllerTest (31 cas ciblés).
