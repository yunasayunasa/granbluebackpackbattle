// src/core/ItemData.js

export const ITEM_DATA = {
    'sword': {
        storage: 'item_sword',
        shape: [[1]],
        tags: ['weapon', 'blade'], // ★ 'blade'タグを追加
        recast: 2.0,
        action: { type: 'attack', value: 5 }
    },
    'shield': {
        storage: 'item_shield',
        shape: [[1], [1]],
        tags: ['weapon', 'magic'], // ★ 'magic'タグを追加
        recast: 3.0,
        action: { type: 'attack', value: 8 },
        // ★★★ シナジー効果を追加 ★★★
        synergy: {
            direction: 'down',      // 矢印の方向（下向き）
            targetTag: 'magic',     // 「magic」タグを持つアイテムに効果
            effect: { type: 'add_recast', value: -0.5 } // リキャストを0.5秒短縮
        }
    },
    'potion': { // 砥石
        storage: 'item_potion',
        shape: [[2], [1]],
        tags: ['utility'],
        recast: 1,
        action: null,
        // ★★★ シナジー効果を追加 ★★★
        synergy: {
            direction: 'adjacent',  // 上下左右に隣接
            targetTag: 'blade',     // 「blade」タグを持つアイテムに効果
            effect: { type: 'add_attack', value: 2 } // 攻撃力を+2
        }
    },
    // ... 他のアイテム（shield, potionなど） ...
};