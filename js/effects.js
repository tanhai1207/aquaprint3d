import { gsap, ScrollTrigger, EASE, MOTION, REDUCED_MOTION, FINE_POINTER, IS_SMALL, splitWords } from './motion.js';

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
    .from(visual, { y: 30, scale: 0.98, duration: 1.5 }, 0.25);

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
  gsap.set(els, { opacity: 0, y });
  ScrollTrigger.batch(els, {
    start: 'top 95%',
    once: true,
    onEnter: batch => {
      batch.forEach(el => el.classList.add('gsap-driven'));
      gsap.to(batch, {
        opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out', overwrite: true,
        clearProps: 'opacity,transform',
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
        { opacity: 0, y: 40, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: 'power3.out', clearProps: 'opacity,transform' })
      .fromTo(img, { scale: 1.2 }, { scale: 1, duration: 1.2, ease: EASE, clearProps: 'transform' }, 0);
  });

  const footer = document.querySelector('.footer-content');
  if (footer) {
    gsap.from(footer.children, {
      y: 20, opacity: 0, duration: 0.9, stagger: 0.1, ease: EASE, clearProps: 'opacity,transform',
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

export function initEffects() {
  initHero();
  initSectionHeaders();
  initReveals();
  initMagnetic();
  initRipple();
  initFloatingContact();
}
