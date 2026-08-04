/* Calculator focus mode: minimal chrome for in-game use */
import { buildHash } from "./router.js";
import { escapeHtml } from "./util.js";
import { icon } from "./icons.js";

export function isCalcFocus(route) {
    return !!(route && route.query && route.query.focus);
}

export function exitFocusLink(route) {
    return buildHash(route.branch, route.era, route.section, route.extra);
}

export function enterFocusLink(route, focusVal) {
    return buildHash(route.branch, route.era, route.section, route.extra, { focus: focusVal });
}

export function focusBarHTML(title, exitHref, popoutHash) {
    return `<div class="calc-focus-bar">
        <span class="calc-focus-bar__title">${icon("calculator")} ${escapeHtml(title)}</span>
        <div class="calc-focus-bar__actions">
            <a class="btn btn-ghost btn-sm" href="${exitHref}">${icon("compress")} Exit focus</a>
            <button type="button" class="btn btn-ghost btn-sm" data-focus-popout="${escapeHtml(popoutHash)}" aria-label="Open in new window">${icon("up-right-from-square")} Pop out</button>
        </div>
    </div>`;
}

export function enterFocusBtn(route, focusVal, label) {
    return `<a class="btn btn-ghost btn-sm calc-enter-focus" href="${enterFocusLink(route, focusVal)}" title="${escapeHtml(label)}">${icon("expand")} Focus</a>`;
}

export function bindFocusBar(root) {
    root.querySelectorAll("[data-focus-popout]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const hash = btn.getAttribute("data-focus-popout") || "";
            const path = location.pathname.replace(/[^/]+$/, "app.html");
            window.open(path + hash, "hll-calc", "width=440,height=780,menubar=no,toolbar=no,location=no,status=no");
        });
    });
}

export function distanceField(id, label, bounds, step) {
    return `<div class="dist-field">
        <label class="field-label" for="${id}">${escapeHtml(label)}</label>
        <div class="dist-field__row">
            <button type="button" class="dist-step" data-dist-step="${id}" data-delta="${-step}" aria-label="Decrease by ${step}">−${step}</button>
            <input class="field dist-field__input" id="${id}" type="number" inputmode="numeric" min="${bounds.min}" max="${bounds.max}" step="${step}" placeholder="${bounds.min}–${bounds.max}">
            <button type="button" class="dist-step" data-dist-step="${id}" data-delta="${step}" aria-label="Increase by ${step}">+${step}</button>
        </div>
    </div>`;
}

export function bindDistanceSteppers(root, inputId, bounds, onChange) {
    const input = root.querySelector("#" + inputId);
    if (!input) return;
    root.querySelectorAll('[data-dist-step="' + inputId + '"]').forEach(function (btn) {
        btn.addEventListener("click", function () {
            const delta = Number(btn.getAttribute("data-delta"));
            let v = Number(input.value);
            if (!input.value || isNaN(v)) v = bounds.min;
            v = Math.min(bounds.max, Math.max(bounds.min, v + delta));
            input.value = String(v);
            if (onChange) onChange();
            else input.dispatchEvent(new Event("input", { bubbles: true }));
        });
    });
}

export function historyCollapsible(title, innerHtml, collapsed) {
    return `<details class="calc-history"${collapsed ? "" : " open"}><summary>${escapeHtml(title)}</summary><div class="calc-history__body">${innerHtml}</div></details>`;
}

export function loadPref(key, fallback) {
    try { return localStorage.getItem(key) || fallback; } catch (e) { return fallback; }
}

export function savePref(key, val) {
    try { localStorage.setItem(key, val); } catch (e) { /* ignore */ }
}

export function focusDocumentTitle(toolName) {
    return toolName + " · Armor Hub";
}
