const catalogUrl = new URL('../data/products.json', import.meta.url);
const htmlEntities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  return value.replace(/[&<>"']/g, character => htmlEntities[character]);
}

function isText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isOptionalTextList(value) {
  return value == null || (Array.isArray(value) && value.every(isText));
}

function isCategory(category) {
  return category && isText(category.id) && isText(category.name) && isText(category.icon);
}

function isProduct(product) {
  return product
    && [product.id, product.category, product.name, product.image, product.shortDescription, product.description].every(isText)
    && Number.isSafeInteger(product.price) && product.price >= 0
    && isOptionalTextList(product.images) && isOptionalTextList(product.specs);
}

export async function loadCatalog() {
  const response = await fetch(catalogUrl);
  if (!response.ok) throw new Error(`Không tải được danh mục (HTTP ${response.status})`);

  const catalog = await response.json();
  if (!Array.isArray(catalog?.categories) || !catalog.categories.every(isCategory)
    || !Array.isArray(catalog.products) || !catalog.products.every(isProduct)) {
    throw new Error('Định dạng danh mục sản phẩm không hợp lệ');
  }
  return catalog;
}

export function getProductImages(product) {
  return [...new Set([product.image, ...(product.images ?? [])])];
}
