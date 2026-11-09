# jet-ski

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
