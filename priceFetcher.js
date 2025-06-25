// priceFetcher.js
// priceFetcher.js
const StellarSdk = require('@stellar/stellar-sdk');
const fetch = require('node-fetch');

const { Asset, StrKey, xdr } = StellarSdk;
const { Server } = require('@stellar/stellar-sdk/server'); // ✅ FIXED

const CJS_ISSUER = process.env.CJS_ISSUER;
const HORIZON_URL = 'https://horizon-futurenet.stellar.org';

const server = new Server(HORIZON_URL);

// Fetch live XLM/USD from CoinGecko
async function getLiveXLMtoUSD() {
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd';
  const res = await fetch(url);
  if (!res.ok) throw new Error("❌ Failed to fetch XLM/USD price");
  const json = await res.json();
  return json.stellar.usd;
}

// Dynamically compute pool ID for constant product pool
function computePoolID(assetA, assetB, fee = 30) {
  const [asset1, asset2] = Asset.compare(assetA, assetB) < 0 ? [assetA, assetB] : [assetB, assetA];

  const poolParams = new xdr.LiquidityPoolConstantProductParameters({
    assetA: asset1.toXDRObject(),
    assetB: asset2.toXDRObject(),
    fee: xdr.Uint32.fromString(fee.toString())
  });

  const wrappedParams = new xdr.LiquidityPoolParameters('liquidityPoolConstantProduct', poolParams);
  const poolId = xdr.PoolId.fromXDR(xdr.Hash.hash(wrappedParams.toXDR()));
  return StrKey.encodeLiquidityPoolId(poolId);
}

// Get CJS/XLM price from Stellar liquidity pool
async function getCJSXLMPriceFromPool() {
  if (!CJS_ISSUER) throw new Error('❌ CJS_ISSUER is not set in environment variables');

  const CJS = new Asset('CJS', CJS_ISSUER);
  const XLM = Asset.native();

  const poolId = computePoolID(CJS, XLM);
  const pool = await server.liquidityPools().liquidityPoolId(poolId).call();

  const reserves = pool.reserves;
  const reserveCJS = parseFloat(reserves.find(r => r.asset !== 'native').amount);
  const reserveXLM = parseFloat(reserves.find(r => r.asset === 'native').amount);

  return reserveXLM / reserveCJS; // 1 CJS = ? XLM
}

// Convert CJS to USD using Stellar + CoinGecko
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
