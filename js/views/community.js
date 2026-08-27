/* Community */
import { escapeHtml } from "../util.js";
import { icon } from "../icons.js";

const FEATURES = [
    { icon: "fa-server", t: "Hell Let Loose Server", d: "The AHO dedicated server - custom settings, active admins, and tank enthusiasts." },
    { icon: "fa-crown", t: "VIP Access", d: "Get VIP via Discord subscription or by helping seed the server." },
    { icon: "fa-trophy", t: "Community Events", d: "Tank tournaments, competitive matches and AHO-organized events." }
];

const YT_RAZBORA = "https://www.youtube.com/@Raz_Bora";
const YT_TFBG = "https://www.youtube.com/@TheFreshBakedGoods";

const CREATORS = [
    { name: "RazBora", url: YT_RAZBORA, role: "Tank Specialist", desc: "Expert tank gameplay, advanced tactics and comprehensive HLL tutorials.", links: [["YouTube", YT_RAZBORA], ["Twitter", "https://x.com/razborattv"], ["Twitch", "https://www.twitch.tv/raz_bora"], ["TikTok", "https://www.tiktok.com/@raz_bora?lang=en"], ["Discord", "https://discord.gg/Muwg2jZnVW"]] },
    { name: "TheFreshBakedGoods", url: YT_TFBG, role: "Tutorial Master", desc: "In-depth HLL tutorials and strategic gameplay analysis.", links: [["YouTube", YT_TFBG], ["TikTok", "https://www.tiktok.com/@thefreshbakedgoods?lang=en"]] },
    { name: "sushiicatt", role: "Streamer", desc: "Amelia / sushii - 22, Netherlands, cat lover, metal head.", links: [["Twitch", "https://www.twitch.tv/sushiicattt"]] },
    { name: "makL_", role: "Streamer", desc: "Mike aka makL - punk rocker, 80s books & movies, drinks and curses.", links: [["Twitch", "https://www.twitch.tv/makl_"]] }
];

const CREDITS = [
    ["Tankulator", "In partnership with WIX", "https://www.youtube.com/@wixstreams"],
    ["Data contributions", "Yuh & Wix", "https://www.youtube.com/@wixstreams"],
    ["Site creators", null, null],
    ["Dev support & Maps Let Loose", "Winston", "https://mattw.io/"]
];

function creditPeopleHtml(label) {
    if (label === "Site creators") {
        return `<a href="${YT_RAZBORA}" target="_blank" rel="noopener noreferrer">RazBora</a> &amp; <a href="${YT_TFBG}" target="_blank" rel="noopener noreferrer">TheFreshBakedGoods</a>`;
    }
    return null;
}

export function render() {
    return `<div class="wrap wrap-wide">
        <header class="section-head">
            <p class="eyebrow">Community</p>
            <h1 class="gold-text">Join After Hours Operators</h1>
            <p class="lead">The Armor Hub's home server. Connect with fellow tankers, share strategies and support this guide.</p>
        </header>

        <a class="glass card-hover reveal" href="https://discord.gg/guFSTDfsCb" target="_blank" rel="noopener"
           style="display:flex;align-items:center;gap:1.4rem;padding:1.6rem;border-radius:var(--r-lg);margin-bottom:2.6rem;background:linear-gradient(120deg,rgba(88,101,242,.18),var(--glass))">
            <span class="tile__icon" style="width:60px;height:60px;font-size:1.7rem;background:rgba(88,101,242,.2);color:#A5B4FC">${icon("discord")}</span>
            <div style="flex:1"><h3>After Hours Operators</h3><p>A community built for quality games, good people, and organized fun.</p></div>
            <span class="btn btn-primary">Join Discord</span>
        </a>

        <div class="grid cols-3" style="margin-bottom:2.6rem">
            ${FEATURES.map(function (f) { return `<div class="tile glass reveal"><span class="tile__icon">${icon(f.icon)}</span><h3>${escapeHtml(f.t)}</h3><p>${escapeHtml(f.d)}</p></div>`; }).join("")}
        </div>

        <p class="eyebrow">Creators</p>
        <h2 class="gold-text" style="font-size:1.8rem;margin:.4rem 0 1.2rem">Featured content creators</h2>
        <div class="grid cols-2" style="margin-bottom:2.6rem">
            ${CREATORS.map(function (c) {
                const links = c.links.map(function (l) { return `<a href="${l[1]}" target="_blank" rel="noopener" class="chip" style="font-size:.7rem">${escapeHtml(l[0])}</a>`; }).join("");
                const nameHtml = c.url
                    ? `<a href="${escapeHtml(c.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(c.name)}</a>`
                    : escapeHtml(c.name);
                return `<div class="tile glass card-hover reveal">
                    <h3>${nameHtml}</h3>
                    <span class="tank-card__faction">${escapeHtml(c.role)}</span>
                    <p style="margin:.4rem 0 .8rem">${escapeHtml(c.desc)}</p>
                    <div class="filter-group">${links}</div>
                </div>`;
            }).join("")}
        </div>

        <p class="eyebrow">Credits</p>
        <h2 class="gold-text" style="font-size:1.8rem;margin:.4rem 0 1.2rem">Thanks to</h2>
        <div class="grid cols-2">
            ${CREDITS.map(function (c) {
                const peopleHtml = creditPeopleHtml(c[0]);
                if (peopleHtml) {
                    return `<div class="spec reveal" style="display:block;padding:1rem 1.2rem"><dt>${escapeHtml(c[0])}</dt><dd style="font-family:var(--font-ui);font-weight:600;font-size:1rem">${peopleHtml}</dd></div>`;
                }
                return `<a class="spec card-hover reveal" href="${c[2]}" target="_blank" rel="noopener" style="display:block;padding:1rem 1.2rem"><dt>${escapeHtml(c[0])}</dt><dd style="font-family:var(--font-ui);font-weight:600;font-size:1rem">${escapeHtml(c[1])}</dd></a>`;
            }).join("")}
        </div>
    </div>`;
}
