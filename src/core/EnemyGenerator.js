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

    // in EnemyGenerator.js

getLayoutForRound(round) {
    // =================================================================
    // STEP 1: ルールとテーマの決定
    // =================================================================
    const rule = ROUND_RULES[round] || ROUND_RULES[Object.keys(ROUND_RULES).pop()];
    if (!rule) {
        console.error(`ラウンド${round}のルールが定義されていません。`);
        return {};
    }

    const themeKey = Phaser.Utils.Array.GetRandom(rule.themePool);
    const theme = THEMES[themeKey];
    if (!theme) {
        console.error(`テーマ'${themeKey}'が定義されていません。`);
        return {};
    }
    
    console.log(`%c[EnemyGenerator] Round ${round}: Theme is "${themeKey}"`, "color: orange;");

    // =================================================================
    // STEP 2: テーマに基づいた候補リストの作成
    // =================================================================
    let candidatePool = [];
    theme.pools.forEach(poolKey => {
        // POOLSオブジェクトから、対応する属性のキャラクターリストを追加
        if (POOLS[poolKey]) {
            candidatePool.push(...POOLS[poolKey]);
        }
    });
    // 重複したキャラクターIDを削除（例: 'mixed'と'fire'の両方に属するキャラなど）
    candidatePool = [...new Set(candidatePool)];

    // =================================================================
    // STEP 3: チーム編成アルゴリズム
    // =================================================================
    const team = [];
    let budget = rule.budget;
    let count = rule.count;
    let uniqueCounter = 1;

    // --- 3a. ボスがいれば、確定でチームに追加 ---
    if (theme.boss && ITEM_DATA[theme.boss]) {
        const bossId = theme.boss;
        if (ITEM_DATA[bossId].cost <= budget) {
            team.push(`${bossId}_${uniqueCounter++}`);
            budget -= ITEM_DATA[bossId].cost;
            count--;
            // 候補リストから、同じ種類のキャラクターは削除（ボスは1体のみ）
           // candidatePool = candidatePool.filter(id => id !== bossId);
        }
    }

    // --- 3b. 残りの予算と人数で、候補リストからランダムに選出 ---
    while (count > 0 && candidatePool.length > 0) {
        // 現在の予算で雇えるキャラクターだけに候補を絞り込む
        const affordablePool = candidatePool.filter(id => ITEM_DATA[id].cost <= budget);
        
        // 予算内で雇えるキャラがもういなければ、編成を終了
        if (affordablePool.length === 0) break;

        // 雇えるキャラの中からランダムに1体選ぶ
        const randomId = Phaser.Utils.Array.GetRandom(affordablePool);
        
        // チームに追加し、予算と残り人数を更新
        team.push(`${randomId}_${uniqueCounter++}`);
        budget -= ITEM_DATA[randomId].cost;
        count--;
        
        // 候補リストから、選んだキャラと同じ種類のものは削除（同じキャラは1体まで）
        candidatePool = candidatePool.filter(id => id !== randomId);
    }
    console.log("[EnemyGenerator] Generated Team:", team);

     // =================================================================
    // STEP 4: インテリジェント自動配置アルゴリズム
    // =================================================================
    const layout = {};
    const gridSize = 6;
    const backpack = Array(gridSize).fill(0).map(() => Array(gridSize).fill(false));

    // --- 4a. アイテムを「シナジー持ち」と「その他」に分離 ---
    const synergyItems = team.filter(id => ITEM_DATA[id.split('_')[0]].synergy);
    const otherItems = team.filter(id => !ITEM_DATA[id.split('_')[0]].synergy);
    // シナジー持ちを先に配置するため、配列を結合
    const sortedTeam = [...synergyItems, ...otherItems];

    // --- 4b. ヘルパー関数: 指定した位置にアイテムを配置可能かチェック ---
    const canPlace = (itemShape, r, c) => {
        if (r < 0 || c < 0 || r + itemShape.length > gridSize || c + itemShape[0].length > gridSize) return false;
        for (let sr = 0; sr < itemShape.length; sr++) {
            for (let sc = 0; sc < itemShape[0].length; sc++) {
                if (itemShape[sr][sc] === 1 && backpack[r + sr][c + sc]) return false;
            }
        }
        return true;
    };

    // --- 4c. ヘルパー関数: 実際にアイテムを配置する ---
    const placeItem = (uniqueId, r, c) => {
        const shape = ITEM_DATA[uniqueId.split('_')[0]].shape;
        layout[uniqueId] = { row: r, col: c, rotation: 0 };
        for (let sr = 0; sr < shape.length; sr++) {
            for (let sc = 0; sc < shape[0].length; sc++) {
                if (shape[sr][sc] === 1) backpack[r + sr][c + sc] = true;
            }
        }
    };

    // --- 4d. 配置実行 ---
    sortedTeam.forEach(uniqueId => {
        const baseId = uniqueId.split('_')[0];
        const itemData = ITEM_DATA[baseId];
        const shape = itemData.shape;
        
        let bestPosition = null;

        // --- 4d-1. シナジー持ちアイテムの場合、最適な場所を探す ---
        if (itemData.synergy) {
            let maxSynergyScore = -1;
            
            // 全てのグリッドと全ての隣接マスをチェック
            for (let r = 0; r < gridSize; r++) {
                for (let c = 0; c < gridSize; c++) {
                    // 既に配置済みのアイテム(targetId)が(r,c)にあるか
                    const targetUniqueId = Object.keys(layout).find(key => {
                        const targetLayout = layout[key];
                        const targetShape = ITEM_DATA[key.split('_')[0]].shape;
                        return  r >= targetLayout.row && r < targetLayout.row + targetShape.length &&
                                c >= targetLayout.col && c < targetLayout.col + targetShape[0].length;
                    });

                    if (targetUniqueId) {
                        const targetData = ITEM_DATA[targetUniqueId.split('_')[0]];
                        // 隣接する4方向に、このシナジーアイテムを置けるか試す
                        const directions = [{r:-shape.length, c:0}, {r:1, c:0}, {r:0, c:-shape[0].length}, {r:0, c:1}];
                        directions.forEach(dir => {
                            const placeR = r + dir.r;
                            const placeC = c + dir.c;
                            if (canPlace(shape, placeR, placeC)) {
                                let currentScore = 0;
                                // シナジーが発動する相手か？ (タグをチェック)
                                if (targetData.tags && targetData.tags.includes(itemData.synergy.targetTag)) {
                                    currentScore = 1; // とりあえずスコアを1とする
                                }
                                if (currentScore > maxSynergyScore) {
                                    maxSynergyScore = currentScore;
                                    bestPosition = { r: placeR, c: placeC };
                                }
                            }
                        });
                    }
                }
            }
        }

        // --- 4d-2. 最適な場所が見つからなかった場合、またはシナジーがない場合 ---
        if (!bestPosition) {
            // ランダムな空きマスを探す
            const emptyCells = [];
            for (let r = 0; r < gridSize; r++) {
                for (let c = 0; c < gridSize; c++) {
                    if (canPlace(shape, r, c)) {
                        emptyCells.push({ r, c });
                    }
                }
            }
            if (emptyCells.length > 0) {
                bestPosition = Phaser.Utils.Array.GetRandom(emptyCells);
            }
        }
        
        // --- 4d-3. 最終的な配置 ---
        if (bestPosition) {
            placeItem(uniqueId, bestPosition.r, bestPosition.c);
        } else {
            console.warn(`[EnemyGenerator] アイテム'${uniqueId}'を配置するスペースがありませんでした。`);
        }
    });

    console.log("[EnemyGenerator] Final Intelligent Layout:", layout);
    return layout;
}
};