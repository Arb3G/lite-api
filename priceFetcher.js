// priceFetcher.js

const StellarSdk = require('@stellar/stellar-sdk');
const fetch = require('node-fetch');

const { Asset } = StellarSdk;

const HORIZON_URL = 'https://horizon-futurenet.stellar.org';
const POOL_ID = process.env.POOL_ID;
const CJS_ISSUER = process.env.CJS_ISSUER;

const server = new StellarSdk.Server(HORIZON_URL);

async function getLiveXLMtoUSD() {
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd';
  const res = await fetch(url);
  if (!res.ok) throw new Error("❌ Failed to fetch XLM/USD price");
  const json = await res.json();
  return json.stellar.usd;
}

async function getCJSXLMPriceFromPool() {
  if (!POOL_ID) throw new Error('❌ POOL_ID is not set in environment variables');
  if (!CJS_ISSUER) throw new Error('❌ CJS_ISSUER is not set in environment variables');

  const pool = await server.liquidityPools().liquidityPoolId(POOL_ID).call();

  const reserves = pool.reserves;
  const reserveCJS = parseFloat(reserves.find(r => r.asset !== 'native').amount);
  const reserveXLM = parseFloat(reserves.find(r => r.asset === 'native').amount);

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
