const fetch = require('node-fetch');

const HORIZON_URL = 'https://horizon.stellar.org'; // mainnet Horizon
const POOL_ID = process.env.POOL_ID;

async function getLiveXLMtoUSD() {
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd';
  const res = await fetch(url);
  if (!res.ok) throw new Error("❌ Failed to fetch XLM/USD price");
  const json = await res.json();
  const usd = json?.stellar?.usd;

  if (!usd || isNaN(usd)) throw new Error("❌ Invalid XLM/USD price");
  return parseFloat(usd);
}

async function getCJSXLMPriceFromPool() {
  if (!POOL_ID) throw new Error('❌ POOL_ID is not set in environment variables');

  const url = `${HORIZON_URL}/liquidity_pools/${POOL_ID}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("❌ Failed to fetch liquidity pool data");

  const pool = await res.json();

  if (!pool || !pool.reserves || pool.reserves.length !== 2) {
    throw new Error('❌ Invalid or empty liquidity pool data');
  }

  const reserveCJS = pool.reserves.find(r => r.asset !== 'native');
  const reserveXLM = pool.reserves.find(r => r.asset === 'native');

  if (!reserveCJS || !reserveXLM) {
    throw new Error('❌ Could not find both XLM and CJS reserves');
  }

  const amountCJS = parseFloat(reserveCJS.amount);
  const amountXLM = parseFloat(reserveXLM.amount);

  if (isNaN(amountCJS) || isNaN(amountXLM) || amountCJS === 0) {
    throw new Error('❌ Invalid reserve amounts');
  }

  const priceCJS_XLM = amountXLM / amountCJS;

  return {
    priceCJS_XLM,
    amountXLM,
    amountCJS
  };
}

async function getUnitPriceUSD() {
  const xlmToUSD = await getLiveXLMtoUSD();
  const { priceCJS_XLM, amountXLM, amountCJS } = await getCJSXLMPriceFromPool();

  console.log(`🔍 XLM to USD: $${xlmToUSD}`);
  console.log(`🔁 CJS to XLM: ${priceCJS_XLM}`);

  const priceCJS_USD = parseFloat((xlmToUSD * priceCJS_XLM).toFixed(8));
  console.log(`✅ Final Price per CJS in USD: $${priceCJS_USD}`);

  // TVL calculation
  const tvlUSD = (amountXLM * xlmToUSD) + (amountCJS * priceCJS_USD);
  console.log(`Current Liquidity Pool Stats: 💰 TVL: ~$${tvlUSD.toFixed(2)} (1 XLM + ${amountCJS} CJS)`);

  // Warn if shallow
  if (amountXLM < 5 || amountCJS < 1000) {
    console.warn(`⚠️ Warning: Your LP is very shallow (Depth: ${amountXLM} XLM / ${amountCJS} CJS). Expect high slippage.`);
  }

  return priceCJS_USD;
}

module.exports = {
  getLiveXLMtoUSD,
  getCJSXLMPriceFromPool,
  getUnitPriceUSD
};
