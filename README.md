# jet-ski

> **Work in progress. This is a toy project**, built for fun and to experiment. Expect missing features, rough edges and breaking changes. Not production software.

Browser-only jet ski game: procedural waves, buoyancy and planing, deterministic fixed-step physics.
TypeScript, Vite, three.js. Builds to a single `index.html` that works from `file://`.

```
npm ci
npm run dev        # develop
npm test           # fast pure tests (< 10 s target)
npm run build      # dist/index.html
```

Quality gates (all in CI, deploy needs every one): format, lint (no `any`, no `Math.random`), typecheck,
tests with coverage thresholds, build, `npm audit` (high), secret scan (gitleaks).

## Standards

Same as the rest of this codebase (see VETA): conventional commits enforced by a `commit-msg` hook, a
pre-commit hook (format, lint, types, docs lint, tests), pure functional core, seeded RNG, fallow for dead
code, gitleaks, `npm audit`, MIT licence, and a security policy in `SECURITY.md`.
