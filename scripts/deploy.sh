#!/usr/bin/env bash
# 生产机上线脚本（由 GitHub Actions self-hosted runner 调用）
set -euo pipefail

ROOT="${DEPLOY_ROOT:-/www/wwwroot/mc.aikex.ink}"
cd "$ROOT"

# Actions runner 与站点目录属主可能不同
git config --global --add safe.directory "$ROOT" 2>/dev/null || true

echo "[deploy] $(date -Is) pull…"
git fetch origin main
git reset --hard origin/main

cd "$ROOT/server"
if [[ ! -f ecosystem.config.cjs ]]; then
  cp ecosystem.config.cjs.example ecosystem.config.cjs
  echo "[deploy] WARN: created ecosystem.config.cjs from example — set MC_OWNER_KEY"
fi
npm install --omit=dev
mkdir -p data
[[ -f data/admins.json ]] || cp data/admins.json.example data/admins.json 2>/dev/null || echo '{"version":1,"admins":[]}' > data/admins.json
[[ -f data/catalog.json ]] || echo '{"version":1,"mobs":[],"items":[],"structures":[]}' > data/catalog.json

pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
echo "[deploy] done"
