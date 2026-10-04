# Upgrading Atlas CMMS

## 1. Backup first

Before upgrading, run a full backup following the [Backup Guide](./Backup.md).

- **Windows:** `.\atlas-backup.ps1 backup`
- **Linux:** `./atlas-backup.sh backup`

## 2. Update the sources and review local configuration

The Compose stack builds the API and frontend from the checked-out `api/` and
`frontend/` directories. Update the repository using your normal source control
workflow, and review local changes before replacing `docker-compose.yml` or
`nginx.conf`. Keep the local build contexts and image tags in Compose.

## 3. Check for new environment variables

Compare your current `.env` against the latest [.env.example](https://github.com/grashjs/cmms/raw/main/.env.example). Optionally, add any new variables you might need that are missing in your `.env`.

Also check the [README](https://github.com/grashjs/cmms) for documentation on new environment variables.

## 4. Restart

```bash
docker compose up -d --build api frontend
docker compose restart nginx
```

This rebuilds the application images from local source. PostgreSQL and MinIO
volumes stay attached to their existing services.

## 5. If something goes wrong

1. Stop the stack:
   ```bash
   docker compose down
   ```
2. Restore from the backup you created in step 1 (see [Backup Guide](./Backup.md)).
3. Re-pull the previous version's images and restart.

---

**Tip:** To upgrade to a specific version instead of latest, download the config files from the release tag you want (e.g. `https://github.com/Grashjs/cmms/blob/v1.8.0/docker-compose.yml`) and pin the image tags in your `docker-compose.yml` accordingly.
