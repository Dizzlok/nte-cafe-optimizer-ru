// ═══════════════════════════════════════════════════════
// ИСПРАВЛЕНИЕ ОПЕЧАТОК ИЗ data.js
// Ключ: неправильное имя из data.js
// Значение: правильное имя (под него называешь файлы)
// ═══════════════════════════════════════════════════════

export const NAME_FIXES = {
    // Блюда
    "Matacha Lava Mousse": "Matcha Lava Mousse",
    "Red Bean & Butter Crossiant": "Red Bean & Butter Croissant",
    
    
    // Персонажи
    "Dafodil": "Daffodil",
    
    // Добавляй сюда новые опечатки по мере появления
};

// Исправить одно имя
export function fixName(name) {
    return NAME_FIXES[name] || name;
}

// Исправить все данные сразу
export function fixAllNames(masterData) {
    masterData.dishes.forEach(d => { d.name = fixName(d.name); });
    masterData.characters.forEach(c => { c.name = fixName(c.name); });
    masterData.ingredients.forEach(i => { i.name = fixName(i.name); });
    return masterData;
}