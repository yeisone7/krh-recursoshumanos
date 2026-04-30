#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

bash scripts/01_link_project.sh
bash scripts/02_apply_database.sh
bash scripts/03_set_secrets.sh
bash scripts/04_deploy_edge_functions.sh
bash scripts/06_smoke_test.sh

echo "Despliegue base completado. Ejecuta scripts/05_optional_cron_jobs.sql manualmente si necesitas jobs programados."
