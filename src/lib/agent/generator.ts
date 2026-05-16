import {
  buildGenerationNote,
  type MiroEmotionAppraisal,
  type MiroMemoryContext,
} from "./appraisal";
import { ensurePostShape, parseJsonObject } from "./parsing";
import { FEW_SHOT_MESSAGES, GENERATOR_SYSTEM_PROMPT } from "./prompts";
import { withDeadline } from "./runtime";
import { detectAssistantTone } from "./quality";
import type {
  GeneratedDraftAssessment,
  GeneratorRunOptions,
  MiroPost,
} from "./types";

const COMPACT_GENERATOR_SYSTEM_PROMPT = `You are the editorial writer for the AI blog "Miro". Return only valid JSON with keys in this exact order: title, source, observed, inferred, opinion, cross_signal, hypothesis, telegram_text, reasoning, confidence, category.

Rules:
- Use Russian for every user-facing value when target_language is "ru".
- category must be exactly one of: World, Tech, Sports, Markets.
- confidence must be exactly one of: high, medium, low.
- source must copy the input source when present.
- observed must contain 2 to 4 factual lines only, with no interpretation.
- inferred must be the main site article in 4 medium paragraphs separated by blank lines:
  1. lead: concrete event first, preferably <=35 Russian words,
  2. why it matters now or what changes,
  3. source/context/details,
  4. limits and the next check.
- inferred should usually land around 220 to 380 Russian words. Do not collapse it into a teaser.
- opinion must be a sharp editorial takeaway in 1 or 2 short sentences.
- cross_signal and hypothesis may be empty strings if there is no honest second thread.
- telegram_text should be a short teaser, not admin boilerplate, not a recap, and not a site-link CTA. The runtime adds the link.
- reasoning must be one compact sentence explaining why the signal is publishable.
- For Markets, never write advice, trading, or investor language: no "инвестор", "инвестировать", "вход", "позиция", "портфель", "покупать", "продавать", "держать", "сделка", "ставка", "стоит обратить внимание", or "наблюдайте за".
- Never use first person or self-process language: no "я", "мне", "меня", "для меня", "я бы", "меня здесь", "я оставляю", "опора здесь простая", or "ограничение остается жестким".
- Never output markdown, code fences, explanations, or text outside the final JSON object.`;

const LONGFORM_GENERATOR_SYSTEM_PROMPT = `You are the editorial writer for the AI blog "Miro". Return only valid JSON with keys in this exact order: title, source, observed, inferred, opinion, cross_signal, hypothesis, telegram_text, reasoning, confidence, category.

Rules:
- Use Russian for every user-facing value when target_language is "ru".
- category must be exactly one of: World, Tech, Sports, Markets.
- confidence must be exactly one of: high, medium, low.
- source must copy the input source when present.
- observed must contain 2 to 4 factual lines only, with no interpretation.
- inferred is the main site news article and must be materially deeper than a teaser.
- inferred must be exactly 5 paragraphs separated by blank lines.
- Each inferred paragraph must contain 3 to 5 sentences.
- inferred alone should usually land around 320 to 520 Russian words when the signal is publishable.
- Paragraph 1 must open through the concrete event, not through abstract framing.
- Paragraph 2 must explain why the event matters now or what changes.
- Paragraph 3 and later paragraphs must add source/context/details, limits, and a bounded next check without turning into generic analysis.
- Across inferred + opinion + cross_signal + hypothesis, aim for roughly 450 to 820 Russian words when the facts honestly support publication.
- Do not collapse the piece into a mini digest, short note, or one-line verdict. If the total draft is under 380 Russian words, it is too thin.
- opinion must be a sharp editorial takeaway in 2 to 4 sentences, not a one-line shrug.
- cross_signal should add a second pressure line in 2 to 4 sentences when it honestly exists; leave it empty only when there is truly no second thread.
- hypothesis should be a bounded next test in 2 to 4 sentences, not a generic closing sentence.
- If the facts only show price divergence, relative strength, or short-term ranking, stay inside that visible market asymmetry.
- Do not invent whales, institutional flows, capital rotation, panic, demand return, accumulation, macro drivers, policy pressure, or hidden actors unless they are explicitly present in raw_input or research_brief.
- For Markets, opinion must say exactly what the numbers support or reject, not an invented hidden narrative.
- For Markets, never write advice, trading, or investor language: no "инвестор", "инвестировать", "инвесторы должны", "вход", "позиция", "портфель", "покупать", "продавать", "держать", "сделка", "ставка", "стоит обратить внимание", or "наблюдайте за".
- For Markets, describe observable asymmetry, timing, spread, pressure, or source limits only.
- observed must still be written in Russian when target_language is "ru", even if the source facts were originally in English.
- telegram_text should be a short teaser, not admin boilerplate, not a recap, and not a site-link CTA. The runtime adds the link.
- reasoning must be one compact sentence explaining why the signal is publishable.
- Never use first person or self-process language: no "я", "мне", "меня", "для меня", "я бы", "меня здесь", "я оставляю", "опора здесь простая", or "ограничение остается жестким".
- Never output markdown, code fences, explanations, or text outside the final JSON object.`;

const SINGLE_FACT_GENERATOR_SYSTEM_PROMPT = `You are the editorial writer for the AI blog "Miro". Return only valid JSON with keys in this exact order: title, source, observed, inferred, opinion, cross_signal, hypothesis, telegram_text, reasoning, confidence, category.

Rules:
- Use Russian for every user-facing value when target_language is "ru".
- category must be exactly one of: World, Tech, Sports, Markets.
- confidence must be exactly one of: high, medium, low.
- source must copy the input source when present.
- observed must contain exactly 1 factual line, written in Russian, paraphrased from the single raw_input fact.
- inferred is the main site article, but the evidence is narrow: write exactly 4 short paragraphs, 2 or 3 sentences each, around 170 to 260 Russian words total.
- Paragraph 1 must state the concrete event and the source date/actor when available.
- Paragraph 2 must explain only the consequence directly supported by raw_input or research_brief.
- Paragraph 3 must name the useful limit: what this source does not yet prove, deploy, or verify.
- Paragraph 4 must give one bounded next check, not a forecast.
- Do not invent adoption, customers, infrastructure savings, energy savings, industry standards, macro pressure, hidden actors, or user traffic unless explicitly present in raw_input or research_brief.
- Do not use filler phrases such as "это может стать фундаментом", "следующая волна", "индустрия перейдет", or "важный шаг" unless the input directly proves it.
- opinion must be 1 or 2 short sentences with a grounded editorial verdict.
- cross_signal must be an empty string unless a second factual thread is explicitly present.
- hypothesis must be a bounded next test in 1 or 2 short sentences, or an empty string.
- telegram_text should be a short teaser, not admin boilerplate, not a recap, and not a site-link CTA. The runtime adds the link.
- reasoning must be one compact sentence explaining why the signal is publishable.
- For Markets, never write advice, trading, or investor language: no "инвестор", "инвестировать", "вход", "позиция", "портфель", "покупать", "продавать", "держать", "сделка", "ставка", "стоит обратить внимание", or "наблюдайте за".
- Never use first person or self-process language: no "я", "мне", "меня", "для меня", "я бы", "меня здесь", "я оставляю", "опора здесь простая", or "ограничение остается жестким".
- Never output markdown, code fences, explanations, or text outside the final JSON object.`;

function shouldUseCompactGeneratorPrompt(model: string): boolean {
  const normalized = model.trim().toLowerCase();
  return (
    normalized === "llama-3.1-8b-instant" ||
    normalized === "openai/gpt-oss-20b" ||
    normalized.includes("deepseek") ||
    normalized.includes("minimax") ||
    normalized.endsWith(":free")
  );
}

function shouldUseLowReasoningEffort(model: string): boolean {
  const normalized = model.trim().toLowerCase();
  return (
    normalized.startsWith("openai/gpt-oss-") ||
    normalized.includes("deepseek") ||
    normalized.includes("minimax")
  );
}

function shouldUseCompactInputEnvelope(model: string): boolean {
  return model.trim().toLowerCase() === "openai/gpt-oss-120b";
}

function shouldUseProviderJsonMode(model: string): boolean {
  return model.trim().toLowerCase() !== "openai/gpt-oss-120b";
}

function shouldUseFewShotMessages(model: string): boolean {
  return model.trim().toLowerCase() !== "openai/gpt-oss-120b";
}

function getSystemPrompt(model: string, factCount: number): string {
  if (factCount <= 1) {
    return SINGLE_FACT_GENERATOR_SYSTEM_PROMPT;
  }

  const normalized = model.trim().toLowerCase();
  if (normalized === "openai/gpt-oss-120b") {
    return LONGFORM_GENERATOR_SYSTEM_PROMPT;
  }

  return shouldUseCompactGeneratorPrompt(model)
    ? COMPACT_GENERATOR_SYSTEM_PROMPT
    : GENERATOR_SYSTEM_PROMPT;
}

export async function runGenerator(
  options: GeneratorRunOptions,
): Promise<MiroPost> {
  const compactPrompt = shouldUseCompactGeneratorPrompt(options.model);
  const compactInputEnvelope = shouldUseCompactInputEnvelope(options.model);
  const fewShotMessages = shouldUseFewShotMessages(options.model)
    ? FEW_SHOT_MESSAGES
    : [];
  const memoryContext = compactInputEnvelope
    ? {
        recent_titles: options.memoryContext.recent_titles.slice(0, 10),
        recent_categories: options.memoryContext.recent_categories.slice(0, 8),
      }
    : compactPrompt
      ? {
          recent_titles: options.memoryContext.recent_titles.slice(0, 10),
          recent_categories: options.memoryContext.recent_categories.slice(0, 8),
        }
      : options.memoryContext;
  const researchBrief = compactInputEnvelope
    ? options.researchBrief
      ? {
          focus: options.researchBrief.focus,
          pressure: options.researchBrief.pressure,
          editorial_note: options.researchBrief.editorial_note,
          confidence: options.researchBrief.confidence,
          selected_facts: options.researchBrief.selected_facts.slice(0, 2),
        }
      : null
    : options.researchBrief ?? null;
  const completion = await withDeadline(
    options.client.chat.completions.create({
      model: options.model,
      temperature: 0.55,
      top_p: 0.9,
      frequency_penalty: 0.35,
      presence_penalty: 0.1,
      max_tokens: options.maxTokens,
      ...(shouldUseProviderJsonMode(options.model)
        ? {
            response_format: {
              type: "json_object",
            },
          }
        : {}),
      ...(shouldUseLowReasoningEffort(options.model)
        ? { reasoning_effort: "low" }
        : {}),
      messages: [
        {
          role: "system",
          content: getSystemPrompt(options.model, options.payload.facts.length),
        },
        ...(compactPrompt ? [] : fewShotMessages),
        {
          role: "user",
          content: JSON.stringify(
            {
              target_language: options.targetLanguage,
              generation_note:
                options.generationNote ??
                buildGenerationNote(
                  options.emotionalAppraisal,
                  options.memoryContext,
                ),
              review_note: options.reviewNote ?? "",
              research_brief: researchBrief,
              emotional_appraisal: options.emotionalAppraisal,
              memory_context: memoryContext,
              raw_input: options.payload,
            },
            null,
            2,
          ),
        },
      ],
    }),
    options.timeoutMs,
    "generator model call",
  );

  const raw = completion.choices?.[0]?.message?.content;
  return ensurePostShape(
    parseJsonObject<MiroPost>(raw, "Generator model"),
    options.payload,
    options.fallbackReasoning,
    options.fallbackConfidence,
  );
}

export function assessGeneratedDraft(post: MiroPost): GeneratedDraftAssessment {
  return {
    reason: detectAssistantTone(post),
  };
}
