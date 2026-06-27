import { getSettings, getUserState, saveUserState } from '../../js/common/state.js';
import { getCombinations } from '../../js/common/utils.js';

// ── CHARACTERS UI ──────────────────────────────────────────────────────────
export function renderCharacters(masterData, TRANSLATIONS, CHARACTER_RANKS, updateRosterSummary) {
    const userState = getUserState();
    const container = document.getElementById('charCardsGrid');
    if (!container) return;
    container.innerHTML = '';
    
    const ownedCount = masterData.characters.filter(c => (userState.characters[c.name] || {}).owned).length;
    const ownedCountEl = document.getElementById('ownedCount');
    const totalCountEl = document.getElementById('totalCount');
    if (ownedCountEl) ownedCountEl.textContent = ownedCount;
    if (totalCountEl) totalCountEl.textContent = masterData.characters.length;
    
    masterData.characters.forEach(c => {
        if (!userState.characters[c.name]) {
            userState.characters[c.name] = { owned: false, level: 1 };
        }
        
        const us = userState.characters[c.name];
        const isOwned = us.owned;
        const currentLevel = us.level || 1;
        
        const charRank = window.CHARACTER_RANKS[c.name] || { rank: 'A', element: 'order' };
        const rank = charRank.rank;
        const specialty = getCharacterSpecialty(c);
        
        const card = document.createElement('div');
        card.className = `char-card-modern ${isOwned ? 'owned' : 'not-owned'}`;
        card.dataset.charName = c.name;
        
        card.innerHTML = `
            <div class="char-card-header-modern">
                <img src="../assets/images/common/characters/avatars/round/100/${c.name.toLowerCase().replace(/\s+/g, '_')}.webp" 
                     alt="${c.name}" 
                     class="char-portrait"
                     onerror="if(this.src.indexOf('not_found_char')===-1)this.src='./assets/images/common/not_found/not_found_char.webp'">
                
                <div class="char-info">
                    <div class="char-name-row">
                        <span class="char-name-modern">${TRANSLATIONS[c.name] || c.name}</span>
                        <img src="../assets/images/common/ranks/rank_${rank}.webp" 
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
    
    setupCharacterEventListeners(masterData, userState, updateRosterSummary);
}

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
    const activeSkills = character.skills.filter(s => s.level <= level && s.val > 0);
    if (activeSkills.length === 0) return 'Нет активных навыков';
    
    const totals = {};
    activeSkills.forEach(skill => {
        const key = skill.type;
        if (!totals[key]) totals[key] = { val: 0, tag: skill.tag };
        totals[key].val += skill.val;
    });
    
    const parts = [];
    for (const [type, data] of Object.entries(totals)) {
        let desc = '';
        if (type === 'Price_Flat') desc = `+${data.val.toFixed(2)} к цене`;
        else if (type === 'Price_Multiply') desc = `+${(data.val * 100).toFixed(1)}% к цене`;
        else if (type === 'Traffic_Flat') desc = `+${Math.round(data.val)} к трафику`;
        else if (type === 'Traffic_Multiply') desc = `+${(data.val * 100).toFixed(1)}% к трафику`;
        if (data.tag && data.tag !== 'None') desc += ` (${data.tag})`;
        parts.push(desc);
    }
    return parts.join(' · ');
}

function setupCharacterEventListeners(masterData, userState, updateRosterSummary) {
    document.querySelectorAll('.char-card-modern').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.char-level-btn') || e.target.closest('.char-level-selector')) return;
            
            const name = card.dataset.charName;
            if (!userState.characters[name]) {
                userState.characters[name] = { owned: false, level: 1 };
            }
            userState.characters[name].owned = !userState.characters[name].owned;
            if (!userState.characters[name].owned) {
                userState.characters[name].level = 1;
            }
            saveUserState();
            renderCharacters(window.masterData, window.TRANSLATIONS, window.CHARACTER_RANKS, updateRosterSummary);
            if (updateRosterSummary) updateRosterSummary();
        });
    });
    
    document.querySelectorAll('.char-level-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const name = btn.dataset.charLvl;
            const level = parseInt(btn.dataset.level);
            if (!userState.characters[name]) {
                userState.characters[name] = { owned: false, level: 1 };
            }
            if (userState.characters[name].owned) {
                userState.characters[name].level = level;
                saveUserState();
                renderCharacters(window.masterData, window.TRANSLATIONS, window.CHARACTER_RANKS, updateRosterSummary);
            }
        });
    });
}