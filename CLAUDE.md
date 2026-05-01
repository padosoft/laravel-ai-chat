# Project conventions for Claude

Rules every Claude session in this repo must follow on top of the global config.

## R1 — Keep the README badges in sync with the codebase

Any time a dependency version pin is changed in this repo, **also update the matching badge in `README.md` if one exists**. Drift between the badges and the truth (composer.json / package.json / config files) is the most common reason a public README looks neglected, and it is the easiest thing to forget when you only intended a package bump.

### When this rule fires

Any commit that touches one of these files:

- `composer.json` → check the `<img alt="PHP">` and `<img alt="Laravel">` badges, and the `Tech stack` table rows for `PHP`, `Laravel`, `laravel/ai`, `padosoft/laravel-ai-regolo`, `Sanctum`, etc.
- `package.json` → check the `<img alt="React">`, `<img alt="Vercel AI SDK">`, `<img alt="Node">`, and any other JS-related badges; check the `Tech stack` table rows for `React`, `TypeScript`, `@ai-sdk/react`, `ai`, `Vite`, `Tailwind`, `Vitest`, `Playwright`.
- `composer.lock` / `package-lock.json` → if a transitive bump changes a major version we already advertise (e.g. Vite 5 → 7), reflect the new floor.

### What to update

| Source of truth | README locations to mirror |
|-----------------|----------------------------|
| `composer.json` `require.php` | the `<img alt="PHP">` shields-io badge in the hero strip + the `PHP` row of the Tech stack table + the `Prerequisites` table |
| `composer.json` `require."laravel/framework"` | the `<img alt="Laravel">` badge + the `Laravel` row of the Tech stack table + the `Prerequisites` table |
| `composer.json` `require.laravel/ai` | the Tech stack `laravel/ai` row |
| `composer.json` `require."padosoft/laravel-ai-regolo"` | the Tech stack `padosoft/laravel-ai-regolo` row |
| `package.json` `dependencies.react` / `dependencies.@ai-sdk/react` / `dependencies.ai` | matching `<img alt="React">` / `<img alt="Vercel AI SDK">` badges + matching Tech stack rows |
| `package.json` `devDependencies.typescript` / `vite` / `tailwindcss` / `vitest` / `@playwright/test` | matching Tech stack rows; bump the badge if one exists for that line |
| `prerequisites table` minimums (Node, npm, Composer) | keep aligned with the `engines` field if/when it gets added |

### How to apply

1. **Use ranges, not exact pins.** Badges should say `8.3+`, not `8.3 | 8.4 | 8.5` — that way a `^8.3` bump to a new minor doesn't silently make the badge stale. Same logic for `Node 20+`, `React 18+`, etc.
2. **Major bumps update both the floor AND the existing label.** When `vitest ^2 → ^3`, update any badge or table row that mentioned `2.x`. Don't leave half-updated copies.
3. **Run a quick scan before commit.** `grep -nE 'shields\.io/badge|Tech stack' README.md` is enough to surface every line that might need a touch.
4. **Mention the badge update in the commit message** so reviewers see the README-vs-code drift was considered, not skipped.

### Why

Public Padosoft repos are open-source. The README is the first impression, and a stale "Laravel 12" badge on a Laravel 13 codebase signals a project that isn't tended. Keeping this in sync is cheap when done at bump time, expensive when done as a separate cleanup PR three months later.

### Out of scope

- Patch bumps inside an already-advertised range (`vite 7.3.2 → 7.3.3` doesn't need a README touch — the badge already says `^7`).
- Internal-only dev dependencies that aren't surfaced in the README (e.g. `phpstan`, `pint` — only update them if their row exists).
