const { execSync } = require('child_process');

const envs = {
    "MIRO_LLM_PROVIDER": "nvidia",
    "MIRO_WRITER_PROVIDER": "nvidia",
    "MIRO_WRITER_MODEL": "qwen/qwen3.7-max",
    "MIRO_GATEKEEPER_PROVIDER": "nvidia",
    "MIRO_GATEKEEPER_MODEL": "qwen/qwen3.7-max",
    "MIRO_FALLBACK_WRITER_PROVIDER": "groq",
    "MIRO_FALLBACK_WRITER_MODEL": "openai/gpt-oss-20b"
};

for (const [key, value] of Object.entries(envs)) {
    console.log(`Setting ${key} = ${value}`);
    try {
        execSync(`npx vercel env rm ${key} production --yes`, { stdio: 'ignore' });
    } catch(e) {} // ignore if not exists
    execSync(`npx vercel env add ${key} production`, {
        input: value,
        stdio: ['pipe', 'inherit', 'inherit']
    });
}
console.log("Done!");
