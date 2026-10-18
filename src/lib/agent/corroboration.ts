import type { MiroFactsPayload } from "../connectors";
import { withDeadline } from "./runtime";
import type { MiroChatClientLike } from "./types";

export async function buildCorroborationQuery(
  payload: MiroFactsPayload,
  client: MiroChatClientLike,
  model: string
): Promise<string> {
  const now = new Date();
  const currentMonthYear = now.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const systemPrompt = `You are an expert search query generator. 
Based on the provided fact, generate a short 3-5 word search query to find additional news articles about the exact same event.
DO NOT include punctuation. Return ONLY the search query text, nothing else.`;

  try {
    const completion = await withDeadline(
      (signal) =>
        client.chat.completions.create(
          {
            model: model,
            temperature: 0.1,
            max_tokens: 30,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: payload.facts.join(" ") }
            ],
          },
          { signal }
        ),
      5000,
      "corroboration query generation"
    );

    // type assertion to handle unknown return from withDeadline
    const result = completion as any;
    let query = result?.choices?.[0]?.message?.content?.trim() || "";
    if (query) {
       return `${query} ${currentMonthYear}`;
    }
  } catch (err) {
    console.error("[Corroboration] Failed to generate query, using fallback:", err);
  }

  // Fallback: extract the first few words of the first fact
  const fallbackWords = payload.facts[0]?.split(" ").slice(0, 4).join(" ") || "news";
  return `${fallbackWords} ${currentMonthYear}`;
}
