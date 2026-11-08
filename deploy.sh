#!/usr/bin/env bash
# Deploiement PerformCar EasyDevis sur ce serveur.
#   ./deploy.sh db        cree role + base sur le PostgreSQL 17 natif (port 1521) et installe le schema (idempotent)
#   ./deploy.sh nginx     installe le vhost nginx :8082 et ouvre le port (une fois)
#   ./deploy.sh backend   build + migrations alembic + (re)demarre API, worker, redis
#   ./deploy.sh frontend  build + (re)demarre le frontend Next.js
#   ./deploy.sh both      backend puis frontend
# Secrets : backend/.env (POSTGRES_*, SECRET_KEY, FIRST_SUPERUSER...).
set -euo pipefail
cd "$(dirname "$0")"
COMPOSE=(docker compose -f deploy/docker-compose.yml)
PGPORT=1521

envval() { grep -E "^$1=" backend/.env | tail -1 | cut -d= -f2- | sed -E 's/^"(.*)"$/\1/'; }

wait_ok() { # url, label
  for _ in $(seq 1 40); do curl -fsS -o /dev/null "$1" && { echo "OK  $2"; return; }; sleep 3; done
  echo "ECHEC $2 ($1)" >&2; exit 1
}

deploy_db() {
  local db user pw
  db=$(envval POSTGRES_DB); user=$(envval POSTGRES_USER); pw=$(envval POSTGRES_PASSWORD)
  local psu=(sudo -u postgres psql -X -p "$PGPORT" -v ON_ERROR_STOP=1)
  if ! "${psu[@]}" -Atc "select 1 from pg_roles where rolname='$user'" | grep -q 1; then
    "${psu[@]}" -v u="$user" -v p="$pw" <<<"CREATE ROLE :\"u\" LOGIN PASSWORD :'p';"
  fi
  if ! "${psu[@]}" -Atc "select 1 from pg_database where datname='$db'" | grep -q 1; then
    "${psu[@]}" -d postgres -v db_name="$db" -v db_owner="$user" -f database/00_create_database.psql
  fi
  if ! "${psu[@]}" -d "$db" -Atc "select to_regclass('public.alembic_version')" | grep -q alembic_version; then
    PGPASSWORD="$pw" psql -X -h 127.0.0.1 -p "$PGPORT" -U "$user" -d "$db" -f database/install.psql
    PGPASSWORD="$pw" psql -X -h 127.0.0.1 -p "$PGPORT" -U "$user" -d "$db" -v ON_ERROR_STOP=1 -f database/verify.sql
  else
    echo "Schema deja present : rien a installer (les migrations passent par './deploy.sh backend')."
  fi
  # Acces depuis les conteneurs Docker (meme regle que recruitment/keycloak).
  local hba=/etc/postgresql/17/main/pg_hba.conf line="host    $db      $user      172.16.0.0/12      scram-sha-256"
  if ! sudo grep -qF "$line" "$hba"; then
    echo "$line" | sudo tee -a "$hba" >/dev/null
    sudo systemctl reload postgresql@17-main
  fi
}

deploy_nginx() {
  sudo cp deploy/nginx/performcar.conf /etc/nginx/sites-available/performcar.conf
  sudo ln -sf /etc/nginx/sites-available/performcar.conf /etc/nginx/sites-enabled/performcar.conf
  sudo nginx -t && sudo systemctl reload nginx
  sudo ufw allow 8082/tcp comment 'PerformCar via nginx'
}

deploy_backend() {
  "${COMPOSE[@]}" build backend
  "${COMPOSE[@]}" up -d redis
  "${COMPOSE[@]}" run --rm --no-deps backend uv run alembic upgrade head
  "${COMPOSE[@]}" up -d --force-recreate backend worker
  wait_ok http://127.0.0.1:8020/api/v1/health/ready "backend (API + base + redis)"
}

deploy_frontend() {
  "${COMPOSE[@]}" build frontend
  "${COMPOSE[@]}" up -d --force-recreate --no-deps frontend
  wait_ok http://127.0.0.1:3020/fr "frontend"
}

[[ -f backend/.env ]] || { echo "backend/.env manquant (voir backend/.env.example)" >&2; exit 1; }
case "${1:-}" in
  db) deploy_db ;;
  nginx) deploy_nginx ;;
  backend) deploy_backend ;;
  frontend) deploy_frontend ;;
  both) deploy_backend; deploy_frontend ;;
  *) sed -n '2,8p' "$0"; exit 1 ;;
esac
