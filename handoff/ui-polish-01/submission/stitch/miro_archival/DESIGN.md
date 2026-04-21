# Design System Strategy: The Archival Modernist

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Digital Curator."** 

This is not a social media feed or a generic note-taking app; it is a premium, high-fidelity sanctuary for thought. The aesthetic rejects the "bubbly" trends of modern SaaS in favor of **Organic Brutalism**—a style characterized by sharp geometry, vast negative space, and a high-contrast editorial hierarchy. 

We break the "template" look by treating the screen like a physical gallery wall. Layouts should favor intentional asymmetry—for example, a `display-lg` heading might be offset to the right while the body text remains left-aligned, creating a sophisticated visual tension. By utilizing heavy "dark-first" surfaces and ultra-restrained accents, we evoke the feeling of a dark, quiet library at midnight.

---

## 2. Color & Surface Architecture
The color palette is rooted in deep charcoal and slate, designed to minimize eye strain and maximize the "atmospheric" quality of the diary.

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to section off content. Traditional dividers feel cheap and "app-like." Instead, define boundaries through background color shifts. 
*   Place a `surface-container-low` component against a `surface` background to create a clear but soft structural break.
*   Use `outline-variant` only as a "Ghost Border" at 10-20% opacity when high-contrast accessibility is required.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. 
1.  **Base Layer:** `surface` (#0e0e0e) for the primary background.
2.  **Sectional Layer:** `surface-container-low` (#131313) for large content areas.
3.  **Component Layer:** `surface-container-high` (#1f2020) for cards or interactive modules.
4.  **The Glass Rule:** For floating menus or navigation, use `surface-bright` with a 60% opacity and a `20px` backdrop-blur. This "frosted glass" effect allows the charcoal depths to bleed through, ensuring the UI feels integrated rather than pasted on.

### Signature Accents
The `tertiary` (#ffe8c9) amber and `secondary` (#89a1ae) teal must be used with extreme discipline. They are "signals" for emotion or state, never for decorative flourishes.

---

## 3. Typography
The typography scale creates a dialogue between the "Archival" (Serif) and the "Functional" (Sans-Serif).

*   **Editorial Expression (Noto Serif):** Used for `display` and `headline` levels. This font represents the user's voice—their thoughts and memories. It should feel literary and permanent. Use `headline-lg` for entry titles to provide an immediate sense of gravity.
*   **Interface Utility (Inter):** Used for `title`, `body`, and `labels`. This is the "machine" layer. It must be clean, legible, and subordinate to the Serif headings.
*   **Visual Soul:** High contrast in size is encouraged. A `display-lg` header paired with a `body-sm` metadata label creates a sophisticated, "magazine-style" layout that feels custom-designed.

---

## 4. Elevation & Depth
In this design system, depth is a product of light and tone, not structural scaffolding.

*   **Tonal Layering:** Avoid drop shadows for standard cards. Instead, stack `surface-container-lowest` on top of `surface-container-low`. The 1-2% shift in charcoal creates a "natural lift" that feels architectural.
*   **Ambient Shadows:** For high-priority floating elements (like a "New Entry" modal), use an extra-diffused shadow: `box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4)`. The shadow should feel like a soft glow of darkness, not a hard edge.
*   **Corner Logic:** Adhere strictly to the `sm` (0.125rem/2px) or `DEFAULT` (0.25rem/4px) roundedness. Avoid "full" pill shapes unless used for small functional chips. Sharp edges convey a sense of "archival" importance.

---

## 5. Component Guidelines

### Buttons
*   **Primary:** Background: `primary` (#c6c6c6), Text: `on-primary` (#3f4041). Use sharp `DEFAULT` corners.
*   **Tertiary (Ghost):** No background. Text: `primary`. On hover, add a subtle `surface-container-highest` background with a slow 300ms transition.
*   **Signature Interaction:** Buttons should have a slight `0.5px` inner-glow (using a white-transparent `outline`) to mimic the catchlight on a physical button.

### Cards & Lists
*   **Forbid Dividers:** Do not use `hr` tags or borders between list items. Use `spacing-6` (2rem) of vertical white space to separate entries.
*   **The "Mood" Indicator:** Use a small 4x4px square of `tertiary` or `secondary` color next to a list item to indicate "Mood" signals.

### Input Fields
*   **Style:** Minimalist. No background. Only a bottom "Ghost Border" using `outline-variant` at 20% opacity.
*   **Focus State:** The bottom border transitions to 100% `primary` opacity, and the label (using `notoSerif`) shifts slightly up the Y-axis.

### The "Chronicle" Scroll (Contextual Component)
A vertical timeline component that uses a single-pixel `outline-variant` line at 10% opacity, punctuated by `tertiary` amber dots for entry points. This creates a "thread of thought" visual.

---

## 6. Do's and Don'ts

### Do
*   **Do** use `spacing-16` and `spacing-20` for generous margins. Luxury is defined by wasted space.
*   **Do** use `display-lg` for empty states. A large, beautiful Serif quote is better than a "No Data" icon.
*   **Do** apply a 150ms `Y-axis` translation (5px) on all hover states to make the interface feel responsive to touch.

### Don't
*   **Don't** use pure white (#FFFFFF). Always use `on-surface` (#e7e5e4) to maintain the "archival" paper feel.
*   **Don't** use standard "Material" rounded corners (8px+). It breaks the professional, archival intent.
*   **Don't** use icons for everything. Where possible, use a `label-md` in all-caps. Text-based UI feels more premium than a sea of icons.
*   **Don't** use vibrant gradients. If color depth is needed, use a subtle radial blur of `secondary-container` behind a content block.

---

## 7. Motion & Interaction
Motion must feel "intentional" and "weighted."
*   **Entrance:** Elements should fade in from 0% to 100% opacity while traveling `10px` up the Y-axis over 400ms using a `cubic-bezier(0.2, 0, 0.2, 1)` easing.
*   **Hover:** Interaction should be slow. A 300ms transition for background color changes ensures the app feels "calm."