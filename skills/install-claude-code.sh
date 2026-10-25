#!/usr/bin/env sh
set -eu
TARGET="${1:-$HOME/.claude/skills}"
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
mkdir -p "$TARGET"
for d in "$ROOT"/*; do [ -f "$d/SKILL.md" ] || continue; n="$(basename "$d")"; mkdir -p "$TARGET/$n"; cp "$d/SKILL.md" "$TARGET/$n/"; [ ! -f "$d/TESTS.md" ] || cp "$d/TESTS.md" "$TARGET/$n/"; done
printf "Installed skills to %s\n" "$TARGET"
