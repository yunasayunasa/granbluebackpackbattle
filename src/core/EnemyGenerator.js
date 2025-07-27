// src/core/EnemyGenerator.js (ランダム生成アルゴリズム実装版)

import { ITEM_DATA } from './ItemData.js';

// STEP 1: キャラクタープールの自動生成
const POOLS = { fire: [], water: [], earth: [], wind: [], light: [], dark: [], neutral: [] };
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

// STEP 3: テーマの定義
const THEMES = {
    'light_specialized': { pools: ['light', 'neutral'] },
    'dark_specialized':  { pools: ['dark', 'neutral'] },
    'mixed_elements':    { pools: ['fire', 'wind', 'earth', 'neutral'] },
    'fire_specialized':  { pools: ['fire', 'neutral'], boss: REPRESENTATIVES.fire },
    'water_specialized': { pools: ['water', 'neutral'], boss: REPRESENTATIVES.water },
    'earth_specialized': { pools: ['earth', 'neutral'], boss: REPRESENTATIVES.earth },
    'wind_specialized':  { pools: ['wind', 'neutral'], boss: REPRESENTATIVES.wind },
    'tutorial':          { pools: ['neutral'] },
    'final_battle':      { pools: ['fire', 'water', 'earth', 'wind'], boss: REPRESENTATIVES.dark }
};

// STEP 4: ラウンドごとのルール定義
const ROUND_RULES = {
    1: { themePool: ['tutorial'], budget: 20, count: 1 },
    2: { themePool: ['light_specialized', 'dark_specialized', 'mixed_elements'], budget: 40, count: 2 },
    3: { themePool: ['light_specialized', 'dark_specialized', 'mixed_elements'], budget: 70, count: 3 },
    4: { themePool: ['light_specialized', 'dark_specialized', 'mixed_elements'], budget: 110, count: 3 },
    5: { themePool: ['light_specialized', 'dark_specialized', 'mixed_elements'], budget: 150, count: 4 },
    6: { themePool: ['fire_specialized', 'water_specialized', 'earth_specialized', 'wind_specialized'], budget: 200, count: 3 },
    7: { themePool: ['fire_specialized', 'water_specialized', 'earth_specialized', 'wind_specialized'], budget: 250, count: 4 },
    8: { themePool: ['fire_specialized', 'water_specialized', 'earth_specialized', 'wind_specialized'], budget: 300, count: 4 },
    9: { themePool: ['fire_specialized', 'water_specialized', 'earth_specialized', 'wind_specialized'], budget: 350, count: 5 },
    10: { themePool: ['final_battle'], budget: 500, count: 5 }
};

export const EnemyGenerator = {

    getLayoutForRound(round) {
        const rule = ROUND_RULES[round] || ROUND_RULES[Object.keys(ROUND_RULES).pop()];
        if (!rule) return {};

        // 1. このラウンドのテーマをランダムに決定
        const themeKey = Phaser.Utils.Array.GetRandom(rule.themePool);
        const theme = THEMES[themeKey];
        if (!theme) return {};
        
        console.log(`Round ${round}: Theme is "${themeKey}"`);

        // 2. テーマに基づいて候補リストを作成
        let candidatePool = [];
        theme.pools.forEach(poolKey => {
            candidatePool.push(...POOLS[poolKey]);
        });
        // 重複を削除
        candidatePool = [...new Set(candidatePool)];

        // 3. チームを編成
        const team = [];
        let budget = rule.budget;
        let count = rule.count;
        let uniqueCounter = 1;

        // ボスがいれば確定で追加
        if (theme.boss && ITEM_DATA[theme.boss]) {
            team.push(theme.boss);
            budget -= ITEM_DATA[theme.boss].cost;
            count--;
            // 候補リストからボスと同じキャラは削除
            candidatePool = candidatePool.filter(id => id !== theme.boss);
        }

        // 残りの予算と人数でランダムに選出
        while (count > 0 && candidatePool.length > 0) {
            // 予算内で購入可能なアイテムのみに絞り込む
            const affordablePool = candidatePool.filter(id => ITEM_DATA[id].cost <= budget);
            if (affordablePool.length === 0) break; // 買えるものがなければ終了

            const randomId = Phaser.Utils.Array.GetRandom(affordablePool);
            const uniqueId = `${randomId}_${uniqueCounter++}`;
            team.push(uniqueId);
            budget -= ITEM_DATA[randomId].cost;
            count--;
            // 候補リストから同種のキャラは削除（同じキャラは1体まで）
            candidatePool = candidatePool.filter(id => id !== randomId);
        }
        
        console.log("Generated Team:", team);

        // 4. バックパックに自動配置
        const layout = {};
        const gridSize = 6;
        const backpack = Array(gridSize).fill(0).map(() => Array(gridSize).fill(false));

        team.forEach(uniqueId => {
            const baseId = uniqueId.split('_')[0];
            const itemData = ITEM_DATA[baseId];
            const shape = itemData.shape;
            
            let placed = false;
            for (let r = 0; r <= gridSize - shape.length && !placed; r++) {
                for (let c = 0; c <= gridSize - shape[0].length && !placed; c++) {
                    // この位置に配置可能かチェック
                    let canPlace = true;
                    for (let sr = 0; sr < shape.length; sr++) {
                        for (let sc = 0; sc < shape[sr].length; sc++) {
                            if (shape[sr][sc] === 1 && backpack[r + sr][c + sc]) {
                                canPlace = false;
                                break;
                            }
                        }
                        if (!canPlace) break;
                    }

                    // 配置可能なら、配置してループを抜ける
                    if (canPlace) {
                        layout[uniqueId] = { row: r, col: c, rotation: 0 };
                        for (let sr = 0; sr < shape.length; sr++) {
                            for (let sc = 0; sc < shape[sr].length; sc++) {
                                if (shape[sr][sc] === 1) {
                                    backpack[r + sr][c + sc] = true;
                                }
                            }
                        }
                        placed = true;
                    }
                }
            }
        });
        
        console.log("Final Layout:", layout);
        return layout;
    }
};