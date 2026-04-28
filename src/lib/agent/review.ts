import { REVIEW_SYSTEM_PROMPT } from "./prompts";
import { ensureDraftReview, parseJsonObject } from "./parsing";
import { withDeadline } from "./runtime";
import type {
  MiroChatClientLike,
  MiroDraftReview,
  MiroResearchBrief,
  MiroPost,
} from "./types";
import type { MiroEmotionAppraisal, MiroMemoryContext } from "./appraisal";
import type { MiroFactsPayload } from "../connectors";

export interface ReviewRunOptions {
  client: MiroChatClientLike;
  model: string;
  payload: MiroFactsPayload;
  post: MiroPost;
  targetLanguage: "ru" | "en";
  timeoutMs: number;
  memoryContext: MiroMemoryContext;
  emotionalAppraisal: MiroEmotionAppraisal;
  researchBrief: MiroResearchBrief;
}

export async function runDraftReview(
  options: ReviewRunOptions,
): Promise<MiroDraftReview> {
  const completion = await withDeadline(
    options.client.chat.completions.create({
      model: options.model,
      temperature: 0,
      top_p: 0.8,
      frequency_penalty: 0,
      presence_penalty: 0,
      max_tokens: 160,
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content: REVIEW_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: JSON.stringify(
            {
              target_language: options.targetLanguage,
              emotional_appraisal: options.emotionalAppraisal,
              memory_context: options.memoryContext,
              research_brief: options.researchBrief,
              raw_input: options.payload,
              draft_post: options.post,
            },
            null,
            2,
          ),
        },
      ],
    }),
    options.timeoutMs,
    "review model call",
  );

  const raw = completion.choices?.[0]?.message?.content;
  return ensureDraftReview(parseJsonObject<MiroDraftReview>(raw, "Review model"));
}
