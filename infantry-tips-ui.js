/** Infantry Hub — After Hours Operators community tips (loaded at runtime). */
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

    function quoteToParagraphs(text) {
        return String(text)
            .split(/\n\n+/)
            .map(function (para) {
                return para.trim();
            })
            .filter(Boolean)
            .map(function (para) {
                return '<p>' + escapeHtml(para) + '</p>';
            })
            .join('');
    }

    function attributionLine(t) {
        const author = t.author != null ? String(t.author).trim() : '';
        const role = t.role != null ? String(t.role).trim() : '';
        if (author && role) {
            return author + ' · ' + role;
        }
        return author || 'Community';
    }

    /** Long or multi-paragraph quotes become expandable tiles. */
    function tipNeedsExpand(quote) {
        const q = String(quote || '').trim();
        if (q.length > 200) {
            return true;
        }
        return /\n\s*\n/.test(q);
    }

    function snippetFromQuote(quote) {
        const q = String(quote || '').trim();
        const first = q.split(/\n\n+/)[0].trim().replace(/\s+/g, ' ');
        const max = 200;
        if (first.length <= max) {
            return first;
        }
        return first.slice(0, max - 1).trim() + '…';
    }

    function render(root, data) {
        const intro = (data && data.intro) || '';
        const discordUrl = (data && data.discordUrl) || 'https://discord.gg/guFSTDfsCb';
        const rawTips = (data && data.tips) || [];
        const tips = rawTips.filter(function (t) {
            return t && String(t.quote || '').trim();
        });

        let html =
            '<div class="inf-tips-callout" role="note">' +
            '<p class="inf-tips-callout-text">' +
            escapeHtml(intro) +
            ' <a href="' +
            escapeHtml(discordUrl) +
            '" class="inf-tips-discord-link" target="_blank" rel="noopener noreferrer">AHO Discord</a>' +
            '</p></div>';

        if (!tips.length) {
            html += '<p class="inf-tips-empty">No tips to show yet. Check back soon.</p>';
        } else {
            html += '<ul class="inf-tips-grid" role="list">';
            tips.forEach(function (t, index) {
                const quote = String(t.quote || '');
                const byline = attributionLine(t);
                const expand = tipNeedsExpand(quote);
                const uid = 'inf-tip-' + index;

                if (!expand) {
                    html +=
                        '<li class="inf-tip-card inf-tip-card--static" role="listitem">' +
                        '<header class="inf-tip-head"><span class="inf-tip-byline">— ' +
                        escapeHtml(byline) +
                        '</span></header>' +
                        '<blockquote class="inf-tip-quote">' +
                        quoteToParagraphs(quote) +
                        '</blockquote></li>';
                    return;
                }

                const snip = snippetFromQuote(quote);
                html +=
                    '<li class="inf-tip-card inf-tip-card--collapsible" role="listitem">' +
                    '<button type="button" class="inf-tip-toggle" id="' +
                    uid +
                    '-btn" aria-expanded="false" aria-controls="' +
                    uid +
                    '-panel">' +
                    '<span class="inf-tip-toggle-text">' +
                    '<span class="inf-tip-byline">— ' +
                    escapeHtml(byline) +
                    '</span>' +
                    '<span class="inf-tip-snippet">' +
                    escapeHtml(snip) +
                    '</span></span>' +
                    '<i class="fas fa-chevron-down inf-tip-chevron" aria-hidden="true"></i></button>' +
                    '<div class="inf-tip-expand-region" id="' +
                    uid +
                    '-panel" role="region" aria-labelledby="' +
                    uid +
                    '-btn">' +
                    '<div class="inf-tip-expand-inner">' +
                    '<blockquote class="inf-tip-quote">' +
                    quoteToParagraphs(quote) +
                    '</blockquote></div></div></li>';
            });
            html += '</ul>';
        }

        root.innerHTML = html;

        root.querySelectorAll('.inf-tip-card--collapsible .inf-tip-toggle').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const card = btn.closest('.inf-tip-card');
                if (!card) {
                    return;
                }
                const next = !card.classList.contains('is-expanded');
                card.classList.toggle('is-expanded', next);
                btn.setAttribute('aria-expanded', next ? 'true' : 'false');
            });
        });
    }

    window.initInfantryTipsHub = function () {
        const root = document.getElementById('infantry-tips-root');
        if (!root || root.getAttribute('data-ready') === '1') {
            return;
        }
        if (root.getAttribute('data-loading') === '1') {
            return;
        }
        root.setAttribute('data-loading', '1');
        root.innerHTML =
            '<p class="inf-tips-loading">Loading tips…</p>';

        fetch('data/infantry-aho-tips.json')
            .then(function (r) {
                return r.json();
            })
            .then(function (data) {
                root.removeAttribute('data-loading');
                root.setAttribute('data-ready', '1');
                render(root, data);
            })
            .catch(function (err) {
                root.removeAttribute('data-loading');
                console.error('Infantry tips hub:', err);
                root.removeAttribute('data-ready');
                root.innerHTML =
                    '<p class="inf-tips-error">Tips couldn’t load. Refresh the page or try again later.</p>';
            });
    };
})();
