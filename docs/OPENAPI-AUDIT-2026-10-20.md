# QPM OpenAPI / Scalar audit — 20 October 2026

## Scope and decision

Read-only review of the generated OpenAPI configuration, Scalar page, Spring Security rules, authentication filters and existing tests. No API, documentation configuration, endpoint, access rule or UI was changed. Any corrections are deferred until the application work is complete, as requested.

The API reference is already implemented and tested for basic generation. It does need a focused accuracy and security pass before treating it as the definitive integration guide. This audit identifies concrete gaps; it does not establish that production has the same runtime configuration because no live OpenAPI response or proxy network trace was captured.

## Existing implementation

- `api/pom.xml` uses `springdoc-openapi-starter-webmvc-ui` 2.8.17. `application.yml` enables OpenAPI 3.1 and disables the default, ungrouped document.
- `SwaggerConfig` publishes a group named `atlas-cmms` matching `/**`. Springdoc scans `com.grash.controller`; controllers annotated `@Hidden` are excluded from the generated reference.
- `OpenApiConfig` titles the document “QPM CMMS API”, describes an `x-api-key` scheme, adds that scheme as a global security requirement, and injects the current `api.host` as the server URL. It also adds webhook operations and schemas.
- `api-docs.html` loads the generated `./v3/api-docs/atlas-cmms` specification and Scalar from an unpinned jsDelivr URL. It configures `https://proxy.scalar.com` as the request proxy and loads the favicon from jsDelivr.
- `SwaggerSecurityConfig` and `WebSecurityConfig` permit public access to `/api-docs.html`, `/swagger-ui/**`, and `/v3/api-docs/**`. The separate docs chain disables CSRF for its matched documentation paths. API access to the business endpoints remains governed by the main security chain and filters.
- The Web API Keys and Webhooks settings open this reference in a new window. No central end-user Help Center was found in `frontend/src`; this OpenAPI page is intended for developers/integrators, not technicians or planners.

## Findings

### P1 — Authentication described in the OpenAPI document does not match the application

`OpenApiConfig` applies `@SecurityRequirement(name = "apiKey")` at the document level, so consumers see `x-api-key` as required across the grouped operations, including paths that are public or use a user session. The introductory text says “Most endpoints require an API key”. In the actual application, `JwtTokenFilter` also resolves bearer JWTs from `Authorization`, while `ApiKeyAuthFilter` optionally resolves `x-api-key`; public endpoints are additionally permitted by explicit Spring Security matchers. Only an API-key scheme is declared in OpenAPI.

**Impact:** Integrators can choose the wrong authentication method or believe a public/authentication operation requires an API key. Scalar’s “Try it” UI can likewise prompt for an API key on operations where it does not apply.

**Evidence:** `OpenApiConfig.java` lines 34–77; `JwtTokenProvider.resolveToken`; `JwtTokenFilter`; `ApiKeyAuthFilter`; `WebSecurityConfig.java` public matchers. Existing generated-spec integration assertions only verify that the API-key scheme exists, not that each operation’s security requirement matches its real access rule.

### P1 — Scalar is configured with a third-party request proxy

`api-docs.html` sets `proxyUrl` to `https://proxy.scalar.com`. Scalar documents this option as routing API-client requests through a proxy when browser CORS prevents direct cross-origin requests, and offers the hosted Scalar proxy as one option. The API reference also presents an API-key authorization scheme. This means “Try it” may route a credential-bearing request through an external service when proxying is used.

The audit did **not** trace a request against the exact unpinned CDN build currently served, nor verify exactly which headers that hosted proxy retains or forwards. Treat this as a credential-egress risk to resolve before encouraging users to enter production credentials in Scalar. Do not claim that a key was exposed or stored based only on source configuration.

**Future decision:** assess direct requests with a narrowly scoped CORS policy, or a reviewed self-hosted proxy; document the trust boundary. Never put a production key in a public reference as a preconfigured value.

### P2 — The specification and interactive reference are anonymously reachable

Both security configurations explicitly permit the docs HTML, Swagger UI paths and all `/v3/api-docs/**` documents. The group matches all controller paths and relies on controller `@Hidden` annotations for omissions. Public access exposes endpoint names, request/response shapes and webhook details, although it does not itself grant access to protected business data.

Existing tests establish that the grouped JSON exists and that the ungrouped `/v3/api-docs` path is disabled. They do not verify production access policy, the complete set of intentionally public routes, or that hidden/admin/internal endpoints stay out of the public schema. The integration test uses `@AutoConfigureMockMvc(addFilters = false)`, so it is not evidence for Spring Security behavior.

**Future decision:** product/security owner should explicitly choose public reference versus authenticated/admin-only reference. Preserve the current runtime access behavior until that decision is made.

### P2 — Runtime dependencies are unpinned external assets

Scalar’s JavaScript and favicon use `https://cdn.jsdelivr.net/npm/@scalar/api-reference` and an external favicon URL without a version pin or integrity value. The content can change independently of QPM deployments and requires an external network connection. This also adds an external asset/privacy/CSP dependency to the API-docs page.

**Future decision:** pin and review an approved version, or serve the vetted static assets locally. Verify the effective CSP and cache policy as part of that work.

### P3 — Historical API group identifier remains visible

The group is called `atlas-cmms`, and the page URL embeds it. The display title is already QPM. This is a naming inconsistency rather than a broken API. Renaming it would change `/v3/api-docs/{group}` and the Scalar source URL; update clients/tests atomically and retain a compatibility path or redirect if existing integrations rely on it.

### Positive controls found

- The example API key is a placeholder, not a real credential.
- `api.host` comes from `PUBLIC_API_URL` in the main application configuration; the `localhost` default is only in the Java annotation and is overridden by configured property. The test asserts the retired Atlas hostname does not appear.
- Several internal controllers are intentionally hidden from the spec (`ApiKeyController`, `PaddleController`, `LicenseController`, `HealthCheckController`, among others). This should remain covered by an explicit allow/deny regression test if the spec is kept public.

## Test coverage review

- `ApiDocsIntegrationTest` checks OpenAPI version/title, non-empty paths, a subscription path, API-key scheme and selected webhook schema/operation. It also checks that the default ungrouped spec returns 404.
- `OpenApiConfigTest` checks custom webhook schemas and group naming.
- `SwaggerConfigTest` checks only the current `atlas-cmms` group name.
- `SwaggerSecurityConfigTest` only asserts that a filter chain can be constructed; it does not send an anonymous HTTP request through the chain.
- No tests currently compare per-operation security requirements with controller access rules, assert that hidden internal endpoints are absent, or guard against introducing a real secret/production hostname into examples.
- Tests were inspected, not executed during this read-only audit. Runtime/CDN/proxy behavior and production headers remain unverified.

## Recommended sequence after application completion

1. Decide who may see the API schema and where interactive “Try it” requests may travel.
2. Build a route-level auth matrix from actual Spring Security matchers, JWT/API-key filters, and any method-level authorization; don’t infer access from controller names.
3. Represent bearer JWT and API-key auth separately and set security per operation, leaving public operations unauthenticated in the spec. Keep `x-api-key` as the supported integration credential where appropriate.
4. Remove or replace the hosted proxy only after testing CORS and auth headers; do not proxy credentials to an unreviewed third party.
5. Pin or self-host Scalar assets and validate CSP, caching and external network behavior.
6. Add tests for representative public, JWT-only, API-key-supported and hidden routes; validate the generated JSON and the actual docs access policy with Spring Security filters enabled.
7. Separately build the end-user Web Help Center in French/English. Keep operator help distinct from OpenAPI developer reference.

## References

- [Scalar configuration — proxyUrl](https://github.com/scalar/scalar/blob/main/documentation/configuration.md): describes proxying requests for cross-origin APIs and the hosted proxy option.
- [OpenAPI Specification 3.1 — Security Requirement](https://spec.openapis.org/oas/v3.1.1.html#security-requirement-object): operation-level requirements can override top-level security, and an empty requirement represents anonymous access.
- [Springdoc OpenAPI documentation](https://springdoc.org/): generated specification and Spring MVC integration reference.

## Audit conclusion

OpenAPI generation exists and the basic contract tests are useful, but the authentication scheme is materially incomplete, the public/hidden surface is not strongly regression-tested, and the hosted Scalar proxy creates a credential-egress question. The OpenAPI should be audited further at runtime and corrected only after the product/security choices above. No implementation or access-policy change is part of this audit.
