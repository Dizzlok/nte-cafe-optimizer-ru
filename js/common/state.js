// ── STORAGE KEYS ───────────────────────────────────────────────────────────
const DATA_KEY = 'cafe_origen_data_v2';
const SETTINGS_KEY = 'cafe_origen_settings';

let userState = { dishes: {}, characters: {} };
let settings = { cafesOwned: 5, trendCategory: '', trendBonus: 1.0, popularityBonus: 0 };

// ── STATE MANAGEMENT ───────────────────────────────────────────────────────
export function seedUserState(masterData) {
    masterData.dishes.forEach(d => {
        if (!userState.dishes[d.name]) userState.dishes[d.name] = { owned: false, level: 1 };
    });
    masterData.characters.forEach(c => {
        if (!userState.characters[c.name]) userState.characters[c.name] = { owned: false, level: 1 };
    });
    saveUserState();
}

export function loadUserState() {
    try {
        const saved = localStorage.getItem(DATA_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed.dishes) || Array.isArray(parsed.characters)) {
                console.warn('Corrupt userState detected in localStorage, resetting.');
                localStorage.removeItem(DATA_KEY);
                return;
            }
            userState.dishes = (parsed.dishes && typeof parsed.dishes === 'object') ? parsed.dishes : {};
            userState.characters = (parsed.characters && typeof parsed.characters === 'object') ? parsed.characters : {};
        }
    } catch (e) {
        console.warn('Could not load user state:', e);
    }
}

export function saveUserState() {
    try {
        localStorage.setItem(DATA_KEY, JSON.stringify(userState));
    } catch (e) {
        console.warn('Could not save user state:', e);
    }
}

export function loadSettings() {
    try {
        const saved = localStorage.getItem(SETTINGS_KEY);
        if (saved) settings = { ...settings, ...JSON.parse(saved) };
    } catch {}
}

export function saveSettings() {
    settings.cafesOwned = parseInt(document.getElementById('cafesOwned').value) || 1;
    settings.trendCategory = document.getElementById('trendCategory').value;
    settings.trendBonus = parseFloat(document.getElementById('trendBonus').value) || 0;
    settings.popularityBonus = parseFloat(document.getElementById('popularityBonus').value) || 0;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function applySettings() {
    document.getElementById('cafesOwned').value = settings.cafesOwned;
    document.getElementById('trendCategory').value = settings.trendCategory;
    document.getElementById('trendBonus').value = settings.trendBonus;
    document.getElementById('popularityBonus').value = settings.popularityBonus;
}

export function getSettings() {
    return settings;
}

export function getUserState() {
    return userState;
}