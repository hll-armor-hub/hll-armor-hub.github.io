// Tank Database - Complete list of all tanks in Hell Let Loose

// Game Version Management
let currentGameVersion = 'wwii';
/** @type {'armor' | 'infantry'} */
let currentHub = 'armor';

function formatAppHash(hub, game, section, subRoute) {
    let h = `${hub}/${game}/${section}`;
    if (subRoute) {
        h += `/${subRoute}`;
    }
    return h;
}

/**
 * Parse location hash into hub / game / section / subRoute.
 * Legacy hashes (#tanks, #ranging/spa) resolve as armor/wwii/...
 */
function parseAppHash(hash) {
    if (!hash) {
        return { hub: 'armor', game: 'wwii', section: 'overview', subRoute: null };
    }
    const parts = hash.split('/').filter(Boolean);
    if (parts[0] === 'armor' || parts[0] === 'infantry') {
        const hub = parts[0];
        const g = parts[1];
        if (g !== 'wwii' && g !== 'vietnam') {
            return null;
        }
        const game = g;
        let section = parts[2] || 'overview';
        const subRoute = parts[3] || null;
        if (hub === 'infantry' && game === 'wwii' && (section === 'weapons' || section === 'modes')) {
            section = 'getting-started';
        }
        return { hub, game, section, subRoute };
    }
    const legacySections = ['overview', 'tanks', 'tankulator', 'tactics', 'identification', 'ranging', 'community'];
    const sec = parts[0] || 'overview';
    if (!legacySections.includes(sec)) {
        return null;
    }
    return { hub: 'armor', game: 'wwii', section: sec, subRoute: parts[1] || null };
}

/** Valid `#infantry/vietnam/...` section slugs (hash routing). */
const INFANTRY_VIETNAM_SECTIONS = [
    'overview',
    'getting-started',
    'squads',
    'maps',
    'mortar-squad'
];

/** Valid `#armor/vietnam/...` section slugs (hash routing). */
const ARMOR_VIETNAM_SECTIONS = ['overview', 'tanks'];

const VIETNAM_HERO_ARMOR = {
    title: 'ARMOR HUB',
    tagline: 'Experience the next chapter of Hell Let Loose with Vietnam-era armored warfare',
    videoHeading: 'Newest details on Vietnam',
    iframeTitle: 'Newest details on Vietnam',
    features: [
        { icon: 'fas fa-shield-alt', text: 'Vietnam-Era Tanks' },
        { icon: 'fas fa-map', text: 'Jungle Warfare' },
        { icon: 'fas fa-crosshairs', text: 'New Combat Mechanics' }
    ]
};

const VIETNAM_HERO_INFANTRY = {
    title: 'INFANTRY HUB',
    tagline: 'Experience the next chapter of Hell Let Loose with Vietnam-era infantry combat',
    videoHeading: 'Newest details on Vietnam',
    iframeTitle: 'Newest details on Vietnam',
    features: [
        { icon: 'fas fa-user-friends', text: 'Vietnam-Era Loadouts' },
        { icon: 'fas fa-map', text: 'Jungle Operations' },
        { icon: 'fas fa-users', text: 'Squad Tactics' }
    ]
};

function updateVietnamHeroForHub(hub) {
    const spec = hub === 'infantry' ? VIETNAM_HERO_INFANTRY : VIETNAM_HERO_ARMOR;
    const titleEl = document.querySelector('.vietnam-title');
    const taglineEl = document.querySelector('.vietnam-tagline');
    const videoH = document.querySelector('.vietnam-video-section h3');
    const iframe = document.querySelector('.vietnam-video-wrapper iframe');
    const featureRows = document.querySelectorAll('.vietnam-features .feature');
    if (titleEl) {
        titleEl.textContent = spec.title;
    }
    if (taglineEl) {
        taglineEl.textContent = spec.tagline;
    }
    if (videoH) {
        videoH.textContent = spec.videoHeading;
    }
    if (iframe) {
        iframe.setAttribute('title', spec.iframeTitle);
    }
    featureRows.forEach((row, i) => {
        const f = spec.features[i];
        if (!f) {
            return;
        }
        const icon = row.querySelector('i');
        const span = row.querySelector('span');
        if (icon) {
            icon.className = f.icon;
        }
        if (span) {
            span.textContent = f.text;
        }
    });
}

const VIETNAM_SELECTABLE_THEMES = new Set([
    'theme-default',
    'theme-unhinged',
    'theme-vietnam-usa',
    'theme-vietnam-pavn'
]);

function isVietnamEraActive() {
    return currentGameVersion === 'vietnam' && (currentHub === 'armor' || currentHub === 'infantry');
}

function normalizeStoredVietnamTheme(value) {
    if (value && VIETNAM_SELECTABLE_THEMES.has(value)) {
        return value;
    }
    return 'theme-default';
}

function updateThemeSelectEraVisibility(isVietnam) {
    if (!themeSelect) {
        return;
    }
    themeSelect.querySelectorAll('option[data-theme-era]').forEach(opt => {
        const era = opt.getAttribute('data-theme-era');
        let show = true;
        if (isVietnam) {
            show = era === 'vietnam' || era === 'any';
        } else {
            show = era === 'wwii' || era === 'any';
        }
        opt.hidden = !show;
        opt.disabled = !show;
    });
}

const SPREAD_DEMOCRACY_VOL_KEY = 'spreadDemocracyVol';

function tearDownSpreadDemocracy() {
    const audio = document.getElementById('spreadDemocracyAudio');
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }
    const btn = document.getElementById('spreadDemocracyBtn');
    if (btn) {
        btn.setAttribute('aria-pressed', 'false');
        btn.classList.remove('is-playing');
    }
}

function initSpreadDemocracy() {
    const audio = document.getElementById('spreadDemocracyAudio');
    const btn = document.getElementById('spreadDemocracyBtn');
    const vol = document.getElementById('spreadDemocracyVol');
    if (!audio || !btn) {
        return;
    }
    const rawPath = (audio.dataset.src || './audio/Tunnel Fire.mp3').trim();
    let trackUrl;
    try {
        trackUrl = new URL(rawPath, window.location.href).href;
    } catch {
        trackUrl = rawPath;
    }
    audio.src = trackUrl;
    audio.load();

    const saved = localStorage.getItem(SPREAD_DEMOCRACY_VOL_KEY);
    let v = saved !== null ? parseFloat(saved, 10) : 0.28;
    if (Number.isNaN(v) || v < 0 || v > 1) {
        v = 0.28;
    }
    audio.volume = v;
    if (vol) {
        vol.value = String(v);
    }

    btn.addEventListener('click', () => {
        if (audio.paused) {
            const fromSlider = vol ? parseFloat(vol.value, 10) : 0.28;
            audio.volume = Number.isNaN(fromSlider) ? 0.28 : fromSlider;
            audio.load();
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        btn.setAttribute('aria-pressed', 'true');
                        btn.classList.add('is-playing');
                    })
                    .catch(() => {});
            }
        } else {
            tearDownSpreadDemocracy();
        }
    });

    if (vol) {
        vol.addEventListener('input', () => {
            const n = parseFloat(vol.value, 10);
            if (!Number.isNaN(n)) {
                audio.volume = n;
                localStorage.setItem(SPREAD_DEMOCRACY_VOL_KEY, String(n));
            }
        });
    }

    audio.addEventListener('ended', () => {
        tearDownSpreadDemocracy();
    });
}

function initVietnamLaunchWidget() {
    const widgets = Array.from(document.querySelectorAll('.vietnam-launch-widget'));
    if (widgets.length === 0) {
        return;
    }

    function pad2(n) {
        return String(Math.max(0, n)).padStart(2, '0');
    }

    const tickers = widgets
        .map(root => {
            const iso = (root.getAttribute('data-launch-target') || '').trim();
            const classifiedEl = root.querySelector('.vietnam-launch-widget__classified');
            const countdownEl = root.querySelector('.vietnam-launch-widget__countdown');
            const valueSpans = root.querySelectorAll('.vietnam-launch-widget__unit .vietnam-launch-widget__value');
            if (!countdownEl || valueSpans.length < 4) {
                return null;
            }
            const elD = valueSpans[0];
            const elH = valueSpans[1];
            const elM = valueSpans[2];
            const elS = valueSpans[3];
            if (!iso) {
                return null;
            }
            const targetMs = Date.parse(iso);
            if (Number.isNaN(targetMs)) {
                return null;
            }
            if (classifiedEl) {
                classifiedEl.hidden = true;
            }
            countdownEl.hidden = false;
            return { targetMs, elD, elH, elM, elS };
        })
        .filter(Boolean);

    if (tickers.length === 0) {
        return;
    }

    function tick() {
        tickers.forEach(({ targetMs, elD, elH, elM, elS }) => {
            const ms = targetMs - Date.now();
            if (ms <= 0) {
                elD.textContent = '00';
                elH.textContent = '00';
                elM.textContent = '00';
                elS.textContent = '00';
                return;
            }
            const s = Math.floor(ms / 1000);
            const days = Math.floor(s / 86400);
            const hours = Math.floor((s % 86400) / 3600);
            const mins = Math.floor((s % 3600) / 60);
            const secs = s % 60;
            elD.textContent = days >= 100 ? String(days) : pad2(days);
            elH.textContent = pad2(hours);
            elM.textContent = pad2(mins);
            elS.textContent = pad2(secs);
        });
    }

    tick();
    setInterval(tick, 1000);
}

function resolveSectionDomId(route) {
    if (route.hub === 'infantry' && route.game === 'vietnam') {
        const map = {
            overview: 'infantry-vietnam-overview',
            'getting-started': 'infantry-vietnam-getting-started',
            squads: 'infantry-vietnam-squads',
            maps: 'infantry-vietnam-maps',
            'mortar-squad': 'infantry-vietnam-mortar-squad'
        };
        return map[route.section] || 'infantry-vietnam-overview';
    }
    if (route.hub === 'infantry') {
        const map = {
            overview: 'infantry-overview',
            classes: 'infantry-classes',
            'getting-started': 'infantry-getting-started',
            maps: 'infantry-maps',
            tips: 'infantry-tips'
        };
        return map[route.section] || 'infantry-overview';
    }
    if (route.hub === 'armor' && route.game === 'vietnam') {
        const map = {
            overview: 'vietnam',
            tanks: 'armor-vietnam-tanks'
        };
        return map[route.section] || 'vietnam';
    }
    const armorWwii = ['overview', 'tanks', 'tankulator', 'tactics', 'identification', 'ranging', 'community'];
    if (armorWwii.includes(route.section)) {
        return route.section;
    }
    return 'overview';
}

// Infantry Classes rollout toggle:
// Set to true when Classes tab/content is ready to ship.
const INFANTRY_CLASSES_ENABLED = false;

function applyInfantryClassesVisibility() {
    const classesNavLinks = document.querySelectorAll('a.nav-link[href^="#infantry/"][href$="/classes"]');
    classesNavLinks.forEach(link => {
        const item = link.closest('li');
        const target = item || link;
        target.style.display = INFANTRY_CLASSES_ENABLED ? '' : 'none';
    });

    const classesOverviewCards = document.querySelectorAll(
        'a.infantry-card-classes, a.overview-card[href^="#infantry/"][href$="/classes"]'
    );
    classesOverviewCards.forEach(card => {
        card.style.display = INFANTRY_CLASSES_ENABLED ? '' : 'none';
    });
}

function unmountScopeViewerVisualOnly() {
    const scopeViewer = document.getElementById('scopeViewer');
    if (!scopeViewer || !scopeViewer.classList.contains('active')) {
        return;
    }
    scopeViewer.classList.remove('active');
    const overlayImage = document.querySelector('.scope-overlay-image');
    if (overlayImage) {
        overlayImage.style.display = 'none';
    }
    const whiteBackground = document.getElementById('whiteBackground');
    if (whiteBackground) {
        whiteBackground.style.display = 'none';
    }
}

/**
 * Apply hub, game, section visibility and chrome. Optionally write canonical hash.
 */
function syncViewToRoute(route, { updateHash = false } = {}) {
    currentHub = route.hub;
    currentGameVersion = route.game;

    const navArmor = document.querySelector('.nav-armor-wwii');
    const navArmorVietnam = document.querySelector('.nav-armor-vietnam');
    const navInfantry = document.querySelector('.nav-infantry-wwii');
    const navInfantryVietnam = document.querySelector('.nav-infantry-vietnam');
    if (navArmor) {
        navArmor.style.display = route.hub === 'armor' && route.game === 'wwii' ? '' : 'none';
    }
    if (navArmorVietnam) {
        navArmorVietnam.style.display =
            route.hub === 'armor' && route.game === 'vietnam' ? 'flex' : 'none';
    }
    if (navInfantry) {
        navInfantry.style.display =
            route.hub === 'infantry' && route.game === 'wwii' ? 'flex' : 'none';
        if (route.hub === 'infantry' && route.game === 'wwii') {
            navInfantry.querySelectorAll('.nav-link').forEach(link => {
                const href = link.getAttribute('href');
                if (!href || !href.startsWith('#infantry/')) {
                    return;
                }
                const parts = href.slice(1).split('/');
                if (parts.length >= 3 && parts[0] === 'infantry') {
                    parts[1] = route.game;
                    link.setAttribute('href', `#${parts.join('/')}`);
                }
            });
        }
    }
    applyInfantryClassesVisibility();
    if (navInfantryVietnam) {
        navInfantryVietnam.style.display =
            route.hub === 'infantry' && route.game === 'vietnam' ? 'flex' : 'none';
    }

    const hubArmorBtn = document.querySelector('.hub-switch-btn[data-hub="armor"]');
    const hubInfantryBtn = document.querySelector('.hub-switch-btn[data-hub="infantry"]');
    if (hubArmorBtn && hubInfantryBtn) {
        hubArmorBtn.classList.toggle('active', route.hub === 'armor');
        hubInfantryBtn.classList.toggle('active', route.hub === 'infantry');
        hubArmorBtn.setAttribute('aria-selected', route.hub === 'armor' ? 'true' : 'false');
        hubInfantryBtn.setAttribute('aria-selected', route.hub === 'infantry' ? 'true' : 'false');
    }

    const hubHeaderTitle = document.querySelector('.armor-hub-text');
    if (hubHeaderTitle) {
        hubHeaderTitle.textContent = route.hub === 'infantry' ? 'INFANTRY HUB' : 'ARMOR HUB';
    }

    const eraWwiiBtn = document.querySelector('.game-era-btn[data-version="wwii"]');
    const eraVietnamBtn = document.querySelector('.game-era-btn[data-version="vietnam"]');
    if (eraWwiiBtn && eraVietnamBtn) {
        eraWwiiBtn.classList.toggle('active', route.game === 'wwii');
        eraVietnamBtn.classList.toggle('active', route.game === 'vietnam');
        eraWwiiBtn.setAttribute('aria-selected', route.game === 'wwii' ? 'true' : 'false');
        eraVietnamBtn.setAttribute('aria-selected', route.game === 'vietnam' ? 'true' : 'false');
    }

    const navigation = document.querySelector('.nav');
    const logoContainer = document.querySelector('.logo-container');
    const footer = document.querySelector('.footer');
    const themeSelector = document.querySelector('.theme-selector');
    const allSections = document.querySelectorAll('.section');

    const vietnamEra =
        route.game === 'vietnam' &&
        (route.hub === 'armor' || route.hub === 'infantry');
    if (vietnamEra) {
        document.body.classList.add('vietnam-jungle-theme');
        if (themeSelector) {
            themeSelector.style.display = '';
        }
        const vnTheme = normalizeStoredVietnamTheme(localStorage.getItem('themeVietnam'));
        setTheme(vnTheme, { skipPersist: true });
        updateThemeSelectEraVisibility(true);
        if (navigation) {
            navigation.style.display = 'flex';
        }
        if (logoContainer) {
            logoContainer.style.pointerEvents = 'auto';
            logoContainer.style.opacity = '1';
        }
        if (footer) {
            footer.style.display = 'block';
        }
        updateVietnamHeroForHub(route.hub);
    } else {
        tearDownSpreadDemocracy();
        document.body.classList.remove('vietnam-jungle-theme');
        if (themeSelector) {
            themeSelector.style.display = '';
        }
        const storedWwiiTheme = localStorage.getItem('theme');
        const wwiiTheme = normalizeStoredWwiiTheme(storedWwiiTheme);
        if (storedWwiiTheme !== wwiiTheme) {
            localStorage.setItem('theme', wwiiTheme);
        }
        setTheme(wwiiTheme, { skipPersist: true });
        updateThemeSelectEraVisibility(false);
        if (navigation) {
            navigation.style.display = 'flex';
        }
        if (logoContainer) {
            logoContainer.style.pointerEvents = 'auto';
            logoContainer.style.opacity = '1';
        }
        if (footer) {
            footer.style.display = 'block';
        }
    }

    unmountScopeViewerVisualOnly();
    closeAllExpandedTiles();

    allSections.forEach(section => {
        section.classList.remove('active');
    });

    const domId = resolveSectionDomId(route);
    const targetSection = document.getElementById(domId);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    const canonical = `#${formatAppHash(route.hub, route.game, route.section)}`;
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('href') === canonical) {
            link.classList.add('active');
        }
    });

    if (updateHash) {
        isUpdatingHash = true;
        window.location.hash = formatAppHash(route.hub, route.game, route.section, route.subRoute);
    }

    if (domId === 'identification' && route.hub === 'armor' && route.game === 'wwii') {
        initializePracticeTanks();
        updateHomeImage(currentDifficulty);
    }
    if (domId === 'ranging' && route.hub === 'armor' && route.game === 'wwii') {
        initializeArmorSights();
    }
    if (domId === 'infantry-classes' && route.hub === 'infantry' && route.game === 'wwii') {
        if (typeof window.initInfantryClassesHub === 'function') {
            window.initInfantryClassesHub();
        }
    }
    if (domId === 'infantry-tips' && route.hub === 'infantry' && route.game === 'wwii') {
        if (typeof window.initInfantryTipsHub === 'function') {
            window.initInfantryTipsHub();
        }
    }
    if (domId === 'infantry-vietnam-mortar-squad' && route.hub === 'infantry' && route.game === 'vietnam') {
        scheduleWhenIdle(() => loadVietnamMortarSquadResults());
    }
    if (domId === 'infantry-vietnam-squads' && route.hub === 'infantry' && route.game === 'vietnam') {
        scheduleWhenIdle(() => {
            if (typeof window.initVietnamSquadsHub === 'function') {
                window.initVietnamSquadsHub();
            }
        });
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/** Logo / title click: overview for whichever hub + era is currently active */
function goHubHome() {
    const hub = typeof currentHub !== 'undefined' && currentHub ? currentHub : 'armor';
    const game =
        typeof currentGameVersion !== 'undefined' && currentGameVersion ? currentGameVersion : 'wwii';
    window.location.hash = formatAppHash(hub, game, 'overview');
}

// Simple Comparison Functions
let selectedTank1 = null;
let selectedTank2 = null;

// Cache busting using jekyll build time
let buildVersion = document.querySelector('meta[property="build.version"]').content;
if (buildVersion.startsWith("{{")) {
    buildVersion = new Date().toISOString();
}

function toggleComparisonMode() {
    if (!compareToggle || !comparisonPanel) {
        return;
    }

    comparisonMode = !comparisonMode;
    compareToggle.classList.toggle('active', comparisonMode);

    if (comparisonMode) {
        comparisonPanel.style.display = 'block';
        // Show compare buttons on all tank cards
        showCompareButtons();
    } else {
        comparisonPanel.style.display = 'none';
        // Hide compare buttons and reset selection
        hideCompareButtons();
        resetComparison();
    }
}

function showCompareButtons() {
    const tankCards = document.querySelectorAll('.tank-card');
    tankCards.forEach(card => {
        if (card.dataset.skipCompare === '1') {
            return;
        }
        if (!card.querySelector('.compare-btn')) {
            const compareBtn = document.createElement('button');
            compareBtn.className = 'compare-btn';
            compareBtn.innerHTML = '<i class="fas fa-balance-scale"></i>';
            compareBtn.onclick = (e) => {
                e.stopPropagation();
                selectTankForComparison(card);
            };
            card.appendChild(compareBtn);
        }

        // Check if this tank is currently selected and mark it
        const tankName = card.querySelector('.tank-name').textContent;
        if (selectedTank1 && selectedTank1.name === tankName) {
            card.querySelector('.compare-btn').classList.add('selected');
        } else if (selectedTank2 && selectedTank2.name === tankName) {
            card.querySelector('.compare-btn').classList.add('selected');
        }
    });
}

function hideCompareButtons() {
    const compareBtns = document.querySelectorAll('.compare-btn');
    compareBtns.forEach(btn => btn.remove());
}

function selectTankForComparison(tankCard) {
    const tankName = tankCard.querySelector('.tank-name').textContent;
    const tank = findTankByName(tankName);

    if (!tank) {
        return;
    }

    if (!selectedTank1) {
        // Select first tank
        selectedTank1 = tank;
        updateTankDisplay('tank1', tank);
        tankCard.querySelector('.compare-btn').classList.add('selected');
    } else if (tank === selectedTank1) {
        // Deselect tank 1
        selectedTank1 = null;
        document.getElementById('tank1Name').textContent = 'Select First Tank';
        document.getElementById('tank1Type').textContent = 'Click a tank tile to compare';
        tankCard.querySelector('.compare-btn').classList.remove('selected');
        if (selectedTank2) {
            selectedTank2 = null;
            document.getElementById('tank2Name').textContent = 'Select Second Tank';
            document.getElementById('tank2Type').textContent = 'Click another tank tile to compare';
            document.querySelectorAll('.compare-btn.selected').forEach(btn => btn.classList.remove('selected'));
        }
    } else {
        // Replace tank 2 (or select if none selected)
        if (selectedTank2) {
            // Remove selection from previous tank 2
            const previousTank2Card = findTankCardByName(selectedTank2.name);
            if (previousTank2Card) {
                previousTank2Card.querySelector('.compare-btn').classList.remove('selected');
            }
        }
        selectedTank2 = tank;
        updateTankDisplay('tank2', tank);
        tankCard.querySelector('.compare-btn').classList.add('selected');
        generateComparisonStats();
    }
}

function findTankByName(name) {
    for (const faction in tankDatabase) {
        const tank = tankDatabase[faction].find(t => t.name === name);
        if (tank) return tank;
    }
    return null;
}

function findTankCardByName(name) {
    const tankCards = document.querySelectorAll('.tank-card');
    for (const card of tankCards) {
        const tankName = card.querySelector('.tank-name').textContent;
        if (tankName === name) return card;
    }
    return null;
}

function updateTankDisplay(tankNumber, tank) {
    const nameElement = document.getElementById(tankNumber + 'Name');
    const typeElement = document.getElementById(tankNumber + 'Type');

    if (nameElement && typeElement) {
        nameElement.textContent = tank.name;
        typeElement.textContent = `${tank.type} • ${tank.faction}`;
    }

    // Update comparison stats if both tanks are selected
    if (selectedTank1 && selectedTank2) {
        generateComparisonStats();
    }
}

function generateComparisonStats() {
    const comparisonStats = document.getElementById('comparisonStats');

    if (!selectedTank1 || !selectedTank2) return;

    const tank1Stats = selectedTank1.detailedStats || {};
    const tank2Stats = selectedTank2.detailedStats || {};
    const shotLine1 = formatShotsToKillLine(
        selectedTank1.name,
        selectedTank2.name,
        tank1Stats.apDamage,
        tank1Stats.maxShellsAP,
        tank2Stats.hullHealth
    );
    const shotLine2 = formatShotsToKillLine(
        selectedTank2.name,
        selectedTank1.name,
        tank2Stats.apDamage,
        tank2Stats.maxShellsAP,
        tank1Stats.hullHealth
    );
    const speedOutcome = getHigherIsBetterOutcome(
        selectedTank1.name,
        selectedTank2.name,
        tank1Stats.maxSpeed,
        tank2Stats.maxSpeed,
        'km/h'
    );
    const reloadOutcome = getLowerIsBetterOutcome(
        selectedTank1.name,
        selectedTank2.name,
        tank1Stats.reloadSpeed,
        tank2Stats.reloadSpeed,
        's'
    );

    const stats = [
        {label: 'Hull Health', key: 'hullHealth', unit: ''},
        {label: 'Turret Health', key: 'turretHealth', unit: ''},
        {label: 'Engine Health', key: 'engineHealth', unit: ''},
        {label: 'Track Health', key: 'trackHealth', unit: ''},
        {label: 'AP Damage', key: 'apDamage', unit: ''},
        {label: 'Max Speed', key: 'maxSpeed', unit: ' km/h'},
        {label: 'Reload Speed', key: 'reloadSpeed', unit: 's'},
        {label: 'Yaw Rate', key: 'yawRate', unit: '°/s'},
        {label: 'Pitch Rate', key: 'pitchRate', unit: '°/s'},
        {label: 'Max AP Shells', key: 'maxShellsAP', unit: ''},
        {label: 'Max HE Shells', key: 'maxShellsHE', unit: ''}
    ];

    let statsHTML = `
        <div class="comparison-quick-outcome">
            <h4>Quick Outcome</h4>
            <div class="comparison-quick-outcome-list">
                <div class="comparison-quick-outcome-item">
                    <span class="comparison-quick-outcome-label">Shots to kill</span>
                    <span class="comparison-quick-outcome-value">${shotLine1}</span>
                </div>
                <div class="comparison-quick-outcome-item">
                    <span class="comparison-quick-outcome-label">Shots to kill</span>
                    <span class="comparison-quick-outcome-value">${shotLine2}</span>
                </div>
                <div class="comparison-quick-outcome-item">
                    <span class="comparison-quick-outcome-label">Faster tank (Max Speed)</span>
                    <span class="comparison-quick-outcome-value">${speedOutcome}</span>
                </div>
                <div class="comparison-quick-outcome-item">
                    <span class="comparison-quick-outcome-label">Faster reload</span>
                    <span class="comparison-quick-outcome-value">${reloadOutcome}</span>
                </div>
            </div>
            <p class="comparison-quick-outcome-note">Rough hull HP ÷ AP damage only — U20 armor resistance (% reduction per plate) not applied. See each tank&rsquo;s hull penetration section for pen matchups.</p>
        </div>
        <h4>Detailed Comparison</h4>
        <div class="comparison-stats-grid">
    `;

    stats.forEach(stat => {
        const raw1 = selectedTank1.detailedStats ? selectedTank1.detailedStats[stat.key] : null;
        const raw2 = selectedTank2.detailedStats ? selectedTank2.detailedStats[stat.key] : null;
        const value1 = raw1 !== null && raw1 !== undefined ? raw1 : 'N/A';
        const value2 = raw2 !== null && raw2 !== undefined ? raw2 : 'N/A';

        let difference = '';
        let differenceClass = 'neutral';
        let winner = '';

        if (value1 !== 'N/A' && value2 !== 'N/A') {
            const diff = Number(value1) - Number(value2);
            if (diff > 0) {
                difference = `+${diff}`;
                differenceClass = 'positive';
                winner = 'tank1';
            } else if (diff < 0) {
                difference = `${diff}`;
                differenceClass = 'negative';
                winner = 'tank2';
            } else {
                difference = '0';
                differenceClass = 'neutral';
            }
        }

        statsHTML += `
            <div class="comparison-stat">
                <div class="comparison-stat-label">${stat.label}</div>
                <div class="comparison-stat-values">
                    <div class="comparison-stat-value ${winner === 'tank1' ? 'winner' : ''}">
                        ${value1}${stat.unit}
                    </div>
                    <div class="comparison-stat-difference ${differenceClass}">
                        ${difference}
                    </div>
                    <div class="comparison-stat-value ${winner === 'tank2' ? 'winner' : ''}">
                        ${value2}${stat.unit}
                    </div>
                </div>
            </div>
        `;
    });

    const resLabel = comparisonResourceLabel(selectedTank1, selectedTank2);
    const resDisp1 = getCommanderResourceDisplay(selectedTank1);
    const resDisp2 = getCommanderResourceDisplay(selectedTank2);
    const resNum1 = getCommanderResourceNumeric(selectedTank1);
    const resNum2 = getCommanderResourceNumeric(selectedTank2);
    let resDiff = '';
    let resDiffClass = 'neutral';
    let resWinner = '';
    if (resNum1 !== null && resNum2 !== null && !Number.isNaN(resNum1) && !Number.isNaN(resNum2)) {
        const d = resNum1 - resNum2;
        if (d > 0) {
            resDiff = `+${d}`;
            resDiffClass = 'positive';
            resWinner = 'tank1';
        } else if (d < 0) {
            resDiff = `${d}`;
            resDiffClass = 'negative';
            resWinner = 'tank2';
        } else {
            resDiff = '0';
            resDiffClass = 'neutral';
        }
    }

    statsHTML += `
            <div class="comparison-stat">
                <div class="comparison-stat-label">${resLabel}</div>
                <div class="comparison-stat-values">
                    <div class="comparison-stat-value ${resWinner === 'tank1' ? 'winner' : ''}">
                        ${resDisp1}
                    </div>
                    <div class="comparison-stat-difference ${resDiffClass}">
                        ${resDiff}
                    </div>
                    <div class="comparison-stat-value ${resWinner === 'tank2' ? 'winner' : ''}">
                        ${resDisp2}
                    </div>
                </div>
            </div>
        `;

    statsHTML += '</div>';
    comparisonStats.innerHTML = statsHTML;
}

function formatShotsToKillLine(attackerName, defenderName, attackerDamage, attackerMaxShellsAP, defenderHullHealth) {
    const damage = Number(attackerDamage);
    const maxShellsAP = Number(attackerMaxShellsAP);
    const hullHealth = Number(defenderHullHealth);
    if (
        !Number.isFinite(maxShellsAP) ||
        maxShellsAP <= 0 ||
        !Number.isFinite(damage) ||
        damage <= 0 ||
        !Number.isFinite(hullHealth) ||
        hullHealth <= 0
    ) {
        return `${attackerName} -> ${defenderName}: N/A`;
    }

    const shotsToKill = Math.ceil(hullHealth / damage);
    const shotText = `${shotsToKill} shot${shotsToKill === 1 ? '' : 's'}`;
    return `${attackerName} -> ${defenderName}: <span class="comparison-quick-highlight">${shotText}</span>`;
}

function getHigherIsBetterOutcome(tank1Name, tank2Name, tank1Value, tank2Value, unit) {
    const value1 = Number(tank1Value);
    const value2 = Number(tank2Value);
    if (!Number.isFinite(value1) || !Number.isFinite(value2)) {
        return 'N/A';
    }

    if (value1 === value2) {
        return `Both tanks are the same at <span class="comparison-quick-highlight">${value1}${unit}</span>`;
    }

    if (value1 > value2) {
        return `${tank1Name} (<span class="comparison-quick-highlight">${value1}${unit}</span>)`;
    }

    return `${tank2Name} (<span class="comparison-quick-highlight">${value2}${unit}</span>)`;
}

function getLowerIsBetterOutcome(tank1Name, tank2Name, tank1Value, tank2Value, unit) {
    const value1 = Number(tank1Value);
    const value2 = Number(tank2Value);
    if (!Number.isFinite(value1) || !Number.isFinite(value2)) {
        return 'N/A';
    }

    if (value1 === value2) {
        return `Both tanks reload in <span class="comparison-quick-highlight">${value1}${unit}</span>`;
    }

    if (value1 < value2) {
        return `${tank1Name} (<span class="comparison-quick-highlight">${value1}${unit}</span>)`;
    }

    return `${tank2Name} (<span class="comparison-quick-highlight">${value2}${unit}</span>)`;
}

function resetComparison() {
    selectedTank1 = null;
    selectedTank2 = null;
    document.getElementById('tank1Name').textContent = 'Select First Tank';
    document.getElementById('tank1Type').textContent = 'Click a tank tile to compare';
    document.getElementById('tank2Name').textContent = 'Select Second Tank';
    document.getElementById('tank2Type').textContent = 'Click another tank tile to compare';
    document.getElementById('comparisonStats').innerHTML = '';
}

const SPA_TANK_TYPE = 'SPA (Self Propelled Artillery)';

const SPA_STRENGTHS =
    'Great vehicle for long-range artillery strikes as well as direct breakthrough assaults.';

const SPA_WEAK_SPOTS =
    'Sides have medium armor and the rear has light armor. This vehicle can only fire its main cannon when stopped or in first gear.';

function isSPATank(tank) {
    return tank && tank.type === SPA_TANK_TYPE;
}

function getCommanderResourceNumeric(tank) {
    if (!tank || !tank.detailedStats) return null;
    const ds = tank.detailedStats;
    if (isSPATank(tank)) {
        const v = ds.munitionsCost;
        return v !== null && v !== undefined ? Number(v) : null;
    }
    const v = ds.fuelCost;
    return v !== null && v !== undefined ? Number(v) : null;
}

function getCommanderResourceDisplay(tank) {
    if (!tank || !tank.detailedStats) return 'N/A';
    const ds = tank.detailedStats;
    if (isSPATank(tank)) {
        const v = ds.munitionsCost;
        return v !== null && v !== undefined ? String(v) : 'N/A';
    }
    const v = ds.fuelCost;
    return v !== null && v !== undefined ? String(v) : 'N/A';
}

function comparisonResourceLabel(t1, t2) {
    const s1 = isSPATank(t1);
    const s2 = isSPATank(t2);
    if (s1 && s2) return 'Munitions Cost';
    if (!s1 && !s2) return 'Fuel Cost';
    return 'Fuel / Munitions cost';
}

// Game era segmented control (WWII | Vietnam)
document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.game-era-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const version = btn.getAttribute('data-version');
            if (version) {
                switchGameVersion(version);
            }
        });
    });
});

function switchGameVersion(version) {
    const raw = window.location.hash.substring(1);
    const parsed = parseAppHash(raw);
    const route = parsed || { hub: 'armor', game: 'wwii', section: 'overview', subRoute: null };
    if (version === route.game) {
        return;
    }
    if (route.hub === 'armor') {
        if (version === 'vietnam') {
            const vnArmorSection = ARMOR_VIETNAM_SECTIONS.includes(route.section)
                ? route.section
                : 'overview';
            window.location.hash = formatAppHash('armor', 'vietnam', vnArmorSection);
            return;
        }
        const armorWwii = ['overview', 'tanks', 'tankulator', 'tactics', 'identification', 'ranging', 'community'];
        const section = armorWwii.includes(route.section) ? route.section : 'overview';
        window.location.hash = formatAppHash('armor', version, section);
        return;
    }
    if (route.hub === 'infantry') {
        if (version === 'vietnam') {
            const vnSection = INFANTRY_VIETNAM_SECTIONS.includes(route.section) ? route.section : 'overview';
            window.location.hash = formatAppHash('infantry', 'vietnam', vnSection);
            return;
        }
        const validSections = INFANTRY_CLASSES_ENABLED
            ? ['overview', 'getting-started', 'classes', 'maps', 'tips']
            : ['overview', 'getting-started', 'maps', 'tips'];
        const section = validSections.includes(route.section) ? route.section : 'overview';
        window.location.hash = formatAppHash('infantry', version, section);
    }
}

let tankDatabase = {};
let vietnamTankDatabase = [];
let tankU20Data = null;
let tankDataReady = false;
let tankDataLoadPromise = null;

function loadTankData() {
    if (tankDataReady) {
        return Promise.resolve();
    }
    if (tankDataLoadPromise) {
        return tankDataLoadPromise;
    }
    tankDataLoadPromise = Promise.all([
        fetch('data/tanks-wwii.json').then(function (response) {
            if (!response.ok) {
                throw new Error('Failed to load tanks-wwii.json');
            }
            return response.json();
        }),
        fetch('data/tanks-u20-overrides.json').then(function (response) {
            if (!response.ok) {
                throw new Error('Failed to load tanks-u20-overrides.json');
            }
            return response.json();
        }),
        fetch('data/tanks-vietnam.json').then(function (response) {
            if (!response.ok) {
                throw new Error('Failed to load tanks-vietnam.json');
            }
            return response.json();
        })
    ])
        .then(function (docs) {
            const wwiiDoc = docs[0];
            const u20Doc = docs[1];
            const vietnamDoc = docs[2];
            tankDatabase = wwiiDoc.tanks || {};
            vietnamTankDatabase = vietnamDoc.tanks || [];
            tankU20Data = u20Doc;
            if (typeof window !== 'undefined') {
                window.TANK_U20_DATA = u20Doc;
            }
            applyU20TankData();
            tankDataReady = true;
        })
        .catch(function (err) {
            tankDataLoadPromise = null;
            console.error('Tank data load failed:', err);
            throw err;
        });
    return tankDataLoadPromise;
}

function initializeTankDataViews() {
    displayTanks('all', 'all');
    displayVietnamTanks();
    initializeTankulator();
    initializePracticeTanks();
}

const HULL_PEN_GUN_CLASSES = [
    { key: 'recon', label: 'Recon' },
    { key: 'light', label: 'Light' },
    { key: 'medium', label: 'Medium' },
    { key: 'heavy', label: 'Heavy' }
];

const HULL_PEN_FACE_ORDER = [
    { key: 'front', label: 'Front' },
    { key: 'left', label: 'Left' },
    { key: 'right', label: 'Right' },
    { key: 'rear', label: 'Rear' }
];

function applyU20TankData() {
    const u20 = typeof window !== 'undefined' ? window.TANK_U20_DATA : null;
    if (!u20 || !u20.detailedStats) {
        return;
    }
    Object.values(tankDatabase).forEach(factionTanks => {
        factionTanks.forEach(tank => {
            const patch = u20.detailedStats[tank.name];
            if (!patch) {
                return;
            }
            if (!tank.detailedStats) {
                tank.detailedStats = {};
            }
            Object.assign(tank.detailedStats, patch);
            if (typeof patch.maxSpeed === 'number') {
                tank.speed = `${patch.maxSpeed} km/h`;
            }
        });
    });
}

function cloneHullPenFace(face) {
    return {
        tier: face.tier,
        pen: { ...face.pen },
        note: face.note || ''
    };
}

function getDefaultHullPenProfile(tank) {
    const type = tank.type;
    const allTrue = { recon: true, light: true, medium: true, heavy: true };
    const medUp = { recon: false, light: false, medium: true, heavy: true };
    const lightUp = { recon: false, light: true, medium: true, heavy: true };
    const heavyFront = { recon: false, light: false, medium: false, heavy: true };
    const heavySide = { recon: false, light: false, medium: true, heavy: true };

    if (type === 'Heavy Tank') {
        return {
            front: { tier: 'heavy', pen: { ...heavyFront } },
            left: { tier: 'medium', pen: { ...heavySide } },
            right: { tier: 'medium', pen: { ...heavySide } },
            rear: { tier: 'light', pen: { ...allTrue } }
        };
    }
    if (type === 'Medium Tank') {
        return {
            front: { tier: 'medium', pen: { ...medUp } },
            left: {
                tier: 'light',
                pen: { ...lightUp },
                note: 'U20: side hull weakened — lights can pen.'
            },
            right: {
                tier: 'light',
                pen: { ...lightUp },
                note: 'U20: side hull weakened — lights can pen.'
            },
            rear: { tier: 'light', pen: { ...allTrue } }
        };
    }
    if (type === 'Light Tank') {
        return {
            front: {
                tier: 'light',
                pen: { ...lightUp },
                note: 'U20: light front hull mutual pen (except T-70).'
            },
            left: { tier: 'light', pen: { ...lightUp } },
            right: { tier: 'light', pen: { ...lightUp } },
            rear: { tier: 'light', pen: { ...allTrue } }
        };
    }
    if (type === 'Recon Vehicle') {
        return {
            front: { tier: 'light', pen: { ...lightUp } },
            left: { tier: 'light', pen: { ...lightUp } },
            right: { tier: 'light', pen: { ...lightUp } },
            rear: { tier: 'light', pen: { ...allTrue } }
        };
    }
    if (type === SPA_TANK_TYPE) {
        return {
            front: { tier: 'medium', pen: { ...medUp } },
            left: { tier: 'light', pen: { ...lightUp } },
            right: { tier: 'light', pen: { ...lightUp } },
            rear: { tier: 'light', pen: { ...allTrue } }
        };
    }
    return null;
}

function getHullPenetrationProfile(tank) {
    const u20 = typeof window !== 'undefined' ? window.TANK_U20_DATA : null;
    const defaults = getDefaultHullPenProfile(tank);
    if (!defaults) {
        return null;
    }
    const overrides = u20 && u20.hullPenOverrides ? u20.hullPenOverrides[tank.name] : null;
    if (!overrides) {
        return defaults;
    }
    const profile = {};
    HULL_PEN_FACE_ORDER.forEach(({ key }) => {
        if (overrides[key]) {
            profile[key] = {
                tier: overrides[key].tier || defaults[key].tier,
                pen: { ...defaults[key].pen, ...overrides[key].pen },
                note: overrides[key].note || defaults[key].note || ''
            };
        } else {
            profile[key] = cloneHullPenFace(defaults[key]);
        }
    });
    return profile;
}

function getArmorTierMeta(tierKey) {
    const u20 =
        tankU20Data || (typeof window !== 'undefined' ? window.TANK_U20_DATA : null);
    const tiers = u20 && u20.resistanceTiers ? u20.resistanceTiers : null;
    if (!tiers || !tiers[tierKey]) {
        return { label: 'Plate', percent: null };
    }
    return tiers[tierKey];
}

function getDisplayWeakSpots(tank) {
    return (tank.weakSpots || '').trim();
}

function renderHullPenetrationSection(tank) {
    if (tank.routeGame === 'vietnam') {
        return '';
    }
    const profile = getHullPenetrationProfile(tank);
    if (!profile) {
        return '';
    }

    const matrixRows = HULL_PEN_FACE_ORDER.map(({ key, label }) => {
        const face = profile[key];
        const resistTier = getU20ResistTier(tank, key);
        const tierMeta = getArmorTierMeta(resistTier);
        const tierShort =
            tierMeta.percent != null ? `${tierMeta.percent}%` : escapeHtml(tierMeta.label);
        const cells = HULL_PEN_GUN_CLASSES.map(({ key: gunKey, label: gunLabel }) => {
            const canPen = !!face.pen[gunKey];
            return `<td class="hull-pen-matrix-cell ${canPen ? 'hull-pen-matrix-cell--yes' : 'hull-pen-matrix-cell--no'}" title="${
                canPen
                    ? `${gunLabel} tanks can penetrate this hull face with AP`
                    : `${gunLabel} tanks cannot penetrate this hull face with AP`
            }"><span class="hull-pen-matrix-mark" aria-hidden="true">${canPen ? '✓' : '—'}</span><span class="sr-only">${
                canPen ? 'Can pen' : 'Cannot pen'
            }</span></td>`;
        }).join('');
        return `
            <tr>
                <th scope="row" class="hull-pen-matrix-face">${escapeHtml(label)}</th>
                <td class="hull-pen-matrix-tier">${tierShort}</td>
                ${cells}
            </tr>`;
    }).join('');

    const gunHeaders = HULL_PEN_GUN_CLASSES.map(
        ({ label }) => `<th scope="col" class="hull-pen-matrix-gun">${escapeHtml(label)}</th>`
    ).join('');

    const faceNotes = HULL_PEN_FACE_ORDER.map(({ key, label }) => {
        const note = profile[key] && profile[key].note ? String(profile[key].note).trim() : '';
        if (!note) {
            return '';
        }
        return `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(note)}</li>`;
    })
        .filter(Boolean)
        .join('');

    const notesHtml = faceNotes
        ? `<ul class="hull-pen-matrix-notes">${faceNotes}</ul>`
        : '';

    return `
        <div class="tank-hull-pen-section">
            <div class="hull-pen-head">
                <h3><i class="fas fa-shield-alt" aria-hidden="true"></i> Hull penetration (U20)</h3>
                <div class="hull-pen-legend" aria-hidden="true">
                    <span class="hull-pen-legend-item hull-pen-legend-item--yes">✓ Can pen</span>
                    <span class="hull-pen-legend-item hull-pen-legend-item--no">— Cannot pen</span>
                </div>
            </div>
            <p class="hull-pen-intro">Columns are <strong>attacker tank type</strong> (Recon / Light / Medium / Heavy). Rows are hull faces. ✓ = can penetrate that face with AP.</p>
            <div class="hull-pen-matrix-wrap">
                <table class="hull-pen-matrix">
                    <caption class="sr-only">Hull penetration by attacker tank class and hull face</caption>
                    <thead>
                        <tr>
                            <th scope="col">Hull face</th>
                            <th scope="col">Resist</th>
                            ${gunHeaders}
                        </tr>
                    </thead>
                    <tbody>${matrixRows}</tbody>
                </table>
            </div>
            ${notesHtml}
        </div>`;
}

function getResistanceMultiplier(tierKey) {
    const u20 = tankU20Data || (typeof window !== 'undefined' ? window.TANK_U20_DATA : null);
    const pct = u20 && u20.resistanceTiers && u20.resistanceTiers[tierKey]
        ? u20.resistanceTiers[tierKey].percent
        : null;
    if (typeof pct !== 'number') {
        return 0.92;
    }
    return 1 - pct / 100;
}

/**
 * U20 AP damage reduction by target class + hull face (Update 20 bands).
 * Separate from hull pen profile tier, which describes armor thickness / who can pen.
 * 32% heavy front · 16% medium front & heavy sides · 8% light front, medium sides, all rear.
 */
function getU20ResistTier(targetTank, face) {
    if (!targetTank || targetTank.routeGame === 'vietnam') {
        return 'light';
    }
    if (face === 'rear') {
        return 'light';
    }
    const type = targetTank.type;
    if (type === 'Heavy Tank') {
        return face === 'front' ? 'heavy' : 'medium';
    }
    if (type === 'Medium Tank') {
        return face === 'front' ? 'medium' : 'light';
    }
    if (type === SPA_TANK_TYPE) {
        return face === 'front' ? 'medium' : 'light';
    }
    return 'light';
}

function getTankulatorModifier(targetTank, face, apDamage) {
    const resistTier = getU20ResistTier(targetTank, face);
    const modifier = getResistanceMultiplier(resistTier);
    const tierMeta = getArmorTierMeta(resistTier);
    const label =
        tierMeta.percent != null ? `−${tierMeta.percent}% resist` : tierMeta.label;
    const effectiveDamage =
        Number.isFinite(Number(apDamage)) && Number(apDamage) > 0
            ? Math.max(1, Math.round(Number(apDamage) * modifier))
            : null;
    return { tier: resistTier, modifier, label, effectiveDamage };
}

function getTankulatorClassKey(attackerTank) {
    if (!attackerTank) return 'recon';
    if (attackerTank.type === 'Heavy Tank') return 'heavy';
    if (attackerTank.type === 'Medium Tank') return 'medium';
    if (attackerTank.type === 'Light Tank') return 'light';
    return 'recon';
}

const TANKULATOR_PRESETS = [
    {
        label: 'Tiger vs Jumbo (front)',
        attacker: 'Tiger I',
        target: 'Sherman 76 Jumbo',
        face: 'front'
    },
    {
        label: 'Panther vs Sherman',
        attacker: 'Panther',
        target: 'M4 Sherman',
        face: 'front'
    },
    {
        label: 'Firefly vs Panther',
        attacker: 'Sherman Firefly',
        target: 'Panther',
        face: 'front'
    },
    {
        label: 'IS-1 vs Tiger',
        attacker: 'IS-1',
        target: 'Tiger I',
        face: 'front'
    },
    {
        label: 'Tiger vs Panther (side)',
        attacker: 'Tiger I',
        target: 'Panther',
        face: 'left'
    },
    {
        label: 'Panzer IV vs Stuart',
        attacker: 'Panzer IV',
        target: 'M5A1 Stuart',
        face: 'front'
    }
];

function collectTankulatorTanks() {
    return Object.values(tankDatabase)
        .flat()
        .filter(t => t.routeGame !== 'vietnam' && t.detailedStats && Number.isFinite(Number(t.detailedStats.apDamage)))
        .sort((a, b) => a.name.localeCompare(b.name));
}

function applyTankulatorPreset(preset) {
    const attackerSelect = document.getElementById('tankulatorAttacker');
    const targetSelect = document.getElementById('tankulatorTarget');
    const faceSelect = document.getElementById('tankulatorHitFace');
    if (!attackerSelect || !targetSelect || !faceSelect || !preset) {
        return;
    }
    if ([...attackerSelect.options].some(opt => opt.value === preset.attacker)) {
        attackerSelect.value = preset.attacker;
    }
    if ([...targetSelect.options].some(opt => opt.value === preset.target)) {
        targetSelect.value = preset.target;
    }
    if ([...faceSelect.options].some(opt => opt.value === preset.face)) {
        faceSelect.value = preset.face;
    }
    runTankulatorSimulation();
}

function renderTankulatorPresets() {
    const container = document.getElementById('tankulatorPresetList');
    if (!container) {
        return;
    }
    container.innerHTML = TANKULATOR_PRESETS.map(
        (preset, index) =>
            `<button type="button" class="tankulator-preset-btn" data-preset-index="${index}">${escapeHtml(
                preset.label
            )}</button>`
    ).join('');
    container.querySelectorAll('.tankulator-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = Number.parseInt(btn.getAttribute('data-preset-index'), 10);
            applyTankulatorPreset(TANKULATOR_PRESETS[index]);
        });
    });
}

function renderTankulatorOptions(selectEl, tanks) {
    if (!selectEl) return;
    selectEl.innerHTML = tanks
        .map(t => `<option value="${escapeHtml(t.name)}">${escapeHtml(t.name)} (${escapeHtml(t.type)})</option>`)
        .join('');
}

function simulateComponentPool(poolHp, effectiveDamage, canPen, maxShots) {
    if (!Number.isFinite(poolHp) || poolHp <= 0) {
        return null;
    }

    let remaining = poolHp;
    let depletedOnShot = null;
    const shotResults = [];

    for (let i = 1; i <= maxShots; i += 1) {
        const hpBefore = remaining;
        const dealt = canPen && remaining > 0 ? Math.min(remaining, effectiveDamage) : 0;
        remaining = Math.max(0, remaining - dealt);
        if (remaining === 0 && depletedOnShot == null && canPen) {
            depletedOnShot = i;
        }
        shotResults.push({ shot: i, dealt, remaining, hpBefore });
    }

    const shotsToDeplete = canPen && effectiveDamage > 0 ? Math.ceil(poolHp / effectiveDamage) : null;

    return {
        poolHp,
        depletedOnShot,
        shotsToDeplete,
        shotResults
    };
}

function simulateTankulatorFace(attacker, target, face, maxShots) {
    const apDamage = Number(attacker.detailedStats?.apDamage || 0);
    const hullHp = Number(target.detailedStats?.hullHealth || 0);
    const turretHp = Number(target.detailedStats?.turretHealth || 0);
    const engineHp = Number(target.detailedStats?.engineHealth || 0);
    const classKey = getTankulatorClassKey(attacker);
    const profile = getHullPenetrationProfile(target);
    const faceData = profile && profile[face] ? profile[face] : null;
    const canPen = !!(faceData && faceData.pen && faceData.pen[classKey]);
    const modMeta = getTankulatorModifier(target, face, apDamage);
    const effectiveDamage = canPen ? modMeta.effectiveDamage || 0 : 0;
    const hullSim = simulateComponentPool(hullHp, effectiveDamage, canPen, maxShots);

    return {
        apDamage,
        hullHp,
        turretHp,
        engineHp,
        canPen,
        modMeta,
        effectiveDamage,
        killedOnShot: hullSim ? hullSim.depletedOnShot : null,
        shotsToKill: hullSim ? hullSim.shotsToDeplete : null,
        shotResults: hullSim ? hullSim.shotResults : [],
        turret:
            turretHp > 0
                ? simulateComponentPool(turretHp, effectiveDamage, canPen, maxShots)
                : null,
        engine:
            face === 'rear' && engineHp > 0
                ? simulateComponentPool(engineHp, effectiveDamage, canPen, maxShots)
                : null
    };
}

function renderTankulatorComponentBar(config) {
    const {
        scenarioLabel,
        title,
        poolHp,
        componentSim,
        canPen,
        markerClass = '',
        fillVariants = {},
        legend
    } = config;

    if (!poolHp || !canPen || !componentSim) {
        return '';
    }

    const markers = componentSim.shotResults
        .filter(shot => shot.dealt > 0 || shot.shot === 1)
        .map(shot => {
            const pct = Math.max(0, Math.min(100, (shot.remaining / poolHp) * 100));
            const isEvent = componentSim.depletedOnShot === shot.shot;
            const markerType = isEvent ? markerClass : '';
            return `<span class="tankulator-hp-marker ${markerType}" style="left: ${pct}%" title="After shot ${shot.shot}: ${shot.remaining} HP"><span class="tankulator-hp-marker-label">${shot.shot}</span></span>`;
        })
        .join('');

    const finalRemaining = componentSim.shotResults[componentSim.shotResults.length - 1]?.remaining ?? poolHp;
    const fillPct = Math.max(0, Math.min(100, (finalRemaining / poolHp) * 100));
    const fillClass =
        finalRemaining === 0
            ? fillVariants.dead || 'tankulator-hp-fill--dead'
            : fillPct <= 25
              ? fillVariants.critical || 'tankulator-hp-fill--critical'
              : fillVariants.alive || 'tankulator-hp-fill--alive';

    return `
        <div class="tankulator-hp-bar ${config.barClass || ''}">
            <div class="tankulator-hp-bar-head">
                <div class="tankulator-hp-bar-head-left">
                    <span class="tankulator-hp-scenario">${escapeHtml(scenarioLabel)}</span>
                    <span class="tankulator-hp-bar-title">${escapeHtml(title)}</span>
                </div>
                <span class="tankulator-hp-bar-value">${finalRemaining} / ${poolHp}</span>
            </div>
            <div class="tankulator-hp-track" role="img" aria-label="${escapeHtml(scenarioLabel)} ${escapeHtml(title)} after each shot">
                <div class="tankulator-hp-fill ${fillClass}" style="width: ${fillPct}%"></div>
                ${markers}
            </div>
            <p class="tankulator-hp-legend">${escapeHtml(legend)}</p>
        </div>`;
}

function renderTankulatorComponentBars(result, face) {
    const el = document.getElementById('tankulatorComponentBars');
    if (!el) {
        return;
    }

    if (!result.hullHp || !result.canPen) {
        el.innerHTML = '';
        el.hidden = true;
        return;
    }

    el.hidden = false;

    const bars = [
        renderTankulatorComponentBar({
            scenarioLabel: 'If hull shot',
            title: 'Hull HP',
            poolHp: result.hullHp,
            componentSim: {
                depletedOnShot: result.killedOnShot,
                shotResults: result.shotResults
            },
            canPen: result.canPen,
            markerClass: 'tankulator-hp-marker--kill',
            legend:
                result.killedOnShot != null
                    ? `Hull destroyed on shot ${result.killedOnShot}.`
                    : 'Depleting hull HP destroys the vehicle.'
        }),
        renderTankulatorComponentBar({
            scenarioLabel: 'If turret shot',
            title: 'Turret HP',
            barClass: 'tankulator-hp-bar--turret',
            poolHp: result.turretHp,
            componentSim: result.turret,
            canPen: result.canPen && !!result.turret,
            markerClass: 'tankulator-hp-marker--knock',
            fillVariants: {
                alive: 'tankulator-hp-fill--turret',
                critical: 'tankulator-hp-fill--turret-critical',
                dead: 'tankulator-hp-fill--turret-dead'
            },
            legend:
                result.turret?.depletedOnShot != null
                    ? `Turret knocked on shot ${result.turret.depletedOnShot} — slower rotation, coax disabled.`
                    : result.turret?.shotsToDeplete
                      ? `~${result.turret.shotsToDeplete} AP hit${result.turret.shotsToDeplete === 1 ? '' : 's'} to knock turret.`
                      : 'Knocking the turret disables rotation and coax.'
        })
    ];

    if (face === 'rear' && result.engine) {
        bars.push(
            renderTankulatorComponentBar({
                scenarioLabel: 'If rear hull shot',
                title: 'Engine HP',
                barClass: 'tankulator-hp-bar--engine',
                poolHp: result.engineHp,
                componentSim: result.engine,
                canPen: result.canPen,
                markerClass: 'tankulator-hp-marker--knock',
                fillVariants: {
                    alive: 'tankulator-hp-fill--engine',
                    critical: 'tankulator-hp-fill--engine-critical',
                    dead: 'tankulator-hp-fill--engine-dead'
                },
                legend:
                    result.engine.depletedOnShot != null
                        ? `Engine knocked on shot ${result.engine.depletedOnShot} — tank immobilized. Keep shooting hull to destroy the vehicle.`
                        : result.engine.shotsToDeplete
                          ? `~${result.engine.shotsToDeplete} rear AP hit${result.engine.shotsToDeplete === 1 ? '' : 's'} to knock engine. Immobilized ≠ destroyed — hull must reach 0.`
                          : 'Rear hull hits also damage the engine. Engine knock immobilizes; hull must be destroyed to kill the tank.'
            })
        );
    }

    el.innerHTML = bars.filter(Boolean).join('');
}

function renderTankulatorStatus(result, maxShots, face) {
    const el = document.getElementById('tankulatorStatus');
    if (!el) {
        return;
    }

    let statusClass = 'tankulator-status--survive';
    let icon = 'fa-shield-alt';
    let text = '';

    if (!result.canPen) {
        statusClass = 'tankulator-status--no-pen';
        icon = 'fa-ban';
        text = 'No penetration on selected hull face';
    } else if (result.killedOnShot) {
        statusClass = 'tankulator-status--kill';
        icon = 'fa-skull-crossbones';
        text = `Hull destroyed on shot ${result.killedOnShot}`;
    } else {
        icon = 'fa-heart';
        const finalHp = result.shotResults[result.shotResults.length - 1]?.remaining ?? result.hullHp;
        text = `Hull survives — ${finalHp} HP remaining after ${maxShots} shots`;
    }

    if (face === 'rear' && result.engine?.depletedOnShot) {
        if (result.killedOnShot && result.engine.depletedOnShot <= result.killedOnShot) {
            text += ` · Engine knocked on shot ${result.engine.depletedOnShot}`;
        } else if (!result.killedOnShot) {
            text += ` · Engine knocked on shot ${result.engine.depletedOnShot} (immobilized — hull not destroyed)`;
        }
    }

    el.hidden = false;
    el.className = `tankulator-status ${statusClass}`;
    el.innerHTML = `<i class="fas ${icon}" aria-hidden="true"></i><span>${escapeHtml(text)}</span>`;
}

function renderTankulatorFaceOverview(attacker, target, currentFace, maxShots) {
    const el = document.getElementById('tankulatorFaceOverview');
    if (!el) {
        return;
    }

    const rows = HULL_PEN_FACE_ORDER.map(({ key, label }) => {
        const faceResult = simulateTankulatorFace(attacker, target, key, maxShots);
        const isActive = key === currentFace;
        let penCell = '';
        let killCell = '';

        if (!faceResult.canPen) {
            penCell = '<span class="tankulator-face-pill tankulator-face-pill--no">No pen</span>';
            killCell = '—';
        } else if (faceResult.killedOnShot) {
            penCell = '<span class="tankulator-face-pill tankulator-face-pill--yes">AP pens</span>';
            killCell = `${faceResult.killedOnShot} shot${faceResult.killedOnShot === 1 ? '' : 's'}`;
        } else if (faceResult.shotsToKill) {
            penCell = '<span class="tankulator-face-pill tankulator-face-pill--yes">AP pens</span>';
            killCell =
                faceResult.shotsToKill > maxShots
                    ? `${faceResult.shotsToKill}+ shots`
                    : `${faceResult.shotsToKill} shots`;
        } else {
            penCell = '<span class="tankulator-face-pill tankulator-face-pill--yes">AP pens</span>';
            killCell = '—';
        }

        return `
            <tr class="${isActive ? 'tankulator-face-row--active' : ''}">
                <th scope="row">
                    <button type="button" class="tankulator-face-select" data-face="${key}" aria-pressed="${isActive}">
                        ${escapeHtml(label)}
                    </button>
                </th>
                <td>${penCell}</td>
                <td>${killCell}</td>
            </tr>`;
    }).join('');

    el.innerHTML = `
        <h4 class="tankulator-face-overview-title">All hull faces</h4>
        <p class="tankulator-face-overview-intro">Click a face to simulate it. Shows whether your attacker pens and how many AP shots to destroy the hull.</p>
        <div class="tankulator-face-overview-wrap">
            <table class="tankulator-face-table">
                <thead>
                    <tr>
                        <th scope="col">Face</th>
                        <th scope="col">Penetration</th>
                        <th scope="col">To destroy</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;

    el.querySelectorAll('.tankulator-face-select').forEach(btn => {
        btn.addEventListener('click', () => {
            const faceSelect = document.getElementById('tankulatorHitFace');
            if (!faceSelect) {
                return;
            }
            faceSelect.value = btn.getAttribute('data-face');
            runTankulatorSimulation();
        });
    });
}

function renderTankulatorShotRows(result, maxShots) {
    if (!result.canPen) {
        return `
            <tr class="tankulator-row--no-pen">
                <td colspan="5">No AP penetration on this hull face — no hull damage dealt.</td>
            </tr>
        `;
    }

    const rows = [];
    for (let i = 0; i < result.shotResults.length; i += 1) {
        const shot = result.shotResults[i];
        const isKill = result.killedOnShot === shot.shot;
        if (result.killedOnShot && shot.shot > result.killedOnShot) {
            continue;
        }

        rows.push(`
            <tr class="${isKill ? 'tankulator-row--kill' : ''}">
                <td>Shot ${shot.shot}${isKill ? ' <span class="tankulator-kill-badge">Destroyed</span>' : ''}</td>
                <td data-label="Base Damage">${result.apDamage}</td>
                <td data-label="Modifier">${result.canPen ? `${result.modMeta.label} → ${result.effectiveDamage} dmg` : 'No pen'}</td>
                <td data-label="Damage Dealt">${shot.dealt}</td>
                <td data-label="Remaining HP">${shot.remaining}</td>
            </tr>
        `);
    }

    if (result.killedOnShot && result.killedOnShot < maxShots) {
        rows.push(`
            <tr class="tankulator-row--skipped">
                <td colspan="5">Shots ${result.killedOnShot + 1}–${maxShots}: target already destroyed</td>
            </tr>
        `);
    }

    return rows.join('');
}

function swapTankulatorMatchup() {
    const attackerSelect = document.getElementById('tankulatorAttacker');
    const targetSelect = document.getElementById('tankulatorTarget');
    if (!attackerSelect || !targetSelect) {
        return;
    }
    const prevAttacker = attackerSelect.value;
    attackerSelect.value = targetSelect.value;
    targetSelect.value = prevAttacker;
    runTankulatorSimulation();
}

function runTankulatorSimulation() {
    const attackerSelect = document.getElementById('tankulatorAttacker');
    const targetSelect = document.getElementById('tankulatorTarget');
    const faceSelect = document.getElementById('tankulatorHitFace');
    const shotInput = document.getElementById('tankulatorShots');
    const summary = document.getElementById('tankulatorSummary');
    const body = document.getElementById('tankulatorResultsBody');
    const statusEl = document.getElementById('tankulatorStatus');
    const componentBarsEl = document.getElementById('tankulatorComponentBars');
    const faceOverviewEl = document.getElementById('tankulatorFaceOverview');

    if (!attackerSelect || !targetSelect || !faceSelect || !shotInput || !summary || !body) {
        return;
    }

    const attacker = findTankByName(attackerSelect.value);
    const target = findTankByName(targetSelect.value);
    const face = faceSelect.value;
    const maxShots = Math.max(1, Math.min(12, Number.parseInt(shotInput.value, 10) || 1));

    if (!attacker || !target) {
        summary.innerHTML = '<p>Select both attacker and target tanks.</p>';
        body.innerHTML = '';
        if (statusEl) {
            statusEl.hidden = true;
            statusEl.innerHTML = '';
        }
        if (componentBarsEl) {
            componentBarsEl.hidden = true;
            componentBarsEl.innerHTML = '';
        }
        if (faceOverviewEl) {
            faceOverviewEl.innerHTML = '';
        }
        return;
    }

    const result = simulateTankulatorFace(attacker, target, face, maxShots);

    body.innerHTML = renderTankulatorShotRows(result, maxShots);
    renderTankulatorStatus(result, maxShots, face);
    renderTankulatorComponentBars(result, face);
    renderTankulatorFaceOverview(attacker, target, face, maxShots);

    const resultDetail = !result.canPen
        ? 'Cannot penetrate this hull face'
        : result.killedOnShot
          ? `Hull destroyed in ${result.killedOnShot} shot${result.killedOnShot === 1 ? '' : 's'}`
          : result.shotsToKill
            ? `Needs ${result.shotsToKill}+ AP hits to destroy hull (simulated ${maxShots})`
            : `No hull kill in ${maxShots} simulated shots`;

    const componentDetail = [];
    if (result.turret?.shotsToDeplete) {
        componentDetail.push(`Turret knock ~${result.turret.shotsToDeplete} hit${result.turret.shotsToDeplete === 1 ? '' : 's'} if turret shot`);
    }
    if (face === 'rear' && result.engine?.shotsToDeplete) {
        componentDetail.push(`Engine knock ~${result.engine.shotsToDeplete} rear hit${result.engine.shotsToDeplete === 1 ? '' : 's'}`);
    }

    summary.innerHTML = `
        <p><strong>${escapeHtml(attacker.name)}</strong> vs <strong>${escapeHtml(target.name)}</strong> · ${escapeHtml(face[0].toUpperCase() + face.slice(1))} hull</p>
        <p>AP ${result.apDamage} · Hull ${result.hullHp} · Turret ${result.turretHp || '—'}${face === 'rear' && result.engineHp ? ` · Engine ${result.engineHp}` : ''} · ${result.effectiveDamage} dmg/shot · ${escapeHtml(resultDetail)}</p>
        ${componentDetail.length ? `<p class="tankulator-summary-components">${escapeHtml(componentDetail.join(' · '))}</p>` : ''}
    `;
}

let tankulatorInitialized = false;

function initializeTankulator() {
    const attackerSelect = document.getElementById('tankulatorAttacker');
    const targetSelect = document.getElementById('tankulatorTarget');
    const runBtn = document.getElementById('tankulatorRunBtn');
    if (!attackerSelect || !targetSelect || !runBtn) {
        return;
    }

    const tanks = collectTankulatorTanks();
    if (!tanks.length) {
        return;
    }

    renderTankulatorOptions(attackerSelect, tanks);
    renderTankulatorOptions(targetSelect, tanks);
    renderTankulatorPresets();

    if (!tankulatorInitialized) {
        runBtn.addEventListener('click', runTankulatorSimulation);
        document.getElementById('tankulatorHitFace')?.addEventListener('change', runTankulatorSimulation);
        document.getElementById('tankulatorShots')?.addEventListener('input', runTankulatorSimulation);
        document.getElementById('tankulatorSwapBtn')?.addEventListener('click', swapTankulatorMatchup);
        attackerSelect.addEventListener('change', runTankulatorSimulation);
        targetSelect.addEventListener('change', runTankulatorSimulation);
        tankulatorInitialized = true;
    }

    attackerSelect.value = 'Tiger I';
    targetSelect.value = 'Sherman 76 Jumbo';
    runTankulatorSimulation();
}

            // Penetration Data - Updated to match all tanks in Hell Let Loose
            const penetrationData = [
                // Heavy Tanks
                {
                    weapon: "88mm KwK 36 (Tiger I)",
                    tank: "Tiger I",
                    faction: "Germany",
                    type: "Heavy Tank",
                    range: "500m",
                    penetration: "165mm",
                    effectiveAgainst: "All tanks",
                    shotsToKill: "2 shots vs heavy, 1 shot vs below"
                },
                {
                    weapon: "75mm KwK 42 (Panther)",
                    tank: "Panther",
                    faction: "Germany",
                    type: "Heavy Tank",
                    range: "500m",
                    penetration: "149mm",
                    effectiveAgainst: "Heavy tank class and below",
                    shotsToKill: "2 shots vs heavy, 1 shot vs below"
                },
                {
                    weapon: "76mm M1A1 (Sherman 76 Jumbo)",
                    tank: "Sherman 76 Jumbo",
                    faction: "USA",
                    type: "Heavy Tank",
                    range: "500m",
                    penetration: "116mm",
                    effectiveAgainst: "Heavy tank class and below",
                    shotsToKill: "2 shots vs heavy, 1 shot vs below"
                },
                {
                    weapon: "75mm M3 (Sherman 75 Jumbo)",
                    tank: "Sherman 75 Jumbo",
                    faction: "USA",
                    type: "Heavy Tank",
                    range: "500m",
                    penetration: "76mm",
                    effectiveAgainst: "Medium tank class and below",
                    shotsToKill: "2 shots vs medium, 1 shot vs below"
                },
                {
                    weapon: "85mm D-5T (IS-1)",
                    tank: "IS-1",
                    faction: "Soviet Union",
                    type: "Heavy Tank",
                    range: "500m",
                    penetration: "102mm",
                    effectiveAgainst: "Heavy tank class and below",
                    shotsToKill: "2 shots vs heavy, 1 shot vs below"
                },
                {
                    weapon: "57mm QF 6-pounder (Churchill Mk III)",
                    tank: "Churchill Mk III",
                    faction: "Great Britain",
                    type: "Heavy Tank",
                    range: "500m",
                    penetration: "81mm",
                    effectiveAgainst: "Medium tank class and below",
                    shotsToKill: "1 shot vs medium and below"
                },
                
                // Medium Tanks
                {
                    weapon: "76.2mm QF 17-pounder (Sherman Firefly)",
                    tank: "Sherman Firefly",
                    faction: "Great Britain",
                    type: "Medium Tank",
                    range: "500m",
                    penetration: "140mm",
                    effectiveAgainst: "Heavy tank class and below",
                    shotsToKill: "1 shot vs heavy and below"
                },
                {
                    weapon: "75mm KwK 40 (Panzer IV)",
                    tank: "Panzer IV",
                    faction: "Germany",
                    type: "Medium Tank",
                    range: "500m",
                    penetration: "98mm",
                    effectiveAgainst: "Medium tank class and below",
                    shotsToKill: "2 shots vs medium, 1 shot vs below"
                },
                {
                    weapon: "75mm M3 (M4 Sherman)",
                    tank: "M4 Sherman",
                    faction: "USA",
                    type: "Medium Tank",
                    range: "500m",
                    penetration: "76mm",
                    effectiveAgainst: "Medium tank class and below",
                    shotsToKill: "2 shots vs medium, 1 shot vs below"
                },
                {
                    weapon: "76.2mm F-34 (T-34)",
                    tank: "T-34",
                    faction: "Soviet Union",
                    type: "Medium Tank",
                    range: "500m",
                    penetration: "76mm",
                    effectiveAgainst: "Medium tank class and below",
                    shotsToKill: "2 shots vs medium, 1 shot vs below"
                },
                {
                    weapon: "75mm QF Mk V (Cromwell)",
                    tank: "Cromwell",
                    faction: "Great Britain",
                    type: "Medium Tank",
                    range: "500m",
                    penetration: "91mm",
                    effectiveAgainst: "Medium tank class and below",
                    shotsToKill: "2 shots vs medium, 1 shot vs below"
                },
                {
                    weapon: "57mm QF 6-pounder (Crusader Mk III)",
                    tank: "Crusader Mk III",
                    faction: "Great Britain",
                    type: "Medium Tank",
                    range: "500m",
                    penetration: "81mm",
                    effectiveAgainst: "Medium tank class and below",
                    shotsToKill: "2 shots vs medium, 1 shot vs below"
                },
                
                // Light Tanks
                {
                    weapon: "37mm M6 (M5A1 Stuart)",
                    tank: "M5A1 Stuart",
                    faction: "USA",
                    type: "Light Tank",
                    range: "500m",
                    penetration: "61mm",
                    effectiveAgainst: "Light tank class and below",
                    shotsToKill: "2 shots vs light, 1 shot vs below"
                },
                
                // Recon Vehicles
                {
                    weapon: "37mm M6 (Greyhound)",
                    tank: "Greyhound",
                    faction: "USA",
                    type: "Recon Vehicle",
                    range: "500m",
                    penetration: "61mm",
                    effectiveAgainst: "Recon vehicles only",
                    shotsToKill: "1 shot vs recon vehicles"
                },
                {
                    weapon: "50mm KwK 39 (Puma)",
                    tank: "Puma",
                    faction: "Germany",
                    type: "Recon Vehicle",
                    range: "500m",
                    penetration: "67mm",
                    effectiveAgainst: "Recon vehicles only",
                    shotsToKill: "1 shot vs recon vehicles"
                },
                {
        weapon: "20mm KwK 30 (Luchs)",
        tank: "Luchs",
                    faction: "Germany",
                    type: "Light Tank",
                    range: "500m",
                    penetration: "23mm",
                    effectiveAgainst: "Infantry, light vehicles",
                    shotsToKill: "1 shot vs infantry/vehicles"
                },
                {
                    weapon: "45mm 20-K (T-70)",
                    tank: "T-70",
                    faction: "Soviet Union",
                    type: "Light Tank",
                    range: "500m",
                    penetration: "51mm",
                    effectiveAgainst: "Light tanks and below",
                    shotsToKill: "1 shot vs light tanks and below"
                },
                {
                    weapon: "45mm 20-K (BA-10 Scout Car)",
                    tank: "BA-10 Scout Car",
                    faction: "Soviet Union",
                    type: "Recon Vehicle",
                    range: "500m",
                    penetration: "51mm",
                    effectiveAgainst: "Recon vehicles only",
                    shotsToKill: "1 shot vs recon vehicles"
                },
                {
                    weapon: "40mm QF 2-pounder (Daimler)",
                    tank: "Daimler",
                    faction: "Great Britain",
                    type: "Recon Vehicle",
                    range: "500m",
                    penetration: "57mm",
                    effectiveAgainst: "Recon vehicles only",
                    shotsToKill: "1 shot vs recon vehicles"
                },
                {
                    weapon: "37mm M6 (M3 Stuart 'Honey')",
                    tank: "M3 Stuart 'Honey'",
                    faction: "Great Britain",
                    type: "Light Tank",
                    range: "500m",
                    penetration: "61mm",
                    effectiveAgainst: "Light tanks and below",
                    shotsToKill: "1 shot vs light tanks and below"
                },
                {
                    weapon: "40mm QF 2-pounder (Tetrarch)",
                    tank: "Tetrarch",
                    faction: "Great Britain",
                    type: "Light Tank",
                    range: "500m",
                    penetration: "57mm",
                    effectiveAgainst: "Light tanks and below",
                    shotsToKill: "1 shot vs light tanks and below"
                }
            ];

// DOM Elements
const themeSelect = document.getElementById('themeSelect');
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('.section');

// Comparison Elements
const compareToggle = document.getElementById('compareToggle');
const comparisonPanel = document.getElementById('comparisonPanel');
const closeComparison = document.getElementById('closeComparison');
const clearComparison = document.getElementById('clearComparison');

// Comparison state
let comparisonMode = false;
const factionBtns = document.querySelectorAll('[data-faction]');
const tankTypeBtns = document.querySelectorAll('[data-tank-type]');
const filterToggle = document.getElementById('filterToggle');
const filterDropdown = document.getElementById('filterDropdown');
const tankGrid = document.getElementById('tankGrid');
const vietnamTankGrid = document.getElementById('vietnamTankGrid');
const penetrationTableBody = document.getElementById('penetrationTableBody');

const practiceTankImage = document.getElementById('practiceTankImage');
const practiceOptions = document.getElementById('practiceOptions');

// Filter state
let currentFaction = 'all';
let currentTankType = 'all';

// Theme Management
let currentTheme = localStorage.getItem('theme') || 'theme-default';
const HOLIDAY_THEMES = [
    'theme-christmas',
    'theme-newyear',
    'theme-valentines',
    'theme-stpatricks',
    'theme-july4',
    'theme-halloween',
    'theme-thanksgiving',
    'theme-veterans'
];

function normalizeStoredWwiiTheme(theme) {
    if (!theme || theme === 'theme-easter' || HOLIDAY_THEMES.includes(theme)) {
        return 'theme-default';
    }
    if (theme === 'theme-vietnam-usa' || theme === 'theme-vietnam-pavn') {
        return 'theme-default';
    }
    return theme;
}

function getActiveThemeClass() {
    const active = Array.from(document.body.classList).find(cls => cls.startsWith('theme-'));
    return active || 'theme-default';
}

// Get the appropriate holiday theme based on current date
function getHolidayTheme() {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const day = now.getDate();
    const year = now.getFullYear();
    
    // New Year's (December 31 and January 1)
    if ((month === 12 && day === 31) || (month === 1 && day === 1)) {
        return 'theme-newyear';
    }
    
    // Valentine's Day (February 14)
    if (month === 2 && day === 14) {
        return 'theme-valentines';
    }
    
    // St. Patrick's Day (March 17)
    if (month === 3 && day === 17) {
        return 'theme-stpatricks';
    }
    
    // July 4th
    if (month === 7 && day === 4) {
        return 'theme-july4';
    }
    
    // Halloween (October 31)
    if (month === 10 && day === 31) {
        return 'theme-halloween';
    }
    
    // Thanksgiving (Entire month of November, ending the day after Thanksgiving)
    if (month === 11) {
        const firstOfMonth = new Date(year, 10, 1);
        const dayOfWeek = firstOfMonth.getDay();
        // Calculate first Thursday: if Nov 1 is Thu (4), it's day 1; if Fri (5), day 7; if Sat (6), day 6; if Sun (0), day 5; if Mon (1), day 4; if Tue (2), day 3; if Wed (3), day 2
        let firstThursday;
        if (dayOfWeek === 0) { // Sunday
            firstThursday = 5;
        } else if (dayOfWeek <= 4) { // Monday-Thursday
            firstThursday = 5 - dayOfWeek;
        } else { // Friday-Saturday
            firstThursday = 12 - dayOfWeek;
        }
        const thanksgivingDate = firstThursday + 21; // 4th Thursday
        const dayAfterThanksgiving = thanksgivingDate + 1;
        
        // If it's November and before or on the day after Thanksgiving, show Thanksgiving theme
        if (day <= dayAfterThanksgiving) {
            return 'theme-thanksgiving';
        }
    }
    
    // Veterans Day (November 11)
    if (month === 11 && day === 11) {
        return 'theme-veterans';
    }
    
    // Christmas (December 1-31)
    if (month === 12) {
        return 'theme-christmas';
    }
    
    // Default theme if no holiday matches
    return 'theme-default';
}

/**
 * Apply a theme-* class while preserving non-theme body classes (vietnam-jungle-theme, fullscreen-mode, dark-mode, etc.).
 * @param {string} theme
 * @param {{ skipPersist?: boolean, forceStorageKey?: 'theme' | 'themeVietnam' }} [opts]
 */
function setTheme(theme, opts = {}) {
    if (theme === 'theme-easter') {
        theme = 'theme-default';
    }
    const preserved = Array.from(document.body.classList).filter(c => !c.startsWith('theme-'));
    preserved.push(theme);
    document.body.className = preserved.join(' ').replace(/\s+/g, ' ').trim();
    currentTheme = theme;
    if (!opts.skipPersist) {
        const key =
            opts.forceStorageKey ||
            (isVietnamEraActive() ? 'themeVietnam' : 'theme');
        if (key === 'themeVietnam') {
            localStorage.setItem('themeVietnam', theme);
        } else {
            localStorage.setItem('theme', theme);
        }
    }
    
    // Update dropdown: show actual theme for manual selections, but "Default" for auto-holiday themes
    if (themeSelect) {
        if (HOLIDAY_THEMES.includes(theme)) {
            // Holiday theme active - show "Default" in dropdown
            themeSelect.value = 'theme-default';
        } else {
            // Regular theme - show the actual theme name
            themeSelect.value = theme;
        }
    }
    
    // Show/hide Halloween ghost
    const ghost = document.getElementById('halloweenGhost');
    if (ghost) {
        if (theme === 'theme-halloween') {
            ghost.style.display = 'block';
        } else {
            ghost.style.display = 'none';
        }
    }
    
    // Show/hide Valentine's Day hearts
    const hearts = document.getElementById('valentineHearts');
    if (hearts) {
        if (theme === 'theme-valentines') {
            hearts.style.display = 'block';
        } else {
            hearts.style.display = 'none';
        }
    }
    
    // Show/hide St. Patrick's Day gold and clovers
    const stpatricks = document.getElementById('stpatricksElements');
    if (stpatricks) {
        if (theme === 'theme-stpatricks') {
            stpatricks.style.display = 'block';
        } else {
            stpatricks.style.display = 'none';
        }
    }
    
    // Show/hide Thanksgiving leaves and turkeys
    const thanksgiving = document.getElementById('thanksgivingElements');
    if (thanksgiving) {
        if (theme === 'theme-thanksgiving') {
            thanksgiving.style.display = 'block';
        } else {
            thanksgiving.style.display = 'none';
        }
    }
}

// Initialize theme - always check for automatic holiday theme (Vietnam era skips holidays)
document.addEventListener('DOMContentLoaded', function() {
    const storedTheme = localStorage.getItem('theme');
    const savedTheme = normalizeStoredWwiiTheme(storedTheme);
    if (storedTheme !== savedTheme) {
        localStorage.setItem('theme', savedTheme);
    }
    if (localStorage.getItem('themeUserChosen') === null) {
        const inferredChoice =
            localStorage.getItem('manualThemeOverride') === 'true' ||
            (savedTheme && savedTheme !== 'theme-default');
        localStorage.setItem('themeUserChosen', inferredChoice ? 'true' : 'false');
    }
    const themeUserChosen = localStorage.getItem('themeUserChosen') === 'true';
    const manualOverride = localStorage.getItem('manualThemeOverride') === 'true';
    const holidayTheme = getHolidayTheme();

    const parsed = parseAppHash(window.location.hash.substring(1));
    const initialVietnam =
        parsed &&
        parsed.game === 'vietnam' &&
        (parsed.hub === 'armor' || parsed.hub === 'infantry');

    if (initialVietnam) {
        const vn = normalizeStoredVietnamTheme(localStorage.getItem('themeVietnam'));
        setTheme(vn, { skipPersist: true });
        updateThemeSelectEraVisibility(true);
    } else if (themeUserChosen || (manualOverride && savedTheme === 'theme-default')) {
        setTheme(savedTheme || 'theme-default', { skipPersist: true });
        updateThemeSelectEraVisibility(false);
    } else if (holidayTheme !== 'theme-default') {
        setTheme(holidayTheme, { skipPersist: true });
        updateThemeSelectEraVisibility(false);
    } else {
        setTheme(savedTheme || 'theme-default', { skipPersist: true });
        updateThemeSelectEraVisibility(false);
    }
});

// Theme dropdown event - direct theme selection
if (themeSelect) {
    themeSelect.addEventListener('change', (e) => {
        const selectedTheme = e.target.value;
        if (isVietnamEraActive()) {
            if (!VIETNAM_SELECTABLE_THEMES.has(selectedTheme)) {
                themeSelect.value = normalizeStoredVietnamTheme(localStorage.getItem('themeVietnam'));
                return;
            }
        } else if (
            selectedTheme === 'theme-vietnam-usa' ||
            selectedTheme === 'theme-vietnam-pavn'
        ) {
            themeSelect.value = localStorage.getItem('theme') || 'theme-default';
            return;
        }
        const storageKey = isVietnamEraActive() ? 'themeVietnam' : 'theme';

        if (selectedTheme === 'theme-default') {
            localStorage.setItem('manualThemeOverride', 'true');
            if (!isVietnamEraActive()) {
                localStorage.setItem('themeUserChosen', 'true');
            }
            setTheme('theme-default', { forceStorageKey: storageKey });
        } else {
            localStorage.setItem('manualThemeOverride', 'false');
            if (!isVietnamEraActive()) {
                localStorage.setItem('themeUserChosen', 'true');
            }
            setTheme(selectedTheme, { forceStorageKey: storageKey });
        }
    });
}

// Periodically check for holiday themes (in case date changes while page is open)
setInterval(function() {
    if (isVietnamEraActive()) {
        return;
    }
    if (localStorage.getItem('themeUserChosen') === 'true') {
        return;
    }

    const holidayTheme = getHolidayTheme();
    const activeTheme = getActiveThemeClass();
    const savedTheme = normalizeStoredWwiiTheme(localStorage.getItem('theme'));

    // Auto-holiday themes are visual-only and never persisted.
    if (holidayTheme !== 'theme-default' && activeTheme !== holidayTheme) {
        setTheme(holidayTheme, { skipPersist: true });
    } else if (holidayTheme === 'theme-default' && HOLIDAY_THEMES.includes(activeTheme)) {
        setTheme(savedTheme || 'theme-default', { skipPersist: true });
    }
}, 60000); // Check every minute

// Force apply holiday theme (for testing/debugging)
// This will override any manual selection and apply the current holiday
function forceApplyHolidayTheme() {
    if (isVietnamEraActive()) {
        return;
    }
    const holidayTheme = getHolidayTheme();
    if (holidayTheme !== 'theme-default') {
        localStorage.setItem('themeUserChosen', 'false');
        localStorage.setItem('manualThemeOverride', 'false');
        setTheme(holidayTheme, { skipPersist: true });
    }
}


// Navigation Management
function showSection(sectionId, updateHash = true) {
    if (document.body.classList.contains('fullscreen-mode') && sectionId !== 'ranging') {
        return;
    }
    const route = { hub: 'armor', game: 'wwii', section: sectionId, subRoute: null };
    syncViewToRoute(route, { updateHash });
}

// Navigation event listeners (canonical hashes: #armor/wwii/tanks, #infantry/wwii/overview, …)
navLinks.forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
            window.location.hash = href.slice(1);
        }
    });
});

// Logo link event listener
const logoLink = document.querySelector('.logo-link');
if (logoLink) {
    logoLink.addEventListener('click', (e) => {
        e.preventDefault();
        showSection('overview');
    });
}

// Tank Display Functions
function create360Viewer(tank) {
    // Use a more robust tank ID generation that handles special characters better
    const tankId = tank.name.toLowerCase()
        .replace(/['"]/g, '') // Remove quotes
        .replace(/[^a-zA-Z0-9\s]/g, '') // Remove other special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    
    const images360 = tank.images360;
    
    return `
        <div class="tank-360-viewer" data-tank-id="${tankId}">
            <div class="tank-360-container" 
                 onmousedown="startDrag(event, '${tankId}')" 
                 onmousemove="drag(event, '${tankId}')" 
                 onmouseup="endDrag(event, '${tankId}')" 
                 onmouseleave="endDrag(event, '${tankId}')"
                 ontouchstart="startTouchDrag(event, '${tankId}')"
                 ontouchmove="touchDrag(event, '${tankId}')"
                 ontouchend="endTouchDrag(event, '${tankId}')"
                 style="cursor: grab;">
                <img src="${images360.prefix}1${images360.suffix}?v=${buildVersion}" 
                     alt="${tank.name} - 360° View" 
                     class="tank-360-image" 
                     loading="lazy" 
                     data-current-angle="45"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="tank-360-fallback" style="display: none; align-items: center; justify-content: center; height: 100%; color: var(--text-secondary); font-style: italic;">
                    <i class="${tank.icon}" style="font-size: 3rem; margin-right: 1rem;"></i>
                    <span>360° View Not Available</span>
                </div>
                <div class="tank-360-indicator">
                    <span class="tank-360-angle">45°</span>
                </div>
            </div>
            <div class="tank-360-controls">
                <button class="tank-360-btn tank-360-left" onclick="rotateTank('${tankId}', -1)">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <button class="tank-360-btn tank-360-right" onclick="rotateTank('${tankId}', 1)">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        </div>
    `;
}

// Function to rotate the tank 360 view
function rotateTank(tankId, direction) {
    // Find the 360 viewer directly by its data-tank-id
    const viewer = document.querySelector(`.tank-360-viewer[data-tank-id="${tankId}"]`);
    if (!viewer) {
        return;
    }
    
    const image = viewer.querySelector('.tank-360-image');
    const angleIndicator = viewer.querySelector('.tank-360-angle');
    
    if (!image || !angleIndicator) {
        return;
    }
    
    // Get current image number from the image src or data attribute
    // Extract current image number from src attribute
    let currentImageNumber = 1; // Default to image 1 (45°)
    const currentSrc = image.src;
    const match = currentSrc.match(/(\d+)(\.webp|\.png)/);
    if (match) {
        currentImageNumber = parseInt(match[1]);
    } else {
        // Fallback: get from angle
        const currentAngle = parseInt(image.getAttribute('data-current-angle')) || 45;
        currentImageNumber = Math.floor(currentAngle / 45);
    }
    
    // Calculate new image number
    let imageNumber = currentImageNumber + direction;
    
    // Handle wrap-around
    if (imageNumber < 0) {
        imageNumber = 7; // Wrap to last image (315°)
    } else if (imageNumber > 7) {
        imageNumber = 0; // Wrap to first image (0°)
    }
    
    // Calculate angle from image number
    const angle = imageNumber * 45;
    
    // Get tank data to construct image path
    const tankName = viewer.closest('.tank-card').querySelector('.tank-name').textContent;
    
    // Find tank in database
    let tankData = null;
    Object.values(tankDatabase).forEach(factionTanks => {
        const found = factionTanks.find(tank => tank.name === tankName);
        if (found) tankData = found;
    });
    
    if (tankData && tankData.images360) {
        const newImagePath = `${tankData.images360.prefix}${imageNumber}${tankData.images360.suffix}?v=${buildVersion}`;
        
        // Update angle indicator and data attribute
        image.setAttribute('data-current-angle', angle);
        angleIndicator.textContent = `${angle}°`;
        
        // Load new image
            image.src = newImagePath;
    }
}

// Function to rotate tank by angle (for drag functionality)
function rotateTankByAngle(tankId, targetAngle, showSnapping = true) {
    const viewer = document.querySelector(`.tank-360-viewer[data-tank-id="${tankId}"]`);
    if (!viewer) return;
    
    const image = viewer.querySelector('.tank-360-image');
    const angleIndicator = viewer.querySelector('.tank-360-angle');
    
    if (!image || !angleIndicator) return;
    
    // Normalize target angle to handle continuous rotation beyond 360°
    let normalizedAngle = targetAngle;
    while (normalizedAngle < 0) normalizedAngle += 360;
    while (normalizedAngle >= 360) normalizedAngle -= 360;
    
    // Snap to nearest valid angle (8 positions: 0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°)
    const validAngles = [0, 45, 90, 135, 180, 225, 270, 315];
    let snappedAngle = validAngles[0];
    let minDifference = Math.abs(normalizedAngle - validAngles[0]);
    
    for (let angle of validAngles) {
        const difference = Math.abs(normalizedAngle - angle);
        if (difference < minDifference) {
            minDifference = difference;
            snappedAngle = angle;
        }
    }
    
    // Calculate image number (0-7) directly from angle - images are 0-indexed
    // Mapping: 0°=0, 45°=1, 90°=2, 135°=3, 180°=4, 225°=5, 270°=6, 315°=7
    // Since we have 8 images at 45° intervals, image number = angle / 45
    let imageNumber = Math.floor(snappedAngle / 45);
    
    // Ensure image number is in valid range (0-7) with proper wrap-around
    if (imageNumber < 0) {
        imageNumber = 7;
        snappedAngle = 315; // Set angle to match image 7
    }
    if (imageNumber >= 8) {
        imageNumber = 0;
        snappedAngle = 0; // Set angle to match image 0
    }
    
    // Ensure angle is exactly correct for the image number (fix any rounding issues)
    // This ensures image 0 = 0°, image 1 = 45°, etc.
    snappedAngle = imageNumber * 45;
    
    // Get tank data to construct image path
    const tankName = viewer.closest('.tank-card').querySelector('.tank-name').textContent;
    
    // Find tank in database
    let tankData = null;
    Object.values(tankDatabase).forEach(factionTanks => {
        const found = factionTanks.find(tank => tank.name === tankName);
        if (found) tankData = found;
    });
    
    if (tankData && tankData.images360) {
        const newImagePath = `${tankData.images360.prefix}${imageNumber}${tankData.images360.suffix}?v=${buildVersion}`;
        
        // Always update the angle indicator and data attribute first
        image.setAttribute('data-current-angle', snappedAngle);
        angleIndicator.textContent = `${snappedAngle}°`;
        
        // Add error handling for image loading
        const tempImage = new Image();
        tempImage.onload = function () {
            // Image loaded successfully, update the display
            image.src = newImagePath;
            
            // Only show snapping effect if requested (not during drag)
            if (showSnapping) {
                const container = viewer.querySelector('.tank-360-container');
                if (container) {
                    container.classList.add('snapping');
                    setTimeout(() => {
                        container.classList.remove('snapping');
                    }, 150);
                }
            }
        };
        tempImage.onerror = function () {
            // Image failed to load - log for debugging but don't revert angle
            console.warn(`Failed to load 360 image: ${newImagePath}`);
        };
        tempImage.src = newImagePath;
    }
}

// Drag functionality variables
let isDragging = false;
let dragStartX = 0;
let dragStartAngle = 0;
let currentDragTankId = null;

// Start drag operation
function startDrag(event, tankId) {
    event.preventDefault();
    isDragging = true;
    dragStartX = event.clientX;
    currentDragTankId = tankId;
    
    // Get current angle
    const viewer = document.querySelector(`.tank-360-viewer[data-tank-id="${tankId}"]`);
    if (viewer) {
        const image = viewer.querySelector('.tank-360-image');
        dragStartAngle = parseInt(image.getAttribute('data-current-angle')) || 45;
    }
    
    // Change cursor
    event.target.style.cursor = 'grabbing';
}

// Handle drag movement
function drag(event, tankId) {
    if (!isDragging || currentDragTankId !== tankId) return;
    
    event.preventDefault();
    
    const deltaX = event.clientX - dragStartX;
    const sensitivity = 2; // Pixels per degree
    const deltaAngle = (deltaX / sensitivity);
    
    const newAngle = dragStartAngle + deltaAngle;
    rotateTankByAngle(tankId, newAngle, false); // Don't show snapping during drag
}

// End drag operation
function endDrag(event, tankId) {
    if (!isDragging || currentDragTankId !== tankId) return;
    
    isDragging = false;
    currentDragTankId = null;
    
    // Reset cursor
    if (event.target) {
        event.target.style.cursor = 'grab';
    }
    
    // Show snapping effect when drag ends
    const viewer = document.querySelector(`.tank-360-viewer[data-tank-id="${tankId}"]`);
    if (viewer) {
        const container = viewer.querySelector('.tank-360-container');
        if (container) {
            container.classList.add('snapping');
            setTimeout(() => {
                container.classList.remove('snapping');
            }, 150);
        }
    }
}

// Touch drag functionality
function startTouchDrag(event, tankId) {
    event.preventDefault();
    if (event.touches.length === 1) {
        isDragging = true;
        dragStartX = event.touches[0].clientX;
        currentDragTankId = tankId;
        
        // Get current angle
        const viewer = document.querySelector(`.tank-360-viewer[data-tank-id="${tankId}"]`);
        if (viewer) {
            const image = viewer.querySelector('.tank-360-image');
            dragStartAngle = parseInt(image.getAttribute('data-current-angle')) || 45;
        }
    }
}

function touchDrag(event, tankId) {
    if (!isDragging || currentDragTankId !== tankId || event.touches.length !== 1) return;
    
    event.preventDefault();
    
    const deltaX = event.touches[0].clientX - dragStartX;
    const sensitivity = 2; // Pixels per degree
    const deltaAngle = (deltaX / sensitivity);
    
    const newAngle = dragStartAngle + deltaAngle;
    rotateTankByAngle(tankId, newAngle, false); // Don't show snapping during touch drag
}

function endTouchDrag(event, tankId) {
    if (!isDragging || currentDragTankId !== tankId) return;
    
    isDragging = false;
    currentDragTankId = null;
    
    // Show snapping effect when touch drag ends
    const viewer = document.querySelector(`.tank-360-viewer[data-tank-id="${tankId}"]`);
    if (viewer) {
        const container = viewer.querySelector('.tank-360-container');
        if (container) {
            container.classList.add('snapping');
            setTimeout(() => {
                container.classList.remove('snapping');
            }, 150);
        }
    }
}

/** Real-world designation and service notes (merged with optional tank.vehicleHistory). */
const TANK_VEHICLE_HISTORY = {
    'M4 Sherman': {
        designation: 'Medium Tank M4 Sherman',
        service:
            'Standard U.S. medium tank of World War II, standardized in 1942. Roughly 49,000 M4-series vehicles were built in all marks and factories. Widely used by U.S. and Allied armored forces in Europe, the Mediterranean, and the Pacific through 1945.'
    },
    'Sherman 75 Jumbo': {
        designation: 'Assault tank M4A3E2 Sherman (“Jumbo”)',
        service:
            'Heavily armored assault variant of the Sherman with a 75 mm gun; only about 254 were built. Entered combat in mid-1944 (notably Normandy) for infantry support and assaulting fortified positions.'
    },
    'Sherman 76 Jumbo': {
        designation: 'M4A3E2 assault tank (76 mm in Hell Let Loose)',
        service:
            'Historically, M4A3E2 “Jumbo” assault tanks were armed with the 75 mm gun. Hell Let Loose uses a 76 mm configuration for gameplay; the real vehicle’s thick frontal armor and assault role are otherwise characteristic of the E2 hull.'
    },
    'M5A1 Stuart': {
        designation: 'Light Tank M5A1 Stuart',
        service:
            'U.S. light tank derived from the M3 Stuart family, in service from 1942. Used for reconnaissance, screening, and escort across North Africa, Italy, northwest Europe, and the Pacific; largely outclassed in tank combat by 1944 but remained in support roles.'
    },
    Greyhound: {
        designation: 'M8 armored car',
        service:
            'U.S. 6×6 wheeled reconnaissance vehicle with a 37 mm gun, standardized as the M8 in 1943. Widely used by U.S. and Allied forces for scouting and security in the Mediterranean and European theaters.'
    },
    'Sherman M4A3 105': {
        designation: 'M4 Sherman (105 mm howitzer)',
        service:
            'Close-support Sherman variant armed with the 105 mm M4 howitzer for high-explosive and smoke missions. Fielded alongside 75 mm and 76 mm gun tanks in U.S. armored units in the European and Pacific theaters.'
    },
    'Panzer IV': {
        designation: 'Panzerkampfwagen IV (Pz.Kpfw. IV)',
        service:
            'Germany’s principal medium tank for most of World War II, continuously up-armored and up-gunned from 1939 through 1945. Most-produced German tank of the war; saw service on every major front.'
    },
    Panther: {
        designation: 'Panzerkampfwagen V Panther (Sd.Kfz. 171)',
        service:
            'German medium tank entering service in 1943, combining sloped armor with a long high-velocity 75 mm gun. Intended as a counter to the T-34; used heavily on the Eastern and Western Fronts until the end of the war.'
    },
    'Tiger I': {
        designation: 'Panzerkampfwagen VI Tiger Ausf. E (Sd.Kfz. 181)',
        service:
            'German heavy tank armed with the 88 mm KwK 36; about 1,350 built from late 1942. Organized in independent heavy tank companies and battalions, it saw extensive use in North Africa, Italy, the Eastern Front, and northwest Europe.'
    },
    Luchs: {
        designation: 'Panzerkampfwagen II Ausf. L “Luchs”',
        service:
            'Late-war German reconnaissance tank on an enlarged Panzer II chassis with a 20 mm autocannon. Only 100 were produced (1943–1944); employed for scouting on the Eastern and Western Fronts.'
    },
    Puma: {
        designation: 'Schwerer Panzerspähwagen Sd.Kfz. 234/2 “Puma”',
        service:
            '8×8 German heavy armored car with a 50 mm gun. Introduced in 1944; issued to reconnaissance units of Panzer divisions, mainly on the Western Front.'
    },
    'Sturmpanzer IV Brummbar': {
        designation: 'Sturmpanzer IV (Sd.Kfz. 166) “Brummbär”',
        service:
            'Assault howitzer on a Panzer IV chassis mounting the 150 mm StuH 43. Built from 1943 for infantry support against fortifications and built-up areas; used on the Eastern Front, Italy, and in the West.'
    },
    'Panzer III Ausf.N': {
        designation: 'Panzerkampfwagen III Ausf. N (and related variants)',
        service:
            'The Panzer III was Germany’s main medium tank in the early war; the Ausf. N typically carried a short 75 mm gun for infantry support. Many chassis were later converted to StuG III assault guns. Hell Let Loose represents this entry as self-propelled artillery.'
    },
    'T-34': {
        designation: 'T-34 medium tank',
        service:
            'Soviet medium tank family (76.2 mm then 85 mm guns) produced in very large numbers from 1940 onward. Noted for sloped armor, reliability, and ease of manufacture; backbone of Red Army armored forces for the entire war.'
    },
    'IS-1': {
        designation: 'IS-1 heavy tank (Iosif Stalin)',
        service:
            'First production model of the IS heavy tank series, armed with an 85 mm gun. Entered service in 1943 as a successor to the KV line; saw combat through the defeat of Germany.'
    },
    'T-70': {
        designation: 'T-70 light tank',
        service:
            'Soviet light tank produced from late 1942, replacing the T-60. Built in large numbers for reconnaissance and infantry support; gradually phased out of first-line tank units as T-34 production dominated.'
    },
    'BA-10 Scout Car': {
        designation: 'BA-10 armored car',
        service:
            'Soviet medium armored car (6×4) with a turret-mounted 45 mm gun, developed in the late 1930s. Saw heavy use in the Winter War and early Barbarossa; largely obsolete by mid-war but still encountered in secondary roles.'
    },
    'KV-2': {
        designation: 'KV-2 heavy assault tank',
        service:
            'KV chassis carrying a massive turret with the 152 mm M-10T howitzer for reducing fortifications. Only a few hundred were built; famous for firepower and silhouette, less for mobility and reliability.'
    },
    Daimler: {
        designation: 'Daimler armoured car (Mk I / Mk II)',
        service:
            'British scout car with a turret-mounted 2-pounder (40 mm) gun. Widely used from North Africa through northwest Europe for reconnaissance and liaison from 1941 onward.'
    },
    "M3 Stuart 'Honey'": {
        designation: 'Light Tank M3 / M3A1 Stuart',
        service:
            'American-built light tank supplied to Britain and the Commonwealth under Lend-Lease. British crews nicknamed early examples “Honey.” Extensively used in the Western Desert and Mediterranean before relegation to training and secondary theaters.'
    },
    Tetrarch: {
        designation: 'Light Tank Mk VII (A17) Tetrarch',
        service:
            'British light tank with a 2-pounder gun, designed before the war. Small numbers fought in North Africa; a handful were trialed for airborne use. Production was limited and the type was soon superseded.'
    },
    Cromwell: {
        designation: 'Cruiser Tank Mk VIII, Cromwell (A27M)',
        service:
            'British fast cruiser tank powered by the Rolls-Royce Meteor engine; entered combat in 1944 in northwest Europe. Formed the core of many British armored reconnaissance regiments and armoured divisions in the late war.'
    },
    'Crusader Mk III': {
        designation: 'Cruiser Tank Mk VI Crusader Mk III (A15)',
        service:
            'North African cruiser tank upgunned to the 6-pounder. One of the main British cruisers of the desert war from 1942 until replaced by later designs in Europe.'
    },
    'Churchill Mk III': {
        designation: 'Infantry Tank Mk IV Churchill III (A22)',
        service:
            'Churchill variant with a welded turret and 6-pounder gun. Heavily armoured but slow “infantry tank” used from Tunisia through northwest Europe for assault and close support.'
    },
    'Churchill Mk.VII': {
        designation: 'Infantry Tank Mk IV Churchill VII (A22F) “heavy Churchill”',
        service:
            'Late-war Churchill with thicker armour and a new hull shape; one of the most heavily protected Allied infantry tanks of 1944–1945 in northwest Europe.'
    },
    'Sherman Firefly': {
        designation: 'Sherman IC / VC Firefly (17-pounder)',
        service:
            'British-Commonwealth conversion mounting the QF 17-pounder anti-tank gun in a modified M4 Sherman turret. Introduced in 1944; gave Allied units a tank able to engage German heavy armour at longer ranges.'
    },
    'Churchill Mk III A.V.R.E.': {
        designation: 'Churchill AVRE (Armoured Vehicle Royal Engineers)',
        service:
            'Churchill engineer vehicle armed with the Petard spigot mortar for demolitions and obstacle reduction. Used from Normandy onward for assaulting fortifications and beach defenses.'
    },
    'Bishop SP 25pdr': {
        designation: 'Ordnance QF 25-pounder on Valentine chassis (“Bishop”)',
        service:
            'British interim self-propelled 25-pounder on a Valentine tank hull, fielded from 1942. Saw service in North Africa and Italy; limited elevation and cramped layout led to replacement by better SP designs.'
    },
    'M48 Patton': {
        designation: '90 mm Gun Tank M48 (US Army; M48A3 diesel retrofit common in Vietnam)',
        service:
            'US Army and ARVN Pattons were used across South Vietnam from the mid-1960s for firebase security, highway escort, reaction forces, and close support in jungle clearings, coastal plains, and urban fights. The M48A3 brought a reliable diesel powerpack and a stabilized 90 mm M41 gun well suited to bunkers, convoy ambushes, and counterattacks during major shocks such as Tet 1968 and the Easter Offensive of 1972. Mass and width limited movement on narrow trails and rice dikes compared with lighter AFVs, yet the type remained a core medium tank for Allied armour through 1975.'
    },
    'T-54': {
        designation: 'T-54 medium tank (Soviet design; 100 mm D-10T family)',
        service:
            'PAVN forces fielded T-54s and closely related Chinese Type 59s in rising numbers from the late 1960s, committing them to conventional thrusts such as the 1972 battles for Quang Tri and to supporting strikes on allied bases and lines of communication. The low silhouette and 100 mm gun favored road ambushes, tree-line snaps, and deliberate assaults on bunkers and lighter vehicles. When North Vietnamese tank columns met US and ARVN Pattons, M113-based weapons, and infantry anti-armour teams, engagements ran from point-blank jungle brawls to multi-axis armour fights; examined hulls added to US intelligence on Warsaw Pact equipment.'
    }
};

function escapeHtml(text) {
    if (text == null || text === '') return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function createTankCard(tank) {
    const has360View = tank.has360View || false;
    const ds = tank.detailedStats;
    const commanderLabel = isSPATank(tank) ? 'Munitions Cost:' : 'Fuel Cost:';
    let commanderValue = 'N/A';
    if (ds) {
        if (isSPATank(tank)) {
            commanderValue =
                ds.munitionsCost !== null && ds.munitionsCost !== undefined
                    ? String(ds.munitionsCost)
                    : 'N/A';
        } else {
            commanderValue =
                ds.fuelCost !== null && ds.fuelCost !== undefined ? String(ds.fuelCost) : 'N/A';
        }
    }
    const smokeRow =
        ds && ds.maxShellsSmoke !== null && ds.maxShellsSmoke !== undefined
            ? `
                                <div class="stat-pair">
                                    <span class="stat-label">Max Smoke Shells:</span>
                                    <span class="stat-value">${ds.maxShellsSmoke}</span>
                                </div>`
            : '';
    const weaponRangeRow =
        ds && ds.weaponRange
            ? `
                                <div class="stat-pair">
                                    <span class="stat-label">Maximum weapon range:</span>
                                    <span class="stat-value">${ds.weaponRange}</span>
                                </div>`
            : '';
    const gearSwitchValue =
        ds && ds.gearSwitchDisplay
            ? ds.gearSwitchDisplay
            : ds && ds.gearSwitchTime !== null && ds.gearSwitchTime !== undefined
              ? `${ds.gearSwitchTime}s`
              : 'N/A';
    const fmtDs = (key, suffix = '') => {
        if (!ds || ds[key] === null || ds[key] === undefined) return 'N/A';
        const v = ds[key];
        if (typeof v !== 'number') return String(v);
        return `${v}${suffix}`;
    };
    const pitchRangeStr =
        ds && typeof ds.pitchAngleMin === 'number' && typeof ds.pitchAngleMax === 'number'
            ? `${ds.pitchAngleMin}° to ${ds.pitchAngleMax}°`
            : 'N/A';
    const maxSpeedStr =
        ds && typeof ds.maxSpeed === 'number'
            ? `${ds.maxSpeed} km/h`
            : tank.speed
              ? escapeHtml(String(tank.speed))
              : 'N/A';
    const statsIntroHtml =
        tank.statsBlurb && String(tank.statsBlurb).trim()
            ? escapeHtml(tank.statsBlurb)
            : 'Comprehensive stats from game data (U20):';
    const vh = tank.vehicleHistory || TANK_VEHICLE_HISTORY[tank.name];
    const vhDes = vh && vh.designation ? escapeHtml(vh.designation) : '';
    const vhSvc = vh && vh.service ? escapeHtml(vh.service) : '';
    const analysisFooter = `
                            <div class="analysis-panel-footer">
                                <div class="analysis-footer-label">Quick reference (game)</div>
                                <ul class="analysis-footer-facts">
                                    <li><span>Class</span><span>${escapeHtml(tank.type)}</span></li>
                                    <li><span>Crew</span><span>${escapeHtml(tank.crew)}</span></li>
                                    <li><span>Armament</span><span>${escapeHtml(tank.gun)}</span></li>
                                </ul>
                            </div>`;
    const historyFooter = `
                            <div class="analysis-panel-footer">
                                <div class="analysis-footer-label">In Hell Let Loose</div>
                                <ul class="analysis-footer-facts">
                                    <li><span>Faction</span><span>${escapeHtml(tank.faction)}</span></li>
                                    <li><span>Role</span><span>${escapeHtml(tank.type)}</span></li>
                                    <li><span>Listed speed</span><span>${escapeHtml(tank.speed)}</span></li>
                                </ul>
                            </div>`;
    const vehicleHistoryBlock =
        vhDes || vhSvc
            ? `
                        <div class="tank-vehicle-history-section">
                            <h3><i class="fas fa-landmark"></i> Vehicle history</h3>
                            <div class="analysis-panel-main">
                            ${vhDes ? `<p class="history-designation"><span class="history-label">Official designation</span> ${vhDes}</p>` : ''}
                            ${vhSvc ? `<p class="history-service">${vhSvc}</p>` : ''}
                            </div>
                            ${historyFooter}
                        </div>`
            : `
                        <div class="tank-vehicle-history-section">
                            <h3><i class="fas fa-landmark"></i> Vehicle history</h3>
                            <div class="analysis-panel-main">
                            <p class="history-placeholder">Historical summary for this vehicle is not yet available.</p>
                            </div>
                            ${historyFooter}
                        </div>`;
    const viewerContent = tank.tankPhoto
        ? `<img class="tank-card-photo" src="${escapeHtml(
              tank.tankPhoto
          )}" alt="${escapeHtml(`${tank.name} — front three-quarter view (site image)`)}" loading="lazy" decoding="async">`
        : tank.usePlaceholderImage
          ? `<div class="tank-image-placeholder-mark" role="img" aria-label="Tank image placeholder"><i class="fas fa-image" aria-hidden="true"></i><span class="tank-image-placeholder-label">Image placeholder</span></div>`
          : has360View
            ? create360Viewer(tank)
            : `<i class="${tank.icon}"></i>`;

    const routeGameAttr = tank.routeGame ? ` data-route-game="${escapeHtml(tank.routeGame)}"` : '';
    const skipCompareAttr = tank.skipCompare ? ` data-skip-compare="1"` : '';

    const isVietnamArmorCard = tank.routeGame === 'vietnam';
    const tankImageBgClass = isVietnamArmorCard ? `bg-vn-${globalVietnamBackground}` : `bg-${globalBackground}`;
    const backgroundSelectorHtml = isVietnamArmorCard
        ? `<div class="background-selector">
                    ${VIETNAM_TANK_BACKDROPS.map(
                        b => `
                    <button type="button" class="bg-btn ${globalVietnamBackground === b.key ? 'active' : ''}" data-bg-set="vietnam" data-background="${b.key}" title="${escapeHtml(b.title)}">
                        <i class="fas ${b.icon}"></i>
                    </button>`
                    ).join('')}
                </div>`
        : `<div class="background-selector">
                    <button type="button" class="bg-btn ${globalBackground === 'grass' ? 'active' : ''}" data-bg-set="wwii" data-background="grass" title="Grass Background">
                        <i class="fas fa-seedling"></i>
                    </button>
                    <button type="button" class="bg-btn ${globalBackground === 'snow' ? 'active' : ''}" data-bg-set="wwii" data-background="snow" title="Snow Background">
                        <i class="fas fa-snowflake"></i>
                    </button>
                    <button type="button" class="bg-btn ${globalBackground === 'desert' ? 'active' : ''}" data-bg-set="wwii" data-background="desert" title="Desert Background">
                        <i class="fas fa-sun"></i>
                    </button>
                </div>`;

    return `
        <div class="tank-card"${routeGameAttr}${skipCompareAttr} data-tank-id="${tank.name.replace(/\s+/g, '-').toLowerCase()}">
            <div class="tank-image ${tankImageBgClass}">
                ${backgroundSelectorHtml}
                ${viewerContent}
            </div>
            <div class="tank-info">
                <button class="tank-expand-btn" title="Expand Details">
                    <i class="fas fa-plus"></i>
                </button>
                <h3 class="tank-name">${tank.name}</h3>
                <span class="tank-faction">${tank.faction}</span>
                ${has360View ? '<span class="tank-360-badge">360° View</span>' : ''}
                <div class="tank-stats">
                    <div class="stat">
                        <div class="stat-label">Type</div>
                        <div class="stat-value">${tank.type}</div>
                    </div>
                    <div class="stat">
                        <div class="stat-label">Crew</div>
                        <div class="stat-value">${tank.crew}</div>
                    </div>
                    <div class="stat">
                        <div class="stat-label">Speed</div>
                        <div class="stat-value">${tank.speed}</div>
                    </div>
                    <div class="stat">
                        <div class="stat-label">Gun</div>
                        <div class="stat-value">${tank.gun}</div>
                    </div>
                </div>
                <p class="tank-description">${tank.description}</p>
            </div>
            <div class="tank-details">

                <div class="tank-details-header">
                    <h2>Figure ${getTankFigureNumber(tank)}: 'The ${tank.name}'</h2>
                </div>
                <div class="tank-details-content">
                    <div class="tank-stats-section">
                        <h3>Combat Statistics</h3>
                        <p>${statsIntroHtml}</p>
                        <div class="stats-grid-compact">
                            <div class="stat-group">
                                <h4><i class="fas fa-shield-alt"></i> Health & Armor</h4>
                                <div class="stat-pair">
                                    <span class="stat-label">Hull Health:</span>
                                    <span class="stat-value">${fmtDs('hullHealth')}</span>
                    </div>
                                <div class="stat-pair">
                                    <span class="stat-label">Turret Health:</span>
                                    <span class="stat-value">${fmtDs('turretHealth')}</span>
                    </div>
                                <div class="stat-pair">
                                    <span class="stat-label">Engine Health:</span>
                                    <span class="stat-value">${fmtDs('engineHealth')}</span>
                </div>
                                <div class="stat-pair">
                                    <span class="stat-label">Track Health:</span>
                                    <span class="stat-value">${fmtDs('trackHealth')}</span>
                                </div>
                            </div>
                            <div class="stat-group">
                                <h4><i class="fas fa-crosshairs"></i> Firepower</h4>
                                <div class="stat-pair">
                                    <span class="stat-label">AP Damage:</span>
                                    <span class="stat-value">${fmtDs('apDamage')}</span>
                                </div>
                                <div class="stat-pair">
                                    <span class="stat-label">Reload Speed:</span>
                                    <span class="stat-value">${fmtDs('reloadSpeed', 's')}</span>
                                </div>
                                <div class="stat-pair">
                                    <span class="stat-label">Max AP Shells:</span>
                                    <span class="stat-value">${fmtDs('maxShellsAP')}</span>
                                </div>
                                <div class="stat-pair">
                                    <span class="stat-label">Max HE Shells:</span>
                                    <span class="stat-value">${fmtDs('maxShellsHE')}</span>
                                </div>
                                ${smokeRow}
                                ${weaponRangeRow}
                            </div>
                            <div class="stat-group">
                                <h4><i class="fas fa-tachometer-alt"></i> Mobility</h4>
                                <div class="stat-pair">
                                    <span class="stat-label">Max Speed:</span>
                                    <span class="stat-value">${maxSpeedStr}</span>
                                </div>
                                <div class="stat-pair">
                                    <span class="stat-label">Yaw Rate:</span>
                                    <span class="stat-value">${fmtDs('yawRate', '°/s')}</span>
                                </div>
                                <div class="stat-pair">
                                    <span class="stat-label">Pitch Rate:</span>
                                    <span class="stat-value">${fmtDs('pitchRate', '°/s')}</span>
                                </div>
                                <div class="stat-pair">
                                    <span class="stat-label">Gear Switch:</span>
                                    <span class="stat-value">${gearSwitchValue}</span>
                                </div>
                            </div>
                            <div class="stat-group">
                                <h4><i class="fas fa-bullseye"></i> Turret & Utility</h4>
                                <div class="stat-pair">
                                    <span class="stat-label">Pitch Range:</span>
                                    <span class="stat-value">${pitchRangeStr}</span>
                                </div>
                                <div class="stat-pair">
                                    <span class="stat-label">Explosion Damage (when destroyed):</span>
                                    <span class="stat-value">${fmtDs('explosionDamage')}</span>
                                </div>
                                <div class="stat-pair">
                                    <span class="stat-label">Explosion Radius (when destroyed):</span>
                                    <span class="stat-value">${fmtDs('explosionRadius', 'cm')}</span>
                                </div>
                                <div class="stat-pair">
                                    <span class="stat-label">${commanderLabel}</span>
                                    <span class="stat-value">${commanderValue}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    ${renderHullPenetrationSection(tank)}
                    <div class="tank-analysis-split">
                        <div class="tank-combat-analysis-section">
                            <h3><i class="fas fa-crosshairs"></i> Combat analysis</h3>
                            <div class="analysis-panel-main">
                            <p><strong>Strengths:</strong> ${tank.strengths}</p>
                            <p><strong>Weak spots:</strong> ${escapeHtml(getDisplayWeakSpots(tank))}</p>
                            <p><strong>In-game description:</strong> ${tank.description}</p>
                            </div>
                            ${analysisFooter}
                        </div>
                        ${vehicleHistoryBlock}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function displayTanks(faction = 'all', tankType = 'all') {
    if (!tankGrid) {
        return;
    }
    let tanksToShow = [];
    
    // Get tanks based on faction filter
    if (faction === 'all') {
        Object.values(tankDatabase).forEach(factionTanks => {
            tanksToShow = tanksToShow.concat(factionTanks);
        });
    } else {
        tanksToShow = tankDatabase[faction] || [];
    }
    
    // Apply tank type filter
    if (tankType !== 'all') {
        // Map short filter names to full tank type names
        const tankTypeMap = {
            'heavy': 'Heavy Tank',
            'medium': 'Medium Tank',
            'light': 'Light Tank',
            'recon': 'Recon Vehicle',
            'spa': 'SPA (Self Propelled Artillery)'
        };
        
        const fullTankType = tankTypeMap[tankType] || tankType;
        tanksToShow = tanksToShow.filter(tank => tank.type === fullTankType);
    }
    
    // Sort tanks by type: Heavy -> Medium -> Light -> Recon -> SPA
    const typeOrder = {
        'Heavy Tank': 0,
        'Medium Tank': 1,
        'Light Tank': 2,
        'Recon Vehicle': 3,
        'SPA (Self Propelled Artillery)': 4
    };
    
    tanksToShow.sort((a, b) => {
        return typeOrder[a.type] - typeOrder[b.type];
    });
    
    tankGrid.innerHTML = tanksToShow.map(tank => createTankCard(tank)).join('');
    
    // Add click event listeners to expand buttons (WWII grid only; Vietnam uses displayVietnamTanks)
    const expandButtons = tankGrid.querySelectorAll('.tank-expand-btn');
    expandButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = button.closest('.tank-card');
            expandTankCard(card);
        });
    });

    // Restore comparison buttons if comparison mode is active
    if (comparisonMode) {
        showCompareButtons();
        // Ensure comparison panel is visible if tanks are selected
        if (selectedTank1 || selectedTank2) {
            comparisonPanel.style.display = 'block';
        }
    }
}

function displayVietnamTanks() {
    if (!vietnamTankGrid) {
        return;
    }
    vietnamTankGrid.innerHTML = vietnamTankDatabase.map(tank => createTankCard(tank)).join('');
    vietnamTankGrid.querySelectorAll('.tank-expand-btn').forEach(button => {
        button.addEventListener('click', e => {
            e.stopPropagation();
            const card = button.closest('.tank-card');
            expandTankCard(card);
        });
    });
    if (comparisonMode) {
        showCompareButtons();
        if (selectedTank1 || selectedTank2) {
            comparisonPanel.style.display = 'block';
        }
    }
}

// Tank expansion functionality
function expandTankCard(card) {
    // Close any other expanded cards
    const expandedCards = document.querySelectorAll('.tank-card.expanded');
    expandedCards.forEach(expandedCard => {
        if (expandedCard !== card) {
            expandedCard.classList.remove('expanded');
            const otherButton = expandedCard.querySelector('.tank-expand-btn');
            if (otherButton) {
                otherButton.classList.remove('expanded');
                otherButton.innerHTML = '<i class="fas fa-plus"></i>';
            }
        }
    });
    
    // Toggle current card
    const isExpanding = !card.classList.contains('expanded');
    card.classList.toggle('expanded');
    
    // Update button state
    const button = card.querySelector('.tank-expand-btn');
    if (button) {
        button.classList.toggle('expanded');
        if (isExpanding) {
            button.innerHTML = '<i class="fas fa-times"></i>';
            button.title = 'Collapse Details';

            // Update URL hash with tank name
            const tankName = card.querySelector('.tank-name');
            if (tankName) {
                const tankNameSlug = tankName.textContent.toLowerCase().replace(/\s+/g, '-');
                const routeGame = card.dataset.routeGame || 'wwii';
                isUpdatingHash = true;
                window.location.hash = formatAppHash('armor', routeGame, 'tanks', tankNameSlug);
            }
        } else {
            button.innerHTML = '<i class="fas fa-plus"></i>';
            button.title = 'Expand Details';
            // Reset hash to just tanks section
            const routeGame = card.dataset.routeGame || 'wwii';
            isUpdatingHash = true;
            window.location.hash = formatAppHash('armor', routeGame, 'tanks');
            // Scroll back to top when collapsing
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    }
    
    // Scroll to expanded card
    if (isExpanding) {
        card.scrollIntoView({behavior: 'smooth', block: 'start'});
    }
}

// Helper functions for detailed tank information
function getTankFigureNumber(tank) {
    if (tank.figureNumber != null && tank.figureNumber !== '') {
        return tank.figureNumber;
    }
    const allTanks = Object.values(tankDatabase).flat();
    const index = allTanks.findIndex(t => t.name === tank.name);
    return index + 1;
}

function getTurretTraverseTime(tank) {
    const traverseTimes = {
        'M4 Sherman': '12s',
        'Sherman 75 Jumbo': '13s',
        'Sherman 76 Jumbo': '13s',
        'M5A1 Stuart': '8s',
        'Greyhound': '6s',
        'Panzer IV': '12s',
        'Panther': '14s',
        'Tiger I': '16s',
        'Luchs': '6s',
        'Puma': '5s',
        'T-34': '10s',
        'IS-1': '17s',
        'T-70': '7s',
        'BA-10 Scout Car': '6s',
        'Daimler': '5s',
        'M3 Stuart \'Honey\'': '8s',
        'Tetrarch': '7s',
        'Cromwell': '11s',
        'Crusader Mk III': '10s',
        'Churchill Mk III': '16s',
        'Sherman Firefly': '12s'
    };
    return traverseTimes[tank.name] || '12s';
}

function getReloadSpeed(tank) {
    const reloadSpeeds = {
        'M4 Sherman': '6s',
        'Sherman 75 Jumbo': '6s',
        'Sherman 76 Jumbo': '7s',
        'M5A1 Stuart': '4s',
        'Greyhound': '4s',
        'Panzer IV': '6s',
        'Panther': '7s',
        'Tiger I': '8s',
        'Luchs': '3s',
        'Puma': '4s',
        'T-34': '6s',
        'IS-1': '8s',
        'T-70': '4s',
        'BA-10 Scout Car': '4s',
        'Daimler': '4s',
        'M3 Stuart \'Honey\'': '4s',
        'Tetrarch': '4s',
        'Cromwell': '6s',
        'Crusader Mk III': '5s',
        'Churchill Mk III': '6s',
        'Sherman Firefly': '7s'
    };
    return reloadSpeeds[tank.name] || '6s';
}

function getAmmunition(tank) {
    const ammoCounts = {
        'M4 Sherman': '47 AP, 50 HE',
        'Sherman 75 Jumbo': '45 AP, 48 HE',
        'Sherman 76 Jumbo': '43 AP, 46 HE',
        'M5A1 Stuart': '103 AP, 103 HE',
        'Greyhound': '80 AP, 80 HE',
        'Panzer IV': '45 AP, 48 HE',
        'Panther': '42 AP, 45 HE',
        'Tiger I': '40 AP, 44 HE',
        'Luchs': '180 AP, 180 HE',
        'Puma': '50 AP, 50 HE',
        'T-34': '47 AP, 50 HE',
        'IS-1': '38 AP, 42 HE',
        'T-70': '90 AP, 90 HE',
        'BA-10 Scout Car': '49 AP, 49 HE',
        'Daimler': '52 AP, 52 HE',
        'M3 Stuart \'Honey\'': '103 AP, 103 HE',
        'Tetrarch': '50 AP, 50 HE',
        'Cromwell': '45 AP, 48 HE',
        'Crusader Mk III': '65 AP, 65 HE',
        'Churchill Mk III': '65 AP, 65 HE',
        'Sherman Firefly': '40 AP, 44 HE'
    };
    return ammoCounts[tank.name] || '45 AP, 48 HE';
}

function getStatsDescription(tank) {
    const descriptions = {
        'M4 Sherman': 'The M4 Sherman\'s stats are well-balanced among medium tanks. It holds a good amount of ammunition and has reliable performance.',
        'Sherman 75 Jumbo': 'The Sherman 75 Jumbo\'s stats reflect its heavy tank role - slower turret traverse due to increased armor weight.',
        'Sherman 76 Jumbo': 'The Sherman 76 Jumbo\'s stats show improved firepower over the 75mm Jumbo, with slightly longer reload.',
        'M5A1 Stuart': 'The M5A1 Stuart\'s stats reflect its light tank role - fast turret traverse and quick reload, but limited ammunition.',
        'Greyhound': 'The Greyhound\'s stats are typical for an armored car - very fast turret traverse and reload, with good ammunition capacity.',
        'Panzer IV': 'The Panzer IV\'s stats are typical for a medium tank, with balanced performance across all metrics.',
        'Panther': 'The Panther\'s stats reflect its heavy tank role despite being classified as a medium tank - slower but more powerful.',
        'Tiger I': 'The Tiger I\'s stats show its heavy tank characteristics - slow turret traverse and reload, but devastating firepower.',
        'Luchs': 'The Luchs\'s stats are typical for a light tank - very fast turret traverse and reload, but limited ammunition.',
        'Puma': 'The Puma\'s stats are excellent for an armored car - very fast turret traverse and reload, with good ammunition capacity.',
        'T-34': 'The T-34\'s stats are well-balanced for a medium tank, with good mobility and reasonable reload times.',
        'IS-1': 'The IS-1\'s stats show its heavy tank characteristics - slow turret traverse and reload, but powerful gun.',
        'T-70': 'The T-70\'s stats are typical for a light tank - very fast turret traverse and reload, but limited ammunition.',
        'BA-10 Scout Car': 'The BA-10\'s stats are typical for an armored car - fast turret traverse and reload, with good ammunition capacity.',
        'Daimler': 'The Daimler\'s stats are excellent for an armored car - very fast turret traverse and reload, with good ammunition capacity.',
        'M3 Stuart \'Honey\'': 'The M3 Stuart Honey\'s stats reflect its light tank role - fast turret traverse and quick reload, but limited ammunition.',
        'Tetrarch': 'The Tetrarch\'s stats reflect its ultra-light design - fast turret traverse and reload, with minimal ammunition.',
        'Cromwell': 'The Cromwell\'s stats show excellent mobility for a medium tank, with balanced firepower and reload times.',
        'Crusader Mk III': 'The Crusader Mk III\'s stats show good anti-tank capability with reasonable reload times.',
        'Churchill Mk III': 'The Churchill Mk III\'s stats reflect its heavy tank role - slow turret traverse and reload, but excellent armor.',
        'Sherman Firefly': 'The Sherman Firefly\'s stats show excellent anti-tank capability with slightly longer reload due to the powerful 17-pounder gun.'
    };
    return descriptions[tank.name] || 'This tank\'s stats are well-balanced for its class.';
}

function getDrivingDescription(tank) {
    const descriptions = {
        'M4 Sherman': 'good mobility and turning characteristics',
        'Sherman 75 Jumbo': 'decent mobility for a heavy tank with slower turning',
        'Sherman 76 Jumbo': 'decent mobility for a heavy tank with slower turning',
        'M5A1 Stuart': 'excellent mobility and very fast turning',
        'Greyhound': 'excellent mobility and very fast turning',
        'Panzer IV': 'good mobility and turning characteristics',
        'Panther': 'excellent mobility for its size with good turning',
        'Tiger I': 'decent mobility for a heavy tank with slower turning',
        'Luchs': 'excellent mobility and very fast turning',
        'Puma': 'excellent mobility and very fast turning',
        'T-34': 'excellent mobility and good turning characteristics',
        'IS-1': 'decent mobility for a heavy tank',
        'T-70': 'excellent mobility and very fast turning',
        'BA-10 Scout Car': 'good mobility and fast turning',
        'Daimler': 'excellent mobility and very fast turning',
        'M3 Stuart \'Honey\'': 'excellent mobility and very fast turning',
        'Tetrarch': 'excellent mobility and very fast turning',
        'Cromwell': 'excellent mobility and good turning characteristics',
        'Crusader Mk III': 'good mobility and turning characteristics',
        'Churchill Mk III': 'limited mobility due to its heavy armor',
        'Sherman Firefly': 'good mobility and turning characteristics'
    };
    return descriptions[tank.name] || 'good mobility and turning characteristics';
}

function getTurnTime(tank, gear, degrees) {
    const baseTimes = {
        'reverse': {180: 12, 360: 21.5},
        '1st': {180: 12, 360: 21.5},
        '2nd': {180: 11.5, 360: 23},
        '3rd': {180: 10, 360: 21},
        '4th': {180: 6, 360: 14}
    };
    
    // Adjust based on tank type
    const multipliers = {
        'Light Tank': 0.8,
        'Medium Tank': 1.0,
        'Heavy Tank': 1.3,
        'Recon Vehicle': 0.7
    };
    
    const baseTime = baseTimes[gear][degrees];
    const multiplier = multipliers[tank.type] || 1.0;
    const adjustedTime = baseTime * multiplier;
    
    return adjustedTime.toFixed(1) + 's';
}

function getPerformanceDescription(tank) {
    const descriptions = {
        'M4 Sherman': 'The M4 Sherman shares similar turning characteristics to other medium tanks, with good 4th gear turning speed.',
        'Sherman 75 Jumbo': 'The Sherman 75 Jumbo has slower turning characteristics typical of heavy tanks, but still effective.',
        'Sherman 76 Jumbo': 'The Sherman 76 Jumbo has slower turning characteristics typical of heavy tanks, but still effective.',
        'M5A1 Stuart': 'The M5A1 Stuart has excellent turning characteristics in all gears, making it very maneuverable.',
        'Greyhound': 'The Greyhound has excellent turning characteristics typical of armored cars, with very fast turning.',
        'Panzer IV': 'The Panzer IV has good turning characteristics typical of medium tanks, with effective turning in all gears.',
        'Panther': 'The Panther has excellent turning characteristics for its size, with good turning in all gears.',
        'Tiger I': 'The Tiger I has slower turning characteristics typical of heavy tanks, but still effective.',
        'Luchs': 'The Luchs has excellent turning characteristics typical of light tanks, with very fast turning.',
        'Puma': 'The Puma has excellent turning characteristics typical of armored cars, with very fast turning.',
        'T-34': 'The T-34 has excellent turning characteristics, with good turning in all gears.',
        'IS-1': 'The IS-1 has slower turning characteristics typical of heavy tanks.',
        'T-70': 'The T-70 has excellent turning characteristics typical of light tanks, with very fast turning.',
        'BA-10 Scout Car': 'The BA-10 has good turning characteristics typical of armored cars, with fast turning.',
        'Daimler': 'The Daimler has excellent turning characteristics typical of armored cars, with very fast turning.',
        'M3 Stuart \'Honey\'': 'The M3 Stuart Honey has excellent turning characteristics in all gears, making it very maneuverable.',
        'Tetrarch': 'The Tetrarch has excellent turning characteristics typical of light tanks, with very fast turning.',
        'Cromwell': 'The Cromwell has excellent turning characteristics for a medium tank, with good turning in all gears.',
        'Crusader Mk III': 'The Crusader Mk III has good turning characteristics typical of medium tanks.',
        'Churchill Mk III': 'The Churchill Mk III has slower turning characteristics typical of heavy tanks.',
        'Sherman Firefly': 'The Sherman Firefly has good turning characteristics typical of medium tanks, with effective turning in all gears.'
    };
    return descriptions[tank.name] || 'This tank has good turning characteristics for its class.';
}

function getKillShots(tank, targetType, location) {
    const killShots = {
        'M4 Sherman': {
            'light': {'front': '1', 'side': '1', 'turret': '1', 'rear': '1', 'tracks': '>1'},
            'medium': {'front': '2', 'side': '2', 'turret': '3*', 'rear': '2', 'tracks': '7'},
            'heavy': {'front': 'R', 'side': '2', 'turret': 'R', 'rear': '2', 'tracks': '8'}
        },
        'M4A3E8 Sherman': {
            'light': {'front': '1', 'side': '1', 'turret': '1', 'rear': '1', 'tracks': '>1'},
            'medium': {'front': '2', 'side': '2', 'turret': '2', 'rear': '2', 'tracks': '6'},
            'heavy': {'front': '2*', 'side': '2', 'turret': '3*', 'rear': '2', 'tracks': '7'}
        },
        'M5A1 Stuart': {
            'light': {'front': '1*', 'side': '1', 'turret': '1', 'rear': '1*', 'tracks': '>1'},
            'medium': {'front': 'R', 'side': '2', 'turret': 'R', 'rear': '2', 'tracks': 'R'},
            'heavy': {'front': 'R', 'side': 'R', 'turret': 'R', 'rear': 'R', 'tracks': 'R'}
        },
        'M26 Pershing': {
            'light': {'front': '1', 'side': '1', 'turret': '1', 'rear': '1', 'tracks': '>1'},
            'medium': {'front': '1', 'side': '2', 'turret': '2', 'rear': '2', 'tracks': '5'},
            'heavy': {'front': '2', 'side': '2', 'turret': '2', 'rear': '2', 'tracks': '6'}
        }
    };
    
    // Default values if specific tank not found
    const defaultShots = {
        'light': {'front': '1', 'side': '1', 'turret': '1', 'rear': '1', 'tracks': '>1'},
        'medium': {'front': '2', 'side': '2', 'turret': '3*', 'rear': '2', 'tracks': '7'},
        'heavy': {'front': '2*', 'side': '2', 'turret': 'R', 'rear': '2', 'tracks': '8'}
    };
    
    const tankShots = killShots[tank.name] || defaultShots;
    return tankShots[targetType]?.[location] || '2';
}

function getBestTactics(tank) {
    const tactics = {
        'M4 Sherman': 'Use mobility to flank enemies, engage at medium range',
        'Sherman 75 Jumbo': 'Use frontal armor to lead assaults, engage at medium range',
        'Sherman 76 Jumbo': 'Use frontal armor and improved firepower, engage at medium-long range',
        'M5A1 Stuart': 'Scout and harass, avoid direct engagements with heavier tanks',
        'Greyhound': 'Scout and harass, use speed to escape danger',
        'Panzer IV': 'Use balanced approach, engage at medium range',
        'Panther': 'Use excellent gun to engage at long range, maintain distance',
        'Tiger I': 'Engage at long range, use armor to dominate',
        'Luchs': 'Scout and harass, avoid direct engagements',
        'Puma': 'Scout and harass, use speed and anti-tank capability',
        'T-34': 'Use mobility to flank, engage at medium range',
        'IS-1': 'Use armor and firepower, engage at medium range',
        'T-70': 'Scout and harass, avoid direct engagements',
        'BA-10 Scout Car': 'Scout and harass, use speed to escape danger',
        'Daimler': 'Scout and harass, use speed to escape danger',
        'M3 Stuart \'Honey\'': 'Scout and harass, avoid direct engagements with heavier tanks',
        'Tetrarch': 'Scout and harass, use speed and small size',
        'Cromwell': 'Use excellent speed to flank, engage at medium range',
        'Crusader Mk III': 'Use anti-tank capability, engage at medium range',
        'Churchill Mk III': 'Use armor to lead assaults, engage at medium range',
        'Sherman Firefly': 'Use excellent anti-tank capability, engage at long range'
    };
    return tactics[tank.name] || 'Use balanced approach based on tank type';
}

function getEngagementRange(tank) {
    const ranges = {
        'M4 Sherman': '300-800m',
        'Sherman 75 Jumbo': '400-1000m',
        'Sherman 76 Jumbo': '400-1000m',
        'M5A1 Stuart': '200-500m',
        'Greyhound': '200-400m',
        'Panzer IV': '300-800m',
        'Panther': '500-1200m',
        'Tiger I': '600-1400m',
        'Luchs': '100-300m',
        'Puma': '300-600m',
        'T-34': '300-800m',
        'IS-1': '500-1200m',
        'T-70': '200-500m',
        'BA-10 Scout Car': '200-400m',
        'Daimler': '200-400m',
        'M3 Stuart \'Honey\'': '200-500m',
        'Tetrarch': '200-400m',
        'Cromwell': '400-1000m',
        'Crusader Mk III': '300-800m',
        'Churchill Mk III': '400-1000m',
        'Sherman Firefly': '500-1200m'
    };
    return ranges[tank.name] || '300-800m';
}

// Faction filter event listeners
factionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all faction buttons
        factionBtns.forEach(b => b.classList.remove('active'));
        
        // Add active class to clicked button
        btn.classList.add('active');
        
        // Update current faction and display tanks
        currentFaction = btn.getAttribute('data-faction');
        displayTanks(currentFaction, currentTankType);
    });
});

// Tank type filter event listeners
tankTypeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all tank type buttons
        tankTypeBtns.forEach(b => b.classList.remove('active'));
        
        // Add active class to clicked button
        btn.classList.add('active');
        
        // Update current tank type and display tanks
        currentTankType = btn.getAttribute('data-tank-type');
        displayTanks(currentFaction, currentTankType);
        
        // Close dropdown after selection
        filterDropdown.classList.remove('show');
    });
});

// Filter dropdown toggle
filterToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    filterDropdown.classList.toggle('show');
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!filterToggle.contains(e.target) && !filterDropdown.contains(e.target)) {
        filterDropdown.classList.remove('show');
    }
});

// Penetration Chart with Filtering
function displayPenetrationChart() {
    const factionFilter = document.getElementById('factionFilter').value;
    const typeFilter = document.getElementById('typeFilter').value;
    const penetrationFilter = document.getElementById('penetrationFilter').value;
    
    let filteredData = penetrationData;
    
    // Apply faction filter
    if (factionFilter !== 'all') {
        filteredData = filteredData.filter(item => item.faction === factionFilter);
    }
    
    // Apply type filter
    if (typeFilter !== 'all') {
        filteredData = filteredData.filter(item => item.type === typeFilter);
    }
    
    // Apply penetration filter
    if (penetrationFilter !== 'all') {
        filteredData = filteredData.filter(item => {
            const penetrationValue = parseInt(item.penetration);
            switch (penetrationFilter) {
                case 'high':
                    return penetrationValue >= 150;
                case 'medium':
                    return penetrationValue >= 80 && penetrationValue < 150;
                case 'low':
                    return penetrationValue < 80;
                default:
                    return true;
            }
        });
    }
    
                    penetrationTableBody.innerHTML = filteredData.map(weapon => `
                    <tr>
                        <td>${weapon.tank}</td>
                        <td>${weapon.weapon}</td>
                        <td>${weapon.faction}</td>
                        <td>${weapon.type}</td>
                        <td>${weapon.range}</td>
                        <td>${weapon.penetration}</td>
                        <td>${weapon.effectiveAgainst}</td>
                        <td>${weapon.shotsToKill}</td>
                    </tr>
                `).join('');
}

// Add event listeners for filters
function initializePenetrationFilters() {
    const filters = document.querySelectorAll('.penetration-filter');
    filters.forEach(filter => {
        filter.addEventListener('change', displayPenetrationChart);
    });
}

// Identification Practice
let currentPracticeTank = null;
let practiceTanks = [];
let correctAnswers = 0;
let hasTriggeredFirstBlood = false;
let currentDifficulty = 'easy'; // Default difficulty
let difficultyTankGroups = {}; // Will store tanks grouped by difficulty
let currentImageAngle = '2'; // Track current image angle for answer reveal
let lastPracticeTank = null; // Track last used tank to prevent duplicates

function initializePracticeTanks() {
    // Use all tanks from the database that have 360 view images
    
    // Clear existing arrays
    practiceTanks = [];
    
    Object.values(tankDatabase).forEach(factionTanks => {
        factionTanks.forEach(tank => {
            if (tank.has360View && tank.images360) {
                practiceTanks.push(tank);
            }
        });
    });
    
    // Group tanks by difficulty
    groupTanksByDifficulty();
    
}

function groupTanksByDifficulty() {
    // Note: These groups are now primarily used for home image selection
    // Practice questions use different logic based on difficulty mode
    
    // Filter out SPAs for easy and medium modes
    const nonSPATanks = practiceTanks.filter(tank => tank.type !== 'SPA (Self Propelled Artillery)');
    
    // Easy: Mix of different tank types and factions (no SPAs)
    difficultyTankGroups.easy = [...nonSPATanks];
    
    // Medium: Group similar tank types together (no SPAs)
    difficultyTankGroups.medium = [];
    const tankTypes = ['Heavy Tank', 'Medium Tank', 'Light Tank', 'Recon Vehicle'];
    
    tankTypes.forEach(type => {
        const typeTanks = nonSPATanks.filter(tank => tank.type === type);
        if (typeTanks.length >= 2) {
            // Add 2-3 tanks of the same type for medium difficulty
            const selectedTanks = typeTanks.slice(0, Math.min(3, typeTanks.length));
            difficultyTankGroups.medium.push(...selectedTanks);
        }
    });
    
    // Hard: Include ALL tanks from all factions including SPAs for maximum variety
    // Note: This group is now used for home image selection only
    // Practice questions for Hard mode use ALL tanks from practiceTanks
    difficultyTankGroups.hard = [...practiceTanks];
}

function setDifficulty(difficulty) {
    currentDifficulty = difficulty;
    
    // Update active button
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-difficulty="${difficulty}"]`).classList.add('active');
    
    // Reinitialize practice tanks with new difficulty
    initializePracticeTanks();
    
    // Clear only the practice options, not the tank image
    const practiceOptions = document.getElementById('practiceOptions');
    if (practiceOptions) practiceOptions.innerHTML = '';
    
    // Update home image based on difficulty (after clearing options)
    updateHomeImage(difficulty);
}

function updateHomeImage(difficulty) {
    const practiceTankImage = document.getElementById('practiceTankImage');
    if (!practiceTankImage) return;
    
    let selectedTank = null;
    let imageNumber = '2'; // Always use image 2 for home display
    
    switch (difficulty) {
        case 'easy':
            // Find M5A1 Stuart tank specifically
            selectedTank = practiceTanks.find(tank => tank.name === 'M5A1 Stuart');
            break;
        case 'medium':
            // Find M4 Sherman specifically
            selectedTank = practiceTanks.find(tank => tank.name === 'M4 Sherman');
            break;
        case 'hard':
            // Find Sherman 76 Jumbo specifically
            selectedTank = practiceTanks.find(tank => tank.name === 'Sherman 76 Jumbo');
            break;
    }
    if (selectedTank && selectedTank.images360) {
        const imageHTML = `
            <img src="${selectedTank.images360.prefix}${imageNumber}${selectedTank.images360.suffix}?v=${buildVersion}" 
                 alt="Tank to identify" 
                 loading="lazy"
                 style="max-width: 100%; height: auto;">
        `;
        practiceTankImage.innerHTML = imageHTML;
    } else {
        // Fallback to generic placeholder
        practiceTankImage.innerHTML = '<img src="" alt="Tank to identify">';
    }
}

function startNewPractice() {
    // Get tanks for current difficulty based on mode requirements
    let availableTanks;
    if (currentDifficulty === 'easy') {
        // Easy mode: Use half of all tanks (excluding SPAs), only image 2
        const nonSPATanks = practiceTanks.filter(tank => tank.type !== 'SPA (Self Propelled Artillery)');
        availableTanks = nonSPATanks.slice(0, Math.ceil(nonSPATanks.length / 2));
    } else if (currentDifficulty === 'medium') {
        // Medium mode: Use all tanks (excluding SPAs), only image 2
        availableTanks = practiceTanks.filter(tank => tank.type !== 'SPA (Self Propelled Artillery)');
    } else if (currentDifficulty === 'hard') {
        // Hard mode: Use ALL tanks from all factions/types including SPAs, all image angles
        availableTanks = practiceTanks;
    }
    
    if (availableTanks.length === 0) {
        initializePracticeTanks();
        return;
    }
    
    // Select random tank, ensuring no duplicate from last practice
    let selectedTank;
    let attempts = 0;
    const maxAttempts = 50; // Prevent infinite loops
    
    do {
        const randomIndex = Math.floor(Math.random() * availableTanks.length);
        selectedTank = availableTanks[randomIndex];
        attempts++;
        
        // If we've tried too many times, just use the current selection
        if (attempts >= maxAttempts) {
            break;
        }
    } while (lastPracticeTank && selectedTank.name === lastPracticeTank.name);
    
    currentPracticeTank = selectedTank;
    lastPracticeTank = selectedTank; // Update for next practice
    
    // Create practice options based on difficulty
    const options = [currentPracticeTank.name];
    let otherTanks = availableTanks.filter(tank => tank.name !== currentPracticeTank.name);
    
    // For hard mode, try to include tanks of the same type/faction for more challenge
    if (currentDifficulty === 'hard') {
        const sameTypeTanks = availableTanks.filter(tank => 
            tank.type === currentPracticeTank.type && tank.name !== currentPracticeTank.name
        );
        if (sameTypeTanks.length > 0) {
            otherTanks = sameTypeTanks;
        }
    }
    
    // Add wrong answers
    for (let i = 0; i < 3; i++) {
        if (otherTanks.length > 0) {
        const randomTank = otherTanks[Math.floor(Math.random() * otherTanks.length)];
            if (!options.includes(randomTank.name)) {
                options.push(randomTank.name);
            }
        }
    }
    
    // If we don't have enough options, add some from the general pool
    while (options.length < 4 && practiceTanks.length > options.length) {
        const randomTank = practiceTanks[Math.floor(Math.random() * practiceTanks.length)];
        if (!options.includes(randomTank.name)) {
            options.push(randomTank.name);
        }
    }
    
    // Shuffle options
    options.sort(() => Math.random() - 0.5);
    
    // Choose image based on difficulty
    let imageNumber;
    if (currentDifficulty === 'easy' || currentDifficulty === 'medium') {
        // Easy and Medium modes: Always use image 2
        imageNumber = '2';
    } else if (currentDifficulty === 'hard') {
        // Hard mode: Randomly choose from different angles (1-7, since some tanks only have 0-7)
        const possibleAngles = ['1', '2', '3', '4', '5', '6', '7'];
        imageNumber = possibleAngles[Math.floor(Math.random() * possibleAngles.length)];
    }
    
    // Store the current image angle for answer reveal
    currentImageAngle = imageNumber;
    
    // Use selected image from the 360 viewer for practice identification
    const images360 = currentPracticeTank.images360;
    const imageHTML = `
        <img src="${images360.prefix}${imageNumber}${images360.suffix}?v=${buildVersion}" 
             alt="${currentPracticeTank.name} - Practice" 
             loading="lazy"
             style="max-width: 100%; height: auto; filter: brightness(0) contrast(100%);"
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
        >
        <div style="display: none; align-items: center; justify-content: center; height: 100%; color: var(--text-secondary); font-style: italic;">
            <i class="${currentPracticeTank.icon}" style="font-size: 3rem; margin-right: 1rem;"></i>
            <span>Practice Image Not Available</span>
        </div>
    `;
    
    practiceTankImage.innerHTML = imageHTML;
    
    practiceOptions.innerHTML = options.map(option => 
        `<button class="practice-option" onclick="checkAnswer('${option.replace(/'/g, "\\'")}')">${option}</button>`
    ).join('');
}

// Helper function to get the correct folder name for each tank
function getTankFolderName(tankName) {
    const folderMap = {
        'M4 Sherman': 'm4-sherman',
        'Sherman 75 Jumbo': 'sherman-75-jumbo',
        'Sherman 76 Jumbo': 'sherman-76-jumbo',
        'M5A1 Stuart': 'm5a1-stuart',
        'Greyhound': 'greyhound',
        'Panzer IV': 'panzer-iv',
        'Panther': 'panther',
        'Tiger I': 'tiger-i',
        'Luchs': 'luchs',
        'Puma': 'puma',
        'T-34': 't-34',
        'IS-1': 'is-1',
        'T-70': 't-70',
        'BA-10 Scout Car': 'ba-10-scout-car',
        'Daimler': 'daimler',
        "M3 Stuart 'Honey'": 'm3-stuart-honey',
        'Tetrarch': 'tetrarch',
        'Cromwell': 'cromwell',
                 'Crusader Mk III': 'crusader-mk-iii',
         'Sherman Firefly': 'sherman-firefly'
    };
    
    return folderMap[tankName] || tankName.toLowerCase().replace(/\s+/g, '-');
}

function checkAnswer(selectedAnswer) {
    const isCorrect = selectedAnswer === currentPracticeTank.name;
    
    if (isCorrect) {
        correctAnswers++;
        
        // Check for FIRST BLOOD achievement!
        if (correctAnswers === 1 && !hasTriggeredFirstBlood) {
            hasTriggeredFirstBlood = true;
            triggerFirstBloodCelebration();
        }
    }
    
    const resultMessage = isCorrect ? 
        `<p style="color: var(--success); font-weight: bold;">Correct! That's a ${currentPracticeTank.name}.</p>` :
        `<p style="color: var(--error); font-weight: bold;">Incorrect. That's actually a ${currentPracticeTank.name}.</p>`;
    
              // Show the original image (not silhouette) when revealing the answer
    // Use the same image angle that was used in the practice
    const originalImage = `${currentPracticeTank.images360.prefix}${currentImageAngle}${currentPracticeTank.images360.suffix}?v=${buildVersion}`;
    
    practiceTankImage.innerHTML = `
        <img src="${originalImage}" 
             alt="${currentPracticeTank.name}" 
             loading="lazy"
             style="max-width: 100%; height: auto;">
    `;
    
    practiceOptions.innerHTML = `
        <div style="grid-column: 1 / -1;">
            ${resultMessage}
            <p><strong>Faction:</strong> ${currentPracticeTank.faction}</p>
            <p><strong>Type:</strong> ${currentPracticeTank.type}</p>
            <p><strong>Gun:</strong> ${currentPracticeTank.gun}</p>
            <p><strong>Correct Answers:</strong> ${correctAnswers}</p>
            <button class="calculate-btn" onclick="startNewPractice()" style="margin-top: 1rem;">Next Tank</button>
        </div>
    `;
}

function triggerFirstBloodCelebration() {
    
    // Create the celebration overlay
    const celebration = document.createElement('div');
    celebration.id = 'first-blood-celebration';
    celebration.innerHTML = `
        <div class="celebration-content">
            <div class="achievement-popup">
                <div class="achievement-icon">🎯</div>
                <h2>FIRST BLOOD!</h2>
                <p>You've identified your first tank!</p>
                <div class="achievement-stats">
                    <span>🏆 Achievement Unlocked</span>
                    <span>⚡ +100 XP</span>
                </div>
            </div>
        </div>
        <div class="explosion-particles"></div>
        <div class="confetti-container"></div>
        <div class="screen-flash"></div>
        <div class="tank-explosion"></div>
        <div class="matrix-rain"></div>
    `;
    
    document.body.appendChild(celebration);
    
    // Trigger all the crazy effects
    triggerScreenShake();
    createExplosionParticles();
    createConfetti();
    triggerScreenFlash();
    createTankExplosion();
    createMatrixRain();
    playVictorySound();
    
    // Remove everything after 5 seconds
    setTimeout(() => {
        if (document.getElementById('first-blood-celebration')) {
            document.body.removeChild(celebration);
        }
    }, 5000);
}

function triggerScreenShake() {
    document.body.style.animation = 'screenShake 0.5s ease-in-out';
    setTimeout(() => {
        document.body.style.animation = '';
    }, 500);
}

function createExplosionParticles() {
    const particles = document.querySelector('.explosion-particles');
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'explosion-particle';
        const randomX = (Math.random() - 0.5) * 200;
        const randomY = (Math.random() - 0.5) * 200;
        particle.style.cssText = `
            position: absolute;
            width: 4px;
            height: 4px;
            background: linear-gradient(45deg, #ff4444, #ff8800, #ffff00);
            border-radius: 50%;
            left: 50%;
            top: 50%;
            animation: explode 1s ease-out forwards;
            animation-delay: ${Math.random() * 0.3}s;
            --random-x: ${randomX}px;
            --random-y: ${randomY}px;
        `;
        particles.appendChild(particle);
    }
}

function createConfetti() {
    const confetti = document.querySelector('.confetti-container');
    const colors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff'];
    const shapes = ['🎯', '💥', '🔥', '⚡', '🏆', '🎖️'];
    
    for (let i = 0; i < 100; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.textContent = shapes[Math.floor(Math.random() * shapes.length)];
        piece.style.cssText = `
            position: absolute;
            font-size: 20px;
            left: ${Math.random() * 100}%;
            top: -50px;
            animation: confettiFall 3s linear forwards;
            animation-delay: ${Math.random() * 2}s;
            z-index: 1001;
        `;
        confetti.appendChild(piece);
    }
}

function triggerScreenFlash() {
    const flash = document.querySelector('.screen-flash');
    flash.style.animation = 'screenFlash 0.3s ease-out';
}

function createTankExplosion() {
    const explosion = document.querySelector('.tank-explosion');
    explosion.innerHTML = `
        <div class="explosion-fire"></div>
        <div class="explosion-smoke"></div>
        <div class="explosion-debris"></div>
    `;
    explosion.style.animation = 'tankExplosion 2s ease-out';
}

function createMatrixRain() {
    const matrix = document.querySelector('.matrix-rain');
    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    
    for (let i = 0; i < 20; i++) {
        const column = document.createElement('div');
        column.className = 'matrix-column';
        column.style.cssText = `
            position: absolute;
            left: ${Math.random() * 100}%;
            top: -100%;
            color: #00ff00;
            font-family: monospace;
            font-size: 20px;
            animation: matrixFall 2s linear forwards;
            animation-delay: ${Math.random() * 1}s;
        `;
        
        for (let j = 0; j < 10; j++) {
            const char = document.createElement('div');
            char.textContent = chars[Math.floor(Math.random() * chars.length)];
            char.style.animationDelay = `${j * 0.1}s`;
            column.appendChild(char);
        }
        
        matrix.appendChild(column);
    }
}

function playVictorySound() {
    // Play the victory sound
    const audio = document.getElementById('victorySound');
    if (audio) {
        audio.currentTime = 0;
        audio.volume = 0.6;

    }
}

// Global background state (WWII tank grid: grass / snow / desert)
let globalBackground = 'desert'; // Default background

/** Vietnam armor tank strip: backdrops from site-root Vietnam/ (same art as infantry overview). */
let globalVietnamBackground = 'house';

const VIETNAM_TANK_BACKDROPS = [
    { key: 'house', file: 'Vietnam/1920x1080_House.webp', title: 'House backdrop', icon: 'fa-building' },
    { key: 'jungle', file: 'Vietnam/1920x1080_Jungle.webp', title: 'Jungle backdrop', icon: 'fa-tree' },
    { key: 'camp', file: 'Vietnam/1920x1080_Camp.webp', title: 'Camp backdrop', icon: 'fa-campground' },
    { key: 'village', file: 'Vietnam/1920x1080_Village.webp', title: 'Village backdrop', icon: 'fa-home' }
];

// Background switching functionality
function initializeBackgroundSwitching() {
    const vnBgClasses = VIETNAM_TANK_BACKDROPS.map(b => `bg-vn-${b.key}`);
    const wwiiBgClasses = ['bg-grass', 'bg-snow', 'bg-desert'];

    document.addEventListener('click', e => {
        if (e.target.closest('.bg-btn')) {
            e.preventDefault();
            e.stopPropagation();

            const button = e.target.closest('.bg-btn');
            const bgSet = button.dataset.bgSet || 'wwii';
            const backgroundType = button.dataset.background;
            if (!backgroundType) {
                return;
            }

            if (bgSet === 'vietnam') {
                globalVietnamBackground = backgroundType;
                document.querySelectorAll('#vietnamTankGrid .tank-image').forEach(tankImage => {
                    vnBgClasses.forEach(c => tankImage.classList.remove(c));
                    tankImage.classList.add(`bg-vn-${backgroundType}`);
                    tankImage.querySelectorAll('.bg-btn').forEach(btn => {
                        btn.classList.remove('active');
                        if (btn.dataset.bgSet === 'vietnam' && btn.dataset.background === backgroundType) {
                            btn.classList.add('active');
                        }
                    });
                });
                return;
            }

            globalBackground = backgroundType;

            document.querySelectorAll('#tankGrid .tank-image').forEach(tankImage => {
                wwiiBgClasses.forEach(c => tankImage.classList.remove(c));
                tankImage.classList.add(`bg-${backgroundType}`);
                tankImage.querySelectorAll('.bg-btn').forEach(btn => {
                    btn.classList.remove('active');
                    if ((btn.dataset.bgSet || 'wwii') === 'wwii' && btn.dataset.background === backgroundType) {
                        btn.classList.add('active');
                    }
                });
            });
        }
    });
}

// Hash Routing System
let isUpdatingHash = false;

function initializeHashRouting() {
    // Handle hash changes (back/forward button or direct hash change)
    window.addEventListener('hashchange', handleHashChange);

    // Handle initial page load with hash
    handleHashChange();
}

function handleHashChange() {
    if (isUpdatingHash) {
        isUpdatingHash = false;
        return;
    }

    const hash = window.location.hash.substring(1);
    const route = parseAppHash(hash);

    if (!route) {
        syncViewToRoute(
            { hub: 'armor', game: 'wwii', section: 'overview', subRoute: null },
            { updateHash: true }
        );
        return;
    }

    if (
        !INFANTRY_CLASSES_ENABLED &&
        route.hub === 'infantry' &&
        route.game === 'wwii' &&
        route.section === 'classes'
    ) {
        syncViewToRoute(
            { hub: 'infantry', game: 'wwii', section: 'overview', subRoute: null },
            { updateHash: true }
        );
        return;
    }

    if (route.hub === 'armor' && route.game === 'vietnam' && !ARMOR_VIETNAM_SECTIONS.includes(route.section)) {
        syncViewToRoute(
            { hub: 'armor', game: 'vietnam', section: 'overview', subRoute: null },
            { updateHash: true }
        );
        return;
    }

    if (route.hub === 'infantry' && route.game === 'vietnam' && !INFANTRY_VIETNAM_SECTIONS.includes(route.section)) {
        syncViewToRoute(
            { hub: 'infantry', game: 'vietnam', section: 'overview', subRoute: null },
            { updateHash: true }
        );
        return;
    }

    syncViewToRoute(route, { updateHash: false });

    if (route.hub === 'armor' && (route.game === 'wwii' || route.game === 'vietnam') && route.subRoute) {
        setTimeout(() => {
            handleSubRoute(route.section, route.subRoute);
        }, 300);
    }
}

function handleSubRoute(section, subRoute) {
    if (section === 'tanks') {
        // Find and expand the tank card
        expandTankByName(subRoute);
    } else if (section === 'ranging') {
        // Check if it's a special ranging tool or a tank scope
        if (subRoute === 'artillery') {
            expandArtilleryCalculator();
        } else if (subRoute === 'spa') {
            expandSPACalculator();
        } else if (subRoute === 'armor-sights') {
            expandArmorSights();
        } else {
            // Open the scope view for the tank (updateHash = false to avoid loop)
            openScopeView(subRoute, false);
        }
    }
}

function expandArtilleryCalculator() {
    const rangingTools = document.querySelectorAll('.ranging-tool');
    rangingTools.forEach(tool => {
        const title = tool.querySelector('h3');
        if (title && title.textContent.includes('Artillery Calculator')) {
            expandTile(tool, false);
        }
    });
}

function expandSPACalculator() {
    const rangingTools = document.querySelectorAll('.ranging-tool');
    rangingTools.forEach(tool => {
        const title = tool.querySelector('h3');
        if (title && title.textContent.includes('SPA Calculator')) {
            expandTile(tool, false);
        }
    });
}

function expandArmorSights() {
    const rangingTools = document.querySelectorAll('.ranging-tool');
    rangingTools.forEach(tool => {
        const title = tool.querySelector('h3');
        if (title && title.textContent.includes('Armor Sights')) {
            expandTile(tool, false);

            // Set default active states for filters
            const factionBtns = tool.querySelectorAll('.faction-filter-btn');
            const typeBtns = tool.querySelectorAll('.type-filter-btn');

            // Remove active from all faction buttons and set "All" as active
            factionBtns.forEach(btn => btn.classList.remove('active'));
            const allFactionBtn = tool.querySelector('.faction-filter-btn[data-faction="all"]');
            if (allFactionBtn) allFactionBtn.classList.add('active');

            // Remove active from all type buttons and set "All Types" as active
            typeBtns.forEach(btn => btn.classList.remove('active'));
            const allTypeBtn = tool.querySelector('.type-filter-btn[data-tank-type="all"]');
            if (allTypeBtn) allTypeBtn.classList.add('active');
        }
    });
}

function expandTankByName(tankName) {
    // Normalize the tank name (replace hyphens with spaces and match case-insensitive)
    const normalizedName = tankName.replace(/-/g, ' ');

    const activeSection = document.querySelector('.section.active');
    const tankCards = activeSection
        ? activeSection.querySelectorAll('.tank-card')
        : document.querySelectorAll('.tank-card');
    tankCards.forEach(card => {
        const cardTankName = card.querySelector('.tank-name');
        if (cardTankName && cardTankName.textContent.toLowerCase() === normalizedName.toLowerCase()) {
            expandTankCard(card);
        }
    });
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    loadTankData()
        .then(() => {
            initializeTankDataViews();
        })
        .catch(() => {
            const tankGrid = document.getElementById('tankGrid');
            if (tankGrid) {
                tankGrid.innerHTML =
                    '<p class="tank-data-error">Could not load tank data. Please refresh the page.</p>';
            }
        });
    // Don't start practice immediately - let user select difficulty first
    // Initialize background switching functionality
    initializeBackgroundSwitching();
    
    // Initialize comparison functionality
    initializeComparison();

    // Initialize hash routing
    initializeHashRouting();

    initSpreadDemocracy();
    initVietnamLaunchWidget();

    document.querySelectorAll('.hub-switch-btn[data-hub]').forEach(btn => {
        btn.addEventListener('click', () => {
            const hub = btn.getAttribute('data-hub');
            const raw = window.location.hash.substring(1);
            const parsed = parseAppHash(raw);
            const game =
                parsed && (parsed.game === 'wwii' || parsed.game === 'vietnam')
                    ? parsed.game
                    : 'wwii';
            if (hub === 'armor') {
                window.location.hash = formatAppHash('armor', game, 'overview');
            } else if (hub === 'infantry') {
                window.location.hash = formatAppHash('infantry', game, 'overview');
            }
        });
    });
});

// Debug function to check comparison elements
function debugComparisonElements() {
}

// Initialize comparison functionality
function initializeComparison() {

    // Add event listeners for comparison
    if (compareToggle) {
        compareToggle.addEventListener('click', toggleComparisonMode);

    } else {

    }

    if (closeComparison) {
        closeComparison.addEventListener('click', () => {
            comparisonMode = false;
            compareToggle.classList.remove('active');
            comparisonPanel.style.display = 'none';
            hideCompareButtons();
            resetComparison();
        });

    } else {

    }

    if (clearComparison) {
        clearComparison.addEventListener('click', () => {
            resetComparison();
            // Remove selected state from all compare buttons
            document.querySelectorAll('.compare-btn.selected').forEach(btn => {
                btn.classList.remove('selected');
            });
        });

    } else {

    }

}

// Smooth scrolling is handled by the showSection function

// Add keyboard navigation support
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        // Reset to overview section
        showSection('overview');
    }
    
    // Handle arrow keys for 360 viewer rotation
    // Check if any 360 viewer is currently visible
    const activeViewer = document.querySelector('.tank-360-viewer');
    if (activeViewer && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault(); // Prevent default scrolling
        const tankId = activeViewer.getAttribute('data-tank-id');
        if (tankId) {
            const direction = e.key === 'ArrowLeft' ? -1 : 1;
            rotateTank(tankId, direction);
        }
    }
});

// Add loading animation
window.addEventListener('load', () => {
    document.body.style.opacity = '1';
    // Ensure page starts at top on initial load
    window.scrollTo(0, 0);
});

// Add responsive behavior for mobile devices
function handleMobileNavigation() {
    const nav = document.querySelector('.nav-list');
    if (window.innerWidth <= 768) {
        nav.style.flexDirection = 'column';
    } else {
        nav.style.flexDirection = 'row';
    }
}

window.addEventListener('resize', handleMobileNavigation);
handleMobileNavigation(); // Initial call

function scheduleWhenIdle(callback, timeout = 2000) {
    if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(() => {
            callback();
        }, { timeout });
    } else {
        setTimeout(callback, 1);
    }
}

function runAfterNextPaint(task) {
    requestAnimationFrame(() => {
        requestAnimationFrame(task);
    });
}

/** Mobile fullscreen: show live mills above inputs; scroll result into view before refocus so the keyboard doesn’t hide it. */
function focusCalcDistanceWithResultVisible(liveResultEl, distInput) {
    const run = () => {
        if (!distInput) {
            return;
        }
        distInput.value = '';
        distInput.focus();
        distInput.select();
    };
    const narrow = typeof window !== 'undefined' && window.innerWidth <= 768;
    if (narrow && liveResultEl && document.body.classList.contains('fullscreen-mode')) {
        liveResultEl.scrollIntoView({ block: 'start', behavior: 'instant' });
        runAfterNextPaint(run);
        return;
    }
    run();
}

// Artillery Calculator Functionality
document.addEventListener('DOMContentLoaded', function () {
    const artyCalculateBtn = document.getElementById('artyCalculateBtn');
    const artyDistance = document.getElementById('artyDistance');
    const artyFaction = document.getElementById('artyFaction');
    const artyResultsBody = document.getElementById('artyResultsBody');
    
    if (artyCalculateBtn) {
        artyCalculateBtn.addEventListener('click', calculateArtillery);
    }
    
    // Add Enter key functionality to the distance input
    if (artyDistance) {
        artyDistance.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                event.preventDefault(); // Prevent form submission
                calculateArtillery();
            }
        });
    }
    
    // Load saved results from localStorage (defer to idle time — improves INP / main-thread work)
    scheduleWhenIdle(() => loadArtilleryResults());

    const vnMortarCalculateBtn = document.getElementById('vnMortarCalculateBtn');
    const vnMortarDistance = document.getElementById('vnMortarDistance');
    if (vnMortarCalculateBtn) {
        vnMortarCalculateBtn.addEventListener('click', calculateVietnamMortarSquad);
    }
    if (vnMortarDistance) {
        vnMortarDistance.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                calculateVietnamMortarSquad();
            }
        });
    }
    scheduleWhenIdle(() => loadVietnamMortarSquadResults());
});

function calculateArtillery() {
    const distance = parseInt(document.getElementById('artyDistance').value);
    const faction = document.getElementById('artyFaction').value;
    
    if (!distance || distance <= 0) {
        alert('Please enter a valid distance');
        return;
    }
    
    try {
        // Calculate artillery result using the new calculation system
        const result = calculateArtilleryResult(distance, faction);
        
        // Save the result
        saveArtilleryResult(distance, result, faction);
        
        runAfterNextPaint(() => {
            displayRecentCalculation(result, distance, faction);
            const distInput = document.getElementById('artyDistance');
            const liveEl = document.getElementById('recentCalculation');
            focusCalcDistanceWithResultVisible(liveEl, distInput);
            loadArtilleryResults();
        });
    } catch (error) {
        alert(error.message);
    }
}

function calculateArtilleryResult(distance, faction) {
    // Artillery calculation using faction-specific coefficients
    const xMin = 100;
    const xMax = 1600;
    
    // Check distance bounds
    if (distance < xMin || distance > xMax) {
        throw new Error(`Enter a distance between ${xMin} and ${xMax} meters`);
    }
    
    // Faction-specific calculation coefficients
    const options = {
        'soviet': {
            m: -0.2136691176,
            b: 1141.7215,
        },
        'german': {
            m: -0.237035714285714,
            b: 1001.46547619048,
        },
        'british': {
            m: -0.1773,
            b: 550.69,
        },
        'usa': {
            m: -0.237035714285714, // Using German coefficients for USA (same as allies)
            b: 1001.46547619048,
        }
    };
    
    const factionOptions = options[faction];
    if (!factionOptions) {
        throw new Error('Invalid faction selected');
    }
    
    // Calculate using the formula: result = m * distance + b
    const {m, b} = factionOptions;
    const result = Math.round(m * distance + b);
    
    // Format the result for display with mills as the focal point
    return `${result} mills`;
}

function saveArtilleryResult(distance, result, faction) {
    let results = JSON.parse(localStorage.getItem('artilleryResults') || '[]');
    
    const newResult = {
        id: Date.now(),
        distance: distance,
        result: result,
        faction: faction,
        timestamp: new Date().toLocaleString()
    };
    
    // Add new result at the beginning (newest first)
    results.unshift(newResult);
    
    // Keep only the last 3 results
    if (results.length > 3) {
        results = results.slice(0, 3);
    }
    
    localStorage.setItem('artilleryResults', JSON.stringify(results));
}

function loadArtilleryResults() {
    const artyResultsBody = document.getElementById('artyResultsBody');
    if (!artyResultsBody) return;
    
    const results = JSON.parse(localStorage.getItem('artilleryResults') || '[]');
    
    // Update the recent calculation display if there are results
    if (results.length > 0) {
        const mostRecent = results[0]; // First result is the most recent due to unshift()
        displayRecentCalculation(mostRecent.result, mostRecent.distance, mostRecent.faction);
    } else {
        // Reset the recent calculation display
        const recentCalculationDiv = document.getElementById('recentCalculation');
        if (recentCalculationDiv) {
            recentCalculationDiv.innerHTML = '<p>No calculation performed yet</p>';
        }
    }
    
    if (results.length === 0) {
        artyResultsBody.innerHTML = '<tr class="no-results"><td colspan="4">No calculations saved yet</td></tr>';
        return;
    }
    
    let html = '';
    results.forEach(result => {
        // Extract the mills value from the result string for emphasis
        const millsMatch = result.result.match(/^(\d+)\s+mills/);
        const millsValue = millsMatch ? millsMatch[1] : '';
        
        html += `
            <tr>
                <td><strong style="color: var(--accent);">${millsValue} mills</strong></td>
                <td>${result.distance}m</td>
                <td>${getFactionDisplayName(result.faction)}</td>
                <td><button class="delete-btn" onclick="deleteArtilleryResult(${result.id})">Delete</button></td>
            </tr>
        `;
    });
    
    artyResultsBody.innerHTML = html;
}

function deleteArtilleryResult(id) {
    let results = JSON.parse(localStorage.getItem('artilleryResults') || '[]');
    results = results.filter(result => result.id !== id);
    localStorage.setItem('artilleryResults', JSON.stringify(results));
    loadArtilleryResults(); // This will also update the recent calculation display
}

function getFactionDisplayName(faction) {
    const factionNames = {
        'usa': 'USA',
        'german': 'Germany',
        'soviet': 'Soviet Union',
        'british': 'Great Britain'
    };
    return factionNames[faction] || faction;
}

function displayRecentCalculation(result, distance, faction) {
    const recentCalculationDiv = document.getElementById('recentCalculation');
    if (!recentCalculationDiv) return;
    
    // Extract the mills value from the result
    const millsMatch = result.match(/^(\d+)\s+mills/);
    const millsValue = millsMatch ? millsMatch[1] : '';
    
    // Display the most recent calculation prominently
    recentCalculationDiv.innerHTML = `
        <div class="recent-result">
            <span class="mills-value">${millsValue} mills</span>
            <span class="calculation-details">${getFactionDisplayName(faction)} Artillery at ${distance}m</span>
        </div>
    `;
}

const VIETNAM_MORTAR_STORAGE_KEY = 'vietnamMortarSquadResults';

function calculateVietnamMortarSquadResult(distance) {
    const xMin = 100;
    const xMax = 450;
    if (distance < xMin || distance > xMax) {
        throw new Error(`Enter a distance between ${xMin} and ${xMax} meters`);
    }
    const mills = Math.round(109.466 - 0.243359 * distance);
    return `${mills} mills`;
}

function calculateVietnamMortarSquad() {
    const input = document.getElementById('vnMortarDistance');
    const distance = parseInt(input && input.value, 10);
    if (!input || !input.value.trim() || !distance || distance <= 0) {
        alert('Please enter a valid distance');
        return;
    }
    try {
        const result = calculateVietnamMortarSquadResult(distance);
        saveVietnamMortarSquadResult(distance, result);
        runAfterNextPaint(() => {
            displayRecentVietnamMortarCalculation(result, distance);
            const liveEl = document.getElementById('recentVietnamMortarCalculation');
            focusCalcDistanceWithResultVisible(liveEl, input);
            loadVietnamMortarSquadResults();
        });
    } catch (error) {
        alert(error.message);
    }
}

function saveVietnamMortarSquadResult(distance, result) {
    let results = JSON.parse(localStorage.getItem(VIETNAM_MORTAR_STORAGE_KEY) || '[]');
    const newResult = {
        id: Date.now(),
        distance: distance,
        result: result,
        timestamp: new Date().toLocaleString()
    };
    results.unshift(newResult);
    if (results.length > 3) {
        results = results.slice(0, 3);
    }
    localStorage.setItem(VIETNAM_MORTAR_STORAGE_KEY, JSON.stringify(results));
}

function loadVietnamMortarSquadResults() {
    const tbody = document.getElementById('vnMortarResultsBody');
    if (!tbody) {
        return;
    }
    const results = JSON.parse(localStorage.getItem(VIETNAM_MORTAR_STORAGE_KEY) || '[]');
    if (results.length > 0) {
        displayRecentVietnamMortarCalculation(results[0].result, results[0].distance);
    } else {
        const recentDiv = document.getElementById('recentVietnamMortarCalculation');
        if (recentDiv) {
            recentDiv.innerHTML = '<p>No calculation performed yet</p>';
        }
    }
    if (results.length === 0) {
        tbody.innerHTML = '<tr class="no-results"><td colspan="3">No calculations saved yet</td></tr>';
        return;
    }
    let html = '';
    results.forEach(entry => {
        const millsMatch = entry.result.match(/^(-?\d+)\s+mills/);
        const millsValue = millsMatch ? millsMatch[1] : '';
        html += `
            <tr>
                <td><strong style="color: var(--accent);">${millsValue} mills</strong></td>
                <td>${entry.distance}m</td>
                <td><button class="delete-btn" onclick="deleteVietnamMortarSquadResult(${entry.id})">Delete</button></td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function deleteVietnamMortarSquadResult(id) {
    let results = JSON.parse(localStorage.getItem(VIETNAM_MORTAR_STORAGE_KEY) || '[]');
    results = results.filter(r => r.id !== id);
    localStorage.setItem(VIETNAM_MORTAR_STORAGE_KEY, JSON.stringify(results));
    loadVietnamMortarSquadResults();
}

function displayRecentVietnamMortarCalculation(result, distance) {
    const recentCalculationDiv = document.getElementById('recentVietnamMortarCalculation');
    if (!recentCalculationDiv) {
        return;
    }
    const millsMatch = result.match(/^(-?\d+)\s+mills/);
    const millsValue = millsMatch ? millsMatch[1] : '';
    recentCalculationDiv.innerHTML = `
        <div class="recent-result">
            <span class="mills-value">${millsValue} mills</span>
            <span class="calculation-details">Mortar Calculator (US &amp; NVA) at ${distance}m</span>
        </div>
    `;
}

// SPA Calculator Functionality
document.addEventListener('DOMContentLoaded', function () {
    const spaCalculateBtn = document.getElementById('spaCalculateBtn');
    const spaDistance = document.getElementById('spaDistance');
    const spaTerrainAdjustment = document.getElementById('spaTerrainAdjustment');
    const spaType = document.getElementById('spaType');
    const spaResultsBody = document.getElementById('spaResultsBody');
    const spaAdjustmentToggle = document.getElementById('spaAdjustmentToggle');
    
    if (spaCalculateBtn) {
        spaCalculateBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            calculateSPA();
        });
    }
    
    // Toggle plus/minus for terrain adjustment
    if (spaAdjustmentToggle) {
        spaAdjustmentToggle.addEventListener('click', function (e) {
            e.stopPropagation();
            this.textContent = this.textContent === '+' ? '-' : '+';
        });
    }
    
    if (spaType) {
        spaType.addEventListener('click', e => e.stopPropagation());
        spaType.addEventListener('change', e => e.stopPropagation());
    }
    
    // Enter on distance → validate, then focus terrain (fast in-game flow)
    if (spaDistance) {
        spaDistance.addEventListener('click', e => e.stopPropagation());
        spaDistance.addEventListener('keydown', function (event) {
            if (event.key !== 'Enter') {
                return;
            }
            event.preventDefault();
            const d = parseInt(this.value, 10);
            if (!this.value.trim() || !d || d <= 0) {
                alert('Please enter a valid distance');
                return;
            }
            if (spaTerrainAdjustment) {
                spaTerrainAdjustment.focus();
                spaTerrainAdjustment.select();
            }
        });
    }
    
    // Enter on terrain → calculate, then focus distance for the next target
    if (spaTerrainAdjustment) {
        spaTerrainAdjustment.addEventListener('click', e => e.stopPropagation());
        spaTerrainAdjustment.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                calculateSPA();
            }
        });
    }
    
    scheduleWhenIdle(() => loadSPAResults());
});

function calculateSPA() {
    const distance = parseInt(document.getElementById('spaDistance').value);
    const spaType = document.getElementById('spaType').value;
    const terrainAdjustment = parseFloat(document.getElementById('spaTerrainAdjustment').value) || 0;
    // Pitch adjustment is inverted: negative pitch adds mills, positive pitch subtracts them.
    const adjustmentSign = document.getElementById('spaAdjustmentToggle').textContent === '+' ? -1 : 1;
    const finalAdjustment = terrainAdjustment * adjustmentSign;
    
    if (!distance || distance <= 0) {
        alert('Please enter a valid distance');
        return;
    }
    
    try {
        // Calculate SPA result using the new calculation system
        const result = calculateSPAResult(distance, spaType, finalAdjustment);
        
        // Save the result
        saveSPAResult(distance, result, spaType);
        
        runAfterNextPaint(() => {
            displayRecentSPACalculation(result, distance, spaType);
            const distInput = document.getElementById('spaDistance');
            const liveEl = document.getElementById('recentSpaCalculation');
            focusCalcDistanceWithResultVisible(liveEl, distInput);
            loadSPAResults();
        });
    } catch (error) {
        alert(error.message);
    }
}

function calculateSPAResult(distance, spaType, terrainAdjustment = 0) {
    const normalizedType =
        spaType === 'usa'
            ? 'us_sov'
            : spaType === 'churchill'
              ? 'churchill_avre'
              : spaType;

    let xMin;
    let xMax;
    let base;

    switch (normalizedType) {
        case 'us_sov':
            xMin = 200;
            xMax = 600;
            base = 0.665429 * (distance - 49.6779);
            break;
        case 'ger':
            xMin = 200;
            xMax = 500;
            base = 0.887 * (distance - 87.5986);
            break;
        case 'churchill_avre':
            xMin = 100;
            xMax = 250;
            base = 1.04 * (distance - 3.84615);
            break;
        case 'bishop':
            xMin = 200;
            xMax = 800;
            base = 0.19504 * (56.8058 + distance);
            break;
        default:
            throw new Error('Invalid SPA type selected');
    }

    if (distance < xMin || distance > xMax) {
        throw new Error(`For this SPA type, enter a distance between ${xMin}m and ${xMax}m`);
    }

    let result = Math.round(base + terrainAdjustment);
    return `${result} mills`;
}

function saveSPAResult(distance, result, spaType) {
    let results = JSON.parse(localStorage.getItem('spaResults') || '[]');
    
    const newResult = {
        id: Date.now(),
        distance: distance,
        result: result,
        spaType: spaType,
        timestamp: new Date().toLocaleString()
    };
    
    // Add new result at the beginning (newest first)
    results.unshift(newResult);
    
    // Keep only the last 3 results
    if (results.length > 3) {
        results = results.slice(0, 3);
    }
    
    localStorage.setItem('spaResults', JSON.stringify(results));
}

function loadSPAResults() {
    const spaResultsBody = document.getElementById('spaResultsBody');
    if (!spaResultsBody) return;
    
    const results = JSON.parse(localStorage.getItem('spaResults') || '[]');
    
    // Update the recent calculation display if there are results
    if (results.length > 0) {
        const mostRecent = results[0]; // First result is the most recent due to unshift()
        displayRecentSPACalculation(mostRecent.result, mostRecent.distance, mostRecent.spaType);
    } else {
        // Reset the recent calculation display
        const recentCalculationDiv = document.getElementById('recentSpaCalculation');
        if (recentCalculationDiv) {
            recentCalculationDiv.innerHTML = '<p>No calculation performed yet</p>';
        }
    }
    
    if (results.length === 0) {
        spaResultsBody.innerHTML = '<tr class="no-results"><td colspan="4">No calculations saved yet</td></tr>';
        return;
    }
    
    let html = '';
    results.forEach(result => {
        // Extract the mills value from the result string for emphasis
        const millsMatch = result.result.match(/^(-?\d+)\s+mills/);
        const millsValue = millsMatch ? millsMatch[1] : '';
        
        html += `
            <tr>
                <td><strong style="color: var(--accent);">${millsValue} mills</strong></td>
                <td>${result.distance}m</td>
                <td>${getSPATypeDisplayName(result.spaType)}</td>
                <td><button class="delete-btn" onclick="deleteSPAResult(${result.id})">Delete</button></td>
            </tr>
        `;
    });
    
    spaResultsBody.innerHTML = html;
}

function deleteSPAResult(id) {
    let results = JSON.parse(localStorage.getItem('spaResults') || '[]');
    results = results.filter(result => result.id !== id);
    localStorage.setItem('spaResults', JSON.stringify(results));
    loadSPAResults(); // This will also update the recent calculation display
}

function getSPATypeDisplayName(spaType) {
    const spaTypeNames = {
        us_sov: 'USA / Soviet Union',
        ger: 'Germany',
        churchill_avre: 'British Churchill AVRE',
        bishop: 'British Bishop',
        usa: 'USA / Soviet Union',
        churchill: 'British Churchill AVRE'
    };
    return spaTypeNames[spaType] || spaType;
}

function displayRecentSPACalculation(result, distance, spaType) {
    const recentCalculationDiv = document.getElementById('recentSpaCalculation');
    if (!recentCalculationDiv) return;
    
    // Extract the mills value from the result
    const millsMatch = result.match(/^(-?\d+)\s+mills/);
    const millsValue = millsMatch ? millsMatch[1] : '';
    
    // Display the most recent calculation prominently
    recentCalculationDiv.innerHTML = `
        <div class="recent-result">
            <span class="mills-value">${millsValue} mills</span>
            <span class="calculation-details">${getSPATypeDisplayName(spaType)} SPA at ${distance}m</span>
        </div>
    `;
}

// Armor Sights System
function initializeArmorSights() {
    const tankSelectionGrid = document.getElementById('tankSelectionGrid');
    if (!tankSelectionGrid) return;
    
    // Populate tank selection grid
    populateTankSelectionGrid();
    
    // Add faction filter event listeners
    const factionFilterBtns = document.querySelectorAll('.faction-filter-btn');
    factionFilterBtns.forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const faction = this.getAttribute('data-faction');
            filterTanksByFaction(faction);
            
            // Update active state
            factionFilterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Add tank type filter event listeners
    const typeFilterBtns = document.querySelectorAll('.type-filter-btn');
    typeFilterBtns.forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const tankType = this.getAttribute('data-tank-type');
            filterTanksByType(tankType);
            
            // Update active state
            typeFilterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

function populateTankSelectionGrid() {
    const tankSelectionGrid = document.getElementById('tankSelectionGrid');
    if (!tankSelectionGrid) {

        return;
    }
    
    let html = '';
    let totalTanks = 0;
    
    // Iterate through each faction in the tank database
    Object.values(tankDatabase).forEach(factionTanks => {
        factionTanks.forEach(tank => {
            
            // Normalize faction name for filtering
            let normalizedFaction = tank.faction.toLowerCase();
            if (normalizedFaction === 'soviet union') normalizedFaction = 'soviet';
            if (normalizedFaction === 'great britain') normalizedFaction = 'british';
            
            // Normalize tank type for filtering
            let normalizedType = tank.type.toLowerCase();
            if (normalizedType.includes('heavy')) normalizedType = 'heavy';
            else if (normalizedType.includes('medium')) normalizedType = 'medium';
            else if (normalizedType.includes('light')) normalizedType = 'light';
            else if (normalizedType.includes('recon')) normalizedType = 'recon';
            else if (normalizedType.includes('spa') || normalizedType.includes('self propelled')) normalizedType = 'spa';
            
            // Get the tank's directory name for the image path
            const tankDirName = tank.images360.prefix.split('/').filter(part => part.length > 0).pop();
            
            const imagePath = `images/360/${tankDirName}/2.webp?v=${buildVersion}`;
            
            html += `
                <div class="tank-option" data-tank="${tank.name}" data-faction="${normalizedFaction}" data-tank-type="${normalizedType}">
                    <img src="${imagePath}" alt="${tank.name}" loading="lazy">
                    <span>${tank.name}</span>
                </div>
            `;
            totalTanks++;
        });
    });
    
    tankSelectionGrid.innerHTML = html;
    
    // Add click event listeners to tank options
    const tankOptions = document.querySelectorAll('.tank-option');
    
    tankOptions.forEach(option => {
        option.addEventListener('click', function (e) {
            e.stopPropagation();
            const tankName = this.getAttribute('data-tank');
            openScopeView(tankName);
        });
    });
}

function filterTanksByFaction(faction) {
    applyTankFilters();
}

function filterTanksByType(tankType) {
    applyTankFilters();
}

function applyTankFilters() {
    const tankOptions = document.querySelectorAll('.tank-option');
    const activeFaction = document.querySelector('.faction-filter-btn.active').getAttribute('data-faction');
    const activeType = document.querySelector('.type-filter-btn.active').getAttribute('data-tank-type');
    
    let visibleCount = 0;
    tankOptions.forEach(option => {
        const tankFaction = option.getAttribute('data-faction');
        const tankType = option.getAttribute('data-tank-type');
        
        const factionMatch = activeFaction === 'all' || tankFaction === activeFaction;
        const typeMatch = activeType === 'all' || tankType === activeType;
        
        if (factionMatch && typeMatch) {
            option.style.display = 'block';
            visibleCount++;
        } else {
            option.style.display = 'none';
        }
    });
    
}

function openScopeView(tankName, updateHash = true) {
    
    const scopeViewer = document.getElementById('scopeViewer');
    const selectedTankName = document.getElementById('selectedTankName');
    const scopeImage = document.getElementById('scopeImage');
    const overlayImage = document.querySelector('.scope-overlay-image');
    const scopeImageContainer = document.querySelector('.scope-image-container');
    
    if (!scopeViewer || !selectedTankName || !scopeImage) {

        return;
    }
    
    // Update tank name
    selectedTankName.textContent = tankName;
    
    // Find the tank in the database to get its directory path and type
    let tankDirectory = '';
    let tankFound = false;
    let tankData = null;
    let tankType = '';
    
    Object.values(tankDatabase).forEach(factionTanks => {
        factionTanks.forEach(tank => {
            if (tank.name === tankName) {
                tankFound = true;
                tankData = tank;
                tankType = tank.type;
                // Extract the directory name from the prefix path
                tankDirectory = tank.images360.prefix.split('/').filter(part => part.length > 0).pop();

            }
        });
    });
    
    if (!tankFound) {

    }
    
    // Set white background for tanks that have scope images (like 8.png or arty_us.png for SPAs)
    const whiteBackground = document.getElementById('whiteBackground');
    if (whiteBackground && tankDirectory) {
        // Check if this is an SPA - all SPAs use arty_us.png
        let scopeImagePath;
        if (tankType === 'SPA (Self Propelled Artillery)') {
            scopeImagePath = 'images/HLL_Icons/Unsorted/Sights_Scopes/arty_us.png';
        } else {
            scopeImagePath = `images/360/${tankDirectory}/8.png`;
        }
        
        const testScopeImg = new Image();
        
        testScopeImg.onload = function () {
            // Tank has a scope image, show white background
            whiteBackground.style.display = 'block';
        };
        
        testScopeImg.onerror = function () {
            // Tank doesn't have a scope image, hide white background
            whiteBackground.style.display = 'none';
        };
        
        // Start testing the scope image
        testScopeImg.src = scopeImagePath;
    } else if (whiteBackground) {
        // No tank directory found, hide white background
        whiteBackground.style.display = 'none';
    }
    
    // Show/hide the ranging overlay based on tank type and specific tank
    if (overlayImage) {
        if (tankName === 'Puma') {
            // Use Puma-specific overlay
            overlayImage.src = 'images/HLL_Icons/pumarananging.png';
            overlayImage.alt = 'Puma Ranging Overlay';
            overlayImage.style.display = 'block';
        } else if (tankName === 'Daimler' || tankName === 'Greyhound') {
            // Use scout vehicle ranging overlay for Daimler and Greyhound
            overlayImage.src = 'images/HLL_Icons/scoutvehicleranging.png';
            overlayImage.alt = 'Scout Vehicle Ranging Overlay';
            overlayImage.style.display = 'block';
        } else if (tankName === 'BA-10 Scout Car') {
            // Use BA-10 specific sight overlay
            overlayImage.src = 'images/HLL_Icons/ba10sight.png';
            overlayImage.alt = 'BA-10 Sight Overlay';
            overlayImage.style.display = 'block';
        } else if (tankName === 'Tetrarch') {
            // Use light tank ranging overlay for Tetrarch
            overlayImage.src = 'images/HLL_Icons/lighttankranging.png';
            overlayImage.alt = 'Light Tank Ranging Overlay';
            overlayImage.style.display = 'block';
        } else if (tankName === 'Luchs') {
            // Use Luchs sight overlay for Luchs
            overlayImage.src = 'images/HLL_Icons/luchssight.png';
            overlayImage.alt = 'Luchs Sight Overlay';
            overlayImage.style.display = 'block';
        } else if (tankName === 'M5A1 Stuart' || tankName === 'M3 Stuart \'Honey\'' || tankName === 'T-70') {
            // Use light tank overlay for specific light tanks
            overlayImage.src = 'images/HLL_Icons/lighttankranging.png';
            overlayImage.alt = 'Light Tank Ranging Overlay';
            overlayImage.style.display = 'block';
        } else if (tankType === 'Heavy Tank' || tankType === 'Medium Tank') {
            // Use default heavy tank overlay
            overlayImage.src = 'images/HLL_Icons/Heavytankranging.png';
            overlayImage.alt = 'Heavy Tank Ranging Overlay';
            overlayImage.style.display = 'block';
        } else {
            overlayImage.style.display = 'none';
        }
    }
    
    // Use 8.png from the tank's directory as the scope view image, or arty_us.png for SPAs
    if (tankDirectory) {
        // Check if this is an SPA - all SPAs use arty_us.png
        let imagePath;
        if (tankType === 'SPA (Self Propelled Artillery)') {
            imagePath = 'images/HLL_Icons/Unsorted/Sights_Scopes/arty_us.png';
        } else {
            imagePath = `images/360/${tankDirectory}/8.png`;
        }
        
        // Test if the image exists by creating a new Image object first
        const testImg = new Image();
        testImg.onload = function () {

            // Now set the actual scope image
            scopeImage.src = imagePath;
            scopeImage.alt = `${tankName} Scope`;

            // Scope opens magnified by default
            scopeImageContainer.classList.add('magnified');
        };
        
        testImg.onerror = function () {

            // Use a simple placeholder instead of non-existent folder
            scopeImage.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIHNjb3BlIGltYWdlIGF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=';
            scopeImage.alt = `${tankName} Scope`;
        };
        
        // Start loading the test image
        testImg.src = imagePath;
        
        // Also set up the actual scope image error handling
        scopeImage.onerror = function () {

        };
        
        scopeImage.onload = function () {

        };
    } else {

        // Use a simple placeholder instead of non-existent folder
        scopeImage.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzNzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIHNjb3BlIGltYWdlIGF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=';
        scopeImage.alt = `${tankName} Scope`;
    }
    
    // Show scope viewer
    scopeViewer.classList.add('active');

    // Update URL hash with tank name (only if updateHash is true)
    if (updateHash) {
        const tankNameSlug = tankName.toLowerCase().replace(/\s+/g, '-');
        isUpdatingHash = true;
        window.location.hash = formatAppHash('armor', 'wwii', 'ranging', tankNameSlug);
    }

}

function closeScopeView() {
    const scopeViewer = document.getElementById('scopeViewer');
    const overlayImage = document.querySelector('.scope-overlay-image');
    const scopeImageContainer = document.querySelector('.scope-image-container');
    
    if (scopeViewer) {
        scopeViewer.classList.remove('active');

    }
    
    // Reset overlay visibility when closing
    if (overlayImage) {
        overlayImage.style.display = 'none';
    }
    
    // Reset background when closing
    const whiteBackground = document.getElementById('whiteBackground');
    if (whiteBackground) {
        whiteBackground.style.display = 'none';

    }

    // Reset hash to just ranging section
    isUpdatingHash = true;
    window.location.hash = formatAppHash('armor', 'wwii', 'ranging');
}

// Simple magnify function - just toggle the magnified class
function toggleMagnifier() {
    const scopeImageContainer = document.querySelector('.scope-image-container');
    scopeImageContainer.classList.toggle('magnified');
}

// Panning functionality for magnified image
let isPanning = false;
let startX, startY, translateX = 0, translateY = 0;

function startPan(e) {
    if (!document.querySelector('.scope-image-container').classList.contains('magnified')) return;
    
    isPanning = true;
    const scopeImageContainer = document.querySelector('.scope-image-container');
    const expandedTile = scopeImageContainer.closest('.ranging-tool.expanded');
    
    if (!expandedTile) return;
    
    const containerRect = scopeImageContainer.getBoundingClientRect();
    const tileRect = expandedTile.getBoundingClientRect();
    
    startX = (e.clientX || e.touches[0].clientX) - containerRect.left - translateX;
    startY = (e.clientY || e.touches[0].clientY) - containerRect.top - translateY;
    
    document.addEventListener('mousemove', pan);
    // touchmove cannot be passive because we need preventDefault for panning
    document.addEventListener('touchmove', pan, { passive: false });
    document.addEventListener('mouseup', stopPan);
    // touchend cannot be passive because we need to clean up panning state
    document.addEventListener('touchend', stopPan, { passive: false });
}

function pan(e) {
    if (!isPanning) return;
    
    e.preventDefault();
    
    const scopeImageContainer = document.querySelector('.scope-image-container');
    const expandedTile = scopeImageContainer.closest('.ranging-tool.expanded');
    
    if (!expandedTile) return;
    
    const containerRect = scopeImageContainer.getBoundingClientRect();
    const tileRect = expandedTile.getBoundingClientRect();
    const currentX = (e.clientX || e.touches[0].clientX) - containerRect.left;
    const currentY = (e.clientY || e.touches[0].clientY) - containerRect.top;
    
    // Add sensitivity factor to reduce panning speed
    const sensitivity = 0.3;
    translateX = (currentX - startX) * sensitivity;
    translateY = (currentY - startY) * sensitivity;
    
    // Calculate boundaries to keep magnified image within the expanded tile
    // The image is scaled 3x, so we need to account for that in our boundaries
    const imageWidth = containerRect.width;
    const imageHeight = containerRect.height;
    const scaledWidth = imageWidth * 3;
    const scaledHeight = imageHeight * 3;
    
    // Calculate boundaries relative to the expanded tile container
    // We need to ensure the magnified image stays within the tile's content area
    const tileContentArea = expandedTile.querySelector('.expanded-content-layout');
    if (!tileContentArea) return;
    
    const contentRect = tileContentArea.getBoundingClientRect();
    
    // Calculate how much the image can move while staying within the content area
    // The magnified image should not extend beyond the content area boundaries
    const maxTranslateX = Math.max(0, (scaledWidth - contentRect.width) / 2);
    const maxTranslateY = Math.max(0, (scaledHeight - contentRect.height) / 2);
    
    // Apply boundaries to keep image within the content area
    translateX = Math.max(-maxTranslateX, Math.min(maxTranslateX, translateX));
    translateY = Math.max(-maxTranslateY, Math.min(maxTranslateY, translateY));
    
    scopeImageContainer.style.transform = `scale(3) translate(${translateX}px, ${translateY}px)`;
}

function stopPan() {
    isPanning = false;
    document.removeEventListener('mousemove', pan);
    document.removeEventListener('touchmove', pan);
    document.removeEventListener('mouseup', stopPan);
    document.removeEventListener('touchend', stopPan);
}

// Ranging Tool Tile Expansion System
function lockBodyScrollForFullscreen() {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.height = '100%';
}

function unlockBodyScrollForFullscreen() {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    document.documentElement.style.height = '';
}

function expandTile(clickedTile, updateHash = true) {
    // Check if we're on mobile (screen width <= 768px)
    const isMobile = window.innerWidth <= 768;

    // Check if this is artillery calculator or armor sights for full-screen mode
    const tileTitle = clickedTile.querySelector('h3');
    const isFullscreenTool = tileTitle && (
        tileTitle.textContent.includes('Artillery Calculator') ||
        tileTitle.textContent.includes('SPA Calculator') ||
        tileTitle.textContent.includes('Armor Sights')
    );

    // On mobile, for fullscreen tools, still allow expansion
    if (isMobile && !isFullscreenTool) {
        clickedTile.scrollIntoView({behavior: 'smooth', block: 'start'});
        return;
    }

    // Get all ranging tool tiles
    const allTiles = document.querySelectorAll('.ranging-tool');
    
    // Expand the clicked tile
    clickedTile.classList.add('expanded');
    
    // Show the close button for the expanded tile
    const closeBtn = clickedTile.querySelector('.expand-close-btn');
    if (closeBtn) {
        closeBtn.style.display = 'block';
    }
    
    // Minimize all other tiles
    allTiles.forEach(tile => {
        if (tile !== clickedTile) {
            tile.classList.add('minimized');
        }
    });

    // Enable full-screen mode for artillery calculator and armor sights
    if (isFullscreenTool) {
        document.body.classList.add('fullscreen-mode');
        addFullscreenCloseButton(clickedTile);
        disableNavigationInFullscreen();
    }
    
    // Lock page scroll so touch scrolling stays inside the expanded tile (mobile)
    lockBodyScrollForFullscreen();
    
    // Update URL hash based on which tile was expanded (only if updateHash is true)
    if (updateHash) {
        const tileTitle = clickedTile.querySelector('h3');
        if (tileTitle) {
            const titleText = tileTitle.textContent.trim();
            if (titleText.includes('Artillery Calculator')) {
                isUpdatingHash = true;
                window.location.hash = formatAppHash('armor', 'wwii', 'ranging', 'artillery');
            } else if (titleText.includes('SPA Calculator')) {
                isUpdatingHash = true;
                window.location.hash = formatAppHash('armor', 'wwii', 'ranging', 'spa');
            } else if (titleText.includes('Armor Sights')) {
                isUpdatingHash = true;
                window.location.hash = formatAppHash('armor', 'wwii', 'ranging', 'armor-sights');
            }
        }
    }

}

function closeExpandedTile(closeButton) {
    // Get the expanded tile
    const expandedTile = closeButton.closest('.ranging-tool');
    
    // Remove expanded state
    expandedTile.classList.remove('expanded');
    
    // Hide the close button
    closeButton.style.display = 'none';
    
    // Get all ranging tool tiles
    const allTiles = document.querySelectorAll('.ranging-tool');
    
    // Restore all tiles to normal state
    allTiles.forEach(tile => {
        tile.classList.remove('minimized');
    });
    
    if (document.body.classList.contains('fullscreen-mode')) {
        document.body.classList.remove('fullscreen-mode');
        const fullscreenCloseBtn = document.querySelector('.fullscreen-close-btn');
        if (fullscreenCloseBtn) {
            fullscreenCloseBtn.remove();
        }
        enableNavigationAfterFullscreen();
    }
    unlockBodyScrollForFullscreen();
    
    // Reset hash to just ranging section
    isUpdatingHash = true;
    window.location.hash = formatAppHash('armor', 'wwii', 'ranging');

}

// Full-screen mode functions
function addFullscreenCloseButton(tile) {
    // Remove any existing fullscreen close button
    const existingBtn = document.querySelector('.fullscreen-close-btn');
    if (existingBtn) {
        existingBtn.remove();
    }

    // Create new fullscreen close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'fullscreen-close-btn';
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.title = 'Return to Calculators & sights';
    closeBtn.onclick = () => exitFullscreenMode();

    document.body.appendChild(closeBtn);
}

function exitFullscreenMode() {
    // Remove fullscreen mode class
    document.body.classList.remove('fullscreen-mode');

    // Remove fullscreen close button
    const fullscreenCloseBtn = document.querySelector('.fullscreen-close-btn');
    if (fullscreenCloseBtn) {
        fullscreenCloseBtn.remove();
    }

    // Re-enable navigation
    enableNavigationAfterFullscreen();

    // Close all expanded tiles and return to ranging
    closeAllExpandedTiles();

    unlockBodyScrollForFullscreen();

    // Navigate back to ranging section
    showSection('ranging');
}

// Disable navigation when in fullscreen mode
function disableNavigationInFullscreen() {
    // Disable all nav links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.style.pointerEvents = 'none';
        link.style.opacity = '0.5';
    });

    // Disable logo click
    const logoContainer = document.querySelector('.logo-container');
    if (logoContainer) {
        logoContainer.style.pointerEvents = 'none';
        logoContainer.style.opacity = '0.5';
    }

    // Disable overview cards
    const overviewCards = document.querySelectorAll('.overview-card');
    overviewCards.forEach(card => {
        card.style.pointerEvents = 'none';
        card.style.opacity = '0.5';
    });
}

// Re-enable navigation when exiting fullscreen mode
function enableNavigationAfterFullscreen() {
    // Re-enable all nav links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.style.pointerEvents = '';
        link.style.opacity = '';
    });

    // Re-enable logo click
    const logoContainer = document.querySelector('.logo-container');
    if (logoContainer) {
        logoContainer.style.pointerEvents = '';
        logoContainer.style.opacity = '';
    }

    // Re-enable overview cards
    const overviewCards = document.querySelectorAll('.overview-card');
    overviewCards.forEach(card => {
        card.style.pointerEvents = '';
        card.style.opacity = '';
    });
}

// Function to close all expanded tiles (for navigation)
function closeAllExpandedTiles() {
    // Exit fullscreen mode if active
    if (document.body.classList.contains('fullscreen-mode')) {
        document.body.classList.remove('fullscreen-mode');
        const fullscreenCloseBtn = document.querySelector('.fullscreen-close-btn');
        if (fullscreenCloseBtn) {
            fullscreenCloseBtn.remove();
        }
        // Re-enable navigation when exiting fullscreen
        enableNavigationAfterFullscreen();
    }

    // Close expanded ranging tool tiles
    const expandedRangingTiles = document.querySelectorAll('.ranging-tool.expanded');
    expandedRangingTiles.forEach(tile => {
        tile.classList.remove('expanded');
        const closeBtn = tile.querySelector('.expand-close-btn');
        if (closeBtn) {
            closeBtn.style.display = 'none';
        }
    });
    
    // Close minimized ranging tool tiles
    const minimizedRangingTiles = document.querySelectorAll('.ranging-tool.minimized');
    minimizedRangingTiles.forEach(tile => {
        tile.classList.remove('minimized');
    });
    
    // Close expanded scope image
    const expandedScopeContainer = document.querySelector('.scope-image-container.expanded');
    if (expandedScopeContainer) {
        expandedScopeContainer.classList.remove('expanded');
        const expandBtn = expandedScopeContainer.querySelector('.scope-expand-btn');
        if (expandBtn) {
            const expandIcon = expandBtn.querySelector('i');
            const expandText = expandBtn.querySelector('span');
            expandIcon.className = 'fas fa-expand-arrows-alt';
            expandText.textContent = 'Expand';
        }
    }
    
    // Close magnified scope image
    const magnifiedScopeContainer = document.querySelector('.scope-image-container.magnified');
    if (magnifiedScopeContainer) {
        magnifiedScopeContainer.classList.remove('magnified');
        const magnifyBtn = magnifiedScopeContainer.querySelector('.scope-magnify-btn');
        if (magnifyBtn) {
            magnifyBtn.style.display = 'none';
            const magnifyIcon = magnifyBtn.querySelector('i');
            const magnifyText = magnifyBtn.querySelector('span');
            magnifyIcon.className = 'fas fa-search-plus';
            magnifyText.textContent = 'Magnify';
        }
        // Remove panning event listeners
        magnifiedScopeContainer.removeEventListener('mousedown', startPan);
        magnifiedScopeContainer.removeEventListener('touchstart', startPan);
    }
    
    // Reset panning variables
    isPanning = false;
    translateX = 0;
    translateY = 0;
    
    unlockBodyScrollForFullscreen();
}

// Back to Top functionality for expanded Armor Sights
function scrollToTop() {
    
    // When expanded, scroll the expanded tile content to top
    const expandedTile = document.querySelector('.ranging-tool.expanded');
    if (expandedTile) {
        
        // Force scroll to top
        expandedTile.scrollTop = 0;
        
        // Also try scrollTo method as backup
        expandedTile.scrollTo({
            top: 0,
            behavior: 'auto'
        });
        
    } else {

        // Fallback to window scroll if not expanded
        window.scrollTo({
            top: 0,
            behavior: 'auto'
        });
    }
}

// Toggle driving guide section
function toggleDrivingGuide() {
    const content = document.getElementById('drivingGuideContent');
    const icon = document.querySelector('.driving-toggle-icon');
    const text = document.querySelector('.driving-toggle-text');

    if (content.style.display === 'none' || content.style.display === '') {
        content.style.display = 'block';
        icon.textContent = '▲';
        icon.style.transform = 'rotate(180deg)';
        text.textContent = 'less';
    } else {
        content.style.display = 'none';
        icon.textContent = '▼';
        icon.style.transform = 'rotate(0deg)';
        text.textContent = 'more';
    }
}

/** Infantry Maps — click tactical thumbnail to open full-screen style lightbox */
(function initInfantryTacLightbox() {
    const root = document.getElementById('infantryTacLightbox');
    const lbImg = document.getElementById('infantryTacLightboxImg');
    const mapHosts = [
        document.getElementById('infantry-maps'),
        document.getElementById('infantry-vietnam-maps')
    ].filter(Boolean);
    if (!root || !lbImg || !mapHosts.length) {
        return;
    }
    const closeBtn = root.querySelector('.infantry-tac-lightbox__close');
    const backdrop = root.querySelector('.infantry-tac-lightbox__backdrop');
    let lastFocus = null;

    function openLightbox(src, alt) {
        if (!src) {
            return;
        }
        lastFocus = document.activeElement;
        lbImg.src = src;
        lbImg.alt = alt || 'Tactical map';
        root.classList.add('infantry-tac-lightbox--open');
        root.setAttribute('aria-hidden', 'false');
        if (typeof lockBodyScrollForFullscreen === 'function') {
            lockBodyScrollForFullscreen();
        } else {
            document.body.style.overflow = 'hidden';
        }
        if (closeBtn) {
            closeBtn.focus();
        }
    }

    function closeLightbox() {
        if (!root.classList.contains('infantry-tac-lightbox--open')) {
            return;
        }
        root.classList.remove('infantry-tac-lightbox--open');
        root.setAttribute('aria-hidden', 'true');
        lbImg.removeAttribute('src');
        lbImg.alt = '';
        if (typeof unlockBodyScrollForFullscreen === 'function') {
            unlockBodyScrollForFullscreen();
        } else {
            document.body.style.overflow = '';
        }
        if (lastFocus && typeof lastFocus.focus === 'function') {
            lastFocus.focus();
        }
        lastFocus = null;
    }

    function findInfantryMapThumb(el) {
        return el.closest('img.infantry-map-img--tac') || el.closest('img.infantry-map-img--key');
    }

    mapHosts.forEach(function (mapsSection) {
        mapsSection.addEventListener('click', function (e) {
            const thumb = findInfantryMapThumb(e.target);
            if (!thumb || !thumb.src) {
                return;
            }
            e.preventDefault();
            openLightbox(thumb.currentSrc || thumb.src, thumb.alt || '');
        });

        mapsSection.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter' && e.key !== ' ') {
                return;
            }
            const thumb = findInfantryMapThumb(e.target);
            if (!thumb || !thumb.src) {
                return;
            }
            e.preventDefault();
            openLightbox(thumb.currentSrc || thumb.src, thumb.alt || '');
        });

        mapsSection.querySelectorAll('img.infantry-map-img--tac, img.infantry-map-img--key').forEach(function (img) {
            img.tabIndex = 0;
            img.setAttribute('role', 'button');
            const cap = img.closest('.infantry-map-figure')?.querySelector('figcaption');
            const hint = cap ? cap.textContent.trim() : 'Map image';
            img.setAttribute('aria-label', (img.alt || hint) + ' — tap to enlarge');
        });
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            closeLightbox();
        });
    }
    if (backdrop) {
        backdrop.addEventListener('click', closeLightbox);
    }
    root.addEventListener('click', function (e) {
        if (e.target === root) {
            closeLightbox();
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && root.classList.contains('infantry-tac-lightbox--open')) {
            closeLightbox();
        }
    });

})();

