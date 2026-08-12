#!/usr/bin/env bash
# Regenerate web/src/api/generated.ts from the server's @WireType records.
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${repository_root}"

./server/mvnw -f server/pom.xml --batch-mode --no-transfer-progress \
  -Dapi.types.write=true \
  -Dtest=ApiTypeContractTest \
  -DfailIfNoSpecifiedTests=false \
  -Dsurefire.failIfNoSpecifiedTests=false \
  test

pnpm --dir web exec oxfmt src/api/generated.ts >/dev/null

echo "Regenerated web/src/api/generated.ts"
