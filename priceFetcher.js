// priceFetcher.js
const fetch = require('node-fetch');
const { Asset, StrKey, xdr, Server } = require('@stellar/stellar-sdk');

const CJS_ISSUER = process.env.CJS_ISSUER;
const HORIZON_URL = 'https://horizon-futurenet.stellar.org';
const server = new Server(HORIZON_URL);

// 🔧 Helper: Compute the pool ID for CJS/XLM constant product
function computePoolID(assetA, assetB, fee = 30) {
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

// 🔁 Get live XLM → USD rate from CoinGecko
async function getLiveXLMtoUSD() {
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd';
  const res = await fetch(url);
  if (!res.ok) throw new Error("❌ Failed to fetch XLM/USD price");
  const json = await res.json();
  return json.stellar.usd;
}

// 🔁 Get price of 1 CJS in XLM from the LP
async function getCJSXLMPriceFromPool() {
  if (!CJS_ISSUER) throw new Error("❌ Missing CJS_ISSUER in environment");

  const CJS = new Asset('CJS', CJS_ISSUER);
  const XLM = Asset.native();

  const poolID = computePoolID(CJS, XLM);

  const data = await server.liquidityPools().liquidityPoolId(poolID).call();
  const reserves = data.reserves;

  const reserveCJS = parseFloat(reserves.find(r => r.asset !== 'native').amount);
  const reserveXLM = parseFloat(reserves.find(r => r.asset === 'native').amount);

  return reserveXLM / reserveCJS; // 1 CJS = ? XLM
}

// 🔁 Get USD price of 1 CJS
async function getUnitPriceUSD() {
  const xlmToUSD = await getLiveXLMtoUSD();
  const cjsToXLM = await getCJSXLMPriceFromPool();
  return parseFloat((xlmToUSD * cjsToXLM).toFixed(4));
}

module.exports = {
  getUnitPriceUSD,
  getLiveXLMtoUSD,
  getCJSXLMPriceFromPool,
};
