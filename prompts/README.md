# Prompt Usage

## Files
- `prompts/miro_anti_politics_gatekeeper_v1.md`
- `prompts/miro_post_generator_v1.md`
- `prompts/miro_post_generator_v2.md`
- `prompts/CHANGELOG.md`

## Recommended Integration Order
1. Run gatekeeper on each raw item.
2. If `is_safe=true`, pass only the cleaned item to the post generator.
3. Validate returned JSON in the API route before saving.
4. Run a novelty check before insert so near-duplicate titles and same-note rewrites do not reach `posts`.

## Recommended Groq Settings
- Gatekeeper:
  - model: small, cheap instruction model
  - temperature: `0`
  - max_tokens: `80`
- Post generator:
  - model: `llama-3.3-70b-versatile`
  - temperature: `0.35`
  - max_tokens: `520`

## Important Constraints
- Prompts are designed to work with raw parsed facts, not full uncontrolled crawled pages.
- The generator assumes the anti-politics filter already ran first.
- If the app later enables Groq `json_object` mode, keep the prompts unchanged and add transport-level validation on top.
- `miro_post_generator_v2.md` is the current preferred prompt because it reduces forced structure, allows empty optional fields, and explicitly penalizes cliche phrasing.
