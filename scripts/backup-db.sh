#!/bin/sh
# Backup diario de la base de datos Postgres corriendo en docker-compose.
# Uso recomendado: agregar a crontab del host, ej:
#   0 3 * * * /ruta/al/repo/scripts/backup-db.sh >> /var/log/inflacion-app-backup.log 2>&1
set -eu

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$REPO_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

mkdir -p "$BACKUP_DIR"

cd "$REPO_DIR"
set -a
[ -f .env ] && . ./.env
set +a

docker compose exec -T postgres pg_dump -U "$DB_USER" "$DB_DATABASE" \
  | gzip > "$BACKUP_DIR/backup_${TIMESTAMP}.sql.gz"

find "$BACKUP_DIR" -name 'backup_*.sql.gz' -mtime +"$RETENTION_DAYS" -delete
