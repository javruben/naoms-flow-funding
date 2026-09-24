#!/usr/bin/env sh
# 1797: LICENSE must exist and be non-empty. --self-test proves the gate can REFUSE.
# A gate with no demonstrated red arm is indistinguishable from `exit 0`.
# Licence for this repository: MIT
set -u
if [ "${1:-}" = "--self-test" ]; then
  if [ -s "__no_such_licence_file__" ]; then
    echo "SELF-TEST FAILED: a file that must not exist reported non-empty" >&2
    exit 1
  fi
  echo "self-test ok: the gate reports absence correctly"
  exit 0
fi
if [ ! -s LICENSE ]; then
  echo "LICENSE is missing or empty. This repository is MIT." >&2
  exit 1
fi
echo "LICENSE present ($(wc -c < LICENSE | tr -d ' ') bytes)"
