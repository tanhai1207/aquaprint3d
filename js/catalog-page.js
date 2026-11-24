import { escapeHtml, getProductImages } from './catalog.js';
import { buildZaloOrderUrl, discountTiers, formatVnd } from './pricing.js';
import { gsap, ScrollTrigger, Flip, EASE, HAS_GSAP, HAS_FLIP, MOTION, REDUCED_MOTION, FINE_POINTER, lockTransitions } from './motion.js';

function moveTabIndicator(tabsEl, animate) {
  const indicator = tabsEl.querySelector('.tab-indicator');
  const active = tabsEl.querySelector('.category-tab.active');
  if (!indicator || !active) return;

  const vars = {
    x: active.offsetLeft,
    y: active.offsetTop,
    width: active.offsetWidth,
    height: active.offsetHeight
  };

  if (HAS_GSAP) {
    gsap.to(indicator, { ...vars, duration: animate && !REDUCED_MOTION ? 0.6 : 0, ease: EASE, overwrite: true });
  } else {
    indicator.style.transform = `translate(${vars.x}px, ${vars.y}px)`;
    indicator.style.width = `${vars.width}px`;
    indicator.style.height = `${vars.height}px`;
  }

  // Mobile: tabs cuộn ngang → đưa tab đang chọn vào giữa
  if (tabsEl.scrollWidth > tabsEl.clientWidth) {
    tabsEl.scrollTo({
      left: active.offsetLeft - (tabsEl.clientWidth - active.offsetWidth) / 2,
      behavior: animate && !REDUCED_MOTION ? 'smooth' : 'auto'
    });
  }
}

function renderCategoryTabs(tabsEl, { categories, products }, filterProducts) {
  let activeCategory = 'all';
  const productCounts = new Map();
  for (const { category } of products) {
    productCounts.set(category, (productCounts.get(category) ?? 0) + 1);
  }

  const tabs = [
    { id: 'all', name: 'Tất Cả', icon: 'fa-th-large', count: products.length },
    ...categories.map(category => ({ ...category, count: productCounts.get(category.id) ?? 0 }))
  ];

  tabsEl.innerHTML = `<span class="tab-indicator" aria-hidden="true"></span>` + tabs.map(t => `
    <button type="button" class="category-tab ${t.id === activeCategory ? 'active' : ''}"
            data-category="${escapeHtml(t.id)}" aria-pressed="${t.id === activeCategory}" aria-controls="productGrid">
      <i class="fas ${escapeHtml(t.icon)}" aria-hidden="true"></i>
      <span>${escapeHtml(t.name)}</span>
      <span class="category-count">${t.count}</span>
    </button>
  `).join('');
  tabsEl.classList.add('has-indicator');

  const tabButtons = [...tabsEl.querySelectorAll('.category-tab')];
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.category;
      if (MOTION) {
        const unlock = lockTransitions(btn);
        gsap.fromTo(btn, { scale: 0.94 }, { scale: 1, duration: 0.5, ease: 'back.out(3)', clearProps: 'transform', onComplete: unlock });
      }
      if (cat === activeCategory) return;
      activeCategory = cat;
      tabButtons.forEach(button => {
        const selected = button === btn;
        button.classList.toggle('active', selected);
        button.setAttribute('aria-pressed', selected);
      });
      moveTabIndicator(tabsEl, true);
      filterProducts(cat);
    });
  });

  if (MOTION) {
    tabButtons.forEach(b => b.classList.add('gsap-driven'));
    gsap.from(tabButtons, {
      y: 16, opacity: 0, duration: 0.7, stagger: 0.06, ease: EASE, clearProps: 'opacity,transform',
      scrollTrigger: { trigger: tabsEl, start: 'top 90%', once: true },
      onComplete: () => tabButtons.forEach(b => b.classList.remove('gsap-driven'))
    });
  }

  moveTabIndicator(tabsEl, false);
}

/* =========================================
   Render: Product Grid (Flip filter)
   ========================================= */
function renderProductGrid(grid, { categories, products }) {
  const categoryById = new Map(categories.map(category => [category.id, category]));
  const firstDiscount = discountTiers[discountTiers.length - 2];
  grid.innerHTML = products.map(product => {
    const category = categoryById.get(product.category);
    const [image, alternateImage] = getProductImages(product);
    const productUrl = `product.html?id=${encodeURIComponent(product.id)}`;
    const name = escapeHtml(product.name);
    return `
      <article class="product-card" data-category="${escapeHtml(product.category)}" data-id="${escapeHtml(product.id)}">
        <div class="product-card-inner">
          <a href="${productUrl}" class="product-image" aria-label="${name}">
            <img class="product-img-main" src="${escapeHtml(image)}" alt="${name}" loading="lazy" decoding="async">
            ${alternateImage ? `<img class="product-img-alt" src="${escapeHtml(alternateImage)}" alt="" aria-hidden="true" loading="lazy" decoding="async">` : ''}
            ${category ? `<span class="product-badge"><i class="fas ${escapeHtml(category.icon)}" aria-hidden="true"></i> ${escapeHtml(category.name)}</span>` : ''}
          </a>
          <div class="product-info">
            <h3>${name}</h3>
            <p>${escapeHtml(product.shortDescription)}</p>
            <span class="price">${formatVnd(product.price)}</span>
            <span class="bulk-hint"><i class="fas fa-tag" aria-hidden="true"></i> Mua từ ${firstDiscount.minQuantity} cái — giảm ${formatVnd(firstDiscount.perUnit)}/cái</span>
            <div class="product-actions">
              <a href="${productUrl}" class="btn btn-sm btn-secondary">Chi Tiết</a>
              <a href="${buildZaloOrderUrl(product)}" target="_blank" rel="noopener" class="btn btn-sm btn-primary">
                <i class="fas fa-comment-dots"></i> Đặt Zalo
              </a>
            </div>
          </div>
          <span class="card-glare" aria-hidden="true"></span>
        </div>
      </article>
    `;
  }).join('') + '<p class="grid-empty" hidden>Chưa có sản phẩm nào.</p>';

  const cards = [...grid.querySelectorAll('.product-card')];
  cards.forEach(initCardTilt);
  initCardViewTransition(grid);

  let revealTriggers = [];
  if (MOTION && cards.length) {
    gsap.set(cards, { opacity: 0, y: 40 });
    revealTriggers = ScrollTrigger.batch(cards, {
      start: 'top 95%',
      once: true,
      onEnter: batch => {
        batch.forEach(el => { el.dataset.revealed = '1'; });
        gsap.to(batch, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out', overwrite: true });
      }
    });
  }

  const emptyMessage = grid.querySelector('.grid-empty');
  emptyMessage.hidden = cards.length > 0;
  let filterAnimation;

  return category => {
    filterAnimation?.progress(1);
    if (revealTriggers.length) {
      revealTriggers.forEach(trigger => trigger.kill());
      revealTriggers = [];
      // Make unrevealed cards measurable before filtering.
      const pending = cards.filter(card => card.dataset.revealed !== '1');
      if (pending.length) gsap.set(pending, { opacity: 1, y: 0 });
    }

    const state = MOTION && HAS_FLIP && cards.length ? Flip.getState(cards) : null;
    const previousHeight = state ? grid.offsetHeight : 0;
    let visibleCount = 0;
    for (const card of cards) {
      card.hidden = category !== 'all' && card.dataset.category !== category;
      card.inert = card.hidden;
      if (!card.hidden) visibleCount += 1;
    }
    emptyMessage.hidden = visibleCount > 0;
    if (state) {
      // Keep the section below outside the footprint of the moving cards.
      grid.style.minHeight = `${Math.max(previousHeight, grid.offsetHeight)}px`;
      filterAnimation = animateFilter(state, () => {
        filterAnimation = undefined;
        grid.style.removeProperty('min-height');
        ScrollTrigger.refresh();
      });
    } else if (MOTION) {
      ScrollTrigger.refresh();
    }
    return visibleCount;
  };
}

function animateFilter(state, releaseGridHeight) {
  return Flip.from(state, {
    duration: 0.75,
    ease: 'power3.inOut',
    absoluteOnLeave: true,
    stagger: 0.03,
    onEnter: elements => gsap.fromTo(elements,
      { autoAlpha: 0, scale: 0.85, y: 30 },
      { autoAlpha: 1, scale: 1, y: 0, duration: 0.7, stagger: 0.06, delay: 0.2, ease: EASE }),
    onLeave: elements => gsap.to(elements, { autoAlpha: 0, scale: 0.85, duration: 0.35, ease: 'power2.in' }),
    onComplete: releaseGridHeight,
    onInterrupt: releaseGridHeight
  });
}

/** 3D tilt + glare theo vị trí chuột (chỉ desktop) */
function initCardTilt(card) {
  if (!MOTION || !FINE_POINTER) return;
  const inner = card.querySelector('.product-card-inner');
  if (!inner) return;

  gsap.set(inner, { transformPerspective: 900 });
  const rx = gsap.quickTo(inner, 'rotationX', { duration: 0.6, ease: 'power3' });
  const ry = gsap.quickTo(inner, 'rotationY', { duration: 0.6, ease: 'power3' });

  card.addEventListener('pointerenter', () => {
    gsap.to(inner, { y: -10, duration: 0.6, ease: 'power3.out', overwrite: 'auto' });
  });
  card.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    ry((px - 0.5) * 10);
    rx((0.5 - py) * 8);
    inner.style.setProperty('--gx', `${px * 100}%`);
    inner.style.setProperty('--gy', `${py * 100}%`);
  });
  card.addEventListener('pointerleave', () => {
    rx(0);
    ry(0);
    gsap.to(inner, { y: 0, duration: 0.7, ease: 'power3.out', overwrite: 'auto' });
  });
}

/** Đặt view-transition-name cho ảnh card được click → ảnh "bay" sang trang chi tiết */
function initCardViewTransition(grid) {
  grid.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || REDUCED_MOTION) return;
    const link = e.target.closest('a[href^="product.html"]');
    const card = link?.closest('.product-card');
    const img = card?.querySelector('.product-img-main');
    if (!img) return;
    grid.querySelectorAll('.product-img-main').forEach(i => { i.style.viewTransitionName = ''; });
    img.style.viewTransitionName = 'product-hero';
    card.classList.add('is-leaving');
    try {
      sessionStorage.setItem('ap3d-vt', JSON.stringify({ id: card.dataset.id, src: img.getAttribute('src') }));
    } catch {}
  });

  // Quay lại bằng nút Back (bfcache) → dọn trạng thái
  window.addEventListener('pageshow', () => {
    grid.querySelectorAll('.product-img-main').forEach(i => { i.style.viewTransitionName = ''; });
    grid.querySelectorAll('.product-card.is-leaving').forEach(c => c.classList.remove('is-leaving'));
  });
}

export function renderCatalog(catalog) {
  const grid = document.getElementById('productGrid');
  const tabs = document.getElementById('categoryTabs');
  const status = document.getElementById('product-filter-status');
  tabs.hidden = !catalog.categories.length;
  const filter = renderProductGrid(grid, catalog);
  if (tabs.hidden) return;
  renderCategoryTabs(tabs, catalog, category => {
    status.textContent = `${filter(category)} sản phẩm`;
  });
  document.fonts?.ready.then(() => moveTabIndicator(tabs, false));

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => moveTabIndicator(tabs, false), 150);
  });
}

export function showCatalogError(retry) {
  const grid = document.getElementById('productGrid');
  document.getElementById('categoryTabs').hidden = true;
  grid.innerHTML = `
    <div class="grid-empty">
      <p role="status">Không thể tải danh sách sản phẩm.</p>
      <button type="button" class="btn btn-primary catalog-retry">Thử lại</button>
    </div>
  `;
  grid.querySelector('.catalog-retry').onclick = retry;
}
