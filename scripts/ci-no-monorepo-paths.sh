#!/usr/bin/env sh
# 1797: no monorepo-shaped paths may survive the extraction. If src/packages/ or
# .naoms/roadmap/ reappear, either the filter regressed or someone re-added a
# monorepo path by hand. Package contents belong at the repo root and roadmap
# items under docs/roadmap/.
set -u
n=$(git ls-files | grep -cE '^(src/packages/|\.naoms/roadmap/)' || true)
if [ "$n" -ne 0 ]; then
  echo "FAIL: $n monorepo-shaped path(s) present:" >&2
  git ls-files | grep -E '^(src/packages/|\.naoms/roadmap/)' >&2
  exit 1
fi
# Positive control on the same instrument: it must be able to COUNT something,
# otherwise a broken grep would report 0 and read as a pass.
d=$(git ls-files | grep -c '^docs/' || true)
if [ "$d" -eq 0 ]; then
  echo "INSTRUMENT FAILURE: found no docs/ paths either, so the 0 above proves nothing" >&2
  exit 1
fi
echo "ok: 0 monorepo paths, and the instrument sees $d docs/ paths (control passed)"
