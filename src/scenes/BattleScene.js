// BattleScene.js (最終決定版・完全体)
import { ITEM_DATA } from '../core/ItemData.js';
import Tooltip from '../ui/Tooltip.js';
import { EnemyGenerator } from '../core/EnemyGenerator.js';

const ELEMENT_COLORS = {
    fire: 0xff4d4d, wind: 0x4dff4d, earth: 0xffaa4d, water: 0x4d4dff, light: 0xffff4d, dark: 0xaa4dff,    organization: 0xc0c0c0, // 銀色 (Silver)
    divine_general: 0xffd700  // 金色 (Gold)
};
const ATTRIBUTE_TAGS = ['fire', 'water', 'earth', 'wind', 'light', 'dark', 'organization','divine_general'];

const TOOLTIP_TRANSLATIONS = {
    // --- 汎用 ---
    'up': '上', 'down': '下', 'left': '左', 'right': '右',
    'adjacent': '隣接', 'horizontal': '左右', 'vertical': '上下',
    'up_and_sides': '上と左右',

    // --- 属性 ---
    'fire': '火', 'water': '水', 'earth': '土', 'wind': '風', 'light': '光', 'dark': '闇',
    'organization': '組織',
    'divine_general': '十二神将',

    // --- アイテムタグ ---
    'weapon': '武器', 'support': '支援', 'healer': '回復', 'defense': '防御',
    
    // --- 効果タイプ (Action) ---
    'attack': '攻撃力 {value}',
    'block': 'ブロック {value}',
    'heal': 'HPを{value}回復',
    'self_pain': '自傷ダメージ {value}',

    // --- 効果タイプ (Passive & Synergy) ---
    'add_attack': '攻撃力 +{value}',
    'add_recast': 'リキャスト +{value}s',
    'add_block_on_activate': '起動時ブロック +{value}',
    'heal_on_activate': '起動時回復 +{value}',
    'add_heal_power': '回復効果 +{value}',
    'add_tag': '「{value}」タグを付与',
    
    // ★★★ 抜けていた passive の効果タイプを追加 ★★★
    'max_hp': '最大HP +{value}',
    'defense': '防御力 +{value}',
    
    // ★★★ 十二神将用の特殊効果タイプ ★★★
    'vajra_passive': '他の神将1人につきリキャスト -{value}s',
    'haila_passive': '神将1人につき攻撃力 +{value}',
    'halve_own_hp_on_start': '戦闘開始時 HP半減',
      'recast_boost_player_by_hp': 'HP50%以下時 味方全体のリキャスト-{value}%'
};
const ELEMENT_RESONANCE_RULES = {
    fire: { threshold: 3, description: (count) => `攻撃力+${Math.floor(count / 2)}` },
    wind: { threshold: 3, description: (count) => `リキャスト-${(0.2 * (count - 2)).toFixed(1)}s` },
    earth: { threshold: 3, description: (count) => `ブロック効果+${count * 2}` },
    light: { threshold: 3, description: (count) => `回復効果+${count * 2}` },
    water: { threshold: 3, description: (count) => `シナジー効果+${count - 2}` },
    dark:  { threshold: 3, description: (count) => `背水効果(小)` },
     // ★★★ 組織共鳴のルールを、ここに「仕込んで」おく ★★★
 organization: {
        threshold: 3,
         description: (count) => `自傷ダメージ-50%` // 説明文
     }
};

export default class BattleScene extends Phaser.Scene {
    constructor() {
       super('BattleScene');
        this.battleTimer = null;
        this.battleTimerText = null;
        this.maxBattleDuration = 20;
        this.receivedParams = null;
        this.stateManager = null;
        this.soundManager = null;
        this.backpackGridSize = 6;
        this.cellSize = 60;
        this.gridX = 0;
        this.gridY = 0;
        this.gameState = 'prepare';
        this.backpack = null;
        this.inventoryItemImages = [];
        this.placedItemImages = [];
        this.prepareContainer = null;
        this.battleContainer = null;
        this.startBattleButton = null;
        this.tooltip = null;
        this.playerStats = { attack: 0, defense: 0, hp: 0, block: 0 };
        this.enemyStats = { attack: 0, defense: 0, hp: 0, block: 0 };
        this.playerBattleItems = [];
        this.enemyBattleItems = [];
        this.enemyItemImages = [];
        this.playerAvatar = null;
        this.enemyAvatar = null;
        this.battleEnded = false;
        this.ghostImage = null;
        this.finalizedPlayerItems = [];
        this.finalizedEnemyItems = [];
        this.roundStartState = null;
        this.shopContainer = null;
        this.shopItemSlots = [];
        this.isShopVisible = false;
        this.isTimeUp = false;
        this.kamuiTimer = null;
         this.kamuiTimer_player = null;
        this.kamuiTimer_enemy = null;
        this.currentEnemyLayout = null;
        this.transitionWipe = null;
    }

    init(data) {
          
        this.enemyItemImages = [];
        this.isTimeUp = false;
        console.log("BattleScene: init (空)");
    }

    create() {
        this.cameras.main.fadeIn(300, 0, 0, 0); 
        console.log("BattleScene: create - データ永続化対応版 (sf)");
        const backgroundKeys = ['background1', 'background2', 'background3', 'background4'];
        const selectedBgKey = Phaser.Utils.Array.GetRandom(backgroundKeys);
        this.add.image(this.scale.width / 2, this.scale.height / 2, selectedBgKey)
            .setDisplaySize(this.scale.width, this.scale.height)
            .setDepth(-1);
        
        this.stateManager = this.sys.registry.get('stateManager');
        this.soundManager = this.sys.registry.get('soundManager');
        this.firebaseManager = this.sys.registry.get('firebaseManager');
        this.tooltip = new Tooltip(this);

        if (this.stateManager.sf.player_backpack === undefined) {
            this.stateManager.setSF('player_backpack', {});
        }
        if (this.stateManager.sf.player_inventory === undefined) {
            this.stateManager.setSF('player_inventory', ['sword', 'luria', 'potion']);
        }
        if (this.stateManager.sf.player_profile === undefined) {
            console.log("新規プレイヤープロファイルを作成します。");
            this.stateManager.setSF('player_profile', {
                totalExp: 0, rank: "駆け出し", highScore: 0, totalWins: 0
            });
        }
        
        const backpackData = this.stateManager.sf.player_backpack;
        const inventoryData = this.stateManager.sf.player_inventory;

        if (this.stateManager.sf.player_base_max_hp === undefined) {
            this.stateManager.setSF('player_base_max_hp', 100);
        }
        const basePlayerMaxHp = this.stateManager.sf.player_base_max_hp;
        const inheritedPlayerHp = this.stateManager.f.player_hp > 0 ? this.stateManager.f.player_hp : basePlayerMaxHp;
        const round = this.stateManager.sf.round || 1;
        this.initialBattleParams = { 
            playerMaxHp: basePlayerMaxHp, playerHp: inheritedPlayerHp, round: round 
        };

        if (inheritedPlayerHp <= 0) {
            console.log("ゲームオーバー: HPが0の状態でラウンドを開始しようとしました。");
            this.stateManager.sf = {};
            localStorage.removeItem('my_novel_engine_system');
            this.stateManager.f = {};
            this.scene.start(this.scene.key);
            return;
        }

        this.inventoryItemImages = []; this.placedItemImages = []; this.enemyItemImages = [];
        this.finalizedPlayerItems = []; this.playerBattleItems = []; this.enemyBattleItems = [];
        this.playerStats = { block: [] };
        this.enemyStats = { block: [] };
        this.battleEnded = false; this.gameState = 'prepare';
        this.cameras.main.setBackgroundColor('#8a2be2');

        const battleBgmKey = 'bgm_prepare';
        if (this.soundManager.currentBgmKey !== battleBgmKey) {
            this.soundManager.playBgm(battleBgmKey);
        }
        this.stateManager.setF('player_max_hp', this.initialBattleParams.playerMaxHp);
        this.stateManager.setF('player_hp', this.initialBattleParams.playerHp);
        
        const enemyBaseHp = 100;
        const enemyRoundBonus = (this.initialBattleParams.round - 1) * 20;
        const enemyFinalHp = enemyBaseHp + enemyRoundBonus;
        this.stateManager.setF('enemy_max_hp', enemyFinalHp); 
        this.stateManager.setF('enemy_hp', enemyFinalHp);
        
        const gameWidth = this.scale.width;
        const gameHeight = this.scale.height;
        const gridWidth = this.backpackGridSize * this.cellSize;
        const gridHeight = this.backpackGridSize * this.cellSize;
        this.gridX = 100;
        this.gridY = gameHeight / 2 - gridHeight / 2 - 50;
        this.backpack = Array(this.backpackGridSize).fill(null).map(() => Array(this.backpackGridSize).fill(0));
        this.prepareContainer = this.add.container(0, 0);
        this.ghostImage = this.add.graphics({ fillStyle: { color: 0x00ff00, alpha: 0.5 } }).setVisible(false).setDepth(5);
        this.add.rectangle(this.gridX + gridWidth / 2, this.gridY + gridHeight / 2, gridWidth, gridHeight, 0x333333, 0.9).setDepth(1);
        for (let i = 0; i <= this.backpackGridSize; i++) { this.add.line(0, 0, this.gridX, this.gridY + i * this.cellSize, this.gridX + gridWidth, this.gridY + i * this.cellSize, 0x666666, 0.5).setOrigin(0).setDepth(2); this.add.line(0, 0, this.gridX + i * this.cellSize, this.gridY, this.gridX + i * this.cellSize, this.gridY + gridHeight, 0x666666, 0.5).setOrigin(0).setDepth(2); }
        this.playerAvatar = this.add.sprite(this.gridX + gridWidth + 80, this.gridY + gridHeight / 2, 'player_avatar_placeholder').setOrigin(0.5).setDepth(5);
        const enemyGridX = gameWidth - 100 - gridWidth;
        this.add.rectangle(enemyGridX + gridWidth / 2, this.gridY + gridHeight / 2, gridWidth, gridHeight, 0x500000, 0.9).setDepth(1);
        for (let i = 0; i <= this.backpackGridSize; i++) { this.add.line(0, 0, enemyGridX, this.gridY + i * this.cellSize, enemyGridX + gridWidth, this.gridY + i * this.cellSize, 0x888888, 0.5).setOrigin(0).setDepth(2); this.add.line(0, 0, enemyGridX + i * this.cellSize, this.gridY, enemyGridX + i * this.cellSize, this.gridY + gridHeight, 0x888888, 0.5).setOrigin(0).setDepth(2); }
        this.enemyAvatar = this.add.sprite(enemyGridX - 80, this.gridY + gridHeight / 2, 'enemy_avatar_placeholder').setOrigin(0.5).setDepth(5);

        const enemyData = EnemyGenerator.getLayoutForRound(this.initialBattleParams.round);
        this.currentEnemyLayout = enemyData.layout;
        this.setupEnemy(this.gridY, this.currentEnemyLayout);
        if (enemyData.avatar) {
            this.enemyAvatar.setTexture(enemyData.avatar);
        }
        
        const maxAvatarHeight = gridHeight * 0.8;
        [this.playerAvatar, this.enemyAvatar].forEach(avatar => {
            if (avatar.height > maxAvatarHeight) { avatar.setScale(maxAvatarHeight / avatar.height); }
        });

        for (const uid in backpackData) {
            const itemInfo = backpackData[uid];
            const itemContainer = this.createItem(itemInfo.itemId, 0, 0);
            if (itemContainer) {
                itemContainer.setData('rotation', itemInfo.rotation);
                itemContainer.setAngle(itemInfo.rotation);
                this.placeItemInBackpack(itemContainer, itemInfo.col, itemInfo.row);
            }
        }

        const inventoryAreaY = 450;
        const inventoryAreaHeight = gameHeight - inventoryAreaY;
        const invBg = this.add.rectangle(gameWidth / 2, inventoryAreaY + inventoryAreaHeight / 2, gameWidth, inventoryAreaHeight, 0x000000, 0.8).setDepth(10);
        const invText = this.add.text(gameWidth / 2, inventoryAreaY + 30, 'インベントリ', { fontSize: '24px', fill: '#fff' }).setOrigin(0.5).setDepth(11);
        this.prepareContainer.add([invBg, invText]);
        const inventoryContentWidth = gameWidth - 200;
        const inventoryCount = inventoryData.length;
        const itemSpacing = inventoryCount > 0 ? inventoryContentWidth / inventoryCount : 0;
        const itemStartX = 100 + (itemSpacing / 2);
        inventoryData.forEach((itemId, index) => {
            const x = itemStartX + (index * itemSpacing);
            const y = inventoryAreaY + inventoryAreaHeight / 2 + 10;
            const itemContainer = this.createItem(itemId, x, y);
            if (itemContainer) { this.inventoryItemImages.push(itemContainer); }
        });

        this.setupShop();
        this.refreshShop();
        
        const sellZoneWidth = 100;
        const sellZoneX = gameWidth - (sellZoneWidth / 2);
        const sellZoneY = gameHeight / 2;
        const sellZoneHeight = gameHeight;
        this.sellZoneGraphics = this.add.rectangle(sellZoneX, sellZoneY, sellZoneWidth, sellZoneHeight, 0xff0000, 0.2).setDepth(9).setVisible(false);
        this.sellZoneText = this.add.text(sellZoneX, sellZoneY, 'ド\nラ\nッ\nグ\nし\nて\n売\n却', { fontSize: '24px', fill: '#ffffff', align: 'center', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5).setDepth(9).setVisible(false);
        this.sellZoneArea = new Phaser.Geom.Rectangle(gameWidth - sellZoneWidth, 0, sellZoneWidth, gameHeight);
        
        const shopToggleButton = this.add.text(gameWidth - 640, inventoryAreaY - 400, 'ショップ表示', { fontSize: '30px', fill: '#ffdd00', backgroundColor: '#000000aa', padding: { x: 15, y: 10 } }).setOrigin(0.5).setInteractive().setDepth(11);
        this.prepareContainer.add(shopToggleButton);
        shopToggleButton.on('pointerdown', () => {
            this.isShopVisible = !this.isShopVisible;
            if (this.isShopVisible) {
                this.inventoryItemImages.forEach(item => item.setVisible(false));
                this.shopContainer.setVisible(true);
                shopToggleButton.setText('インベントリ表示');
            } else {
                this.shopContainer.setVisible(false);
                this.inventoryItemImages.forEach(item => item.setVisible(true));
                shopToggleButton.setText('ショップ表示');
            }
        });

        const resetButton = this.add.text(80, 40, '[ リセット ]', { fontSize: '20px', fill: '#ffdd00', backgroundColor: '#000000aa', padding: { x: 10, y: 5 } }).setOrigin(0.5).setDepth(100).setInteractive();
        resetButton.on('pointerdown', () => {
            if (window.confirm('本当にすべてのデータをリセットして最初から始めますか？')) {
                this.stateManager.sf = {};
                localStorage.removeItem('my_novel_engine_system');
                console.log("Save data has been reset.");
                window.location.reload();
            }
        });

        this.startBattleButton = this.add.text(gameWidth / 2, inventoryAreaY - 40, '戦闘開始', { fontSize: '28px', backgroundColor: '#080', padding: { x: 20, y: 10 } }).setOrigin(0.5).setInteractive().setDepth(11);
        this.prepareContainer.add(this.startBattleButton);
       // create() の中の startBattleButton のリスナー部分

    this.startBattleButton.on('pointerdown', () => {
            try { this.soundManager.playSe('se_button_click'); } catch (e) {}
          if (this.gameState !== 'prepare') return;
        try { this.soundManager.playBgm('bgm_battle'); } catch(e) {}


        // ★★★ このブロックを全面的に書き換え ★★★

        // 1. まず、準備フェーズのUIを全て非表示にする
        const allPlayerItems = [...this.inventoryItemImages, ...this.placedItemImages];
        allPlayerItems.forEach(item => { if (item.input) item.input.enabled = false; });
        this.startBattleButton.input.enabled = false;
        this.tweens.add({
        targets: [this.prepareContainer, ...this.inventoryItemImages],
            alpha: 0,
            duration: 300,
            onComplete: () => {
                // ★ onCompleteの中で、両方を setVisible(false) していますか？
                this.prepareContainer.setVisible(false);
                this.inventoryItemImages.forEach(item => item.setVisible(false));
            }
        });

        // 2. カットイン演出を再生し、完了後に戦闘を開始する
        this._playVsCutin(() => {
            // --- ここから下は、元の戦闘開始ロジック ---
            const initialBackpackData = {};
            this.placedItemImages.forEach((item, index) => {
                const gridPos = item.getData('gridPos');
                if (gridPos) {
                    initialBackpackData[`uid_${index}`] = { itemId: item.getData('itemId'), row: gridPos.row, col: gridPos.col, rotation: item.getData('rotation') };
                }
            });
            const initialInventoryData = this.inventoryItemImages.map(item => item.getData('itemId'));
            this.roundStartState = {
                backpack: initialBackpackData, inventory: initialInventoryData, coins: this.stateManager.sf.coins || 0, 
                hp: this.stateManager.f.player_hp
            };
            console.log("Round start state checkpoint created.", this.roundStartState);
            
            this.gameState = 'battle';
            this.prepareForBattle();
            this.startBattle();
        });
        
        // ★★★ 書き換えここまで ★★★
    });

        this.input.on('pointerdown', (pointer) => { if (!pointer.gameObject && this.tooltip.visible) { this.tooltip.hide(); } }, this);
        this.anims.create({ key: 'impact_anim', frames: this.anims.generateFrameNumbers('effect_impact', { start: 0, end: 7 }), frameRate: 24, repeat: 0 });
        this.anims.create({ key: 'finish_anim', frames: this.anims.generateFrameNumbers('effect_impact', { start: 0, end: 15 }), frameRate: 30, repeat: 0 });
        const { width, height } = this.scale;
    this.transitionWipe = this.add.rectangle(width * 1.5, height / 2, width, height, 0x000000)
        .setDepth(10000)
        .setScrollFactor(0);
        const currentCoins = this.stateManager.sf.coins || 0;
        console.log("コイン表示を強制更新します。");
            this.stateManager.setSF('coins', currentCoins + 1);
            this.stateManager.setSF('coins', currentCoins);
        
        this.events.emit('scene-ready');
        console.log("BattleScene: create 完了");
    }

        startBattle() {
        console.log("★★ 戦闘開始！ ★★");
        this.battleStartTime = this.time.now;
        
        this.battleTimerText = this.add.text(this.scale.width / 2, 50, `TIME: ${this.maxBattleDuration}`, {
            fontSize: '40px', fill: '#ffffff', stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5).setDepth(100);

        // ★★★ このブロックを追加 ★★★
       // in startBattle()

        // --- 【神威】効果発動タイマーをセット ---
        if (this.playerStats.kamui_activated) {
            this.kamuiTimer_player = this.time.addEvent({
                delay: 3000,
                // ★ 引数で 'player' を渡す
                callback: () => this._applyKamuiEffect('player'),
                callbackScope: this,
                loop: true
            });
        }
        // ★ 敵用のタイマーを追加
        if (this.enemyStats.kamui_activated) {
            this.kamuiTimer_enemy = this.time.addEvent({
                delay: 3000,
                // ★ 引数で 'enemy' を渡す
                callback: () => this._applyKamuiEffect('enemy'),
                callbackScope: this,
                loop: true
            });
        }


    }

    prepareForBattle() {
        console.log("--- 戦闘準備開始 ---");
        const playerInitialItems = [];
        this.placedItemImages.forEach(itemContainer => {
            const itemInstance = JSON.parse(JSON.stringify(ITEM_DATA[itemContainer.getData('itemId')]));
            itemInstance.id = itemContainer.getData('itemId');
            const gridPos = itemContainer.getData('gridPos');
            itemInstance.row = gridPos.row;
            itemInstance.col = gridPos.col;
            itemInstance.rotation = itemContainer.getData('rotation') || 0;
            itemInstance.gameObject = itemContainer;
            playerInitialItems.push(itemInstance);
        });
        
        const playerInitialStats = {
            max_hp: this.initialBattleParams.playerMaxHp,
              hp: this.stateManager.f.player_hp
        };
        
        const playerResult = this.calculateFinalBattleState(playerInitialItems, playerInitialStats);
        this.playerStats = playerResult.finalStats;
        this.playerBattleItems = playerResult.battleItems;
        this.finalizedPlayerItems = playerResult.finalizedItems;
         // --- 属性共鳴のエフェクト再生 ---
    playerResult.activatedResonances.forEach(element => {
        const flashColor = ELEMENT_COLORS[element];
        if (flashColor) {
            playerResult.finalizedItems.forEach(item => {
                if (item.tags.includes(element) && item.gameObject) {
                    this.playResonanceAura(item.gameObject, flashColor);
                }
            });
        }
    });

    // --- 【将来用】組織共鳴のエフェクト再生 ---
    
    const orgCount = playerResult.finalizedItems.filter(item => item.tags.includes('organization')).length;
    if (orgCount >= 3) {
        const flashColor = ELEMENT_COLORS['organization']; // 銀色
        playerResult.finalizedItems.forEach(item => {
            if (item.tags.includes('organization') && item.gameObject) {
                this.playResonanceAura(item.gameObject, flashColor);
            }
        });
    }
    

    // --- 十二神将共鳴のエフェクト再生 ---
    const divineGeneralCount = playerResult.finalizedItems.filter(item => item.tags.includes('divine_general')).length;
    if (divineGeneralCount >= 2) {
        const flashColor = ELEMENT_COLORS['divine_general']; // 金色
        playerResult.finalizedItems.forEach(item => {
            if (item.tags.includes('divine_general') && item.gameObject) {
                this.playResonanceAura(item.gameObject, flashColor);
            }
        });
    }
    
    // ★★★ 書き換えここまで ★★★
        this.stateManager.setF('player_max_hp', this.playerStats.max_hp);
        this.stateManager.setF('player_hp', this.playerStats.hp);
           // --- 【神威】発動条件の判定 ---
    this.playerStats.kamui_activated = (divineGeneralCount >= 6);
    if (this.playerStats.kamui_activated) {
        console.log(`%c✨ 十二神将共鳴【神威】発動準備完了！ (3秒ごとに攻撃力+1)`, "color: cyan;");
    }
        console.log("プレイヤー最終ステータス:", this.playerStats);

        const enemyInitialItems = [];
        const currentLayout = this.currentEnemyLayout;
        this.enemyItemImages.forEach(itemContainer => {
            const uniqueId = itemContainer.getData('uniqueId');
            if (!uniqueId) return;
            const baseItemId = uniqueId.split('_')[0];
            const itemData = ITEM_DATA[baseItemId];
            const layoutInfo = currentLayout[uniqueId];
            if (itemData && layoutInfo) {
                const itemInstance = JSON.parse(JSON.stringify(itemData));
                itemInstance.id = uniqueId;
                itemInstance.row = layoutInfo.row;
                itemInstance.col = layoutInfo.col;
                itemInstance.rotation = layoutInfo.rotation || 0;
                itemInstance.gameObject = itemContainer;
                enemyInitialItems.push(itemInstance);
            } else {
                console.warn(`敵アイテム[${uniqueId}]のデータが見つからないため、戦闘から除外されます。`);
            }
        });

        const enemyInitialStats = {
            max_hp: this.stateManager.f.enemy_max_hp,
            hp: this.stateManager.f.enemy_max_hp
        };

        const enemyResult = this.calculateFinalBattleState(enemyInitialItems, enemyInitialStats);
        this.enemyStats = enemyResult.finalStats;
        this.enemyBattleItems = [];
        enemyResult.finalizedItems.forEach(itemData => {
            if (itemData.recast > 0) {
                this.enemyBattleItems.push({
                    data: itemData,
                    nextActionTime: itemData.recast,
                    gameObject: itemData.gameObject
                });
            }
        });
         // --- 属性共鳴のエフェクト再生 ---
    playerResult.activatedResonances.forEach(element => {
        const flashColor = ELEMENT_COLORS[element];
        if (flashColor) {
            playerResult.finalizedItems.forEach(item => {
                if (item.tags.includes(element) && item.gameObject) {
                    this.playResonanceAura(item.gameObject, flashColor);
                }
            });
        }
    });

    // --- 【将来用】組織共鳴のエフェクト再生 ---
     if (orgCount >= 3) {
        const flashColor = ELEMENT_COLORS['organization']; // 銀色
        playerResult.finalizedItems.forEach(item => {
            if (item.tags.includes('organization') && item.gameObject) {
                this.playResonanceAura(item.gameObject, flashColor);
            }
        });
    }
    

    // --- 十二神将共鳴のエフェクト再生 ---
    if (divineGeneralCount >= 2) {
        const flashColor = ELEMENT_COLORS['divine_general']; // 金色
        playerResult.finalizedItems.forEach(item => {
            if (item.tags.includes('divine_general') && item.gameObject) {
                this.playResonanceAura(item.gameObject, flashColor);
            }
        });
    }
    
    // ★★★ 書き換えここまで ★★★
        this.finalizedEnemyItems = enemyResult.finalizedItems;

        this.stateManager.setF('enemy_max_hp', this.enemyStats.max_hp);
        this.stateManager.setF('enemy_hp', this.enemyStats.hp);
           // --- 【神威】発動条件の判定 ---
    this.playerStats.kamui_activated = (divineGeneralCount >= 6);
    if (this.playerStats.kamui_activated) {
        console.log(`%c✨ 十二神将共鳴【神威】発動準備完了！ (3秒ごとに攻撃力+1)`, "color: cyan;");
    }
        console.log("敵最終ステータス:", this.enemyStats);
    }

    calculateFinalBattleState(initialItems, initialStats) {
        console.log("--- calculateFinalBattleState 開始 ---");
        
        // === STEP 1: 属性と神将のカウント ===
        const elementCounts = { fire: 0, water: 0, earth: 0, wind: 0, light: 0, dark: 0, organization: 0, divine_general: 0};
        const elementKeys = Object.keys(elementCounts);
        initialItems.forEach(item => {
            if (item.tags && Array.isArray(item.tags)) {
                item.tags.forEach(tag => { if (elementKeys.includes(tag)) elementCounts[tag]++; });
            } else {
                console.warn(`アイテム[${item.id}]に 'tags' プロパティがありません`);
            }
        });
        console.log("%c属性/タグカウント結果:", "color: yellow; font-weight: bold;", elementCounts);

        // === STEP 2: 共鳴の計算 ===

         // --- 2a. 十二神将共鳴 ---
        const divineGeneralCount = elementCounts.divine_general || 0;

        if (divineGeneralCount >= 2) { // 【神気】
            console.log(`%c✨ 十二神将共鳴【神気】発動！ (最大HP+15, 防御+2)`, "color: cyan;");
            initialStats.max_hp += 15;
        }

        if (divineGeneralCount >= 4) { // 【神速】
            console.log(`%c✨ 十二神将共鳴【神速】発動！ (リキャスト-10%)`, "color: cyan;");
            initialItems.forEach(item => { if (item.recast) item.recast *= 0.9; });
        }
        
        if (divineGeneralCount >= 6) { // 【神威】
            console.log(`%c✨ 十二神将共鳴【神威】発動！ (全味方の攻撃力+2)`, "color: cyan;");
            const attackBonus = 2;
            initialItems.forEach(item => {
                if (item.action) {
                    const actions = Array.isArray(item.action) ? item.action : [item.action];
                    actions.forEach(act => {
                        if (act.type === 'attack') act.value += attackBonus;
                    });
                }
            });
        }

        if (divineGeneralCount >= 12) { // 【神域】
            console.log(`%c✨ 十二神将共鳴【神域】発動！ (全味方の攻撃力+5)`, "color: gold;");
            const attackBonus = 5;
            initialItems.forEach(item => {
                if (item.action) {
                    const actions = Array.isArray(item.action) ? item.action : [item.action];
                    actions.forEach(act => {
                        if (act.type === 'attack') act.value += attackBonus;
                    });
                }
            });
        }

        // --- 2b. 属性共鳴 ---
        for (const element in ELEMENT_RESONANCE_RULES) {
            const rule = ELEMENT_RESONANCE_RULES[element];
            const count = elementCounts[element] || 0;
            if (count >= rule.threshold) {
                console.log(`%c🔥 属性共鳴発動！ [${element.toUpperCase()}] (${count}体)`, "color: cyan;");
                if (element === 'water') {
                    initialItems.forEach(item => {
                        if (item.synergy && typeof item.synergy.effect.value === 'number') {
                            const bonus = count - 2;
                            if (item.synergy.effect.value > 0) item.synergy.effect.value += bonus;
                            else item.synergy.effect.value -= bonus;
                        }
                    });
                } else {
                    initialItems.forEach(item => {
                        if (item.tags.includes(element)) {
                            let isBoosted = false;
                            if (element === 'fire' && item.action) {
                                const bonus = Math.floor(count / 2); // この計算式は元のまま
                                if (Array.isArray(item.action)) { item.action.forEach(act => { if(act.type === 'attack') act.value += bonus; }); }
                                else if(item.action.type === 'attack') { item.action.value += bonus; }
                                isBoosted = true;
                            }
                            if (element === 'wind' && item.recast) { item.recast = Math.max(0.1, item.recast - (0.2 * (count - 2))); isBoosted = true; }
                            if (element === 'earth') { const bonus = count * 2; if (item.action && item.action.type === 'block') item.action.value += bonus; if (item.synergy && item.synergy.effect.type.includes('block')) item.synergy.effect.value += bonus; isBoosted = true; }
                            if (element === 'light') { const bonus = count * 2; if (item.action && item.action.type === 'heal') item.action.value += bonus; if (item.synergy && item.synergy.effect.type.includes('heal')) item.synergy.effect.value += bonus; isBoosted = true; }
                            if (isBoosted) console.log(`  -> [${item.id}] が強化されました`);
                        }
                    });
                }
            }
        }
        
        // --- 2c. 【将来用】組織共鳴 ---
        
        const orgCount = elementCounts.organization || 0;
        const ORG_THRESHOLD = 3;
        if (orgCount >= ORG_THRESHOLD) {
            const damageReduction = 0.3;
            console.log(`%c✨ 組織共鳴発動！ (自傷ダメージ -${damageReduction * 100}%)`, "color: gold;");
            initialItems.forEach(item => {
                if (item.tags.includes('organization') && item.action) {
                    const actions = Array.isArray(item.action) ? item.action : [item.action];
                    actions.forEach(act => {
                        if (act.type === 'self_pain') {
                            act.value = Math.ceil(act.value * (1 - damageReduction));
                        }
                    });
                }
            });
        }
        
        
        // === STEP 3: 個別パッシブの計算 ===
        if (divineGeneralCount > 0) {
            initialItems.forEach(item => {
                if (item.passive?.effects.some(e => e.type === 'vajra_passive')) {
                    const reductionValue = item.passive.effects.find(e => e.type === 'vajra_passive').value;
                    const reduction = (divineGeneralCount - 1) * reductionValue;
                    if (reduction > 0) {
                        item.recast = Math.max(0.1, item.recast - reduction);
                        console.log(`%cヴァジラ効果: リキャスト-${reduction}s`, "color: magenta;");
                    }
                }
                if (item.passive?.effects.some(e => e.type === 'haila_passive')) {
                    const bonusValue = item.passive.effects.find(e => e.type === 'haila_passive').value;
                    const bonusAttack = divineGeneralCount * bonusValue;
                    if (Array.isArray(item.action)) {
                        item.action.forEach(act => { if(act.type === 'attack') act.value += bonusAttack; });
                    } else if(item.action?.type === 'attack') {
                        item.action.value += bonusAttack;
                    }
                    console.log(`%cハイラ効果: 攻撃力+${bonusAttack}`, "color: magenta;");
                }
            });
        }

        // === STEP 4: シナジー効果の計算 ===
        initialItems.forEach((sourceItem, sourceIndex) => {
            if (!sourceItem.synergy) return;
            initialItems.forEach((targetItem, targetIndex) => {
                if (sourceIndex === targetIndex) return;
                if (sourceItem.row === undefined || targetItem.row === undefined) return;
                let synergyApplied = false;
                const sourceShape = this.getRotatedShape(sourceItem.id, sourceItem.rotation);
                const targetShape = this.getRotatedShape(targetItem.id, targetItem.rotation);
                for (let sr = 0; sr < sourceShape.length && !synergyApplied; sr++) {
                    for (let sc = 0; sc < sourceShape[sr].length && !synergyApplied; sc++) {
                        if (sourceShape[sr][sc] === 0) continue;
                        const sourceCellPos = { r: sourceItem.row + sr, c: sourceItem.col + sc };
                        for (let tr = 0; tr < targetShape.length && !synergyApplied; tr++) {
                            for (let tc = 0; tc < targetShape[tr].length && !synergyApplied; tc++) {
                                if (targetShape[tr][tc] === 0) continue;
                                const targetCellPos = { r: targetItem.row + tr, c: targetItem.col + tc };
                                let isMatch = false;
                                let direction = sourceItem.synergy.direction;
                                const rotation = sourceItem.rotation || 0;
                                if (rotation === 90 || rotation === 270) {
                                    if (direction === 'horizontal') direction = 'vertical';
                                    else if (direction === 'vertical') direction = 'horizontal';
                                }
                                const dr = targetCellPos.r - sourceCellPos.r;
                                const dc = targetCellPos.c - sourceCellPos.c;
                                if (direction === 'horizontal') {
                                    if (dr === 0 && Math.abs(dc) === 1) isMatch = true;
                                } else if (direction === 'vertical') {
                                    if (dc === 0 && Math.abs(dr) === 1) isMatch = true;
                                } else if (direction === 'adjacent') {
                                    if (Math.abs(dr) + Math.abs(dc) === 1) isMatch = true;
                                } else {
                                    let targetDir = {r: 0, c: 0};
                                    switch(direction) {
                                        case 'up': targetDir = {r: -1, c: 0}; break; case 'down': targetDir = {r: 1,  c: 0}; break;
                                        case 'left': targetDir = {r: 0, c: -1}; break; case 'right': targetDir = {r: 0, c: 1}; break;
                                    }
                                    if (targetDir.r !== 0 || targetDir.c !== 0) {
                                        const rad = Phaser.Math.DegToRad(rotation);
                                        const rotC = Math.round(targetDir.c * Math.cos(rad) - targetDir.r * Math.sin(rad));
                                        const rotR = Math.round(targetDir.c * Math.sin(rad) + targetDir.r * Math.cos(rad));
                                        if (dr === rotR && dc === rotC) isMatch = true;
                                    }
                                }
                                if (isMatch) {
                                    console.log(`★ シナジー関係検出: [${sourceItem.id}] -> [${targetItem.id}]`);
                                    const effects = Array.isArray(sourceItem.synergy.effect) ? sourceItem.synergy.effect : [sourceItem.synergy.effect];
                                    effects.forEach(effect => {
                                        if (effect.type === 'add_attack' && targetItem.action) {
                                            if(Array.isArray(targetItem.action)) { targetItem.action.forEach(act => { if(act.type === 'attack') act.value += effect.value; }); }
                                            else if(targetItem.action.type === 'attack') { targetItem.action.value += effect.value; }
                                        }
                                        else if (effect.type === 'add_recast' && targetItem.recast > 0) { targetItem.recast = Math.max(1.0, targetItem.recast + effect.value); }
                                        else if (effect.type === 'add_heal_power') {
                                            if (targetItem.action && Array.isArray(targetItem.action)) { targetItem.action.forEach(act => { if(act.type === 'heal') act.value += effect.value; }); }
                                            else if (targetItem.action && targetItem.action.type === 'heal') { targetItem.action.value += effect.value; }
                                            if (targetItem.synergy && targetItem.synergy.effect.type.includes('heal')) { targetItem.synergy.effect.value += effect.value; }
                                        }
                                        else if (effect.type === 'add_block_on_activate' || effect.type === 'heal_on_activate') {
                                            if (!targetItem.appliedTriggers) targetItem.appliedTriggers = [];
                                            targetItem.appliedTriggers.push({ sourceId: sourceItem.id, effect: effect });
                                            console.log(`  -> 起動時に「${effect.type}」を付与`);
                                        }
                                   else if  (effect.type === 'add_tag') {
                                            if (!targetItem.tags.includes(effect.value)) {
                                                targetItem.tags.push(effect.value);
                                                console.log(`%cマコラ効果: [${targetItem.id}]に「${effect.value}」タグ付与`, "color: magenta;");
                                            }
                                        }
                                    });
                                    synergyApplied = true;
                                }
                            }
                        }
                    }
                }
            });
        });
        
        // === STEP 5: 最終ステータスの計算 ===
        let finalMaxHp = initialStats.max_hp;
        let finalDefense = 0;
        if (divineGeneralCount >= 2) {
            finalDefense += 2;
        }
        let finalCurrentHp = Math.min(initialStats.hp, finalMaxHp);
        const battleItems = [];
        initialItems.forEach(item => {
            if (item.passive && item.passive.effects) {
                item.passive.effects.forEach(effect => {
                    if (effect.type === 'defense') finalDefense += effect.value;
                    if (effect.type === 'max_hp') finalMaxHp += effect.value;
                    if (effect.type === 'halve_own_hp_on_start') {
                        finalCurrentHp = Math.floor(finalCurrentHp / 2);
                        console.log(`%cインダラ効果: HPが半減`, "color: magenta;");
                    }
                });
            }
            if (item.recast > 0) {
                battleItems.push({ data: item, nextActionTime: item.recast, gameObject: item.gameObject, isActing: false });
            }
        });
        const darkResonanceLevel = (elementCounts.dark >= 3) ? 1 : 0;
        const activatedResonances = Object.keys(elementCounts).filter(el => ELEMENT_RESONANCE_RULES[el] && elementCounts[el] >= ELEMENT_RESONANCE_RULES[el].threshold);
        return {
            finalStats: {
                max_hp: finalMaxHp, hp: finalCurrentHp, defense: finalDefense,
                block: [], attack: 0, darkResonanceLevel: darkResonanceLevel
            },
            battleItems: battleItems,
            finalizedItems: initialItems,
            activatedResonances: activatedResonances
        };
    }
    startBattle() {
        console.log("★★は 戦闘開始！ ★★");
        this.battleStartTime = this.time.now;
        this.battleTimerText = this.add.text(this.scale.width / 2, 50, `TIME: ${this.maxBattleDuration}`, {
            fontSize: '40px', fill: '#ffffff', stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5).setDepth(100);
    }

    onTimeUp() {
        if (this.gameState !== 'battle') return;
        console.log("★★ タイムアップ！ ★★");
        this.gameState = 'end';
        if (this.battleTimerText) {
            this.battleTimerText.setVisible(false);
        }
        const playerHp = this.playerStats.hp;
        const enemyHp = this.enemyStats.hp;
        console.log(`HP判定: PLAYER ${playerHp.toFixed(0)} vs ENEMY ${enemyHp.toFixed(0)}`);
        if (playerHp >= enemyHp) {
            console.log("プレイヤーのHPが上回っているため、勝利。");
            this.playFinishBlowEffects(this.enemyAvatar);
        } else {
            console.log("敵のHPが上回っているため、敗北。");
            this.endBattle('lose');
        }
    }

    update(time, delta) {
        if (this.gameState !== 'battle') return;
        const now = this.time.now;
        if (this.battleStartTime) {
            const elapsedSeconds = (this.time.now - this.battleStartTime) / 1000;
            const remainingSeconds = this.maxBattleDuration - elapsedSeconds;
            if (this.battleTimerText) {
                this.battleTimerText.setText(`TIME: ${Math.max(0, Math.ceil(remainingSeconds))}`);
            }
            if (remainingSeconds <= 0 && !this.isTimeUp) {
                console.log("Time is up! Scheduling final judgment.");
                this.isTimeUp = true;
                this.time.delayedCall(500, this.onTimeUp, [], this);
            }
        }
        
        if (this.playerStats.block && Array.isArray(this.playerStats.block)) {
            this.playerStats.block = this.playerStats.block.filter(b => b.expireTime > now);
        } else {
            this.playerStats.block = [];
        }
        
        if (this.enemyStats.block && Array.isArray(this.enemyStats.block)) {
            this.enemyStats.block = this.enemyStats.block.filter(b => b.expireTime > now);
        } else {
            this.enemyStats.block = [];
        }

        const updateRecastMask = (charObject, progress, isPlayerSide) => {
            if (!charObject || !charObject.active || !charObject.getData('recastMask')) return;
            const maskGraphics = charObject.getData('recastMask');
            maskGraphics.clear();
            if (progress > 0.01) {
                const w = charObject.width;
                const h = charObject.height;
                const fillHeight = h * progress;
                let corners = [
                    { x: -w / 2, y: h / 2 - fillHeight }, { x: w / 2, y: h / 2 - fillHeight },
                    { x: w / 2, y: h / 2 }, { x: -w / 2, y: h / 2 }
                ];
                if (isPlayerSide) {
                    corners.forEach(p => p.x *= -1);
                }
                const rotation = charObject.rotation;
                const sin = Math.sin(rotation);
                const cos = Math.cos(rotation);
                const rotatedCorners = corners.map(p => ({ x: p.x*cos - p.y*sin, y: p.x*sin + p.y*cos }));
                const matrix = charObject.getWorldTransformMatrix();
                const gx = matrix.tx;
                const gy = matrix.ty;
                const finalPoints = rotatedCorners.map(p => ({ x: gx + p.x, y: gy + p.y }));
                maskGraphics.fillStyle(0xffffff);
                maskGraphics.fillPoints(finalPoints, true);
            }
        };

        this.finalizedPlayerItems.forEach(itemData => {
            if (itemData.triggerAction && !itemData.triggerFired) {
                const trigger = itemData.triggerAction.trigger;
                const stats = this.playerStats;
                if (trigger.type === 'hp_below') {
                    const hpPercent = (stats.hp / stats.max_hp) * 100;
                    if (hpPercent <= trigger.percent) {
                        console.log(`%c🔥 トリガー発動！ [${itemData.id}] - HP ${trigger.percent}%以下`, "color: magenta;");
                        const action = itemData.triggerAction.action;
                        if (action.type === 'heal_percent') {
                            const healAmount = stats.max_hp * (action.value / 100);
                            const finalHeal = Math.min(healAmount, stats.max_hp - stats.hp);
                            if(finalHeal > 0) {
                                stats.hp += finalHeal;
                                this.stateManager.setF('player_hp', stats.hp);
                                this.showHealPopup(this.playerAvatar, Math.floor(finalHeal));
                            }
                        }
                        if (trigger.once) {
                            itemData.triggerFired = true;
                        }
                    }
                }
            }
        });
        
        if (this.finalizedEnemyItems) {
            this.finalizedEnemyItems.forEach(itemData => {
                if (itemData.triggerAction && !itemData.triggerFired) {
                    const trigger = itemData.triggerAction.trigger;
                    const stats = this.enemyStats;
                    if (trigger.type === 'hp_below') {
                        const hpPercent = (stats.hp / stats.max_hp) * 100;
                        if (hpPercent <= trigger.percent) {
                            console.log(`%c🔥 トリガー発動！ [敵の ${itemData.id}] - HP ${trigger.percent}%以下`, "color: magenta;");
                            const action = itemData.triggerAction.action;
                            if (action.type === 'heal_percent') {
                                const healAmount = stats.max_hp * (action.value / 100);
                                const finalHeal = Math.min(healAmount, stats.max_hp - stats.hp);
                                if(finalHeal > 0) {
                                    stats.hp += finalHeal;
                                    this.stateManager.setF('enemy_hp', stats.hp);
                                    this.showHealPopup(this.enemyAvatar, Math.floor(finalHeal));
                                }
                            }
                            if (trigger.once) {
                                itemData.triggerFired = true;
                            }
                        }
                    }
                }
            });
        }
        
        this.playerBattleItems.forEach(item => {
            item.nextActionTime -= delta / 1000;
            const progress = Math.min(1, 1 - (item.data.recast > 0 ? item.nextActionTime / item.data.recast : 0));
            updateRecastMask(item.gameObject, progress, true);
            if (item.nextActionTime <= 0 && !item.isActing) {
                item.isActing = true;
                this.executeAction(item.data, 'player', 'enemy', item.gameObject, item);
                item.nextActionTime += item.data.recast;
            }
        });

        if (this.gameState !== 'battle') return;

        this.enemyBattleItems.forEach(item => {
            item.nextActionTime -= delta / 1000;
            const progress = Math.min(1, 1 - (item.data.recast > 0 ? item.nextActionTime / item.data.recast : 0));
            updateRecastMask(item.gameObject, progress, false);
            if (item.nextActionTime <= 0 && !item.isActing) {
                item.isActing = true;
                this.executeAction(item.data, 'enemy', 'player', item.gameObject, item);
                item.nextActionTime += item.data.recast;
            }
        });
    }

    // ★★★【修正点1】二重定義されていた executeAction のうち、古い方を削除 ★★★
    
    executeAction(itemData, attacker, defender, attackerObject, itemObject) {
        if (attackerObject) {
            this.playAttackAnimation(attackerObject, attacker, itemObject);
        }
        const itemName = itemData.id || "アイテム";
        if (itemData.action) {
            const actions = Array.isArray(itemData.action) ? itemData.action : [itemData.action];
            actions.forEach(action => {
                const defenderStats = this[`${defender}Stats`];
                const attackerStats = this[`${attacker}Stats`];
                if (action.type === 'attack') {
                    let totalAttack = action.value;
                     const attackerStats = this[`${attacker}Stats`]; // ★ attackerStats をここで取得

                // --- 神威のボーナスを加算 ---
                // ★ attackerStats を参照するように修正
                if (attackerStats.kamui_bonus > 0) {
                    totalAttack += attackerStats.kamui_bonus;
                }
                     if (itemData.tags.includes('dark') && attackerStats.darkResonanceLevel > 0) {
                        const hpPercent = (attackerStats.hp / attackerStats.max_hp) * 100;
                        let bonus = 0;
                        if (hpPercent < 75) bonus += 3;
                        if (hpPercent < 50) bonus += 4;
                        if (hpPercent < 25) bonus += 8;
                        
                        if (bonus > 0) {
                            totalAttack += bonus;
                            console.log(`▼ ${attacker}の背水発動！ HP ${hpPercent.toFixed(0)}% のため攻撃力+${bonus}`);
                        }
                    }
                    let damage = Math.max(0, totalAttack - defenderStats.defense);
                    if (defenderStats.block && defenderStats.block.length > 0 && damage > 0) {
                        let damageToBlock = damage;
                        for (let i = 0; i < defenderStats.block.length; i++) {
                            const blockLayer = defenderStats.block[i];
                            const blockedAmount = Math.min(damageToBlock, blockLayer.amount);
                            damageToBlock -= blockedAmount;
                            blockLayer.amount -= blockedAmount;
                            if (damageToBlock <= 0) break;
                        }
                        defenderStats.block = defenderStats.block.filter(b => b.amount > 0);
                        const totalBlocked = damage - damageToBlock;
                        damage = damageToBlock;
                        if (totalBlocked > 0) {
                            this.showBlockSuccessIcon(defender);
                        }
                    }
                    if (damage > 0) {
                        this.playDamageEffects(defender, Math.floor(damage));
                        const newHp = defenderStats.hp - damage;
                        defenderStats.hp = newHp;
                        this.stateManager.setF(`${defender}_hp`, newHp);
                        if (newHp <= 0) {
                            this.gameState = 'end';
                            if (defender === 'enemy') this.playFinishBlowEffects(this.enemyAvatar);
                            else this.endBattle('lose');
                        }
                    }
                }
                else if (action.type === 'block') {
                    if (!Array.isArray(attackerStats.block)) attackerStats.block = [];
                    attackerStats.block.push({ amount: action.value, expireTime: this.time.now + 3000 });
                    this.showGainBlockPopup(attackerObject, action.value);
                }
                else if (action.type === 'heal') {
                    const healAmount = Math.min(action.value, attackerStats.max_hp - attackerStats.hp);
                    if (healAmount > 0) {
                        try { this.soundManager.playSe('se_heal'); } catch(e) {} 
                        attackerStats.hp += healAmount;
                        this.stateManager.setF(`${attacker}_hp`, attackerStats.hp);
                        const targetAvatar = (attacker === 'player') ? this.playerAvatar : this.enemyAvatar;
                        this.showHealPopup(targetAvatar, Math.floor(healAmount));
                    }
                }
              
                  // ★★★★★ この else if ブロックを追加 ★★★★★
             //--- 【将来のアップデート用】自傷ダメージ ---
             else if (action.type === 'self_pain') {
                 const attackerStats = this[`${attacker}Stats`];
                 const painAmount = action.value;
            
                 // ブロックを無視して直接HPを減らす
                 attackerStats.hp -= painAmount;
                 this.stateManager.setF(`${attacker}_hp`, attackerStats.hp);
            
            //     // 自傷ダメージ専用のエフェクトを表示
                 this.showPainPopup(attackerObject, painAmount);
            //
                 if (attackerStats.hp <= 0) {
                     this.gameState = 'end';
                    if (attacker === 'player') {
                         this.endBattle('lose');
                    } else {
                         // 敵が自傷で倒れた場合も、プレイヤーの勝利とする
                         this.playFinishBlowEffects(this.enemyAvatar);
                     }
                }
             }
              else if (action.type === 'recast_boost_player_by_hp') {
                const targetSide = attacker; // 効果対象はスキル使用者側
                const targetStats = this[`${targetSide}Stats`];
                const targetBattleItems = this[`${targetSide}BattleItems`];

                // HPが50%以下かどうかを判定
                if (targetStats.hp / targetStats.max_hp <= 0.5) {
                    console.log(`%c✨ ${targetSide}側の背水効果発動！ 味方全体のリキャスト短縮！`, "color: magenta;");
                    
                    const reductionPercent = action.percent / 100; // 例: 30 -> 0.3
                    
                    targetBattleItems.forEach(battleItem => {
                        const maxRecast = battleItem.data.recast;
                        if (maxRecast > 0) {
                            // 各アイテムのリキャスト最大値から、短縮する秒数を計算
                            const reductionAmount = maxRecast * reductionPercent;
                            // 次のアクションまでの残り時間を、計算した秒数だけ減らす
                            battleItem.nextActionTime -= reductionAmount;
                        }
                    });

                    // (ここに、リキャストが加速したことを示すエフェクトを追加するとさらに良くなる)
                    // 例: const targetAvatar = (targetSide === 'player') ? this.playerAvatar : this.enemyAvatar;
                    //     this.playRecastBoostEffect(targetAvatar);
                }
            }
            // ★★★ 追加ここまで ★★★
            // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
           
            });
        }
        this.handleActivationTriggers(itemData, attacker);
    }

    // ★★★【修正点2】二重定義されていた handleActivationTriggers のうち、古い方を削除 ★★★

    handleActivationTriggers(itemData, attacker) {
        if (!itemData.appliedTriggers || itemData.appliedTriggers.length === 0) {
            return;
        }
        console.log(` > [${itemData.id}] の起動時トリガーを処理...`);
        itemData.appliedTriggers.forEach(trigger => {
            const effect = trigger.effect;
            const sourceId = trigger.sourceId;
            const targetStats = (attacker === 'player') ? this.playerStats : this.enemyStats;
            const targetAvatar = (attacker === 'player') ? this.playerAvatar : this.enemyAvatar;
            if (effect.type === 'add_block_on_activate') {
                const BLOCK_DURATION = 3000;
                if (!Array.isArray(targetStats.block)) {
                    targetStats.block = [];
                }
                targetStats.block.push({
                    amount: effect.value,
                    expireTime: this.time.now + BLOCK_DURATION
                });
                this.showGainBlockPopup(targetAvatar, effect.value);
                console.log(` > シナジー効果！ [${sourceId}]からブロック+${effect.value}を獲得！`);
            }
            else if (effect.type === 'heal_on_activate') {
                const healAmount = Math.min(effect.value, targetStats.max_hp - targetStats.hp);
                if (healAmount > 0) {
                    targetStats.hp += healAmount;
                    this.stateManager.setF(`${attacker}_hp`, targetStats.hp);
                    this.showHealPopup(targetAvatar, Math.floor(healAmount));
                    console.log(` > シナジー効果！ [${sourceId}]からHPを${healAmount.toFixed(1)}回復！`);
                }
            }
        });
    }

      endBattle(result) {
        if (this.battleEnded) return;
        this.battleEnded = true;
        console.log(`バトル終了。結果: ${result}`);

        if (result === 'win') {
            return;
        }

        try { this.soundManager.playSe('se_game_over'); } catch(e) {}
        this.add.text(this.scale.width / 2, this.scale.height / 2 - 100, 'GAME OVER', {
            fontSize: '64px', fill: '#f00', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(999);

        const retryCount = this.stateManager.sf.retry_count || 0;
        const maxRetries = 3;
        
        // ★★★ この2行を修正 ★★★
        let retryButton = null; // ifの外で変数を宣言
        const giveUpButton = this.add.text(this.scale.width / 2, this.scale.height / 2 + 120, 'あきらめる', {
            fontSize: '32px', fill: '#fff', backgroundColor: '#aa0000', padding: { x: 15, y: 8 }
        }).setOrigin(0.5).setInteractive().setDepth(999);
        // ★★★ 修正ここまで ★★★

        if (retryCount < maxRetries) {
            // ★ const を削除して、外で宣言した変数に代入する
            retryButton = this.add.text(this.scale.width / 2, this.scale.height / 2 + 40, `このラウンドを再挑戦 (残り: ${maxRetries - retryCount}回)`, {
                fontSize: '32px', fill: '#fff', backgroundColor: '#008800', padding: { x: 15, y: 8 }
            }).setOrigin(0.5).setInteractive().setDepth(999);

            retryButton.on('pointerdown', () => {
                this.stateManager.setSF('retry_count', retryCount + 1);
                giveUpButton.disableInteractive(); // あきらめるボタンも無効化

                const roundStartState = this.roundStartState;
                if (roundStartState) {
                    this.stateManager.setSF('player_backpack', roundStartState.backpack);
                    this.stateManager.setSF('player_inventory', roundStartState.inventory);
                    this.stateManager.setSF('coins', roundStartState.coins);
                    this.stateManager.setF('player_hp', roundStartState.hp);
                    console.log("ラウンド開始時の状態に復元してリトライします。");
                    this._transitionToScene({ to: this.scene.key, from: this.scene.key });
                } else {
                console.error("チェックポイントが見つかりません。スコア画面へ遷移します。");
                const payload = {
                    to: 'ScoreScene', from: this.scene.key,
                    params: { result: 'lose', finalRound: this.stateManager.sf.round || 1 }
                };
                this.scene.get('SystemScene').events.emit('request-scene-transition', payload);
             }
            });
        } else {
            this.add.text(this.scale.width / 2, this.scale.height / 2 + 40, '再挑戦できません', {
                fontSize: '32px', fill: '#888888', backgroundColor: '#333333', padding: { x: 15, y: 8 }
            }).setOrigin(0.5).setDepth(999);
        }

        giveUpButton.on('pointerdown', (pointer) => {
            console.log("敗北を認め、ScoreSceneへ遷移します。");
            giveUpButton.disableInteractive().setText('集計中...');
            
            // ★★★ このif文を追加 ★★★
            // retryButtonが存在する場合（＝再挑戦可能な場合）のみ、それを無効化する
            if (retryButton) {
                retryButton.disableInteractive();
            }

            this._transitionToScene({
                to: 'ScoreScene',
                from: this.scene.key,
                params: {
                    result: 'lose',
                    finalRound: this.stateManager.sf.round || 1
                }
            });
        });
    }

    setupEnemy(gridY, currentLayout) {
        const gameWidth = this.scale.width;
        const gridWidth = this.backpackGridSize * this.cellSize;
        const enemyGridX = gameWidth - 100 - gridWidth;
        const enemyGridY = gridY;
        this.enemyItemImages.forEach(item => item.destroy());
        this.enemyItemImages = [];
        console.log(`Round ${this.initialBattleParams.round} enemy layout:`, currentLayout);
        for (const uniqueId in currentLayout) {
            const layoutInfo = currentLayout[uniqueId];
            const baseItemId = uniqueId.split('_')[0];
            const itemData = ITEM_DATA[baseItemId];
            if (!itemData) {
                console.warn(`ITEM_DATAに'${baseItemId}'が見つかりません。`);
                continue;
            }
            const containerWidth = itemData.shape[0].length * this.cellSize;
            const containerHeight = itemData.shape.length * this.cellSize;
            const itemContainer = this.add.container(
                enemyGridX + (layoutInfo.col * this.cellSize) + (containerWidth / 2),
                enemyGridY + (layoutInfo.row * this.cellSize) + (containerHeight / 2)
            ).setSize(containerWidth, containerHeight);
            const itemImage = this.add.image(0, 0, itemData.storage).setDisplaySize(containerWidth, containerHeight);
            const recastOverlay = this.add.image(0, 0, itemData.storage).setDisplaySize(containerWidth, containerHeight).setTint(0x00aaff, 0.7).setVisible(false);
            const maskGraphics = this.add.graphics().setVisible(false);
            recastOverlay.setMask(maskGraphics.createGeometryMask());
            itemContainer.add([itemImage, recastOverlay, maskGraphics]);
            itemContainer.setData({ itemId: baseItemId, uniqueId: uniqueId, recastOverlay, recastMask: maskGraphics });
            const hasRecast = itemData.recast && itemData.recast > 0;
            recastOverlay.setVisible(hasRecast);
            itemContainer.setDepth(3).setInteractive({ draggable: false });
            itemContainer.on('pointerup', (pointer, localX, localY, event) => {
                event.stopPropagation();
                const tooltipText = this.generateTooltipText(baseItemId);

                    // ツールチップを表示
                    this.tooltip.show(itemContainer, tooltipText);
                });
            this.enemyItemImages.push(itemContainer);
        }
    }

    playResonanceAura(targetObject, color) {
        if (!targetObject || !targetObject.active) return;
      
        const centerX = targetObject.x;
        const bottomY = targetObject.y + targetObject.displayHeight / 2;
        const effectDuration = 1500;
        const aura = this.add.graphics().setDepth(targetObject.depth - 1);
        aura.fillGradientStyle(color, color, color, color, 1, 1, 0, 0);
        aura.fillRect(centerX - targetObject.displayWidth / 2, bottomY - targetObject.displayHeight, targetObject.displayWidth, targetObject.displayHeight);
        this.tweens.add({ targets: aura, alpha: 0, duration: effectDuration, ease: 'Cubic.easeOut', onComplete: () => { aura.destroy(); } });
        const particles = this.add.particles(0, 0, 'particle_white', {
            x: { min: centerX - targetObject.displayWidth/2, max: centerX + targetObject.displayWidth/2 },
            y: bottomY, lifespan: effectDuration, speedY: { min: -50, max: -150 }, scale: { start: 0.5, end: 0 },
            gravityY: 100, blendMode: 'ADD', tint: color, quantity: 2
        }).setDepth(targetObject.depth + 1);
        this.time.delayedCall(effectDuration - 200, () => { particles.stop(); });
        this.time.delayedCall(effectDuration * 2, () => { particles.destroy(); });
    }

        createItem(itemId, x, y) {
        const itemData = ITEM_DATA[itemId];
        if (!itemData) return null;
        const containerWidth = itemData.shape[0].length * this.cellSize;
        const containerHeight = itemData.shape.length * this.cellSize;
        const itemContainer = this.add.container(x, y).setSize(containerWidth, containerHeight);
        const itemImage = this.add.image(0, 0, itemData.storage).setDisplaySize(containerWidth, containerHeight);
        itemImage.setFlipX(true);
        const recastOverlay = this.add.image(0, 0, itemData.storage).setDisplaySize(containerWidth, containerHeight).setTint(0x00aaff, 0.7).setVisible(false).setFlipX(true);
        const maskGraphics = this.add.graphics().setVisible(false);
        recastOverlay.setMask(maskGraphics.createGeometryMask());
        const arrowContainer = this.add.container(0, 0).setVisible(false);
        const arrowStyle = { fontSize: '32px', color: '#ffdd00', stroke: '#000', strokeThickness: 4 };
        arrowContainer.add([
            this.add.text(0, 0, '▲', arrowStyle).setOrigin(0.5).setName('up'),
            this.add.text(0, 0, '▼', arrowStyle).setOrigin(0.5).setName('down'),
            this.add.text(0, 0, '◀', arrowStyle).setOrigin(0.5).setName('left'),
            this.add.text(0, 0, '▶', arrowStyle).setOrigin(0.5).setName('right')
        ]);
        itemContainer.add([itemImage, recastOverlay, arrowContainer, maskGraphics]).setDepth(12).setInteractive();
        itemContainer.setData({
            itemId, baseItemId: itemId, originX: x, originY: y, gridPos: null,
            itemImage, arrowContainer, rotation: 0, recastOverlay, recastMask: maskGraphics
        });
        const hasRecast = itemData.recast && itemData.recast > 0;
        recastOverlay.setVisible(hasRecast);
        this.input.setDraggable(itemContainer);
        let pressTimer = null;
        let isDragging = false;
        let isDown = false;
        itemContainer.on('pointerdown', (pointer) => {
            isDown = true;
            isDragging = false;
            itemContainer.setData('isLongPress', false);
            if (pointer.rightButtonDown()) {
                this.rotateItem(itemContainer);
                return;
            }
            pressTimer = this.time.delayedCall(500, () => {
                if (isDown && !isDragging) {
                    this.rotateItem(itemContainer);
                    itemContainer.setData('isLongPress', true);
                }
            });
        });
        itemContainer.on('dragstart', () => {
               try { this.soundManager.playSe('se_item_grab'); } catch (e) {}
            isDragging = true;
            if (pressTimer) pressTimer.remove();
            this.tooltip.hide();
            itemContainer.setDepth(99);
            this.removeItemFromBackpack(itemContainer);
            this.sellZoneGraphics.setVisible(true);
            this.sellZoneText.setVisible(true);
        });
        itemContainer.on('drag', (pointer, dragX, dragY) => {
            if (pressTimer) pressTimer.remove();
            itemContainer.setPosition(dragX, dragY);
            const gridCol = Math.floor((pointer.x - this.gridX) / this.cellSize);
            const gridRow = Math.floor((pointer.y - this.gridY) / this.cellSize);
            const shape = this.getRotatedShape(itemId, itemContainer.getData('rotation'));
            if (gridRow >= 0 && gridRow < this.backpackGridSize && gridCol >= 0 && gridCol < this.backpackGridSize) {
                this.ghostImage.clear();
                const canPlace = this.canPlaceItem(itemContainer, gridCol, gridRow);
                this.ghostImage.fillStyle(canPlace ? 0x00ff00 : 0xff0000, 0.5);
                for (let r = 0; r < shape.length; r++) {
                    for (let c = 0; c < shape[0].length; c++) {
                        if (shape[r][c] === 1) {
                            const x = this.gridX + (gridCol + c) * this.cellSize;
                            const y = this.gridY + (gridRow + r) * this.cellSize;
                            this.ghostImage.fillRect(x, y, this.cellSize, this.cellSize);
                        }
                    }
                }
                this.ghostImage.setVisible(true);
            } else {
                this.ghostImage.setVisible(false);
            }
        });
        itemContainer.on('dragend', (pointer) => {
            itemContainer.setDepth(12);
            this.ghostImage.clear();
            this.ghostImage.setVisible(false);
            this.sellZoneGraphics.setVisible(false);
            this.sellZoneText.setVisible(false);
            const droppedInSellZone = Phaser.Geom.Rectangle.Contains(this.sellZoneArea, pointer.x, pointer.y);
            const gridCol = Math.floor((pointer.x - this.gridX) / this.cellSize);
            const gridRow = Math.floor((pointer.y - this.gridY) / this.cellSize);
            if (droppedInSellZone) {
                try{this.soundManager.playSe('se_item_sell'); } catch (e) {}
                const itemId = itemContainer.getData('itemId');
                const itemData = ITEM_DATA[itemId];
                const sellPrice = Math.max(1, Math.floor((itemData.cost || 0) / 2));
                const currentCoins = this.stateManager.sf.coins || 0;
                this.stateManager.setSF('coins', currentCoins + sellPrice);
                this.updateShopButtons();
                const indexToRemove = this.inventoryItemImages.indexOf(itemContainer);
                if (indexToRemove > -1) {
                    this.inventoryItemImages.splice(indexToRemove, 1);
                }
                itemContainer.destroy();
                this.updateInventoryLayout();
                this.saveBackpackState();
                console.log(`アイテム'${itemId}'を ${sellPrice}コインで売却しました。`);
            } else if (this.canPlaceItem(itemContainer, gridCol, gridRow)) {
                try { this.soundManager.playSe('se_item_place'); } catch (e) {}
                const dropX = itemContainer.x;
                const dropY = itemContainer.y;
                this.placeItemInBackpack(itemContainer, gridCol, gridRow);
                const targetX = itemContainer.x;
                const targetY = itemContainer.y;
                itemContainer.setPosition(dropX, dropY);
                this.tweens.add({ targets: itemContainer, x: targetX, y: targetY, duration: 150, ease: 'Power1' });
                this.time.delayedCall(250, () => {
                    this.saveBackpackState();
                });
            } else {
                // ★★★ 修正箇所 ここから ★★★
                // グリッドにも売却ゾーンにもドロップされなかった場合、インベントリに戻す
                try { this.soundManager.playSe('se_place_fail'); } catch(e) {}

                // 1. アイテムをインベントリの管理リストに追加する（まだリストになければ）
                if (!this.inventoryItemImages.includes(itemContainer)) {
                    this.inventoryItemImages.push(itemContainer);
                }

                // 2. インベントリ全体のレイアウトを更新して、全アイテムを正しい位置に再配置する
                this.updateInventoryLayout();

                // 3. 変更後の状態を保存する
                this.saveBackpackState();
                // ★★★ 修正箇所 ここまで ★★★
            }
        });
        itemContainer.on('pointerup', (pointer, localX, localY, event) => {
            if (pressTimer) pressTimer.remove();
            if (!isDragging && !itemContainer.getData('isLongPress')) {
                event.stopPropagation();
                
                // ★★★ このブロックを書き換え ★★★
                // どのアイテムがクリックされたか
                const itemId = itemContainer.getData('itemId');
                
                // 戦闘中の強化ステータスを探す
                const placedIndex = this.placedItemImages.indexOf(itemContainer);
                let finalItemData = null;
                if (placedIndex > -1 && this.finalizedPlayerItems && this.finalizedPlayerItems.length > placedIndex) {
                    finalItemData = this.finalizedPlayerItems[placedIndex];
                }
                
                // 新しいメソッドを呼び出して、テキストを生成
                const tooltipText = this.generateTooltipText(itemId, finalItemData);
                this.tooltip.show(itemContainer, tooltipText);
                // ★★★ 書き換えここまで ★★★
            }
            isDown = false;
            isDragging = false;
            itemContainer.setData('isLongPress', false);
        });
        return itemContainer;
    }
    // rotateItem メソッドを、このシンプル版に置き換えてください

    // rotateItem メソッドを、これで丸ごと置き換えてください

        rotateItem(itemContainer) {
        const originalRotation = itemContainer.getData('rotation') || 0;
        const newRotation = (originalRotation + 90) % 360;
        
        const gridPos = itemContainer.getData('gridPos');

        if (gridPos) {
            // --- グリッド内での回転 ---
            
            // 1. チェックのために、一時的にグリッドから自分を消す
            this.removeItemFromBackpack(itemContainer);

            // 2. 回転後の状態で、元の場所に置けるかチェック
            itemContainer.setData('rotation', newRotation);
            if (this.canPlaceItem(itemContainer, gridPos.col, gridPos.row)) {
                // 3a. 【成功】置ける場合：回転を確定し、再度グリッドに配置
                try { this.soundManager.playSe('se_item_rotate'); } catch(e) {}
                this.placeItemInBackpack(itemContainer, gridPos.col, gridPos.row);
                itemContainer.setAngle(newRotation);
            } else {
                // 3b. 【失敗】置けない場合：回転をキャンセルし、元の状態でグリッドに戻す
                try { this.soundManager.playSe('se_place_fail'); } catch(e) {}
                itemContainer.setData('rotation', originalRotation); // 角度を元に戻す
                this.placeItemInBackpack(itemContainer, gridPos.col, gridPos.row);
            }
        } else {
            // --- インベントリ内での回転 ---
            try { this.soundManager.playSe('se_item_rotate'); } catch(e) {}
            itemContainer.setData('rotation', newRotation);
            itemContainer.setAngle(newRotation);
        }

        this.updateArrowVisibility(itemContainer);
        this.time.delayedCall(100, () => { this.saveBackpackState(); });
    }
    
    _rotateMatrix(matrix) {
        if (!matrix || matrix.length === 0 || !matrix[0]) return [[]];
        const rows = matrix.length;
        const cols = matrix[0].length;
        const newMatrix = Array.from({ length: cols }, () => Array(rows).fill(0));
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                newMatrix[c][rows - 1 - r] = matrix[r][c];
            }
        }
        return newMatrix;
    }

    canPlaceItem(itemContainer, startCol, startRow) {
        const itemId = itemContainer.getData('itemId');
        const rotation = itemContainer.getData('rotation') || 0;
        let shape = this.getRotatedShape(itemId, rotation);
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c] === 1) {
                    const checkRow = startRow + r;
                    const checkCol = startCol + c;
                    if (checkRow < 0 || checkRow >= this.backpackGridSize || checkCol < 0 || checkCol >= this.backpackGridSize || this.backpack[checkRow][checkCol] !== 0) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    placeItemInBackpack(itemContainer, startCol, startRow) {
        const itemId = itemContainer.getData('itemId');
        const rotation = itemContainer.getData('rotation') || 0;
        let shape = this.getRotatedShape(itemId, rotation);
        const containerWidth = shape[0].length * this.cellSize;
        const containerHeight = shape.length * this.cellSize;
        itemContainer.x = this.gridX + startCol * this.cellSize + containerWidth / 2;
        itemContainer.y = this.gridY + startRow * this.cellSize + containerHeight / 2;
        itemContainer.setData('gridPos', { row: startRow, col: startCol });
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c] === 1) {
                    this.backpack[startRow + r][startCol + c] = itemId;
                }
            }
        }
        const index = this.inventoryItemImages.indexOf(itemContainer);
        if (index > -1) this.inventoryItemImages.splice(index, 1);
        if (!this.placedItemImages.includes(itemContainer)) {
            this.placedItemImages.push(itemContainer);
        }
        this.updateArrowVisibility(itemContainer);
        this.updateInventoryLayout();
    }

        removeItemFromBackpack(itemContainer) {
        const gridPos = itemContainer.getData('gridPos');
        if (!gridPos) return;

        const itemId = itemContainer.getData('itemId');
        const rotation = itemContainer.getData('rotation') || 0;
        let shape = this.getRotatedShape(itemId, rotation);

        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c] === 1) {
                    this.backpack[gridPos.row + r][gridPos.col + c] = 0;
                }
            }
        }
        
        // ★★★ このメソッドは、以下の2行で仕事が終わる ★★★
        itemContainer.setData('gridPos', null);
        
        const index = this.placedItemImages.indexOf(itemContainer);
        if (index > -1) this.placedItemImages.splice(index, 1);
    }

    getRotatedShape(itemId, rotation) {
        if (!itemId) {
            console.warn("getRotatedShape: 不正なitemIdが渡されました。", itemId);
            return [[]];
        }
        const baseItemId = itemId.split('_')[0];
        if (!ITEM_DATA[baseItemId] || !ITEM_DATA[baseItemId].shape) {
            console.error(`getRotatedShape: ITEM_DATAに'${baseItemId}'の定義またはshapeがありません。`);
            return [[]];
        }
        let shape = JSON.parse(JSON.stringify(ITEM_DATA[baseItemId].shape));
        const rotations = Math.round(rotation / 90);
        for (let i = 0; i < rotations; i++) {
            shape = this._rotateMatrix(shape);
        }
        return shape;
    }

    updateArrowVisibility(itemContainer) {
        const itemId = itemContainer.getData('baseItemId') || itemContainer.getData('itemId');
        const itemData = ITEM_DATA[itemId];
        const arrowContainer = itemContainer.getData('arrowContainer');
        const gridPos = itemContainer.getData('gridPos');
        if (!itemData || !arrowContainer) return;
        arrowContainer.setVisible(false);
        arrowContainer.each(arrow => arrow.setVisible(false));
        if (itemData.synergy && gridPos) {
            arrowContainer.setVisible(true);
            const direction = itemData.synergy.direction;
            const itemW = itemContainer.width;
            const itemH = itemContainer.height;
            const offset = 15;
            if (direction === 'adjacent') {
                arrowContainer.getByName('up').setVisible(true).setPosition(0, -itemH / 2 - offset);
                arrowContainer.getByName('down').setVisible(true).setPosition(0, itemH / 2 + offset);
                arrowContainer.getByName('left').setVisible(true).setPosition(-itemW / 2 - offset, 0);
                arrowContainer.getByName('right').setVisible(true).setPosition(itemW / 2 + offset, 0);
            }
            else if (direction === 'horizontal') {
                arrowContainer.getByName('left').setVisible(true).setPosition(-itemW / 2 - offset, 0);
                arrowContainer.getByName('right').setVisible(true).setPosition(itemW / 2 + offset, 0);
            }
            else if (direction === 'vertical') {
                arrowContainer.getByName('up').setVisible(true).setPosition(0, -itemH / 2 - offset);
                arrowContainer.getByName('down').setVisible(true).setPosition(0, itemH / 2 + offset);
            }
            else if (direction === 'up_and_sides') {
                arrowContainer.getByName('up').setVisible(true).setPosition(0, -itemH / 2 - offset);
                arrowContainer.getByName('left').setVisible(true).setPosition(-itemW / 2 - offset, 0);
                arrowContainer.getByName('right').setVisible(true).setPosition(itemW / 2 + offset, 0);
            }
            else {
                let basePos = { x: 0, y: 0 };
                let arrowToShow = null;
                switch (direction) {
                    case 'up':    basePos = { x: 0, y: -itemH / 2 - offset }; arrowToShow = arrowContainer.getByName('up'); break;
                    case 'down':  basePos = { x: 0, y: itemH / 2 + offset }; arrowToShow = arrowContainer.getByName('down'); break;
                    case 'left':  basePos = { x: -itemW / 2 - offset, y: 0 }; arrowToShow = arrowContainer.getByName('left'); break;
                    case 'right': basePos = { x: itemW / 2 + offset, y: 0 }; arrowToShow = arrowContainer.getByName('right'); break;
                }
                if (arrowToShow) {
                    arrowToShow.setVisible(true).setPosition(basePos.x, basePos.y);
                }
            }
        }
    }

    playDamageEffects(targetSide, amount) {
        if (amount <= 0) return;
         const damageSeKeys = ['se_damage_01', 'se_damage_02', 'se_damage_03', 'se_damage_04'];
        try { this.soundManager.playSe(Phaser.Utils.Array.GetRandom(damageSeKeys)); } catch (e) {} 
        const damage = Math.floor(amount);
        const targetAvatar = (targetSide === 'player') ? this.playerAvatar : this.enemyAvatar;
        if (!targetAvatar) return;
        let fontSize = 24;
        let fill = '#ffffff';
        let stroke = '#000000';
        let strokeThickness = 4;
        if (damage >= 50) {
            fontSize = 48; fill = '#ff0000'; stroke = '#ffffff'; strokeThickness = 6;
        } else if (damage >= 20) {
            fontSize = 36; fill = '#ffdd00';
        }
        const damageText = this.add.text(0, 0, damage.toString(), {
            fontSize: `${fontSize}px`, fill, stroke, strokeThickness, fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(1002);
        const initialX = targetAvatar.x;
        const initialY = targetAvatar.y - (targetAvatar.displayHeight / 2) - 10;
        damageText.setPosition(initialX, initialY);
        this.tweens.add({
            targets: damageText, x: initialX + Phaser.Math.Between(-40, 40), y: initialY - 100, alpha: 0,
            duration: 1500, ease: 'Power1', onComplete: () => damageText.destroy()
        });
        const shakeIntensity = Math.min(0.015, 0.002 + damage * 0.0002);
        const shakeDuration = Math.min(200, 100 + damage * 2);
        this.cameras.main.shake(shakeDuration, shakeIntensity);
        let blinkCount = 0;
        targetAvatar.clearTint();
        const blinkTimer = this.time.addEvent({
            delay: 80,
            callback: () => {
                if (targetAvatar && targetAvatar.active) {
                    targetAvatar.setTint(blinkCount % 2 === 0 ? 0xff0000 : 0xffffff);
                    blinkCount++;
                }
            },
            repeat: 3, callbackScope: this
        });
        this.time.delayedCall(80 * 4 + 10, () => {
            if (targetAvatar && targetAvatar.active) targetAvatar.clearTint();
            if (blinkTimer) blinkTimer.remove();
        });
        const slashGraphics = this.add.graphics().setDepth(1001);
        slashGraphics.lineStyle(8, 0xffffff, 1.0);
        const lineLength = targetAvatar.displayWidth * 1.2;
        const centerX = targetAvatar.x;
        const centerY = targetAvatar.y;
        const slashContainer = this.add.container(centerX, centerY).setDepth(1001);
        slashContainer.add(slashGraphics);
        slashGraphics.beginPath();
        slashGraphics.moveTo(-lineLength / 2, -lineLength / 2);
        slashGraphics.lineTo(lineLength / 2, lineLength / 2);
        slashGraphics.moveTo(lineLength / 2, -lineLength / 2);
        slashGraphics.lineTo(-lineLength / 2, lineLength / 2);
        slashGraphics.strokePath();
        slashContainer.setAlpha(0.8);
        slashContainer.setScale(0.3);
        slashContainer.setAngle(Phaser.Math.DegToRad(Phaser.Math.Between(-25, 25)));
        this.tweens.add({
            targets: slashContainer, scale: 1.0, alpha: 0, duration: 250, ease: 'Cubic.easeOut',
            onComplete: () => { slashContainer.destroy(); }
        });
        const effectSprite = this.add.sprite(centerX, centerY, 'effect_impact').setDepth(1000);
        const desiredWidth = targetAvatar.displayWidth * 1.5;
        const scale = desiredWidth / effectSprite.width;
        effectSprite.setScale(scale);
        effectSprite.play('impact_anim');
        effectSprite.on('animationcomplete', () => { effectSprite.destroy(); });
    }

    updateInventoryLayout() {
        const gameWidth = this.scale.width;
        const inventoryAreaY = 520;
        const inventoryAreaHeight = 500;
        const inventoryContentWidth = gameWidth - 200;
        const itemCount = this.inventoryItemImages.length;
        if (itemCount === 0) return;
        const itemSpacing = inventoryContentWidth / itemCount;
        const itemStartX = 100 + (itemSpacing / 2);
        this.inventoryItemImages.forEach((itemContainer, index) => {
            const targetX = itemStartX + (index * itemSpacing);
            const targetY = inventoryAreaY + 140;
            itemContainer.setData({ originX: targetX, originY: targetY });
            this.tweens.add({ targets: itemContainer, x: targetX, y: targetY, duration: 200, ease: 'Power2' });
        });
    }

    playAttackAnimation(sourceObject, attackerType, itemObject) {
        if (!sourceObject) return;
        const moveDistance = 20;
        let moveX = 0;
        let moveY = 0;
        if (attackerType === 'player') {
            moveX = moveDistance;
        } else {
            moveX = -moveDistance;
        }
        this.tweens.add({
            targets: sourceObject, x: sourceObject.x + moveX, y: sourceObject.y + moveY, duration: 100,
            ease: 'Power1', yoyo: true,
            onStart: () => { sourceObject.setDepth(100); },
            onComplete: () => {
                sourceObject.setDepth(12);
                if (attackerType === 'enemy') {
                    sourceObject.setDepth(3);
                }
                if (itemObject) {
                    itemObject.isActing = false;
                }
            }
        });
    }

    showGainBlockPopup(targetObject, amount) {
        if (!targetObject || amount <= 0) return;
        const blockText = this.add.text(0, 0, `+${amount} Block`, {
            fontSize: '28px', fill: '#4caf50', stroke: '#ffffff', strokeThickness: 5, fontStyle: 'bold'
        }).setOrigin(0.5);
        const x = targetObject.x;
        const y = targetObject.y - (targetObject.height / 2);
        blockText.setPosition(x, y).setDepth(999);
        this.tweens.add({
            targets: blockText, y: y - 50, alpha: 0, duration: 1200, ease: 'Power1',
            onComplete: () => blockText.destroy()
        });
    }

    showBlockSuccessIcon(targetSide) {
        try { this.soundManager.playSe('se_block_success'); } catch (e) {}
        let targetObject;
        if (targetSide === 'player') {
            targetObject = this.playerAvatar;
        } else {
            targetObject = this.enemyAvatar;
        }
        if (!targetObject) return;
        const icon = this.add.text(0, 0, '🛡️', { fontSize: '48px' }).setOrigin(0.5);
        const x = targetObject.x;
        const y = targetObject.y;
        icon.setPosition(x, y).setDepth(1000);
        icon.setAlpha(0);
        this.tweens.chain({
            targets: icon,
            tweens: [
                { alpha: 1, duration: 100 },
                { scale: 1.2, duration: 150, ease: 'Sine.easeInOut', yoyo: true },
                { alpha: 0, duration: 200, delay: 300 }
            ],
            onComplete: () => icon.destroy()
        });
    }

    showHealPopup(targetObject, amount) {
        if (!targetObject || amount <= 0) return;
        const healText = this.add.text(0, 0, `+${amount}`, {
            fontSize: '32px', fill: '#abffab', stroke: '#1b5e20', strokeThickness: 5, fontStyle: 'bold'
        }).setOrigin(0.5);
        const x = targetObject.x;
        const y = targetObject.y - (targetObject.displayHeight / 2);
        healText.setPosition(x, y).setDepth(999);
        this.tweens.add({
            targets: healText, y: y - 60, alpha: 0, duration: 1500, ease: 'Power1',
            onComplete: () => healText.destroy()
        });
    }

    // scenes/BattleScene.js

    setupShop() {
        const gameWidth = this.scale.width;

        this.shopContainer = this.add.container(0, 0).setVisible(false);
        this.prepareContainer.add(this.shopContainer);

        // --- ボタンを配置するX座標と、縦の間隔を定義 ---
        const buttonX = 50; // 画面左端から50pxの位置 (グリッド(x=100)より左)
        const startY = this.gridY + 50; // グリッドの上端から少し下の位置
        const stepY = 80;   // ボタンごとの縦の間隔

        // --- HP回復ボタン ---
        const healCost = 2;
        const healPercent = 25;
        const healButton = this.add.text(buttonX, startY, `HP回復\n(${healCost} coin)`, {
            fontSize: '20px', fill: '#fff', backgroundColor: '#27ae60',
            padding: {x: 10, y: 5}, align: 'center'
        }).setOrigin(0.5).setInteractive().setDepth(12);
        
        healButton.setData({ cost: healCost, percent: healPercent });
        healButton.on('pointerdown', () => {
            const currentCoins = this.stateManager.sf.coins || 0;
            const currentHp = this.stateManager.f.player_hp || 0;
            const maxHp = this.stateManager.f.player_max_hp || 100;
            if (currentCoins >= healCost && currentHp < maxHp) {
                this.stateManager.setSF('coins', currentCoins - healCost);
                const healAmount = maxHp * (healPercent / 100);
                const newHp = Math.min(maxHp, currentHp + healAmount);
                this.stateManager.setF('player_hp', newHp);
                healButton.disableInteractive().setBackgroundColor('#555').setText('回復済み');
                this.updateShopButtons();
            }
        });
        this.shopContainer.add(healButton);
        this.healButton = healButton;

        // --- リロールボタン ---
        const rerollButton = this.add.text(buttonX, startY + stepY, `リロール\n(1 coin)`, {
            fontSize: '20px', fill: '#fff', backgroundColor: '#3498db',
            padding: {x: 10, y: 5}, align: 'center'
        }).setOrigin(0.5).setInteractive().setDepth(12);

        rerollButton.on('pointerdown', () => {
            try { this.soundManager.playSe('se_reroll'); } catch(e) {}
            const rerollCost = 1;
            const currentCoins = this.stateManager.sf.coins || 0;
            if (currentCoins >= rerollCost) {
                this.stateManager.setSF('coins', currentCoins - rerollCost);
                this.refreshShop();
            }
        });
        this.shopContainer.add(rerollButton);
    }

    refreshShop() {
        this.shopItemSlots.forEach(slot => slot.destroy());
        this.shopItemSlots = [];
        const gameWidth = this.scale.width;
        const inventoryAreaY = 480;
        const inventoryAreaHeight = this.scale.height - inventoryAreaY;
        const currentRound = this.initialBattleParams.round || 1;
        let slotCount = 3;
        if (currentRound >= 5) slotCount = 4;
        if (currentRound >= 8) slotCount = 5;
        const fullPool = Object.keys(ITEM_DATA);
        const shopPool = fullPool.filter(id => {
            const item = ITEM_DATA[id];
            if (!item.cost || !item.rarity) return false;
            if (currentRound < 3 && item.rarity > 1) return false;
            if (currentRound < 6 && item.rarity > 2) return false;
            return true;
        });
        const selectedItems = [];
        const rewardCount = Math.min(slotCount, shopPool.length);
        for (let i = 0; i < rewardCount; i++) {
            const randomIndex = Phaser.Math.Between(0, shopPool.length - 1);
            selectedItems.push(shopPool.splice(randomIndex, 1)[0]);
        }
        const shopContentWidth = gameWidth - 200;
        const itemSpacing = shopContentWidth / slotCount;
        const itemStartX = 100 + (itemSpacing / 2);
        selectedItems.forEach((itemId, index) => {
            const x = itemStartX + (index * itemSpacing);
            const y = inventoryAreaY + inventoryAreaHeight / 2 - 20;
            const itemData = ITEM_DATA[itemId];
            const slotWidth = 160;
            const slotHeight = 200;
            const slotContainer = this.add.container(x, y).setSize(slotWidth, slotHeight).setInteractive();
            this.shopContainer.add(slotContainer);
            this.shopItemSlots.push(slotContainer);
            const itemImage = this.add.image(0, -50, itemData.storage);
            const imageAreaWidth = 100;
            const imageAreaHeight = 80;
            if (itemImage.width > imageAreaWidth || itemImage.height > imageAreaHeight) {
                const scale = Math.min(imageAreaWidth / itemImage.width, imageAreaHeight / itemImage.height);
                itemImage.setScale(scale);
            }
            const nameText = this.add.text(0, 30, itemId, { fontSize: '20px', fill: '#fff', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5).setName('nameText');
            const costText = this.add.text(0, 55, `${itemData.cost} coins`, { fontSize: '18px', fill: '#ffd700', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5);
            const buyButtonBg = this.add.rectangle(0, 90, 100, 40, 0x3399ff).setStrokeStyle(2, 0xffffff).setName('buyButtonBg');
            const buyButtonText = this.add.text(0, 90, '購入', { fontSize: '22px', fill: '#fff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setName('buyButtonText');
            slotContainer.add([itemImage, nameText, costText, buyButtonBg, buyButtonText]);
            const currentCoins = this.stateManager.sf.coins || 0;
            if (currentCoins < itemData.cost) {
                buyButtonText.setText('コイン不足');
                buyButtonBg.setFillStyle(0x888888);
                slotContainer.setData('canBuy', false);
            } else {
                slotContainer.setData('canBuy', true);
            }
            slotContainer.on('pointerdown', (pointer, localX, localY, event) => {
                event.stopPropagation();
                this.tooltip.hide();
                if (localY > 60) {
                    if (slotContainer.getData('canBuy') !== true) return;
                       try { this.soundManager.playSe('se_item_buy'); } catch(e) {} 
                    const newCoins = (this.stateManager.sf.coins || 0) - itemData.cost;
                    const newInventory = [...this.stateManager.sf.player_inventory, itemId];
                    this.stateManager.setSF('coins', newCoins);
                    this.stateManager.setSF('player_inventory', newInventory);
                    const newItemContainer = this.createItem(itemId, -100, -100);
                    if (newItemContainer) {
                        this.inventoryItemImages.push(newItemContainer);
                        this.updateInventoryLayout();
                    }
                    buyButtonText.setText('購入済み');
                    buyButtonBg.setFillStyle(0x555555);
                    slotContainer.removeInteractive();
                    this.updateShopButtons();
                } else {
                 const tooltipText = this.generateTooltipText(itemId);
                    
                    // ツールチップを表示
                    const matrix = slotContainer.getWorldTransformMatrix();
                    const worldX = matrix.tx;
                    const worldY = matrix.ty;
                    // showAt は存在しない可能性があるので、showを使うのが安全
                    this.tooltip.show(slotContainer, tooltipText);
                }
            });
        });
    }

    updateShopButtons() {
        const currentCoins = this.stateManager.sf.coins || 0;
        this.shopItemSlots.forEach(slot => {
            if (!slot.input || !slot.input.enabled) return;
            const nameText = slot.getByName('nameText');
            const buyButtonText = slot.getByName('buyButtonText');
            const buyButtonBg = slot.getByName('buyButtonBg');
            if(!nameText || !buyButtonText || !buyButtonBg) return;
            const itemData = ITEM_DATA[nameText.text];
            if(!itemData) return;
            if (currentCoins < itemData.cost) {
                buyButtonText.setText('コイン不足');
                buyButtonBg.setFillStyle(0x888888);
                slot.setData('canBuy', false);
            } else {
                buyButtonText.setText('購入');
                buyButtonBg.setFillStyle(0x3399ff);
                slot.setData('canBuy', true);
            }
        });
    }

    saveBackpackState() {
        const newBackpackData = {};
        this.placedItemImages.forEach((item, index) => {
            const gridPos = item.getData('gridPos');
            if (gridPos) {
                newBackpackData[`uid_${index}`] = {
                    itemId: item.getData('itemId'), row: gridPos.row, col: gridPos.col, rotation: item.getData('rotation')
                };
            }
        });
        const newInventoryData = this.inventoryItemImages.map(item => item.getData('itemId'));
        this.stateManager.setSF('player_backpack', newBackpackData);
        this.stateManager.setSF('player_inventory', newInventoryData);
        console.log("Backpack & Inventory states auto-saved.");
    }
    
           // playFinishBlowEffects メソッドを丸ごとこれに置き換え

    async playFinishBlowEffects(targetAvatar) {
        if (!targetAvatar) return;
  try { this.soundManager.playSe('se_finish_blow'); } catch (e) {}
        // --- STEP 1: トドメの瞬間のスローモーション演出 ---
        this.time.timeScale = 0.2;
        const finishSlash = this.add.graphics().setDepth(2001);
        // ... (斬撃エフェクトの描画コードは変更なし) ...
        const centerX = this.scale.width / 2; const centerY = this.scale.height / 2; const lineLength = this.scale.width; const centerWidth = 30; finishSlash.fillStyle(0xffffff, 1.0); finishSlash.lineStyle(2, 0xffff00, 1.0); const points = [ { x: -lineLength / 2, y: 0 }, { x: 0, y: -centerWidth / 2 }, { x: lineLength / 2, y: 0 }, { x: 0, y: centerWidth / 2 } ]; finishSlash.beginPath(); finishSlash.moveTo(points[0].x, points[0].y); for (let i = 1; i < points.length; i++) { finishSlash.lineTo(points[i].x, points[i].y); } finishSlash.closePath(); finishSlash.fillPath(); finishSlash.strokePath(); const slashContainer = this.add.container(centerX, centerY).setAngle(-20); slashContainer.add(finishSlash);
        
        this.tweens.add({
            targets: slashContainer, scale: { from: 0.3, to: 1.5 }, alpha: { from: 1, to: 0 },
            duration: 400, ease: 'Cubic.easeOut', onComplete: () => { slashContainer.destroy(); }
        });
        const effectSprite = this.add.sprite(targetAvatar.x, targetAvatar.y, 'effect_finish').setDepth(2000);
        const desiredWidth = targetAvatar.displayWidth * 2.5;
        effectSprite.setScale(desiredWidth / effectSprite.width);
        effectSprite.play('finish_anim');
        try { this.soundManager.stopBgm(); } catch(e) {}
        // アニメーションが終わるのを待つPromise
        const animPromise = new Promise(resolve => effectSprite.on('animationcomplete', () => {
             effectSprite.destroy();
             resolve();
        }));
        await animPromise; // ★トドメのアニメーションが終わるまで待つ

        // --- STEP 2: スローモーション解除と、間髪入れずに次の処理へ ---
        this.time.timeScale = 1.0;
        
        const currentRound = this.stateManager.sf.round || 1;
        const FINAL_ROUND = 10;

        // --- STEP 3: 「クリア！」演出を開始 ---
       // this.soundManager.playSe('se_round_clear');
        const roundClearLogo = this.add.image(this.scale.width / 2, this.scale.height / 2, 'round_clear_logo')
            .setDepth(6000)
            .setScale(0.5)
            .setAlpha(0);
        
        const effectPromise = new Promise(resolve => {
            this.tweens.chain({
                targets: roundClearLogo,
                tweens: [
                    { scale: 1.1, alpha: 1, duration: 200, ease: 'Cubic.easeOut' },
                    { scale: 1, duration: 100, ease: 'Cubic.easeInOut' },
                    { alpha: 1, duration: 800 },
                    { alpha: 0, duration: 200, ease: 'Cubic.easeIn' }
                ],
                onComplete: () => {
                    roundClearLogo.destroy();
                    resolve();
                }
            });
        });

        // --- STEP 4: データ保存処理（演出と並行して実行）---
        console.log("Saving data in background...");
          const saveDataPromise = new Promise(async resolve => { // ★ここもasyncに
            this.stateManager.setF('player_hp', this.playerStats.hp);
            const finalBackpackData = {};
            this.placedItemImages.forEach((item, index) => {
                const gridPos = item.getData('gridPos');
                if (gridPos) {
                    finalBackpackData[`uid_${index}`] = { itemId: item.getData('itemId'), row: gridPos.row, col: gridPos.col, rotation: item.getData('rotation') };
                }
            });
            const finalInventoryData = this.inventoryItemImages.map(item => item.getData('itemId'));
            this.stateManager.setSF('player_backpack', finalBackpackData);
            this.stateManager.setSF('player_inventory', finalInventoryData);
            await this._createRankMatchData();
            this.time.delayedCall(1, resolve);
        });

        // --- STEP 5: 演出とデータ保存の両方が完了するのを待つ ---
        await Promise.all([effectPromise, saveDataPromise]);
        console.log("Save complete and effect finished.");

        // --- STEP 6: 次のシーンへフェードアウトして遷移 ---
        if (currentRound >= FINAL_ROUND) {
            this._transitionToScene({
                to: 'GameClearScene',
                from: this.scene.key,
                params: { finalRound: currentRound }
            });
        } else {
            const currentCoins = this.stateManager.sf.coins || 0;
            const rewardCoins = 10 + (currentRound * 2);
            this.stateManager.setSF('coins', currentCoins + rewardCoins);
            this.stateManager.setSF('round', currentRound + 1);
             this._transitionToScene({
                to: 'RewardScene',
                from: this.scene.key,
                // ★★★ この params を追加 ★★★
                params: {
                    returnTo: 'BattleScene'
                }
            });
        }
    }
    // BattleScene.js の末尾にあるヘルパーメソッド

    /**
     * ★★★ 暗幕ワイプで指定のシーンへ遷移する ★★★
     * @private
     */
    _transitionToScene(payload) {
        if (this.startBattleButton) this.startBattleButton.disableInteractive();

        const transitionSpeed = 300;
        const { width } = this.scale;

        // 1. 暗幕で画面を覆う (ワイプイン)
        this.tweens.add({
            targets: this.transitionWipe,
            x: width / 2,
            duration: transitionSpeed,
            ease: 'Expo.easeInOut',
            onComplete: () => {
                // 2. 画面が隠れたら、SystemSceneに遷移を依頼
                this.scene.get('SystemScene').events.emit('request-scene-transition', payload);
            }
        });
    }

// BattleScene.js に追加した _playVsCutin メソッド

    /**
     * 戦闘開始時のVSカットイン演出を再生する (修正版)
     * @param {function} onCompleteCallback - 演出完了後に実行するコールバック
     * @private
     */
    _playVsCutin(onCompleteCallback) {
        const { width, height } = this.scale;
        const cutinSpeed = 400;
        const vsSlamDelay = 200;

        // --- 演出用のコンテナを作成 ---
        const cutinContainer = this.add.container(0, 0).setDepth(5000);

        // --- 1. プレイヤー側のカットインを作成 ---
        // 背景画像 (奥)
        const playerBg = this.add.image(0, height * 0.35, 'cutin_player_bg').setOrigin(0, 0.5);
        // アバター画像 (手前)
        const playerAvatar = this.add.image(250, height * 0.35, this.playerAvatar.texture.key).setScale(0.8);
        
        // playerCutinコンテナに背景とアバターを追加
        const playerCutin = this.add.container(-width, 0, [playerBg, playerAvatar]);
        cutinContainer.add(playerCutin);

        // --- 2. 敵側のカットインを作成 ---
        // 背景画像 (奥)
        const enemyBg = this.add.image(width, height * 0.65, 'cutin_enemy_bg').setOrigin(1, 0.5);
        // アバター画像 (手前)
        const enemyAvatar = this.add.image(width - 250, height * 0.65, this.enemyAvatar.texture.key).setScale(0.8);

        // enemyCutinコンテナに背景とアバターを追加
        const enemyCutin = this.add.container(width, 0, [enemyBg, enemyAvatar]);
        cutinContainer.add(enemyCutin);

        // --- 3. VSロゴを作成 (アニメーションの前に作っておく) ---
        const vsLogo = this.add.image(width / 2, height / 2, 'vs_logo')
            .setAngle(-15) // 少し傾けておく
            .setScale(4)   // 大きめにしておく
            .setAlpha(0);  // 最初は透明
        cutinContainer.add(vsLogo);
        
        // --- 4. アニメーションを開始 ---
        this.tweens.add({
            targets: playerCutin,
            x: 0,
            duration: cutinSpeed,
            ease: 'Cubic.easeOut'
        });
        
        this.tweens.add({
            targets: enemyCutin,
            x: 0,
            duration: cutinSpeed,
            ease: 'Cubic.easeOut',
            delay: 100, // プレイヤー側より少し遅れて開始
            onComplete: () => {
             try{  this.soundManager.playSe('se_vs_cutin'); } catch(e) {}
                // 5. VSロゴを叩きつけるように表示
                this.tweens.add({
                    targets: vsLogo,
                    scale: 1,
                    alpha: 1,
                    angle: 0,
                    duration: 300,
                    ease: 'Elastic.Out(1, 0.5)', // バネの強さを調整
                    onComplete: () => {
                        // 6. 全ての演出が終わったら、カットインを消してコールバックを実行
                        this.tweens.add({
                            targets: cutinContainer,
                            alpha: 0,
                            duration: 300,
                            delay: 800, // ロゴ表示後の余韻
                            onComplete: () => {
                                cutinContainer.destroy();
                                if (onCompleteCallback) {
                                    onCompleteCallback();
                                }
                            }
                        });
                    }
                });
            }
        });
    }

    
    
   shutdown() {
        console.log(`${this.scene.key}: shutdown`);
        
        // 戦闘タイマーの破棄
        if (this.battleTimerText) {
            this.battleTimerText.destroy();
            this.battleTimerText = null;
        }

        // ★★★ このブロックを追加 ★★★
        // 神威タイマーが存在すれば、破棄する
        if (this.kamuiTimer_player) {
            this.kamuiTimer_player.remove();
            this.kamuiTimer_player = null;
            console.log("Player Kamui timer removed.");
        }
        if (this.kamuiTimer_enemy) {
            this.kamuiTimer_enemy.remove();
            this.kamuiTimer_enemy = null;
            console.log("Enemy Kamui timer removed.");
        }
        // ★★★ 追加ここまで ★★★

        // (もし他にもシーン固有のタイマーやイベントがあれば、ここで破棄する)
    }
    
     /**
     * 非同期対戦用のゴーストデータを生成し、Firestoreにアップロードする
     * @private
     */
    async _createRankMatchData() { // ★ async を追加
        // firebaseManagerがなければ何もしない
        if (!this.firebaseManager) return;

        console.log("%c[GHOST_DATA] Generating and Uploading Rank Match Data...", "color: violet; font-weight: bold;");

        const rankMatchData = {
            rank: this.stateManager.sf.player_profile.rank,
            round: this.stateManager.sf.round,
            backpack: this.stateManager.sf.player_backpack,
            base_max_hp: this.stateManager.sf.player_base_max_hp,
            createdAt: new Date().toISOString()
        };

        // ★★★ console.log の代わりに、uploadGhostData を呼び出す ★★★
        await this.firebaseManager.uploadGhostData(rankMatchData);
    }


     // ★★★★★ このメソッドを追加 ★★★★★
    // --- 【将来のアップデート用】自傷ダメージのポップアップ ---
     showPainPopup(targetObject, amount) {
         if (!targetObject || amount <= 0) return;
     // 紫色など、特別な色のテキストでダメージ量を表示
         const painText = this.add.text(0, 0, `-${amount}`, {
             fontSize: '32px',
             fill: '#ff00ff', // マゼンタ
             stroke: '#ffffff',
         strokeThickness: 5,
            fontStyle: 'italic'
         }).setOrigin(0.5);
    //
         const x = targetObject.x;
     const y = targetObject.y - (targetObject.height / 2);
         painText.setPosition(x, y).setDepth(999);
    
         this.tweens.add({
             targets: painText,
            y: y + 50, // 通常のダメージとは逆（下）に落ちる
             alpha: 0,
             duration: 1200,
             ease: 'Power1',
             onComplete: () => painText.destroy()
         });
     }
// BattleScene.js の末尾に追加

   // _applyKamuiEffect メソッドを、この全文で置き換えてください

    /**
     * 十二神将共鳴【神威】の効果を適用する (プレイヤー/敵 兼用)
     * @param {string} side - 'player' または 'enemy'
     * @private
     */
    _applyKamuiEffect(side) {
        if (this.gameState !== 'battle') return;

        const targetStats = this[`${side}Stats`];
        const targetBattleItems = this[`${side}BattleItems`];
        
        if (!targetStats || !targetBattleItems) return;

        console.log(`%c✨【神威】効果発動！ ${side}側の攻撃力ボーナス+1`, "color: gold;");

        // --- 1. データ上の攻撃力ボーナスを+1する ---
        targetStats.kamui_bonus += 1;
        
        // --- 2. 視覚的なフィードバック（エフェクト） ---
        // 戦闘中のアクティブなアイテムのリストから、ゲームオブジェクトを光らせる
        targetBattleItems.forEach(battleItem => {
            const itemContainer = battleItem.gameObject; // ★ 正しい参照
            if (itemContainer && itemContainer.active) {
                itemContainer.setTint(0xffffff);
                this.time.delayedCall(150, () => {
                    if (itemContainer && itemContainer.active) {
                        itemContainer.clearTint();
                    }
                });
            }
        });
    }

    /**
     * 指定されたアイテムIDに基づいて、ツールチップに表示するテキストを動的に生成する
     * @param {string} itemId - 表示するアイテムのID
     * @param {object} [finalizedItemData=null] - (任意) 戦闘中の強化ステータスを反映させる場合
     * @returns {string} - 生成されたツールチップの全文
     */
    // scenes/BattleScene.js

    generateTooltipText(itemId, finalizedItemData = null) {
        const baseItemData = ITEM_DATA[itemId];
        if (!baseItemData) return "不明なアイテム";

        const t = (key) => TOOLTIP_TRANSLATIONS[key] || key;
        let tooltipText = `【${t(itemId)}】\n`;

        const itemAttributes = baseItemData.tags.filter(tag => ATTRIBUTE_TAGS.includes(tag));
        if (itemAttributes.length > 0) {
            tooltipText += `属性: [${itemAttributes.map(el => t(el)).join(', ')}]\n`;
        }
        
        const sizeH = baseItemData.shape.length;
        const sizeW = baseItemData.shape[0].length;
        tooltipText += `サイズ: ${sizeH} x ${sizeW}\n\n`;
        
        if (baseItemData.recast) {
            const recastValue = finalizedItemData ? finalizedItemData.recast : baseItemData.recast;
            tooltipText += `リキャスト: ${recastValue.toFixed(1)}秒\n`;
        }

        // --- 効果 (Action) ---
        if (baseItemData.action) {
            tooltipText += `\n効果:\n`; // 見出しを追加
            const baseActions = Array.isArray(baseItemData.action) ? baseItemData.action : [baseItemData.action];
            const finalActions = (finalizedItemData && finalizedItemData.action) ? (Array.isArray(finalizedItemData.action) ? finalizedItemData.action : [finalizedItemData.action]) : baseActions;
            
            baseActions.forEach((baseAction, index) => {
                const finalAction = finalActions[index] || baseAction;
                
                // ★★★ このブロックを修正 ★★★
                // 翻訳テンプレートを取得してから、値を置換する
                const template = t(finalAction.type) || `${finalAction.type} {value}`;
                const desc = template.replace('{value}', finalAction.value);
                tooltipText += `  - ${desc}\n`;

                if (finalAction.value !== baseAction.value) {
                    tooltipText += `    (基本値: ${baseAction.value})\n`;
                }
            });
        }

        // --- パッシブ ---
        if (baseItemData.passive && baseItemData.passive.effects) {
            tooltipText += `\nパッシブ:\n`;
            baseItemData.passive.effects.forEach(e => {
                const template = t(e.type) || `${e.type} +{value}`;
                const desc = template.replace('{value}', e.value);
                tooltipText += `  - ${desc}\n`;
            });
        }
        
        // --- シナジー ---
        if (baseItemData.synergy) {
            tooltipText += `\nシナジー:\n`;
            const dir = t(baseItemData.synergy.direction);
            const effects = Array.isArray(baseItemData.synergy.effect) ? baseItemData.synergy.effect : [baseItemData.synergy.effect];
            tooltipText += `  - ${dir}の味方に:\n`;
            effects.forEach(effect => {
                const valueStr = t(effect.value) || effect.value;
                const template = t(effect.type) || `${effect.type} {value}`;
                const desc = template.replace('{value}', valueStr);
                tooltipText += `    - ${desc}\n`;
            });
        }
        
        return tooltipText;
    }
    
}
