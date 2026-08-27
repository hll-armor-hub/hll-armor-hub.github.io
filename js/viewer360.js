/* Shared 360° turntable viewer (8-frame drag / button rotate) */
import { escapeHtml } from "./util.js";
import { icon } from "./icons.js";

export const VIEW360_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

function rootAbsPrefix(prefix) {
    if (!prefix) return "";
    return prefix.charAt(0) === "/" ? prefix : "/" + prefix;
}

export function viewer360HTML(tank, id) {
    if (!tank || !tank.has360View || !tank.images360) return "";
    const prefix = rootAbsPrefix(tank.images360.prefix);
    const suffix = tank.images360.suffix || ".webp";
    const startFrame = 1;
    return `<div class="viewer360" data-viewer="${escapeHtml(String(id))}" data-prefix="${escapeHtml(prefix)}" data-suffix="${escapeHtml(suffix)}" data-frame="${startFrame}">
        <span class="viewer360__angle">${VIEW360_ANGLES[startFrame]}°</span>
        <div class="viewer360__stage" role="img" aria-label="${escapeHtml(tank.name)} 360 degree view">
            <img src="${prefix}${startFrame}${suffix}" alt="${escapeHtml(tank.name)}" draggable="false" loading="lazy" decoding="async">
        </div>
        <span class="viewer360__hint">Drag to rotate</span>
        <div class="viewer360__btns">
            <button type="button" class="viewer360__btn" data-rotate="-1" aria-label="Rotate left">${icon("rotate-left")}</button>
            <button type="button" class="viewer360__btn" data-rotate="1" aria-label="Rotate right">${icon("rotate-right")}</button>
        </div>
    </div>`;
}

function initViewer(viewer) {
    if (viewer.getAttribute("data-inited") === "1") return;
    viewer.setAttribute("data-inited", "1");
    const stage = viewer.querySelector(".viewer360__stage");
    const img = viewer.querySelector("img");
    const angleEl = viewer.querySelector(".viewer360__angle");
    const prefix = viewer.getAttribute("data-prefix");
    const suffix = viewer.getAttribute("data-suffix");
    let frame = parseInt(viewer.getAttribute("data-frame"), 10) || 1;
    let angle = VIEW360_ANGLES[frame];

    function setFrame(n) {
        frame = ((n % 8) + 8) % 8;
        img.src = `${prefix}${frame}${suffix}`;
        angleEl.textContent = VIEW360_ANGLES[frame] + "°";
    }
    function setAngle(a) {
        angle = ((a % 360) + 360) % 360;
        const n = Math.floor(angle / 45) % 8;
        if (n !== frame) setFrame(n);
    }

    viewer.querySelectorAll("[data-rotate]").forEach(function (btn) {
        btn.addEventListener("click", function (e) {
            e.preventDefault();
            setFrame(frame + parseInt(btn.getAttribute("data-rotate"), 10));
            angle = VIEW360_ANGLES[frame];
        });
    });

    let dragging = false, startX = 0, startAngle = 0;
    const sensitivity = 2;
    function down(x) { dragging = true; startX = x; startAngle = angle; stage.classList.add("dragging"); }
    function move(x) { if (!dragging) return; setAngle(startAngle + (x - startX) / sensitivity); }
    function up() { dragging = false; stage.classList.remove("dragging"); }

    stage.addEventListener("mousedown", function (e) { down(e.clientX); });
    window.addEventListener("mousemove", function (e) { move(e.clientX); });
    window.addEventListener("mouseup", up);
    stage.addEventListener("touchstart", function (e) { down(e.touches[0].clientX); }, { passive: true });
    stage.addEventListener("touchmove", function (e) {
        if (dragging) e.preventDefault();
        move(e.touches[0].clientX);
    }, { passive: false });
    stage.addEventListener("touchend", up);
}

export function initViewers(root) {
    const viewers = root.querySelectorAll(".viewer360");
    if (!("IntersectionObserver" in window)) {
        viewers.forEach(initViewer);
        return;
    }
    const io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
            if (!e.isIntersecting) return;
            initViewer(e.target);
            io.unobserve(e.target);
        });
    }, { rootMargin: "120px 0px", threshold: 0.01 });
    viewers.forEach(function (v) { io.observe(v); });
}
