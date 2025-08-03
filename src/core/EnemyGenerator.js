 import { ITEM_DATA } from './ItemData.js';

// STEP 1: キャラクタープールの自動生成
const POOLS = { fire: [], water: [], earth: [], wind: [], light: [], dark: [], neutral: [],tutorial_dummy: ['yachima'], 
    // 例: sword_enemyは攻撃してくるので、ブロックの練習相手に適している
    tutorial_dummy_strong: ['sword'] };
for (const itemId in ITEM_DATA) {
    const item = ITEM_DATA[itemId];
    if (!item.cost || !item.rarity) continue;
    let added = false;
    for (const poolKey in POOLS) {
        if (item.tags && item.tags.includes(poolKey)) {
            POOLS[poolKey].push(itemId);
            added = true;
        }
    }
    if (!added) POOLS.neutral.push(itemId);
}
console.log("自動生成されたキャラクタープール:", POOLS);

// STEP 2: 代表キャラクター（ボス）の定義
const REPRESENTATIVES = {
    fire: 'perceval', water: 'lancelot', earth: 'siegfried',
    wind: 'veirne', light: 'funf', dark: 'six'
};

// ★★★ ランダムアバターの候補リストを定義 ★★★
const RANDOM_AVATAR_POOL = [
    'avatar_angel', 
    'avatar_demon', 
    'avatar_adventurer',
];

// STEP 3: テーマの定義
const THEMES = {
    // ★★★【案Aの仕様】混合テーマのみアバター指定なし ★★★
    'mixed_elements':    { pools: ['fire', 'wind', 'earth', 'neutral'] }, 
    
    // 他のテーマは全て固定アバターを指定
    'light_specialized': { pools: ['light', 'neutral'], avatar: 'avatar_funf' }, 
    'dark_specialized':  { pools: ['dark', 'neutral'],  avatar: 'avatar_demon_lord' },
    'fire_specialized':  { pools: ['fire', 'neutral'],  boss: REPRESENTATIVES.fire, avatar: 'avatar_perceval' },
    'water_specialized': { pools: ['water', 'neutral'], boss: REPRESENTATIVES.water, avatar: 'avatar_lancelot' },
    'earth_specialized': { pools: ['earth', 'neutral'], boss: REPRESENTATIVES.earth, avatar: 'avatar_siegfried' },
    'wind_specialized':  { pools: ['wind', 'neutral'],  boss: REPRESENTATIVES.wind, avatar: 'avatar_veirne' },
    'tutorial':          { pools: ['neutral'], avatar: 'enemy_avatar_placeholder' },
    'final_battle':      { pools: ['fire', 'water', 'earth', 'wind'], boss: REPRESENTATIVES.dark, avatar: 'avatar_six' },
    'tutorial_sandbag': { pools: ['tutorial_dummy'], avatar: 'enemy_avatar_placeholder' },
    'tutorial_attacker': { pools: ['tutorial_dummy_strong'], avatar: 'enemy_avatar_placeholder' },
};


// STEP 4: ラウンドごとのルール定義
const ROUND_RULES = {
    1: { themePool: ['tutorial'], budget: 30, count: Phaser.Math.Between(1, 2) },
    2: { themePool: ['light_specialized', 'dark_specialized', 'mixed_elements'], budget: 50, count: 3 },
    3: { themePool: ['light_specialized', 'dark_specialized', 'mixed_elements'], budget: 80, count: 5 },
    4: { themePool: ['light_specialized', 'dark_specialized', 'mixed_elements'], budget: 150, count: 5 },
    5: { themePool: ['light_specialized', 'dark_specialized', 'mixed_elements'], budget: 200, count: 6 },
    6: { themePool: ['fire_specialized', 'water_specialized', 'earth_specialized', 'wind_specialized'], budget: 300, count: 6 },
    7: { themePool: ['fire_specialized', 'water_specialized', 'earth_specialized', 'wind_specialized'], budget: 400, count: 7 },
    8: { themePool: ['fire_specialized', 'water_specialized', 'earth_specialized', 'wind_specialized','light_specialized', 'dark_specialized'], budget: 500, count: 8 },
    9: { themePool: ['fire_specialized', 'water_specialized', 'earth_specialized', 'wind_specialized','light_specialized', 'dark_specialized'], budget: 600, count: 10 },
    10: { themePool: ['final_battle'], budget: 700, count: 99 }
};

export const EnemyGenerator = {

    getLayoutForRound(round) {
        // ... (STEP 1〜3のチーム編成アルゴリズムは変更なし) ...
        const rule = ROUND_RULES[round] || ROUND_RULES[Object.keys(ROUND_RULES).pop()];
        if (!rule) { console.error(`ラウンド${round}のルールが定義されていません。`); return {}; }
        const themeKey = Phaser.Utils.Array.GetRandom(rule.themePool);
        const theme = THEMES[themeKey];
        if (!theme) { console.error(`テーマ'${themeKey}'が定義されていません。`); return {}; }
        console.log(`%c[EnemyGenerator] Round ${round}: Theme is "${themeKey}"`, "color: orange;");
        let candidatePool = [];
        theme.pools.forEach(poolKey => { if (POOLS[poolKey]) { candidatePool.push(...POOLS[poolKey]); } });
        candidatePool = [...new Set(candidatePool)];
        const team = [];
        let budget = rule.budget;
        let count = rule.count;
        let uniqueCounter = 1;
        if (theme.boss && ITEM_DATA[theme.boss]) {
            const bossId = theme.boss;
            if (ITEM_DATA[bossId].cost <= budget) {
                team.push(`${bossId}_${uniqueCounter++}`);
                budget -= ITEM_DATA[bossId].cost;
                count--;
            }
        }
        while (count > 0 && candidatePool.length > 0) {
            const affordablePool = candidatePool.filter(id => ITEM_DATA[id].cost <= budget);
            if (affordablePool.length === 0) break;
            const randomId = Phaser.Utils.Array.GetRandom(affordablePool);
            team.push(`${randomId}_${uniqueCounter++}`);
            budget -= ITEM_DATA[randomId].cost;
            count--;
            candidatePool = candidatePool.filter(id => id !== randomId);
        }
        console.log("[EnemyGenerator] Generated Team:", team);

        // ... (STEP 4の自動配置アルゴリズムは変更なし) ...
        const layout = {};
        const gridSize = 6;
        const backpack = Array(gridSize).fill(0).map(() => Array(gridSize).fill(false));
        const sortedTeam = team.sort((a, b) => {
            const sizeA = ITEM_DATA[a.split('_')[0]].shape.length * ITEM_DATA[a.split('_')[0]].shape[0].length;
            const sizeB = ITEM_DATA[b.split('_')[0]].shape.length * ITEM_DATA[b.split('_')[0]].shape[0].length;
            return sizeB - sizeA;
        });
        const canPlace = (itemShape, r, c) => {
            if (r < 0 || c < 0 || r + itemShape.length > gridSize || c + itemShape[0].length > gridSize) return false;
            for (let sr = 0; sr < itemShape.length; sr++) { for (let sc = 0; sc < itemShape[0].length; sc++) { if (itemShape[sr][sc] === 1 && backpack[r + sr][c + sc]) return false; } }
            return true;
        };
        const placeItem = (uniqueId, r, c) => {
            const shape = ITEM_DATA[uniqueId.split('_')[0]].shape;
            layout[uniqueId] = { row: r, col: c, rotation: 0 };
            for (let sr = 0; sr < shape.length; sr++) { for (let sc = 0; sc < shape[0].length; sc++) { if (shape[sr][sc] === 1) backpack[r + sr][c + sc] = true; } }
        };
        sortedTeam.forEach(uniqueId => {
            const baseId = uniqueId.split('_')[0];
            const itemData = ITEM_DATA[baseId];
            const shape = itemData.shape;
            let bestPosition = null;
            let maxScore = -1;
            for (let r = 0; r <= gridSize - shape.length; r++) {
                for (let c = 0; c <= gridSize - shape[0].length; c++) {
                    if (canPlace(shape, r, c)) {
                        let currentScore = 0.5 + Math.random(); 
                        if(itemData.synergy){ const distanceFromCenter = Math.abs(r - 2.5) + Math.abs(c - 2.5); currentScore += 5 - distanceFromCenter; }
                        if (currentScore > maxScore) { maxScore = currentScore; bestPosition = { r, c }; }
                    }
                }
            }
            if (bestPosition) { placeItem(uniqueId, bestPosition.r, bestPosition.c); } 
            else { console.warn(`[EnemyGenerator] アイテム'${uniqueId}'を配置するスペースがありませんでした。`); }
        });

        console.log("[EnemyGenerator] Final Intelligent Layout:", layout);
        
        // ★★★ アバター決定ロジック（変更なしで案Aに対応） ★★★
        let selectedAvatar = theme.avatar;
        if (!selectedAvatar && RANDOM_AVATAR_POOL.length > 0) {
            selectedAvatar = Phaser.Utils.Array.GetRandom(RANDOM_AVATAR_POOL);
            console.log(`%c[EnemyGenerator] No fixed avatar. Selected a random avatar: "${selectedAvatar}"`, "color: cyan;");
        }
        
        return {
            layout: layout,
            avatar: selectedAvatar
        };
    }
};
