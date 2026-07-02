import { REVIEW_SYSTEM_PROMPT, SEARCH_DECISION_SYSTEM_PROMPT } from "./prompts";
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
    (signal) => options.client.chat.completions.create(
      {
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
                current_date: new Date().toISOString().split("T")[0],
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
      },
      { signal }
    ),
    options.timeoutMs,
    "review model call",
  );

  const raw = completion.choices?.[0]?.message?.content;
  return ensureDraftReview(parseJsonObject<MiroDraftReview>(raw, "Review model"));
}

export interface SearchDecisionRunOptions {
  client: MiroChatClientLike;
  model: string;
  draftContent: string;
  reviewNotes: string;
  issues: string[];
  timeoutMs: number;
}

export interface MiroSearchDecision {
  reasoning: string;
  needs_search: boolean;
  query: string | null;
}

export async function runSearchDecision(
  options: SearchDecisionRunOptions,
): Promise<MiroSearchDecision> {
  const completion = await withDeadline(
    (signal) => options.client.chat.completions.create(
      {
        model: options.model,
        temperature: 0.1,
        top_p: 0.8,
        frequency_penalty: 0,
        presence_penalty: 0,
        max_tokens: 250,
        response_format: {
          type: "json_object",
        },
        messages: [
          {
            role: "system",
            content: SEARCH_DECISION_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: JSON.stringify(
              {
                draft_content: options.draftContent,
                review_notes: options.reviewNotes,
                issues: options.issues,
              },
              null,
              2,
            ),
          },
        ],
      },
      { signal }
    ),
    options.timeoutMs,
    "search decision model call",
  );

  const raw = completion.choices?.[0]?.message?.content;
  const parsed = parseJsonObject<MiroSearchDecision>(raw, "Search Decision model");
  
  return {
    reasoning: typeof parsed?.reasoning === "string" ? parsed.reasoning : "",
    needs_search: typeof parsed?.needs_search === "boolean" ? parsed.needs_search : false,
    query: typeof parsed?.query === "string" ? parsed.query : null,
  };
}
