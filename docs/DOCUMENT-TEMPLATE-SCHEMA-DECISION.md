# QPM — proposition de schéma DOC-04 (templates versionnés)

**État :** décision approuvée le 22 octobre 2026; DOC-04/05 implémentés localement. La migration additive a été rejouée sur PostgreSQL 16 jetable et validée par Hibernate `ddl-auto=validate`; aucune base de production n’a été modifiée.

## Décision recommandée

Étendre le monolithe Spring Boot/PostgreSQL avec un registre de types et deux tables de templates/version. Garder `GeneratedDocument` et `ReportConfig` compatibles. Les templates enregistrent une configuration JSON déclarative; le serveur valide toutes les liaisons via les providers enregistrés. Les types standard et tenant-custom sont des données de registre, pas une enum Java ni une page par type.

Le premier incrément active uniquement `WORK_ORDER` avec le provider WO déjà protégé par l’allowlist. WR et PO seront activés ultérieurement après branchement de providers réels; aucun type Purchase Request ne sera enregistré tant qu’aucune entité PR n’existe. Aucun HTML, SQL, JavaScript, URL ou expression de template fournie par le tenant ne sera exécuté.

## Schéma proposé

| Table | Colonnes importantes | Invariants |
| --- | --- | --- |
| `document_type` | `id`, `company_id` nullable pour types système, `code`, `name`, `category`, `description`, `provider_code`, `system_managed`, `active`, audit | Type système protégé; type tenant unique par `(company_id, code)`; provider doit exister dans le registre Java autorisé; aucun tenant ne peut modifier un type système. |
| `document_template` | `id`, `company_id`, `document_type_id`, `code`, `name`, `description`, `style`, `engine`, `status`, `draft_version_id`, `published_version_id`, `default_scope`, `is_default`, `lock_version`, audit | Toute opération de tenant vérifie société + rôle; un seul défaut par type et scope avec index PostgreSQL partiel; mise à jour concurrente protégée par `@Version`. |
| `document_template_version` | `id`, `template_id`, `version_number`, `schema_version`, `configuration JSONB`, `status`, `created_by`, `created_at`, `published_by`, `published_at` | Unique `(template_id, version_number)`; versions publiées immuables; le document émis référence ensuite la version exacte. Les brouillons ne sont pas utilisés dans l’émission officielle. |

Les IDs utilisent les conventions déjà présentes. Les clés étrangères de template/version sont `ON DELETE RESTRICT`; l’archivage remplace la suppression pour conserver les références d’archives. `GeneratedDocument.template_version` reste lisible pour les anciennes archives; la migration DOC-04/05 ajoute une FK nullable `template_version_id`, avec `NULL` pour les documents `work-order-report-v1` existants.

## Configuration JSON v1.0

La v1 décrit seulement les paramètres déjà utiles au rapport WO. Le schéma serveur refuse les propriétés inconnues, les bindings où `valueSupported=false`, les tailles hors liste et toute donnée active/exécutable.

```json
{
  "schemaVersion": "1.0",
  "documentType": "WORK_ORDER",
  "provider": "WORK_ORDER",
  "style": "CLASSIC",
  "page": {
    "size": "A4",
    "orientation": "LANDSCAPE",
    "marginMm": 10
  },
  "visibleFields": ["workOrder.customId", "workOrder.title", "asset.name"],
  "options": {
    "showPageNumbers": true,
    "repeatTableHeader": true
  }
}
```

Bindings v1 sont des clés de catalogue stables, jamais des expressions Java/Thymeleaf. Les champs variables (`parts`, `labor`, `signature`, `customFields`, tâches, commentaires, historique et pièces jointes) restent indisponibles tant que le provider/contrôle d’accès n’est pas livré. Des composants de mise en page (texte, tableau répété, logo, QR) viendront dans une version ultérieure; ils ne sont pas requis pour stocker le premier template configurable.

## Lifecycle et sécurité

1. Décision initiale : la gestion utilise les droits déjà présents, propriétaire de société ou rôle ayant `SETTINGS.view` et `SETTINGS.editOther`. Cette règle est conservée comme compatibilité pour les rôles existants.
2. La prévisualisation de brouillon exige un WO lisible par l’utilisateur et résout les bindings par `POST /work-orders/{id}/report/preview-data`.
3. La publication valide le type, le provider, chaque champ, la page, le style et les options; elle crée un snapshot de version publiée. Les versions publiées ne sont pas modifiables et restent sélectionnables pour audit.
4. Le flux `ReportConfig` reste disponible. DOC-05 ajoute l’aperçu non archivé et l’émission depuis une version publiée, en enregistrant `templateVersion`, `template_version_id` et un snapshot sans réécrire les archives historiques.
5. Toutes les requêtes dérivent `company_id` de l’utilisateur authentifié; le client ne transmet jamais de tenant. L’accès à chaque WO reste contrôlé par `canBeViewedBy` et les règles d’émission existantes.

Ne pas introduire un moteur de jobs, Chromium, Jasper ou Crystal dans DOC-04. Le rendu synchronisé actuel reste la voie de compatibilité; les performances seront mesurées avant DOC-10.

## Migration et rollback

- Migration strictement additive : créer les trois tables, contraintes et index; aucun `UPDATE` ou `DELETE` des données métier. Enregistrer le type système `WORK_ORDER` comme seed idempotent ou le fournir par registre code, après décision sur sa modification par tenant.
- `liquibase rollback` supprime uniquement les nouvelles tables/index dans l’ordre inverse **seulement si aucune version/template n’a été créée**. Après création de données, rollback applicatif = désactiver les nouvelles routes/feature flag et garder les tables; pas de suppression de données.
- Vérifier `updateSQL`, `validate`, migration sur copie de base avec le volume de changementsets actuel, puis démarrage Hibernate `ddl-auto=validate`. Déploiement seulement après les tests et sauvegarde habituelle; aucune migration production n’est réalisée par cette proposition.
- Le changelog est référencé dans `master.xml` pour participer aux validations du dépôt; il reste non exécuté et non déployé tant que `updateSQL`, validation et migration sur une copie PostgreSQL n’ont pas réussi.

## Décisions confirmées

- Gestion des templates : propriétaire, rôle avec permission dédiée `DOCUMENT_TEMPLATES.view` + `DOCUMENT_TEMPLATES.editOther`, ou rôle existant avec `SETTINGS.view` + `SETTINGS.editOther`. `DOCUMENT_TEMPLATES` est ajouté à la fin de l’enum pour préserver les valeurs ordinales déjà stockées; aucune migration de schéma n’est requise. L’émission de rapports sur un WO ou Request conserve les autorisations source DOC-01/DOC-07.
- Types système non éditables; une société crée ses templates sur un type système.
- Portée du template par défaut : société entière en v1; aucun cloisonnement par site n’est supposé.
- Conserver `ReportConfig` et le rendu courant comme fallback jusqu’à validation Web/Mobile de DOC-05/08.

## Implémentation locale (22 octobre 2026)

DOC-03 fournit les données allowlistées WO et indique `valueSupported` dans le catalogue. DOC-04 comprend les entités et repositories `DocumentType`, `DocumentTemplate`, `DocumentTemplateVersion`, le registre des providers, le validateur JSON v1, les routes de bibliothèque et une migration additive avec garde en base contre la mutation/suppression des versions publiées. DOC-05 ajoute le rendu PDF, l’aperçu sans archivage, l’émission versionnée et le sélecteur Web. Le replay complet de migration sur PostgreSQL 16 jetable, Hibernate `ddl-auto=validate`, compilation backend et tests ciblés passent. Le build CRA complet et la recette navigateur authentifiée restent à faire; l’ancienne génération conserve son fallback. La production n’a pas été modifiée.
