# QUOREICH GROUP delivery models

QUOREICH GROUP intends to sell the product in both hosted and customer-installed forms. Keep the deployment and commercial terms for each offer explicit; a deployment toggle does not grant resale rights.

## Hosted service

- QUOREICH GROUP operates the application and infrastructure and sells customer access, onboarding, hosting, and support.
- The application already has a `CLOUD_VERSION` setting and cloud-specific subscription screens. This selects parts of the product experience; it does not by itself implement tenant isolation, hosting operations, billing, support, or licensing rights.
- If using the AGPLv3 option, offer users interacting remotely with the modified service access to the corresponding source under section 13.
- The repository's standard Commercial License only allows limited SaaS use where the software is not the primary product. It says broader SaaS/OEM use requires an Enterprise SaaS License. Obtain written terms for a hosted CMMS product before using a commercial key.

## Customer-installed service

- QUOREICH GROUP installs and configures a separate instance in the customer's infrastructure, then charges separately for installation, migration, updates, and support.
- The repository includes Docker Compose support and per-deployment environment configuration.
- Under AGPLv3, distribute the corresponding source and preserve the required license and copyright notices. Customers retain the freedoms granted by that license.
- The standard Commercial License describes internal use, forbids third-party distribution and sublicensing, and does not grant a general right to resell installations. Do not use it for customer installations unless a signed order form explicitly grants those rights.

## License decision before launch

The software is offered as a choice between AGPLv3 and a commercial license; the rights from those two paths cannot be combined. For either sales channel, choose and document the applicable path before production:

1. Offer the product under AGPLv3 and meet its source and notice obligations; sell deployment, hosting, and support services separately.
2. If QUOREICH GROUP needs additional proprietary rights, request an agreement that explicitly covers white-labeling, reseller distribution to each customer, hosted SaaS/OEM use, modifications, deployment/user limits, and the commercial feature entitlements required.

The self-hosted price or a commercial feature key alone is not evidence of permission to resell the software. Keep the vendor's written authorization with the order form and record the permitted deployment model and entitlements.

## Current technical status

- Set `CLOUD_VERSION=true` for the hosted product experience and `CLOUD_VERSION=false` for customer-installed deployments.
- `LICENSE_KEY` and `LICENSE_FILE_PATH` control commercial feature entitlements; they are separate from subscription plan features.
- The local preview in [Testing licensed features](./Testing%20licensed%20features.md) is for development only. It must not be enabled in either production offer.
- The in-app plan catalog edits plan names and included features. It does not issue customer licenses, manage billing, or establish reseller rights.
