#!/usr/bin/env sh
# 1797: package-scoped type check.
#
# ⚠️ THIS IS EXPECTED TO FAIL until the repository is made standalone-buildable.
# At extraction time the package still imports bare `@naoms/*` specifiers with no
# import map in the repo. That is a real defect, not a configuration detail, and
# this script is deliberately NOT weakened to hide it. Fix it by adding a
# deno.json whose import map resolves those specifiers, or by vendoring them.
set -u
files=$(git ls-files '*.ts' | grep -v '^docs/' || true)
if [ -z "$files" ]; then
  echo "INSTRUMENT FAILURE: no .ts files found to check" >&2
  exit 1
fi
echo "checking $(printf '%s\n' "$files" | wc -l | tr -d ' ') modules"
# shellcheck disable=SC2086
exec deno check $files
