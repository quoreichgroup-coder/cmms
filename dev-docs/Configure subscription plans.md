# Atlas CMMS Subscription Plans Configuration
Proceed with the following steps if you have a license to white label. Follow [this](./Run%20SQL%20command.md) if you don't know how to run SQL commands against Atlas database.

## In-app plan catalog

Super admins can manage plan names and included subscription features in **Settings → Plan catalog** (`/app/settings/subscription-catalog`). Saving a plan updates its feature list for every company on that plan. Review the impact warning before saving.

The catalog does not edit plan codes, prices, or Paddle price IDs. Use the SQL instructions below for monthly and yearly prices, then keep the Paddle price IDs and the public pricing page in sync with the billing configuration. Do not use the catalog to change license entitlements.

## Subscription features and license entitlements

Plan features and license entitlements are separate checks. Adding `RESOURCE_PLANNING` to a plan makes it available to subscribers only when the deployment also has a valid license granting the `RESOURCE_PLANNING` entitlement, and the user's role has the required permissions. Other advanced features may have the same two-part gating.

To diagnose a gated feature, check `/api/license/state` for `hasLicense`, `valid`, and the required entitlement, then check the company's subscription plan and the user's role permissions. A local instance without a license key or license file reports no entitlements; changing a plan's features in the catalog will not override that result.

For development verification without a commercial entitlement, use the [local licensed-feature preview](./Testing%20licensed%20features.md) for visual checks and cover both entitlement states in automated tests. Use a valid test or staging license for production-like verification; do not disable the production entitlement checks.

## Available Plan Codes

- `FREE`
- `STARTER`
- `PROFESSIONAL`
- `BUSINESS`

## Template

```sql
UPDATE subscription_plan 
SET monthly_cost_per_user = '[MONTHLY_AMOUNT]', 
    yearly_cost_per_user = '[YEARLY_AMOUNT]' 
WHERE code = '[PLAN_CODE]';
```

## Update Statements

### STARTER Plan
```sql
UPDATE subscription_plan
SET monthly_cost_per_user = 100,
    yearly_cost_per_user  = 1000
WHERE code = 'STARTER';
```

### PROFESSIONAL Plan
```sql
UPDATE subscription_plan 
SET monthly_cost_per_user = 150, 
    yearly_cost_per_user = 1500 
WHERE code = 'PROFESSIONAL';
```

### BUSINESS Plan
```sql
UPDATE subscription_plan 
SET monthly_cost_per_user = 200, 
    yearly_cost_per_user = 2000
WHERE code = 'BUSINESS';
```

## Verification Query

```sql
SELECT code, monthly_cost_per_user, yearly_cost_per_user 
FROM subscription_plan 
ORDER BY code;
```
