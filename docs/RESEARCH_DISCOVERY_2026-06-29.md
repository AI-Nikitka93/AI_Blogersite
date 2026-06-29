# RESEARCH DISCOVERY: Optimal Context Size & Hallucination Prevention
**Date:** 2026-06-29

## The Problem
The project suffered from "nonsense" / hallucinated outputs during news generation. The root cause was traced back to the `maxLength = 260` limit in the RSS parser (`src/lib/connectors/rss.ts`), an artifact historically tied to old limits like `MAX_PATH` or old Twitter limits.

## Subagent Research Findings
According to web searches of 2026 best practices (e.g., Mindscape-Aware RAG, RULER Benchmarks):
1. **Context Rot:** Feeding an LLM too little data (260 characters) forces the model to invent facts to meet generation constraints (e.g. 5 paragraphs). It loses the "So What?" and invents missing background.
2. **Optimal Size:** Instead of maximizing context (1M+ tokens) which degrades performance, standard 2026 pipelines expand individual fact chunking to 1000–1500 characters. This preserves semantic completeness and provides sufficient factual grounding.
3. **Prompt Adaptation:** When feeding larger 1500-character blocks, prompts must explicitly command the generator to compress observed facts into 1-2 short sentences to avoid bloating the final JSON.

## Implementation Result
* Increased default `maxLength` in `summarizeRssDescriptionForFact` from 260 to 1500.
* Added constraint in `GENERATOR_SYSTEM_PROMPT`: "Compress each observed fact into 1-2 short sentences. Do not output long raw paragraphs."
* The change proved safe against existing `fast-xml-parser` logic and Telegram integration (`clampText(hook, 260)` safely prevents Telegram message bloating).
