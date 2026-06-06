#!/usr/bin/env bash
# Deploy all Edge Functions to Supabase.
# Usage:  ./scripts/deploy-functions.sh
# Requires: supabase CLI installed and logged in
#           (npx supabase login && npx supabase link --project-ref <ref>)

set -euo pipefail

cd "$(dirname "$0")/.."

FUNCTIONS=(
  verify-password
  change-password
  create-employee
  swap-schedule-shifts
  send-push
)

for fn in "${FUNCTIONS[@]}"; do
  echo "→ deploying $fn"
  supabase functions deploy "$fn" --no-verify-jwt
done

echo ""
echo "Done. Set these secrets in the Supabase dashboard before testing:"
echo "  SCHODLE_SESSION_SECRET   (HMAC-SHA256 signing key for session JWTs)"
echo "  VAPID_PUBLIC_KEY         (Web Push)"
echo "  VAPID_PRIVATE_KEY        (Web Push)"
echo ""
echo "Dashboard → Project Settings → Edge Functions → Manage secrets"
