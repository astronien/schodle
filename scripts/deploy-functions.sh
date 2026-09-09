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

# Keep going when one function fails, then report. Aborting on the first error
# (set -e) meant a single bad function silently left every later one running
# stale code — db-query sits third alphabetically, so an early failure looked
# like "deploy succeeded" while the fix never shipped.
FAILED=()
for fn in "${FUNCTIONS[@]}"; do
  echo "→ deploying $fn"
  if npx supabase functions deploy "$fn" --project-ref "$PROJECT_REF" --no-verify-jwt; then
    echo "  ✓ $fn"
  else
    echo "  ✗ $fn FAILED"
    FAILED+=("$fn")
  fi
done

echo ""
if [ ${#FAILED[@]} -gt 0 ]; then
  echo "❌ ${#FAILED[@]} of ${#FUNCTIONS[@]} function(s) FAILED to deploy: ${FAILED[*]}"
  echo "   The old version is still live for those. Fix the errors above and re-run."
  exit 1
fi
echo "✅ All ${#FUNCTIONS[@]} functions deployed."

echo ""
echo "Set these secrets in the Supabase dashboard before testing:"
echo "  SCHODLE_SESSION_SECRET   (HMAC-SHA256 signing key for session JWTs)"
echo "  VAPID_PUBLIC_KEY         (Web Push)"
echo "  VAPID_PRIVATE_KEY        (Web Push)"
echo ""
echo "Dashboard → Project Settings → Edge Functions → Manage secrets"
