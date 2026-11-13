# Rules Artifacts

`transcripts/` contains generated, ignored plain-text projections used for rules research and content authoring. The application does not consume them.

1. Read `sources/rules-manifest.json` and select the intended rules document family and version.
2. Read `transcripts/CR-v<version>.txt` or `transcripts/Tournament-Rules-<version>.txt`.
3. Run `pnpm rules:generate` if the transcript is absent.

The matching PDF under `sources/` remains authoritative. If a transcript differs from its PDF, rely on the PDF and fix the extraction pipeline. Never edit a transcript directly.
