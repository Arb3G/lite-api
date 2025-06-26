// priceFetcher.js

const { Asset, Server } = require('@stellar/stellar-sdk');
const fetch = require('node-fetch');

const HORIZON_URL = 'https://horizon.stellar.org'; // Use mainnet Horizon
const server = new Server(HORIZON_URL);

const POOL_ID = process.env.POOL_ID; // Set your liquidity pool ID in .env
const CJS_ISSUER = process.env.CJS_ISSUER; // Not used here but keep for reference if needed

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

  const pool = await server.liquidityPools().liquidityPoolId(POOL_ID).call();

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

  return amountXLM / amountCJS; // 1 CJS = ? XLM
}

async function getUnitPriceUSD() {
  const xlmToUSD = await getLiveXLMtoUSD();
  const cjsToXLM = await getCJSXLMPriceFromPool();

  console.log(`🔍 XLM to USD: $${xlmToUSD}`);
  console.log(`🔁 CJS to XLM: ${cjsToXLM}`);

  if (isNaN(xlmToUSD) || isNaN(cjsToXLM)) {
    throw new Error('❌ Invalid pricing data: one or both values are not numbers');
  }

  const result = parseFloat((xlmToUSD * cjsToXLM).toFixed(8));
  console.log(`✅ Final Price per CJS in USD: $${result}`);

  return result;
}

module.exports = {
  getLiveXLMtoUSD,
  getCJSXLMPriceFromPool,
  getUnitPriceUSD
};



module.exports = {
  getLiveXLMtoUSD,
  getCJSXLMPriceFromPool,
  getUnitPriceUSD
};
