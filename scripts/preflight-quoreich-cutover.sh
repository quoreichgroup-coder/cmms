#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${1:-$ROOT_DIR/.env}"
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"
OVERRIDE_FILE="$ROOT_DIR/docker-compose.license.yml"

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

pass() {
  printf 'PASS: %s\n' "$1"
}

[[ -f "$ENV_FILE" ]] || fail "environment file not found: $ENV_FILE"
[[ -f "$COMPOSE_FILE" && -f "$OVERRIDE_FILE" ]] || fail 'application Compose files are missing'

# Read simple Compose KEY=value entries without evaluating the file as shell.
env_value() {
  local key="$1"
  local value
  value="$(awk -v key="$key" '
    $0 ~ "^[[:space:]]*(export[[:space:]]+)?" key "=" {
      sub("^[[:space:]]*(export[[:space:]]+)?[^=]*=", "")
      sub("[[:space:]]+#.*$", "")
      if (length($0) >= 2 && ((substr($0, 1, 1) == "\"" && substr($0, length($0), 1) == "\"") || (substr($0, 1, 1) == "\047" && substr($0, length($0), 1) == "\047")))
        $0 = substr($0, 2, length($0) - 2)
      value = $0
    }
    END { print value }
  ' "$ENV_FILE")"
  printf '%s' "$value"
}

provider="$(env_value LICENSE_PROVIDER)"
authority_url="$(env_value LICENSE_AUTHORITY_URL)"
public_key_path="$(env_value LICENSE_PUBLIC_KEY_PATH)"
cache_path="$(env_value LICENSE_CACHE_PATH)"
fingerprint_path="$(env_value LICENSE_FINGERPRINT_PATH)"
environment="$(env_value LICENSE_ENVIRONMENT)"

[[ "${provider^^}" == 'QUOREICH' ]] || fail 'LICENSE_PROVIDER must be QUOREICH'
pass 'license provider is QUOREICH'

[[ -n "$authority_url" ]] || fail 'LICENSE_AUTHORITY_URL is empty'
[[ "$authority_url" =~ ^https?://[^/]+/?$ ]] || fail 'LICENSE_AUTHORITY_URL must be an absolute HTTP(S) origin without a path'
if [[ "$authority_url" == http://* && "$authority_url" != 'http://license-authority:8080' ]]; then
  fail 'remote license authorities must use HTTPS; plain HTTP is allowed only on the private authority Docker network'
fi
pass 'license authority URL is configured'

public_key_path="${public_key_path:-/run/license-public/ed25519-public.pem}"
[[ "$public_key_path" == '/run/license-public/ed25519-public.pem' ]] || fail 'Compose mounts the public key only at /run/license-public/ed25519-public.pem'
public_key_file="$ROOT_DIR/license-public/ed25519-public.pem"
[[ -s "$public_key_file" ]] || fail 'license-public/ed25519-public.pem is missing or empty'
key_details="$(openssl pkey -pubin -in "$public_key_file" -text -noout 2>&1)" || fail 'public key cannot be parsed by OpenSSL'
[[ "$key_details" == *ED25519* ]] || fail 'configured public key is not Ed25519'
pass 'Ed25519 public key exists and is readable'

cache_path="${cache_path:-/app/license-cache/license.lease}"
fingerprint_path="${fingerprint_path:-/app/license-cache/instance-id}"
[[ "$cache_path" == /app/license-cache/* ]] || fail 'LICENSE_CACHE_PATH must remain inside the persistent /app/license-cache mount'
[[ "$fingerprint_path" == /app/license-cache/* ]] || fail 'LICENSE_FINGERPRINT_PATH must remain inside the persistent /app/license-cache mount'
pass 'lease and installation fingerprint use the persistent cache mount'

environment="${environment:-PRODUCTION}"
[[ "$environment" == 'PRODUCTION' || "$environment" == 'PREPRODUCTION' ]] || fail 'LICENSE_ENVIRONMENT must be PRODUCTION or PREPRODUCTION'
pass 'license environment value is valid'

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" -f "$OVERRIDE_FILE" config --quiet \
  || fail 'Docker Compose configuration is invalid'
volumes="$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" -f "$OVERRIDE_FILE" config --volumes 2>/dev/null)" \
  || fail 'could not inspect configured Compose volumes'
grep -Fxq 'license_cache' <<<"$volumes" || fail 'license_cache is not declared as a persistent Compose volume'
pass 'Compose is valid and retains the license_cache volume'

docker network inspect license-authority_default >/dev/null 2>&1 \
  || fail 'license-authority_default network is absent; start the authority Compose project first'
pass 'application can join the existing authority network'

printf 'Preflight passed. No services were started, stopped, or rebuilt.\n'
printf 'Configured licensing environment: %s\n' "$environment"
printf 'Next: verify the authority health endpoint, then deploy using the documented Compose override.\n'
