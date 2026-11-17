#!/bin/sh
set -eu

INIT_MIGRATION="20250817140000_init"

# DB steps app start ko block nahi karte — warna container crash-loop mein chala jata hai
# aur nginx 502 deta hai. Migration masla ho to logs mein dikhega, app live rahegi.
run_migrations() {
  echo "[app] Running database migrations..."
  if npx prisma migrate deploy; then
    return 0
  fi

  echo "[app] migrate deploy failed — legacy DB (db push era) baseline try kar rahe hain..."
  npx prisma migrate resolve --applied "$INIT_MIGRATION" || true
  # Bina --accept-data-loss: destructive change ho to Prisma refuse karega (data safe).
  npx prisma db push || true
  npx prisma migrate deploy || true
}

run_migrations || echo "[app] WARNING: migrations skipped/failed — app phir bhi start ho rahi hai."

if [ "${RUN_DB_SEED:-true}" = "true" ]; then
  echo "[app] Seeding database (if needed)..."
  npx tsx prisma/seed.ts || true
fi

echo "[app] Starting Next.js on 0.0.0.0:3000..."
exec npx next start -H 0.0.0.0 -p 3000
