#!/usr/bin/env bash
# start-dev.sh — Inicia el backend contra Oracle ADB.
# Requiere un archivo .env en este mismo directorio con las variables de entorno.
# Copiar .env.example a .env y completar los valores reales antes de ejecutar.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: No se encontró el archivo .env en $SCRIPT_DIR"
  echo "       Copiar .env.example a .env y completar los valores."
  exit 1
fi

# shellcheck source=.env
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

cd "$SCRIPT_DIR"
./mvnw spring-boot:run
