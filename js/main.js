/**
 * AquaPrint 3D - Main JavaScript
 * Mobile-first, JSON-driven catalog với category filter
 */

const CONTACT = {
  zaloPhone: '0333255600',
  zaloUrl: 'https://zalo.me/0333255600',
  facebookUrl: 'https://www.facebook.com/tan.hai.668270',
  messengerUrl: 'https://m.me/tan.hai.668270',
  phoneTel: 'tel:0333255600'
};

// Discount tiers (sorted desc by minQty)
const DISCOUNT_TIERS = [
  { minQty: 10, perUnit: 10000 },
  { minQty: 5,  perUnit: 5000  },
  { minQty: 1,  perUnit: 0     }
];

function getDiscountTier(qty) {
  return DISCOUNT_TIERS.find(t => qty >= t.minQty) || DISCOUNT_TIERS[DISCOUNT_TIERS.length - 1];
}

function calcPricing(product, qty) {
  const tier = getDiscountTier(qty);
  const unitPrice = Math.max(0, product.price - tier.perUnit);
  const total = unitPrice * qty;
  const fullTotal = product.price * qty;
  const saved = fullTotal - total;
  const next = DISCOUNT_TIERS
    .filter(t => t.minQty > qty)
    .sort((a, b) => a.minQty - b.minQty)[0];
  return { tier, unitPrice, total, fullTotal, saved, next };
}

function formatVnd(n) {
  return n.toLocaleString('vi-VN') + '₫';
}

let CATALOG = { categories: [], products: [] };
let activeCategory = 'all';

async function loadCatalog() {
  try {
    const res = await fetch('data/products.json');
    if (!res.ok) throw new Error('Không tải được dữ liệu sản phẩm');
    CATALOG = await res.json();
    return CATALOG;
  } catch (err) {
    console.error('[AquaPrint3D] loadCatalog failed:', err);
    return CATALOG;
  }
}

function getProductById(id) {
  return CATALOG.products.find(p => p.id === id);
}

function getCategoryById(id) {
  return CATALOG.categories.find(c => c.id === id);
}

function buildZaloOrderUrl(product, qty = 1) {
  const { unitPrice, total, saved } = calcPricing(product, qty);
  const lines = [
    'Xin chào AquaPrint 3D, mình muốn đặt sản phẩm:',
    `• ${product.name}`,
    `• Số lượng: ${qty}`
  ];
  if (saved > 0) {
    lines.push(`• Đơn giá: ${formatVnd(unitPrice)}/cái (giảm ${formatVnd(saved / qty)})`);
    lines.push(`• Tổng: ${formatVnd(total)} (tiết kiệm ${formatVnd(saved)})`);
  } else {
    lines.push(`• Đơn giá: ${formatVnd(unitPrice)}/cái`);
    lines.push(`• Tổng: ${formatVnd(total)}`);
  }
  lines.push('Mình cần tư vấn thêm ạ.');
  return `${CONTACT.zaloUrl}?text=${encodeURIComponent(lines.join('\n'))}`;
}

/* =========================================
   Render: Category Tabs
   ========================================= */
function renderCategoryTabs() {
  const tabsEl = document.getElementById('categoryTabs');
  if (!tabsEl) return;

  const total = CATALOG.products.length;
  const counts = CATALOG.categories.reduce((acc, c) => {
    acc[c.id] = CATALOG.products.filter(p => p.category === c.id).length;
    return acc;
  }, {});

  const tabs = [
    { id: 'all', name: 'Tất Cả', icon: 'fa-th-large', count: total },
    ...CATALOG.categories.map(c => ({ ...c, count: counts[c.id] || 0 }))
  ];

  tabsEl.innerHTML = tabs.map(t => `
    <button type="button" class="category-tab ${t.id === activeCategory ? 'active' : ''}" data-category="${t.id}">
      <i class="fas ${t.icon}"></i>
      <span>${t.name}</span>
      <span class="category-count">${t.count}</span>
    </button>
  `).join('');

  tabsEl.querySelectorAll('.category-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.category;
      if (cat === activeCategory) return;
      activeCategory = cat;
      tabsEl.querySelectorAll('.category-tab').forEach(b => b.classList.toggle('active', b.dataset.category === cat));
      renderProductGrid();
    });
  });
}

/* =========================================
   Render: Product Grid
   ========================================= */
function renderProductGrid() {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  const list = activeCategory === 'all'
    ? CATALOG.products
    : CATALOG.products.filter(p => p.category === activeCategory);

  if (!list.length) {
    grid.innerHTML = `<p class="grid-empty">Chưa có sản phẩm trong nhóm này.</p>`;
    return;
  }

  grid.classList.add('grid-fading');

  setTimeout(() => {
    grid.innerHTML = list.map((p, i) => {
      const cat = getCategoryById(p.category);
      return `
        <article class="product-card" style="--stagger:${i}">
          <a href="product.html?id=${p.id}" class="product-image" aria-label="${p.name}">
            <img src="${p.image}" alt="${p.name}" loading="lazy">
            ${cat ? `<span class="product-badge"><i class="fas ${cat.icon}"></i> ${cat.name}</span>` : ''}
          </a>
          <div class="product-info">
            <h3>${p.name}</h3>
            <p>${p.shortDescription}</p>
            <span class="price">${p.priceDisplay}</span>
            <span class="bulk-hint"><i class="fas fa-tag"></i> Mua từ 5 cái — giảm 5k/cái</span>
            <div class="product-actions">
              <a href="product.html?id=${p.id}" class="btn btn-sm btn-secondary">Chi Tiết</a>
              <a href="${buildZaloOrderUrl(p)}" target="_blank" rel="noopener" class="btn btn-sm btn-primary">
                <i class="fas fa-comment-dots"></i> Đặt Zalo
              </a>
            </div>
          </div>
        </article>
      `;
    }).join('');

    grid.classList.remove('grid-fading');
    observeReveal(grid.querySelectorAll('.product-card'));
  }, 180);
}

/* =========================================
   Render: Product Detail
   ========================================= */
function renderProductDetail() {
  const wrapper = document.querySelector('.product-detail-wrapper');
  if (!wrapper) return;

  const id = new URLSearchParams(window.location.search).get('id');
  const product = id ? getProductById(id) : null;

  if (!product) {
    const info = document.querySelector('.product-detail-info');
    const image = document.querySelector('.product-detail-image');
    if (info) {
      info.innerHTML = `
        <h2>Không tìm thấy sản phẩm</h2>
        <p>Sản phẩm bạn tìm kiếm không tồn tại hoặc đã bị xóa.</p>
        <a href="index.html" class="btn btn-primary" style="margin-top: 20px;">Quay lại Trang Chủ</a>
      `;
    }
    if (image) image.style.display = 'none';
    return;
  }

  document.title = `${product.name} - AquaPrint 3D`;

  const imgEl = document.getElementById('detail-image');
  const nameEl = document.getElementById('detail-name');
  const priceEl = document.getElementById('detail-price');
  const descEl = document.getElementById('detail-description');
  const specsEl = document.getElementById('detail-specs');
  const badgeEl = document.getElementById('detail-category-badge');

  if (imgEl) {
    imgEl.src = product.image;
    imgEl.alt = product.name;
  }
  if (nameEl) nameEl.textContent = product.name;
  if (priceEl) priceEl.textContent = product.priceDisplay;
  if (descEl) descEl.textContent = product.description;

  const cat = getCategoryById(product.category);
  if (badgeEl && cat) {
    badgeEl.innerHTML = `<i class="fas ${cat.icon}"></i> ${cat.name}`;
    badgeEl.style.display = 'inline-flex';
  }

  if (specsEl && product.specs?.length) {
    specsEl.innerHTML = product.specs.map(s => {
      const idx = s.indexOf(':');
      if (idx > 0) {
        const label = s.substring(0, idx);
        const value = s.substring(idx + 1).trim();
        return `<li><i class="fas fa-check"></i> <strong>${label}:</strong> ${value}</li>`;
      }
      return `<li><i class="fas fa-check"></i> ${s}</li>`;
    }).join('');
  }

  const zaloBtn = document.getElementById('detail-zalo-btn');
  const stickyZalo = document.getElementById('sticky-zalo-btn');
  initQuantityControls(product, zaloBtn, stickyZalo);

  const imageContainer = document.querySelector('.product-detail-image');
  if (product.images?.length > 1 && imageContainer) {
    const thumbs = document.createElement('div');
    thumbs.className = 'product-gallery-thumbnails';
    product.images.forEach((src, i) => {
      const t = document.createElement('button');
      t.type = 'button';
      t.className = `thumbnail ${i === 0 ? 'active' : ''}`;
      t.innerHTML = `<img src="${src}" alt="${product.name} ${i + 1}" loading="lazy">`;
      t.addEventListener('click', () => {
        if (imgEl) imgEl.src = src;
        thumbs.querySelectorAll('.thumbnail').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
      });
      thumbs.appendChild(t);
    });
    imageContainer.appendChild(thumbs);
  }
}

/* =========================================
   Quantity Controls + Live Pricing
   ========================================= */
function initQuantityControls(product, zaloBtn, stickyZalo) {
  const qtyInput = document.getElementById('detail-qty');
  const qtyMinus = document.getElementById('detail-qty-minus');
  const qtyPlus = document.getElementById('detail-qty-plus');
  const totalEl = document.getElementById('detail-total');
  const unitPriceEl = document.getElementById('detail-unit-price');
  const savedEl = document.getElementById('detail-saved');
  const nextHintEl = document.getElementById('detail-next-hint');

  if (!qtyInput) {
    if (zaloBtn) zaloBtn.href = buildZaloOrderUrl(product, 1);
    if (stickyZalo) stickyZalo.href = buildZaloOrderUrl(product, 1);
    return;
  }

  let qty = 1;

  const update = () => {
    const { unitPrice, total, saved, next } = calcPricing(product, qty);

    if (totalEl) totalEl.textContent = formatVnd(total);

    if (unitPriceEl) {
      if (saved > 0) {
        unitPriceEl.innerHTML = `<s>${formatVnd(product.price)}</s> <strong>${formatVnd(unitPrice)}</strong>/cái`;
      } else {
        unitPriceEl.innerHTML = `<strong>${formatVnd(unitPrice)}</strong>/cái`;
      }
    }

    if (savedEl) {
      if (saved > 0) {
        savedEl.innerHTML = `<i class="fas fa-tag"></i> Tiết kiệm ${formatVnd(saved)}`;
        savedEl.style.display = '';
      } else {
        savedEl.style.display = 'none';
      }
    }

    if (nextHintEl) {
      if (next) {
        const need = next.minQty - qty;
        nextHintEl.innerHTML = `Mua thêm <strong>${need}</strong> cái nữa để giảm <strong>${formatVnd(next.perUnit)}/cái</strong>`;
        nextHintEl.style.display = '';
      } else {
        nextHintEl.innerHTML = '<i class="fas fa-star"></i> Đã đạt mức giá tốt nhất';
        nextHintEl.style.display = '';
        nextHintEl.classList.add('hint-best');
      }
    }

    if (zaloBtn) zaloBtn.href = buildZaloOrderUrl(product, qty);
    if (stickyZalo) stickyZalo.href = buildZaloOrderUrl(product, qty);

    qtyInput.value = qty;
    if (qtyMinus) qtyMinus.disabled = qty <= 1;
  };

  const setQty = (n) => {
    qty = Math.max(1, Math.min(99, Number.isFinite(n) ? n : 1));
    update();
  };

  qtyMinus?.addEventListener('click', () => setQty(qty - 1));
  qtyPlus?.addEventListener('click', () => setQty(qty + 1));
  qtyInput.addEventListener('input', () => {
    const v = parseInt(qtyInput.value, 10);
    if (Number.isFinite(v)) setQty(v);
  });
  qtyInput.addEventListener('blur', () => setQty(parseInt(qtyInput.value, 10) || 1));

  update();
}

/* =========================================
   Mobile Navigation
   ========================================= */
function initMobileNav() {
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (!menuToggle || !navLinks) return;

  const icon = menuToggle.querySelector('i');
  const setOpen = (open) => {
    navLinks.classList.toggle('active', open);
    document.body.classList.toggle('nav-open', open);
    icon.classList.toggle('fa-bars', !open);
    icon.classList.toggle('fa-times', open);
    menuToggle.setAttribute('aria-expanded', open);
  };

  menuToggle.addEventListener('click', () => {
    setOpen(!navLinks.classList.contains('active'));
  });

  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => setOpen(false));
  });
}

/* =========================================
   Smooth Scroll
   ========================================= */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#' || !href.startsWith('#')) return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.pageYOffset - 70;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}

/* =========================================
   Scroll Reveal
   ========================================= */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

function observeReveal(elements) {
  elements.forEach(el => {
    el.classList.add('reveal');
    revealObserver.observe(el);
  });
}

function initScrollReveal() {
  observeReveal(document.querySelectorAll('.feature-item, .section-header, .gallery-item, .contact-cta-card'));
}

/* =========================================
   Navbar Shrink + Scroll Progress
   ========================================= */
function initScrollEffects() {
  const navbar = document.querySelector('.navbar');
  const progress = document.getElementById('scrollProgress');

  const onScroll = () => {
    const y = window.scrollY;
    if (navbar) navbar.classList.toggle('scrolled', y > 20);
    if (progress) {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const pct = h > 0 ? (y / h) * 100 : 0;
      progress.style.width = pct + '%';
    }
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* =========================================
   Image Viewer (Lightbox + Zoom + Pan + Navigation)
   ========================================= */
const ImageViewer = (() => {
  let lightbox, imgEl, closeBtn, zoomInBtn, zoomOutBtn, resetBtn, hint;
  let prevBtn, nextBtn, counterEl;
  let stageEl, trackEl, prevSlideImg, nextSlideImg;
  let items = [];
  let index = 0;
  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  let isPanning = false;
  let startX = 0, startY = 0;
  let startTX = 0, startTY = 0;
  let pinchStartDist = 0;
  let pinchStartScale = 1;
  let swipeStartX = 0, swipeStartY = 0;
  let swipeActive = false;
  let isSliding = false;

  const MIN = 1, MAX = 4;
  const SWIPE_THRESHOLD = 60;
  const SLIDE_DURATION = 320;

  function ensureMounted() {
    if (lightbox) return;
    lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.innerHTML = `
      <button class="lightbox-close" aria-label="Đóng"><i class="fas fa-times"></i></button>
      <div class="lightbox-toolbar">
        <button class="lightbox-tool" data-act="zoom-out" aria-label="Thu nhỏ"><i class="fas fa-magnifying-glass-minus"></i></button>
        <button class="lightbox-tool" data-act="reset" aria-label="Đặt lại"><i class="fas fa-arrows-rotate"></i></button>
        <button class="lightbox-tool" data-act="zoom-in" aria-label="Phóng to"><i class="fas fa-magnifying-glass-plus"></i></button>
      </div>
      <button class="lightbox-nav lightbox-prev" aria-label="Ảnh trước"><i class="fas fa-chevron-left"></i></button>
      <button class="lightbox-nav lightbox-next" aria-label="Ảnh sau"><i class="fas fa-chevron-right"></i></button>
      <div class="lightbox-counter"><span class="counter-current">1</span> / <span class="counter-total">1</span></div>
      <div class="lightbox-stage">
        <div class="lightbox-track">
          <div class="lightbox-slide"><img class="lightbox-slide-img lightbox-slide-prev" alt="" draggable="false"></div>
          <div class="lightbox-slide"><img class="lightbox-img" alt="" draggable="false"></div>
          <div class="lightbox-slide"><img class="lightbox-slide-img lightbox-slide-next" alt="" draggable="false"></div>
        </div>
      </div>
      <div class="lightbox-hint">Vuốt / phím ←→ để chuyển ảnh · Click để zoom · Esc để đóng</div>
    `;
    document.body.appendChild(lightbox);

    imgEl = lightbox.querySelector('.lightbox-img');
    closeBtn = lightbox.querySelector('.lightbox-close');
    zoomInBtn = lightbox.querySelector('[data-act="zoom-in"]');
    zoomOutBtn = lightbox.querySelector('[data-act="zoom-out"]');
    resetBtn = lightbox.querySelector('[data-act="reset"]');
    hint = lightbox.querySelector('.lightbox-hint');
    prevBtn = lightbox.querySelector('.lightbox-prev');
    nextBtn = lightbox.querySelector('.lightbox-next');
    counterEl = lightbox.querySelector('.lightbox-counter');
    stageEl = lightbox.querySelector('.lightbox-stage');
    trackEl = lightbox.querySelector('.lightbox-track');
    prevSlideImg = lightbox.querySelector('.lightbox-slide-prev');
    nextSlideImg = lightbox.querySelector('.lightbox-slide-next');

    closeBtn.addEventListener('click', close);
    zoomInBtn.addEventListener('click', () => setScale(scale * 1.4));
    zoomOutBtn.addEventListener('click', () => setScale(scale / 1.4));
    resetBtn.addEventListener('click', reset);
    prevBtn.addEventListener('click', (e) => { e.stopPropagation(); prev(); });
    nextBtn.addEventListener('click', (e) => { e.stopPropagation(); next(); });

    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target.classList.contains('lightbox-stage')) close();
    });

    imgEl.addEventListener('click', (e) => {
      e.stopPropagation();
      if (swipeActive) return;
      if (scale > 1.05) reset();
      else zoomAt(e.clientX, e.clientY, 2.5);
    });

    imgEl.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      zoomAt(e.clientX, e.clientY, scale * factor);
    }, { passive: false });

    const onPointerDown = (e) => {
      if (isSliding) return;
      if (scale > 1.05) {
        isPanning = true;
        startX = e.clientX; startY = e.clientY;
        startTX = translateX; startTY = translateY;
        try { stageEl.setPointerCapture(e.pointerId); } catch {}
        imgEl.style.cursor = 'grabbing';
      } else {
        swipeStartX = e.clientX;
        swipeStartY = e.clientY;
        swipeActive = false;
        try { stageEl.setPointerCapture(e.pointerId); } catch {}
      }
    };

    const onPointerMove = (e) => {
      if (isPanning) {
        translateX = startTX + (e.clientX - startX);
        translateY = startTY + (e.clientY - startY);
        apply();
      } else if (swipeStartX !== 0 && scale <= 1.05 && items.length > 1) {
        const dx = e.clientX - swipeStartX;
        const dy = e.clientY - swipeStartY;
        if (!swipeActive && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
          swipeActive = true;
          trackEl.classList.add('no-transition');
        }
        if (swipeActive) {
          const w = stageEl.clientWidth || 1;
          const offsetPct = (dx / w) * 33.333;
          trackEl.style.transform = `translateX(calc(-33.333% + ${offsetPct}%))`;
        }
      }
    };

    const onPointerUp = (e) => {
      try { stageEl.releasePointerCapture(e.pointerId); } catch {}
      if (isPanning) {
        isPanning = false;
        imgEl.style.cursor = scale > 1.05 ? 'grab' : 'zoom-in';
      } else if (swipeActive) {
        const dx = e.clientX - swipeStartX;
        trackEl.classList.remove('no-transition');
        if (Math.abs(dx) > SWIPE_THRESHOLD) {
          commitSwipe(dx < 0 ? 1 : -1);
        } else {
          trackEl.style.transform = 'translateX(-33.333%)';
        }
        setTimeout(() => { swipeActive = false; }, 60);
      }
      swipeStartX = 0;
      swipeStartY = 0;
    };

    stageEl.addEventListener('pointerdown', onPointerDown);
    stageEl.addEventListener('pointermove', onPointerMove);
    stageEl.addEventListener('pointerup', onPointerUp);
    stageEl.addEventListener('pointercancel', onPointerUp);

    imgEl.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        pinchStartDist = touchDist(e.touches);
        pinchStartScale = scale;
      }
    }, { passive: true });
    imgEl.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const d = touchDist(e.touches);
        if (pinchStartDist > 0) setScale(pinchStartScale * (d / pinchStartDist));
      }
    }, { passive: false });

    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('active')) return;
      if (e.key === 'Escape') close();
      else if (e.key === '+' || e.key === '=') setScale(scale * 1.4);
      else if (e.key === '-') setScale(scale / 1.4);
      else if (e.key === '0') reset();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    });
  }

  function touchDist(t) {
    const dx = t[0].clientX - t[1].clientX;
    const dy = t[0].clientY - t[1].clientY;
    return Math.hypot(dx, dy);
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function apply() {
    imgEl.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    imgEl.style.cursor = scale > 1.05 ? 'grab' : 'zoom-in';
  }

  function setScale(next) {
    scale = clamp(next, MIN, MAX);
    if (scale <= 1.05) { translateX = 0; translateY = 0; }
    apply();
  }

  function zoomAt(clientX, clientY, nextScale) {
    const rect = imgEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const offsetX = clientX - cx;
    const offsetY = clientY - cy;
    const target = clamp(nextScale, MIN, MAX);
    const ratio = target / scale;
    translateX = offsetX - (offsetX - translateX) * ratio;
    translateY = offsetY - (offsetY - translateY) * ratio;
    scale = target;
    if (scale <= 1.05) { translateX = 0; translateY = 0; }
    apply();
  }

  function reset() {
    scale = 1; translateX = 0; translateY = 0;
    apply();
  }

  function showCurrent() {
    if (!items.length) return;
    const item = items[index];
    imgEl.src = item.src;
    imgEl.alt = item.alt || '';
    if (items.length > 1) {
      const prevIdx = (index - 1 + items.length) % items.length;
      const nextIdx = (index + 1) % items.length;
      prevSlideImg.src = items[prevIdx].src;
      prevSlideImg.alt = items[prevIdx].alt || '';
      nextSlideImg.src = items[nextIdx].src;
      nextSlideImg.alt = items[nextIdx].alt || '';
    } else {
      prevSlideImg.removeAttribute('src');
      nextSlideImg.removeAttribute('src');
    }
    reset();
    updateNav();
    resetTrack();
  }

  function resetTrack() {
    if (!trackEl) return;
    trackEl.classList.add('no-transition');
    trackEl.style.transform = 'translateX(-33.333%)';
    void trackEl.offsetHeight;
    trackEl.classList.remove('no-transition');
  }

  function commitSwipe(dir) {
    if (items.length <= 1 || isSliding) return;
    isSliding = true;
    trackEl.style.transform = dir === 1 ? 'translateX(-66.666%)' : 'translateX(0%)';
    setTimeout(() => {
      if (dir === 1) index = (index + 1) % items.length;
      else index = (index - 1 + items.length) % items.length;
      showCurrent();
      isSliding = false;
    }, SLIDE_DURATION);
  }

  function updateNav() {
    if (!counterEl || !prevBtn || !nextBtn) return;
    const multi = items.length > 1;
    counterEl.style.display = multi ? '' : 'none';
    prevBtn.style.display = multi ? '' : 'none';
    nextBtn.style.display = multi ? '' : 'none';
    if (multi) {
      counterEl.querySelector('.counter-current').textContent = index + 1;
      counterEl.querySelector('.counter-total').textContent = items.length;
    }
  }

  function next() {
    if (items.length <= 1 || isSliding) return;
    commitSwipe(1);
  }

  function prev() {
    if (items.length <= 1 || isSliding) return;
    commitSwipe(-1);
  }

  function open(input, startIndex = 0, alt) {
    ensureMounted();
    if (Array.isArray(input)) {
      items = input.map(it => typeof it === 'string' ? { src: it, alt: '' } : it);
    } else {
      items = [{ src: input, alt: alt || '' }];
    }
    index = Math.max(0, Math.min(startIndex, items.length - 1));
    showCurrent();
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    if (!lightbox) return;
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
    setTimeout(reset, 200);
  }

  return { open, close, next, prev };
})();

function initLightbox() {
  // Gallery section: click any image to open the full set with that index as start
  const galleryImgs = Array.from(document.querySelectorAll('.gallery-item img'));
  if (galleryImgs.length) {
    const items = galleryImgs.map(img => ({ src: img.src, alt: img.alt }));
    galleryImgs.forEach((img, i) => {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', () => ImageViewer.open(items, i));
    });
  }

  // Product detail: open with full image array, start at currently shown image
  const detailFrame = document.getElementById('detail-image-frame');
  const detailImg = document.getElementById('detail-image');
  if (detailFrame && detailImg) {
    const trigger = () => {
      const id = new URLSearchParams(window.location.search).get('id');
      const product = id ? getProductById(id) : null;
      const list = product?.images?.length ? product.images : (detailImg.src ? [detailImg.src] : []);
      if (!list.length) return;
      const currentPath = new URL(detailImg.src, location.href).pathname;
      const startIndex = Math.max(0, list.findIndex(src => new URL(src, location.href).pathname === currentPath));
      ImageViewer.open(list.map(src => ({ src, alt: detailImg.alt })), startIndex);
    };
    detailFrame.addEventListener('click', trigger);
    detailFrame.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); trigger(); }
    });
  }
}

/* =========================================
   Init
   ========================================= */
document.addEventListener('DOMContentLoaded', async () => {
  initMobileNav();
  initSmoothScroll();
  initScrollEffects();

  await loadCatalog();
  renderCategoryTabs();
  renderProductGrid();
  renderProductDetail();

  initScrollReveal();
  initLightbox();
});
