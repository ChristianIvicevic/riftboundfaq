# Anti-slop provenance

Source: [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop), commit `13909c9e07590f5a85d93c62712259fe14a883f7`.

The vendored files were copied from `skills/install-anti-slop/assets/anti-slop/` at that revision into `tools/oxlint/anti-slop/`. The bundled snapshot was verified byte-for-byte against the source revision. This local provenance file is not part of that snapshot.

The installation was updated on 2026-11-11 from the recoverable base `e6676e8d0bf17c678cb45b9dacb2bd6ca8dea53a`. The only incoming source change was commit `d2a9aea3b896ffcb291a85f2c1301aa2543ad8c8`, which keeps consecutive single-line bindings grouped in `require-readable-spacing` while preserving separation for documented or multiline bindings. There were no conflicting or deferred upstream changes.

Installed plugin entry points:

- `tools/oxlint/anti-slop/index.ts` is registered as `anti-slop`.
- `tools/oxlint/anti-slop/effect/index.ts` is registered as `anti-slop-effect` because this repository directly depends on Effect.

Intentional deviations:

- `anti-slop/require-readable-spacing` remains disabled, preserving the repository's existing severity choice.
- `.scratch/**` is ignored in addition to the upstream agent-tooling patterns because it is a local-only workspace directory in this repository.
- `repos/**` is ignored because it contains local read-only reference repositories rather than application source.
- The installed tree is excluded from Oxfmt so repository formatting does not alter the verified upstream snapshot.
- The installed tree is excluded from the application TypeScript project because its Oxlint-loaded modules intentionally use `.ts` import suffixes.

Dependencies and configuration:

- `oxlint` and `@oxlint/plugins` remain exactly pinned together at `1.90.0`; no dependency update was required.
- All existing generic rule severities and ignores are preserved. The five bundled Effect rules are enabled at `error`.
- Effect rules that follow project imports cover relative imports. Package-alias imports remain an upstream enforcement limitation.

Verification on 2026-11-11:

- The upstream repository's `pnpm check` passed at the incoming commit, including lint, all RuleTester and CLI suites, typecheck, and skill-asset synchronization.
- Focused RuleTester coverage and accepted/rejected native CLI probes passed against this installed plugin with Oxlint `1.90.0`.
- `pnpm format`, `pnpm format:check`, and `pnpm test` passed; the application suite ran 422 tests across 45 files.
- An application-scoped TypeScript check passed when the local `repos/**` reference tree was excluded. The repository's `pnpm types:check` remains blocked by 14,399 diagnostics entirely under `repos/effect/**`.
- `pnpm lint` loads both plugins successfully and reports four existing `anti-slop-effect/prefer-effect-match` findings in application source. They were left for an explicitly authorized cleanup.

The nested ESLint Stylistic source, license, adaptations, and revision are documented separately in `vendor/eslint-stylistic/UPSTREAM.md`.
