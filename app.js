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

// ── STORAGE KEYS ───────────────────────────────────────────────────────────
const DATA_KEY = 'cafe_origen_data_v2';
const SETTINGS_KEY = 'cafe_origen_settings';
let masterData = { ingredients: [], dishes: [], characters: [] };
let userState = { dishes: {}, characters: {} };
let settings = { cafesOwned: 5, trendCategory: '', trendBonus: 1.0, popularityBonus: 0 };

// ── DATA LOADER ─────────────────────────────────────────────────────────────
async function loadMasterData() {
    try {
        const response = await fetch('./data.js');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const scriptText = await response.text();
        const getData = new Function(scriptText + '; return MASTER_DATA;');
        const data = getData();
        
        if (!data) {
            throw new Error('MASTER_DATA пуст');
        }
        
        // Нормализуем: убираем пробелы из всех ключей и значений
        return normalizeData(data);
    } catch (error) {
        throw new Error(`Не удалось загрузить данные: ${error.message}`);
    }
}

// ── ROSTER SUMMARY ────────────────────────────────────────────────────────
function updateRosterSummary() {
    const cafes = parseInt(document.getElementById('cafesOwned').value) || 1;
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

function nCr(n, r) {
    if (r > n || r < 0) return 0;
    if (r === 0 || r === n) return 1;
    r = Math.min(r, n - r);
    let result = 1;
    for (let i = 0; i < r; i++) {
        result = result * (n - i) / (i + 1);
    }
    return Math.round(result);
}

// ─ INITIALIZATION ─────────────────────────────────────────────────────────
async function init() {
    try {
        masterData = await loadMasterData();
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
    seedUserState();
    populateTrendDropdown();
    renderDishes();
    renderCharacters();
    updateRosterSummary();
    applySettings();
}

// ── STATE MANAGEMENT ───────────────────────────────────────────────────────
function seedUserState() {
    masterData.dishes.forEach(d => {
        if (!userState.dishes[d.name]) userState.dishes[d.name] = { owned: false, level: 1 };
    });
    masterData.characters.forEach(c => {
        if (!userState.characters[c.name]) userState.characters[c.name] = { owned: false, level: 1 };
    });
    saveUserState();
}

function loadUserState() {
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

function saveUserState() {
    try {
        localStorage.setItem(DATA_KEY, JSON.stringify(userState));
    } catch (e) {
        console.warn('Could not save user state:', e);
    }
}

function loadSettings() {
    try {
        const saved = localStorage.getItem(SETTINGS_KEY);
        if (saved) settings = { ...settings, ...JSON.parse(saved) };
    } catch {}
}

function saveSettings() {
    settings.cafesOwned = parseInt(document.getElementById('cafesOwned').value) || 1;
    settings.trendCategory = document.getElementById('trendCategory').value;
    settings.trendBonus = parseFloat(document.getElementById('trendBonus').value) || 0;
    settings.popularityBonus = parseFloat(document.getElementById('popularityBonus').value) || 0;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function applySettings() {
    document.getElementById('cafesOwned').value = settings.cafesOwned;
    document.getElementById('trendCategory').value = settings.trendCategory;
    document.getElementById('trendBonus').value = settings.trendBonus;
    document.getElementById('popularityBonus').value = settings.popularityBonus;
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

// ── TREND DROPDOWN ────────────────────────────────────────────────────────
function populateTrendDropdown() {
    const sel = document.getElementById('trendCategory');
    sel.innerHTML = '<option value="">— Нет —</option>';
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

// ── DISHES ───────────────────────────// ── DISHES (CARD DESIGN) ──────────────────────────────────────────────────
function normalizeNameToPath(name) {
    return name
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9_]/g, '');
}

function renderDishes() {
    const container = document.getElementById('dishesContainer');
    if (!container) return;
    container.innerHTML = '';
    
    // Группируем блюда по типам
    const dishesByType = {};
    masterData.dishes.forEach(d => {
        const type = d.type;
        if (!dishesByType[type]) dishesByType[type] = [];
        dishesByType[type].push(d);
    });
    
    // Порядок категорий
    const typeOrder = ['Desserts', 'Beverages', 'Main Dishes'];
    const sortedTypes = Object.keys(dishesByType).sort((a, b) => {
        const ia = typeOrder.indexOf(a);
        const ib = typeOrder.indexOf(b);
        if (ia === -1 && ib === -1) return a.localeCompare(b);
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
    });
    
    // Проверяем тренд
    const trendCategory = settings.trendCategory.toLowerCase();
    const trendingSubItems = trendCategory
        ? new Set(masterData.ingredients
            .filter(r => r.category.toLowerCase() === trendCategory)
            .map(r => r.name.toLowerCase()))
        : new Set();
    
    sortedTypes.forEach(type => {
        const typeSection = document.createElement('div');
        typeSection.className = 'dish-category-section';
        
        // Заголовок категории
        const title = document.createElement('div');
        title.className = 'dish-category-title';
        title.textContent = TRANSLATIONS[type] || type;
        typeSection.appendChild(title);
        
        // Сетка карточек
        const grid = document.createElement('div');
        grid.className = 'dish-cards-grid';
        
        dishesByType[type].forEach(d => {
            if (!userState.dishes[d.name]) {
                userState.dishes[d.name] = { owned: false, level: 1 };
            }
            const us = userState.dishes[d.name];
            const isOwned = us.owned;
            const currentLevel = us.level || 1;
            
            // Проверяем тренд
            const ingredients = d.ingredients.toLowerCase();
            const typeMatch = trendCategory && d.type.toLowerCase().includes(trendCategory);
            let subMatch = false;
            for (const sub of trendingSubItems) {
                if (ingredients.includes(sub)) { subMatch = true; break; }
            }
            const ingMatch = trendCategory && (ingredients.includes(trendCategory) || subMatch);
            const isTrending = typeMatch || ingMatch;
            
            // Цена
            const basePrice = currentLevel === 2 ? d.priceL2 : d.priceL1;
            const bonus = isTrending ? settings.trendBonus : 0;
            const finalPrice = basePrice + bonus;
            
            // Ингредиенты
            const ingredientsList = d.ingredients.split(',').map(ing => ing.trim());
            
            const card = document.createElement('div');
            card.className = `dish-card ${isOwned ? 'owned' : 'not-owned'}`;
            card.dataset.dishName = d.name;
            
            card.innerHTML = `
                <input type="checkbox" class="dish-ownership-toggle" 
                       data-dish-owned="${d.name}" ${isOwned ? 'checked' : ''}>
                
                <div class="dish-card-header">
                    <img src="./assets/images/common/dishes/${normalizeNameToPath(d.name)}.png" 
                         alt="${d.name}" 
                         class="dish-icon"
                         onerror="this.style.display='none'">
                    
                    <div class="dish-info">
                        <div class="dish-name">${TRANSLATIONS[d.name] || d.name}</div>
                        <div class="dish-meta">
                            <span class="dish-type-badge">${TRANSLATIONS[type] || type}</span>
                            <span class="dish-level-badge">Lv${currentLevel}</span>
                        </div>
                    </div>
                    
                    <div class="dish-ownership-badge ${isOwned ? 'owned' : 'not-owned'}"></div>
                </div>
                
                <div class="dish-price-row">
                    <span class="dish-price">${finalPrice.toFixed(1)} fons</span>
                    ${bonus > 0 ? `<span class="dish-price-bonus">+${bonus.toFixed(2)}</span>` : ''}
                </div>
                
                <div class="dish-level-selector">
                    <button class="dish-level-btn ${currentLevel === 1 ? 'active' : ''}" 
                            data-dish-lvl="${d.name}" data-level="1">L1</button>
                    <button class="dish-level-btn ${currentLevel === 2 ? 'active' : ''}" 
                            data-dish-lvl="${d.name}" data-level="2">L2</button>
                    <button class="dish-level-btn hidden" 
                            data-dish-lvl="${d.name}" data-level="3" disabled>L3</button>
                </div>
                
                <div class="dish-ingredients">
                    ${ingredientsList.map(ing => `
                        <div class="ingredient-row">
                            <img src="./assets/images/common/ingredients/${normalizeNameToPath(ing)}.png" 
                                 alt="${ing}" 
                                 class="ingredient-icon"
                                 onerror="this.style.display='none'">
                            <span class="ingredient-name">${TRANSLATIONS[ing] || ing}</span>
                        </div>
                    `).join('')}
                </div>
            `;
            
            grid.appendChild(card);
        });
        
        typeSection.appendChild(grid);
        container.appendChild(typeSection);
    });
    
    setupDishEventListeners();
}

function setupDishEventListeners() {
    // Клик по карточке (кроме кнопок уровней)
    document.querySelectorAll('.dish-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.dish-level-btn')) return;
            
            const name = card.dataset.dishName;
            const checkbox = card.querySelector('.dish-ownership-toggle');
            
            if (!userState.dishes[name]) {
                userState.dishes[name] = { owned: false, level: 1 };
            }
            
            userState.dishes[name].owned = !userState.dishes[name].owned;
            checkbox.checked = userState.dishes[name].owned;
            saveUserState();
            renderDishes();
            updateRosterSummary();
        });
    });
    
    // Выбор уровня
    document.querySelectorAll('.dish-level-btn:not(.hidden)').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            const name = btn.dataset.dishLvl;
            const level = parseInt(btn.dataset.level);
            
            if (!userState.dishes[name]) {
                userState.dishes[name] = { owned: false, level: 1 };
            }
            
            userState.dishes[name].level = level;
            saveUserState();
            renderDishes();
        });
    });
}

// ── CHARACTERS ────────────────────────────────────────────────────────────
function renderCharacters() {
    const container = document.getElementById('charCardsGrid');
    if (!container) return;
    container.innerHTML = '';
    
    // Обновляем статистику
    const ownedCount = masterData.characters.filter(c => (userState.characters[c.name] || {}).owned).length;
    document.getElementById('ownedCount').textContent = ownedCount;
    document.getElementById('totalCount').textContent = masterData.characters.length;
    
    masterData.characters.forEach(c => {
        if (!userState.characters[c.name]) {
            userState.characters[c.name] = { owned: false, level: 1 };
        }
        
        const us = userState.characters[c.name];
        const isOwned = us.owned;
        const currentLevel = us.level || 1;
        
        // Считываем данные персонажей из character-data.js
        const charRank = CHARACTER_RANKS[c.name] || { rank: 'A', element: 'order' };
        const rank = charRank.rank;
        const element = charRank.element;
        
        // Определяем специализацию по первому навыку
        const specialty = getCharacterSpecialty(c);
        
        // Создаем карточку
        const card = document.createElement('div');
        card.className = `char-card-modern ${isOwned ? 'owned' : 'not-owned'}`;
        card.dataset.charName = c.name; // Добавляем data-атрибут для обработчика
        
        // HTML карточки
            card.innerHTML = `
            <input type="checkbox" class="char-ownership-toggle" 
           data-char-owned="${c.name}" ${isOwned ? 'checked' : ''}>
    
            <div class="char-card-header-modern">
                <img src="./assets/images/calculator/characters/${c.name.toLowerCase().replace(/\s+/g, '_')}.png" 
                     alt="${c.name}" 
                     class="char-portrait"
                     onerror="this.src='./assets/images/common/placeholder-character.png'">
                
                <div class="char-info">
                    <div class="char-name-row">
                        <span class="char-name-modern">${TRANSLATIONS[c.name] || c.name}</span>
                        <img src="./assets/images/common/rangs/rank_${rank}.png" 
                            alt="${rank}" 
                            class="char-rank-img"
                            onerror="this.style.display='none'">
                    </div>
                    <div class="char-specialty">${specialty}</div>
                </div>
                
                <div class="char-ownership-badge ${isOwned ? 'owned' : 'not-owned'}"></div>
            </div>
            
            <div class="char-card-body-modern">
                <div class="char-skill-name">${getSkillName(c)}</div>
                <div class="char-skill-desc">${getSkillDescription(c, currentLevel)}</div>
                
                <div class="char-level-selector">
                    ${[1, 2, 3, 4, 5].map(lvl => `
                        <button class="char-level-btn ${lvl === currentLevel ? 'active' : ''}" 
                                data-char-lvl="${c.name}" 
                                data-level="${lvl}"
                                ${!isOwned ? 'disabled' : ''}>
                            L${lvl}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
        
        container.appendChild(card);
    });
    
    // Обработчики событий
    setupCharacterEventListeners();
}

// Вспомогательные функции
function getCharacterSpecialty(character) {
    if (!character.skills || character.skills.length === 0) return 'Нет навыков';
    
    const skill = character.skills[0];
    const translations = {
        'Price_Flat': 'Плоская цена',
        'Price_Multiply': 'Множитель цены',
        'Traffic_Flat': 'Плоский трафик',
        'Traffic_Multiply': 'Множитель трафика'
    };
    
    return translations[skill.type] || skill.type;
}

function getSkillName(character) {
    if (!character.skills || character.skills.length === 0) return 'Навык';
    
    const skill = character.skills[0];
    const names = {
        'Price_Flat': 'Бонус к цене',
        'Price_Multiply': 'Множитель цены',
        'Traffic_Flat': 'Бонус к трафику',
        'Traffic_Multiply': 'Множитель трафика'
    };
    
    return names[skill.type] || 'Навык';
}

function getSkillDescription(character, level) {
    if (!character.skills || character.skills.length === 0) return 'Нет навыков';
    
    // Собираем ВСЕ навыки до выбранного уровня включительно
    const activeSkills = character.skills.filter(s => s.level <= level && s.val > 0);
    
    if (activeSkills.length === 0) return 'Нет активных навыков';
    
    // Группируем по типу и суммируем значения
    const totals = {};
    activeSkills.forEach(skill => {
        const key = skill.type;
        if (!totals[key]) totals[key] = { val: 0, tag: skill.tag };
        totals[key].val += skill.val;
    });
    
    // Формируем описание для каждого типа
    const parts = [];
    for (const [type, data] of Object.entries(totals)) {
        let desc = '';
        if (type === 'Price_Flat') {
            desc = `+${data.val.toFixed(2)} к цене`;
        } else if (type === 'Price_Multiply') {
            desc = `+${(data.val * 100).toFixed(1)}% к цене`;
        } else if (type === 'Traffic_Flat') {
            desc = `+${Math.round(data.val)} к трафику`;
        } else if (type === 'Traffic_Multiply') {
            desc = `+${(data.val * 100).toFixed(1)}% к трафику`;
        }
        if (data.tag && data.tag !== 'None') {
            desc += ` (${data.tag})`;
        }
        parts.push(desc);
    }
    
    return parts.join(' · ');
}

function setupCharacterEventListeners() {
    // Клик по всей карточке
    document.querySelectorAll('.char-card-modern').forEach(card => {
        card.addEventListener('click', (e) => {
            // Игнорируем клики по кнопкам уровней
            if (e.target.closest('.char-level-btn') || 
                e.target.closest('.char-level-selector')) {
                return;
            }
            
            const name = card.dataset.charName;
            const checkbox = card.querySelector('.char-ownership-toggle');
            
            if (!userState.characters[name]) {
                userState.characters[name] = { owned: false, level: 1 };
            }
            
            // Переключаем состояние
            userState.characters[name].owned = !userState.characters[name].owned;
            if (!userState.characters[name].owned) {
                userState.characters[name].level = 1;
            }
            
            checkbox.checked = userState.characters[name].owned;
            saveUserState();
            renderCharacters();
            updateRosterSummary();
        });
    });
    
    // Выбор уровня - клик по кнопке
    document.querySelectorAll('.char-level-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            const card = btn.closest('.char-card-modern');
            const name = btn.dataset.charLvl;
            const level = parseInt(btn.dataset.level);
            
            if (!userState.characters[name]) {
                userState.characters[name] = { owned: false, level: 1 };
            }
            
            if (userState.characters[name].owned) {
                userState.characters[name].level = level;
                saveUserState();
                renderCharacters();
            }
        });
    });
}

// ── OPTIMIZER ─────────────────────────────────────────────────────────────
document.getElementById('btnRun')?.addEventListener('click', () => {
    saveSettings();
    updateRosterSummary();
    runOptimizer();
});

function runOptimizer() {
    const { cafesOwned, trendCategory, trendBonus } = settings;
    const trendMatch = trendCategory.toLowerCase();
    const maxDishes = cafesOwned;
    const maxChars = cafesOwned * 2;
    const trendingSubItems = trendMatch
        ? new Set(masterData.ingredients
            .filter(r => r.category.toLowerCase() === trendMatch)
            .map(r => r.name.toLowerCase()))
        : new Set();

    const ownedDishes = [];
    masterData.dishes.forEach(d => {
        const us = userState.dishes[d.name] || {};
        if (!us.owned) return;
        const lvl = us.level || 1;
        const base = (lvl == 2) ? d.priceL2 : d.priceL1;
        const ingredients = d.ingredients.toLowerCase();
        const typeMatch = trendMatch && d.type.toLowerCase().includes(trendMatch);
        let subMatch = false;
        for (const sub of trendingSubItems) { if (ingredients.includes(sub)) { subMatch = true; break; } }
        const ingMatch = trendMatch && (ingredients.includes(trendMatch) || subMatch);
        const isTrending = typeMatch || ingMatch;
        ownedDishes.push({ name: d.name, type: d.type, basePrice: base + (isTrending ? trendBonus : 0), isTrending });
    });

    const ownedChars = [];
    masterData.characters.forEach(c => {
        const us = userState.characters[c.name] || {};
        if (!us.owned) return;
        const charLvl = us.level || 1;
        const skills = (c.skills || [])
            .filter(s => charLvl >= (s.level || 1) && s.val > 0)
            .map(s => ({ val: s.val, req: s.req || 0, type: s.type, tag: s.tag || 'None' }));
        if (skills.length > 0) ownedChars.push({ name: c.name, skills });
    });

    if (ownedDishes.length === 0) { showError('Нет блюд в наличии. Перейдите на вкладку Блюда и отметьте некоторые как имеющиеся.'); return; }
    if (ownedDishes.length < maxDishes) { showError(`Нужно как минимум ${maxDishes} блюд для ${cafesOwned} кафе. У вас есть ${ownedDishes.length}.`); return; }

    const dishCombos = getCombinations(ownedDishes, maxDishes);
    const charCombos = ownedChars.length > 0
        ? getCombinations(ownedChars, Math.min(ownedChars.length, maxChars))
        : [[]];

    let bestScore = 0, bestData = null;

    dishCombos.forEach(testMenu => {
        const tagCounts = {};
        testMenu.forEach(d => { tagCounts[d.type] = (tagCounts[d.type] || 0) + 1; });
        const maxTagCount = Math.max(...Object.values(tagCounts), 0);

        charCombos.forEach(testTeam => {
            let currentTraffic = 2400;
            let currentPriceBuff = 0;
            let currentPriceMultiplier = 1.0;
            const tempLog = [];

            function getTagCount(skill) {
                if (skill.tag === 'None') return 0;
                if (skill.tag === 'Any') return maxTagCount;
                return tagCounts[skill.tag] || 0;
            }

            function skillActivates(skill) {
                const tc = skill.tag === 'None' ? skill.req : getTagCount(skill);
                return tc >= skill.req;
            }

            function appendLog(name, traffic, price, multiplier) {
                const parts = [];
                if (traffic > 0) parts.push(`+${traffic.toFixed(2)} Трафик`);
                if (price > 0) parts.push(`+${price.toFixed(2)} Цена`);
                if (multiplier > 0) parts.push(`+${(multiplier * 100).toFixed(1)}% Цена`);
                if (!parts.length) return;
                const idx = tempLog.findIndex(l => l.name === name);
                if (idx >= 0) tempLog[idx].buffs += ' & ' + parts.join(' & ');
                else tempLog.push({ name, buffs: parts.join(' & ') });
            }

            testTeam.forEach(c => {
                let tt = 0, tp = 0, activated = false;
                c.skills.forEach(skill => {
                    if (skill.type === 'Traffic_Multiply' || skill.type === 'Price_Multiply') return;
                    if (!skillActivates(skill)) return;
                    activated = true;
                    if (skill.type === 'Traffic_Flat') tt += skill.val;
                    if (skill.type === 'Price_Flat') tp += skill.val;
                });
                if (activated) { currentTraffic += tt; currentPriceBuff += tp; appendLog(c.name, tt, tp, 0); }
            });

            testTeam.forEach(c => {
                let tt = 0, activated = false;
                c.skills.forEach(skill => {
                    if (skill.type !== 'Traffic_Multiply') return;
                    if (!skillActivates(skill)) return;
                    activated = true;
                    tt += currentTraffic * skill.val;
                });
                if (activated) { currentTraffic += tt; appendLog(c.name, tt, 0, 0); }
            });

            testTeam.forEach(c => {
                let pm = 0, activated = false;
                c.skills.forEach(skill => {
                    if (skill.type !== 'Price_Multiply') return;
                    if (!skillActivates(skill)) return;
                    activated = true;
                    pm += skill.val;
                });
                if (activated) { currentPriceMultiplier += pm; appendLog(c.name, 0, 0, pm); }
            });

            const trafficRatio = currentTraffic / 100;
            const totalIncome = testMenu.reduce((sum, d) =>
                sum + (d.basePrice + currentPriceBuff) * currentPriceMultiplier * trafficRatio, 0);

            if (totalIncome > bestScore) {
                bestScore = totalIncome;
                bestData = {
                    dishes: testMenu,
                    traffic: currentTraffic,
                    priceBuff: currentPriceBuff,
                    priceMultiplier: currentPriceMultiplier,
                    income: totalIncome,
                    log: tempLog
                };
            }
        });
    });

    if (!bestData) { showError('Не найдено подходящего состава.'); return; }
    showResults(bestData);
}

function getCombinations(array, size) {
    const result = [];
    function helper(start, combo) {
        if (combo.length === size) { result.push([...combo]); return; }
        for (let i = start; i < array.length; i++) helper(i + 1, [...combo, array[i]]);
    }
    helper(0, []);
    return result;
}

// ── RESULTS ───────────────────────────────────────────────────────────────
function showError(msg) {
    const el = document.getElementById('resultsArea');
    if (el) el.innerHTML = `<div class="results-placeholder"><div class="placeholder-icon">⚠️</div><p style="color:var(--red)">${msg}</p></div>`;
}

function showResults(data) {
    const { trendCategory, trendBonus } = settings;
    const trafficRatio = data.traffic / 100;
    const fons = TRANSLATIONS['Fons'] || 'Fons';
    const trendHtml = trendCategory
        ? `<div style="font-family:var(--mono);font-size:0.78rem;color:var(--accent);margin-bottom:0.5rem">🔥 Тренд: ${TRANSLATIONS[trendCategory] || trendCategory} (+${trendBonus.toFixed(2)} ${fons})</div>`
        : '';

    const statsHtml = `<div class="result-stat-row">
        <div class="result-stat"><div class="result-stat-label">Трафик</div><div class="result-stat-value">${data.traffic.toFixed(2)}</div></div>
        <div class="result-stat"><div class="result-stat-label">Бонус цены</div><div class="result-stat-value">+${data.priceBuff.toFixed(2)}</div></div>
        <div class="result-stat"><div class="result-stat-label">Множитель цены</div><div class="result-stat-value">×${data.priceMultiplier.toFixed(3)}</div></div>
        <div class="result-stat" style="border-color:var(--accent);background:rgba(245,166,35,0.06)"><div class="result-stat-label">Общий доход (как в игре)</div><div class="result-stat-value">${data.income.toFixed(2)} <span style="font-size:0.7rem;color:var(--text3)">${fons}/час</span></div></div>
        <div class="result-stat" style="border-color:var(--accent);background:rgba(245,166,35,0.06)"><div class="result-stat-label">Общий доход (реальный)</div><div class="result-stat-value">${(data.income * (1 + settings.popularityBonus)).toFixed(2)} <span style="font-size:0.7rem;color:var(--text3)">${fons}/час</span></div></div>
    </div>`;

    const dishesHtml = `<div class="result-section-title">️ Лучшее меню</div><div class="result-menu">${data.dishes.map(d => {
        const finalPrice = (d.basePrice + data.priceBuff) * data.priceMultiplier;
        return `<div class="result-dish">
            <div class="result-dish-name">${d.isTrending ? '<span class="trend-badge">🔥</span>' : ''}${TRANSLATIONS[d.name] || d.name} <span style="font-size:0.7rem;color:var(--text3);font-family:var(--mono)">${TRANSLATIONS[d.type] || d.type}</span></div>
            <div style="display:flex;gap:1rem;font-family:var(--mono);font-size:0.8rem">
                <span class="result-dish-price">${finalPrice.toFixed(2)} ${fons}</span>
                <span class="result-dish-income">${(finalPrice * trafficRatio).toFixed(2)}/час</span>
            </div>
        </div>`;
    }).join('')}</div>`;

    const logHtml = data.log.length > 0 ? `<div class="result-section-title" style="margin-top:1rem"> Бонусы персонажей</div><div class="result-log">${data.log.map(e => `<div class="log-entry"><span class="log-name">${TRANSLATIONS[e.name] || e.name}</span><span class="log-buffs">${e.buffs}</span></div>`).join('')}</div>` : '';

    const el = document.getElementById('resultsArea');
    if (el) el.innerHTML = `<div class="results-output">${trendHtml}${statsHtml}${dishesHtml}${logHtml}</div>`;
}

// ── START ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);