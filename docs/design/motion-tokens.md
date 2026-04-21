# Motion Tokens — Miro

- Library: `framer-motion`
- Entrance: `y: 18 -> 0`, `opacity: 0 -> 1`
- Easing primary: `cubic-bezier(0.16, 1, 0.3, 1)`
- Easing secondary: `cubic-bezier(0.22, 1, 0.36, 1)`
- Duration fast: `140ms`
- Duration normal: `240ms`
- Duration slow: `420ms`
- Z-layers:
  - header: `30`
  - content: `10`
  - decorative glows: `0-5`

## Performance rule
- No animation should block reading flow.
- No layout-shifting transforms on article text.
- Motion on cards/header only; article body stays stable.
