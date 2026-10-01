#!/usr/bin/env bash
set -Eeuo pipefail

# Installs Docker on Ubuntu/Debian and builds this project's Compose services.
# Run this from the repository root: ./install-vps.sh

if ! command -v apt-get >/dev/null 2>&1; then
  echo "Erreur : ce script prend en charge Ubuntu et Debian (apt-get requis)." >&2
  exit 1
fi

if ! command -v sudo >/dev/null 2>&1 && [ "$(id -u)" -ne 0 ]; then
  echo "Erreur : installe sudo ou exécute ce script en tant que root." >&2
  exit 1
fi

as_root() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  else
    sudo "$@"
  fi
}

compose_file=""
for candidate in compose.yaml compose.yml docker-compose.yaml docker-compose.yml; do
  if [ -f "$candidate" ]; then
    compose_file="$candidate"
    break
  fi
done

if [ -z "$compose_file" ]; then
  echo "Erreur : aucun fichier Compose trouvé. Lance le script depuis la racine du dépôt." >&2
  exit 1
fi

as_root apt-get update
as_root apt-get install -y ca-certificates curl git

if ! command -v docker >/dev/null 2>&1; then
  echo "Installation de Docker..."
  curl -fsSL https://get.docker.com | as_root sh
fi

as_root systemctl enable --now docker

if ! docker compose version >/dev/null 2>&1; then
  echo "Erreur : Docker Compose v2 n'est pas disponible après l'installation de Docker." >&2
  exit 1
fi

echo "Construction des services définis dans $compose_file..."
as_root docker compose -f "$compose_file" build

cat <<'MESSAGE'

Construction terminée. Pour démarrer les services :
  sudo docker compose up -d

Avant le démarrage, configure les variables d'environnement requises par le projet
(par exemple dans un fichier .env). Ne mets pas de vrais secrets dans Git.
MESSAGE
