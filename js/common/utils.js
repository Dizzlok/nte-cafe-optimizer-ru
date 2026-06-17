// ── UTILITIES ──────────────────────────────────────────────────────────────
export function nCr(n, r) {
    if (r > n || r < 0) return 0;
    if (r === 0 || r === n) return 1;
    r = Math.min(r, n - r);
    let result = 1;
    for (let i = 0; i < r; i++) {
        result = result * (n - i) / (i + 1);
    }
    return Math.round(result);
}

export function getCombinations(array, size) {
    const result = [];
    function helper(start, combo) {
        if (combo.length === size) { 
            result.push([...combo]); 
            return; 
        }
        for (let i = start; i < array.length; i++) {
            helper(i + 1, [...combo, array[i]]);
        }
    }
    helper(0, []);
    return result;
}