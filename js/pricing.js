const zaloUrl = 'https://zalo.me/0333255600';
const vndFormatter = new Intl.NumberFormat('vi-VN');

// Highest threshold first so the first matching tier is the best one available.
export const discountTiers = [
  { minQuantity: 10, perUnit: 10000 },
  { minQuantity: 5, perUnit: 5000 },
  { minQuantity: 1, perUnit: 0 }
];

export const maxQuantity = 99;

export function formatVnd(amount) {
  return `${vndFormatter.format(amount)}₫`;
}

export function calculatePricing(price, requestedQuantity = 1) {
  const quantity = Number.isFinite(requestedQuantity)
    ? Math.max(1, Math.min(maxQuantity, Math.trunc(requestedQuantity)))
    : 1;
  const tierIndex = discountTiers.findIndex(tier => quantity >= tier.minQuantity);
  const unitPrice = Math.max(0, price - discountTiers[tierIndex].perUnit);

  return {
    quantity,
    unitPrice,
    total: unitPrice * quantity,
    saved: (price - unitPrice) * quantity,
    next: discountTiers[tierIndex - 1]
  };
}

export function buildZaloOrderUrl(product, pricing = calculatePricing(product.price)) {
  const { quantity, unitPrice, total, saved } = pricing;
  const perUnitDiscount = saved > 0 ? ` (giảm ${formatVnd(saved / quantity)})` : '';
  const savings = saved > 0 ? ` (tiết kiệm ${formatVnd(saved)})` : '';
  const message = [
    'Xin chào AquaPrint 3D, mình muốn đặt sản phẩm:',
    `• ${product.name}`,
    `• Số lượng: ${quantity}`,
    `• Đơn giá: ${formatVnd(unitPrice)}/cái${perUnitDiscount}`,
    `• Tổng: ${formatVnd(total)}${savings}`,
    'Mình cần tư vấn thêm ạ.'
  ].join('\n');

  return `${zaloUrl}?text=${encodeURIComponent(message)}`;
}
