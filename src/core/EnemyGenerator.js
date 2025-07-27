// src/core/EnemyGenerator.js (データ定義追加版)

import { ITEM_DATA } from './ItemData.js'; // ★ITEM_DATAをインポート

// =================================================================
// STEP 1: キャラクタープールの定義
// =================================================================
// ITEM_DATAを元に、属性ごとのキャラクタープールを自動生成する
const POOLS = {
    fire: [], water: [], earth: [], wind: [], light: [], dark: [], neutral: []
};

for (const itemId in ITEM_DATA) {
    const item = ITEM_DATA[itemId];
    if (!item.cost || !item.rarity) continue; // ショップに出ないアイテムは除外

    let addedToPool = false;
    if (item.tags) {
        if (item.tags.includes('fire'))  { POOLS.fire.push(itemId); addedToPool = true; }
        if (item.tags.includes('water')) { POOLS.water.push(itemId); addedToPool = true; }
        if (item.tags.includes('earth')) { POOLS.earth.push(itemId); addedToPool = true; }
        if (item.tags.includes('wind'))  { POOLS.wind.push(itemId); addedToPool = true; }
        if (item.tags.includes('light')) { POOLS.light.push(itemId); addedToPool = true; }
        if (item.tags.includes('dark'))  { POOLS.dark.push(itemId); addedToPool = true; }
    }
    if (!addedToPool) {
        POOLS.neutral.push(itemId); // どの属性にも属さない場合は neutral プールへ
    }
}
console.log("自動生成されたキャラクタープール:", POOLS);


// =================================================================
// STEP 2: ラウンドごとのルールの定義
// =================================================================
const ROUND_RULES = {
    // key: ラウンド数
    // themes: このラウンドで出現する可能性のある属性テーマ
    // budget: 敵が使えるコストの上限
    // count: 敵のバックパックに配置されるアイテムの数
    // boss: このラウンドで確定出現するボスキャラ（オプション）
    1: { themes: ['neutral', 'fire'], budget: 20, count: 1 },
    2: { themes: ['fire', 'earth'],   budget: 40, count: 2 },
    3: { themes: ['earth'],           budget: 80, count: 3, boss: 'siegfried' },
    4: { themes: ['wind'],            budget: 100, count: 3 },
    // ... ここに5〜10ラウンド目のルールを定義していく
};


export const EnemyGenerator = {

    /**
     * 指定されたラウンドの敵レイアウトを取得する
     * @param {number} round - 現在のラウンド数
     * @returns {object} 敵のレイアウトオブジェクト
     */
    getLayoutForRound(round) {
        const rule = ROUND_RULES[round] || ROUND_RULES[Object.keys(ROUND_RULES).pop()];
        if (!rule) {
            console.error(`ラウンド${round}のルールが定義されていません。`);
            return {};
        }

        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // ★ ここに、上記のルールとプールを使ってランダムに敵を生成し、 ★
        // ★ 自動でバックパックに配置するアルゴリズムを、次回実装します。 ★
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

        // --- 今はまだ、以前の静的なデータを返す ---
        const staticLayouts = {
            1: { 'sword': { row: 2, col: 2 } },
            2: { 'potion_of_life': { row: 1, col: 2 }, 'shield_1': { row: 3, col: 1 }, 'shield_2': { row: 3, col: 3 } },
            3: { 'siegfried': { row: 2, col: 2 }, 'golem_1': { row: 4, col: 1 }, 'golem_2': { row: 4, col: 4 } }
        };
        return staticLayouts[round] || staticLayouts[3];
    }
};