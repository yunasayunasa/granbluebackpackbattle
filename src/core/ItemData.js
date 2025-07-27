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
    'spikyshield': { // トゲの盾
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
     'leatherarmor': { // 革鎧
        storage: 'item_potion', // ★ 新しい画像アセットキー
        shape: [[1, 1], [1, 1]], // 2x2マス
        tags: ["support","water"],
        synergy: {
            direction: "up",      // ★方向指定
            targetTag: "weapon",  // 「上」の「武器」に
            effect: { type: "add_attack", value: 3 }
        }
    },
    
    'berserkeraxe': { // バーサーカーアックス
        storage: "item_sword", // ★ 新しい画像アセットキー
        shape: [[1], [1], [1]], // 3x1マス
        "cost": 15,
        "rarity": 3,
         tags: ["gem", "fire"], // ★属性タグ
        passive: { effects: [{ type: "defense", value: 1 }] }
    },
   "potionoflife": {
        "imageFile": "item_sword",
        "storage": "item_sword",
        "shape": [[1]],
        "cost": 12,
        "rarity": 1,
        "tags": ["consumable", "light"],
        "action": { "type": "heal", "value": 15 },
        "recast": 5.0
    },

    "shield": {
        "imageFile": "shield.png",
        "storage": "item_shield",
        "shape": [[1], [1]],
        "cost": 10,
        "rarity": 1,
        "tags": ["armor", "earth"],
        "action": { "type": "block", "value": 8 },
        "recast": 2.5
    },

    "berserkeraxe": {
        "imageFile": "item_potion",
        "storage": "item_potion",
        "shape": [[1], [1], [1]],
        "cost": 20,
        "rarity": 2,
        "tags": ["weapon", "fire"],
        "action": { "type": "attack", "value": 20 },
        "recast": 3.0
    },

    "siegfried": {
        "imageFile": "item_potion",
        "storage": "item_potion",
        "shape": [[1], [1]],
        "cost": 40,
        "rarity": 3,
        "tags": ["hero", "earth"],
        "action": { "type": "attack", "value": 12 },
        "recast": 2.8,
        "passive": { "effects": [{ "type": "max_hp", "value": 15 }] },
        "synergy": {
            "direction": "down",
            "effect": { "type": "add_block_on_activate", "value": 5 } // ★新しい効果
        }
    },

    "golem": {
        "imageFile": "item_potion",
        "storage": "item_potion",
        "shape": [[1, 1], [1, 1]],
        "cost": 30,
        "rarity": 2,
        "tags": ["golem", "earth"],
        "action": { "type": "attack", "value": 10 },
        "recast": 4.0,
        "passive": { "effects": [{ "type": "defense", "value": 2 }] }
    }
};