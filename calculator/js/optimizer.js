import { getSettings } from '../../js/common/state.js';
import { getCombinations } from '../../js/common/utils.js';

// ── OPTIMIZER ──────────────────────────────────────────────────────────────
export function runOptimizer(masterData, userState) {
    const settings = getSettings();
    const { trendCategory, trendBonus } = settings;
    const cafesOwned = settings.cafesOwned;
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
        for (const sub of trendingSubItems) { 
            if (ingredients.includes(sub)) { 
                subMatch = true; 
                break; 
            } 
        }
        const ingMatch = trendMatch && (ingredients.includes(trendMatch) || subMatch);
        const isTrending = typeMatch || ingMatch;
        ownedDishes.push({ 
            name: d.name, 
            type: d.type, 
            basePrice: base + (isTrending ? trendBonus : 0), 
            isTrending 
        });
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

    if (ownedDishes.length === 0) { 
        return { error: 'Нет блюд в наличии. Перейдите на вкладку Блюда и отметьте некоторые как имеющиеся.' }; 
    }
    if (ownedDishes.length < maxDishes) { 
        return { error: `Нужно как минимум ${maxDishes} блюд для ${cafesOwned} кафе. У вас есть ${ownedDishes.length}.` }; 
    }

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
                if (activated) { 
                    currentTraffic += tt; 
                    currentPriceBuff += tp; 
                    appendLog(c.name, tt, tp, 0); 
                }
            });

            testTeam.forEach(c => {
                let tt = 0, activated = false;
                c.skills.forEach(skill => {
                    if (skill.type !== 'Traffic_Multiply') return;
                    if (!skillActivates(skill)) return;
                    activated = true;
                    tt += currentTraffic * skill.val;
                });
                if (activated) { 
                    currentTraffic += tt; 
                    appendLog(c.name, tt, 0, 0); 
                }
            });

            testTeam.forEach(c => {
                let pm = 0, activated = false;
                c.skills.forEach(skill => {
                    if (skill.type !== 'Price_Multiply') return;
                    if (!skillActivates(skill)) return;
                    activated = true;
                    pm += skill.val;
                });
                if (activated) { 
                    currentPriceMultiplier += pm; 
                    appendLog(c.name, 0, 0, pm); 
                }
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

    if (!bestData) { 
        return { error: 'Не найдено подходящего состава.' }; 
    }
    
    return bestData;
}