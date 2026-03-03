-- Set currency to RUB for all existing Market.CSGO trades where currency is NULL
-- This is needed because Market.CSGO used to return prices in RUB, but now returns USD
UPDATE trades
SET currency = 'RUB'
WHERE platform_source = 'MARKET_CSGO'
  AND currency IS NULL;
