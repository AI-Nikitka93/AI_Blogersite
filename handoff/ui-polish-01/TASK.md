# Miro UI Polish - Handoff Task

## Goal

Improve the visual layer of the existing Miro frontend without breaking the working data flow from Supabase.

The backend, cron route, generation pipeline, and Supabase storage are already working. The homepage already reads live posts. Your task is to make the UI feel more premium, more intentional, and more like a personal digital diary.

## Project context

- Project: `AI_Blogersite`
- Stack: `Next.js App Router`, `TypeScript`, `Supabase`, `Framer Motion`
- Existing theme direction: dark-first diary style
- Existing data flow: `public.posts` -> frontend read path
- Existing pages already present in repo:
  - homepage feed
  - archive
  - about
  - manifesto
  - post detail

## Important constraints

- Do not change backend logic, database schema, cron route, Groq flow, or Supabase client logic unless absolutely required for UI rendering.
- Do not add auth, comments, likes, dashboards, admin panels, or new paid integrations.
- Do not replace the project identity. This is still "Miro", a reflective digital diarist.
- Preserve the existing read-only product model.
- Keep it compatible with desktop and mobile.
- Avoid generic SaaS visuals.
- Avoid purple-white startup styling.

## What needs to be improved

### 1. Homepage visual hierarchy

Improve the homepage so it feels editorial and atmospheric:

- stronger hero composition
- better rhythm between hero, filters, and post grid
- more distinctive typography hierarchy
- clearer category states
- more premium empty/loading/quiet states if present

### 2. Post cards

Improve post cards so they feel like diary entries, not generic blog cards:

- better spacing
- better typography contrast
- stronger category treatment
- clearer observed/inferred mood
- hover and entrance motion that feels deliberate, not noisy

### 3. Post detail page polish

If the post page already exists, refine it:

- better reading width
- more elegant section separation
- stronger title/subtitle treatment
- better rendering of `observed`, `inferred`, `cross_signal`, `hypothesis`

### 4. Design consistency

Unify the system:

- color variables
- surface styling
- borders/shadows/glow usage
- button/link/filter behavior
- motion timing

## Allowed implementation area

You may edit:

- `app/`
- `src/components/miro/`
- `src/lib/posts*` only if needed for UI-facing formatting
- `app/globals.css`
- other styling files already used by the frontend

You should avoid editing:

- `app/api/cron/route.ts`
- `src/lib/miro-agent.ts`
- `src/lib/miro-connectors.ts`
- `src/lib/supabase.ts`
- `supabase/`

## Acceptance criteria

The task is accepted only if all items below are true:

1. The site still builds and runs.
2. Existing live data from Supabase still renders correctly.
3. The design feels intentionally branded for Miro, not template-like.
4. Desktop and mobile layouts are both usable.
5. Motion is present but restrained.
6. No backend regressions are introduced.

## Verification required

Before delivery, run:

```bash
npm run typecheck
npm run build
```

If something cannot be verified, state it explicitly in `RESULT.md`.

## Delivery format

Place everything in:

`handoff/ui-polish-01/submission/`

Required contents of `submission/`:

1. `RESULT.md`
   - what changed
   - which files were edited
   - what was verified
   - any known limitations

2. `SCREENSHOTS/`
   - desktop homepage
   - mobile homepage
   - post detail page
   - archive or category view

3. `PATCH_NOTES.md`
   - short list of UI decisions

If you worked directly in the repo instead of creating a patch file, still put the report and screenshots in `submission/`.

## Definition of done

Done means:

- code is in the repo
- verification was run
- `submission/RESULT.md` explains exactly what changed
- screenshots are included

