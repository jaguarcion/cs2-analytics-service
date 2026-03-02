-- Set currency to RUB for all existing Market.CSGO trades where currency is NULL
UPDATE trades
SET currency = 'RUB'
WHERE platform_source = 'MARKET_CSGO'
  AND currency IS NULL;

-- Show results
SELECT 
  COUNT(*) as total_market_trades,
  SUM(CASE WHEN currency = 'RUB' THEN 1 ELSE 0 END) as rub_trades,
  SUM(CASE WHEN currency = 'USD' THEN 1 ELSE 0 END) as usd_trades,
  SUM(CASE WHEN currency IS NULL THEN 1 ELSE 0 END) as null_trades
FROM trades
WHERE platform_source = 'MARKET_CSGO';
