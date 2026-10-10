# QPM UI/UX and application assessment — executive summary

**Date:** 2026-10-10 · **Scope:** current repository, Web and native Mobile · **Mode:** assessment only; no application code changed.

## Decision-ready summary

The repository contains a broad CMMS/EAM product foundation across work orders, requests, assets/locations, preventive maintenance/meters, inventory, purchase orders, people/teams, vendors/customers, analytics, settings, licensing and company profile. The declared baseline is verified in package files: React 17 + TypeScript + MUI 5/Emotion/Redux Toolkit/React Router on web; Expo 53 + React Native 0.79 + React 19 + Paper/React Navigation/Redux Toolkit on mobile. The mobile source version is 1.0.55. No build or installed artifact for this version is confirmed by this assessment.

Counting rules matter: the web route files contain **110 `element:` render declarations**, including one commented declaration, route layouts/wrappers and redirects. Excluding the commented entry and 3 redirects gives **106 active render destinations** (screen/layout entries; dynamic IDs do not multiply the count). Mobile navigation declares **76 registered screen destinations** across stack, auth/superuser stacks and bottom tabs. There are **97 files under `mobile/screens`**, including detail tabs and nested screen implementations. Reusable UI source modules total **96**: 59 under the two shared web component directories and 37 under `mobile/components`. These are module counts, not a claim that all are unique primitives or shared cross-platform.

The highest delivery risk is operational rather than visual. Recent user-provided logs show repeated API startup failure during JPA schema validation after Liquibase reported no pending changesets; `/api/health-check` returned 502. Runtime walkthrough, responsive verification, current screenshots and physical-device evaluation were unavailable here. Accordingly, no visual issue is presented as a runtime-confirmed defect. The detailed severity register separates confirmed repository facts from hypotheses.

## Current recommendation

1. Restore a stable API and establish the current web/mobile baseline on a non-production test instance.
2. Complete the mining pilot journeys from `docs/ORIENTATION-PRODUIT.md` and `docs/PILOTE-MINE-CONVOYEUR.md`, including PM and analytics checks.
3. Observe the three primary roles and their current tasks; establish measured task baselines.
4. Research external references and compare design directions before prototyping a major navigation or visual-system change.
5. Pilot redesign on Work Orders/Requests + Asset 360, then extend based on evidence.

AI features are explicitly outside redesign scope. Keep the approved mono-company product direction. Web and native must use their respective component systems while sharing terminology and design tokens where practical.

## Top opportunities

The ten opportunities, ranked with evidence and constraints, are in `05-UX-ISSUES.md`. The largest themes are: consistent API failure recovery; task-centered work-order navigation; mobile-first technician execution; lower PM configuration complexity; a coherent equipment 360 view; one table/list pattern; visible save and validation feedback; clear permissions/entitlements; accessible industrial contrast/touch targets; and consistent document identity.

## Deliverables and evidence limits

See `02-APPLICATION-ARCHITECTURE.md` through `09-RESEARCH-REQUIREMENTS.md`, plus `screen-inventory.json`. Repository evidence was inspected; automated tests and mutating UI actions were not run. Browser/API and physical device observations must be added in the runtime validation phase.
