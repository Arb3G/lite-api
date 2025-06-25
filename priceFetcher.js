// priceFetcher.js
const fetch = require('node-fetch');
const { Asset, StrKey } = require('@stellar/stellar-sdk');

const CJS_ISSUER = process.env.CJS_ISSUER;
const HORIZON_URL = 'https://horizon-futurenet.stellar.org';

// CoinGecko XLM/USD fetch
async function getLiveXLMtoUSD() {
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd';
  const res = await fetch(url);
  if (!res.ok) throw new Error("❌ Failed to fetch XLM/USD price");
  const json = await res.json();
  return json.stellar.usd;
}

// Manually construct Pool ID for CJS/XLM constant product pool
function computePoolID(assetA, assetB, fee = 30) {
  const [asset1, asset2] = Asset.compare(assetA, assetB) < 0 ? [assetA, assetB] : [assetB, assetA];

  const poolParams = {
    fee,
    assetA: asset1,
    assetB: asset2
  };

  const poolIdBytes = Asset.getLiquidityPoolId('constant_product', poolParams);
  return StrKey.encodeLiquidityPoolId(poolIdBytes);
}

// Fetch CJS/XLM price from pool reserves
async function getCJSXLMPriceFromPool() {
  if (!CJS_ISSUER) throw new Error('❌ Missing environment variable: CJS_ISSUER');

  const CJS = new Asset('CJS', CJS_ISSUER);
  const XLM = Asset.native();

  const poolID = computePoolID(CJS, XLM);

  const url = `${HORIZON_URL}/liquidity_pools/${poolID}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("❌ Failed to fetch liquidity pool data");

  const data = await res.json();
  const reserves = data.reserves;

  const reserveCJS = parseFloat(reserves.find(r => r.asset !== 'native').amount);
  const reserveXLM = parseFloat(reserves.find(r => r.asset === 'native').amount);

  return reserveXLM / reserveCJS;
}

// USD price = (CJS → XLM) × (XLM → USD)
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
