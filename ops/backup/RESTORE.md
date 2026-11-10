# Sauvegardes QPM : fonctionnement et restauration

`ops/backup/qpm-backup.sh` s’exécute chaque nuit à 02:30 (crontab de l’utilisateur `abdouramane` sur le VPS) et écrit dans `~/qpm-backups/qpm-AAAAMMJJ-HHMMSS/` :

| Fichier | Contenu |
| --- | --- |
| `atlas.dump` | Base applicative QPM (`pg_dump -Fc`, vérifiée par `pg_restore -l`) |
| `licenses.dump` | Base de l’autorité de licences |
| `minio.tar.gz` | Fichiers MinIO (pièces jointes, logos, PDF émis), hors zone temporaire `.minio.sys/tmp` |
| `SHA256SUMS` | Empreintes des trois fichiers |

Rétention : 14 jours (`RETENTION_DAYS`). Journal : `~/qpm-backups/backup.log`. Dernier succès : `~/qpm-backups/last-success` — une date de plus de 24 h signale une sauvegarde manquée.

**Copie hors serveur (à configurer)** : tant que `BACKUP_RSYNC_TARGET` n’est pas défini, les sauvegardes restent sur le même disque que la production et ne protègent pas contre la perte du VPS. Définir dans la ligne crontab `BACKUP_RSYNC_TARGET=utilisateur@hote:/chemin` (clé SSH sans mot de passe dédiée à cet usage).

## Vérifier une sauvegarde

```bash
cd ~/qpm-backups/qpm-AAAAMMJJ-HHMMSS && sha256sum -c SHA256SUMS
```

## Test de restauration (sans toucher la production)

```bash
docker run -d --rm --name qpm-restore-test --network none \
  -e POSTGRES_PASSWORD=test -e POSTGRES_USER=restore -e POSTGRES_DB=restored postgres:16-alpine
# attendre « PostgreSQL init process complete » dans `docker logs qpm-restore-test`
docker exec -i qpm-restore-test pg_restore -U restore -d restored --no-owner --no-privileges < atlas.dump
docker exec qpm-restore-test psql -U restore -d restored -c "select count(*) from work_order"
docker stop qpm-restore-test
```

Test réalisé le 10 novembre 2026 : 175 tables, nombres d’ordres de travail, de pièces et de migrations identiques à la production.

## Restauration réelle (incident)

À faire hors heures d’utilisation, après avoir prévenu les utilisateurs. Une restauration remplace les données saisies depuis la sauvegarde.

1. Arrêter l’API : `docker compose stop api` (depuis `~/Projet/cmms`).
2. Sauvegarder l’état courant, même endommagé : `./ops/backup/qpm-backup.sh`.
3. Restaurer la base :
   ```bash
   docker compose exec -T postgres sh -c 'dropdb -U "$POSTGRES_USER" atlas && createdb -U "$POSTGRES_USER" atlas'
   docker compose exec -T postgres sh -c 'pg_restore -U "$POSTGRES_USER" -d atlas --no-owner' < atlas.dump
   ```
4. Restaurer les fichiers MinIO si nécessaire (MinIO arrêté) :
   ```bash
   docker compose stop minio
   docker run --rm -v atlas-cmms_minio_data:/data -v "$PWD":/backup:ro --entrypoint sh postgres:16-alpine \
     -c 'cd /data && tar -xzf /backup/minio.tar.gz'
   docker compose start minio
   ```
5. Redémarrer : `docker compose up -d api && docker compose restart nginx`, puis vérifier `https://eam.quoreichgroup.bf/api/health-check`.
