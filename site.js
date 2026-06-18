/* ============================================================
   CAFETERRA — shared behaviour
   ============================================================ */
(function () {
  'use strict';

  /* ---------- i18n ---------- */
  var LANG_KEY = 'cafeterra-lang';
  function getLang() { return localStorage.getItem(LANG_KEY) || 'fr'; }
  function applyLang(lang) {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-fr]').forEach(function (el) {
      var v = el.getAttribute('data-' + lang);
      if (v == null) return;
      if (el.dataset.i18nAttr) { el.setAttribute(el.dataset.i18nAttr, v); }
      else { el.innerHTML = v; }
    });
    document.querySelectorAll('.lang button').forEach(function (b) {
      b.classList.toggle('on', b.dataset.lang === lang);
    });
    localStorage.setItem(LANG_KEY, lang);
  }
  window.setLang = applyLang;

  /* ---------- social links (paste URLs here) ---------- */
  var SOCIAL_LINKS = {
    instagram: 'https://www.instagram.com/cafeterra.mtl/'
  };

  function initSocialLinks() {
    document.querySelectorAll('[data-social]').forEach(function (a) {
      var url = SOCIAL_LINKS[a.getAttribute('data-social')];
      if (url) {
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.removeAttribute('aria-disabled');
      } else {
        a.href = '#';
        a.setAttribute('aria-disabled', 'true');
        a.addEventListener('click', function (e) { e.preventDefault(); });
      }
    });
  }

  /* ---------- nav solidify ---------- */
  function initNav() {
    var nav = document.querySelector('.nav');
    if (!nav) return;
    var hero = document.querySelector('.hero');
    var trigger = hero ? function () { return window.scrollY > (hero.offsetHeight - 90); }
                       : function () { return window.scrollY > 20; };
    function upd() { nav.classList.toggle('solid', trigger()); }
    upd();
    window.addEventListener('scroll', upd, { passive: true });
  }

  /* ---------- mobile drawer ---------- */
  function initDrawer() {
    var burger = document.querySelector('.nav-burger');
    var drawer = document.querySelector('.drawer');
    if (!burger || !drawer) return;
    function close() { drawer.classList.remove('open'); document.body.style.overflow = ''; }
    burger.addEventListener('click', function () {
      drawer.classList.add('open'); document.body.style.overflow = 'hidden';
    });
    drawer.querySelector('.close').addEventListener('click', close);
    drawer.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', close); });
  }

  /* ---------- scroll reveal (visible-by-default; JS arms then reveals) ---------- */
  function initReveal() {
    var els = [].slice.call(document.querySelectorAll('.reveal'));
    if (!els.length) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; // stays visible

    els.forEach(function (e) { e.classList.add('armed'); }); // hide for entrance
    var pending = els.slice();
    var ticking = false;

    function reveal(el) { el.classList.add('in'); }
    function check() {
      ticking = false;
      var vh = window.innerHeight || document.documentElement.clientHeight;
      for (var i = pending.length - 1; i >= 0; i--) {
        if (pending[i].getBoundingClientRect().top < vh * 0.9) { reveal(pending[i]); pending.splice(i, 1); }
      }
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(check); } }

    check(); // reveal what's already in view
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('load', function () { setTimeout(check, 60); });
    // failsafe: if scroll/observer never advance, make everything visible
    setTimeout(function () { pending.slice().forEach(reveal); pending.length = 0; }, 1600);
  }

  /* ---------- parallax ---------- */
  function initParallax() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var layers = [].slice.call(document.querySelectorAll('[data-parallax]'));
    if (!layers.length) return;
    var ticking = false;
    function frame() {
      var vh = window.innerHeight;
      layers.forEach(function (l) {
        var r = l.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var speed = parseFloat(l.getAttribute('data-parallax')) || 0.15;
        var img = l.querySelector('img') || l;
        var center = r.top + r.height / 2 - vh / 2;
        img.style.transform = 'translate3d(0,' + (-center * speed).toFixed(1) + 'px,0)';
      });
      ticking = false;
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    frame();
  }

  /* ---------- rotating ambiance quotes ---------- */
  function initQuotes() {
    var box = document.querySelector('[data-quotes]');
    if (!box) return;
    var stage = box.querySelector('.quote-stage');
    var slide = stage.querySelector('.quote-slide');
    var dotsWrap = box.querySelector('.quote-dots');
    var data = JSON.parse(box.getAttribute('data-quotes'));
    var i = 0, timer, resizeTimer, animating = false, swapTimer;
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var dots = data.map(function (_, idx) {
      var b = document.createElement('button');
      b.addEventListener('click', function () { go(idx, true); rearm(); });
      dotsWrap.appendChild(b);
      return b;
    });
    function setSlideContent(target, quote, lang) {
      var bq = target.querySelector('blockquote');
      var by = target.querySelector('.by');
      bq.setAttribute('data-fr', quote.fr);
      bq.setAttribute('data-en', quote.en_q);
      bq.innerHTML = quote[lang === 'fr' ? 'fr' : 'en_q'];
      by.textContent = quote.by;
    }
    function lockStageHeight(lang) {
      var probe = stage.cloneNode(true);
      probe.removeAttribute('style');
      probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;left:0;right:0;width:' + stage.offsetWidth + 'px';
      stage.parentNode.appendChild(probe);
      var pslide = probe.querySelector('.quote-slide');
      pslide.classList.add('is-visible');
      var max = 0;
      data.forEach(function (q) {
        setSlideContent(pslide, q, lang);
        max = Math.max(max, probe.offsetHeight);
      });
      probe.remove();
      stage.style.minHeight = max + 'px';
    }
    function showSlide() {
      requestAnimationFrame(function () { slide.classList.add('is-visible'); });
    }
    function go(n, animate) {
      if (animating) return;
      var lang = getLang();
      dots.forEach(function (d, k) { d.classList.toggle('on', k === n); });
      if (n === i && slide.classList.contains('is-visible')) return;

      function applyQuote() {
        i = n;
        setSlideContent(slide, data[n], lang);
        showSlide();
        animating = false;
      }

      if (!animate || reducedMotion || !slide.classList.contains('is-visible')) {
        clearTimeout(swapTimer);
        slide.classList.remove('is-visible');
        applyQuote();
        return;
      }

      animating = true;
      slide.classList.remove('is-visible');
      function onFadeOut(e) {
        if (e.target !== slide || e.propertyName !== 'opacity') return;
        slide.removeEventListener('transitionend', onFadeOut);
        clearTimeout(swapTimer);
        applyQuote();
      }
      slide.addEventListener('transitionend', onFadeOut);
      swapTimer = setTimeout(function () {
        slide.removeEventListener('transitionend', onFadeOut);
        applyQuote();
      }, 620);
    }
    function rearm() { clearInterval(timer); timer = setInterval(function () { go((i + 1) % data.length, true); }, 6000); }
    function refreshStage() {
      lockStageHeight(getLang());
      setSlideContent(slide, data[i], getLang());
    }
    go(0, false); rearm();
    refreshStage();
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(refreshStage, 120);
    });
    document.querySelectorAll('.lang button').forEach(function (b) {
      b.addEventListener('click', function () { setTimeout(refreshStage, 80); });
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(refreshStage);
    }
    window.addEventListener('load', refreshStage);
  }

  /* ---------- menu dish photos (click to view) ---------- */
  function initMenuPhotos() {
    var items = [].slice.call(document.querySelectorAll('.mi--has-photo[data-photo]'));
    var box = document.getElementById('menu-photo-lightbox');
    if (!items.length || !box) return;

    var img = box.querySelector('img');
    var cap = box.querySelector('figcaption');
    var closeBtn = box.querySelector('.menu-photo-lightbox__close');
    var lastFocus = null;

    function open(item) {
      var src = item.getAttribute('data-photo');
      if (!src) return;
      lastFocus = document.activeElement;
      img.src = src;
      img.alt = item.getAttribute('data-photo-alt') || '';
      var title = item.querySelector('.mi-head h4');
      cap.textContent = title ? title.textContent.trim() : '';
      box.removeAttribute('hidden');
      box.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(function () { box.classList.add('is-open'); });
      document.body.style.overflow = 'hidden';
      closeBtn.focus();
    }

    function close() {
      box.classList.remove('is-open');
      box.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      function done() {
        box.setAttribute('hidden', '');
        img.removeAttribute('src');
        if (lastFocus && lastFocus.focus) lastFocus.focus();
      }
      var t = setTimeout(done, 260);
      box.addEventListener('transitionend', function onEnd(e) {
        if (e.target !== box || e.propertyName !== 'opacity') return;
        clearTimeout(t);
        box.removeEventListener('transitionend', onEnd);
        done();
      });
    }

    items.forEach(function (item) {
      item.addEventListener('click', function () { open(item); });
      item.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(item); }
      });
    });
    closeBtn.addEventListener('click', close);
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && box.classList.contains('is-open')) close();
    });
  }

  /* ---------- boot ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    applyLang(getLang());
    document.querySelectorAll('.lang button').forEach(function (b) {
      b.addEventListener('click', function () { applyLang(b.dataset.lang); });
    });
    initNav(); initDrawer(); initReveal(); initParallax(); initQuotes(); initSocialLinks(); initMenuPhotos();
  });
})();
