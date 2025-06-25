// priceFetcher.js
const fetch = require('node-fetch');
const crypto = require('crypto');
const { Asset, StrKey, xdr } = require('@stellar/stellar-sdk');

const CJS_ISSUER = process.env.CJS_ISSUER;
const HORIZON_URL = 'https://horizon-futurenet.stellar.org';

function computePoolID(assetA, assetB, fee = 30) {
  const [asset1, asset2] = Asset.compare(assetA, assetB) < 0 ? [assetA, assetB] : [assetB, assetA];

  const liquidityPoolParams = new xdr.LiquidityPoolConstantProductParameters({
    assetA: asset1.toXDRObject(),
    assetB: asset2.toXDRObject(),
    fee: fee,
  });

  const poolParams = new xdr.LiquidityPoolParameters('liquidityPoolConstantProduct', liquidityPoolParams);
  const xdrBytes = poolParams.toXDR();

  const hash = crypto.createHash('sha256').update(xdrBytes).digest();

  const poolId = xdr.PoolId.fromXDR(hash);

  return StrKey.encodeLiquidityPoolId(poolId);
}

async function getLiveXLMtoUSD() {
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd';
  const res = await fetch(url);
  if (!res.ok) throw new Error("❌ Failed to fetch XLM/USD price");
  const json = await res.json();
  return json.stellar.usd;
}

async function getCJSXLMPriceFromPool() {
  if (!CJS_ISSUER) throw new Error('❌ CJS_ISSUER is not set in environment variables');

  const CJS = new Asset('CJS', CJS_ISSUER);
  const XLM = Asset.native();

  const poolId = computePoolID(CJS, XLM);

  const url = `${HORIZON_URL}/liquidity_pools/${poolId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`❌ Failed to fetch liquidity pool data: ${res.statusText}`);

  const pool = await res.json();

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
  getUnitPriceUSD,
};
