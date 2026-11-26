#!/usr/bin/env bash
# Smoke-check local foundation: typecheck + unit tests.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
pnpm typecheck
pnpm test
echo "Foundation checks passed."
