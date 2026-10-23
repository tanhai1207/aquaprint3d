/**
 * AquaPrint 3D - Main JavaScript
 * Mobile-first, JSON-driven catalog · GSAP + Lenis motion
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

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* =========================================
   Motion environment
   ========================================= */
const HAS_GSAP = typeof window.gsap !== 'undefined';
const HAS_ST = HAS_GSAP && typeof window.ScrollTrigger !== 'undefined';
const HAS_FLIP = HAS_GSAP && typeof window.Flip !== 'undefined';
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const MOTION = HAS_ST && !REDUCED_MOTION;
const FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const EASE = 'expo.out';

if (HAS_GSAP) {
  gsap.registerPlugin(...[window.ScrollTrigger, window.Flip].filter(Boolean));
  document.documentElement.classList.add('has-gsap');
}
// Thanh địa chỉ mobile co/giãn → không refresh lại toàn bộ ScrollTrigger (gây giật/nhảy)
if (HAS_ST) ScrollTrigger.config({ ignoreMobileResize: true });

const IS_SMALL = window.matchMedia('(max-width: 768px)').matches;
if (!MOTION) document.documentElement.classList.remove('js-motion');

let lenis = null;

function initLenis() {
  if (!MOTION || typeof window.Lenis === 'undefined') return;
  lenis = new Lenis({ lerp: 0.12, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

function scrollToTarget(target, immediate = false) {
  const offset = -60;
  if (lenis) {
    lenis.scrollTo(target, { offset: target === 0 ? 0 : offset, immediate, duration: 1.3 });
    return;
  }
  const top = target === 0 ? 0 : target.getBoundingClientRect().top + window.pageYOffset + offset;
  window.scrollTo({ top, behavior: immediate ? 'auto' : 'smooth' });
}

/** Tắt CSS transition (transform/opacity) trong lúc GSAP chạy để hai bên không "giành" nhau */
function lockTransitions(targets) {
  const els = gsap.utils.toArray(targets);
  els.forEach(el => el.classList.add('gsap-driven'));
  return () => els.forEach(el => el.classList.remove('gsap-driven'));
}

/** Tách chữ thành từng từ để animate, giữ nguyên nội dung cho screen reader */
function splitWords(el) {
  if (!el) return [];
  if (el.dataset.split) return el.querySelectorAll('.word-inner');
  const text = el.textContent.trim().replace(/\s+/g, ' ');
  el.setAttribute('aria-label', text);
  el.innerHTML = text.split(' ')
    .map(w => `<span class="word" aria-hidden="true"><span class="word-inner">${escapeHtml(w)}</span></span>`)
    .join(' ');
  el.dataset.split = '1';
  return el.querySelectorAll('.word-inner');
}

/* =========================================
   Catalog data
   ========================================= */
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
   Render: Category Tabs (sliding indicator)
   ========================================= */
function moveTabIndicator(animate = true) {
  const tabsEl = document.getElementById('categoryTabs');
  const indicator = tabsEl?.querySelector('.tab-indicator');
  const active = tabsEl?.querySelector('.category-tab.active');
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

  tabsEl.innerHTML = `<span class="tab-indicator" aria-hidden="true"></span>` + tabs.map(t => `
    <button type="button" class="category-tab ${t.id === activeCategory ? 'active' : ''}" data-category="${t.id}">
      <i class="fas ${t.icon}"></i>
      <span>${t.name}</span>
      <span class="category-count">${t.count}</span>
    </button>
  `).join('');
  tabsEl.classList.add('has-indicator');

  tabsEl.querySelectorAll('.category-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.category;
      if (MOTION) {
        const unlock = lockTransitions(btn);
        gsap.fromTo(btn, { scale: 0.94 }, { scale: 1, duration: 0.5, ease: 'back.out(3)', clearProps: 'transform', onComplete: unlock });
      }
      if (cat === activeCategory) return;
      activeCategory = cat;
      tabsEl.querySelectorAll('.category-tab').forEach(b => b.classList.toggle('active', b.dataset.category === cat));
      moveTabIndicator(true);
      applyFilter(true);
    });
  });

  if (MOTION) {
    const tabBtns = [...tabsEl.querySelectorAll('.category-tab')];
    tabBtns.forEach(b => b.classList.add('gsap-driven'));
    gsap.from(tabBtns, {
      y: 16, autoAlpha: 0, duration: 0.7, stagger: 0.06, ease: EASE, clearProps: 'transform',
      scrollTrigger: { trigger: tabsEl, start: 'top 90%', once: true },
      onComplete: () => tabBtns.forEach(b => b.classList.remove('gsap-driven'))
    });
  }

  moveTabIndicator(false);
}

/* =========================================
   Render: Product Grid (Flip filter)
   ========================================= */
let cardRevealTriggers = [];

function renderProductGrid() {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  if (!CATALOG.products.length) {
    grid.innerHTML = `<p class="grid-empty">Chưa có sản phẩm nào.</p>`;
    return;
  }

  grid.innerHTML = CATALOG.products.map(p => {
    const cat = getCategoryById(p.category);
    const altImg = p.images?.find(src => src !== p.image);
    return `
      <article class="product-card" data-category="${p.category}" data-id="${p.id}">
        <div class="product-card-inner">
          <a href="product.html?id=${p.id}" class="product-image" aria-label="${p.name}">
            <img class="product-img-main" src="${p.image}" alt="${p.name}" loading="lazy" decoding="async">
            ${altImg ? `<img class="product-img-alt" src="${altImg}" alt="" aria-hidden="true" loading="lazy" decoding="async">` : ''}
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
          <span class="card-glare" aria-hidden="true"></span>
        </div>
      </article>
    `;
  }).join('');

  const cards = grid.querySelectorAll('.product-card');
  cards.forEach(initCardTilt);
  initCardViewTransition(grid);

  if (MOTION) {
    gsap.set(cards, { autoAlpha: 0, y: 40 });
    cardRevealTriggers = ScrollTrigger.batch(cards, {
      start: 'top 95%',
      once: true,
      onEnter: batch => {
        batch.forEach(el => { el.dataset.revealed = '1'; });
        gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out', overwrite: true });
      }
    });
  }
}

/** Card chưa kịp reveal mà người dùng đã lọc → hiện luôn để Flip tính đúng */
function settlePendingReveals(cards) {
  cardRevealTriggers.forEach(t => t.kill());
  cardRevealTriggers = [];
  const pending = cards.filter(c => c.dataset.revealed !== '1');
  if (pending.length) gsap.set(pending, { autoAlpha: 1, y: 0 });
  pending.forEach(c => { c.dataset.revealed = '1'; });
}

function applyFilter(animate = true) {
  const grid = document.getElementById('productGrid');
  if (!grid) return;
  const cards = [...grid.querySelectorAll('.product-card')];
  const matches = c => activeCategory === 'all' || c.dataset.category === activeCategory;

  if (!animate || !MOTION || !HAS_FLIP) {
    cards.forEach(c => { c.hidden = !matches(c); });
    return;
  }

  settlePendingReveals(cards);
  const state = Flip.getState(cards);
  cards.forEach(c => { c.hidden = !matches(c); });

  Flip.from(state, {
    duration: 0.75,
    ease: 'power3.inOut',
    absolute: true,
    stagger: 0.03,
    onEnter: els => gsap.fromTo(els,
      { autoAlpha: 0, scale: 0.85, y: 30 },
      { autoAlpha: 1, scale: 1, y: 0, duration: 0.7, stagger: 0.06, delay: 0.2, ease: EASE }),
    onLeave: els => gsap.to(els, { autoAlpha: 0, scale: 0.85, duration: 0.35, ease: 'power2.in' }),
    onComplete: () => ScrollTrigger.refresh()
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

/* =========================================
   Render: Product Detail
   ========================================= */
function renderProductDetail() {
  const wrapper = document.querySelector('.product-detail-wrapper');
  if (!wrapper) return;

  const id = new URLSearchParams(window.location.search).get('id');
  const product = id ? getProductById(id) : null;
  const info = document.querySelector('.product-detail-info');

  if (!product) {
    const image = document.querySelector('.product-detail-image');
    if (info) {
      info.innerHTML = `
        <h2>Không tìm thấy sản phẩm</h2>
        <p>Sản phẩm bạn tìm kiếm không tồn tại hoặc đã bị xóa.</p>
        <a href="index.html" class="btn btn-primary" style="margin-top: 20px;">Quay lại Trang Chủ</a>
      `;
    }
    if (image) image.style.display = 'none';
    animateDetailEntrance(info);
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
    if (imgEl.getAttribute('src') !== product.image) imgEl.src = product.image;
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
        if (t.classList.contains('active')) return;
        thumbs.querySelectorAll('.thumbnail').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        swapDetailImage(imgEl, src);
      });
      thumbs.appendChild(t);
    });
    imageContainer.appendChild(thumbs);
    if (MOTION) {
      const unlock = lockTransitions(thumbs.children);
      gsap.from(thumbs.children, { y: 16, autoAlpha: 0, duration: 0.6, stagger: 0.06, delay: 0.35, ease: EASE, onComplete: unlock });
    }
  }

  animateDetailEntrance(info);
}

/** Crossfade khi đổi ảnh thumbnail */
function swapDetailImage(imgEl, src) {
  if (!imgEl) return;
  if (!MOTION) { imgEl.src = src; return; }
  gsap.to(imgEl, {
    autoAlpha: 0, scale: 0.96, duration: 0.2, ease: 'power2.in', overwrite: true,
    onComplete: () => {
      imgEl.src = src;
      const show = () => gsap.to(imgEl, { autoAlpha: 1, scale: 1, duration: 0.5, ease: EASE });
      imgEl.decode ? imgEl.decode().then(show, show) : show();
    }
  });
}

function animateDetailEntrance(info) {
  if (!info) return;
  if (!MOTION) return;
  const parts = [...info.children].filter(el => el.offsetParent !== null);
  const unlock = lockTransitions(parts);
  gsap.timeline({ defaults: { ease: EASE }, onComplete: unlock })
    .set(info, { autoAlpha: 1 })
    .from(parts, { y: 30, autoAlpha: 0, duration: 0.9, stagger: 0.07 });

  const sticky = document.querySelector('.sticky-cta');
  if (sticky && getComputedStyle(sticky).display !== 'none') {
    gsap.from(sticky, { yPercent: 110, duration: 0.8, delay: 0.5, ease: EASE });
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

  const bestTier = DISCOUNT_TIERS[0].minQty;
  const counter = { val: 0 };
  let qty = 1;
  let lastQty = null;

  const showTotal = (total, animate) => {
    if (!totalEl) return;
    if (!animate) {
      counter.val = total;
      totalEl.textContent = formatVnd(total);
      return;
    }
    gsap.to(counter, {
      val: total, duration: 0.6, ease: 'power3.out', overwrite: true,
      onUpdate: () => { totalEl.textContent = formatVnd(Math.round(counter.val / 100) * 100); },
      onComplete: () => { totalEl.textContent = formatVnd(total); }
    });
    gsap.fromTo(totalEl, { scale: 1.1 }, { scale: 1, duration: 0.6, ease: 'back.out(3)' });
  };

  const update = () => {
    const { unitPrice, total, saved, next } = calcPricing(product, qty);
    const animate = MOTION && lastQty !== null;

    showTotal(total, animate);

    if (unitPriceEl) {
      if (saved > 0) {
        unitPriceEl.innerHTML = `<s>${formatVnd(product.price)}</s> <strong>${formatVnd(unitPrice)}</strong>/cái`;
      } else {
        unitPriceEl.innerHTML = `<strong>${formatVnd(unitPrice)}</strong>/cái`;
      }
    }

    if (savedEl) {
      const wasShown = savedEl.style.display !== 'none';
      if (saved > 0) {
        savedEl.innerHTML = `<i class="fas fa-tag"></i> Tiết kiệm ${formatVnd(saved)}`;
        savedEl.style.display = '';
        if (animate && !wasShown) {
          gsap.fromTo(savedEl, { scale: 0.5, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.6, ease: 'back.out(2.5)' });
        }
      } else {
        savedEl.style.display = 'none';
      }
    }

    if (nextHintEl) {
      if (next) {
        const need = next.minQty - qty;
        nextHintEl.innerHTML = `Mua thêm <strong>${need}</strong> cái nữa để giảm <strong>${formatVnd(next.perUnit)}/cái</strong>`;
      } else {
        nextHintEl.innerHTML = '<i class="fas fa-star"></i> Đã đạt mức giá tốt nhất';
      }
      nextHintEl.style.display = '';
      nextHintEl.classList.toggle('hint-best', !next);
    }

    // Vừa chạm mức giá tốt nhất → bung bọt khí ăn mừng
    if (animate && qty >= bestTier && lastQty < bestTier) {
      bubbleBurst(totalEl);
      gsap.fromTo(nextHintEl, { scale: 0.6, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.7, ease: 'back.out(2.5)' });
    }

    if (zaloBtn) zaloBtn.href = buildZaloOrderUrl(product, qty);
    if (stickyZalo) stickyZalo.href = buildZaloOrderUrl(product, qty);

    qtyInput.value = qty;
    if (qtyMinus) qtyMinus.disabled = qty <= 1;
    lastQty = qty;
  };

  const setQty = (n) => {
    qty = Math.max(1, Math.min(99, Number.isFinite(n) ? n : 1));
    update();
  };

  const bump = (btn, dir) => {
    if (!MOTION) return;
    btn.classList.add('gsap-driven');
    gsap.fromTo(btn, { scale: 0.8 }, { scale: 1, duration: 0.45, ease: 'back.out(4)', clearProps: 'transform' });
    gsap.fromTo(qtyInput, { yPercent: dir * 45, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.35, ease: 'power3.out' });
  };

  qtyMinus?.addEventListener('click', () => {
    if (qty <= 1) return;
    setQty(qty - 1);
    bump(qtyMinus, -1);
  });
  qtyPlus?.addEventListener('click', () => {
    if (qty >= 99) return;
    setQty(qty + 1);
    bump(qtyPlus, 1);
  });
  qtyInput.addEventListener('input', () => {
    const v = parseInt(qtyInput.value, 10);
    if (Number.isFinite(v)) setQty(v);
  });
  qtyInput.addEventListener('blur', () => setQty(parseInt(qtyInput.value, 10) || 1));

  update();
}

function bubbleBurst(anchor) {
  if (!MOTION || !anchor) return;
  const r = anchor.getBoundingClientRect();
  const layer = document.createElement('div');
  layer.className = 'burst-layer';
  layer.style.left = `${r.left + r.width / 2}px`;
  layer.style.top = `${r.top + r.height / 2}px`;
  document.body.appendChild(layer);

  for (let i = 0; i < 22; i++) {
    const b = document.createElement('span');
    const size = gsap.utils.random(6, 18);
    b.className = 'burst-bubble';
    b.style.width = b.style.height = `${size}px`;
    b.style.left = b.style.top = `${-size / 2}px`;
    layer.appendChild(b);
    gsap.fromTo(b,
      { x: 0, y: 0, scale: 0, opacity: 1 },
      {
        x: gsap.utils.random(-170, 170),
        y: gsap.utils.random(-190, -30),
        scale: 1,
        opacity: 0,
        duration: gsap.utils.random(0.9, 1.6),
        ease: 'power2.out'
      });
  }
  gsap.delayedCall(1.8, () => layer.remove());
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
    if (lenis) open ? lenis.stop() : lenis.start();

    if (MOTION) {
      gsap.fromTo(icon, { rotation: open ? -90 : 90, scale: 0.6 }, { rotation: 0, scale: 1, duration: 0.5, ease: 'back.out(2.5)' });
      if (open) {
        gsap.fromTo(navLinks.querySelectorAll('li'),
          { x: -30, autoAlpha: 0 },
          { x: 0, autoAlpha: 1, duration: 0.6, stagger: 0.06, delay: 0.12, ease: EASE, clearProps: 'transform,opacity,visibility' });
      }
    }
  };

  menuToggle.addEventListener('click', () => {
    setOpen(!navLinks.classList.contains('active'));
  });

  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      if (navLinks.classList.contains('active')) setOpen(false);
    });
  });
}

/* =========================================
   Smooth Scroll (Lenis)
   ========================================= */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') {
        e.preventDefault();
        scrollToTarget(0);
        return;
      }
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      scrollToTarget(target);
    });
  });
}

/** Đến từ trang khác với #hash: nhảy lại đúng chỗ sau khi catalog render xong */
function restoreHashPosition() {
  const hash = window.location.hash;
  if (!hash || hash === '#') return;
  let target = null;
  try { target = document.querySelector(hash); } catch { return; }
  if (target) requestAnimationFrame(() => scrollToTarget(target, true));
}

/* =========================================
   Navbar hide/show + Scroll Progress + Scrollspy
   ========================================= */
function initScrollEffects() {
  const navbar = document.querySelector('.navbar');
  const progress = document.getElementById('scrollProgress');
  const setProgress = progress
    ? (HAS_GSAP ? gsap.quickSetter(progress, 'scaleX') : v => { progress.style.transform = `scaleX(${v})`; })
    : () => {};
  let lastY = window.scrollY;

  const onScroll = () => {
    const y = window.scrollY;
    if (navbar) {
      navbar.classList.toggle('scrolled', y > 20);
      const delta = y - lastY;
      if (y < 320) {
        navbar.classList.remove('nav-hidden');
      } else if (Math.abs(delta) > 3) {
        const shouldHide = delta > 0 && !document.body.classList.contains('nav-open');
        navbar.classList.toggle('nav-hidden', shouldHide);
      }
    }
    if (Math.abs(y - lastY) > 3) lastY = y;

    const h = document.documentElement.scrollHeight - window.innerHeight;
    setProgress(h > 0 ? Math.min(1, y / h) : 0);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

function initScrollSpy() {
  if (!HAS_ST) return;
  document.querySelectorAll('.nav-links a[href^="#"]:not(.btn-nav)').forEach(link => {
    const section = document.querySelector(link.getAttribute('href'));
    if (!section) return;
    ScrollTrigger.create({
      trigger: section,
      start: 'top 45%',
      end: 'bottom 45%',
      onToggle: self => link.classList.toggle('is-active', self.isActive)
    });
  });
}

/* =========================================
   Hero
   ========================================= */
function initHero() {
  const hero = document.querySelector('.hero');
  if (!hero || !MOTION) return;

  const content = hero.querySelector('.hero-content');
  const visual = hero.querySelector('.hero-image');
  const words = splitWords(hero.querySelector('h1'));
  const glows = hero.querySelectorAll('.hero-glow');
  hero.querySelectorAll('.hero-buttons .btn').forEach(b => b.classList.add('gsap-driven'));

  gsap.timeline({ defaults: { ease: EASE } })
    .set([content, visual], { autoAlpha: 1 })
    .from(glows, { scale: 0.5, autoAlpha: 0, duration: 2.2, stagger: 0.2, ease: 'power2.out' }, 0)
    .from(hero.querySelector('.hero-eyebrow'), { y: 20, autoAlpha: 0, duration: 0.9 }, 0.1)
    .from(words, { yPercent: 115, duration: 1.2, stagger: 0.055 }, 0.2)
    .from(hero.querySelector('.hero-content p'), { y: 24, autoAlpha: 0, duration: 1 }, 0.6)
    .from(hero.querySelectorAll('.hero-buttons .btn'), { y: 20, autoAlpha: 0, duration: 0.9, stagger: 0.1 }, 0.75)
    .from(visual, { y: 80, scale: 0.9, rotationY: -14, autoAlpha: 0, duration: 1.5, transformPerspective: 1000 }, 0.25);

  // Ảnh nổi bồng bềnh (y) — độc lập với tilt (rotation) và parallax (yPercent)
  gsap.to(visual, { y: -16, duration: 3.2, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.75 });

  glows.forEach(g => {
    gsap.to(g, {
      x: gsap.utils.random(-90, 90),
      y: gsap.utils.random(-60, 60),
      duration: gsap.utils.random(7, 11),
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1
    });
  });

  // Parallax khi cuộn qua hero
  gsap.to(hero.querySelector('.hero-container'), {
    yPercent: 14, opacity: 0.3, ease: 'none',
    scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
  });
  gsap.to(hero.querySelector('.hero-bg'), {
    yPercent: 22, ease: 'none',
    scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
  });

  // Tilt 3D theo chuột
  if (FINE_POINTER && visual) {
    gsap.set(visual, { transformPerspective: 1000 });
    const rx = gsap.quickTo(visual, 'rotationX', { duration: 0.9, ease: 'power3' });
    const ry = gsap.quickTo(visual, 'rotationY', { duration: 0.9, ease: 'power3' });
    const gx = gsap.quickTo(glows[0], 'xPercent', { duration: 1.4, ease: 'power3' });
    const gy = gsap.quickTo(glows[0], 'yPercent', { duration: 1.4, ease: 'power3' });
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      ry(px * 16);
      rx(-py * 10);
      gx(px * 20);
      gy(py * 20);
    });
    hero.addEventListener('pointerleave', () => { rx(0); ry(0); gx(0); gy(0); });
  }

  initBubbles(hero.querySelector('.hero-bubbles'), IS_SMALL ? 8 : 18, hero);
}

/** Bọt khí nổi lên, lắc lư; tạm dừng khi section ra khỏi màn hình */
function initBubbles(container, count, trigger) {
  if (!container || !MOTION) return;
  const tweens = [];

  for (let i = 0; i < count; i++) {
    const b = document.createElement('span');
    const size = gsap.utils.random(4, 18);
    b.className = 'bubble';
    b.style.width = b.style.height = `${size}px`;
    b.style.left = `${gsap.utils.random(0, 100)}%`;
    container.appendChild(b);

    const o = gsap.utils.random(0.35, 0.9);
    const duration = gsap.utils.random(7, 15) * (size > 12 ? 0.8 : 1);
    const rise = gsap.to(b, {
      keyframes: { y: [0, -(container.offsetHeight + 60)], opacity: [0, o, o, 0], easeEach: 'none' },
      duration, ease: 'none', repeat: -1
    });
    rise.totalTime(Math.random() * duration);
    const wobble = gsap.to(b, {
      x: gsap.utils.random(-24, 24),
      duration: gsap.utils.random(1.4, 2.8),
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1
    });
    tweens.push(rise, wobble);
  }

  ScrollTrigger.create({
    trigger: trigger || container,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: self => tweens.forEach(t => (self.isActive ? t.resume() : t.pause()))
  });
}

/* =========================================
   Section headers + reveals
   ========================================= */
const SQUIGGLE_SVG = '<svg class="section-squiggle" viewBox="0 0 120 14" aria-hidden="true"><path d="M2 7 Q 12 0 22 7 T 42 7 T 62 7 T 82 7 T 102 7 T 118 7"/></svg>';

function initSectionHeaders() {
  document.querySelectorAll('.section-header').forEach(header => {
    const h2 = header.querySelector('h2');
    if (h2 && !header.querySelector('.section-squiggle')) h2.insertAdjacentHTML('afterend', SQUIGGLE_SVG);
    if (!MOTION || !h2) return;

    const words = splitWords(h2);
    const path = header.querySelector('.section-squiggle path');
    const p = header.querySelector('p');
    const len = path.getTotalLength();
    gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });

    const tl = gsap.timeline({ scrollTrigger: { trigger: header, start: 'top 90%', once: true } })
      .from(words, { yPercent: 115, duration: 0.9, stagger: 0.045, ease: EASE })
      .to(path, { strokeDashoffset: 0, duration: 0.9, ease: 'power2.inOut' }, 0.25);
    if (p) tl.from(p, { y: 18, autoAlpha: 0, duration: 0.7, ease: 'power3.out' }, 0.3);
  });
}

function batchReveal(targets, { y = 50, onEnter } = {}) {
  const els = gsap.utils.toArray(targets);
  if (!els.length) return;
  gsap.set(els, { autoAlpha: 0, y });
  ScrollTrigger.batch(els, {
    start: 'top 95%',
    once: true,
    onEnter: batch => {
      batch.forEach(el => el.classList.add('gsap-driven'));
      gsap.to(batch, {
        autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out', overwrite: true,
        clearProps: 'transform',
        onComplete: () => batch.forEach(el => el.classList.remove('gsap-driven'))
      });
      onEnter?.(batch);
    }
  });
}

function initReveals() {
  if (!MOTION) return;

  batchReveal('.feature-item', {
    y: 40,
    onEnter: batch => {
      const icons = batch.map(el => el.querySelector('i')).filter(Boolean);
      icons.forEach(i => i.classList.add('gsap-driven'));
      gsap.from(icons, {
        scale: 0, rotation: -60, duration: 0.7, stagger: 0.08, delay: 0.15, ease: 'back.out(2.2)',
        clearProps: 'transform',
        onComplete: () => icons.forEach(i => i.classList.remove('gsap-driven'))
      });
    }
  });
  batchReveal('.contact-cta-card', { y: 40 });

  // Gallery: chỉ dùng transform/opacity (clip-path buộc vẽ lại ảnh lớn mỗi frame)
  gsap.utils.toArray('.gallery-item').forEach((item, i) => {
    const img = item.querySelector('img');
    gsap.timeline({ scrollTrigger: { trigger: item, start: 'top 95%', once: true }, delay: (i % 2) * 0.1 })
      .fromTo(item,
        { autoAlpha: 0, y: 40, scale: 0.96 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.9, ease: 'power3.out', clearProps: 'transform' })
      .fromTo(img, { scale: 1.2 }, { scale: 1, duration: 1.2, ease: EASE, clearProps: 'transform' }, 0);
  });

  const footer = document.querySelector('.footer-content');
  if (footer) {
    gsap.from(footer.children, {
      y: 20, autoAlpha: 0, duration: 0.9, stagger: 0.1, ease: EASE,
      scrollTrigger: { trigger: footer, start: 'top 95%', once: true }
    });
  }

  initBubbles(document.querySelector('.contact-bubbles'), IS_SMALL ? 5 : 10, document.querySelector('.contact'));
}

/* =========================================
   Micro-interactions: magnetic, ripple, floating
   ========================================= */
function initMagnetic() {
  if (!MOTION || !FINE_POINTER) return;
  document.querySelectorAll('.hero-buttons .btn, .btn-nav, .float-btn, .social-links a').forEach(el => {
    el.classList.add('gsap-driven');
    // quickTo tạo lazy: nếu tạo sớm sẽ ghi đè tween intro (x/y) của chính nút đó
    let xTo, yTo;
    const strength = el.classList.contains('float-btn') ? 0.4 : 0.3;
    el.addEventListener('pointerenter', () => {
      if (!xTo) {
        xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
        yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
      }
      gsap.to(el, { scale: 1.06, duration: 0.4, ease: 'power3.out' });
    });
    el.addEventListener('pointermove', (e) => {
      if (!xTo) return;
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    });
    el.addEventListener('pointerleave', () => {
      if (!xTo) return;
      xTo(0);
      yTo(0);
      gsap.to(el, { scale: 1, duration: 0.5, ease: 'power3.out' });
    });
  });
}

function initRipple() {
  if (REDUCED_MOTION) return;
  document.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('.btn, .btn-nav, .sticky-cta-btn, .category-tab');
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2.2;
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - r.left - size / 2}px`;
    ripple.style.top = `${e.clientY - r.top - size / 2}px`;
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });
}

function initFloatingContact() {
  if (!MOTION) return;
  const btns = document.querySelectorAll('.float-btn');
  if (!btns.length) return;
  btns.forEach(b => b.classList.add('gsap-driven'));
  gsap.from(btns, { scale: 0, autoAlpha: 0, duration: 0.8, stagger: 0.12, delay: 1.4, ease: 'back.out(2.2)' });
}

/* =========================================
   Image Viewer (Lightbox + Zoom + Pan + Navigation)
   ========================================= */
const ImageViewer = (() => {
  let lightbox, imgEl, closeBtn, zoomInBtn, zoomOutBtn, resetBtn, hint;
  let prevBtn, nextBtn, counterEl, chrome;
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
  let isClosing = false;
  let sourceEl = null;
  let sourceIndex = -1;

  const MIN = 1, MAX = 4;
  const SWIPE_THRESHOLD = 60;
  const SLIDE_DURATION = 450;

  function ensureMounted() {
    if (lightbox) return;
    lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.setAttribute('data-lenis-prevent', '');
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
    chrome = [closeBtn, lightbox.querySelector('.lightbox-toolbar'), prevBtn, nextBtn, counterEl, hint];

    closeBtn.addEventListener('click', close);
    zoomInBtn.addEventListener('click', () => setScale(scale * 1.4, true));
    zoomOutBtn.addEventListener('click', () => setScale(scale / 1.4, true));
    resetBtn.addEventListener('click', () => reset(true));
    prevBtn.addEventListener('click', (e) => { e.stopPropagation(); prev(); });
    nextBtn.addEventListener('click', (e) => { e.stopPropagation(); next(); });

    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target.classList.contains('lightbox-stage')) close();
    });

    imgEl.addEventListener('click', (e) => {
      e.stopPropagation();
      if (swipeActive) return;
      if (scale > 1.05) reset(true);
      else zoomAt(e.clientX, e.clientY, 2.5, true);
    });

    imgEl.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      zoomAt(e.clientX, e.clientY, scale * factor, true);
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
      else if (e.key === '+' || e.key === '=') setScale(scale * 1.4, true);
      else if (e.key === '-') setScale(scale / 1.4, true);
      else if (e.key === '0') reset(true);
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

  function apply(animate = false) {
    if (HAS_GSAP) {
      const vars = { x: translateX, y: translateY, scale, overwrite: 'auto' };
      if (animate && !REDUCED_MOTION) gsap.to(imgEl, { ...vars, duration: 0.4, ease: 'power3.out' });
      else gsap.set(imgEl, vars);
    } else {
      imgEl.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    }
    imgEl.style.cursor = scale > 1.05 ? 'grab' : 'zoom-in';
  }

  function setScale(next, animate = false) {
    scale = clamp(next, MIN, MAX);
    if (scale <= 1.05) { translateX = 0; translateY = 0; }
    apply(animate);
  }

  function zoomAt(clientX, clientY, nextScale, animate = false) {
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
    apply(animate);
  }

  function reset(animate = false) {
    scale = 1; translateX = 0; translateY = 0;
    apply(animate);
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

  /** Vector dịch chuyển + scale để ảnh lightbox trùng khớp với ảnh nguồn */
  function deltaTo(el) {
    const from = el.getBoundingClientRect();
    const to = imgEl.getBoundingClientRect();
    if (!from.width || !to.width) return null;
    return {
      x: (from.left + from.width / 2) - (to.left + to.width / 2),
      y: (from.top + from.height / 2) - (to.top + to.height / 2),
      scale: Math.max(from.width / to.width, from.height / to.height)
    };
  }

  function open(input, startIndex = 0, source = null) {
    ensureMounted();
    if (Array.isArray(input)) {
      items = input.map(it => typeof it === 'string' ? { src: it, alt: '' } : it);
    } else {
      items = [{ src: input, alt: '' }];
    }
    index = Math.max(0, Math.min(startIndex, items.length - 1));
    isClosing = false;
    showCurrent();
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
    lenis?.stop();

    if (!MOTION) return;

    sourceEl = source;
    sourceIndex = index;
    gsap.fromTo(lightbox, { backgroundColor: 'rgba(0,0,0,0)' }, { backgroundColor: 'rgba(0,0,0,0.94)', duration: 0.45, ease: 'power2.out' });
    const unlock = lockTransitions(chrome);
    gsap.fromTo(chrome, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, delay: 0.25, stagger: 0.03, onComplete: unlock });

    // Ảnh phóng ra từ đúng vị trí ảnh được click (FLIP)
    gsap.set(imgEl, { autoAlpha: 0 });
    const flip = () => {
      if (isClosing) return;
      const d = source ? deltaTo(source) : null;
      if (d) {
        gsap.set(source, { autoAlpha: 0 });
        gsap.fromTo(imgEl, { ...d, autoAlpha: 1 }, { x: 0, y: 0, scale: 1, duration: 0.75, ease: EASE });
      } else {
        gsap.fromTo(imgEl, { scale: 0.9, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.6, ease: EASE });
      }
    };
    imgEl.decode ? imgEl.decode().then(flip, flip) : flip();
  }

  function close() {
    if (!lightbox || !lightbox.classList.contains('active') || isClosing) return;
    isClosing = true;

    const finish = () => {
      lightbox.classList.remove('active');
      document.body.style.overflow = '';
      lenis?.start();
      if (HAS_GSAP) {
        gsap.set([lightbox, ...chrome], { clearProps: 'backgroundColor,opacity,visibility' });
        if (sourceEl) gsap.set(sourceEl, { clearProps: 'opacity,visibility' });
        gsap.set(imgEl, { autoAlpha: 1 });
      }
      sourceEl = null;
      reset();
      isClosing = false;
    };

    if (!MOTION) { finish(); return; }

    const unlock = lockTransitions(chrome);
    gsap.to(chrome, { autoAlpha: 0, duration: 0.2, onComplete: unlock });
    gsap.to(lightbox, { backgroundColor: 'rgba(0,0,0,0)', duration: 0.5, ease: 'power2.inOut' });

    const canReturn = sourceEl && index === sourceIndex && scale <= 1.05;
    const r = canReturn ? sourceEl.getBoundingClientRect() : null;
    const visible = r && r.width && r.bottom > 0 && r.top < window.innerHeight;
    const d = visible ? deltaTo(sourceEl) : null;

    if (d) {
      gsap.to(imgEl, {
        ...d, duration: 0.6, ease: 'expo.inOut', overwrite: true,
        onComplete: finish
      });
    } else {
      if (sourceEl) gsap.set(sourceEl, { clearProps: 'opacity,visibility' });
      gsap.to(imgEl, { autoAlpha: 0, scale: scale * 0.9, duration: 0.35, ease: 'power2.in', overwrite: true, onComplete: finish });
    }
  }

  return { open, close, next, prev };
})();

function initLightbox() {
  // Gallery section: click any image to open the full set with that index as start
  const galleryImgs = Array.from(document.querySelectorAll('.gallery-item img'));
  if (galleryImgs.length) {
    const items = galleryImgs.map(img => ({ src: img.src, alt: img.alt }));
    galleryImgs.forEach((img, i) => {
      img.closest('.gallery-item').addEventListener('click', () => ImageViewer.open(items, i, img));
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
      const found = list.findIndex(src => new URL(src, location.href).pathname === currentPath);
      // Ảnh chính không nằm trong danh sách images → thêm vào đầu để mở đúng ảnh đang xem
      const all = found === -1 ? [detailImg.getAttribute('src'), ...list] : list;
      ImageViewer.open(all.map(src => ({ src, alt: detailImg.alt })), Math.max(0, found), detailImg);
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
  initLenis();
  initMobileNav();
  initSmoothScroll();
  initScrollEffects();
  initRipple();

  initHero();
  initSectionHeaders();
  initReveals();
  initMagnetic();
  initFloatingContact();

  await loadCatalog();
  renderCategoryTabs();
  renderProductGrid();
  renderProductDetail();

  initLightbox();
  initScrollSpy();

  if (HAS_ST) ScrollTrigger.refresh();
  restoreHashPosition();

  document.fonts?.ready.then(() => {
    moveTabIndicator(false);
    if (HAS_ST) ScrollTrigger.refresh();
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => moveTabIndicator(false), 150);
  });
});
