// src/core/ItemData.js (拡張案)

export const ITEM_DATA = {
    // --- 武器 ---
    'sword': {
        storage: 'item_sword',
        shape: [[1]],
        tags: ['weapon', 'metal'], // ★ タグ
        recast: 2.0, // ★ リキャスト時間（秒）
        action: { // ★ 行動内容
            type: 'attack',
            value: 5
        }
    },
    'magic_wand': {
        storage: 'item_wand',
        shape: [[1], [1]],
        tags: ['weapon', 'magic'],
        recast: 3.0,
        action: {
            type: 'attack',
            value: 8
        },
        // ★ シナジー効果（矢印）
        synergy: { 
            direction: 'down', // このアイテムの下に効果
            effect: { type: 'add_recast', value: -0.5 } // リキャストを0.5秒短縮
        }
    },

    // --- 防具・ユーティリティ ---
    'shield': {
        storage: 'item_shield',
        shape: [[1, 1]],
        tags: ['armor', 'metal'],
        recast: 0, // 行動しないのでリキャストなし
        action: null,
        // ★ パッシブ効果
        passive: { 
            type: 'defense',
            value: 3
        }
    },
    'whetstone': { // 砥石
        storage: 'item_whetstone',
        shape: [[1]],
        tags: ['utility'],
        recast: 0,
        action: null,
        synergy: {
            direction: 'adjacent', // 上下左右に隣接
            targetTag: 'weapon', // 「武器」タグを持つアイテムに
            effect: { type: 'add_attack', value: 2 } // 攻撃力を+2
        }
    },

    // --- サンプルアイテム（後で追加） ---
    'potion': {
        storage: 'item_potion',
        shape: [[1]],
        tags: ['consumable'], // まだ使わない
        recast: 10.0, // 10秒に一回発動
        action: {
            type: 'heal',
            value: 15,
            trigger: { type: 'hp_less_than_percent', value: 50 } // HPが50%以下になったら
        }
    }
};