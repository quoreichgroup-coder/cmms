# Testing licensed features locally

Use this opt-in Compose override to preview licensed features against the local development API without a commercial key:

```sh
docker compose -f docker-compose.yml -f docker-compose.local-preview.yml up -d --build api
```

The preview reports every license entitlement as active and displays a warning banner in the app. It only activates when the backend has the `dev` Spring profile, `LICENSE_PREVIEW_ENABLED=true`, and a loopback `PUBLIC_API_URL`. The normal Compose configuration keeps the preview disabled. Never use the override for a hosted or production deployment.

Open `http://localhost:3001`, sign in with the local super admin account, then open **Work Orders** and choose **Workload**. The warning banner confirms that the preview is active. If you had an existing session before restarting the API, sign in again.

To return to normal license enforcement, recreate the API without the override:

```sh
docker compose -f docker-compose.yml up -d --force-recreate api
```

Inspect the current state at `/api/license/state`. In preview mode, the response has `previewMode: true` and `planName: "Local feature preview"`. Without preview or a valid license, `hasLicense` and `valid` are false and `entitlements` is empty. Plan features remain separate: the company subscription must also include the corresponding `PlanFeatures` value.

Use a valid test or staging license for production-like verification. Automated tests should cover both present and absent entitlements so the preview does not replace testing of license denials.
