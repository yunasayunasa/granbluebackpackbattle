// src/core/ItemData.js (完全版)

export const ITEM_DATA = {
    // =================================================================
    // 基本アイテム
    // =================================================================
    'sword': {
        storage: 'item_sword',
        shape: [[1]],
        tags: ["weapon", "neutral"],
        cost: 10,
        rarity: 1,
        action: { type: 'attack', value: 10 },
        recast: 2.0
    },
    'luria': {
        storage: 'item_luria',
        shape: [[1], [1]],
        tags: ["armor", "earth"],
        cost: 10,
        rarity: 1,
        action: { type: 'block', value: 5},
        recast: 2.5
    },
    'potion': {
        storage: 'item_potion',
        shape: [[1]],
        tags: ["consumable", "light"],
        cost: 12,
        rarity: 1,
        action: { type: 'heal', value: 10 },
        recast: 5.0
    },

    // =================================================================
    // 🔥 火属性
    // =================================================================
    'perceval': {
        storage: 'char_perceval',
        shape: [[1, 1], [1, 1], [1, 1]],
        tags: ["hero", "fire"],
        cost: 50,
        rarity: 3,
        passive: { effects: [{ type: 'max_hp', value: 20 }] },
        action: { type: 'attack', value: 30 },
        recast: 7.0,
        synergy: {
            direction: 'adjacent',
            effect: { type: 'add_attack', value: 5 }
        }
    },
    'anila': {
        storage: 'char_anila',
        shape: [[1, 0], [1, 1]],
        shapeType: 'L字型', 
        size: { w: 2, h: 2 },
        tags: ["divine_general", "support", "fire"
            //,"divine_general"
        ],
        cost: 28,
        rarity: 2,
         passive: { effects: [{ type: 'max_hp', value: 10 }] },
        action: { type: 'attack', value: 8 },
        recast: 4.0,
        synergy: {
            direction: 'adjacent',
            effect: { type: 'add_attack', value: 2 }
        }
    },
    'fenny': {
        storage: 'char_fenny',
        shape: [[1], [1]],
        tags: ["beast", "fire"],
        cost: 25,
        rarity: 2,
        action: [{ type: 'block', value: 5 }, { type: 'heal', value: 5 }],
        recast: 5.0,
        synergy: {
            direction: 'horizontal',
            effect: { type: 'add_attack', value: 2 }
        }
    },
    'yuel': {
        storage: 'char_yuel',
        shape: [[1, 1, 1]],
        tags: ["attacker", "fire"],
        cost: 18,
        rarity: 1,
        action: { type: 'attack', value: 15 },
        recast: 3.5
    },
    'claris': {
        storage: 'char_claris',
        shape: [[1], [1]],
        tags: ["attacker", "fire"],
        cost: 15,
        rarity: 1,
        action: { type: 'attack', value: 8 },
        recast: 4.0,
        synergy: {
            direction: 'right',
            effect: { type: 'add_attack', value: 3 }
        }
    },
    'zavilbara': {
        storage: 'char_zavilbara',
        shape: [[1]],
        tags: ["support", "fire"],
        cost: 12,
        rarity: 1,
        action: { type: 'attack', value: 7},
        recast: 2.0,
        synergy: {
            direction: 'up',
            effect: { type: 'add_attack', value: 2 }
        }
    },

    // =================================================================
    // 💧 水属性
    // =================================================================
    'lancelot': {
        storage: 'char_lancelot',
        shape: [[1, 1], [1, 1], [1, 1]],
        tags: ["hero", "water"],
        cost: 55,
        rarity: 3,
        passive: { effects: [{ type: 'max_hp', value: 20 }] },
        action: { type: 'attack', value: 10},
        recast: 7.0,
        synergy: {
            direction: 'adjacent',
            effect: { type: 'add_recast', value: -0.6 }
        }
    },
    'poseidon': {
        storage: 'char_poseidon',
        shape: [[1, 1], [1, 1]],
        tags: ["god", "water"],
        cost: 35,
        rarity: 2,
        passive: { effects: [{ type: 'defense', value: 1 }] },
        action: { type: 'attack', value: 8 },
        recast: 5.0,
        synergy: {
            direction: 'adjacent',
            effect: { type: 'add_block_on_activate', value: 1 }
        }
    },
    'yachima': {
        storage: 'char_yachima',
        shape: [[1], [1]],
        tags: ["strategist", "water", "fire", "earth", "wind", "light", "dark","organization"],
        cost: 40,
        rarity: 2
    },
    'yodarha': {
        storage: 'char_yodarha',
        shape: [[1]],
        tags: ["master", "water"],
        cost: 20,
        rarity: 2,
        action: { type: 'attack', value: 5 },
        recast: 4.0,
        synergy: {
            direction: 'adjacent',
            effect: { type: 'add_attack', value: 1 }
        }
    },
    'wamdus': {
        storage: 'char_wamdus',
        shape: [[1]],
        tags: ["dragon", "water"],
        cost: 25,
        rarity: 2,
        action: { type: 'attack', value: 30 },
        recast: 20.0,
        synergy: {
            direction: 'adjacent',
            effect: { type: 'heal_on_activate', value: 1 }
        }
    },
    'slime': {
        storage: 'char_slime',
        shape: [[1]],
        tags: ["monster", "water"],
        cost: 10,
        rarity: 1,
        action: { type: 'attack', value: 3 },
        recast: 2.5,
        synergy: {
            direction: 'adjacent',
            effect: { type: 'add_attack', value: 1 }
        }
    },

    // =================================================================
    // ⛰️ 土属性
    // =================================================================
    'siegfried': {
        storage: 'char_siegfried',
        shape: [[1, 1], [1, 1], [1, 1]],
        tags: ["hero", "earth"],
        cost: 60,
        rarity: 3,
        passive: { effects: [{ type: 'max_hp', value: 30 }, { type: 'defense', value: 3 }] },
        action: { type: 'attack', value: 15 },
        recast: 7.0,
        synergy: {
            direction: 'adjacent',
            effect: { type: 'add_block_on_activate', value: 3}
        }
    },
    'octo': {
        storage: 'char_octo',
        shape: [[1, 1], [1, 1]],
        tags: ["master", "earth"],
        cost: 38,
        rarity: 2,
        passive: { effects: [{ type: 'max_hp', value: 20 }] },
        action: { type: 'attack', value: 25 },
        recast: 10.0,
        synergy: {
            direction: 'horizontal',
            effect: { type: 'add_block_on_activate', value: 4 }
        }
    },
    'caym': {
        storage: 'char_caym',
        shape: [[1], [1]],
        tags: ["support", "earth"],
        cost: 26,
        rarity: 2,
         passive: { effects: [{ type: 'max_hp', value: 10 }] },
        action: { type: 'block', value: 12 },
        recast: 4.0,
        synergy: {
            direction: 'down',
            effect: { type: 'add_attack', value: 4 }
        }
    },
    'brodia': {
        storage: 'char_brodia',
        shape: [[1], [1]],
        tags: ["primal", "earth"],
        cost: 16,
        rarity: 1,
        passive: { effects: [{ type: 'defense', value: 2 }] },
        action: { type: 'block', value: 10 },
        recast: 4.0
    },
    'mahira': {
        storage: 'char_mahira',
        shape: [[1]],
        tags: ["support", "earth"
            //,"divine_general"
            ],
        cost: 13,
        rarity: 1,
         passive: { effects: [{ type: 'max_hp', value: 10 }] },
        action: { type: 'attack', value: 3 },
        recast: 3.0,
        synergy: {
            direction: 'vertical',
            effect: { type: 'add_block_on_activate', value: 1}
        }
    },

    // =================================================================
    // 🍃 風属性
    // =================================================================
    'veirne': {
        storage: 'char_veirne',
        shape: [[1, 1], [1, 1], [1, 1]],
        tags: ["hero", "wind"],
        cost: 58,
        rarity: 3,
        passive: { effects: [{ type: 'max_hp', value: 10 }] },
        action: { type: 'block', value: 15 },
        recast: 5.0,
        synergy: {
            direction: 'adjacent',
            effect: [{ type: 'add_recast', value: -1.0 }, { type: 'add_attack', value: 2 }]
        }
    },
    'ciete': {
        storage: 'char_ciete',
        shape: [[1], [1]],
        tags: ["master", "wind"],
        cost: 32,
        rarity: 2,
        action: { type: 'attack', value: 10},
        recast: 2.5,
        synergy: {
            direction: 'horizontal',
            effect: { type: 'add_recast', value: -1.0 }
        }
    },
    'grimnir': {
        storage: 'char_grimnir',
        shape: [[1, 1], [1, 1]],
        tags: ["primal", "wind"],
        cost: 24,
        rarity: 2,
        action: { type: 'attack', value: 4 },
        recast: 1.0
    },
    'monika': {
        storage: 'char_monika',
        shape: [[1, 1], [1, 1]],
        tags: ["support", "wind"],
        cost: 30,
        rarity: 2,
        action: { type: 'heal', value: 15 },
        recast: 8.0,
        synergy: {
            direction: 'down',
            effect: { type: 'add_recast', value: -1.5 }
        }
    },
    'gachapin': {
        storage: 'char_gachapin',
        shape: [[1], [1]],
        tags: ["character", "wind"],
        cost: 17,
        rarity: 1,
        action: { type: 'attack', value: 9},
        recast: 5.0,
        synergy: {
            direction: 'down',
            effect: { type: 'add_recast', value: -1.0 }
        }
    },
    'anchira': {
        storage: 'char_anchira',
        shape: [[1]],
        tags: ["support", "wind"
           // ,"divine_general"
        ],
        cost: 14,
        rarity: 1,
        action: { type: 'attack', value: 1 },
        recast: 1.5,
        synergy: {
            direction: 'up',
            effect: { type: 'add_recast', value: -0.8 }
        }
    },

    // =================================================================
    // ✨ 光属性
    // =================================================================
    'arthur': {
        storage: 'char_arthur',
        shape: [[1], [1]],
        tags: ["hero", "light"],
        cost: 52,
        rarity: 3,
        passive: { effects: [{ type: 'max_hp', value: 20 }] },
        action: { type: 'attack', value: 18 },
        recast: 5.0,
        synergy: {
            direction: 'adjacent',
            effect: { type: 'heal_on_activate', value: 5}
        }
    },
    'funf': {
        storage: 'char_funf',
        shape: [[1]],
        tags: ["master", "light"],
        cost: 40,
        rarity: 2,
         passive: { effects: [{ type: 'max_hp', value: 10 }] },
        triggerAction: {
            trigger: { type: 'hp_below', percent: 25, once: true },
            action: { type: 'heal_percent', value: 50 }
        },
        synergy: {
            direction: 'up_and_sides',
            effect: { type: 'add_heal_power', value: 5 }
        }
    },
    'tico': {
        storage: 'char_tico',
        shape: [[0, 1], [1, 1]],
        shapeType: '逆L字型', 
        size: { w: 2, h: 2 },
        tags: ["support", "light"],
        cost: 28,
        rarity: 2,
         passive: { effects: [{ type: 'max_hp', value: 5 }] },
        action: { type: 'heal', value: 12 },
        recast: 4.5,
        synergy: {
            direction: 'vertical',
            effect: { type: 'add_heal_power', value: 7 }
        }
    },
    'cosmos': {
        storage: 'char_cosmos',
        shape: [[1], [1]],
        tags: ["primal", "light"],
        cost: 18,
        rarity: 1,
         passive: { effects: [{ type: 'max_hp', value: 5 }] },
        action: { type: 'attack', value: 5 },
        recast: 4.0,
        synergy: {
            direction: 'left',
            effect: { type: 'heal_on_activate', value: 4 }
        }
    },
    'sandalphon': {
        storage: 'char_sandalphon',
        shape: [[1], [1], [1]],
        tags: ["primal", "light"],
        cost: 20,
        rarity: 1,
         passive: { effects: [{ type: 'max_hp', value: 5 }] },
        action: { type: 'block', value: 10 },
        recast: 6.0,
        synergy: {
            direction: 'horizontal',
            effect: { type: 'heal_on_activate', value: 2}
        }
    },

    // =================================================================
    // ⬛ 闇属性
    // =================================================================
    'six': {
        storage: 'char_six',
        shape: [[1]],
        tags: ["master", "dark"],
        cost: 65,
        rarity: 3,
        passive: { effects: [{ type: 'max_hp', value: -10 }] },
        action: { type: 'attack', value: 25 },
        recast: 4.0
    },
    'fediel': {
        storage: 'char_fediel',
        shape: [[0, 1], [1, 1]],
        shapeType: '逆L字型', 
 size: { w: 2, h: 2 },
        tags: ["dragon", "dark"],
        cost: 36,
        rarity: 2,
        passive: { effects: [{ type: 'defense', value: 3 }] },
        action: { type: 'block', value: 15 },
        recast: 5.0
    },
    'nier': {
        storage: 'char_nier',
        shape: [[1], [1], [1]],
        tags: ["evoker", "dark"],
        cost: 34,
        rarity: 2,
        action: { type: 'attack', value: 18 },
        recast: 2.5
    },
    'cassius': {
        storage: 'char_cassius',
        shape: [[1], [1]],
        tags: ["support", "dark", "organization"],
        cost: 20,
        rarity: 1,
        action: [{ type: 'attack', value: 7}, { type: 'heal', value: 7 }],
        recast: 5.0
    },
    'bowman': {
        storage: 'char_bowman',
        shape: [[1, 1], [1, 1]],
        tags: ["attacker", "dark"],
        cost: 22,
        rarity: 1,
        passive: { effects: [{ type: 'max_hp', value: 15 }] },
        action: { type: 'attack', value: 8 },
        recast: 1.5
    },
    'rei': {
        storage: 'char_rei',
        shape: [[1]],
        tags: ["support", "dark"],
        cost: 15,
        rarity: 1,
        passive: { effects: [{ type: 'defense', value: 3 }] }
    },
    
        // =================================================================
    // 🏢 組織
    // =================================================================
    'ilza': {
        storage: 'char_ilza', 
        shape: [[1], [1]],
        tags: ["organization", "earth"],
        cost: 40, 
        rarity: 3,
        // アクションが2種類あるので、配列で定義
        action: [
            { type: 'attack', value: 15 },
            { type: 'self_pain', value: 10 }
        ],
        recast: 4.0,
        synergy: {
            direction: 'adjacent', 
            effect: { type: 'add_attack', value: 3 }
        }
    },

    'zeta': {
        storage: 'char_zeta', 
        shape: [[1, 1], [1, 1]],
        tags: ["organization", "fire"],
        cost: 45,
        rarity: 3,
        action: [
            { type: 'attack', value: 20 },
            { type: 'self_pain', value: 10 }
        ],
        recast: 3.0,
        synergy: {
            direction: 'left',
            effect: { type: 'add_attack', value: 3 }
        }
    },
    
    'beatrix': {
        storage: 'char_beatrix', 
        shape: [[1], [1]],
        tags: ["organization", "dark"],
        cost: 25,
        rarity: 2, 
        action: [
            { type: 'attack', value: 10 },
            { type: 'self_pain', value: 4 }
        ],
        recast: 2.0
        // シナジーなし
    },

    'vaseraga': {
        storage: 'char_vaseraga', 
        shape: [[1, 1], [1, 1], [1, 1]],
        tags: ["organization", "dark", "defense"],
        cost: 50,
        rarity: 3,
        action: [
            { type: 'block', value: 20 },
            { type: 'self_pain', value: 10 }
        ],
        recast: 5.0
        // シナジーなし
    },

    'eustace': {
        storage: 'char_eustace', 
        shape: [[1], [1]],
        tags: ["organization", "wind"],
        cost: 35,
        rarity: 2,
        action: [
            { type: 'attack', value: 15 },
            { type: 'self_pain', value: 8 }
        ],
        recast: 5.0,
        synergy: {
            direction: 'vertical', 
            effect: { type: 'add_attack', value: 3 }
        }
    }
    
       // =================================================================
    // 🌠 十二神将
    // =================================================================

   'vajra': {
        storage: 'char_vajra', // 仮の画像キー
        shape: [[1, 1,1], [1, 1,1], [1, 1,1]], // L字型などユニークな形に
        tags: ["divine_general", "water", "weapon"],
        cost: 60,
        rarity: 4, // 最高レアリティ
        recast: 25.0,
        action: { type: 'attack', value: 50 },
        // パッシブでリキャストが短縮される
        passive: {
            effects: [{ type: 'vajra_passive', value: 2.0 }]
        }
    },

    'kumbhira': { // クビラ
        storage: 'char_kumbhira',
        shape: [[1]], // 1x1
        tags: ["divine_general", "light", "support"],
        cost: 20,
        rarity: 2,
        recast: 1.0,
        action: { type: 'block', value: 1 },
        synergy: {
            direction: 'horizontal', // 左右
            effect: { type: 'add_block_on_activate', value: 1 }
        }
    },

    'syatora': { // シャトラ
        storage: 'char_syatora',
        shape: [[1], [1]],
        tags: ["divine_general", "wind", "healer"],
        cost: 45,
        rarity: 3,
        recast: 8.0,
        action: [
            { type: 'attack', value: 3 },
            { type: 'heal', value: 3 }
        ],
        synergy: {
            direction: 'adjacent', // 四方向
            effect: { type: 'add_recast', value: -1.0 }
        }
    },

    'sindara': {
        storage: 'char_sindara',
        shape: [[1, 1], [1, 1]],
        tags: ["divine_general", "earth", "support"],
        cost: 50,
        rarity: 3,
        recast: 5.0,
        action: [
            { type: 'attack', value: 5 },
            { type: 'block', value: 5 },
            { type: 'heal', value: 5 }
        ],
        synergy: {
            direction: 'horizontal', // 左右
            effect: { type: 'add_recast', value: -1.0 }
        }
    },

    'makora': { // マコラ
        storage: 'char_makora',
        shape: [[1], [1], [1]],
        tags: ["divine_general", "light", "support"],
        cost: 40,
        rarity: 3,
        // アクションは持たず、シナジーで他のキャラを神将化する
        synergy: {
            direction: 'up',
            effect: { type: 'add_tag', value: 'divine_general' }
        }
    },

    'vikala': { // ビカラ
        storage: 'char_vikala',
        shape: [[1, 1]], // 横長
        tags: ["divine_general", "dark", "support"],
        cost: 40,
        rarity: 3,
        recast: 6.0,
        // HP50%以下で味方全体のリキャスト短縮
          action: { type: 'recast_boost_player_by_hp', value: 30 }
    },

    

    'haila': {
        storage: 'char_haila',
        shape: [[1, 1], [1, 1]],
        tags: ["divine_general", "water", "weapon"],
        cost: 55,
        rarity: 4,
        recast: 4.0,
        action: { type: 'attack', value: 8 },
        // パッシブで攻撃力が上がる
        passive: {
            effects: [{ type: 'haila_passive', value: 1 }]
        }
    },

    'indara': {
        storage: 'char_indara',
        shape: [[1, 1], [0, 1]], // 特殊な形状
        tags: ["divine_general", "dark", "support"],
        cost: 50,
        rarity: 4,
        // パッシブで戦闘開始時にHPを半減させる
        passive: {
            effects: [{ type: 'halve_own_hp_on_start' }]
        }
    }
      
};
