#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"
OUT="${2:-$ROOT/i18n-profile.json}"

if ! command -v rg >/dev/null 2>&1; then
  echo "[ERROR] rg (ripgrep) is required" >&2
  exit 2
fi

cd "$ROOT"

has_file() {
  [ -f "$1" ] && echo true || echo false
}

PKG_JSON="{}"
if [ -f package.json ]; then
  PKG_JSON="$(cat package.json)"
fi

framework="unknown"
for candidate in next nuxt vue react vite; do
  if printf "%s" "$PKG_JSON" | rg -q "\"$candidate\""; then
    framework="$candidate"
    break
  fi
done

pm="unknown"
if [ "$(has_file pnpm-lock.yaml)" = true ]; then pm="pnpm"; fi
if [ "$(has_file yarn.lock)" = true ]; then pm="yarn"; fi
if [ "$(has_file package-lock.json)" = true ]; then pm="npm"; fi
if [ "$(has_file bun.lockb)" = true ] || [ "$(has_file bun.lock)" = true ]; then pm="bun"; fi

i18n_libs_raw="$({ printf "%s" "$PKG_JSON" | rg -o '"(i18next|react-i18next|next-intl|vue-i18n|@nuxtjs/i18n)"' || true; } | tr -d '"' | sort -u | tr '\n' ',' | sed 's/,$//')"
locale_files_count="$({ rg --files -g '*{locale,locales,i18n}*' 2>/dev/null || true; } | wc -l | tr -d ' ')"
hardcoded_candidates="$({ rg -n --glob '!**/*.json' --glob '!**/*.md' --glob '!**/*.yml' --glob '!**/*.yaml' --glob '!**/*.svg' --glob '!**/*.lock' "[\"'][^\"']{3,}[\"']" src app pages components 2>/dev/null || true; } | wc -l | tr -d ' ')"
seo_lang_hints="$({ rg -n '<html[^>]*lang=' . 2>/dev/null || true; } | wc -l | tr -d ' ')"
hreflang_hints="$({ rg -n 'hreflang' . 2>/dev/null || true; } | wc -l | tr -d ' ')"
intl_usage="$({ rg -n 'Intl\.(DateTimeFormat|NumberFormat|RelativeTimeFormat)|toLocale(Date|String)' src app pages components 2>/dev/null || true; } | wc -l | tr -d ' ')"

cat > "$OUT" <<JSON
{
  "framework": "$framework",
  "packageManager": "$pm",
  "hasPackageJson": $(has_file package.json),
  "hasExistingI18n": $([ -n "$i18n_libs_raw" ] && echo true || echo false),
  "i18nLibraries": [$(printf "%s" "$i18n_libs_raw" | awk -F',' '{for (i=1;i<=NF;i++) if ($i!="") printf "%s\"%s\"", (c++?",":""), $i }')],
  "localeFilesCount": $locale_files_count,
  "hardcodedStringCandidates": $hardcoded_candidates,
  "seoHints": {
    "htmlLangOccurrences": $seo_lang_hints,
    "hreflangOccurrences": $hreflang_hints
  },
  "localizationApiHints": {
    "intlUsageOccurrences": $intl_usage
  },
  "confidence": {
    "framework": $([ "$framework" = "unknown" ] && echo 0.2 || echo 0.9),
    "existingI18n": $([ -n "$i18n_libs_raw" ] && echo 0.9 || echo 0.5)
  },
  "requiresUserDecisions": [
    "targetLocales",
    "defaultLocaleAndFallback",
    "urlLocalizationStrategy",
    "translationSourceStrategy",
    "rolloutMode",
    "ciStrictnessTiming"
  ]
}
JSON

echo "[OK] Wrote $OUT"
