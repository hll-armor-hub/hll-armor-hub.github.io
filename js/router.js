/* Lightweight hash router for the Armor Hub app.
   Hash shape: #/branch/era/section/<extra...>
   Community (default landing): #/community */

/** Legacy v1 section IDs → v2 (hub.html bookmarks) */
const SECTION_ALIASES = {
    "armor/wwii/tactics": "getting-started",
    "armor/wwii/ranging": "calculators",
    "infantry/wwii/classes": "getting-started"
};

function remapSection(branch, era, section) {
    const key = `${branch}/${era}/${section}`;
    return SECTION_ALIASES[key] || section;
}

function parseQuery(raw) {
    const params = new URLSearchParams(raw || "");
    const query = {};
    params.forEach(function (val, key) { query[key] = val; });
    return query;
}

export function parseHash() {
    let raw = (location.hash || "").replace(/^#/, "");
    const qIdx = raw.indexOf("?");
    const pathRaw = qIdx >= 0 ? raw.slice(0, qIdx) : raw;
    const query = parseQuery(qIdx >= 0 ? raw.slice(qIdx + 1) : "");
    const parts = pathRaw.replace(/^\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
    if (parts.length === 0 || parts[0] === "community") {
        return { branch: "community", era: null, section: null, extra: parts.slice(1), query: query };
    }
    const branch = parts[0] || "armor";
    const era = parts[1] || "wwii";
    const section = remapSection(branch, era, parts[2] || "overview");
    return {
        branch: branch,
        era: era,
        section: section,
        extra: parts.slice(3),
        query: query
    };
}

export function buildHash(branch, era, section, extra, query) {
    if (branch === "community") return "#/community";
    let h = `#/${branch}/${era}/${section}`;
    if (extra && extra.length) h += "/" + extra.map(encodeURIComponent).join("/");
    if (query) {
        const params = new URLSearchParams();
        Object.keys(query).forEach(function (key) {
            if (query[key] != null && query[key] !== "") params.set(key, query[key]);
        });
        const qs = params.toString();
        if (qs) h += "?" + qs;
    }
    return h;
}

export function go(branch, era, section, extra) {
    location.hash = buildHash(branch, era, section, extra);
}

export function onRoute(cb) {
    window.addEventListener("hashchange", function () { cb(parseHash()); });
}
