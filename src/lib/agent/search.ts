import { withDeadline } from "./runtime";

export interface SearchHit {
  title: string;
  url: string;
  snippet: string;
}

function decodeHtml(text: string): string {
  return text.replace(/<[^>]+>/g, '').trim()
             .replace(/&quot;/g, '"')
             .replace(/&amp;/g, '&')
             .replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>')
             .replace(/&#39;/g, "'");
}

export async function searchWeb(query: string, timeoutMs = 8000): Promise<SearchHit[]> {
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
    const hits: SearchHit[] = [];
    
    // We parse the entire result block: <div class="result ...">
    const resultBlockRegex = /<div[^>]+class="(?:[^"]*\s)?result\s(?:[^"]*\s)?result--html[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi;
    let blockMatch;
    
    while ((blockMatch = resultBlockRegex.exec(html)) !== null && hits.length < 4) {
      const blockHtml = blockMatch[1];
      
      const titleMatch = /<h2 class="result__title">[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(blockHtml);
      const snippetMatch = /<a[^>]+class="result__snippet[^>]*>([\s\S]*?)<\/a>/i.exec(blockHtml);
      
      if (titleMatch && snippetMatch) {
        let rawUrl = titleMatch[1];
        if (rawUrl.startsWith('//duckduckgo.com/l/?uddg=')) {
           rawUrl = decodeURIComponent(rawUrl.split('uddg=')[1].split('&')[0]);
        }
        hits.push({
          url: rawUrl,
          title: decodeHtml(titleMatch[2]),
          snippet: decodeHtml(snippetMatch[1])
        });
      }
    }

    return hits;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`[MiroAgent Search] search failed for query "${query}": ${reason}`);
    return [];
  }
}
