// src/core/ItemData.js

export const ITEM_DATA = {
    'sword': {
        storage: 'item_sword',
        shape: [[1]],
       shape: [[1]],
       "cost": 10,
        "rarity": 1,
        tags: ["weapon", "dark"], // ★属性タグ
        action: { type: "attack", value: 10 },
        recast: 2.0
    },
    'shield': {
        storage: 'item_shield',
        shape: [[1], [1]],
          "tags": ["consumable", "light"],
          "cost": 10,
        "rarity": 1,
    "action": { "type": "heal", "value": 15 }, // ★新しいアクションタイプ
    "recast": 5.0
    },
    'potion': { // 砥石
        storage: 'item_potion',
         shape: [[1]],
         "cost": 10,
        "rarity": 1,
        tags: ["gem", "fire"], // ★属性タグ
        passive: { effects: [{ type: "defense", value: 1 }] }
    },
    'spiky_shield': { // トゲの盾
        storage: 'item_spiky_shield', // ★ 新しい画像アセットキー
          shape: [[1]],
        tags: ["support","light"],
        "cost": 20,
        "rarity": 2,
        synergy: {
            direction: "up",      // ★方向指定
            targetTag: "weapon",  // 「上」の「武器」に
            effect: { type: "add_attack", value: 3 }
        }
    
    },
     'leather_armor': { // 革鎧
        storage: 'item_potion', // ★ 新しい画像アセットキー
        shape: [[1, 1], [1, 1]], // 2x2マス
        tags: ["support","water"],
        synergy: {
            direction: "up",      // ★方向指定
            targetTag: "weapon",  // 「上」の「武器」に
            effect: { type: "add_attack", value: 3 }
        }
    },
    
    'berserker_axe': { // バーサーカーアックス
        storage: 'item_sword', // ★ 新しい画像アセットキー
        shape: [[1], [1], [1]], // 3x1マス
        "cost": 15,
        "rarity": 3,
         tags: ["gem", "fire"], // ★属性タグ
        passive: { effects: [{ type: "defense", value: 1 }] }
    }

};