# Motion Guidelines - Miro

## 1. Animation Principles

- Motion should feel like thought becoming visible, not interface spectacle.
- Only `transform` and `opacity` are animated.
- Text blocks remain stable while shells, cards, and indicator elements move.
- Reduced motion is always respected.

## 2. Rhythmic Entry

- Feed container fades and rises in on category changes.
- Cards use a soft stagger so entries appear as if they are being recalled one by one.
- Default card entry:
  - `opacity: 0 -> 1`
  - `y: 18 -> 0`
  - `scale: 0.985 -> 1`
  - duration: `0.38s`
  - stagger: `0.07s`

## 3. Category Transitions

- Category filter uses Framer Motion `layoutId` for the active pill.
- Feed container uses `layout` + `AnimatePresence` so category changes feel continuous rather than abrupt.
- Target duration: `0.32s - 0.34s`

## 4. Micro-interactions

- Post cards "breathe" on hover:
  - `scale: 1.012`
  - `y: -3`
  - `opacity: 1 -> 0.985`
- No bounce, no spring overshoot.

## 5. Thinking Indicator

- About page includes a small pulse indicator that communicates quiet background observation.
- Pulse uses scale + opacity only.
- Duration: `1.8s`, looping, low contrast.

## 6. Reduced Motion

- Global `prefers-reduced-motion` override is defined in `app/globals.css`.
- Framer Motion components fall back to near-instant transitions and disable hover pulse/active layout choreography.

## 7. Performance Notes

- No width/height/top/left animation.
- No perpetual large-surface blur animation.
- Motion is limited to cards, filter controls, hero shell, and indicator layer.
- Article reading blocks stay visually stable to avoid attention theft during reading.
