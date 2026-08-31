/* ============================================================================
 * deck.js — Cinematic presentation engine (vanilla JS, zero dependencies).
 *
 * Renders the deck from window.DECK_CONFIG (js/slides.config.js):
 *   - Fullscreen crossfade deck (all slides kept mounted for state retention)
 *   - Autoplay (default on) + Loop (default on), each toggleable by the two
 *     glass switches in the bottom-right corner
 *   - Prev/next arrows, clickable dots, touch/pointer swipe
 *   - Image slides with optional Ken Burns zoom/pan
 *   - Video slides via YouTube IFrame API or <video> (mp4), muted autoplay
 *   - Hidden iframe slides: excluded from the visible sequence/autoplay/dots;
 *     opened by a parent slide's "See more" CTA; closed by the Close button
 *     on the iframe slide; autoplay pauses while open
 *   - State is in-memory only — everything resets on page reload
 * ========================================================================== */

(() => {
  'use strict';

  const cfg = window.DECK_CONFIG || { slides: [] };
  const meta = cfg.meta || {};
  const slides = Array.isArray(cfg.slides) ? cfg.slides : [];
  const isIframeSlide = (s) => s.type === 'iframe';
  const sequence = slides.filter((s) => !isIframeSlide(s)); // visible order
  const DELAY = typeof cfg.autoplayDelay === 'number' ? cfg.autoplayDelay : 5000;
  const KEN_BURNS = cfg.kenBurns !== false;

  const els = {
    viewport: document.getElementById('deckViewport'),
    brand: document.getElementById('deckBrand'),
    prev: document.getElementById('btnPrev'),
    next: document.getElementById('btnNext'),
    dots: document.getElementById('deckDots'),
    toggleAutoplay: document.getElementById('toggleAutoplay'),
    toggleLoop: document.getElementById('toggleLoop'),
    footer: document.getElementById('deckFooter'),
  };

  const state = {
    index: 0,
    autoplay: cfg.autoplayDefault !== false,
    loop: cfg.loopDefault !== false,
    iframeOpen: null, // slide id currently open as an iframe
    returnToId: null, // slide id to return to when the iframe closes
    timer: null,
    touch: { x: 0, y: 0, active: false },
  };

  /* ------------------------------------------------------------ icons ---- */
  const SVG_SOUND =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';
  const SVG_MUTED =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';
  const ICON_CLOSE =
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  const ICON_SOUND =
    '<span class="ico ico-on" aria-hidden="true">' + SVG_SOUND + '</span>' +
    '<span class="ico ico-off" aria-hidden="true">' + SVG_MUTED + '</span>';

  /* -------------------------------------------------------- small helpers - */
  const slideEl = (id) => els.viewport.querySelector('[data-slide-id="' + id + '"]');
  const byId = (id) => slides.find((s) => s.id === id);

  /* ------------------------------------------------------------- render ---- */
  function buildCaption(slide) {
    const wrap = document.createElement('div');
    wrap.className = 'slide-caption glass';
    if (slide.title) {
      const h = document.createElement('h2');
      h.className = 'slide-title';
      h.textContent = slide.title;
      wrap.appendChild(h);
    }
    if (slide.caption) {
      const p = document.createElement('p');
      p.className = 'slide-text';
      p.textContent = slide.caption;
      wrap.appendChild(p);
    }
    if (slide.seeMore && slide.seeMore.target) {
      const btn = document.createElement('button');
      btn.className = 'slide-cta';
      btn.type = 'button';
      btn.dataset.openIframe = slide.seeMore.target;
      btn.textContent = slide.seeMore.label || 'See more';
      wrap.appendChild(btn);
    }
    return wrap;
  }

  function buildSlides() {
    if (!sequence.length) {
      const msg = document.createElement('div');
      msg.className = 'deck-empty';
      msg.textContent = 'No visible slides configured. Edit js/slides.config.js.';
      els.viewport.appendChild(msg);
      return;
    }

    slides.forEach((slide, i) => {
      const el = document.createElement('section');
      el.className = 'slide slide--' + slide.type;
      el.dataset.slideId = slide.id;
      el.setAttribute('role', 'group');
      el.setAttribute('aria-roledescription', 'slide');
      el.setAttribute('aria-hidden', 'true');

      if (slide.type === 'image') {
        const media = document.createElement('div');
        media.className = 'slide-media';
        const img = document.createElement('img');
        img.src = (slide.image && slide.image.src) || '';
        img.alt = (slide.image && slide.image.alt) || slide.title || '';
        img.draggable = false;
        img.loading = i === 0 ? 'eager' : 'lazy';
        media.appendChild(img);
        el.appendChild(media);
        const cap = buildCaption(slide);
        if (cap.childNodes.length) el.appendChild(cap);
      } else if (slide.type === 'video') {
        const media = document.createElement('div');
        media.className = 'slide-media slide-media--video';
        if (slide.provider === 'mp4') {
          const v = document.createElement('video');
          v.className = 'slide-video';
          v.src = slide.src;
          v.muted = true;
          v.loop = true;
          v.playsInline = true;
          v.preload = 'metadata';
          media.appendChild(v);
        } else {
          const holder = document.createElement('div');
          holder.className = 'video-embed';
          holder.id = 'youtube-' + slide.id;
          media.appendChild(holder);
        }
        el.appendChild(media);

        const mute = document.createElement('button');
        mute.className = 'slide-mute glass muted';
        mute.type = 'button';
        mute.dataset.muteVideo = slide.id;
        mute.setAttribute('aria-label', 'Unmute video');
        mute.innerHTML = ICON_SOUND;
        el.appendChild(mute);

        const cap = buildCaption(slide);
        if (cap.childNodes.length) el.appendChild(cap);
      } else if (slide.type === 'iframe') {
        const wrap = document.createElement('div');
        wrap.className = 'slide-iframe-wrap';
        const frame = document.createElement('iframe');
        frame.dataset.iframeSrc = slide.url;
        // `allow` includes `fullscreen`, so the separate allowfullscreen
        // attribute is intentionally omitted (avoids a console warning).
        frame.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen');
        frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        frame.title = slide.title || 'Embedded website';
        wrap.appendChild(frame);
        el.appendChild(wrap);

        const close = document.createElement('button');
        close.className = 'slide-close glass';
        close.type = 'button';
        close.dataset.closeIframe = slide.id;
        close.setAttribute('aria-label', 'Close embedded site and return');
        close.innerHTML = ICON_CLOSE;
        el.appendChild(close);

        if (slide.title) {
          const label = document.createElement('div');
          label.className = 'slide-iframe-label glass';
          label.textContent = slide.title;
          el.appendChild(label);
        }
      }

      els.viewport.appendChild(el);
    });
  }

  function buildDots() {
    sequence.forEach((s, i) => {
      const b = document.createElement('button');
      b.className = 'deck-dot';
      b.type = 'button';
      b.dataset.index = String(i);
      b.setAttribute('aria-label', 'Go to slide ' + (i + 1));
      els.dots.appendChild(b);
    });
  }

  /* ------------------------------------------------------------- chrome ---- */
  function updateDots() {
    Array.prototype.forEach.call(els.dots.children, (b, i) => {
      b.classList.toggle('active', i === state.index);
    });
  }

  function updateArrows() {
    const atStart = state.index === 0;
    const atEnd = state.index === sequence.length - 1;
    const prevDis = atStart && !state.loop;
    const nextDis = atEnd && !state.loop;
    els.prev.classList.toggle('disabled', prevDis);
    els.next.classList.toggle('disabled', nextDis);
    els.prev.disabled = prevDis;
    els.next.disabled = nextDis;
  }

  function updateFooter() {
    if (els.footer) {
      els.footer.textContent = String(state.index + 1) + ' / ' + sequence.length;
    }
  }

  function updateBrand() {
    if (!meta.title) {
      els.brand.remove();
      return;
    }
    const h = document.createElement('h1');
    h.textContent = meta.title;
    els.brand.appendChild(h);
    if (meta.tagline) {
      const p = document.createElement('p');
      p.textContent = meta.tagline;
      els.brand.appendChild(p);
    }
  }

  /* ----------------------------------------------------------- navigation -- */
  function activate(index) {
    if (!sequence.length) return;
    state.index = index;
    const cur = sequence[index];
    slides.forEach((s) => {
      const el = slideEl(s.id);
      if (!el) return;
      const on = s.id === cur.id;
      el.classList.toggle('active', on);
      el.setAttribute('aria-hidden', String(!on));
    });
    syncVideo();
    updateDots();
    updateArrows();
    updateFooter();
    restartAutoplay();
  }

  function next() {
    if (state.iframeOpen) return;
    if (state.index < sequence.length - 1) activate(state.index + 1);
    else if (state.loop) activate(0);
    else stopAutoplay(); // end of deck, loop off
  }

  function prev() {
    if (state.iframeOpen) return;
    if (state.index > 0) activate(state.index - 1);
    else if (state.loop) activate(sequence.length - 1);
  }

  /* ------------------------------------------------------------ autoplay --- */
  function restartAutoplay() {
    stopAutoplay();
    if (state.autoplay && !state.iframeOpen && sequence.length > 1) {
      state.timer = setTimeout(next, DELAY);
    }
  }

  function stopAutoplay() {
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }
  }

  function setAutoplay(on) {
    state.autoplay = !!on;
    els.toggleAutoplay.classList.toggle('on', state.autoplay);
    els.toggleAutoplay.setAttribute('aria-checked', String(state.autoplay));
    if (state.autoplay) restartAutoplay();
    else stopAutoplay();
  }

  function setLoop(on) {
    state.loop = !!on;
    els.toggleLoop.classList.toggle('on', state.loop);
    els.toggleLoop.setAttribute('aria-checked', String(state.loop));
    updateArrows();
  }

  /* -------------------------------------------------------------- video ---- */
  const ytPlayers = {}; // slideId -> YT.Player
  let ytLoading = false;

  window.onYouTubeIframeAPIReady = function () {
    ytLoading = false;
  };

  function ensureYouTube(cb) {
    if (window.YT && window.YT.Player) {
      cb();
      return;
    }
    if (ytLoading) return; // onYouTubeIframeAPIReady will fire; slide will retry on next activation
    ytLoading = true;
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;
    document.head.appendChild(tag);
    // The API is async; if it loads after our first attempt, retry the cb a
    // few times when the player is next needed.
    let tries = 0;
    const retry = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(retry);
        cb();
      } else if (++tries > 50) {
        clearInterval(retry);
      }
    }, 200);
  }

  function playVideo(slide) {
    if (slide.provider === 'mp4') {
      const v = slideEl(slide.id) && slideEl(slide.id).querySelector('video');
      if (v) v.play().catch(() => {});
      return;
    }
    ensureYouTube(() => {
      const holderId = 'youtube-' + slide.id;
      if (!document.getElementById(holderId)) return;
      // Only proceed if this slide is still the active one (the YouTube API
      // may finish loading after the deck has already moved on).
      const cur = sequence[state.index];
      if (!cur || cur.id !== slide.id) return;
      let p = ytPlayers[slide.id];
      if (!p) {
        p = new YT.Player(holderId, {
          videoId: slide.videoId,
          playerVars: {
            autoplay: 1,
            mute: 1,
            playsinline: 1,
            controls: 1,
            rel: 0,
            modestbranding: 1,
          },
          events: {
            onReady: () => {
              try {
                p.playVideo();
              } catch (e) { /* noop */ }
            },
          },
        });
        ytPlayers[slide.id] = p;
      } else {
        try {
          p.playVideo();
        } catch (e) { /* noop */ }
      }
    });
  }

  function pauseVideo(slide) {
    if (slide.provider === 'mp4') {
      const v = slideEl(slide.id) && slideEl(slide.id).querySelector('video');
      if (v) v.pause();
      return;
    }
    const p = ytPlayers[slide.id];
    if (p) {
      try {
        p.pauseVideo();
      } catch (e) { /* noop */ }
    }
  }

  function pauseAllVideos() {
    slides.forEach((s) => {
      if (s.type === 'video') pauseVideo(s);
    });
  }

  function syncVideo() {
    const cur = sequence[state.index];
    slides.forEach((s) => {
      if (s.type !== 'video') return;
      if (cur && s.id === cur.id) playVideo(s);
      else pauseVideo(s);
    });
  }

  function toggleMute(slideId, btn) {
    const s = byId(slideId);
    if (!s) return;
    let muted;
    if (s.provider === 'mp4') {
      const v = slideEl(slideId) && slideEl(slideId).querySelector('video');
      if (!v) return;
      muted = !v.muted;
      v.muted = muted;
      v.volume = muted ? 0 : 1;
    } else {
      const p = ytPlayers[slideId];
      if (!p) return;
      muted = p.isMuted();
      try {
        if (muted) p.unMute();
        else p.mute();
      } catch (e) { /* noop */ }
    }
    btn.classList.toggle('muted', muted);
    btn.setAttribute('aria-label', muted ? 'Unmute video' : 'Mute video');
  }

  /* ------------------------------------------------- iframe (see more) ----- */
  function loadIframe(targetEl) {
    const frame = targetEl.querySelector('iframe[data-iframe-src]');
    if (frame && !frame.src) frame.src = frame.dataset.iframeSrc;
  }

  function openIframe(targetId) {
    if (state.iframeOpen || !byId(targetId)) return;
    const parentId = sequence[state.index] ? sequence[state.index].id : null;
    stopAutoplay();
    pauseAllVideos();
    state.iframeOpen = targetId;
    state.returnToId = parentId;
    slides.forEach((s) => {
      const el = slideEl(s.id);
      if (!el) return;
      const on = s.id === targetId;
      el.classList.toggle('active', on);
      el.setAttribute('aria-hidden', String(!on));
    });
    const target = slideEl(targetId);
    loadIframe(target);
    document.body.classList.add('deck-iframe-open');
    const closeBtn = target.querySelector('.slide-close');
    if (closeBtn) closeBtn.focus();
  }

  function closeIframe() {
    if (!state.iframeOpen) return;
    const ret = state.returnToId;
    state.iframeOpen = null;
    state.returnToId = null;
    document.body.classList.remove('deck-iframe-open');
    const idx = sequence.findIndex((s) => s.id === ret);
    activate(idx >= 0 ? idx : 0);
    // return focus to the "See more" button that opened it, if still present
    const parent = slideEl(ret);
    const cta = parent && parent.querySelector('.slide-cta');
    if (cta) cta.focus();
  }

  /* ------------------------------------------------------------- events ---- */
  function bindEvents() {
    els.prev.addEventListener('click', prev);
    els.next.addEventListener('click', next);
    els.toggleAutoplay.addEventListener('click', () => setAutoplay(!state.autoplay));
    els.toggleLoop.addEventListener('click', () => setLoop(!state.loop));

    els.dots.addEventListener('click', (e) => {
      const dot = e.target.closest('.deck-dot');
      if (!dot || state.iframeOpen) return;
      activate(Number(dot.dataset.index));
    });

    els.viewport.addEventListener('click', (e) => {
      const openBtn = e.target.closest('[data-open-iframe]');
      if (openBtn && !state.iframeOpen) {
        openIframe(openBtn.dataset.openIframe);
        return;
      }
      const closeBtn = e.target.closest('[data-close-iframe]');
      if (closeBtn) {
        closeIframe();
        return;
      }
      const muteBtn = e.target.closest('[data-mute-video]');
      if (muteBtn) toggleMute(muteBtn.dataset.muteVideo, muteBtn);
    });

    // Touch / pointer swipe (horizontal). Vertical is left to the browser.
    els.viewport.addEventListener('pointerdown', (e) => {
      if (state.iframeOpen) return;
      state.touch = { x: e.clientX, y: e.clientY, active: true };
    });
    els.viewport.addEventListener('pointerup', (e) => {
      if (!state.touch.active) return;
      const dx = e.clientX - state.touch.x;
      const dy = e.clientY - state.touch.y;
      state.touch.active = false;
      if (Math.abs(dx) < 48 || Math.abs(dx) <= Math.abs(dy)) return;
      if (dx < 0) next();
      else prev();
    });
    els.viewport.addEventListener('pointercancel', () => {
      state.touch.active = false;
    });
  }

  /* ---------------------------------------------------------------- init --- */
  function init() {
    if (meta.accent) {
      document.documentElement.style.setProperty('--accent', meta.accent);
    }
    if (meta.title) document.title = meta.title + ' — Presentation';
    buildSlides();
    buildDots();
    updateBrand();
    bindEvents();
    if (!sequence.length) return;

    if (sequence.length < 2) {
      els.prev.classList.add('hidden');
      els.next.classList.add('hidden');
      els.dots.classList.add('hidden');
    }

    setAutoplay(cfg.autoplayDefault !== false);
    setLoop(cfg.loopDefault !== false);
    activate(0);
  }

  init();
})();
