import {
  exampleMiroConnectorUsage,
  fetchCryptoFacts,
  fetchCurrencyFacts,
  fetchGdeltFacts,
  fetchSportsFacts,
} from "./connectors";

async function main(): Promise<void> {
  const sports = await fetchSportsFacts();
  const currencies = await fetchCurrencyFacts();
  const crypto = await fetchCryptoFacts();
  const tech = await fetchGdeltFacts({
    keywords: ["artificial intelligence", "chip design", "space launch"],
    categoryHint: "Tech",
  });

  console.log(JSON.stringify({ sports, currencies, crypto, tech }, null, 2));

  const allAtOnce = await exampleMiroConnectorUsage();
  console.log(JSON.stringify(allAtOnce, null, 2));
}

void main();
