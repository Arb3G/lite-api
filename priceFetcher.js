const fetch = require('node-fetch');
//const { Asset } = require('stellar-sdk');
const { Asset, LiquidityPoolIdBuilder } = require('@stellar/stellar-sdk');

const CJS_ISSUER = process.env.CJS_ISSUER;
const HORIZON_URL = 'https://horizon-futurenet.stellar.org';

async function getLiveXLMtoUSD() {
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd';
  const res = await fetch(url);
  if (!res.ok) throw new Error("❌ Failed to fetch XLM/USD price");
  const json = await res.json();
  return json.stellar.usd;
}

async function getCJSXLMPriceFromPool() {
  const CJS = new Asset('CJS', CJS_ISSUER);
  const XLM = Asset.native();
 // const poolID = Asset.liquidityPoolId('constant_product', CJS, XLM, 0.003); // 0.3% fee
  const poolID = LiquidityPoolIdBuilder.fromAssets(CJS, XLM, 'constant_product', { fee: 30 }).toString();
  const url = `${HORIZON_URL}/liquidity_pools/${poolID}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("❌ Failed to fetch liquidity pool data");

  const data = await res.json();
  const reserves = data.reserves;

  const reserveCJS = parseFloat(reserves.find(r => r.asset !== 'native').amount);
  const reserveXLM = parseFloat(reserves.find(r => r.asset === 'native').amount);

  return reserveXLM / reserveCJS; // 1 CJS = ? XLM
}

async function getUnitPriceUSD() {
  const xlmToUSD = await getLiveXLMtoUSD();
  const cjsToXLM = await getCJSXLMPriceFromPool();
  return parseFloat((xlmToUSD * cjsToXLM).toFixed(4));
}

module.exports = { getLiveXLMtoUSD, getCJSXLMPriceFromPool, getUnitPriceUSD };
