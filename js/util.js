/* Small shared helpers for the v2 app */

export function escapeHtml(str) {
    return String(str == null ? "" : str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export function slug(str) {
    return String(str || "").toLowerCase().trim().replace(/['’.]/g, "").replace(/\s+/g, "-");
}

export function youtube(id, start) {
    const s = start ? `?start=${start}` : "";
    return `<div class="video-card glass">
        <div class="video-card__frame">
            <iframe src="https://www.youtube-nocookie.com/embed/${escapeHtml(id)}${s}"
                title="YouTube video" loading="lazy" allowfullscreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
        </div>
    </div>`;
}

export function videoCard(id, title, start) {
    const s = start ? `?start=${start}` : "";
    return `<div class="video-card glass card-hover">
        <div class="video-card__frame">
            <iframe src="https://www.youtube-nocookie.com/embed/${escapeHtml(id)}${s}"
                title="${escapeHtml(title)}" loading="lazy" allowfullscreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
        </div>
        <div class="video-card__body"><h4>${escapeHtml(title)}</h4></div>
    </div>`;
}

/** Parse "Front: 63mm, Sides: 38mm, Rear: 38mm" -> [{k,v}] */
export function parseArmorString(s) {
    if (!s || s === "TBD") return [];
    return String(s).split(",").map(function (part) {
        const bits = part.split(":");
        return { k: (bits[0] || "").trim(), v: (bits[1] || "").trim() };
    });
}

export function debounce(fn, ms) {
    let t;
    return function () {
        const args = arguments, ctx = this;
        clearTimeout(t);
        t = setTimeout(function () { fn.apply(ctx, args); }, ms || 150);
    };
}
