const currencySyncService = require('../src/services/currencySyncService');

const currencies = currencySyncService.mergeCurrencies();
console.log('Total unique currencies:', currencies.length);

const bySymbol = {};
currencies.forEach(c => {
  const key = c.symbol;
  if (!bySymbol[key]) bySymbol[key] = [];
  bySymbol[key].push(c.network);
});

console.log('\nCurrencies by symbol:');
Object.keys(bySymbol).sort().forEach(symbol => {
  console.log(`  ${symbol}: ${bySymbol[symbol].length} networks - ${bySymbol[symbol].join(', ')}`);
});

console.log('\nMax bet limits:');
currencies.forEach(c => {
  const maxBet = currencySyncService.getMaxBetForCurrency(c.symbol);
  const minBet = currencySyncService.getMinBetForCurrency(c.symbol);
  console.log(`  ${c.symbol} (${c.network}): min=${minBet}, max=${maxBet}`);
});

