/* Inline SVG icon subset — replaces Font Awesome CDN */
const ICONS = {
    "angle-right": '<path d="M9 6l6 6-6 6"/>',
    "arrow-right": '<path d="M5 12h14M13 6l6 6-6 6"/>',
    ban: '<circle cx="12" cy="12" r="9"/><path d="M6 6l12 12"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 10-14h-7l1-6z"/>',
    bomb: '<path d="M14 4l2 2M11 3v2M17 9h2"/><circle cx="10" cy="14" r="6"/>',
    box: '<path d="M3 8l9-4 9 4v10l-9 4-9-4V8z"/><path d="M3 8l9 4 9-4M12 12v10"/>',
    bullseye: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    calculator: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h2M12 12h2M16 12h0M8 16h2M12 16h2M16 16h0"/>',
    "chess-rook": '<path d="M6 20h12M7 20V10l2-2V6h2v2h2V6h2v2l2 2v10M9 14h6"/>',
    "circle-info": '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    comments: '<path d="M5 6h10a3 3 0 013 3v4a3 3 0 01-3 3H10l-4 3v-3H5a3 3 0 01-3-3V9a3 3 0 013-3z"/>',
    compress: '<path d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6"/>',
    crosshairs: '<circle cx="12" cy="12" r="7"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    crown: '<path d="M3 18h18l-1.5-9L15 13l-3-7-3 7L4.5 9 3 18z"/>',
    discord: '<path d="M8.5 9.5a1 1 0 100 2 1 1 0 000-2zm7 0a1 1 0 100 2 1 1 0 000-2z"/><path d="M18.5 6c-1.4-.6-2.8-1-4.3-1.2l-.4.8c-1.4-.2-2.8-.2-4.2 0l-.4-.8C7.7 5 6.3 5.4 5 6 2.8 9.3 2.2 12.5 2.5 15.7c1.5 1.1 3 1.8 4.5 2.2l.9-1.4c-.5-.2-.9-.4-1.3-.7.1-.1.2-.1.3-.2 2.3 1.1 4.8 1.1 7.1 0 .1.1.2.1.3.2-.4.3-.8.5-1.3.7l.9 1.4c1.5-.4 3-1.1 4.5-2.2.4-3.6-.6-6.8-2.9-9.7z"/>',
    dungeon: '<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M9 20v-6h6v6M9 8h.01M15 8h.01M12 12h.01"/>',
    expand: '<path d="M9 3H3v6M15 3h6v6M9 21H3v-6M21 15v6h-6"/>',
    explosion: '<path d="M12 2l1.5 5.5L19 6l-3 4.5L21 13l-5.5.5L17 19l-5-3.5L7 19l1.5-5.5L3 13l5-2.5L5 6l5.5 1.5L12 2z"/>',
    flag: '<path d="M5 21V4m0 0c2 2 4 2 6 0s4-2 6 0v9c-2-2-4-2-6 0s-4 2-6 0"/>',
    flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 001.7 3h10.6a2 2 0 001.7-3l-5-9V3"/>',
    gears: '<circle cx="8" cy="12" r="2.5"/><circle cx="16" cy="8" r="2"/><circle cx="15" cy="16" r="2"/><path d="M8 4v2M8 18v2M3 12h2M13 12h2M16 4.5l1 1.5M13 14.5l1.5 1M18.5 10l1.5-.5"/>',
    "graduation-cap": '<path d="M2 9l10-5 10 5-10 5L2 9z"/><path d="M6 11v5c2 2 10 2 12 0v-5M22 9v6"/>',
    "heart-crack": '<path d="M12 20s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 10c0 5.5-7 10-7 10z"/><path d="M12 8l-1.5 3 2.5 2-2 3"/>',
    helicopter: '<path d="M4 12h10l3 3v2H9l-2-2H4v-3z"/><path d="M3 8h14M12 8V6M8 6h8"/>',
    lightbulb: '<path d="M9 18h6M10 21h4M8 14a5 5 0 117 0c-.8.8-1.2 1.5-1.4 2.5H9.4C9.2 15.5 8.8 14.8 8 14z"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 118 0v3"/>',
    "magnifying-glass": '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4-4"/>',
    map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6z"/><path d="M9 4v14M15 6v14"/>',
    "mountain-sun": '<path d="M3 18l6-8 4 5 2-3 6 6H3z"/><circle cx="17" cy="7" r="2.5"/>',
    "people-group": '<circle cx="9" cy="8" r="2.5"/><circle cx="16" cy="9" r="2"/><path d="M3 19c0-2.5 2.5-4 6-4s6 1.5 6 4M14 15c2.2 0 4.5 1 4.5 3"/>',
    "person-swimming": '<circle cx="16" cy="6" r="2"/><path d="M3 16c2-2 4-2 6 0s4 2 6 0 4-2 6 0M8 12l3-2 3 1 3-2"/>',
    play: '<path d="M8 5v14l11-7L8 5z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    "right-left": '<path d="M7 8h12M15 4l4 4-4 4M17 16H5M9 12l-4 4 4 4"/>',
    rocket: '<path d="M5 15c2 0 5-3 7-7 0 0 3 1 5 3-4 2-7 5-7 7l-3-1-2-2z"/><path d="M9 15l-3 5M12 5l1-2"/>',
    "screwdriver-wrench": '<path d="M14 4l6 6-2 2-6-6V4zM4 20l6-6M10 14l2 2"/>',
    server: '<rect x="4" y="3" width="16" height="6" rx="1"/><rect x="4" y="11" width="16" height="6" rx="1"/><path d="M8 6h.01M8 14h.01"/>',
    "shield-halved": '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M12 3v15"/>',
    ship: '<path d="M3 17l9 3 9-3-2-4H5l-2 4zM6 13V9h12v4M10 9V6h4v3"/>',
    "skull-crossbones": '<circle cx="12" cy="9" r="5"/><path d="M9 9h.01M15 9h.01M10 13l-5 7M14 13l5 7M7 18h10"/>',
    spawn: '<path d="M12 21s7-5 7-11a7 7 0 10-14 0c0 6 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    tank: '<rect x="3" y="11" width="18" height="6" rx="1"/><path d="M6 11V9h8l3 2M5 17v2M19 17v2M8 8h5"/>',
    tree: '<path d="M12 22v-6M8 16l4-10 4 10H8zM9 12l3-6 3 6"/>',
    "triangle-exclamation": '<path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5M12 18h.01"/>',
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4zM7 6H4a2 2 0 002 4M17 6h3a2 2 0 01-2 4"/>',
    truck: '<path d="M3 8h11v9H3zM14 11h5l2 3v3h-7v-6zM6 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM17 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>',
    "truck-monster": '<path d="M3 10h11v7H3zM14 12h4l2 2v3h-6v-5z"/><circle cx="7" cy="19" r="2.5"/><circle cx="17" cy="19" r="2.5"/>',
    users: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2 19c0-3 3-5 7-5s7 2 7 5M15 14c2.5 0 5 1.2 5 3.5"/>',
    "up-right-from-square": '<path d="M14 4h6v6M20 4l-9 9M10 5H5v14h14v-5"/>',
    "wand-magic-sparkles": '<path d="M15 4l5 5M3 21l9-9M16 3l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z"/>',
    "weight-hanging": '<path d="M12 4a2 2 0 110 4 2 2 0 010-4zM8 8h8l2 12H6L8 8z"/>',
    wrench: '<path d="M14.5 6.5a4 4 0 00-5.5 5.5L4 17l3 3 5-5a4 4 0 005.5-5.5L15 12l-2.5-2.5 2-3z"/>',
    xmark: '<path d="M6 6l12 12M18 6L6 18"/>',
    "rotate-left": '<path d="M3 12a9 9 0 109-9"/><path d="M3 5v5h5"/>',
    "rotate-right": '<path d="M21 12a9 9 0 11-9-9"/><path d="M21 5v5h-5"/>'
};

function normalizeName(name) {
    return String(name || "")
        .trim()
        .replace(/^fa[bsr]?\s+/i, "")
        .replace(/^fa-/i, "");
}

/** Inline SVG icon. Pass FA-style ("fa-flag") or bare ("flag") names. */
export function icon(name, extraClass) {
    const key = normalizeName(name);
    const body = ICONS[key];
    if (!body) return "";
    const cls = extraClass ? "icon " + extraClass : "icon";
    return `<svg class="${cls}" viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}
