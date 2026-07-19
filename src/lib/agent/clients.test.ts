import assert from "node:assert/strict";

import { createMiroChatClient, resolveMiroLlmProvider } from "./clients";

const originalFetch = globalThis.fetch;
const originalPool = process.env.NVIDIA_API_KEYS;
const originalLegacyKey = process.env.NVIDIA_API_KEY;

try {
  process.env.NVIDIA_API_KEYS = "test-nvidia-key-one, test-nvidia-key-two";
  delete process.env.NVIDIA_API_KEY;

  assert.equal(
    resolveMiroLlmProvider("nvidia"),
    "nvidia",
    "a configured NVIDIA key pool selects NVIDIA even without the legacy single-key variable",
  );

  const attemptedKeys: string[] = [];
  globalThis.fetch = (async (_input, init) => {
    const authorization = new Headers(init?.headers).get("Authorization") ?? "";
    attemptedKeys.push(authorization);

    if (attemptedKeys.length === 1) {
      return new Response("rate limited", { status: 429, statusText: "Too Many Requests" });
    }

    return new Response(
      JSON.stringify({ choices: [{ message: { content: "ok" } }] }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  const client = createMiroChatClient({ provider: "nvidia" });
  const completion = await client.chat.completions.create({ model: "openai/gpt-oss-20b" });

  assert.equal(completion.choices?.[0]?.message?.content, "ok");
  assert.deepEqual(attemptedKeys, ["Bearer test-nvidia-key-one", "Bearer test-nvidia-key-two"]);
} finally {
  globalThis.fetch = originalFetch;

  if (originalPool === undefined) {
    delete process.env.NVIDIA_API_KEYS;
  } else {
    process.env.NVIDIA_API_KEYS = originalPool;
  }

  if (originalLegacyKey === undefined) {
    delete process.env.NVIDIA_API_KEY;
  } else {
    process.env.NVIDIA_API_KEY = originalLegacyKey;
  }
}
