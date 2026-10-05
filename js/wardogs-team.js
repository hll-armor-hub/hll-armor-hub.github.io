/* Wardogs "pick your team": saved choice recolours Wardogs pages and the community Wardogs card
   via html[data-wd-team] (colours live in css/wardogs.css). */
import { loadPref, savePref } from "./tool-mode.js";

export const WD_FACTIONS = [
    { id: "lonestar", name: "Lonestar" },
    { id: "valkyra", name: "Valkyra" },
    { id: "manticore", name: "Manticore" }
];

const PREF = "wd-team";

export function getTeam() {
    const id = loadPref(PREF, "");
    return WD_FACTIONS.some(function (f) { return f.id === id; }) ? id : null;
}

export function applyTeam() {
    const id = getTeam();
    if (id) document.documentElement.setAttribute("data-wd-team", id);
    else document.documentElement.removeAttribute("data-wd-team");
}

export function setTeam(id) {
    savePref(PREF, id || "");
    applyTeam();
}
