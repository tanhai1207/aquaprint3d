import { gsap, ScrollTrigger, EASE, HAS_GSAP, HAS_ST, MOTION, scrollToTarget, setSmoothScrollPaused } from './motion.js';

function initMobileNav() {
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (!menuToggle || !navLinks) return;

  const icon = menuToggle.querySelector('i');
  const desktop = window.matchMedia('(min-width: 769px)');
  const isOpen = () => navLinks.classList.contains('active');
  const setOpen = (open) => {
    navLinks.classList.toggle('active', open);
    document.body.classList.toggle('nav-open', open);
    icon.classList.toggle('fa-bars', !open);
    icon.classList.toggle('fa-times', open);
    menuToggle.setAttribute('aria-expanded', open);
    menuToggle.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
    setSmoothScrollPaused(open);

    if (MOTION) {
      gsap.fromTo(icon, { rotation: open ? -90 : 90, scale: 0.6 }, { rotation: 0, scale: 1, duration: 0.5, ease: 'back.out(2.5)' });
      if (open) {
        gsap.fromTo(navLinks.querySelectorAll('li'),
          { x: -30, autoAlpha: 0 },
          { x: 0, autoAlpha: 1, duration: 0.6, stagger: 0.06, delay: 0.12, ease: EASE, clearProps: 'transform,opacity,visibility' });
      }
    }
  };

  menuToggle.addEventListener('click', () => setOpen(!isOpen()));
  desktop.addEventListener('change', ({ matches }) => {
    if (matches && isOpen()) setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !isOpen()) return;
    setOpen(false);
    menuToggle.focus();
  });

  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      if (isOpen()) setOpen(false);
    });
  });
}

/* =========================================
   Smooth Scroll (Lenis)
   ========================================= */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]:not(.skip-link)').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
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

export { initMobileNav, initSmoothScroll, restoreHashPosition, initScrollEffects, initScrollSpy };
