import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { getProductImages, loadCatalog } from '../js/catalog.js';

test('catalog loads the shipped products and the main image is first without duplicates', async t => {
  const url = new URL('../data/products.json', import.meta.url);
  const data = await readFile(url, 'utf8');
  t.mock.method(globalThis, 'fetch', async requestedUrl => {
    assert.equal(requestedUrl.href, url.href);
    return new Response(data);
  });

  const { products } = await loadCatalog();
  assert.ok(products.length > 0);

  for (const product of products) {
    const images = getProductImages(product);
    assert.equal(images[0], product.image);
    assert.equal(new Set(images).size, images.length);
  }
  assert.deepEqual(getProductImages({ image: 'main.jpg' }), ['main.jpg']);
  assert.deepEqual(getProductImages({ image: 'main.jpg', images: ['alt.jpg', 'main.jpg'] }), ['main.jpg', 'alt.jpg']);
});

test('catalog rejects an HTTP error instead of treating it as an empty catalog', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 503 }));
  await assert.rejects(loadCatalog, /HTTP 503/);
});

test('catalog rejects a product whose price would break the order calculation', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({
    categories: [],
    products: [{
      id: 'sample', category: 'accessory', name: 'Sample', image: 'sample.jpg',
      shortDescription: 'Summary', description: 'Description', price: '50000'
    }]
  }));
  await assert.rejects(loadCatalog, /định dạng danh mục/i);
});
