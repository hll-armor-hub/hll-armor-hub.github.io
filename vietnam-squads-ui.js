/**
 * Vietnam Infantry → Squads & equipment: render full US / NVA loadouts from
 * data/HLLV-Vietnam-loadouts-source.md (HLLV Notes), split by ## role headings.
 */
(function () {
    const LOADOUT_SRC = 'data/HLLV-Vietnam-loadouts-source.md';

    function extractBetween(md, startToken, endToken) {
        const i0 = md.indexOf(startToken);
        if (i0 === -1) {
            return '';
        }
        if (!endToken) {
            return md.slice(i0).trim();
        }
        const i1 = md.indexOf(endToken, i0 + startToken.length);
        return i1 === -1 ? md.slice(i0).trim() : md.slice(i0, i1).trim();
    }

    function stripFactionHeading(sectionMd, headingPattern) {
        return sectionMd.replace(headingPattern, '').trim();
    }

    function parseRoleBlocks(sectionMd) {
        if (!sectionMd) {
            return [];
        }
        const parts = sectionMd.split(/^## /m).map(s => s.trim()).filter(Boolean);
        return parts.map(block => {
            const nl = block.indexOf('\n');
            const title = nl === -1 ? block.trim() : block.slice(0, nl).trim();
            const body = nl === -1 ? '' : block.slice(nl + 1).trim();
            return { title, body };
        });
    }

    /** Order of section bands (Commander and similar use "Command"). */
    const SECTION_ORDER = ['Command', 'Infantry', 'Armor', 'Recon', 'Mortar', 'Helicopter', 'Other'];

    function splitRoleTitle(heading) {
        const t = heading.trim();
        const m = t.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
        if (m) {
            return { displayTitle: m[1].trim(), section: m[2].trim() };
        }
        if (/^commander$/i.test(t)) {
            return { displayTitle: t, section: 'Command' };
        }
        return { displayTitle: t, section: 'Other' };
    }

    /**
     * Group roles by parsed section; each group keeps original file order.
     * Section headers follow SECTION_ORDER, then any unknown section tail.
     */
    function groupRolesBySection(roles) {
        const enriched = roles.map((r, idx) => {
            const { displayTitle, section } = splitRoleTitle(r.title);
            return { displayTitle, body: r.body, section, _idx: idx };
        });

        const bySection = new Map();
        for (const row of enriched) {
            if (!bySection.has(row.section)) {
                bySection.set(row.section, []);
            }
            bySection.get(row.section).push(row);
        }

        const seen = new Set();
        const ordered = [];

        for (const sec of SECTION_ORDER) {
            if (bySection.has(sec)) {
                ordered.push({ section: sec, rows: bySection.get(sec) });
                seen.add(sec);
            }
        }

        for (const [sec, rows] of bySection) {
            if (!seen.has(sec)) {
                ordered.push({ section: sec, rows });
            }
        }

        return ordered;
    }

    const MAJOR_SECTION = /^(Weapons|Utility equipment|Role equipment|Lethal equipment):\s*$/i;

    function isMajorSectionLine(line) {
        return MAJOR_SECTION.test(line.trim());
    }

    function isUnlockLine(s) {
        return /^(default unlocked|unlocked role level)/i.test(s.trim());
    }

    function renderListUl(text) {
        const ul = document.createElement('ul');
        ul.className = 'vietnam-loadout-list';
        text
            .split('\n')
            .map(s => s.trim())
            .filter(Boolean)
            .forEach(line => {
                const li = document.createElement('li');
                li.textContent = line;
                ul.appendChild(li);
            });
        return ul;
    }

    function renderListBlock(sectionTitle, blockText) {
        const section = document.createElement('section');
        section.className = 'vietnam-loadout-block';
        const h = document.createElement('h5');
        h.className = 'vietnam-loadout-block-title';
        h.textContent = sectionTitle;
        section.appendChild(h);
        if (blockText.trim()) {
            section.appendChild(renderListUl(blockText));
        }
        return section;
    }

    function renderWeaponsBlock(blockText) {
        const section = document.createElement('section');
        section.className = 'vietnam-loadout-block';
        const h = document.createElement('h5');
        h.className = 'vietnam-loadout-block-title';
        h.textContent = 'Weapons';
        section.appendChild(h);
        const items = document.createElement('div');
        items.className = 'vietnam-loadout-items';

        const chunks = blockText.trim().split(/\n{2,}/);
        for (const chunk of chunks) {
            const lines = chunk
                .split('\n')
                .map(l => l.trim())
                .filter(Boolean);
            if (!lines.length) {
                continue;
            }
            const item = document.createElement('div');
            item.className = 'vietnam-loadout-item';
            const nameEl = document.createElement('div');
            nameEl.className = 'vietnam-loadout-item-name';
            nameEl.textContent = lines[0];
            item.appendChild(nameEl);
            let rest = lines.slice(1);
            if (rest.length && isUnlockLine(rest[rest.length - 1])) {
                const note = rest.pop();
                rest.forEach(meta => {
                    const m = document.createElement('div');
                    m.className = 'vietnam-loadout-item-meta';
                    m.textContent = meta;
                    item.appendChild(m);
                });
                const n = document.createElement('div');
                n.className = 'vietnam-loadout-item-note';
                n.textContent = note;
                item.appendChild(n);
            } else {
                rest.forEach((line, j) => {
                    const el = document.createElement('div');
                    el.className =
                        j === rest.length - 1 && /unlocked|default/i.test(line)
                            ? 'vietnam-loadout-item-note'
                            : 'vietnam-loadout-item-meta';
                    el.textContent = line;
                    item.appendChild(el);
                });
            }
            items.appendChild(item);
        }
        section.appendChild(items);
        return section;
    }

    function renderSubsection(subTitle, blockText) {
        const section = document.createElement('section');
        section.className = 'vietnam-loadout-block vietnam-loadout-block--sub';
        const h = document.createElement('h5');
        h.className = 'vietnam-loadout-block-title vietnam-loadout-block-title--sub';
        h.textContent = subTitle;
        section.appendChild(h);
        const t = blockText.trim();
        if (!t) {
            return section;
        }
        if (/orders/i.test(subTitle)) {
            section.appendChild(renderListUl(t));
        } else {
            const prose = document.createElement('div');
            prose.className = 'vietnam-loadout-prose';
            t.split('\n').forEach(raw => {
                if (!raw.trim()) {
                    return;
                }
                const p = document.createElement('p');
                p.textContent = raw.replace(/\r$/, '');
                prose.appendChild(p);
            });
            section.appendChild(prose);
        }
        return section;
    }

    /**
     * Turn note-style loadout text into structured HTML. Falls back to plain <pre>
     * if the block does not follow the usual Weapons / equipment / ### pattern.
     */
    function buildLoadoutBody(body) {
        const raw = body.replace(/\r\n/g, '\n');
        const lines = raw.split('\n');
        const container = document.createElement('div');
        container.className = 'vietnam-loadout-body vietnam-loadout-body--rich';

        let i = 0;
        let recognized = false;

        while (i < lines.length) {
            const rawLine = lines[i];
            const trimmed = rawLine.trim();
            if (trimmed === '') {
                i++;
                continue;
            }
            if (trimmed.startsWith('### ')) {
                recognized = true;
                const subTitle = trimmed.slice(4).trim();
                i++;
                const buf = [];
                while (i < lines.length) {
                    const L = lines[i];
                    const t = L.trim();
                    if (t.startsWith('### ') || isMajorSectionLine(L)) {
                        break;
                    }
                    buf.push(L);
                    i++;
                }
                container.appendChild(renderSubsection(subTitle, buf.join('\n')));
                continue;
            }
            if (isMajorSectionLine(rawLine)) {
                recognized = true;
                const secTitle = trimmed.replace(/:\s*$/, '');
                i++;
                const buf = [];
                while (i < lines.length) {
                    const L = lines[i];
                    const t = L.trim();
                    if (t.startsWith('### ') || isMajorSectionLine(L)) {
                        break;
                    }
                    buf.push(L);
                    i++;
                }
                const blockText = buf.join('\n').trim();
                if (/^weapons$/i.test(secTitle)) {
                    container.appendChild(renderWeaponsBlock(blockText));
                } else if (blockText) {
                    container.appendChild(renderListBlock(secTitle, blockText));
                } else {
                    container.appendChild(renderListBlock(secTitle, ''));
                }
                continue;
            }
            const buf = [];
            while (i < lines.length) {
                const L = lines[i];
                const t = L.trim();
                if (t.startsWith('### ') || isMajorSectionLine(L)) {
                    break;
                }
                buf.push(L);
                i++;
            }
            if (buf.length) {
                const orphan = document.createElement('pre');
                orphan.className = 'vietnam-loadout-orphan';
                orphan.textContent = buf.join('\n').trim();
                container.appendChild(orphan);
            }
        }

        if (!recognized && raw.trim()) {
            const pre = document.createElement('pre');
            pre.className = 'vietnam-loadout-body';
            pre.textContent = raw;
            return pre;
        }
        if (!container.childNodes.length && raw.trim()) {
            const pre = document.createElement('pre');
            pre.className = 'vietnam-loadout-body';
            pre.textContent = raw;
            return pre;
        }
        return container;
    }

    function renderFactionColumn(title, roles) {
        const col = document.createElement('div');
        col.className = 'vietnam-loadout-faction';

        const h = document.createElement('h3');
        h.className = 'vietnam-loadout-faction-title';
        h.textContent = title;
        col.appendChild(h);

        const groups = groupRolesBySection(roles);
        groups.forEach(({ section, rows }) => {
            const secEl = document.createElement('h4');
            secEl.className = 'vietnam-loadout-section-heading';
            secEl.textContent = section;
            col.appendChild(secEl);

            rows.forEach(({ displayTitle, body }) => {
                const det = document.createElement('details');
                det.className = 'vietnam-loadout-role';

                const sum = document.createElement('summary');
                sum.textContent = displayTitle;
                det.appendChild(sum);

                det.appendChild(buildLoadoutBody(body));

                col.appendChild(det);
            });
        });

        return col;
    }

    window.initVietnamSquadsHub = function initVietnamSquadsHub() {
        const root = document.getElementById('infantry-vietnam-squads-root');
        if (!root || root.dataset.loaded === '1' || root.dataset.loading === '1') {
            return;
        }

        root.dataset.loading = '1';
        root.innerHTML =
            '<p class="vietnam-squad-note" role="status">Loading equipment tables from notes…</p>';

        fetch(LOADOUT_SRC, { cache: 'no-cache' })
            .then(r => {
                if (!r.ok) {
                    throw new Error(String(r.status));
                }
                return r.text();
            })
            .then(md => {
                const usSection = extractBetween(md, '# US', '# NVA');
                const nvaSection = extractBetween(md, '# NVA', null);

                const usBody = stripFactionHeading(usSection, /^#\s*US\s*/m);
                const nvaBody = stripFactionHeading(nvaSection, /^#\s*NVA\s*/m);

                const usRoles = parseRoleBlocks(usBody);
                const nvaRoles = parseRoleBlocks(nvaBody);

                root.innerHTML = '';
                const wrap = document.createElement('div');
                wrap.className = 'infantry-guide-strategies vietnam-squads-two-col';
                wrap.appendChild(renderFactionColumn('United States (US)', usRoles));
                wrap.appendChild(renderFactionColumn('North Vietnamese Army (NVA)', nvaRoles));
                root.appendChild(wrap);

                root.dataset.loaded = '1';
                root.dataset.loading = '0';
            })
            .catch(() => {
                root.dataset.loading = '0';
                root.innerHTML =
                    '<p class="vietnam-squad-note">Could not load <code>data/HLLV-Vietnam-loadouts-source.md</code>. If you are opening the site from disk, use a local web server so fetch works, or host on GitHub Pages.</p>';
            });
    };
})();
