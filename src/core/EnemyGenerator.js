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
    // まずはサイズの大きいものから配置すると、隙間が生まれにくい
const sortedTeam = team.sort((a, b) => {
    const sizeA = ITEM_DATA[a.split('_')[0]].shape.length * ITEM_DATA[a.split('_')[0]].shape[0].length;
    const sizeB = ITEM_DATA[b.split('_')[0]].shape.length * ITEM_DATA[b.split('_')[0]].shape[0].length;
    return sizeB - sizeA;
});

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

    // --- 4c. 配置実行 ---
sortedTeam.forEach(uniqueId => {
    const baseId = uniqueId.split('_')[0];
    const itemData = ITEM_DATA[baseId];
    const shape = itemData.shape;
    
    let bestPosition = null;
    let maxScore = -1;

    // グリッド上の全ての空きマスを、配置候補として試す
    for (let r = 0; r <= gridSize - shape.length; r++) {
        for (let c = 0; c <= gridSize - shape[0].length; c++) {
            if (canPlace(shape, r, c)) {
                let currentScore = 0;
                
                // --- この配置が、どれだけ良いシナジーを生むかスコアリング ---
                
                // 1. このアイテムが「与える」シナジーの評価
                if (itemData.synergy) {
                    // (将来的に、このアイテムのシナジー方向に、適合する配置済みアイテムがあれば加点)
                }

                // 2. このアイテムが、配置済みのアイテムから「受ける」シナジーの評価
                Object.keys(layout).forEach(placedId => {
                    const placedItemData = ITEM_DATA[placedId.split('_')[0]];
                    if (placedItemData.synergy) {
                        // 配置済みのアイテム(placedItem)が、今置こうとしているアイテム(itemData)に
                        // シナジーを与えられるかチェックする
                        const sourceLayout = layout[placedId];
                        const sourceShape = ITEM_DATA[placedId.split('_')[0]].shape;
                        
                        // (ここに、非常に複雑な相対位置チェックのロジックが入る)
                        // 今回は、よりシンプルで効果的なアプローチを取る
                    }
                });

                // ★★★ シンプルかつ効果的な新スコアリングロジック ★★★
                // ランダム性を加えることで、毎回違う配置になるようにする
                // 0.5は「とりあえず置ける」という基本スコア
                currentScore = 0.5 + Math.random(); 

                // もしこのアイテムがシナジー持ちなら、中央に近いほど高スコア
                if(itemData.synergy){
                    const distanceFromCenter = Math.abs(r - 2.5) + Math.abs(c - 2.5);
                    currentScore += 5 - distanceFromCenter; // 中央に近いほど高い
                }

                if (currentScore > maxScore) {
                    maxScore = currentScore;
                    bestPosition = { r, c };
                }
            }
        }
    }
    
    // --- 4d. 最終的な配置 ---
    if (bestPosition) {
        placeItem(uniqueId, bestPosition.r, bestPosition.c);
    } else {
        console.warn(`[EnemyGenerator] アイテム'${uniqueId}'を配置するスペースがありませんでした。`);
    }
});

console.log("[EnemyGenerator] Final Intelligent Layout:", layout);
return layout;}
};