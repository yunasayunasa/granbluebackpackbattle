// src/core/ItemData.js (戦闘ロジック用の拡張)

export const ITEM_DATA = {
    'sword': {
        storage: 'item_sword',
        shape: [[1]],
        // ★★★ 以下を追加 ★★★
        recast: 2.0, // 2秒に1回行動する
        action: {
            type: 'attack', // 行動の種類
            value: 5        // 基本攻撃力
        }
    },
    'shield': {
        storage: 'item_shield',
        shape: [[1, 1]],
        // ★★★ 以下を追加 ★★★
        recast: 0, // 0なら行動しない（パッシブアイテム）
        action: null,
        passive: {
            type: 'defense',
            value: 3
        }
    },
    'potion': {
        storage: 'item_potion',
        shape: [[1]],
        recast: 10.0, // 10秒に1回「使える」
        action: {
            type: 'heal',
            value: 15,
            // いつ発動するかのトリガー（後で実装）
            // trigger: { type: 'hp_less_than_percent', value: 50 } 
        }
    },
    'magic_wand': {
        storage: 'item_wand',
        shape: [[1], [1]],
        recast: 3.0,
        action: {
            type: 'attack',
            value: 8
        }
    },
    'whetstone': { // 砥石
        storage: 'item_whetstone',
        shape: [[1]],
        recast: 0,
        action: null,
        // シナジー効果（後で実装）
        // synergy: { ... }
    }
};