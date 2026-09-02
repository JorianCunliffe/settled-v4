# Scripts

## `build-portal-artifact.mjs`

Builds a single-file HTML preview of the seller portal for sharing — publishing
as an artifact, emailing to a partner, or opening from a USB stick on a laptop
with no network.

```bash
npm run build:artifact
# → build/artifacts/settled-seller-portal.html

node scripts/build-portal-artifact.mjs --out ~/Desktop/settled-demo.html
```

### How it stays in sync

Step content is read directly out of `src/lib/seller-journey.ts` at build time:
the script pulls the `stateMeta`, `journeyStates`, `transitionMap` and
`sampleJourney` literals, evaluates them, and inlines the result. Edit a label,
a checklist item or a vendor in that file, re-run the build, and the preview
picks it up. There is no second copy of the content to maintain.

`scripts/artifact/portal.template.html` holds the markup, styling and behaviour,
with four placeholders the build fills in: `__JOURNEY_JSON__`, `__FONT_B64__`,
`__LOGO_B64__` and `__VIDEO_B64__`. The build fails loudly if any placeholder
survives.

### What the preview covers

Step navigation, the role tabs (seller / agent / concierge, including the
agent-only notes), journey transitions, the help video, the services and vendor
lead surface with its stub profile and quote form, and the assistant chat.

### What it deliberately leaves out

Everything that needs a server: the admin content editor, phone sign-in, member
organisations, and document persistence. Two consequences worth knowing:

- The preview always shows the **bundled defaults**. Step content saved through
  the content editor lives in the database and is not included.
- The help guide opens an **in-page summary** built from the step's real
  checklist, documents and tip, rather than the PDF. Artifact sandboxes block
  PDF downloads and `data:` navigation, so a link would be a dead button.

### Assets

`artifact/eb-garamond-latin.woff2` is the latin subset of EB Garamond
(SIL Open Font License 1.1), vendored so the build is reproducible offline. The
app itself still loads the font from Google Fonts. The logo and placeholder help
video come from `public/`.
