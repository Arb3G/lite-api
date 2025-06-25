// priceFetcher.js
const fetch = require('node-fetch');
const {
  Asset,
  LiquidityPoolFeeV18,
  xdr,
  StrKey
} = require('@stellar/stellar-sdk');

const CJS_ISSUER = process.env.CJS_ISSUER;
const HORIZON_URL = 'https://horizon-futurenet.stellar.org';

// Fetch XLM/USD price from CoinGecko
async function getLiveXLMtoUSD() {
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd';
  const res = await fetch(url);
  if (!res.ok) throw new Error("❌ Failed to fetch XLM/USD price");
  const json = await res.json();
  return json.stellar.usd;
}

// Manually compute the pool ID (compatible fallback)
function computePoolID(assetA, assetB, fee = 30) {
  const [asset1, asset2] = Asset.compare(assetA, assetB) < 0 ? [assetA, assetB] : [assetB, assetA];

  const liquidityPoolParameters = new xdr.LiquidityPoolConstantProductParameters({
    assetA: asset1.toXDRObject(),
    assetB: asset2.toXDRObject(),
    fee: LiquidityPoolFeeV18.toXDR(fee),
  });

  const liquidityPoolType = xdr.LiquidityPoolType.liquidityPoolConstantProduct();

  const params = new xdr.LiquidityPoolParameters.constantProduct(liquidityPoolParameters);

  const liquidityPoolBody = new xdr.LiquidityPoolEntryBody.constantProduct({
    constantProduct: liquidityPoolParameters
  });

  const poolId = xdr.PoolId.fromXDR(
    xdr.Hash.hash(liquidityPoolBody.toXDR())
  );

  return StrKey.encodeLiquidityPoolId(poolId);
}

// Fetch the CJS/XLM price from Stellar liquidity pool
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

// Convert CJS → XLM → USD
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
