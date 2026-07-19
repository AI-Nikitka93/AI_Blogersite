import { MiroAgent } from '../src/lib/agent/orchestrator.js';
import { buildMiroMemoryContext } from '../src/lib/miro-mind.js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('Running orchestrator...');
  const emptyMemory = buildMiroMemoryContext([]);
  
  const agent = new MiroAgent();
  const result = await agent.run({
    selectionStrategy: 'round_robin',
    forcedTopic: 'tech_world',
    memoryContext: emptyMemory,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
