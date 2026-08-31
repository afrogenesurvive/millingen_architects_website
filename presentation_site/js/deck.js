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
  "use strict";

  const cfg = window.DECK_CONFIG || { slides: [] };
  const meta = cfg.meta || {};
  const slides = Array.isArray(cfg.slides) ? cfg.slides : [];
  const isIframeSlide = (s) => s.type === "iframe";
  const sequence = slides.filter((s) => !isIframeSlide(s)); // visible order
  const DELAY = typeof cfg.autoplayDelay === "number" ? cfg.autoplayDelay : 5000;
  const KEN_BURNS = cfg.kenBurns !== false;

  const els = {
    viewport: document.getElementById("deckViewport"),
    brand: document.getElementById("deckBrand"),
    prev: document.getElementById("btnPrev"),
    next: document.getElementById("btnNext"),
    dots: document.getElementById("deckDots"),
    toggleAutoplay: document.getElementById("toggleAutoplay"),
    toggleLoop: document.getElementById("toggleLoop"),
    toggleSeemore: document.getElementById("toggleSeemore"),
    footer: document.getElementById("deckFooter"),
    controls: document.getElementById("deckControls"),
    controlsToggle: document.getElementById("toggleControls"),
    controlsPanel: document.getElementById("controlsPanel"),
  };

  const state = {
    index: 0,
    autoplay: cfg.autoplayDefault !== false,
    loop: cfg.loopDefault !== false,
    iframeOpen: null, // slide id currently open as an iframe
    returnToId: null, // slide id to return to when the iframe closes
    timer: null,
    touch: { x: 0, y: 0, active: false },
    controlsOpen: false,
  };

  /* ------------------------------------------------------------ icons ---- */
  const SVG_SOUND =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';
  const SVG_MUTED =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';
  const ICON_CLOSE =
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  const ICON_SOUND =
    '<span class="ico ico-on" aria-hidden="true">' + SVG_SOUND + "</span>" + '<span class="ico ico-off" aria-hidden="true">' + SVG_MUTED + "</span>";

  /* -------------------------------------------------------- small helpers - */
  const slideEl = (id) => els.viewport.querySelector('[data-slide-id="' + id + '"]');
  const byId = (id) => slides.find((s) => s.id === id);

  /* ------------------------------------------------------------- render ---- */
  function buildCaption(slide) {
    const wrap = document.createElement("div");
    wrap.className = "slide-caption glass";
    if (slide.title) {
      const h = document.createElement("h2");
      h.className = "slide-title";
      h.textContent = slide.title;
      wrap.appendChild(h);
    }
    if (slide.caption) {
      const p = document.createElement("p");
      p.className = "slide-text";
      p.textContent = slide.caption;
      wrap.appendChild(p);
    }
    return wrap;
  }

  function buildSlides() {
    if (!sequence.length) {
      const msg = document.createElement("div");
      msg.className = "deck-empty";
      msg.textContent = "No visible slides configured. Edit js/slides.config.js.";
      els.viewport.appendChild(msg);
      return;
    }

    slides.forEach((slide) => {
      const el = document.createElement("section");
      el.className = "slide slide--" + slide.type;
      el.dataset.slideId = slide.id;
      el.setAttribute("role", "group");
      el.setAttribute("aria-roledescription", "slide");
      el.setAttribute("aria-hidden", "true");

      if (slide.type === "image") {
        const media = document.createElement("div");
        media.className = "slide-media";
        const img = document.createElement("img");
        img.src = (slide.image && slide.image.src) || "";
        img.alt = (slide.image && slide.image.alt) || slide.title || "";
        img.draggable = false;
        img.loading = "eager";

        // Check if this slide should be scrollable
        if (slide.scrollable === true) {
          media.classList.add("scrollable");
          el.classList.add("slide--scrollable");
        } else {
          // Only add Ken Burns if explicitly enabled (default true) and not scrollable
          if (KEN_BURNS && slide.kenBurns !== false) {
            el.classList.add("slide--image");
          }
        }

        // Always add the image class
        el.classList.add("slide--image");

        media.appendChild(img);
        el.appendChild(media);
        const cap = buildCaption(slide);
        if (cap.childNodes.length) el.appendChild(cap);
      } else if (slide.type === "video") {
        const media = document.createElement("div");
        media.className = "slide-media slide-media--video";

        if (slide.provider === "mp4") {
          const video = document.createElement("video");
          video.className = "slide-video";
          video.src = slide.src || "";
          video.muted = true;
          video.autoplay = false;
          video.playsInline = true;
          video.loop = false;
          // video.loop = true;
          video.setAttribute("playsinline", "");
          video.setAttribute("webkit-playsinline", "");
          video.preload = "metadata";

          video.addEventListener("ended", function () {
            const slideId = slide.id;
            const currentSlide = sequence[state.index];
            if (currentSlide && currentSlide.id === slideId) {
              if (state.autoplay && !state.iframeOpen) {
                next(); // Advance to next slide
              }
            }
          });

          media.appendChild(video);
        } else if (slide.provider === "youtube") {
          const wrapper = document.createElement("div");
          wrapper.className = "video-embed";
          const id = "youtube-" + slide.id;
          wrapper.id = id;
          media.appendChild(wrapper);
        }

        el.appendChild(media);
        const cap = buildCaption(slide);
        if (cap.childNodes.length) el.appendChild(cap);

        // Add mute button
        const muteBtn = document.createElement("button");
        muteBtn.className = "slide-mute glass muted";
        muteBtn.type = "button";
        muteBtn.dataset.muteVideo = slide.id;
        muteBtn.setAttribute("aria-label", "Unmute video");
        muteBtn.innerHTML = ICON_SOUND;
        el.appendChild(muteBtn);
      } else if (slide.type === "iframe") {
        const wrap = document.createElement("div");
        wrap.className = "slide-iframe-wrap";

        const iframe = document.createElement("iframe");
        iframe.dataset.iframeSrc = slide.url || "";
        iframe.setAttribute("allowfullscreen", "");
        iframe.setAttribute("loading", "lazy");
        iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms allow-popups allow-modals");
        iframe.setAttribute("referrerpolicy", "no-referrer-when-downgrade");

        // Only set src when actually opening the iframe
        // iframe.src = "";
        wrap.appendChild(iframe);
        el.appendChild(wrap);

        // Close button
        const closeBtn = document.createElement("button");
        closeBtn.className = "slide-close glass";
        closeBtn.type = "button";
        closeBtn.dataset.closeIframe = "";
        closeBtn.setAttribute("aria-label", "Close");
        closeBtn.innerHTML = ICON_CLOSE;
        el.appendChild(closeBtn);

        // Label
        if (slide.title) {
          const label = document.createElement("div");
          label.className = "slide-iframe-label glass";
          label.textContent = slide.title;
          el.appendChild(label);
        }
      }

      els.viewport.appendChild(el);
    });
  }

  function buildDots() {
    sequence.forEach((s, i) => {
      const b = document.createElement("button");
      b.className = "deck-dot";
      b.type = "button";
      b.dataset.index = String(i);
      b.setAttribute("aria-label", "Go to slide " + (i + 1));
      els.dots.appendChild(b);
    });
  }

  /* ------------------------------------------------------------- chrome ---- */
  function updateDots() {
    Array.prototype.forEach.call(els.dots.children, (b, i) => {
      b.classList.toggle("active", i === state.index);
    });
  }

  function updateArrows() {
    const atStart = state.index === 0;
    const atEnd = state.index === sequence.length - 1;
    const prevDis = atStart && !state.loop;
    const nextDis = atEnd && !state.loop;
    els.prev.classList.toggle("disabled", prevDis);
    els.next.classList.toggle("disabled", nextDis);
    els.prev.disabled = prevDis;
    els.next.disabled = nextDis;
  }

  function updateFooter() {
    if (els.footer) {
      els.footer.textContent = String(state.index + 1) + " / " + sequence.length;
    }
  }

  function updateBrand() {
    if (!meta.title) {
      els.brand.style.display = "none";
      return;
    }
    els.brand.style.display = "block";
    const h = document.createElement("h1");
    h.textContent = meta.title;
    els.brand.appendChild(h);
    if (meta.tagline) {
      const p = document.createElement("p");
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
      el.classList.toggle("active", on);
      el.setAttribute("aria-hidden", String(!on));
    });
    syncVideo();
    updateDots();
    updateArrows();
    updateFooter();
    updateSeemore();
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
      const currentSlide = sequence[state.index];

      // If it's a video slide, don't set a timer - wait for the 'ended' event
      if (currentSlide && currentSlide.type === "video") {
        return; // No timer for video slides
      }

      // For non-video slides, use the normal delay
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
    els.toggleAutoplay.classList.toggle("on", state.autoplay);
    els.toggleAutoplay.setAttribute("aria-checked", String(state.autoplay));
    if (state.autoplay) restartAutoplay();
    else stopAutoplay();
  }

  function setLoop(on) {
    state.loop = !!on;
    els.toggleLoop.classList.toggle("on", state.loop);
    els.toggleLoop.setAttribute("aria-checked", String(state.loop));
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
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
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
    if (slide.provider === "mp4") {
      const v = slideEl(slide.id) && slideEl(slide.id).querySelector("video");
      if (v) v.play().catch(() => {});
      return;
    }
    ensureYouTube(() => {
      const holderId = "youtube-" + slide.id;
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
              } catch (e) {
                /* noop */
              }
            },
          },
        });
        ytPlayers[slide.id] = p;
      } else {
        try {
          p.playVideo();
        } catch (e) {
          /* noop */
        }
      }
    });
  }

  function pauseVideo(slide) {
    if (slide.provider === "mp4") {
      const v = slideEl(slide.id) && slideEl(slide.id).querySelector("video");
      if (v) v.pause();
      return;
    }
    const p = ytPlayers[slide.id];
    if (p) {
      try {
        p.pauseVideo();
      } catch (e) {
        /* noop */
      }
    }
  }

  function pauseAllVideos() {
    slides.forEach((s) => {
      if (s.type === "video") pauseVideo(s);
    });
  }

  function syncVideo() {
    const cur = sequence[state.index];
    slides.forEach((s) => {
      if (s.type !== "video") return;
      if (cur && s.id === cur.id) playVideo(s);
      else pauseVideo(s);
    });
  }

  function toggleMute(slideId, btn) {
    const s = byId(slideId);
    if (!s) return;
    let muted;
    if (s.provider === "mp4") {
      const v = slideEl(slideId) && slideEl(slideId).querySelector("video");
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
      } catch (e) {
        /* noop */
      }
    }
    btn.classList.toggle("muted", muted);
    btn.setAttribute("aria-label", muted ? "Unmute video" : "Mute video");
  }

  /* ------------------------------------------------- iframe (see more) ----- */
  function loadIframe(targetEl) {
    const frame = targetEl.querySelector("iframe[data-iframe-src]");
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
      el.classList.toggle("active", on);
      el.setAttribute("aria-hidden", String(!on));
    });
    const target = slideEl(targetId);
    loadIframe(target);
    document.body.classList.add("deck-iframe-open");
    const closeBtn = target.querySelector(".slide-close");
    if (closeBtn) closeBtn.focus();
  }

  function closeIframe() {
    if (!state.iframeOpen) return;
    const ret = state.returnToId;
    state.iframeOpen = null;
    state.returnToId = null;
    document.body.classList.remove("deck-iframe-open");
    const idx = sequence.findIndex((s) => s.id === ret);
    activate(idx >= 0 ? idx : 0);
    // return focus to the "See more" button that opened it, if still present
    const parent = slideEl(ret);
    const cta = parent && parent.querySelector(".slide-cta");
    if (cta) cta.focus();
  }

  /* ------------------------------------------------------------- events ---- */
  function bindEvents() {
    els.prev.addEventListener("click", prev);
    els.next.addEventListener("click", next);
    els.toggleAutoplay.addEventListener("click", () => setAutoplay(!state.autoplay));
    els.toggleLoop.addEventListener("click", () => setLoop(!state.loop));

    // Add see more button click handler
    if (els.toggleSeemore) {
      els.toggleSeemore.addEventListener("click", (e) => {
        const btn = e.currentTarget;
        const target = btn.dataset.openIframe;
        if (target && !state.iframeOpen) {
          openIframe(target);
        }
      });
    }

    els.dots.addEventListener("click", (e) => {
      const dot = e.target.closest(".deck-dot");
      if (!dot || state.iframeOpen) return;
      activate(Number(dot.dataset.index));
    });

    els.viewport.addEventListener("click", (e) => {
      const openBtn = e.target.closest("[data-open-iframe]");
      if (openBtn && !state.iframeOpen) {
        openIframe(openBtn.dataset.openIframe);
        return;
      }

      const closeBtn = e.target.closest("[data-close-iframe]");
      if (closeBtn) {
        closeIframe();
        return;
      }
      const muteBtn = e.target.closest("[data-mute-video]");
      if (muteBtn) toggleMute(muteBtn.dataset.muteVideo, muteBtn);
    });

    // Touch / pointer swipe
    const viewport = els.viewport;

    viewport.addEventListener(
      "touchstart",
      (e) => {
        const t = e.changedTouches[0];
        state.touch.x = t.clientX;
        state.touch.y = t.clientY;
        state.touch.active = true;
      },
      { passive: true },
    );

    viewport.addEventListener(
      "touchend",
      (e) => {
        if (!state.touch.active) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - state.touch.x;
        const dy = t.clientY - state.touch.y;
        state.touch.active = false;
        if (Math.abs(dx) < 30 || Math.abs(dx) < Math.abs(dy) * 0.8) return;
        if (dx < 0) next();
        else prev();
      },
      { passive: true },
    );

    // Mouse drag swipe support
    let pointerDown = false;
    let pointerX = 0;

    viewport.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse") {
        pointerDown = true;
        pointerX = e.clientX;
      }
    });

    viewport.addEventListener("pointerup", (e) => {
      if (e.pointerType === "mouse" && pointerDown) {
        pointerDown = false;
        const dx = e.clientX - pointerX;
        if (Math.abs(dx) > 50) {
          if (dx < 0) next();
          else prev();
        }
      }
    });

    // Controls toggle
    if (els.controlsToggle) {
      els.controlsToggle.addEventListener("click", toggleControls);
    }
  }

  function updateSeemore() {
    const cur = sequence[state.index];
    const seemoreBtn = els.toggleSeemore;
    if (!seemoreBtn) return;

    if (cur && cur.seeMore && cur.seeMore.target) {
      seemoreBtn.classList.remove("hidden");
      seemoreBtn.dataset.openIframe = cur.seeMore.target;
      const label = seemoreBtn.querySelector(".seemore-label");
      if (label) {
        label.textContent = cur.seeMore.label || "See more";
      }
    } else {
      seemoreBtn.classList.add("hidden");
    }
  }

  function toggleControls() {
    state.controlsOpen = !state.controlsOpen;
    els.controlsToggle.classList.toggle("collapsed", !state.controlsOpen);
    els.controlsPanel.classList.toggle("hidden", !state.controlsOpen);
  }

  /* ---------------------------------------------------------------- init --- */
  function init() {
    if (meta.accent) {
      document.documentElement.style.setProperty("--accent", meta.accent);
    }
    if (meta.title) document.title = meta.title + " — Presentation";

    // Show loader
    const loader = document.getElementById("deckLoader");
    const progressBar = loader?.querySelector(".deck-loader__progress-bar");

    buildSlides();
    buildDots();
    updateBrand();
    bindEvents();

    if (!sequence.length) {
      if (loader) loader.classList.add("hidden");
      return;
    }

    // Collect all images that need loading
    const images = Array.from(els.viewport.querySelectorAll("img"));
    const totalImages = images.length;

    if (totalImages === 0) {
      if (loader) loader.classList.add("hidden");
      setAutoplay(cfg.autoplayDefault !== false);
      setLoop(cfg.loopDefault !== false);
      activate(0);
      return;
    }

    let loaded = 0;
    let hasErrors = false;

    function onImageLoad() {
      loaded++;
      updateProgress();
      checkComplete();
    }

    function onImageError(img) {
      loaded++;
      hasErrors = true;
      console.warn("Failed to load image:", img.src);
      updateProgress();
      checkComplete();
    }

    function updateProgress() {
      if (progressBar) {
        const percent = Math.min(Math.round((loaded / totalImages) * 100), 100);
        progressBar.style.width = percent + "%";
        // Update text to show progress
        const textEl = loader?.querySelector(".deck-loader__text");
        if (textEl && loaded < totalImages) {
          textEl.textContent = `Loading presentation… ${percent}%`;
        }
      }
    }

    function checkComplete() {
      if (loaded >= totalImages) {
        // Small delay to ensure UI updates
        setTimeout(finishLoading, 300);
      }
    }

    function finishLoading() {
      if (loader) {
        loader.classList.add("hidden");
        // Remove loader from DOM after fade out
        setTimeout(() => {
          if (loader.parentNode) {
            loader.style.display = "none";
          }
        }, 800);
      }
      setAutoplay(cfg.autoplayDefault !== false);
      setLoop(cfg.loopDefault !== false);
      activate(0);

      if (!state.controlsOpen) {
        els.controlsToggle.classList.add("collapsed");
        els.controlsPanel.classList.add("hidden");
      }
    }

    // Set up load/error handlers for each image
    images.forEach((img) => {
      // Use a more reliable check
      const isLoaded = img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;

      if (isLoaded) {
        // Image is already loaded
        onImageLoad();
      } else {
        // Set up event listeners
        img.addEventListener("load", onImageLoad, { once: true });
        img.addEventListener("error", () => onImageError(img), { once: true });

        // Force a reload if the image is stuck in a pending state
        // This handles cases where the browser reports complete but the image isn't actually loaded
        if (img.complete && img.naturalWidth === 0) {
          // Image failed silently - trigger error handler
          onImageError(img);
        } else {
          // For very large images, check periodically if they've loaded
          let attempts = 0;
          const checkInterval = setInterval(() => {
            attempts++;
            if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
              clearInterval(checkInterval);
              // Remove old listeners to avoid double counting
              img.removeEventListener("load", onImageLoad);
              img.removeEventListener("error", () => onImageError(img));
              onImageLoad();
            } else if (attempts > 50) {
              // Timeout after ~10 seconds (50 * 200ms)
              clearInterval(checkInterval);
              if (!img.complete || img.naturalWidth === 0) {
                onImageError(img);
              }
            }
          }, 200);
        }
      }
    });

    // Safety timeout: force hide loader after 20s even if images are stuck
    const safetyTimeout = setTimeout(() => {
      if (loader && !loader.classList.contains("hidden")) {
        console.warn("Loading timeout — forcing presentation start");
        // Count remaining images as loaded
        const remaining = images.filter((img) => {
          return !(img.complete && img.naturalWidth > 0 && img.naturalHeight > 0);
        });
        if (remaining.length > 0) {
          console.warn(`${remaining.length} images failed to load within timeout`);
          remaining.forEach((img) => {
            console.warn("Failed image:", img.src);
          });
        }
        finishLoading();
      }
    }, 20000);

    // Clean up timeout if loading completes
    const originalFinish = finishLoading;
    finishLoading = function () {
      clearTimeout(safetyTimeout);
      originalFinish.call(this);
    };

    // If we somehow finish before all handlers fire
    if (loaded >= totalImages) {
      finishLoading();
    }
  }

  init();
})();
