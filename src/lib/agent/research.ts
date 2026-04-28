import { RESEARCH_SYSTEM_PROMPT } from "./prompts";
import { ensureResearchBrief, parseJsonObject } from "./parsing";
import { withDeadline } from "./runtime";
import type {
  MiroChatClientLike,
  MiroResearchBrief,
} from "./types";
import type { MiroEmotionAppraisal, MiroMemoryContext } from "./appraisal";
import type { MiroFactsPayload } from "../connectors";

export interface ResearchRunOptions {
  client: MiroChatClientLike;
  model: string;
  payload: MiroFactsPayload;
  targetLanguage: "ru" | "en";
  timeoutMs: number;
  memoryContext: MiroMemoryContext;
  emotionalAppraisal: MiroEmotionAppraisal;
}

export async function runResearch(
  options: ResearchRunOptions,
): Promise<MiroResearchBrief> {
  const completion = await withDeadline(
    options.client.chat.completions.create({
      model: options.model,
      temperature: 0.2,
      top_p: 0.9,
      frequency_penalty: 0,
      presence_penalty: 0,
      max_tokens: 220,
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content: RESEARCH_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: JSON.stringify(
            {
              target_language: options.targetLanguage,
              emotional_appraisal: options.emotionalAppraisal,
              memory_context: options.memoryContext,
              raw_input: options.payload,
            },
            null,
            2,
          ),
        },
      ],
    }),
    options.timeoutMs,
    "research model call",
  );

  const raw = completion.choices?.[0]?.message?.content;
  return ensureResearchBrief(parseJsonObject<MiroResearchBrief>(raw, "Research model"));
}
