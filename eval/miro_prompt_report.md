# Miro Prompt Eval Report

Date: `2026-03-30`
Version under test: `1.0.0`
Target stack: `Groq API`

## Scope
- `prompts/miro_anti_politics_gatekeeper_v1.md`
- `prompts/miro_post_generator_v1.md`

## Test Assets
- `eval/miro_gatekeeper_dataset.jsonl` — 5 cases
- `eval/miro_post_generator_dataset.jsonl` — 5 cases

## What Was Actually Verified

### Structural checks
- Prompt files include explicit `PROHIBITIONS`.
- Prompt files include exact `OUTPUT CONTRACT`.
- Both prompts specify fallback behavior.
- Both prompts specify exact key names and strict JSON-only output.
- Generator prompt contains 2 few-shot examples.
- Version and changelog are present.

### Example payload checks
- Few-shot assistant outputs are valid JSON objects.
- Few-shot generator examples use only the allowed category enum values.
- Observed arrays in few-shot examples stay within the 2-4 item rule.

## What Was NOT Executed
- No live Groq inference run.
- No measured success rate, latency, or hallucination rate.
- No regression A/B against a weaker baseline prompt.

## Honest Status
- Spec readiness: `PASS`
- Live model eval: `NOT RUN`
- Production confidence: `PARTIAL`

## Blocking Reason
- `GROQ_API_KEY` is absent in the current environment, so the mandatory live prompt eval could not be executed.

## Recommended Next Live Eval
1. Run all 10 dataset cases through the target Groq model.
2. Measure:
   - JSON validity rate
   - schema adherence rate
   - anti-politics false negative rate
   - style adherence for Miro voice
3. Compare against a minimal baseline prompt with no few-shot examples.

## Source Notes
- Groq docs indicate that clear role, exact keys, and example output improve parseable structured generation.
- Groq docs also confirm `llama-3.3-70b-versatile` supports `JSON Object Mode`.
- 2025 personality prompting literature suggests persona conditioning works, but stability varies across discourse settings, which is why the generator prompt uses both explicit style rules and few-shot demonstrations.
