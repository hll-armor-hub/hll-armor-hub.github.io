/**
 * Infantry Hub — Classes: loadout browser by class + toolbar filter (class name or kit text).
 * Data: data/infantry-classes.json, infantry-factions.json, infantry-loadouts.json
 */
(function () {
    'use strict';

    function escapeHtml(s) {
        if (s == null) {
            return '';
        }
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function variantLines(entry, v) {
        const lines = [];
        function guns(arr, prefix) {
            if (!arr || !arr.length) {
                return;
            }
            arr.forEach(function (g) {
                let t = g.name;
                if (g.magazines != null) {
                    t += ' — ' + g.magazines + ' mags';
                }
                if (g.rockets != null) {
                    t += ' — ' + g.rockets + ' rockets';
                }
                lines.push(prefix + ': ' + t);
            });
        }
        guns(v.primary, 'Primary');
        guns(v.secondary, 'Secondary');
        if (v.other && v.other.length) {
            v.other.forEach(function (o) {
                let t = o.name;
                if (o.count != null) {
                    t += ' ×' + o.count;
                }
                if (o.note) {
                    t += ' (' + o.note + ')';
                }
                lines.push(t);
            });
        }
        if (entry.common && entry.common.length) {
            entry.common.forEach(function (c) {
                let t = c.name;
                if (c.count != null) {
                    t += ' ×' + c.count;
                }
                lines.push(t);
            });
        }
        return lines;
    }

    function getLoadoutEntry(loadouts, factionId, classId) {
        for (let i = 0; i < loadouts.length; i++) {
            const e = loadouts[i];
            if (e.factionId === factionId && e.classId === classId) {
                return e;
            }
        }
        return null;
    }

    function buildClassIndex(classesDoc) {
        const byId = Object.create(null);
        classesDoc.categories.forEach(function (cat) {
            cat.classes.forEach(function (c) {
                byId[c.id] = { label: c.label, categoryId: cat.id, categoryLabel: cat.label };
            });
        });
        return byId;
    }

    function buildFlatRows(loadoutsDoc, factionsDoc, classIndex) {
        const factionLabel = Object.create(null);
        factionsDoc.factions.forEach(function (f) {
            factionLabel[f.id] = f.label;
        });
        const rows = [];
        loadoutsDoc.loadouts.forEach(function (entry) {
            const fl = factionLabel[entry.factionId] || entry.factionId;
            const meta = classIndex[entry.classId];
            const classLabel = meta ? meta.label : entry.classLabel || entry.classId;
            const categoryLabel = meta ? meta.categoryLabel : '';
            const vars = entry.variants || [];
            if (!vars.length) {
                rows.push({
                    factionId: entry.factionId,
                    factionLabel: fl,
                    classId: entry.classId,
                    classLabel: classLabel,
                    categoryLabel: categoryLabel,
                    variantId: '_none',
                    variantLabel: '—',
                    unlock: '',
                    lines: [],
                    searchText: (classLabel + ' ' + (entry.dataStatus || '') + ' ' + (entry.note || '')).toLowerCase(),
                    stub: true,
                    entryNote: entry.note || entry.dataAsOfNote || ''
                });
                return;
            }
            vars.forEach(function (v) {
                const lines = variantLines(entry, v);
                const searchText = [
                    fl,
                    classLabel,
                    categoryLabel,
                    v.label,
                    v.unlock || '',
                    lines.join(' '),
                    entry.commonByVariantNote || '',
                    v.placeholderNote || ''
                ]
                    .join(' ')
                    .toLowerCase();
                rows.push({
                    factionId: entry.factionId,
                    factionLabel: fl,
                    classId: entry.classId,
                    classLabel: classLabel,
                    categoryLabel: categoryLabel,
                    variantId: v.id,
                    variantLabel: v.label,
                    unlock: v.unlock || '',
                    lines: lines,
                    searchText: searchText,
                    stub: !!(v.needsVerification && (!v.primary || !v.primary.length) && (!v.other || !v.other.length)),
                    entryNote: v.placeholderNote || ''
                });
            });
        });
        return rows;
    }

    function kitItemClassName(line) {
        const l = String(line).toLowerCase();
        if (l.indexOf('primary:') === 0) {
            return 'inf-kit-item inf-kit-item--primary-slot';
        }
        if (l.indexOf('secondary:') === 0) {
            return 'inf-kit-item inf-kit-item--secondary-slot';
        }
        return 'inf-kit-item';
    }

    function findClassMeta(classesDoc, classId) {
        if (!classId) {
            return null;
        }
        for (let ci = 0; ci < classesDoc.categories.length; ci++) {
            const cat = classesDoc.categories[ci];
            for (let j = 0; j < cat.classes.length; j++) {
                if (cat.classes[j].id === classId) {
                    return cat.classes[j];
                }
            }
        }
        return null;
    }

    function classMatchesFilter(flatRows, factionId, classObj, q) {
        if (!q) {
            return true;
        }
        if (classObj.label.toLowerCase().indexOf(q) !== -1) {
            return true;
        }
        for (let i = 0; i < flatRows.length; i++) {
            const r = flatRows[i];
            if (r.factionId === factionId && r.classId === classObj.id && r.searchText.indexOf(q) !== -1) {
                return true;
            }
        }
        return false;
    }

    function firstVisibleClassWithLoadout(classesDoc, loadoutsDoc, factionId, flatRows, q) {
        for (let ci = 0; ci < classesDoc.categories.length; ci++) {
            const cat = classesDoc.categories[ci];
            for (let j = 0; j < cat.classes.length; j++) {
                const c = cat.classes[j];
                if (!classMatchesFilter(flatRows, factionId, c, q)) {
                    continue;
                }
                const en = getLoadoutEntry(loadoutsDoc.loadouts, factionId, c.id);
                if (en && en.variants && en.variants.length) {
                    return c.id;
                }
            }
        }
        return null;
    }

    function firstVisibleClassAny(classesDoc, factionId, flatRows, q) {
        for (let ci = 0; ci < classesDoc.categories.length; ci++) {
            const cat = classesDoc.categories[ci];
            for (let j = 0; j < cat.classes.length; j++) {
                const c = cat.classes[j];
                if (classMatchesFilter(flatRows, factionId, c, q)) {
                    return c.id;
                }
            }
        }
        return null;
    }

    function mountHub(root, classesDoc, factionsDoc, loadoutsDoc) {
        const classIndex = buildClassIndex(classesDoc);
        const flatRows = buildFlatRows(loadoutsDoc, factionsDoc, classIndex);
        let factionId = 'germany';
        let browseClassId = null;
        let browseVariantId = null;
        let filterQuery = '';

        function firstClassWithData(fid) {
            for (let ci = 0; ci < classesDoc.categories.length; ci++) {
                const cat = classesDoc.categories[ci];
                for (let j = 0; j < cat.classes.length; j++) {
                    const c = cat.classes[j];
                    const en = getLoadoutEntry(loadoutsDoc.loadouts, fid, c.id);
                    if (en && en.variants && en.variants.length) {
                        return c.id;
                    }
                }
            }
            for (let ci = 0; ci < classesDoc.categories.length; ci++) {
                const cat = classesDoc.categories[ci];
                if (cat.classes.length) {
                    return cat.classes[0].id;
                }
            }
            return null;
        }

        function renderBrowse() {
            const panel = root.querySelector('#inf-panel-browse');
            if (!panel) {
                return;
            }
            const fid = factionId;
            const q = filterQuery.trim().toLowerCase();
            let classListHtml = '';
            classesDoc.categories.forEach(function (cat) {
                let catRows = '';
                cat.classes.forEach(function (c) {
                    if (!classMatchesFilter(flatRows, fid, c, q)) {
                        return;
                    }
                    const en = getLoadoutEntry(loadoutsDoc.loadouts, fid, c.id);
                    const has = en && en.variants && en.variants.length;
                    const active = c.id === browseClassId ? ' active' : '';
                    const dim = has ? '' : ' inf-class-row--empty';
                    catRows +=
                        '<button type="button" class="inf-class-row' +
                        active +
                        dim +
                        '" data-class-id="' +
                        escapeHtml(c.id) +
                        '"' +
                        (has ? '' : ' disabled') +
                        '>' +
                        escapeHtml(c.label) +
                        (has ? '' : ' <span class="inf-soon">(soon)</span>') +
                        '</button>';
                });
                if (catRows) {
                    classListHtml += '<div class="inf-cat-label">' + escapeHtml(cat.label) + '</div>' + catRows;
                }
            });
            if (!classListHtml) {
                classListHtml =
                    '<p class="inf-filter-empty">' +
                    (q
                        ? 'No classes match <strong>' + escapeHtml(filterQuery.trim()) + '</strong> for this faction.'
                        : 'No classes to show.') +
                    '</p>';
            }

            let detailHtml = '';
            if (!browseClassId) {
                detailHtml =
                    '<p class="inf-detail-empty">No class matches this filter for this faction. Clear the filter or choose another faction.</p>';
            } else {
            const entry = getLoadoutEntry(loadoutsDoc.loadouts, fid, browseClassId);
            if (!entry) {
                let flabel = fid;
                for (let fi = 0; fi < factionsDoc.factions.length; fi++) {
                    if (factionsDoc.factions[fi].id === fid) {
                        flabel = factionsDoc.factions[fi].label;
                        break;
                    }
                }
                detailHtml =
                    '<p class="inf-detail-empty">No loadout data for <strong>' +
                    escapeHtml(flabel) +
                    '</strong> yet. Try Germany or check back after updates.</p>';
            } else if (!entry.variants || !entry.variants.length) {
                detailHtml =
                    '<p class="inf-detail-empty">' +
                    escapeHtml(entry.classLabel || browseClassId) +
                    ': ' +
                    escapeHtml(entry.note || entry.dataAsOfNote || 'Data not added yet.') +
                    '</p>';
            } else {
                const clsMeta = findClassMeta(classesDoc, browseClassId);
                const classTitle = clsMeta ? clsMeta.label : entry.classLabel || browseClassId;
                let tabs = '';
                entry.variants.forEach(function (v) {
                    const act = v.id === browseVariantId ? ' active' : '';
                    tabs +=
                        '<button type="button" class="inf-variant-tab' +
                        act +
                        '" data-variant-id="' +
                        escapeHtml(v.id) +
                        '">' +
                        escapeHtml(v.label) +
                        '</button>';
                });
                const vcur = entry.variants.find(function (v) {
                    return v.id === browseVariantId;
                });
                const v = vcur || entry.variants[0];
                const lines = variantLines(entry, v);
                let list = '<ul class="inf-kit-list" role="list">';
                lines.forEach(function (line) {
                    list +=
                        '<li class="' +
                        kitItemClassName(line) +
                        '" role="listitem">' +
                        escapeHtml(line) +
                        '</li>';
                });
                list += '</ul>';
                const notes = [];
                if (entry.dataAsOfNote) {
                    notes.push(entry.dataAsOfNote);
                }
                if (entry.commonByVariantNote) {
                    notes.push(entry.commonByVariantNote);
                }
                if (v.placeholderNote) {
                    notes.push(v.placeholderNote);
                }
                let noteHtml = '';
                if (notes.length) {
                    noteHtml =
                        '<p class="inf-kit-note">' +
                        notes.map(function (n) {
                            return escapeHtml(n);
                        }).join(' ') +
                        '</p>';
                }
                if (v.needsVerification) {
                    noteHtml +=
                        '<p class="inf-kit-warn"><i class="fas fa-exclamation-circle"></i> Placeholder / verify in-game.</p>';
                }
                const unlockText = (v.unlock || '').trim();
                detailHtml =
                    '<div class="inf-detail-inner">' +
                    '<header class="inf-detail-head">' +
                    '<div class="inf-detail-head-main">' +
                    '<h3 class="inf-detail-title">' +
                    escapeHtml(classTitle) +
                    '</h3>' +
                    (unlockText
                        ? '<p class="inf-unlock">' + escapeHtml(unlockText) + '</p>'
                        : '') +
                    '</div>' +
                    '<div class="inf-detail-head-tabs">' +
                    '<div class="inf-variant-tabs" role="tablist">' +
                    tabs +
                    '</div></div></header>' +
                    '<div class="inf-kit-section">' +
                    '<div class="inf-kit-section-label">Loadout</div>' +
                    list +
                    '</div>' +
                    (noteHtml ? '<footer class="inf-detail-foot">' + noteHtml + '</footer>' : '') +
                    '</div>';
            }
            }

            panel.innerHTML =
                '<div class="inf-browse-grid">' +
                '<aside class="inf-class-sidebar" aria-label="Classes">' +
                classListHtml +
                '</aside>' +
                '<div class="inf-detail">' +
                detailHtml +
                '</div></div>';

            panel.querySelectorAll('.inf-class-row:not([disabled])').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    browseClassId = btn.getAttribute('data-class-id');
                    const en2 = getLoadoutEntry(loadoutsDoc.loadouts, factionId, browseClassId);
                    browseVariantId =
                        en2 && en2.variants && en2.variants[0] ? en2.variants[0].id : null;
                    renderBrowse();
                });
            });
            panel.querySelectorAll('.inf-variant-tab').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    browseVariantId = btn.getAttribute('data-variant-id');
                    renderBrowse();
                });
            });
        }

        function reconcileSelectionAfterFilter() {
            const q = filterQuery.trim().toLowerCase();
            if (!q) {
                return;
            }
            const meta = findClassMeta(classesDoc, browseClassId);
            if (meta && classMatchesFilter(flatRows, factionId, meta, q)) {
                return;
            }
            let next =
                firstVisibleClassWithLoadout(classesDoc, loadoutsDoc, factionId, flatRows, q) ||
                firstVisibleClassAny(classesDoc, factionId, flatRows, q);
            browseClassId = next;
            const en = getLoadoutEntry(loadoutsDoc.loadouts, factionId, browseClassId);
            browseVariantId = en && en.variants && en.variants[0] ? en.variants[0].id : null;
        }

        root.innerHTML =
            '<div class="inf-toolbar">' +
            '<div class="inf-toolbar-row">' +
            '<label class="inf-faction-label">Faction ' +
            '<select id="inf-faction-select" class="inf-faction-select"></select></label>' +
            '<div class="inf-toolbar-search-wrap">' +
            '<input type="search" id="inf-kit-filter" class="inf-kit-filter" placeholder="Filter by class or gear (satchel, STG, smoke…)" autocomplete="off" aria-label="Filter classes or loadout gear">' +
            '</div></div></div>' +
            '<div id="inf-panel-browse" class="inf-panel"></div>';

        const sel = root.querySelector('#inf-faction-select');
        factionsDoc.factions.forEach(function (f) {
            const opt = document.createElement('option');
            opt.value = f.id;
            opt.textContent = f.label;
            sel.appendChild(opt);
        });
        sel.value = factionId;

        browseClassId = firstClassWithData(factionId);
        const ent0 = getLoadoutEntry(loadoutsDoc.loadouts, factionId, browseClassId);
        browseVariantId = ent0 && ent0.variants && ent0.variants[0] ? ent0.variants[0].id : null;

        renderBrowse();

        sel.addEventListener('change', function () {
            factionId = sel.value;
            browseClassId = firstClassWithData(factionId);
            const en = getLoadoutEntry(loadoutsDoc.loadouts, factionId, browseClassId);
            browseVariantId = en && en.variants && en.variants[0] ? en.variants[0].id : null;
            reconcileSelectionAfterFilter();
            renderBrowse();
        });

        const filterInput = root.querySelector('#inf-kit-filter');
        let filterDebounce = null;
        filterInput.addEventListener('input', function () {
            filterQuery = filterInput.value;
            clearTimeout(filterDebounce);
            filterDebounce = setTimeout(function () {
                reconcileSelectionAfterFilter();
                renderBrowse();
            }, 200);
        });
    }

    window.initInfantryClassesHub = function () {
        const root = document.getElementById('infantry-classes-hub');
        if (!root || root.getAttribute('data-ready') === '1') {
            return;
        }
        if (root.getAttribute('data-loading') === '1') {
            return;
        }
        root.setAttribute('data-loading', '1');
        Promise.all([
            fetch('data/infantry-classes.json').then(function (r) {
                return r.json();
            }),
            fetch('data/infantry-factions.json').then(function (r) {
                return r.json();
            }),
            fetch('data/infantry-loadouts.json').then(function (r) {
                return r.json();
            })
        ])
            .then(function (docs) {
                root.removeAttribute('data-loading');
                root.setAttribute('data-ready', '1');
                mountHub(root, docs[0], docs[1], docs[2]);
            })
            .catch(function (err) {
                root.removeAttribute('data-loading');
                console.error('Infantry classes hub:', err);
                root.removeAttribute('data-ready');
                root.innerHTML =
                    '<p class="inf-loadout-error">Could not load loadout JSON (<code>data/</code>). If you opened the site from disk, use a local server, or confirm files are deployed.</p>';
            });
    };
})();
