// priceFetcher.js
// priceFetcher.js
const fetch = require('node-fetch'); // if you want to use node-fetch v2, else dynamic import it too

const CJS_ISSUER = process.env.CJS_ISSUER;
const HORIZON_URL = 'https://horizon-futurenet.stellar.org';

// Fetch live XLM/USD from CoinGecko
async function getLiveXLMtoUSD() {
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd';
  const res = await fetch(url);
  if (!res.ok) throw new Error("❌ Failed to fetch XLM/USD price");
  const json = await res.json();
  return json.stellar.usd;
}

// Dynamically import Stellar SDK
async function getStellarSdk() {
  return await import('@stellar/stellar-sdk');
}

// Compute liquidity pool ID for constant product pool
async function computePoolID(assetA, assetB, fee = 30) {
  const StellarSdk = await getStellarSdk();
  const { Asset, StrKey, xdr } = StellarSdk;

  const [asset1, asset2] = Asset.compare(assetA, assetB) < 0 ? [assetA, assetB] : [assetB, assetA];

  const liquidityPoolParams = new xdr.LiquidityPoolConstantProductParameters({
    assetA: asset1.toXDRObject(),
    assetB: asset2.toXDRObject(),
    fee: xdr.Uint32.fromString(fee.toString())
  });

  const poolParams = new xdr.LiquidityPoolParameters('liquidityPoolConstantProduct', liquidityPoolParams);
  const poolId = xdr.PoolId.fromXDR(xdr.Hash.hash(poolParams.toXDR()));

  return StrKey.encodeLiquidityPoolId(poolId);
}

// Get CJS/XLM price from Stellar liquidity pool
async function getCJSXLMPriceFromPool() {
  if (!CJS_ISSUER) throw new Error('❌ CJS_ISSUER is not set in environment variables');

  const StellarSdk = await getStellarSdk();
  const { Asset } = StellarSdk;
  // Access Server via StellarSdk.Server.Server
  const ServerClass = StellarSdk.Server.Server || StellarSdk.Server; // fallback if nested

  const server = new ServerClass(HORIZON_URL);

  const CJS = new Asset('CJS', CJS_ISSUER);
  const XLM = Asset.native();

  const poolId = await computePoolID(CJS, XLM);
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
