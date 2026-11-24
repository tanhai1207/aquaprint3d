import { gsap, EASE, HAS_GSAP, MOTION, REDUCED_MOTION, lockTransitions, setSmoothScrollPaused } from './motion.js';

export const openImageViewer = (() => {
  let lightbox, imgEl, closeBtn, zoomInBtn, zoomOutBtn, resetBtn, hint;
  let prevBtn, nextBtn, counterEl, chrome;
  let stageEl, trackEl, prevSlideImg, nextSlideImg;
  let items = [];
  let index = 0;
  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  let gesture = null;
  let suppressClick = false;
  let pinchStartDist = 0;
  let pinchStartScale = 1;
  let slideTimer = null;
  let isClosing = false;
  let openingId = 0;
  let sourceEl = null;
  let sourceIndex = -1;
  let opener = null;
  let previousOverflow = '';

  const MIN = 1, MAX = 4;
  const SWIPE_THRESHOLD = 60;
  const SLIDE_DURATION = 450;

  function ensureMounted() {
    if (lightbox) return;
    lightbox = document.createElement('dialog');
    lightbox.className = 'lightbox';
    lightbox.setAttribute('aria-label', 'Trình xem ảnh');
    lightbox.setAttribute('data-lenis-prevent', '');
    lightbox.innerHTML = `
      <button class="lightbox-close" aria-label="Đóng" autofocus><i class="fas fa-times"></i></button>
      <div class="lightbox-toolbar">
        <button class="lightbox-tool" data-act="zoom-out" aria-label="Thu nhỏ"><i class="fas fa-magnifying-glass-minus"></i></button>
        <button class="lightbox-tool" data-act="reset" aria-label="Đặt lại"><i class="fas fa-arrows-rotate"></i></button>
        <button class="lightbox-tool" data-act="zoom-in" aria-label="Phóng to"><i class="fas fa-magnifying-glass-plus"></i></button>
      </div>
      <button class="lightbox-nav lightbox-prev" aria-label="Ảnh trước"><i class="fas fa-chevron-left"></i></button>
      <button class="lightbox-nav lightbox-next" aria-label="Ảnh sau"><i class="fas fa-chevron-right"></i></button>
      <div class="lightbox-counter" aria-live="polite"><span class="counter-current">1</span> / <span class="counter-total">1</span></div>
      <div class="lightbox-stage">
        <div class="lightbox-track">
          <div class="lightbox-slide" aria-hidden="true"><img class="lightbox-slide-img lightbox-slide-prev" alt="" draggable="false"></div>
          <div class="lightbox-slide"><img class="lightbox-img" alt="" draggable="false"></div>
          <div class="lightbox-slide" aria-hidden="true"><img class="lightbox-slide-img lightbox-slide-next" alt="" draggable="false"></div>
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
    prevBtn.addEventListener('click', () => changeSlide(-1));
    nextBtn.addEventListener('click', () => changeSlide(1));

    lightbox.addEventListener('cancel', event => {
      event.preventDefault();
      close();
    });
    lightbox.addEventListener('pointerdown', () => { suppressClick = false; }, true);
    lightbox.addEventListener('click', (e) => {
      if (suppressClick && e.detail > 0) return;
      if (e.target === lightbox || e.target.matches('.lightbox-stage, .lightbox-slide')) close();
    });

    imgEl.addEventListener('click', (e) => {
      if (suppressClick) return;
      if (scale > 1.05) reset(true);
      else zoomAt(e.clientX, e.clientY, 2.5, true);
    });

    imgEl.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      zoomAt(e.clientX, e.clientY, scale * factor, true);
    }, { passive: false });

    stageEl.addEventListener('pointerdown', startGesture);
    stageEl.addEventListener('pointermove', moveGesture);
    stageEl.addEventListener('pointerup', endGesture);
    stageEl.addEventListener('pointercancel', endGesture);

    imgEl.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        if (gesture) endGesture({ pointerId: gesture.pointerId, type: 'pointercancel' });
        suppressClick = true;
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

    lightbox.addEventListener('keydown', (e) => {
      if (isClosing) return;
      if (e.key === '+' || e.key === '=') setScale(scale * 1.4, true);
      else if (e.key === '-') setScale(scale / 1.4, true);
      else if (e.key === '0') reset(true);
      else if (e.key === 'ArrowLeft') changeSlide(-1);
      else if (e.key === 'ArrowRight') changeSlide(1);
      else return;
      e.preventDefault();
    });
  }

  function startGesture(event) {
    if (slideTimer !== null || isClosing || event.button !== 0 || !event.isPrimary) return;
    gesture = {
      pointerId: event.pointerId, x: event.clientX, y: event.clientY,
      translateX, translateY, mode: null
    };
  }

  function moveGesture(event) {
    if (gesture?.pointerId !== event.pointerId) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.mode) {
      if (scale > 1.05 && Math.hypot(dx, dy) > 6) gesture.mode = 'pan';
      else if (scale <= 1.05 && items.length > 1 && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) gesture.mode = 'swipe';
      else return;

      stageEl.setPointerCapture(event.pointerId);
      suppressClick = true;
    }

    if (gesture.mode === 'pan') {
      translateX = gesture.translateX + dx;
      translateY = gesture.translateY + dy;
      apply();
      imgEl.style.cursor = 'grabbing';
    } else {
      const offset = (dx / stageEl.clientWidth) * 33.333;
      trackEl.classList.add('no-transition');
      trackEl.style.transform = `translateX(calc(-33.333% + ${offset}%))`;
    }
  }

  function endGesture(event) {
    if (gesture?.pointerId !== event.pointerId) return;
    const { mode, x } = gesture;
    gesture = null;
    if (stageEl.hasPointerCapture(event.pointerId)) stageEl.releasePointerCapture(event.pointerId);

    if (mode === 'pan') imgEl.style.cursor = scale > 1.05 ? 'grab' : 'zoom-in';
    if (mode !== 'swipe') return;
    trackEl.classList.remove('no-transition');
    const dx = event.clientX - x;
    if (event.type !== 'pointercancel' && Math.abs(dx) > SWIPE_THRESHOLD) changeSlide(dx < 0 ? 1 : -1);
    else trackEl.style.transform = 'translateX(-33.333%)';
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
      nextSlideImg.src = items[nextIdx].src;
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

  function changeSlide(direction) {
    if (items.length <= 1 || slideTimer !== null || isClosing) return;
    const finish = () => {
      index = (index + direction + items.length) % items.length;
      showCurrent();
      if (MOTION) gsap.set(imgEl, { autoAlpha: 1 });
      slideTimer = null;
    };
    if (REDUCED_MOTION) {
      finish();
      return;
    }
    trackEl.style.transform = direction === 1 ? 'translateX(-66.666%)' : 'translateX(0%)';
    slideTimer = setTimeout(finish, SLIDE_DURATION);
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

  function open(images, startIndex, source, trigger) {
    if (!images.length || lightbox?.open) return;
    ensureMounted();
    items = images;
    index = clamp(startIndex, 0, items.length - 1);
    opener = trigger;
    previousOverflow = document.body.style.overflow;
    showCurrent();
    lightbox.classList.add('active');
    lightbox.showModal();
    document.body.style.overflow = 'hidden';
    setSmoothScrollPaused(true);

    if (!MOTION) return;

    sourceEl = source;
    sourceIndex = index;
    const currentOpening = ++openingId;
    gsap.fromTo(lightbox, { backgroundColor: 'rgba(0,0,0,0)' }, { backgroundColor: 'rgba(0,0,0,0.94)', duration: 0.45, ease: 'power2.out' });
    const unlock = lockTransitions(chrome);
    gsap.fromTo(chrome, { opacity: 0 }, { opacity: 1, duration: 0.4, delay: 0.25, stagger: 0.03, onComplete: unlock });

    // Ảnh phóng ra từ đúng vị trí ảnh được click (FLIP)
    gsap.set(imgEl, { autoAlpha: 0 });
    const flip = () => {
      if (!lightbox.open || isClosing || currentOpening !== openingId || index !== sourceIndex) return;
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
    if (!lightbox.open || isClosing) return;
    isClosing = true;
    clearTimeout(slideTimer);
    slideTimer = null;
    gesture = null;
    pinchStartDist = 0;
    suppressClick = false;

    const finish = () => {
      lightbox.classList.remove('active');
      lightbox.close();
      document.body.style.overflow = previousOverflow;
      setSmoothScrollPaused(false);
      if (HAS_GSAP) {
        gsap.set([lightbox, ...chrome], { clearProps: 'backgroundColor,opacity,visibility' });
        if (sourceEl) gsap.set(sourceEl, { clearProps: 'opacity,visibility' });
        gsap.set(imgEl, { autoAlpha: 1 });
      }
      sourceEl = null;
      reset();
      isClosing = false;
      opener?.focus({ preventScroll: true });
      opener = null;
    };

    if (!MOTION) { finish(); return; }

    const unlock = lockTransitions(chrome);
    gsap.to(chrome, { opacity: 0, duration: 0.2, overwrite: true, onComplete: unlock });
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

  return open;
})();

export function initGalleryViewer() {
  const buttons = [...document.querySelectorAll('.gallery-open')];
  const images = buttons.map(button => button.querySelector('img'));
  const gallery = images.map(image => ({ src: image.src, alt: image.alt }));
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => openImageViewer(gallery, index, images[index], button));
  });
}
