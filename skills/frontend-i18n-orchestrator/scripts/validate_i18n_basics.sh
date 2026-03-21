#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"
cd "$ROOT"

if ! command -v rg >/dev/null 2>&1; then
  echo "[ERROR] rg (ripgrep) is required" >&2
  exit 2
fi

echo "[INFO] i18n baseline validation"

locale_files="$({ rg --files -g '*{locale,locales,i18n}*' 2>/dev/null || true; } | wc -l | tr -d ' ')"
hardcoded_left="$({ rg -n --glob '!**/*.json' --glob '!**/*.md' --glob '!**/*.yml' --glob '!**/*.yaml' --glob '!**/*.svg' --glob '!**/*.lock' "[\"'][^\"']{3,}[\"']" src app pages components 2>/dev/null || true; } | wc -l | tr -d ' ')"
missing_key_todo="$({ rg -n 'TODO_I18N|MISSING_TRANSLATION|__MISSING__' src app pages components 2>/dev/null || true; } | wc -l | tr -d ' ')"

printf "locale files: %s\n" "$locale_files"
printf "hardcoded string candidates: %s\n" "$hardcoded_left"
printf "known missing markers: %s\n" "$missing_key_todo"

if [ "$locale_files" -eq 0 ]; then
  echo "[WARN] no locale/i18n files detected"
fi

if [ "$hardcoded_left" -gt 0 ]; then
  echo "[WARN] hardcoded string candidates still exist"
fi

if [ "$missing_key_todo" -gt 0 ]; then
  echo "[WARN] unresolved missing translation markers found"
fi

echo "[OK] baseline validation finished"
