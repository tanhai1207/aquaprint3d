import { escapeHtml, getProductImages } from './catalog.js';
import { buildZaloOrderUrl, calculatePricing, discountTiers, formatVnd, maxQuantity } from './pricing.js';
import { gsap, EASE, MOTION, lockTransitions } from './motion.js';
import { openImageViewer } from './image-viewer.js';

export function renderProductDetails(catalog) {
  const wrapper = document.querySelector('.product-detail-wrapper');
  const id = new URLSearchParams(window.location.search).get('id');
  const product = catalog.products.find(item => item.id === id);
  if (!product) {
    showProductProblem('Không tìm thấy sản phẩm', 'Sản phẩm bạn tìm kiếm không tồn tại hoặc đã bị xóa.');
    return;
  }

  wrapper.hidden = false;
  document.getElementById('detail-status').hidden = true;
  document.querySelector('.sticky-cta').hidden = false;
  document.body.classList.add('has-sticky-cta');
  document.title = `${product.name} - AquaPrint 3D`;

  document.getElementById('detail-name').textContent = product.name;
  document.getElementById('detail-price').textContent = formatVnd(product.price);
  document.getElementById('detail-description').textContent = product.description;

  const category = catalog.categories.find(item => item.id === product.category);
  if (category) {
    const badge = document.getElementById('detail-category-badge');
    badge.innerHTML = `<i class="fas ${escapeHtml(category.icon)}" aria-hidden="true"></i> ${escapeHtml(category.name)}`;
    badge.hidden = false;
  }

  if (product.specs?.length) {
    document.getElementById('detail-specs').innerHTML = product.specs.map(spec => {
      const separator = spec.indexOf(':');
      const text = separator > 0
        ? `<strong>${escapeHtml(spec.slice(0, separator))}:</strong> ${escapeHtml(spec.slice(separator + 1).trim())}`
        : escapeHtml(spec);
      return `<li><i class="fas fa-check" aria-hidden="true"></i> ${text}</li>`;
    }).join('');
  }

  document.getElementById('detail-discount-tiers').innerHTML = discountTiers
    .filter(tier => tier.perUnit > 0)
    .reverse()
    .map(tier => `Mua từ <strong>${tier.minQuantity} cái</strong>: giảm <strong>${formatVnd(tier.perUnit)}/cái</strong>`)
    .join(' · ');

  initProductImages(product);
  initQuantityControls(product);
  animateDetailEntrance(document.querySelector('.product-detail-info'));
}

function showProductProblem(title, message, retry) {
  document.querySelector('.product-detail-wrapper').hidden = true;
  document.querySelector('.sticky-cta').hidden = true;
  document.body.classList.remove('has-sticky-cta');
  document.title = `${title} - AquaPrint 3D`;

  const status = document.getElementById('detail-status');
  status.innerHTML = `
    <h1>${title}</h1>
    <p role="status">${message}</p>
    <div class="status-actions">
      ${retry ? '<button type="button" class="btn btn-primary">Thử lại</button>' : ''}
      <a href="index.html#products" class="btn ${retry ? 'btn-secondary' : 'btn-primary'}">Quay lại danh sách</a>
    </div>
  `;
  status.hidden = false;
  if (retry) status.querySelector('button').onclick = retry;
}

export function showProductLoadError(retry) {
  showProductProblem('Không thể tải sản phẩm', 'Vui lòng thử lại để xem thông tin sản phẩm.', retry);
}

function initProductImages(product) {
  const mainImage = document.getElementById('detail-image');
  const frame = document.getElementById('detail-image-frame');
  const images = getProductImages(product).map((src, index) => ({
    src,
    alt: index === 0 ? product.name : `${product.name} – ảnh ${index + 1}`
  }));
  let activeIndex = 0;

  if (mainImage.getAttribute('src') !== images[0].src) mainImage.src = images[0].src;
  mainImage.alt = images[0].alt;
  frame.disabled = false;
  frame.addEventListener('click', () => openImageViewer(images, activeIndex, mainImage, frame));

  if (images.length < 2) return;
  const thumbnails = document.createElement('div');
  thumbnails.className = 'product-gallery-thumbnails';
  thumbnails.setAttribute('role', 'group');
  thumbnails.setAttribute('aria-label', 'Ảnh sản phẩm');
  thumbnails.innerHTML = images.map(({ src }, index) => `
    <button type="button" class="thumbnail${index === 0 ? ' active' : ''}" aria-pressed="${index === 0}"
            aria-label="Ảnh ${index + 1}">
      <img src="${escapeHtml(src)}" alt="" loading="lazy" decoding="async">
    </button>
  `).join('');
  const buttons = [...thumbnails.children];
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => {
      if (activeIndex === index) return;
      buttons[activeIndex].classList.remove('active');
      buttons[activeIndex].setAttribute('aria-pressed', 'false');
      button.classList.add('active');
      button.setAttribute('aria-pressed', 'true');
      activeIndex = index;
      mainImage.src = images[index].src;
      mainImage.alt = images[index].alt;
      if (MOTION) gsap.fromTo(mainImage, { opacity: 0.4 }, { opacity: 1, duration: 0.45, ease: EASE, overwrite: true });
    });
  });
  frame.parentElement.appendChild(thumbnails);
  if (MOTION) {
    const unlock = lockTransitions(buttons);
    gsap.from(buttons, { y: 16, autoAlpha: 0, duration: 0.6, stagger: 0.06, delay: 0.35, ease: EASE, onComplete: unlock });
  }
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
function initQuantityControls(product) {
  const qtyInput = document.getElementById('detail-qty');
  const qtyMinus = document.getElementById('detail-qty-minus');
  const qtyPlus = document.getElementById('detail-qty-plus');
  const totalEl = document.getElementById('detail-total');
  const unitPriceEl = document.getElementById('detail-unit-price');
  const savedEl = document.getElementById('detail-saved');
  const nextHintEl = document.getElementById('detail-next-hint');
  const pricingStatus = document.getElementById('detail-pricing-status');
  const orderLinks = [document.getElementById('detail-zalo-btn'), document.getElementById('sticky-zalo-btn')];
  const bestTier = discountTiers[0].minQuantity;
  const counter = { amount: 0 };
  let quantity;

  const showTotal = (total, animate) => {
    if (!animate) {
      counter.amount = total;
      totalEl.textContent = formatVnd(total);
      return;
    }
    gsap.to(counter, {
      amount: total, duration: 0.6, ease: 'power3.out', overwrite: true,
      onUpdate: () => { totalEl.textContent = formatVnd(Math.round(counter.amount / 100) * 100); },
      onComplete: () => { totalEl.textContent = formatVnd(total); }
    });
    gsap.fromTo(totalEl, { scale: 1.1 }, { scale: 1, duration: 0.6, ease: 'back.out(3)', overwrite: true });
  };

  const update = requestedQuantity => {
    const pricing = calculatePricing(product.price, requestedQuantity);
    const { unitPrice, total, saved, next } = pricing;
    if (pricing.quantity === quantity) return;
    const previousQuantity = quantity;
    quantity = pricing.quantity;
    const animate = MOTION && previousQuantity !== undefined;

    showTotal(total, animate);

    const regularPrice = saved > 0 ? `<s>${formatVnd(product.price)}</s> ` : '';
    unitPriceEl.innerHTML = `${regularPrice}<strong>${formatVnd(unitPrice)}</strong>/cái`;
    const savingsWereHidden = savedEl.hidden;
    savedEl.hidden = saved === 0;
    if (saved > 0) {
      savedEl.innerHTML = `<i class="fas fa-tag" aria-hidden="true"></i> Tiết kiệm ${formatVnd(saved)}`;
      if (animate && savingsWereHidden) {
        gsap.fromTo(savedEl, { scale: 0.5, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.6, ease: 'back.out(2.5)' });
      }
    }

    nextHintEl.innerHTML = next
      ? `Mua thêm <strong>${next.minQuantity - quantity}</strong> cái nữa để giảm <strong>${formatVnd(next.perUnit)}/cái</strong>`
      : '<i class="fas fa-star" aria-hidden="true"></i> Đã đạt mức giá tốt nhất';
    nextHintEl.classList.toggle('hint-best', !next);

    if (animate && quantity >= bestTier && previousQuantity < bestTier) {
      bubbleBurst(totalEl);
      gsap.fromTo(nextHintEl, { scale: 0.6, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.7, ease: 'back.out(2.5)' });
    }

    const orderUrl = buildZaloOrderUrl(product, pricing);
    orderLinks.forEach(link => { link.href = orderUrl; });
    qtyMinus.disabled = quantity === 1;
    qtyPlus.disabled = quantity === maxQuantity;
    pricingStatus.textContent = `Tổng tiền cho ${quantity} sản phẩm: ${formatVnd(total)}`;
  };

  const setQuantity = requestedQuantity => {
    update(requestedQuantity);
    qtyInput.value = quantity;
  };

  const step = (button, direction) => {
    if (button.disabled) return;
    setQuantity(quantity + direction);
    if (!MOTION) return;
    const unlock = lockTransitions(button);
    gsap.fromTo(button, { scale: 0.8 }, {
      scale: 1, duration: 0.45, ease: 'back.out(4)', clearProps: 'transform', overwrite: true, onComplete: unlock
    });
    gsap.fromTo(qtyInput, { yPercent: direction * 45 }, { yPercent: 0, duration: 0.35, ease: 'power3.out', overwrite: true });
  };

  qtyMinus.addEventListener('click', () => step(qtyMinus, -1));
  qtyPlus.addEventListener('click', () => step(qtyPlus, 1));
  qtyInput.addEventListener('input', () => {
    if (Number.isFinite(qtyInput.valueAsNumber)) update(qtyInput.valueAsNumber);
  });
  qtyInput.addEventListener('change', () => setQuantity(qtyInput.valueAsNumber));

  qtyInput.max = maxQuantity;
  setQuantity(1);
  qtyInput.disabled = false;
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
