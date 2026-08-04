/* Armor - Gunnery Sights practice (scope pictures + ranging overlays) */
import { getAllWWIITanks, SPA_TANK_TYPE } from "../data.js";
import { escapeHtml } from "../util.js";
import { icon } from "../icons.js";

const FACTIONS = [
    { key: "all", label: "All" },
    { key: "usa", label: "USA" },
    { key: "germany", label: "Germany" },
    { key: "soviet", label: "Soviet" },
    { key: "british", label: "Britain" }
];
const TYPES = [
    { key: "all", label: "All" },
    { key: "heavy", label: "Heavy" },
    { key: "medium", label: "Medium" },
    { key: "light", label: "Light" },
    { key: "recon", label: "Recon" },
    { key: "spa", label: "SPA" }
];

let fFilter = "all", tFilter = "all";

function folderOf(tank) {
    const p = (tank.images360 && tank.images360.prefix) || "";
    return p.replace(/\/+$/, "").split("/").pop();
}
function abs(p) { return p.charAt(0) === "/" ? p : "/" + p; }

function thumbSrc(tank) {
    const folder = folderOf(tank);
    return folder ? abs(`images/360/${folder}/2.webp`) : "";
}

function scopeSrc(tank) {
    if ((tank.type || "").includes("SPA")) return "/images/HLL_Icons/Unsorted/Sights_Scopes/arty_us.png";
    const folder = folderOf(tank);
    return folder ? abs(`images/360/${folder}/8.png`) : "";
}

function overlaySrc(tank) {
    const name = tank.name;
    const type = tank.type || "";
    if (name === "Puma") return "/images/HLL_Icons/pumarananging.png";
    if (name === "Daimler" || name === "Greyhound") return "/images/HLL_Icons/scoutvehicleranging.png";
    if (name === "BA-10 Scout Car") return "/images/HLL_Icons/ba10sight.png";
    if (name === "Tetrarch") return "/images/HLL_Icons/lighttankranging.png";
    if (name === "Luchs") return "/images/HLL_Icons/luchssight.png";
    if (name === "M5A1 Stuart" || name === "M3 Stuart 'Honey'" || name === "T-70") return "/images/HLL_Icons/lighttankranging.png";
    if (type === "Heavy Tank" || type === "Medium Tank") return "/images/HLL_Icons/Heavytankranging.png";
    return "";
}

function factionKey(tank) {
    const f = (tank.faction || "").toLowerCase();
    if (f.includes("soviet")) return "soviet";
    if (f.includes("britain") || f.includes("british")) return "british";
    if (f.includes("germany") || f.includes("german")) return "germany";
    if (f.includes("usa") || f.includes("united states")) return "usa";
    return f;
}
function typeMatch(tank, key) {
    if (key === "all") return true;
    const t = (tank.type || "").toLowerCase();
    if (key === "spa") return t.includes("spa") || t.includes("self propelled");
    if (key === "recon") return t.includes("recon");
    return t.includes(key);
}

function grid() {
    const tanks = getAllWWIITanks().filter(function (t) {
        return (fFilter === "all" || factionKey(t) === fFilter) && typeMatch(t, tFilter) && t.images360;
    });
    if (!tanks.length) return `<p class="result-empty">No tanks match these filters.</p>`;
    return `<div class="grid cols-3" style="--col:160px">` + tanks.map(function (t) {
        return `<button class="sight-thumb glass card-hover" data-sight="${escapeHtml(t.name)}">
            <img src="${thumbSrc(t)}" alt="${escapeHtml(t.name)}" loading="lazy" onerror="this.style.opacity=0.2">
            <span>${escapeHtml(t.name)}</span>
        </button>`;
    }).join("") + `</div>`;
}

export function render() {
    const fb = FACTIONS.map(function (f) { return `<button class="chip ${f.key === fFilter ? "active" : ""}" data-sf="${f.key}">${f.label}</button>`; }).join("");
    const tb = TYPES.map(function (t) { return `<button class="chip ${t.key === tFilter ? "active" : ""}" data-st="${t.key}">${t.label}</button>`; }).join("");
    return `<div class="sights">
        <div class="filter-bar">
            <div class="filter-group" data-g="sf">${fb}</div>
            <span style="width:1px;height:24px;background:var(--hairline);margin:0 .4rem"></span>
            <div class="filter-group" data-g="st">${tb}</div>
        </div>
        <div id="sightGrid">${grid()}</div>
        <div class="scope-modal" id="scopeModal" hidden>
            <div class="scope-modal__inner">
                <button class="scope-modal__close" id="scopeClose" aria-label="Close">${icon("xmark")}</button>
                <h3 id="scopeTitle"></h3>
                <div class="scope-stage" id="scopeStage">
                    <div class="scope-image-container">
                        <img class="scope-white" src="/images/360/backgrounds/White.png" alt="" onerror="this.style.display='none'">
                        <img class="scope-base" id="scopeBase" alt="" loading="lazy" decoding="async">
                        <img class="scope-overlay" id="scopeOverlay" alt="" loading="lazy" decoding="async">
                    </div>
                </div>
                <p class="scope-note">AP rounds only · tested at 1440p / 115 FOV</p>
            </div>
        </div>
    </div>`;
}

export function mount(root) {
    function refreshGrid() {
        root.querySelector("#sightGrid").innerHTML = grid();
        bindThumbs();
    }
    root.querySelectorAll("[data-sf]").forEach(function (b) {
        b.addEventListener("click", function () { fFilter = b.getAttribute("data-sf"); root.querySelectorAll("[data-sf]").forEach(function (x) { x.classList.toggle("active", x === b); }); refreshGrid(); });
    });
    root.querySelectorAll("[data-st]").forEach(function (b) {
        b.addEventListener("click", function () { tFilter = b.getAttribute("data-st"); root.querySelectorAll("[data-st]").forEach(function (x) { x.classList.toggle("active", x === b); }); refreshGrid(); });
    });

    const modal = root.querySelector("#scopeModal");
    const base = root.querySelector("#scopeBase");
    const overlay = root.querySelector("#scopeOverlay");
    const white = root.querySelector(".scope-white");
    const title = root.querySelector("#scopeTitle");

    function open(name) {
        const tank = getAllWWIITanks().find(function (t) { return t.name === name; });
        if (!tank) return;
        title.textContent = tank.name + " - " + (tank.type || "");
        base.src = scopeSrc(tank);
        base.style.display = "";
        const ov = overlaySrc(tank);
        if (ov) {
            overlay.src = ov;
            overlay.style.display = "";
        } else {
            overlay.removeAttribute("src");
            overlay.style.display = "none";
        }
        if (white) white.style.display = "";
        modal.hidden = false;
        document.body.style.overflow = "hidden";
    }
    function close() { modal.hidden = true; document.body.style.overflow = ""; }

    function bindThumbs() {
        root.querySelectorAll("[data-sight]").forEach(function (btn) {
            btn.addEventListener("click", function () { open(btn.getAttribute("data-sight")); });
        });
    }
    bindThumbs();

    root.querySelector("#scopeClose").addEventListener("click", close);
    modal.addEventListener("click", function (e) { if (e.target === modal) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) close(); });
}
