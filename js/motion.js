const { gsap, ScrollTrigger, Flip, Lenis } = window;
const HAS_GSAP = Boolean(gsap);
const HAS_ST = HAS_GSAP && Boolean(ScrollTrigger);
const HAS_FLIP = HAS_GSAP && Boolean(Flip);
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const MOTION = HAS_ST && !REDUCED_MOTION;
const FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const EASE = 'expo.out';

if (HAS_GSAP) {
  gsap.registerPlugin(...[ScrollTrigger, Flip].filter(Boolean));
  document.documentElement.classList.add('has-gsap');
}
// Thanh địa chỉ mobile co/giãn → không refresh lại toàn bộ ScrollTrigger (gây giật/nhảy)
if (HAS_ST) ScrollTrigger.config({ ignoreMobileResize: true });

const IS_SMALL = window.matchMedia('(max-width: 768px)').matches;
if (!MOTION) document.documentElement.classList.remove('js-motion');

function setSmoothScrollPaused(paused) {
  if (paused) lenis?.stop();
  else lenis?.start();
}

let lenis = null;

function initLenis() {
  if (!MOTION || !Lenis) return;
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
  window.scrollTo({ top, behavior: immediate || REDUCED_MOTION ? 'instant' : 'smooth' });
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
  el.replaceChildren();
  for (const word of text.split(' ')) {
    if (el.childElementCount) el.append(' ');
    const outer = document.createElement('span');
    outer.className = 'word';
    outer.setAttribute('aria-hidden', 'true');
    const inner = document.createElement('span');
    inner.className = 'word-inner';
    inner.textContent = word;
    outer.append(inner);
    el.append(outer);
  }
  el.dataset.split = '1';
  return el.querySelectorAll('.word-inner');
}

export {
  gsap, ScrollTrigger, Flip, HAS_GSAP, HAS_ST, HAS_FLIP, REDUCED_MOTION, MOTION,
  FINE_POINTER, IS_SMALL, EASE, initLenis, setSmoothScrollPaused, scrollToTarget,
  lockTransitions, splitWords
};
