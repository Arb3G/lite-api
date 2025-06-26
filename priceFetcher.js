// priceFetcher.js
// priceFetcher.js
// priceFetcher
const StellarSdk = require('@stellar/stellar-sdk');
const fetch = require('node-fetch');
const { Asset } = require('@stellar/stellar-sdk');

const HORIZON_URL = 'https://horizon.stellar.org';
const POOL_ID = process.env.POOL_ID;
const CJS_ISSUER = process.env.CJS_ISSUER;

async function getLiveXLMtoUSD() {
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd';
  const res = await fetch(url);
  if (!res.ok) throw new Error("❌ Failed to fetch XLM/USD price");
  const json = await res.json();
  return json.stellar.usd;
}

async function getCJSXLMPriceFromPool() {
  if (!POOL_ID) throw new Error('❌ POOL_ID not set');
  if (!CJS_ISSUER) throw new Error('❌ CJS_ISSUER not set');

  const url = `${HORIZON_URL}/liquidity_pools/${POOL_ID}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("❌ Failed to fetch liquidity pool data");

  const pool = await res.json();
  const reserves = pool.reserves;
  const reserveCJS = parseFloat(reserves.find(r => r.asset !== 'native').amount);
  const reserveXLM = parseFloat(reserves.find(r => r.asset === 'native').amount);
  console.log(`💧 Reserves — CJS: ${reserveCJS}, XLM: ${reserveXLM}`);

}

async function getUnitPriceUSD() {
  const xlmToUSD = await getLiveXLMtoUSD();
  const cjsToXLM = await getCJSXLMPriceFromPool();

  console.log(`🔍 XLM to USD: $${xlmToUSD}`);
  console.log(`🔁 CJS to XLM: ${cjsToXLM}`);

  const result = parseFloat((xlmToUSD * cjsToXLM).toFixed(8));
  console.log(`✅ Final Price per CJS in USD: $${result}`);

  return result;
}


module.exports = {
  getLiveXLMtoUSD,
  getCJSXLMPriceFromPool,
  getUnitPriceUSD
};
