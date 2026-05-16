# Daily Recap Spec

Status: proposed, do not enable for public publishing until the normal post path is writer-only and story-verified.

## Goal

Add one optional end-of-day post that answers: "What was the most important verified non-political signal of the day?"

This must not become a generic news digest. It should be a short editorial synthesis built only from posts and verified source candidates that already passed story-level checks.

## When It Can Run

- Local time: after the 20:00 slot, preferably 21:30-22:00 Europe/Minsk.
- It must not replace the 20:00 scheduled post.
- It must not publish if fewer than 2 verified stories exist for the day.
- It must not use raw RSS neighbors or unverified fallback posts.

## Input Contract

Only include items with:

- `source_url`
- `source_published_at` or `event_date`
- `story_key` or equivalent single-story proof
- `category`
- `reasoning`
- article body that passed public quality gates

## Output Shape

- title: one editorial line, not "Итоги дня"
- observed: 3 to 5 bullets, each from a different verified story
- inferred: 4 compact paragraphs
- opinion: one sharp synthesis of what the day revealed
- cross_signal: optional link between categories
- hypothesis: one bounded thing to watch tomorrow
- confidence: medium or high only
- category: World

## Hard Rules

- No politics.
- No market advice.
- No "today was rich with events" filler.
- No source-less facts.
- No repetition of full article text.
- No winner-takes-all if the day was weak; skip instead.

## Acceptance

- A preview daily recap can explain why each included story was eligible.
- The recap links back to individual source-backed posts.
- If all day stories are weak or same-category duplicates, recap returns `skipped`.

