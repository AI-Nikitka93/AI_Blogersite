import { fetchGdeltFacts } from '../src/lib/connectors/gdelt';

async function main() {
    const queries = [
        "artificial intelligence July 2026",
        "large language model July 2026",
        "space launch July 2026",
        "machine learning July 2026",
        "quantum computing July 2026",
        "robotics July 2026",
        "blockchain July 2026"
    ];

    for (const q of queries) {
        console.log(`\nTesting query: ${q}`);
        try {
            const facts = await fetchGdeltFacts({ keywords: [q], timespan: "3days" });
            console.log(`Success, facts count: ${facts.facts.length}`);
            console.log(facts.facts);
        } catch (e: any) {
            console.error(`Error for query ${q}:`, e?.stack || e);
            if (e?.cause) console.error(`Error Cause for query ${q}:`, e.cause);
        }
    }
}

main().catch(console.error);
