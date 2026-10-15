# Jazmin brand font (self-hosted)

Drop the licensed Jazmin font files here with these exact names:

- `Jazmin-Regular.woff2`  (weight 400)   ← required
- `Jazmin-Medium.woff2`   (weight 500)   ← required

`.ttf` versions are also accepted as a fallback (same names, `.ttf`).

They're wired up in `src/styles/fonts.css` and used via `--font-display`
(see `src/styles/tokens.css`). No code change needed once the files are here —
just reload. Until then, headings fall back to Cormorant Garamond.
