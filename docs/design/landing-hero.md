# Landing hero: reference capture

Reference: linkletter.press (via vibrant.design), measured 2026-10-29 in a browser (computed styles,
`document.getAnimations()`) at 1440px and 375px. Nothing on the page was gated; no form was touched. We take the
structure, scale and timing only. Their copy, images and code stay theirs.

## Structure, top to bottom

1. **Nav**, one row, content box 1112px wide and centred, 80px tall (72px on phones). Wordmark on the left, four
   text links in the middle, one dark filled button on the right. Under the tablet breakpoint the four links are
   hidden; only the wordmark and the button stay.
2. **Headline**, centred, a serif display face at weight 400, two lines at desktop (three at 375px). One phrase in
   the second line carries a hand-drawn brush underline in the one warm accent colour. The underline is an SVG image
   (393 x 28 at desktop, 280 x 20 at 375px) placed under the text and nudged right of centre, so it reads as made by
   hand rather than typeset.
3. **Subhead**, one sentence, centred, capped at 360px wide (300px on phones), so it wraps to two or three lines.
4. **CTA**, one dark filled button with a small leading glyph, then a one-line reassurance note under it in the
   secondary ink at caption size (it names what is free and how long it takes).
5. **Product image**, a photographed physical object (a printed page sliding out of an envelope), large: 635 x 947
   at desktop, overlapping a wide brush-stroke shape behind it that bleeds past both viewport edges.
6. **Trusted-by strip**, a caption-size label over a row of six institution logos at 70% opacity, 40-64px tall.

## Type scale

| Role            | 375px         | 810px+      | 1200px+     | Notes                        |
| --------------- | ------------- | ----------- | ----------- | ---------------------------- |
| Headline (h1)   | 40px / 40px   | 52px / 52px | 60px / 60px | serif, 400, tracking -0.02em |
| Section h2      | 30px / 0.99   | 36px        | 40px        | serif, tracking -0.02em      |
| Body / subhead  | 16px / 22.4px | same        | same        | sans, 400                    |
| Nav link, label | 16px / 24px   | same        | same        | sans, 600                    |
| Button          | 16px / 24px   | same        | same        | sans, 600                    |
| Caption / note  | 14px / 19.6px | same        | same        | secondary ink                |

The jump is the point: a 60px serif headline over 16px sans body, nothing in between in the hero.

## Spacing (1440px, measured)

- Nav: 80px tall; links 16/600 with a 32px gap; button 46px tall, 12px x 20px padding, 12px radius.
- Nav bottom to headline top: 120px (80px at 375px).
- Headline block: 680px max width, 120px tall (two 60px lines).
- Headline bottom to underline: the underline pulls up 8px into the descenders (`-mt-2`).
- Underline bottom to subhead: 20px. Subhead to CTA: 20px. CTA: 48px tall, 12px x 24px padding, 12px radius.
- CTA bottom to note: 8px. Note bottom to product image top: about 47px.
- Section rhythm below the hero: 96px top and bottom on phones, 144px from tablet up.

## Motion

- **Underline wipe:** one Web Animation on the underline's wrapper, `clip-path: inset(0 100% 0 0)` to
  `inset(0 0% 0 0)`, **650ms**, easing **`cubic-bezier(0.22, 1, 0.36, 1)`** (the same curve as our
  `--ease-out-quint`), starting about **500ms** after navigation, once the page has painted.
- **Headline, subhead, CTA:** no entrance; they are there on first paint. The underline is the only hero motion.
- **Trusted-by rail:** fades and rises in on scroll, `opacity` and `transform`, **500ms ease-out**.
- **Hover:** links and buttons change colour over 150ms on `cubic-bezier(0.4, 0, 0.2, 1)`.
- **Reduced motion:** a global rule cuts every transition and animation to 0.01ms.

## What Session Coach takes from it

- Same order: nav, headline with one underlined word, one subhead, CTA plus note, product object, trust strip.
- The underline as the single hand-made mark, drawn in, on the ease-out-quint curve.
- The big size jump between the display headline and everything else.
- Not taken: the warm accent (warm hues are kept for trouble), the photographed object (our object is a decision
  card built from the real components), the logos (we have no customers to show yet).
