/* ============================================================================
   FABULUS — interaction engine (vanilla, no dependencies)
   preloader · magnetic cursor · split-text · parallax · 3D tilt · spotlight
   scroll progress · grain · reveals · counters · filter · lightbox · forms
   ============================================================================ */
(function () {
  "use strict";

  var root = document.documentElement;
  var body = document.body;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var raf = window.requestAnimationFrame.bind(window);
  var lerp = function (a, b, n) { return (1 - n) * a + n * b; };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* ========================================================================
     0 · Inject global chrome (grain, progress bar, quick-book, cursor)
     ======================================================================== */
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  if (!reduce) body.appendChild(el("div", "grain"));

  var progress = el("div", "scroll-progress");
  body.appendChild(progress);
  // (WhatsApp float lives directly in each page's HTML)

  /* ========================================================================
     1 · COBBLER PRELOADER  (only on the first visit of a browser session)
     ======================================================================== */
  // Decide whether to play the intro. It plays once per session, and never
  // when the visitor prefers reduced motion.
  var seenIntro = reduce;
  try { if (sessionStorage.getItem("fabulus_seen") === "1") seenIntro = true; } catch (e) {}
  try { sessionStorage.setItem("fabulus_seen", "1"); } catch (e) {}

  // SVG of a dress shoe, drawn stroke-by-stroke as the load progresses:
  //   upper · sole · heel · laces · welt-stitch, plus a tapping hammer.
  var SHOE_SVG =
    '<svg class="pl-shoe" viewBox="0 0 240 130" fill="none" aria-hidden="true">' +
      // hammer (taps above the toe while building)
      '<g class="pl-hammer">' +
        '<rect x="150" y="6" width="34" height="10" rx="3" fill="#fff"/>' +
        '<rect x="163" y="14" width="6" height="30" rx="3" fill="#fff"/>' +
      '</g>' +
      // shoe outline paths (JS animates their draw)
      '<path class="pl-draw" d="M42 92 L42 64 C42 49 55 45 74 47 C88 49 94 57 106 57 C133 57 168 65 196 88 L196 92 Z"/>' +
      '<path class="pl-draw" d="M34 92 L200 92 C208 92 208 104 198 104 L45 104 C33 104 27 92 34 92 Z"/>' +
      '<path class="pl-draw" d="M43 104 L62 104 L62 116 L47 116 C42 116 40 109 43 104 Z"/>' +
      '<path class="pl-draw" d="M80 55 L96 64 M88 52 L104 61"/>' +
      // welt stitching (marches once the upper is on)
      '<path class="stitch" d="M50 88 L192 88"/>' +
    '</svg>';

  if (!seenIntro) {
    buildAndRunPreloader();
  } else {
    root.classList.add("loaded");
    raf(function () { raf(triggerSplit); });
  }

  function buildAndRunPreloader() {
    var pre = el("div", "preloader",
      '<div class="pl-inner">' +
        SHOE_SVG +
        '<div class="pl-word">' +
          "FABULUS".split("").map(function (c) { return "<span>" + c + "</span>"; }).join("") +
          '<span class="sp"></span>' +
          "<b>" + "SIZES".split("").map(function (c) { return "<span>" + c + "</span>"; }).join("") + "</b>" +
        "</div>" +
        '<div class="pl-status">Measuring the last…</div>' +
        '<div class="pl-bar"><i></i></div>' +
        '<div class="pl-pct">0%</div>' +
      "</div>");
    var curtain = el("div", "pl-curtain",
      "<span></span><span></span><span></span><span></span><span></span>");
    body.appendChild(pre);
    body.appendChild(curtain);
    body.style.overflow = "hidden";

    pre.querySelectorAll(".pl-word span").forEach(function (s, i) {
      s.style.animationDelay = (0.2 + i * 0.05) + "s";
    });

    var shoe = pre.querySelector(".pl-shoe");
    var bar = pre.querySelector(".pl-bar i");
    var pct = pre.querySelector(".pl-pct");
    var status = pre.querySelector(".pl-status");

    // prepare the outline paths so they can be "drawn" via dashoffset
    var draws = [];
    pre.querySelectorAll(".pl-draw").forEach(function (path) {
      var len = 0;
      try { len = path.getTotalLength(); } catch (e) { len = 400; }
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      draws.push({ path: path, len: len });
    });

    // cobbler status messages, revealed as the shoe comes together
    var stages = [
      [0,  "Measuring the last…"],
      [20, "Cutting the leather…"],
      [42, "Lasting the upper…"],
      [62, "Stitching the welt…"],
      [82, "Burnishing the finish…"],
      [95, "Lacing up…"]
    ];
    var stageIdx = -1;

    var p = 0, loaded = false, start = null, done = false;
    window.addEventListener("load", function () { loaded = true; });

    function finish() {
      if (done) return;
      done = true;
      shoe.classList.add("done");
      curtain.classList.add("lift");
      pre.classList.add("done");
      body.style.overflow = "";
      root.classList.add("loaded");
      triggerSplit();
      setTimeout(function () { pre.remove(); curtain.remove(); }, 900);
    }

    function tick(t) {
      if (!start) start = t;
      var target = loaded ? 100 : 92;
      p = lerp(p, target, 0.055);
      if (p > 99.5 && loaded) p = 100;

      bar.style.width = p + "%";
      pct.textContent = Math.round(p) + "%";

      // draw the shoe in proportion to progress
      for (var i = 0; i < draws.length; i++) {
        draws[i].path.style.strokeDashoffset = draws[i].len * (1 - p / 100);
      }
      // start sewing the welt past the halfway mark
      if (p > 58) shoe.classList.add("sew");

      // advance the cobbler status message
      for (var s = stages.length - 1; s >= 0; s--) {
        if (p >= stages[s][0] && s !== stageIdx) {
          stageIdx = s;
          status.style.opacity = "0";
          (function (txt) {
            setTimeout(function () { status.textContent = txt; status.style.opacity = "1"; }, 160);
          })(stages[s][1]);
          break;
        }
      }

      if (p >= 100) { setTimeout(finish, 260); return; }
      raf(tick);
    }
    raf(tick);
    setTimeout(finish, 5000); // hard safety valve
  }

  /* ========================================================================
     2 · SPLIT-TEXT headings
     ======================================================================== */
  var splitTargets = [];
  function splitInto(node) {
    var kids = Array.prototype.slice.call(node.childNodes);
    node.innerHTML = "";
    var i = 0;
    kids.forEach(function (n) {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach(function (tok) {
          if (tok === "") return;
          if (/^\s+$/.test(tok)) { node.appendChild(document.createTextNode(tok)); return; }
          var s = el("span", "split-word");
          s.textContent = tok;
          s.style.transitionDelay = (i * 0.05) + "s";
          i++;
          node.appendChild(s);
          node.appendChild(document.createTextNode(" "));
        });
      } else if (n.nodeType === 1) {
        if (n.tagName === "BR") { node.appendChild(n); return; } // keep line breaks intact
        n.classList.add("split-word");
        n.style.display = "inline-block";
        n.style.transitionDelay = (i * 0.05) + "s";
        i++;
        node.appendChild(n);
        node.appendChild(document.createTextNode(" "));
      }
    });
  }
  function triggerSplit() {
    splitTargets.forEach(function (n) { n.classList.add("split-ready"); });
  }
  if (!reduce) {
    // Interior page headers only — the Anton home hero keeps its display styling.
    document.querySelectorAll(".page-hero h1").forEach(function (h) {
      splitInto(h);
      splitTargets.push(h);
    });
  }
  // When the intro isn't playing, reveal headings right away; when it is, the
  // preloader's finish() fires triggerSplit as the curtain lifts. A long
  // safety timeout guarantees headings never stay hidden if anything stalls.
  if (seenIntro) { raf(function () { raf(triggerSplit); }); }
  setTimeout(triggerSplit, seenIntro ? 800 : 6000);

  /* ========================================================================
     3 · CUSTOM MAGNETIC CURSOR
     ======================================================================== */
  if (fine && !reduce) {
    body.classList.add("has-cursor");
    var dot = el("div", "cursor-dot");
    var ring = el("div", "cursor-ring");
    body.appendChild(dot);
    body.appendChild(ring);

    var mx = window.innerWidth / 2, my = window.innerHeight / 2;
    var rx = mx, ry = my;
    window.addEventListener("mousemove", function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = "translate(" + mx + "px," + my + "px) translate(-50%,-50%)";
    });
    (function cursorLoop() {
      rx = lerp(rx, mx, 0.18);
      ry = lerp(ry, my, 0.18);
      ring.style.transform = "translate(" + rx + "px," + ry + "px) translate(-50%,-50%)";
      raf(cursorLoop);
    })();

    document.addEventListener("mousedown", function () { ring.classList.add("down"); });
    document.addEventListener("mouseup", function () { ring.classList.remove("down"); });

    var hoverSel = "a, button, .filter-btn, input, select, textarea, .faq-q";
    document.addEventListener("mouseover", function (e) {
      var t = e.target.closest ? e.target.closest(hoverSel + ", [data-lightbox]") : null;
      if (!t) return;
      if (t.hasAttribute("data-lightbox")) ring.classList.add("hover-view");
      else ring.classList.add("hover");
    });
    document.addEventListener("mouseout", function (e) {
      var t = e.target.closest ? e.target.closest(hoverSel + ", [data-lightbox]") : null;
      if (!t) return;
      ring.classList.remove("hover", "hover-view");
    });
    window.addEventListener("mouseleave", function () { dot.style.opacity = ring.style.opacity = "0"; });
    window.addEventListener("mouseenter", function () { dot.style.opacity = ring.style.opacity = "1"; });
  }

  /* ========================================================================
     4 · MAGNETIC BUTTONS
     ======================================================================== */
  if (fine && !reduce) {
    document.querySelectorAll(".btn").forEach(function (btn) {
      var strength = 0.4;
      btn.addEventListener("mousemove", function (e) {
        var r = btn.getBoundingClientRect();
        // full-width buttons stay put so they never nudge past the viewport edge
        if (r.width > window.innerWidth * 0.7) { btn.style.transform = ""; return; }
        var x = (e.clientX - r.left - r.width / 2) * strength;
        var y = (e.clientY - r.top - r.height / 2) * strength;
        btn.style.transform = "translate(" + x + "px," + (y - 3) + "px)";
      });
      btn.addEventListener("mouseleave", function () { btn.style.transform = ""; });
    });
  }

  /* ========================================================================
     5 · 3D TILT cards
     ======================================================================== */
  if (fine && !reduce) {
    document.querySelectorAll(".product, .cat-card").forEach(function (card) {
      card.classList.add("tilt");
      var max = 9;
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform =
          "perspective(800px) rotateY(" + (px * max) + "deg) rotateX(" + (-py * max) +
          "deg) translateY(-6px)";
      });
      card.addEventListener("mouseleave", function () { card.style.transform = ""; });
    });
  }

  /* ========================================================================
     6 · HERO spotlight + PARALLAX
     ======================================================================== */
  var hero = document.querySelector(".hero");
  if (hero && fine && !reduce) {
    hero.addEventListener("mousemove", function (e) {
      var r = hero.getBoundingClientRect();
      hero.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100) + "%");
      hero.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100) + "%");
    });
  }

  var parallaxEls = [];
  var heroArt = document.querySelector(".hero-art");
  if (heroArt && !reduce) parallaxEls.push({ node: heroArt, speed: -0.08 });
  document.querySelectorAll(".split-media img").forEach(function (n) {
    if (!reduce) parallaxEls.push({ node: n, speed: -0.04 });
  });

  /* ========================================================================
     7 · SCROLL: progress bar · parallax · header · to-top · quick-book
     ======================================================================== */
  var header = document.querySelector(".site-header");
  var toTop = document.querySelector(".to-top");
  var quick = document.querySelector(".quick-book");
  var ticking = false;

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
    if (header) header.classList.toggle("scrolled", y > 8);
    if (toTop) toTop.classList.toggle("show", y > 500);
    if (quick) quick.classList.toggle("show", y > 700);

    for (var i = 0; i < parallaxEls.length; i++) {
      var p = parallaxEls[i];
      var r = p.node.getBoundingClientRect();
      var center = r.top + r.height / 2 - window.innerHeight / 2;
      p.node.style.transform = "translate3d(0," + (center * p.speed) + "px,0)";
    }
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { raf(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  if (toTop) toTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  });

  /* ========================================================================
     8 · MOBILE NAV
     ======================================================================== */
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        links.classList.remove("open");
        toggle.classList.remove("open");
      });
    });
  }

  /* ========================================================================
     9 · SCROLL REVEAL (all directions) + staggered children
     ======================================================================== */
  var revealEls = document.querySelectorAll(
    ".reveal, .reveal-left, .reveal-right, .reveal-zoom, .clip-reveal"
  );
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (n) { io.observe(n); });
  } else {
    revealEls.forEach(function (n) { n.classList.add("in"); });
  }
  // auto-add clip reveal to split media for a premium wipe-in
  document.querySelectorAll(".split-media").forEach(function (m) {
    if (!m.classList.contains("reveal")) m.classList.add("clip-reveal");
  });

  /* ========================================================================
     10 · ANIMATED COUNTERS
     ======================================================================== */
  var counters = document.querySelectorAll("[data-count]");
  if ("IntersectionObserver" in window && counters.length) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var n = e.target;
        var target = parseFloat(n.getAttribute("data-count"));
        var suffix = n.getAttribute("data-suffix") || "";
        var dur = 1600, start = null;
        function step(ts) {
          if (!start) start = ts;
          var t = clamp((ts - start) / dur, 0, 1);
          var eased = 1 - Math.pow(1 - t, 3);
          var val = target * eased;
          n.textContent = (target % 1 === 0 ? Math.floor(val) : val.toFixed(1)) + suffix;
          if (t < 1) raf(step); else n.textContent = target + suffix;
        }
        raf(step);
        cio.unobserve(n);
      });
    }, { threshold: 0.5 });
    counters.forEach(function (n) { cio.observe(n); });
  }

  /* ========================================================================
     11 · PRODUCT FILTER (animated)
     ======================================================================== */
  var filterBtns = document.querySelectorAll(".filter-btn");
  var products = document.querySelectorAll(".product[data-cat]");
  if (filterBtns.length) {
    filterBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var f = btn.getAttribute("data-filter");
        filterBtns.forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        products.forEach(function (p, idx) {
          var show = f === "all" || p.getAttribute("data-cat") === f;
          if (show) {
            p.style.display = "";
            p.style.opacity = "0";
            p.style.transform = "translateY(20px)";
            setTimeout(function () {
              p.style.transition = "opacity .5s var(--ease), transform .5s var(--ease)";
              p.style.opacity = "1";
              p.style.transform = "";
            }, (idx % 8) * 40);
          } else {
            p.style.display = "none";
          }
        });
      });
    });
  }

  // support deep-links like shop.html#sandals -> auto-filter
  if (filterBtns.length && location.hash) {
    var want = location.hash.replace("#", "");
    var match = document.querySelector('.filter-btn[data-filter="' + want + '"]');
    if (match) match.click();
  }

  /* ========================================================================
     12 · LIGHTBOX (counter + click-to-zoom + keys + swipe)
     ======================================================================== */
  var lightbox = document.getElementById("lightbox");
  if (lightbox) {
    var lbImg = lightbox.querySelector("img");
    var lbCap = lightbox.querySelector(".lb-caption");
    var counter = el("div", "lb-counter");
    lightbox.appendChild(counter);
    var items = Array.prototype.slice.call(document.querySelectorAll("[data-lightbox]"));
    var current = 0;

    function openAt(i) {
      current = (i + items.length) % items.length;
      var node = items[current];
      var src = node.getAttribute("data-lightbox");
      var cap = node.getAttribute("data-caption") || "";
      lbImg.classList.remove("zoomed");
      lbImg.src = src;
      lbImg.alt = cap;
      lbCap.textContent = cap;
      counter.innerHTML = "<b>" + (current + 1) + "</b> / " + items.length;
      lightbox.classList.add("open");
      body.style.overflow = "hidden";
    }
    function close() { lightbox.classList.remove("open"); body.style.overflow = ""; }

    items.forEach(function (node, i) {
      node.addEventListener("click", function (ev) {
        // don't hijack clicks on real links/buttons inside a card
        if (ev.target.closest("a[href], button")) return;
        openAt(i);
      });
    });
    lightbox.querySelector(".lb-close").addEventListener("click", close);
    lightbox.querySelector(".lb-next").addEventListener("click", function () { openAt(current + 1); });
    lightbox.querySelector(".lb-prev").addEventListener("click", function () { openAt(current - 1); });
    lbImg.addEventListener("click", function (e) { e.stopPropagation(); lbImg.classList.toggle("zoomed"); });
    lightbox.addEventListener("click", function (e) { if (e.target === lightbox) close(); });
    document.addEventListener("keydown", function (e) {
      if (!lightbox.classList.contains("open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") openAt(current + 1);
      if (e.key === "ArrowLeft") openAt(current - 1);
    });
    // swipe on touch
    var sx = 0;
    lightbox.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lightbox.addEventListener("touchend", function (e) {
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) openAt(current + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }

  /* ========================================================================
     13 · FAQ accordion
     ======================================================================== */
  document.querySelectorAll(".faq-q").forEach(function (q) {
    q.addEventListener("click", function () {
      var item = q.closest(".faq-item");
      var ans = item.querySelector(".faq-a");
      var isOpen = item.classList.contains("open");
      document.querySelectorAll(".faq-item.open").forEach(function (o) {
        o.classList.remove("open");
        o.querySelector(".faq-a").style.maxHeight = null;
      });
      if (!isOpen) { item.classList.add("open"); ans.style.maxHeight = ans.scrollHeight + "px"; }
    });
  });

  /* ========================================================================
     14 · CONTACT form validation
     ======================================================================== */
  var form = document.getElementById("contact-form");
  if (form) {
    var success = form.querySelector(".form-success");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var valid = true;
      form.querySelectorAll("[required]").forEach(function (input) {
        var field = input.closest(".field");
        var ok = input.value.trim() !== "";
        if (ok && input.type === "email") ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
        field.classList.toggle("invalid", !ok);
        if (!ok) valid = false;
      });
      if (valid) {
        if (success) {
          success.classList.add("show");
          success.textContent = "Thank you! Your request has been received — our workshop will reach out within one business day.";
        }
        form.querySelectorAll("input, select, textarea").forEach(function (elm) {
          if (elm.type !== "submit") elm.value = "";
        });
        success.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
    form.querySelectorAll("input, select, textarea").forEach(function (elm) {
      elm.addEventListener("input", function () { elm.closest(".field").classList.remove("invalid"); });
    });
  }

  /* ========================================================================
     15 · NEWSLETTER
     ======================================================================== */
  var nl = document.getElementById("newsletter");
  if (nl) {
    nl.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = nl.querySelector("input");
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim())) {
        nl.innerHTML = '<p style="margin:0;color:var(--brass-bright);font-family:var(--serif);font-style:italic;">✓ You\'re on the list. Welcome to Fabulus Sizes.</p>';
      } else { input.style.borderColor = "var(--crimson-soft)"; }
    });
  }

  /* ========================================================================
     16 · NAME THE SHOE — mirror the typed name onto the plate and carry it
     straight into the WhatsApp order message
     ======================================================================== */
  var nameInput = document.getElementById("nameInput");
  var engravedText = document.getElementById("engravedText");
  var engraveCta = document.getElementById("engraveCta");
  var WA_ORDERS = "2348165777546";
  if (nameInput && engravedText && engraveCta) {
    var syncEngraving = function () {
      var v = nameInput.value.trim();
      engravedText.textContent = v.length ? v : "Your Name Here";
      var msg = v.length
        ? 'Hello Fabulus Sizes — I\'d like to order a bespoke pair engraved "' + v + '".'
        : "Hello Fabulus Sizes — I'd like to order a bespoke pair.";
      engraveCta.href = "https://wa.me/" + WA_ORDERS + "?text=" + encodeURIComponent(msg);
    };
    nameInput.addEventListener("input", syncEngraving);
    syncEngraving();
  }

  /* ========================================================================
     17 · CURRENT YEAR
     ======================================================================== */
  document.querySelectorAll("[data-year]").forEach(function (n) {
    n.textContent = new Date().getFullYear();
  });
})();
