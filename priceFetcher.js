// priceFetcher.js
const { Server, Asset } = require('@stellar/stellar-sdk');
const fetch = require('node-fetch');
const { Asset } = require('@stellar/stellar-sdk');

const HORIZON_URL = 'https://horizon-futurenet.stellar.org';
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
  const url = `${HORIZON_URL}/liquidity_pools/${POOL_ID}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch pool');
  const pool = await res.json();
  const r = pool.reserves;
  const reserveCJS = parseFloat(r.find(x => x.asset !== 'native').amount);
  const reserveXLM = parseFloat(r.find(x => x.asset === 'native').amount);
  return reserveXLM / reserveCJS;
}

async function getUnitPriceUSD() {
  const xlmToUSD = await getLiveXLMtoUSD();
  const cjsToXLM = await getCJSXLMPriceFromPool();
  return parseFloat((xlmToUSD * cjsToXLM).toFixed(4));
}

module.exports = {
  getLiveXLMtoUSD,
  getCJSXLMPriceFromPool,
  getUnitPriceUSD
};
