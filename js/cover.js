/* ============================================================
   Armor Hub v2 - Cover interactions
   Preloader, ambient audio, scroll progress, chapter dots,
   kinetic hero title, reveal-on-scroll, stat counters.
   ============================================================ */
(function () {
    "use strict";

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ---------- Kinetic hero title ---------- */
    function buildKineticTitle() {
        var lines = document.querySelectorAll(".hero__title .line");
        lines.forEach(function (line) {
            var text = line.getAttribute("data-text") || line.textContent;
            var delay = parseFloat(line.getAttribute("data-delay") || "0");
            var accent = (line.getAttribute("data-accent") || "").split(",");
            line.textContent = "";
            text.split("").forEach(function (ch, i) {
                if (ch === " ") { line.appendChild(document.createTextNode(" ")); return; }
                var span = document.createElement("span");
                span.className = "ch";
                if (accent.indexOf(String(i)) !== -1) span.classList.add("accent");
                span.textContent = ch;
                span.style.animationDelay = (reduceMotion ? 0 : delay + i * 0.045) + "s";
                line.appendChild(span);
            });
        });
    }

    /* ---------- Preloader ---------- */
    function runPreloader() {
        var body = document.body;
        var bar = document.getElementById("preBar");
        var count = document.getElementById("preCount");
        var status = document.getElementById("preStatus");
        var enter = document.getElementById("preEnter");
        var preloader = document.getElementById("preloader");
        if (!preloader) { body.classList.add("loaded"); return; }

        var phases = ["Booting fire control", "Loading armor tables", "Ranging optics", "Synchronizing crew", "Ready"];
        var pct = 0;
        var done = false;

        function finish() {
            if (done) return;
            done = true;
            body.classList.add("loaded");
            resetScrollUnlessHash();
            startAmbient();
        }

        var timer = setInterval(function () {
            pct += Math.random() * 9 + 3;
            if (pct >= 100) { pct = 100; clearInterval(timer); }
            if (bar) bar.style.width = pct + "%";
            if (count) count.textContent = Math.round(pct);
            if (status) status.textContent = phases[Math.min(phases.length - 1, Math.floor(pct / 22))];
            if (pct >= 100 && enter) {
                enter.classList.add("show");
                if (reduceMotion) finish();
                else setTimeout(finish, 2600); // auto-dismiss if not clicked
            }
        }, 130);

        preloader.addEventListener("click", finish);
    }

    /* ---------- Ambient audio ---------- */
    var ambient = document.getElementById("ambient");
    var audioToggle = document.getElementById("audioToggle");
    var audioWanted = false;

    function startAmbient() {
        if (!ambient) return;
        ambient.volume = 0.0;
        var p = ambient.play();
        if (p && p.then) {
            p.then(function () {
                audioWanted = true;
                fade(ambient, 0.35, 1200);
                if (audioToggle) audioToggle.classList.remove("muted");
            }).catch(function () {
                if (audioToggle) audioToggle.classList.add("muted");
            });
        }
    }
    function fade(el, target, ms) {
        var start = el.volume, t0 = performance.now();
        (function step(now) {
            var k = Math.min(1, (now - t0) / ms);
            el.volume = start + (target - start) * k;
            if (k < 1) requestAnimationFrame(step);
        })(t0);
    }
    if (audioToggle) {
        audioToggle.classList.add("muted");
        audioToggle.addEventListener("click", function () {
            if (!ambient) return;
            if (ambient.paused || ambient.volume < 0.02) {
                ambient.play();
                fade(ambient, 0.35, 600);
                audioToggle.classList.remove("muted");
            } else {
                fade(ambient, 0, 400);
                setTimeout(function () { ambient.pause(); }, 420);
                audioToggle.classList.add("muted");
            }
        });
    }

    /* ---------- Scroll to top on fresh load ---------- */
    function resetScrollUnlessHash() {
        var hash = location.hash;
        if (!hash || hash === "#top") {
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
        }
    }

    if ("scrollRestoration" in history) history.scrollRestoration = "manual";

    /* ---------- Scroll progress + topbar + chapter dots ---------- */
    var progress = document.getElementById("scrollProgress");
    var topbar = document.getElementById("coverTopbar");
    var dots = Array.prototype.slice.call(document.querySelectorAll(".chapter-dots a"));
    var chapters = dots.map(function (d) { return document.querySelector(d.getAttribute("href")); });

    function onScroll() {
        var h = document.documentElement;
        var max = h.scrollHeight - h.clientHeight;
        var p = max > 0 ? (h.scrollTop / max) * 100 : 0;
        if (progress) progress.style.width = p + "%";
        if (topbar) topbar.classList.toggle("solid", h.scrollTop > 40);

        var mid = h.scrollTop + window.innerHeight * 0.4;
        var active = -1;
        chapters.forEach(function (c, i) { if (c && c.offsetTop <= mid) active = i; });
        dots.forEach(function (d, i) { d.classList.toggle("active", i === active); });
    }
    window.addEventListener("scroll", onScroll, { passive: true });

    /* ---------- Reveal on scroll ---------- */
    function initReveal() {
        var els = document.querySelectorAll(".reveal");
        if (reduceMotion || !("IntersectionObserver" in window)) {
            els.forEach(function (el) { el.classList.add("in"); });
            return;
        }
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
            });
        }, { threshold: 0.18, rootMargin: "0px 0px -8% 0px" });
        els.forEach(function (el) { io.observe(el); });
    }

    /* ---------- Stat counters ---------- */
    function initCounters() {
        var nums = document.querySelectorAll("[data-count]");
        if (!("IntersectionObserver" in window)) {
            nums.forEach(function (n) { n.textContent = n.getAttribute("data-count"); });
            return;
        }
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (!e.isIntersecting) return;
                var el = e.target;
                io.unobserve(el);
                var target = parseFloat(el.getAttribute("data-count"));
                var suffix = el.getAttribute("data-suffix") || "";
                if (reduceMotion) { el.textContent = target + suffix; return; }
                var t0 = performance.now(), dur = 1400;
                (function tick(now) {
                    var k = Math.min(1, (now - t0) / dur);
                    var eased = 1 - Math.pow(1 - k, 3);
                    el.textContent = Math.round(target * eased) + suffix;
                    if (k < 1) requestAnimationFrame(tick);
                })(t0);
            });
        }, { threshold: 0.5 });
        nums.forEach(function (n) { io.observe(n); });
    }

    /* ---------- Boot ---------- */
    document.addEventListener("DOMContentLoaded", function () {
        resetScrollUnlessHash();
        buildKineticTitle();
        initReveal();
        initCounters();
        onScroll();
        runPreloader();
    });

    window.addEventListener("load", resetScrollUnlessHash);
    window.addEventListener("pageshow", function (e) {
        if (e.persisted) resetScrollUnlessHash();
    });
})();
