// ── НОРМАЛИЗАЦИЯ ДАННЫХ (убирает пробелы из ключей data.js) ────────────────
function normalizeData(obj) {
    if (Array.isArray(obj)) {
        return obj.map(item => normalizeData(item));
    } else if (obj !== null && typeof obj === 'object') {
        const normalized = {};
        for (const key in obj) {
            const cleanKey = key.trim();
            normalized[cleanKey] = normalizeData(obj[key]);
        }
        return normalized;
    } else if (typeof obj === 'string') {
        return obj.trim();
    }
    return obj;
}

// ── ГЛАВНЫЙ ФАЙЛ ПРИЛОЖЕНИЯ ────────────────────────────────────────────────
// Импортируем модули
import { fixAllNames } from './fix-names.js';
import { runOptimizer } from '../../calculator/js/optimizer.js';
import { renderDishes } from '../../calculator/js/ui-dishes.js';
import { renderCharacters } from '../../calculator/js/ui-characters.js';
import { showError, showResults } from '../../calculator/js/ui-results.js';
import { getSettings, getUserState, loadSettings, loadUserState, seedUserState, saveSettings, applySettings } from './state.js';
import { nCr } from './utils.js';

// ── ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ──────────────────────────────────────────────────
let masterData = { ingredients: [], dishes: [], characters: [] };
window.masterData = masterData; // Делаем глобальной

// ── ROSTER SUMMARY ────────────────────────────────────────────────────────
function updateRosterSummary() {
    const settings = getSettings();
    const userState = getUserState();
    const cafes = settings.cafesOwned || 1;
    const maxD = cafes;
    const maxC = cafes * 2;
    
    const ownedDishes = masterData.dishes.filter(d => {
        const name = d.name.trim();
        return (userState.dishes[name] || {}).owned;
    }).length;
    
    const ownedChars = masterData.characters.filter(c => {
        const name = c.name.trim();
        return (userState.characters[name] || {}).owned;
    }).length;
    
    const summaryEl = document.getElementById('rosterSummary');
    if (summaryEl) {
        const dishCombos = nCr(ownedDishes, Math.min(ownedDishes, maxD));
        const charCombos = nCr(ownedChars, Math.min(ownedChars, maxC));
        
        summaryEl.innerHTML = `
            Блюда: <span>${ownedDishes}</span> в наличии / <span>${maxD}</span> слотов<br>
            Персонажи: <span>${ownedChars}</span> в наличии / <span>${maxC}</span> слотов<br>
            Комбинации блюд: <span>${dishCombos}</span><br>
            Комбинации персонажей: <span>${charCombos}</span>
        `;
    }
}

// ── TREND DROPDOWN ────────────────────────────────────────────────────────
function populateTrendDropdown() {
    const sel = document.getElementById('trendCategory');
    if (!sel) return;
    sel.innerHTML = '<option value="">— Нет —</option>';
    const settings = getSettings();
    const dishTypes = [...new Set(masterData.dishes.map(d => d.type))].sort();
    const ingNames = masterData.ingredients.map(i => i.name).sort();
    const ingCats = [...new Set(masterData.ingredients.map(i => i.category).filter(Boolean))].sort();

    const addGroup = (label, items) => {
        if (!items.length) return;
        const grp = document.createElement('optgroup');
        grp.label = TRANSLATIONS[label] || label;
        items.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item;
            opt.textContent = TRANSLATIONS[item] || item;
            if (item === settings.trendCategory) opt.selected = true;
            grp.appendChild(opt);
        });
        sel.appendChild(grp);
    };

    addGroup('Dish Types', dishTypes);
    addGroup('Categories', ingCats);
    addGroup('Ingredients', ingNames);
}

// ── TABS ──────────────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
});

// ── OPTIMIZER BUTTON ──────────────────────────────────────────────────────
document.getElementById('btnRun')?.addEventListener('click', () => {
    saveSettings();
    updateRosterSummary();
    
    const userState = getUserState();
    const result = runOptimizer(masterData, userState);
    
    if (result.error) {
        showError(result.error);
    } else {
        showResults(result);
    }
});

// ── DATA LOADER ─────────────────────────────────────────────────────────────
async function loadMasterData() {
    try {
        // Путь считается ОТНОСИТЕЛЬНО ЭТОГО ФАЙЛА (app.js), а не страницы
        // app.js лежит в /js/common/, data.js в /calculator/js/
        const dataUrl = new URL('../../calculator/js/data.js', import.meta.url).href;
        
        const response = await fetch(dataUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const scriptText = await response.text();
        const getData = new Function(scriptText + '; return MASTER_DATA;');
        const data = getData();
        
        if (!data) {
            throw new Error('MASTER_DATA пуст');
        }
        
        return normalizeData(data);
    } catch (error) {
        throw new Error(`Не удалось загрузить данные: ${error.message}`);
    }
}

// ── INITIALIZATION ─────────────────────────────────────────────────────────
async function init() {
    try {
        masterData = await loadMasterData();
        masterData = fixAllNames(masterData);
        window.masterData = masterData;
        console.log('Данные успешно загружены:', masterData);
    } catch (error) {
        console.error("Критическая ошибка инициализации: ", error);
        const resultsArea = document.getElementById('resultsArea');
        if (resultsArea) {
            resultsArea.innerHTML = `<div class="results-placeholder"><div class="placeholder-icon">⚠️</div><p style="color:var(--red)">${error.message}</p><p style="font-size:0.8rem; color:var(--text3); margin-top:0.5rem;">Попробуйте обновить страницу или проверьте подключение к интернету.</p></div>`;
        }
        return;
    }
    
    loadSettings();
    loadUserState();
    seedUserState(masterData);
    populateTrendDropdown();
    window.settings = getSettings();
    renderDishes(masterData, window.TRANSLATIONS, window.settings, updateRosterSummary);
    renderCharacters(masterData, window.TRANSLATIONS, window.CHARACTER_RANKS, updateRosterSummary);
    updateRosterSummary();
    applySettings();
}

// ── START ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);