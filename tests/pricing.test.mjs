import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildZaloOrderUrl, calculatePricing, formatVnd } from '../js/pricing.js';

test('bulk pricing changes at 5 and 10 items and reports the next tier', () => {
  const expected = [
    { quantity: 4, unitPrice: 75000, total: 300000, saved: 0, next: { minQuantity: 5, perUnit: 5000 } },
    { quantity: 5, unitPrice: 70000, total: 350000, saved: 25000, next: { minQuantity: 10, perUnit: 10000 } },
    { quantity: 9, unitPrice: 70000, total: 630000, saved: 45000, next: { minQuantity: 10, perUnit: 10000 } },
    { quantity: 10, unitPrice: 65000, total: 650000, saved: 100000, next: undefined }
  ];
  for (const pricing of expected) {
    assert.deepEqual(calculatePricing(75000, pricing.quantity), pricing);
  }
});

test('quantity stays in range and a discount cannot make the unit price negative', () => {
  assert.equal(calculatePricing(75000, NaN).quantity, 1);
  assert.equal(calculatePricing(75000, 0).quantity, 1);
  assert.equal(calculatePricing(75000, 4.9).quantity, 4);
  assert.equal(calculatePricing(75000, 100).quantity, 99);
  const { unitPrice, total, saved } = calculatePricing(3000, 10);
  assert.deepEqual({ unitPrice, total, saved }, { unitPrice: 0, total: 0, saved: 30000 });
});

test('Zalo receives the same price and quantity shown on the product page', () => {
  const product = { name: 'Hang Tép & Cá', price: 75000 };
  const pricing = calculatePricing(product.price, 5);
  const link = new URL(buildZaloOrderUrl(product, pricing));
  const message = link.searchParams.get('text');
  assert.equal(link.origin, 'https://zalo.me');
  assert.ok(message.includes(product.name));
  assert.ok(message.includes('Số lượng: 5'));
  assert.ok(message.includes('350.000₫'));
  assert.ok(message.includes(formatVnd(pricing.saved)));

  const singleItemMessage = new URL(buildZaloOrderUrl(product)).searchParams.get('text');
  assert.ok(singleItemMessage.includes('Số lượng: 1'));
  assert.ok(singleItemMessage.includes('75.000₫'));
});
