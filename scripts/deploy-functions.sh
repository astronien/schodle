#!/usr/bin/env bash
# Deploy all Edge Functions to Supabase.
# Usage:  ./scripts/deploy-functions.sh
# Requires: supabase CLI installed and logged in
#           (npx supabase login && npx supabase link --project-ref <ref>)

set -euo pipefail

cd "$(dirname "$0")/.."

# Auto-detect project ref from .env / .env.local
PROJECT_REF=""
for env_file in .env .env.local; do
  if [ -f "$env_file" ] && grep -q "VITE_SUPABASE_URL" "$env_file"; then
    PROJECT_REF=$(grep "VITE_SUPABASE_URL" "$env_file" | sed -E 's|.*https://([^.]+)\.supabase\.co.*|\1|' | head -1)
    break
  fi
done
if [ -z "$PROJECT_REF" ]; then
  echo "ERROR: Could not detect project ref from .env / .env.local (need VITE_SUPABASE_URL)"
  exit 1
fi

# Derived from the directory rather than hardcoded — a hardcoded list silently
# skipped db-query, reset-employee-password and self-reset-password, so those
# ran stale code in production while the deploy reported success.
FUNCTIONS=()
for dir in supabase/functions/*/; do
  [ -f "$dir/index.ts" ] || continue
  FUNCTIONS+=("$(basename "$dir")")
done

if [ ${#FUNCTIONS[@]} -eq 0 ]; then
  echo "ERROR: no functions found under supabase/functions/"
  exit 1
fi
echo "Deploying ${#FUNCTIONS[@]} functions: ${FUNCTIONS[*]}"

for fn in "${FUNCTIONS[@]}"; do
  echo "→ deploying $fn"
  npx supabase functions deploy "$fn" --project-ref "$PROJECT_REF" --no-verify-jwt
done

echo ""
echo "Done. Set these secrets in the Supabase dashboard before testing:"
echo "  SCHODLE_SESSION_SECRET   (HMAC-SHA256 signing key for session JWTs)"
echo "  VAPID_PUBLIC_KEY         (Web Push)"
echo "  VAPID_PRIVATE_KEY        (Web Push)"
echo ""
echo "Dashboard → Project Settings → Edge Functions → Manage secrets"
