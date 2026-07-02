import { withDeadline } from "./runtime";

export async function searchWeb(query: string, timeoutMs = 8000): Promise<string[]> {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    
    const response = await withDeadline(
      (signal) => fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal
      }),
      timeoutMs,
      "duckduckgo fetch"
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const snippets: string[] = [];
    
    // Simple regex to extract text inside class="result__snippet"
    // e.g. <a class="result__snippet ...">Text here</a>
    const regex = /class="result__snippet[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = regex.exec(html)) !== null && snippets.length < 4) {
      let text = match[1];
      // strip html tags
      text = text.replace(/<[^>]+>/g, '').trim();
      // decode basic html entities
      text = text.replace(/&quot;/g, '"')
                 .replace(/&amp;/g, '&')
                 .replace(/&lt;/g, '<')
                 .replace(/&gt;/g, '>')
                 .replace(/&#39;/g, "'");
      if (text) {
        snippets.push(text);
      }
    }

    return snippets;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`[MiroAgent Search] search failed for query "${query}": ${reason}`);
    return [];
  }
}
