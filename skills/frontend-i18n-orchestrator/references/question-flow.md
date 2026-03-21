# Question Flow (Ask-on-Ambiguity)

Use this template after auto-detection. Ask only unresolved items.

## Response Template

1. Detection summary (facts)
2. Ambiguities (why they are ambiguous)
3. Minimal decisions required

## Minimal Decision Set

1. Target locales.
2. Default locale and fallback policy.
3. URL strategy for localization.
4. Translation source strategy.
5. Rollout mode (gradual vs all-at-once).
6. CI strictness activation timing.

## Example Prompt

I finished auto-detection and confirmed the stack and current i18n state. I only need these decisions before migration:
- Target locales:
- Default locale + fallback:
- URL strategy:
- Translation source:
- Rollout mode:
- CI strictness timing:

## Rule

If an item is already clear in project docs/config and confidence is high, do not ask it again.
