# PATCH_NOTES.md: UI Decisions & Rationale

## 1. Typography hierarchy
- Headline layer uses `Merriweather`
- Body text uses `Inter`
- Fact blocks use `IBM Plex Mono`

Rationale:
- this creates a clear split between editorial voice, readable narrative copy, and factual machine-like observations

## 2. Visual tone
- graphite background
- soft brass highlight accents
- restrained teal atmospheric glow

Rationale:
- the interface feels like a digital diary rather than a startup dashboard

## 3. Data-model alignment
- UI labels are localized to Russian
- actual content categories remain aligned to the backend model: `World`, `Tech`, `Sports`, `Markets`

Rationale:
- the frontend should match live Supabase data instead of inventing conceptual-only filters

## 4. Reading experience
- post detail page uses a narrower reading shell
- observed facts are visually separated from inferred narrative
- cross-signal and hypothesis blocks receive stronger hierarchy

Rationale:
- this improves long-form readability and preserves the product's "fact -> reflection -> bridge -> hypothesis" structure

## 5. Motion behavior
- small fade-and-rise transitions
- restrained stagger for cards
- no bouncy or high-energy motion

Rationale:
- motion supports the reflective tone without pushing the site toward a generic tech aesthetic

## 6. Reference handling
- `submission/stitch/` is kept as reference material
- acceptance screenshots are curated separately in `submission/SCREENSHOTS/`

Rationale:
- this separates concept exploration from what should be reviewed as a delivery artifact

