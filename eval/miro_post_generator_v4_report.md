# Miro Prompt Eval Report v4

Date: `2026-04-28`
Version under test: `4.0`
Target stack: `Groq/OpenRouter/NVIDIA writer layer`

## Scope
- `src/lib/agent/prompts.ts`
- `prompts/miro_post_generator_v4.md`
- `prompts/CHANGELOG.md`

## Test Assets
- `eval/miro_post_generator_v4_dataset.jsonl` — 5 cases

## What Was Actually Verified

### Structural checks
- Prompt files include explicit `PROHIBITIONS`.
- Generator prompt now includes a concrete anti-slop blacklist.
- Site framework is explicit: `Observed -> Tension -> Inferred -> Hypothesis`.
- Telegram framework is explicit: `Hook -> Tension -> CTA`.
- Few-shot assistant outputs include the new `telegram_text` field.
- Runtime contract remains JSON-first and build-safe.

### Runtime checks
- `npm run typecheck` — PASS
- `npm run build` — PASS

## What Was NOT Executed
- No live LLM inference run against the v4 dataset.
- No measured success rate, latency, or hallucination rate.
- No A/B comparison against v3 on the same live model in this edit session.

## Honest Status
- Spec readiness: `PASS`
- Build compatibility: `PASS`
- Live model eval: `NOT RUN`
- Production confidence for style shift: `PARTIAL`

## Blocking Reason For Full Prompt Certification
- The mandatory live prompt eval was not executed in this session, so this is a versioned prompt upgrade with structural proof, not a fully measured model-quality certification.

## Recommended Next Live Eval
1. Run all 5 v4 dataset cases through the target writer model.
2. Score:
   - JSON validity
   - adherence to `Observed -> Tension -> Inferred -> Hypothesis`
   - adherence to `Hook -> Tension -> CTA`
   - blacklist violations
   - generic/assistant-like drift
3. Compare against the pre-v4 prompt on the same cases.
