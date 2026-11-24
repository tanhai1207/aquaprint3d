import { loadCatalog } from './catalog.js';
import { renderCatalog, showCatalogError } from './catalog-page.js';
import { initEffects } from './effects.js';
import { initGalleryViewer } from './image-viewer.js';
import { initLenis, HAS_ST, ScrollTrigger } from './motion.js';
import { initMobileNav, initScrollEffects, initScrollSpy, initSmoothScroll, restoreHashPosition } from './navigation.js';
import { renderProductDetails, showProductLoadError } from './product-page.js';

async function loadProductContent(region, render, showError) {
  const load = async () => {
    region.setAttribute('aria-busy', 'true');
    try {
      let catalog;
      try {
        catalog = await loadCatalog();
      } catch (error) {
        console.error('[AquaPrint 3D] Không thể tải danh mục', error);
        showError(event => {
          event.currentTarget.disabled = true;
          void load();
        });
        return;
      }
      render(catalog);
    } finally {
      region.setAttribute('aria-busy', 'false');
      if (HAS_ST) ScrollTrigger.refresh();
    }
  };

  await load();
}

document.addEventListener('DOMContentLoaded', async () => {
  initLenis();
  initMobileNav();
  initSmoothScroll();
  initScrollEffects();
  initEffects();
  initGalleryViewer();
  initScrollSpy();

  const grid = document.getElementById('productGrid');
  const detail = document.getElementById('product-detail');
  if (grid) await loadProductContent(grid, renderCatalog, showCatalogError);
  if (detail) await loadProductContent(detail, renderProductDetails, showProductLoadError);

  restoreHashPosition();
  if (HAS_ST) document.fonts?.ready.then(() => ScrollTrigger.refresh());
});
