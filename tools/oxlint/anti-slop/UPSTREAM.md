# Anti-slop provenance

Source: [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop), commit `e6676e8d0bf17c678cb45b9dacb2bd6ca8dea53a`.

The vendored files were copied from `skills/install-anti-slop/assets/anti-slop/` at that revision into `tools/oxlint/anti-slop/`. The copied snapshot was verified byte-for-byte against the source revision before this record was added.

Installed plugin entry points:

- `tools/oxlint/anti-slop/index.ts` is registered as `anti-slop`.
- `tools/oxlint/anti-slop/effect/index.ts` is retained with the snapshot but is not registered because this repository does not directly depend on Effect.

Intentional deviations:

- This provenance file is local to the installation and is not part of the source snapshot.
- `.scratch/**` is ignored in addition to the upstream agent-tooling patterns because it is a local-only workspace directory in this repository.
- The installed tree is excluded from Oxfmt so repository formatting does not alter the verified upstream snapshot.
- The installed tree is excluded from the application TypeScript project because its Oxlint-loaded modules intentionally use `.ts` import suffixes.

The nested ESLint Stylistic source, license, adaptations, and revision are documented separately in `vendor/eslint-stylistic/UPSTREAM.md`.
