// BattleScene.js (最終決定版・完全体)
import { ITEM_DATA } from '../core/ItemData.js';
import Tooltip from '../ui/Tooltip.js';
import { EnemyGenerator } from '../core/EnemyGenerator.js';
// BattleScene.js の上部に追加

const ELEMENT_COLORS = {
    fire: 0xff4d4d, // 明るい赤
    wind: 0x4dff4d, // 明るい緑
    earth: 0xffaa4d, // オレンジ/茶色
    water: 0x4d4dff, // 明るい青
    light: 0xffff4d, // 黄色
    dark: 0xaa4dff  // 紫
};
// ツールチップ表示用の日本語変換テーブル
const TOOLTIP_TRANSLATIONS = {
    // 方向
    up: '上', down: '下', left: '左', right: '右', adjacent: '隣接',
    // 属性
    fire: '火', water: '水', earth: '土', wind: '風', light: '光', dark: '闇',
    // タグ（必要に応じて）
    weapon: '武器', support: '支援', healer: '回復', defense: '防御',
    // 効果タイプ
    add_attack: '攻撃力', add_recast: 'リキャスト'
};

// 属性共鳴のルール定義
const ELEMENT_RESONANCE_RULES = {
    fire: { threshold: 3, description: (count) => `攻撃力+${Math.floor(count / 2)}` },
    wind: { threshold: 3, description: (count) => `リキャスト-${(0.2 * (count - 2)).toFixed(1)}s` },
    earth: { threshold: 3, description: (count) => `ブロック効果+${count * 2}` },
    light: { threshold: 3, description: (count) => `回復効果+${count * 2}` },
    water: { threshold: 3, description: (count) => `シナジー効果+${count - 2}` },
    dark:  { threshold: 3, description: (count) => `背水効果(小)` } // 説明はシンプルに
};
export default class BattleScene extends Phaser.Scene {
    constructor() {
        super('BattleScene');
        // --- プロパティの初期化 ---
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
        this.playerAvatar = null; // ★追加
        this.enemyAvatar = null;  // ★追加
        this.battleEnded = false;
        this.ghostImage = null;
        this.finalizedPlayerItems = [];
        this.roundStartState = null;
        this.shopContainer = null;      // ★ショップUI全体をまとめるコンテナ
        this.shopItemSlots = [];        // ★商品のスロット（カード）を保持する配列
        this.isShopVisible = false;
    }

    // BattleScene.js の init をこれに置き換え
    // BattleScene.js の init をこのシンプルなバージョンに置き換えてください
    init(data) {
        this.enemyItemImages = [];
        // データ受け渡しに起因するバグをなくすため、ここでは何もしない。
        // 全ての初期化は create で行う。
        console.log("BattleScene: init (空)");
    }
    // BattleScene.js の create を、この最終確定版に置き換えてください
    create() {
        console.log("BattleScene: create - データ永続化対応版 (sf)");
        const backgroundKeys = ['background1', 'background2', 'background3', 'background4'];
        const selectedBgKey = Phaser.Utils.Array.GetRandom(backgroundKeys);
        this.add.image(this.scale.width / 2, this.scale.height / 2, selectedBgKey)
            .setDisplaySize(this.scale.width, this.scale.height)
            .setDepth(-1);
        // =================================================================
        // STEP 1: マネージャー取得とデータ準備
        // =================================================================
        this.stateManager = this.sys.registry.get('stateManager');
        this.soundManager = this.sys.registry.get('soundManager');
        this.tooltip = new Tooltip(this);

        // --- 1a. StateManagerからプレイヤーデータを取得（なければsetSFで初期化）
        if (this.stateManager.sf.player_backpack === undefined) {
            this.stateManager.setSF('player_backpack', {});
        }
        if (this.stateManager.sf.player_inventory === undefined) {
            this.stateManager.setSF('player_inventory', ['sword', 'shield', 'potion']);
        }
        const backpackData = this.stateManager.sf.player_backpack;
        const inventoryData = this.stateManager.sf.player_inventory;

        // in create() -> STEP 1-b

        // --- 1b. 戦闘パラメータを決定 ---
        const initialPlayerMaxHp = this.stateManager.f.player_max_hp || 100;

        // ★★★ ここからが修正箇所 ★★★
        // 前のラウンドからHPを引き継ぐ。ただし初回（f.player_hpが存在しない場合）は最大HPから開始。
        const initialPlayerHp = this.stateManager.f.player_hp > 0 ? this.stateManager.f.player_hp : initialPlayerMaxHp;
        // ★★★ 修正箇所ここまで ★★★

        const round = this.stateManager.sf.round || 1;
        this.initialBattleParams = { playerMaxHp: initialPlayerMaxHp, playerHp: initialPlayerHp, round: round };
        // ★★★ ここからが追加箇所 ★★★
        // --- 1c. ゲームオーバー判定
        // 引き継いだHPが0以下なら、戦闘を開始せずにゲームオーバー処理へ
        if (initialPlayerHp <= 0) {
            console.log("ゲームオーバー: HPが0の状態でラウンドを開始しようとしました。");

            // 将来的には GameOverScene に遷移する
            // 今は暫定的に、データをリセットして同じバトルシーンを再起動する（はじめから）
            this.stateManager.sf = {}; // メモリ上のsfをリセット
            localStorage.removeItem('my_novel_engine_system'); // ストレージのsfをリセット
            this.stateManager.f = {}; // メモリ上のfをリセット

            // SystemSceneにタイトルへの復帰などを依頼するのが理想だが、今は直接リスタート
            this.scene.start(this.scene.key);

            return; // create処理をここで中断
        }
        // ★★★ 追加ここまで ★★★


        // =================================================================
        // STEP 2: シーンのプロパティ初期化
        // =================================================================
        this.inventoryItemImages = []; this.placedItemImages = []; this.enemyItemImages = [];
        this.finalizedPlayerItems = []; this.playerBattleItems = []; this.enemyBattleItems = [];
        this.playerStats = {}; this.enemyStats = {};
        this.battleEnded = false; this.gameState = 'prepare';
        this.cameras.main.setBackgroundColor('#8a2be2');

        // =================================================================
        // STEP 3: グローバルな状態設定と基本描画
        // =================================================================
        this.soundManager.playBgm('ronpa_bgm');
        this.stateManager.setF('player_max_hp', this.initialBattleParams.playerMaxHp);
        this.stateManager.setF('player_hp', this.initialBattleParams.playerHp);
        // in create()
// ...
const enemyBaseHp = 100;
const enemyRoundBonus = (this.initialBattleParams.round - 1) * 20;
const enemyFinalHp = enemyBaseHp + enemyRoundBonus;

this.stateManager.setF('enemy_max_hp', enemyFinalHp); 
this.stateManager.setF('enemy_hp', enemyFinalHp);
        
        // --- 3a. 盤面レイアウトの計算と描画
        const gameWidth = this.scale.width;
        const gameHeight = this.scale.height;
        const gridWidth = this.backpackGridSize * this.cellSize;
        const gridHeight = this.backpackGridSize * this.cellSize;
        this.gridX = 100;
        this.gridY = gameHeight / 2 - gridHeight / 2 - 50;
        this.backpack = Array(this.backpackGridSize).fill(null).map(() => Array(this.backpackGridSize).fill(0));
        this.prepareContainer = this.add.container(0, 0);
        this.ghostImage = this.add.rectangle(0, 0, this.cellSize, this.cellSize, 0xffffff, 0.5).setVisible(false).setDepth(5);

        // --- 3b. グリッドとアバターの描画
        this.add.rectangle(this.gridX + gridWidth / 2, this.gridY + gridHeight / 2, gridWidth, gridHeight, 0x333333, 0.9).setDepth(1);
        for (let i = 0; i <= this.backpackGridSize; i++) { this.add.line(0, 0, this.gridX, this.gridY + i * this.cellSize, this.gridX + gridWidth, this.gridY + i * this.cellSize, 0x666666, 0.5).setOrigin(0).setDepth(2); this.add.line(0, 0, this.gridX + i * this.cellSize, this.gridY, this.gridX + i * this.cellSize, this.gridY + gridHeight, 0x666666, 0.5).setOrigin(0).setDepth(2); } // prettier-ignore
        this.playerAvatar = this.add.sprite(this.gridX + gridWidth + 80, this.gridY + gridHeight / 2, 'player_avatar_placeholder').setOrigin(0.5).setDepth(5);
        const enemyGridX = gameWidth - 100 - gridWidth;
        const enemyGridY = this.gridY;
        this.add.rectangle(enemyGridX + gridWidth / 2, this.gridY + gridHeight / 2, gridWidth, gridHeight, 0x500000, 0.9).setDepth(1);
        for (let i = 0; i <= this.backpackGridSize; i++) { this.add.line(0, 0, enemyGridX, this.gridY + i * this.cellSize, enemyGridX + gridWidth, this.gridY + i * this.cellSize, 0x888888, 0.5).setOrigin(0).setDepth(2); this.add.line(0, 0, enemyGridX + i * this.cellSize, this.gridY, enemyGridX + i * this.cellSize, this.gridY + gridHeight, 0x888888, 0.5).setOrigin(0).setDepth(2); } // prettier-ignore
        this.enemyAvatar = this.add.sprite(enemyGridX - 80, this.gridY + gridHeight / 2, 'enemy_avatar_placeholder').setOrigin(0.5).setDepth(5);
        const maxAvatarHeight = gridHeight * 0.8;
        [this.playerAvatar, this.enemyAvatar].forEach(avatar => { if (avatar.height > maxAvatarHeight) { avatar.setScale(maxAvatarHeight / avatar.height); } });

        // --- 3c. 敵アイテムの配置
        // --- 3c. 敵アイテムの配置
        this.setupEnemy(this.gridY); // ★引数として this.gridY を渡す

        // =================================================================
        // STEP 4: プレイヤーのバックパックとインベントリの復元
        // =================================================================
        // --- 4a. バックパックのアイテムを復元
        for (const uid in backpackData) {
            const itemInfo = backpackData[uid];
            const itemContainer = this.createItem(itemInfo.itemId, 0, 0);
            if (itemContainer) {
                itemContainer.setData('rotation', itemInfo.rotation);
                itemContainer.setAngle(itemInfo.rotation);
                this.placeItemInBackpack(itemContainer, itemInfo.col, itemInfo.row);
            }
        }
        // --- 4b. インベントリの描画とアイテム復元
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


        // =================================================================
        // ★★★ STEP 4.5: ショップのセットアップ ★★★
        // =================================================================
        this.setupShop();
        this.refreshShop();
        // =================================================================
        // STEP 5: イベントリスナーと完了通知
        // =================================================================
        const shopToggleButton = this.add.text(gameWidth - 640, inventoryAreaY - 400, 'ショップ表示', {
            fontSize: '20px',
            fill: '#ffdd00',
            backgroundColor: '#000000aa',
            padding: { x: 10, y: 5 }
        })
            .setOrigin(0.5).setInteractive().setDepth(11);
        this.prepareContainer.add(shopToggleButton);

        shopToggleButton.on('pointerdown', () => {
            this.isShopVisible = !this.isShopVisible;
            if (this.isShopVisible) {
                // インベントリアイテムを隠し、ショップを表示
                this.inventoryItemImages.forEach(item => item.setVisible(false));
                this.shopContainer.setVisible(true);
                shopToggleButton.setText('インベントリ表示');
                //  this.refreshShop(); // ★ショップを開くたびに品揃えを更新（しなくても良い、仕様による）
            } else {
                // ショップを隠し、インベントリアイテムを表示
                this.shopContainer.setVisible(false);
                this.inventoryItemImages.forEach(item => item.setVisible(true));
                shopToggleButton.setText('ショップ表示');
            }
        });
        // --- 5a. 暫定リセットボタン ---
        const resetButton = this.add.text(80, 40, '[ リセット ]', {
            fontSize: '20px',
            fill: '#ffdd00',
            backgroundColor: '#000000aa',
            padding: { x: 10, y: 5 }
        })
            .setOrigin(0.5)
            .setDepth(100)
            .setInteractive();

        resetButton.on('pointerdown', () => {
            // 確認ダイアログを表示
            if (window.confirm('本当にすべてのデータをリセットして最初から始めますか？')) {
                // 1. StateManagerのsf変数を空にする
                this.stateManager.sf = {};

                // 2. localStorageからセーブデータを削除
                localStorage.removeItem('my_novel_engine_system');
                console.log("Save data has been reset.");

                // 3. ページをリロードしてゲームを再起動
                window.location.reload();
            }
        });
        // ★★★ 追加ここまで ★★★

        // --- 5a. 戦闘開始ボタン ★★★ このブロックが復活しました ★★★
        this.startBattleButton = this.add.text(gameWidth / 2, inventoryAreaY - 40, '戦闘開始', { fontSize: '28px', backgroundColor: '#080', padding: { x: 20, y: 10 } }).setOrigin(0.5).setInteractive().setDepth(11);
        this.prepareContainer.add(this.startBattleButton);

         // ★★★ startBattleButtonのリスナーをクリーンアップ ★★★
    this.startBattleButton.on('pointerdown', () => {
        if (this.gameState !== 'prepare') return;

        // ★チェックポイント作成はここが正しい
        const initialBackpackData = {};
        this.placedItemImages.forEach((item, index) => {
            const gridPos = item.getData('gridPos');
            if (gridPos) {
                initialBackpackData[`uid_${index}`] = {
                    itemId: item.getData('itemId'), row: gridPos.row, col: gridPos.col, rotation: item.getData('rotation')
                };
            }
        });
        const initialInventoryData = this.inventoryItemImages.map(item => item.getData('itemId'));
        this.roundStartState = {
            backpack: initialBackpackData,
            inventory: initialInventoryData,
            coins: this.stateManager.sf.coins || 0,
            hp: this.initialBattleParams.playerHp
        };
        console.log("Round start state checkpoint created.", this.roundStartState);
        
        // --- 戦闘開始処理 ---
        this.gameState = 'battle';
        this.prepareForBattle(); // ★ これを呼ぶ
        
        const allPlayerItems = [...this.inventoryItemImages, ...this.placedItemImages];
        allPlayerItems.forEach(item => { if (item.input) item.input.enabled = false; });
        this.startBattleButton.input.enabled = false;
        this.tweens.add({
            targets: [this.prepareContainer, ...this.inventoryItemImages],
            alpha: 0,
            duration: 300,
            onComplete: () => {
                this.prepareContainer.setVisible(false);
                this.inventoryItemImages.forEach(item => item.setVisible(false));
            }
        });
        this.startBattle();
    });

    // ★★★ createの末尾に本来あるべきコード ★★★
    this.input.on('pointerdown', (pointer) => { if (!pointer.gameObject && this.tooltip.visible) { this.tooltip.hide(); } }, this);
    this.anims.create({ key: 'impact_anim', frames: this.anims.generateFrameNumbers('effect_impact', { start: 0, end: 7 }), frameRate: 24, repeat: 0 });
    this.anims.create({ key: 'finish_anim', frames: this.anims.generateFrameNumbers('effect_impact', { start: 0, end: 15 }), frameRate: 30, repeat: 0 });
    
    this.events.emit('scene-ready');
    console.log("BattleScene: create 完了");
}


    // --- ヘルパーメソッド群 (ここから下はすべて完成版) ---

 // prepareForBattle を、このスリムなバージョンに置き換えてください

prepareForBattle() {
    console.log("--- 戦闘準備開始 ---");

    // --- プレイヤー側の準備 ---
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
        hp: this.initialBattleParams.playerHp
    };
    
    const playerResult = this.calculateFinalBattleState(playerInitialItems, playerInitialStats);
    this.playerStats = playerResult.finalStats;
    this.playerBattleItems = playerResult.battleItems;
    this.finalizedPlayerItems = playerResult.finalizedItems;

    this.stateManager.setF('player_max_hp', this.playerStats.max_hp);
    this.stateManager.setF('player_hp', this.playerStats.hp);
    console.log("プレイヤー最終ステータス:", this.playerStats);

    // --- 敵側の準備 ---
    const enemyInitialItems = [];
    this.enemyItemImages.forEach(itemContainer => {
        const itemInstance = JSON.parse(JSON.stringify(ITEM_DATA[itemContainer.getData('itemId')]));
        itemInstance.id = itemContainer.getData('itemId');
        itemInstance.gameObject = itemContainer;
        enemyInitialItems.push(itemInstance);
    });

    const enemyInitialStats = {
        max_hp: this.stateManager.f.enemy_max_hp,
        hp: this.stateManager.f.enemy_max_hp
    };

    const enemyResult = this.calculateFinalBattleState(enemyInitialItems, enemyInitialStats);
    this.enemyStats = enemyResult.finalStats;
    this.enemyBattleItems = enemyResult.battleItems;
    
    this.stateManager.setF('enemy_max_hp', this.enemyStats.max_hp);
    this.stateManager.setF('enemy_hp', this.enemyStats.hp);
    console.log("敵最終ステータス:", this.enemyStats);
}

// BattleScene.js の calculateFinalBattleState を、この完全なコードで置き換えてください

/**
 * 指定されたアイテムリストから、シナジーと属性共鳴を計算し、最終的な戦闘状態を返す
 * @param {Array} initialItems - 戦闘用のアイテムコピーの配列
 * @param {object} initialStats - 初期状態のステータス (HPなど)
 * @returns {object} 計算後の最終的なステータスと、アクティブアイテムのリスト
 */
// 2. calculateFinalBattleState (安全チェック強化版)
calculateFinalBattleState(initialItems, initialStats) {
    console.log("--- calculateFinalBattleState 開始 ---");
    const elementCounts = { fire: 0, water: 0, earth: 0, wind: 0, light: 0, dark: 0 };
    const elementKeys = Object.keys(elementCounts);
    initialItems.forEach(item => {
        if (item.tags && Array.isArray(item.tags)) {
            item.tags.forEach(tag => { if (elementKeys.includes(tag)) elementCounts[tag]++; });
        } else {
            console.warn(`アイテム[${item.id}]に 'tags' プロパティがありません`);
        }
    });
    console.log("%c属性カウント結果:", "color: yellow; font-weight: bold;", elementCounts);

for (const element in ELEMENT_RESONANCE_RULES) {
    const rule = ELEMENT_RESONANCE_RULES[element];
    const count = elementCounts[element] || 0;
    if (count >= rule.threshold) {
        
        // ★★★ ここからが修正箇所 ★★★
        if (element === 'water') {
            // 水属性は特別：属性に関係なく全アイテムのシナジーを強化
            initialItems.forEach(item => {
                if (item.synergy && typeof item.synergy.effect.value === 'number') {
                    const bonus = count - 2;
                    if (item.synergy.effect.value > 0) item.synergy.effect.value += bonus;
                    else item.synergy.effect.value -= bonus;
                }
            });
        } else {
            // 水属性以外：その属性を持つアイテムだけを強化
            initialItems.forEach(item => {
                if (item.tags.includes(element)) {
                    // 【火属性】
                    if (element === 'fire' && item.action) {
                        item.action.value += Math.floor(count / 2);
                    }
                    // 【風属性】
                    if (element === 'wind' && item.recast) {
                        item.recast = Math.max(0.1, item.recast - (0.2 * (count - 2)));
                    }
                    // 【土属性】
                    if (element === 'earth') {
                        const bonus = count * 2;
                        if (item.action && item.action.type === 'block') item.action.value += bonus;
                        if (item.synergy && item.synergy.effect.type.includes('block')) item.synergy.effect.value += bonus;
                    }
                    // 【光属性】
                    if (element === 'light') {
                        const bonus = count * 2;
                        if (item.action && item.action.type === 'heal') item.action.value += bonus;
                        if (item.synergy && item.synergy.effect.type.includes('heal')) item.synergy.effect.value += bonus;
                    }
                }
            });
        }
        // ★★★ 修正箇所ここまで ★★★
    }
}

    // === STEP 2: シナジー効果の計算 ===
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

                            if (sourceItem.synergy.direction === 'adjacent') {
                                isMatch = Math.abs(sourceCellPos.r - targetCellPos.r) + Math.abs(sourceCellPos.c - targetCellPos.c) === 1;
                            } else {
                                let dir = {r: 0, c: 0};
                                switch(sourceItem.synergy.direction) {
                                    case 'up': dir = {r: -1, c: 0}; break; case 'down': dir = {r: 1, c: 0}; break;
                                    case 'left': dir = {r: 0, c: -1}; break; case 'right': dir = {r: 0, c: 1}; break;
                                }
                                const rad = Phaser.Math.DegToRad(sourceItem.rotation);
                                const rotC = Math.round(dir.c * Math.cos(rad) - dir.r * Math.sin(rad));
                                const rotR = Math.round(dir.c * Math.sin(rad) + dir.r * Math.cos(rad));
                                if (sourceCellPos.r + rotR === targetCellPos.r && sourceCellPos.c + rotC === targetCellPos.c) { isMatch = true; }
                            }

                            if (isMatch) {
                                // ★★★ この効果適用部分も、前回は空でした ★★★
                                const effect = sourceItem.synergy.effect;
                                console.log(`★ シナジー適用: [${sourceItem.id}] -> [${targetItem.id}]`);
                                if (effect.type === 'add_attack' && targetItem.action) {
                                    targetItem.action.value += effect.value;
                                }
                                if (effect.type === 'add_recast' && targetItem.recast > 0) {
                                    targetItem.recast = Math.max(0.1, targetItem.recast + effect.value);
                                }
                                synergyApplied = true;
                            }
                        }
                    }
                }
            }
        });
    });
    
    // === STEP 3: 最終ステータスの計算 ===
    let finalMaxHp = initialStats.max_hp;
    let finalDefense = 0;
    const battleItems = [];

    initialItems.forEach(item => {
        if (item.passive && item.passive.effects) {
            item.passive.effects.forEach(effect => {
                if (effect.type === 'defense') finalDefense += effect.value;
                if (effect.type === 'max_hp') finalMaxHp += effect.value;
            });
        }
        if (item.recast > 0) {
            battleItems.push({ data: item, nextActionTime: item.recast });
        }
    });

    const darkResonanceLevel = (elementCounts.dark >= 3) ? 1 : 0;

    return {
        finalStats: {
            max_hp: finalMaxHp,
            hp: Math.min(initialStats.hp, finalMaxHp),
            defense: finalDefense,
            block: 0,
            attack: 0,
            darkResonanceLevel: darkResonanceLevel
        },
        battleItems: battleItems,
        finalizedItems: initialItems
    };
}

    startBattle() {
        console.log("★★ 戦闘開始！ ★★");
    }
    // BattleScene.js の update をこれに置き換え
    // BattleScene.js の update をこれに置き換え
    update(time, delta) {
        if (this.gameState !== 'battle') return;

        const updateRecastMask = (charObject, progress) => {
            if (!charObject || !charObject.active || !charObject.getData('recastMask')) {
                return;
            }

            const maskGraphics = charObject.getData('recastMask');
            maskGraphics.clear();

            if (progress > 0.01) { // わずかな誤差を無視
                const w = charObject.width;
                const h = charObject.height;
                const fillHeight = h * progress;

                // 回転した矩形の4つの頂点座標を計算
                const corners = [
                    { x: -w / 2, y: h / 2 - fillHeight }, // 左下
                    { x: w / 2, y: h / 2 - fillHeight }, // 右下
                    { x: w / 2, y: h / 2 },              // 右上
                    { x: -w / 2, y: h / 2 }               // 左上
                ];

                // 各頂点をキャラクターの回転に合わせて回転させる
                const rotation = charObject.rotation;
                const sin = Math.sin(rotation);
                const cos = Math.cos(rotation);

                const rotatedCorners = corners.map(p => ({
                    x: p.x * cos - p.y * sin,
                    y: p.x * sin + p.y * cos
                }));

                // キャラクターのグローバル座標を取得
                const matrix = charObject.getWorldTransformMatrix();
                const gx = matrix.tx;
                const gy = matrix.ty;

                // グローバル座標に頂点を移動
                const finalPoints = rotatedCorners.map(p => ({
                    x: gx + p.x,
                    y: gy + p.y
                }));

                // 計算した頂点を使って多角形を描画
                maskGraphics.fillStyle(0xffffff);
                maskGraphics.fillPoints(finalPoints, true);
            }
        };

        // --- Player's items ---
        this.playerBattleItems.forEach(item => {
            item.nextActionTime -= delta / 1000;
            const progress = Math.min(1, 1 - (item.nextActionTime / item.data.recast));
            updateRecastMask(item.data.gameObject, progress);

            if (item.nextActionTime <= 0) {
                this.executeAction(item.data, 'player', 'enemy', item.data.gameObject);
                item.nextActionTime += item.data.recast;
                // アクション実行後、次のフレームで progress が 0 に近くなり、マスクがクリアされる
            }
        });

        if (this.gameState !== 'battle') return;

        // --- Enemy's items ---
        this.enemyBattleItems.forEach((item, index) => {
            item.nextActionTime -= delta / 1000;
            const progress = Math.min(1, 1 - (item.nextActionTime / item.data.recast));
            updateRecastMask(this.enemyItemImages[index], progress);

            if (item.nextActionTime <= 0) {
                this.executeAction(item.data, 'enemy', 'player', this.enemyItemImages[index]);
                item.nextActionTime += item.data.recast;
            }
        });
    }
    // BattleScene.js の executeAction メソッド (ブロック対応版)

    // BattleScene.js の executeAction をこれに置き換え
    // BattleScene.js の executeAction をこれに置き換え
    // BattleScene.js の executeAction をこの完成版に置き換えてください
    executeAction(itemData, attacker, defender, attackerObject) {
        // 1. 攻撃者のアニメーション（渡されていれば）
        if (attackerObject) {
            this.playAttackAnimation(attackerObject, attacker);
        }

        const action = itemData.action;
        if (!action) return;

        const defenderStats = this[`${defender}Stats`];
        const itemName = itemData.id || "アイテム";

        // 2. 攻撃アクションの場合
        if (action.type === 'attack') {
            const totalAttack = action.value;
                 const attackerStats = this[`${attacker}Stats`];
            // ★★★ ここからが追加箇所 ★★★
    // 【闇属性】背水効果の計算
    if (attacker === 'player' && itemData.tags.includes('dark') && attackerStats.darkResonanceLevel > 0) {
        const hpPercent = (attackerStats.hp / attackerStats.max_hp) * 100;
        let bonus = 0;
        if (hpPercent < 75) bonus += 2;
        if (hpPercent < 50) bonus += 3;
        if (hpPercent < 25) bonus += 5;
        
        if (bonus > 0) {
            totalAttack += bonus;
            console.log(`▼ 背水発動！ HP ${hpPercent.toFixed(0)}% のため攻撃力+${bonus}`);
        }
    }
    // ★★★ 追加ここまで ★★★

            let damage = Math.max(0, totalAttack - defenderStats.defense);
            let blockedDamage = 0;

            // ブロック処理
            if (defenderStats.block > 0 && damage > 0) {
                blockedDamage = Math.min(defenderStats.block, damage);
                defenderStats.block -= blockedDamage;
                damage -= blockedDamage;
                console.log(` > ${defender}が${blockedDamage}ダメージをブロック！`);

                // ★ ブロック成功エフェクトはここで1回だけ呼ぶ
                this.showBlockSuccessIcon(defender);
            }

            // ダメージ処理
            if (damage > 0) {
                // ★ ダメージポップアップはここで1回だけ呼ぶ
                this.playDamageEffects(defender, Math.floor(damage));

                const newHp = defenderStats.hp - damage;
                defenderStats.hp = newHp;
                this.stateManager.setF(`${defender}_hp`, newHp);
                console.log(` > ${attacker}の${itemName}が攻撃！...`);

                // ★★★ ここを修正 ★★★
                if (newHp <= 0) {
                    this.gameState = 'end'; // これ以上のアクションを防ぐ

                    // defender が 'enemy' の場合のみトドメ演出
                    if (defender === 'enemy') {
                        this.playFinishBlowEffects(this.enemyAvatar);
                    } else {
                        // プレイヤーが負けた場合は即座に終了
                        this.endBattle('lose');
                    }

                }
            }
            // ログ出力
            else if (blockedDamage > 0) {
                console.log(` > ${attacker}の${itemName}の攻撃は完全に防がれた！`);
            } else {
                console.log(` > ${attacker}の${itemName}の攻撃は防がれた！`);
            }
        }

        // 3. ブロック獲得アクションの場合
        else if (action.type === 'block') {
            const attackerStats = this[`${attacker}Stats`];
            attackerStats.block += action.value;
            console.log(` > ${attacker}の${itemName}が発動！ ブロックを${action.value}獲得...`);

            // ★ ブロック獲得エフェクト
            let targetAvatar = (attacker === 'player') ? this.playerAvatar : this.enemyAvatar;
            this.showGainBlockPopup(targetAvatar, action.value);
        }
        // ★★★ 4. 回復アクションの場合 (ここから追加) ★★★
        else if (action.type === 'heal') {
            const attackerStats = this[`${attacker}Stats`];

            // 最大HPを超えないように回復量を計算
            const healAmount = Math.min(action.value, attackerStats.max_hp - attackerStats.hp);

            if (healAmount > 0) {
                attackerStats.hp += healAmount;
                console.log(` > ${attacker}の${itemName}が発動！ HPを${healAmount.toFixed(1)}回復`);

                // stateManager の値を更新 (HPバーなどに反映させるため)
                this.stateManager.setF(`${attacker}_hp`, attackerStats.hp);

                // 回復エフェクトを表示
                let targetAvatar = (attacker === 'player') ? this.playerAvatar : this.enemyAvatar;
                this.showHealPopup(targetAvatar, Math.floor(healAmount));
            }
        }
    }
    // BattleScene.js の endBattle メソッドを、この最終版に置き換え

    /**
     * 戦闘終了処理 (勝利/敗北)
     * @param {string} result - 'win' または 'lose'
     */
    endBattle(result) {
        if (this.battleEnded) return;
        this.battleEnded = true;
        console.log(`バトル終了。結果: ${result}`);

        if (result === 'win') {
            // 勝利時の処理は playFinishBlowEffects が担当するので、ここでは何もしない
            return;
        }

        // --- 敗北時の処理 ---
        this.add.text(this.scale.width / 2, this.scale.height / 2 - 100, 'GAME OVER', {
            fontSize: '64px', fill: '#f00', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(999);

        // ★★★ ここからが2択ボタンの実装 ★★★

        // 1. 「このラウンドを再挑戦」ボタン
        const retryButton = this.add.text(this.scale.width / 2, this.scale.height / 2 + 20, 'このラウンドを再挑戦', {
            fontSize: '32px', fill: '#fff', backgroundColor: '#008800', padding: { x: 15, y: 8 }
        }).setOrigin(0.5).setInteractive().setDepth(999);

        retryButton.on('pointerdown', () => {
            const roundStartState = this.roundStartState;
            if (roundStartState) {
                // ★チェックポイントのデータを使ってsfとfを復元
                this.stateManager.setSF('player_backpack', roundStartState.backpack);
                this.stateManager.setSF('player_inventory', roundStartState.inventory);
                this.stateManager.setSF('coins', roundStartState.coins); // コインを復元
                this.stateManager.setF('player_hp', roundStartState.hp); // HPを復元

                console.log("ラウンド開始時の状態に復元してリトライします。");
                this.scene.start(this.scene.key);
            } else {
                // チェックポイントがない（異常事態）場合は、安全に全リセット
                console.error("チェックポイントが見つかりません。ゲームをリセットします。");
                this.handleGameOver();
            }
        });

        // 2. 「はじめからやり直す」ボタン
        const resetButton = this.add.text(this.scale.width / 2, this.scale.height / 2 + 100, 'はじめからやり直す', {
            fontSize: '32px', fill: '#fff', backgroundColor: '#880000', padding: { x: 15, y: 8 }
        }).setOrigin(0.5).setInteractive().setDepth(999);

        resetButton.on('pointerdown', () => {
            // 共通のゲームオーバー（全リセット）処理を呼び出す
            resetButton.disableInteractive().setText('リセット中...');
            this.handleGameOver();
        });
    }

    // BattleScene.js の createItem メソッド (ドラッグ追従・最終版)
    // BattleScene.js にこの新しいメソッドを追加してください
    /**
     * 現在のラウンドに応じて敵の盤面をセットアップする
     */
    // BattleScene.js の setupEnemy を、この最終確定版に置き換えてください
// BattleScene.js の setupEnemy を、この最終確定版に置き換えてください

setupEnemy(gridY) {
    const gameWidth = this.scale.width;
    const gridWidth = this.backpackGridSize * this.cellSize;
    const enemyGridX = gameWidth - 100 - gridWidth;
    const enemyGridY = gridY;

    // 以前の敵オブジェクトが残っていれば全て破棄する
    this.enemyItemImages.forEach(item => item.destroy());
    this.enemyItemImages = [];

    // EnemyGeneratorから現在のラウンドのレイアウトを取得
    const currentLayout = EnemyGenerator.getLayoutForRound(this.initialBattleParams.round);
    console.log(`Round ${this.initialBattleParams.round} enemy layout:`, currentLayout);

    for (const itemId in currentLayout) {
        const itemData = ITEM_DATA[itemId];
        if (!itemData) continue;
        const pos = currentLayout[itemId].pos;

        const containerWidth = itemData.shape[0].length * this.cellSize;
        
        // ★★★ この一行を修正した、これが正しいコードです ★★★
        const containerHeight = itemData.shape.length * this.cellSize;

        const itemContainer = this.add.container(
            enemyGridX + (pos[1] * this.cellSize) + (containerWidth / 2),
            enemyGridY + (pos[0] * this.cellSize) + (containerHeight / 2)
        ).setSize(containerWidth, containerHeight);
        
        const itemImage = this.add.image(0, 0, itemData.storage).setDisplaySize(containerWidth, containerHeight);
        const recastOverlay = this.add.image(0, 0, itemData.storage).setDisplaySize(containerWidth, containerHeight).setTint(0x00aaff, 0.7).setVisible(false);
        const maskGraphics = this.add.graphics().setVisible(false);
        recastOverlay.setMask(maskGraphics.createGeometryMask());
        
        itemContainer.add([itemImage, recastOverlay, maskGraphics]);
        itemContainer.setData({ itemId, recastOverlay, recastMask: maskGraphics });

        if (itemData.recast > 0) { recastOverlay.setVisible(true); }

        itemContainer.setDepth(3).setInteractive({ draggable: false });
        itemContainer.on('pointerup', (pointer, localX, localY, event) => {
            event.stopPropagation();
            const itemData = ITEM_DATA[itemId];
            if (!itemData) return;
            let tooltipText = `【${itemId}】\n\n`;
            if (itemData.recast > 0) tooltipText += `リキャスト: ${itemData.recast}秒\n`;
            if (itemData.action) tooltipText += `効果: ${itemData.action.type} ${itemData.action.value}\n`;
            if (itemData.passive && itemData.passive.effects) { itemData.passive.effects.forEach(e => { tooltipText += `パッシブ: ${e.type} +${e.value}\n`; }); }
            if (itemData.synergy) { tooltipText += `\nシナジー:\n  - ${itemData.synergy.direction}の[${itemData.synergy.targetTag || 'any'}]に\n    効果: ${itemData.synergy.effect.type} +${itemData.synergy.effect.value}\n`; }
            this.tooltip.show(itemContainer, tooltipText);
        });
        
        this.enemyItemImages.push(itemContainer);
    }
}
    // BattleScene.js の createItem メソッド (イベントリスナー完全版)

    // BattleScene.js にこの新しいメソッドを追加

/**
 * 属性共鳴が発動したキャラクターにオーラとパーティクルエフェクトを表示する
 * @param {Phaser.GameObjects.Container} targetObject - 対象のキャラクターオブジェクト
 * @param {number} color - エフェクトの色の16進数カラーコード
 */
playResonanceAura(targetObject, color) {
    if (!targetObject || !targetObject.active) return;

    const centerX = targetObject.x;
    const bottomY = targetObject.y + targetObject.displayHeight / 2;
    const effectDuration = 1500; // エフェクトの表示時間 (ミリ秒)

    // --- 1. オーラエフェクト (Graphics) ---
    const aura = this.add.graphics().setDepth(targetObject.depth - 1); // キャラクターのすぐ後ろ
    // Y座標が下に行くほど透明になるグラデーション
    aura.fillGradientStyle(color, color, color, color, 1, 1, 0, 0);
    aura.fillRect(
        centerX - targetObject.displayWidth / 2,
        bottomY - targetObject.displayHeight,
        targetObject.displayWidth,
        targetObject.displayHeight
    );
    // オーラをゆっくりフェードアウト
    this.tweens.add({
        targets: aura,
        alpha: 0,
        duration: effectDuration,
        ease: 'Cubic.easeOut',
        onComplete: () => { aura.destroy(); }
    });


    // --- 2. パーティクルエフェクト ---
    const particles = this.add.particles(0, 0, 'particle_white', {
        x: { min: centerX - targetObject.displayWidth/2, max: centerX + targetObject.displayWidth/2 },
        y: bottomY,
        lifespan: effectDuration,
        speedY: { min: -50, max: -150 }, // 上昇速度
        scale: { start: 0.5, end: 0 },
        gravityY: 100,
        blendMode: 'ADD', // 光が重なるような表現
        tint: color,      // パーティクルを属性色に染める
        quantity: 2       // 一度に出る量
    }).setDepth(targetObject.depth + 1); // キャラクターの少し手前

    // 一定時間後にパーティクルの放出を停止
    this.time.delayedCall(effectDuration - 200, () => {
        particles.stop();
    });
    // 全てのパーティクルが消えたら、エミッター自体を破棄
    this.time.delayedCall(effectDuration * 2, () => {
        particles.destroy();
    });
}
    // BattleScene.js にこのメソッドを貼り付けて、既存のものと置き換えてください
    createItem(itemId, x, y) {
        const itemData = ITEM_DATA[itemId];
        if (!itemData) return null;

        const containerWidth = itemData.shape[0].length * this.cellSize;
        const containerHeight = itemData.shape.length * this.cellSize;
        const itemContainer = this.add.container(x, y).setSize(containerWidth, containerHeight);

        // 1. ベースとなる画像
        const itemImage = this.add.image(0, 0, itemData.storage).setDisplaySize(containerWidth, containerHeight);

        // ★★★ ここからが追加/変更箇所 ★★★

        // 2. リキャスト進捗を示すオーバーレイ画像
        const recastOverlay = this.add.image(0, 0, itemData.storage)
            .setDisplaySize(containerWidth, containerHeight)
            .setTint(0x00aaff, 0.3) // 半透明の白でティント（好みで色や透明度を調整）
            .setVisible(false); // recastを持つアイテム以外は非表示

        // 3. マスクとして機能するGraphicsオブジェクト
        // 1. マスク用のGraphicsを「コンテナの子として」追加する
        // 1. マスク用のGraphicsを「シーンに直接」追加する
        const maskGraphics = this.add.graphics();
        maskGraphics.setVisible(false); // このオブジェクト自体は見えないようにする

        // 2. マスクを生成して適用
        recastOverlay.setMask(maskGraphics.createGeometryMask());

        // 3. コンテナに追加するのはオーバーレイまで
        const arrowContainer = this.add.container(0, 0).setVisible(false);
        const arrowStyle = { fontSize: '32px', color: '#ffdd00', stroke: '#000', strokeThickness: 4 };
        arrowContainer.add([
            this.add.text(0, 0, '▲', arrowStyle).setOrigin(0.5).setName('up'),
            this.add.text(0, 0, '▼', arrowStyle).setOrigin(0.5).setName('down'),
            this.add.text(0, 0, '◀', arrowStyle).setOrigin(0.5).setName('left'),
            this.add.text(0, 0, '▶', arrowStyle).setOrigin(0.5).setName('right')
        ]);
        itemContainer.add([itemImage, recastOverlay, arrowContainer, maskGraphics])
            .setDepth(12)
            .setInteractive();


        // recastOverlayとmaskGraphicsを後で使えるようにデータとして保持
        itemContainer.setData({
            itemId,
            originX: x,
            originY: y,
            gridPos: null,
            itemImage,
            arrowContainer,
            rotation: 0,
            recastOverlay: recastOverlay, // ★追加
            recastMask: maskGraphics      // ★追加
        });

        // アイテムがリキャストを持たないなら、オーバーレイは常に非表示
        if (!itemData.recast || itemData.recast <= 0) {
            recastOverlay.setVisible(false);
        } else {
            recastOverlay.setVisible(true);
        }

        this.input.setDraggable(itemContainer);

        // --- イベントリスナー ---
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
            isDragging = true;
            if (pressTimer) pressTimer.remove();
            this.tooltip.hide();
            itemContainer.setDepth(99);
            this.removeItemFromBackpack(itemContainer);
        });

        itemContainer.on('drag', (pointer, dragX, dragY) => {
            // ★★★ 修正箇所 ★★★
            // if (!isDragging) return; を削除し、アイテムが必ずポインターに追従するように修正
            if (pressTimer) pressTimer.remove();
            itemContainer.setPosition(dragX, dragY);

            // (ゴースト表示ロジックは変更なし)
            const gridCol = Math.floor((pointer.x - this.gridX) / this.cellSize);
            const gridRow = Math.floor((pointer.y - this.gridY) / this.cellSize);
            const shape = this.getRotatedShape(itemId, itemContainer.getData('rotation'));
            if (gridCol >= 0 && gridCol < this.backpackGridSize && gridRow >= 0 && gridRow < this.backpackGridSize) {
                this.ghostImage.setVisible(true);
                this.ghostImage.width = shape[0].length * this.cellSize;
                this.ghostImage.height = shape.length * this.cellSize;
                // ★★★ 修正箇所 ★★★
                this.ghostImage.setPosition(this.gridX + gridCol * this.cellSize, this.gridY + gridRow * this.cellSize).setOrigin(0);
                this.ghostImage.setFillStyle(this.canPlaceItem(itemContainer, gridCol, gridRow) ? 0x00ff00 : 0xff0000, 0.5);
            } else {
                this.ghostImage.setVisible(false);
            }
        });

        itemContainer.on('dragend', (pointer) => {
            itemContainer.setDepth(12);
            this.ghostImage.setVisible(false);
            const gridCol = Math.floor((pointer.x - this.gridX) / this.cellSize);
            const gridRow = Math.floor((pointer.y - this.gridY) / this.cellSize);
            if (this.canPlaceItem(itemContainer, gridCol, gridRow)) {
                const dropX = itemContainer.x;
                const dropY = itemContainer.y;
                this.placeItemInBackpack(itemContainer, gridCol, gridRow);
                const targetX = itemContainer.x;
                const targetY = itemContainer.y;
                itemContainer.setPosition(dropX, dropY);
                this.tweens.add({ targets: itemContainer, x: targetX, y: targetY, duration: 150, ease: 'Power1' });
            } else {
                this.tweens.add({ targets: itemContainer, x: itemContainer.getData('originX'), y: itemContainer.getData('originY'), duration: 200, ease: 'Power2' });
            }
        });

        // createItem の中の 'pointerup' イベントリスナーをこれに置き換え
        // createItem の中の 'pointerup' イベントリスナーをこれに置き換え
        itemContainer.on('pointerup', (pointer, localX, localY, event) => {
            if (pressTimer) pressTimer.remove();

            if (!isDragging && !itemContainer.getData('isLongPress')) {
                const baseItemData = ITEM_DATA[itemId];
                if (!baseItemData) return;

                const placedIndex = this.placedItemImages.indexOf(itemContainer);
                let finalItemData = null;
                if (placedIndex > -1 && this.finalizedPlayerItems && this.finalizedPlayerItems[placedIndex]) {
                    finalItemData = this.finalizedPlayerItems[placedIndex];
                }

                // --- ★★★ ツールチップ生成ロジック Start ★★★ ---

                // --- ★★★ ツールチップ生成ロジック Start (改) ★★★ ---
                const t = (key) => TOOLTIP_TRANSLATIONS[key] || key;
                let tooltipText = `【${itemId}】\n`;

                // 属性の表示
                const itemElements = baseItemData.tags.filter(tag => ELEMENT_RESONANCE_RULES[tag]);
                if (itemElements.length > 0) {
                    tooltipText += `属性: [${itemElements.map(el => t(el)).join(', ')}]\n`;
                }

                // ★追加: サイズの表示
                const sizeH = baseItemData.shape.length;
                const sizeW = baseItemData.shape[0].length;
                tooltipText += `サイズ: ${sizeH} x ${sizeW}\n\n`;


                // Recast
                if (baseItemData.recast && baseItemData.recast > 0) {
                    const recastValue = finalItemData ? finalItemData.recast : baseItemData.recast;
                    tooltipText += `リキャスト: ${recastValue.toFixed(1)}秒\n`;
                }

                // Action
                if (baseItemData.action) {
                    const baseValue = baseItemData.action.value;
                    const finalValue = (finalItemData && finalItemData.action) ? finalItemData.action.value : baseValue;
                    tooltipText += `効果: ${baseItemData.action.type} ${finalValue}\n`;
                    if (finalValue !== baseValue) {
                        tooltipText += `  (基本値: ${baseValue})\n`;
                    }
                }
                // Passive
                if (baseItemData.passive && baseItemData.passive.effects) {
                    baseItemData.passive.effects.forEach(e => { tooltipText += `パッシブ: ${e.type} +${e.value}\n`; });
                }

                // Synergy
                if (baseItemData.synergy) {
                    tooltipText += `\nシナジー:\n`;
                    const dir = t(baseItemData.synergy.direction);
                    const effect = baseItemData.synergy.effect;
                    const effectType = t(effect.type);
                    tooltipText += `  - ${dir}の味方に\n`;
                    tooltipText += `    効果: ${effectType} +${effect.value}\n`;
                }


                // --- ★★★ ツールチップ生成ロジック End ★★★ ---

                this.tooltip.show(itemContainer, tooltipText);
                event.stopPropagation();
            }

            isDown = false;
            isDragging = false;
            itemContainer.setData('isLongPress', false);
        });



        return itemContainer;
    }

    // BattleScene.js にこの新しいメソッドを追加してください
    _rotateMatrix(matrix) {
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

    // BattleScene.js の rotateItem をこれに置き換え
    rotateItem(itemContainer) {
        const originalRotation = itemContainer.getData('rotation');
        const newRotation = (originalRotation + 90) % 360;
        itemContainer.setData('rotation', newRotation);

        const gridPos = itemContainer.getData('gridPos');
        if (gridPos) {
            // 回転後に配置不能になる場合は回転をキャンセルしてインベントリに戻す
            if (!this.canPlaceItem(itemContainer, gridPos.col, gridPos.row)) {
                itemContainer.setData('rotation', originalRotation); // 角度を元に戻す
                this.removeItemFromBackpack(itemContainer);
                this.tweens.add({
                    targets: itemContainer,
                    x: itemContainer.getData('originX'),
                    y: itemContainer.getData('originY'),
                    angle: 0, // 見た目の回転も戻す
                    duration: 200,
                    ease: 'Power2',
                    onComplete: () => {
                        itemContainer.setData('rotation', 0); // データもリセット
                        this.updateArrowVisibility(itemContainer); // 最終状態を更新
                    }
                });
                return;
            }
        }

        // 見た目の角度を更新
        itemContainer.setAngle(newRotation);

        // ★★★ 修正箇所 ★★★
        // 矢印の表示更新を専用メソッドに一任する
        this.updateArrowVisibility(itemContainer);
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

        // 配置済みリストに追加（重複しないように）
        if (!this.placedItemImages.includes(itemContainer)) {
            this.placedItemImages.push(itemContainer);
        }

        this.updateArrowVisibility(itemContainer);

        // ★★★ 修正箇所 ★★★
        // アイテムが1つ減ったので、インベントリのレイアウトを更新する
        this.updateInventoryLayout();
    }

    // removeItemFromBackpack をこれに置き換え
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

        itemContainer.setData('gridPos', null);

        const index = this.placedItemImages.indexOf(itemContainer);
        if (index > -1) this.placedItemImages.splice(index, 1);

        // インベントリリストに追加（まだ重複の可能性がある）
        if (!this.inventoryItemImages.includes(itemContainer)) {
            this.inventoryItemImages.push(itemContainer);
        }

        this.updateArrowVisibility(itemContainer);

        // ★★★ 修正箇所 ★★★
        // インベントリ全体のレイアウトを更新する
        this.updateInventoryLayout();
    }

    // BattleScene.js にこのメソッドを貼り付けて、既存のものと置き換えてください
    getRotatedShape(itemId, rotation) {
        // JSONから取得したデータを直接変更しないようにディープコピーする
        let shape = JSON.parse(JSON.stringify(ITEM_DATA[itemId].shape));

        // rotation の値（0, 90, 180, 270）に応じて、90度回転を適用する回数を計算
        const rotations = Math.round(rotation / 90);

        for (let i = 0; i < rotations; i++) {
            shape = this._rotateMatrix(shape);
        }

        return shape;
    }

    // BattleScene.js の updateArrowVisibility をこれに置き換え
    updateArrowVisibility(itemContainer) {
        const itemId = itemContainer.getData('itemId');
        const itemData = ITEM_DATA[itemId];
        const arrowContainer = itemContainer.getData('arrowContainer');
        const gridPos = itemContainer.getData('gridPos');

        if (!arrowContainer) return;

        if (itemData.synergy && gridPos) {
            arrowContainer.setVisible(true);
            arrowContainer.each(arrow => arrow.setVisible(false));

            const direction = itemData.synergy.direction;
            const itemW = itemContainer.width;
            const itemH = itemContainer.height;
            const offset = 15;

            if (direction === 'adjacent') {
                arrowContainer.getByName('up').setVisible(true).setPosition(0, -itemH / 2 - offset);
                arrowContainer.getByName('down').setVisible(true).setPosition(0, itemH / 2 + offset);
                arrowContainer.getByName('left').setVisible(true).setPosition(-itemW / 2 - offset, 0);
                arrowContainer.getByName('right').setVisible(true).setPosition(itemW / 2 + offset, 0);

            } else {
                let basePos = { x: 0, y: 0 };
                let arrowToShow = null;

                switch (direction) {
                    case 'up':
                        basePos = { x: 0, y: -itemH / 2 - offset };
                        arrowToShow = arrowContainer.getByName('up');
                        break;
                    case 'down':
                        basePos = { x: 0, y: itemH / 2 + offset };
                        arrowToShow = arrowContainer.getByName('down');
                        break;
                    case 'left':
                        basePos = { x: -itemW / 2 - offset, y: 0 };
                        arrowToShow = arrowContainer.getByName('left');
                        break;
                    case 'right':
                        basePos = { x: itemW / 2 + offset, y: 0 };
                        arrowToShow = arrowContainer.getByName('right');
                        break;
                }

                if (arrowToShow) {
                    // ★★★ 修正箇所 ★★★
                    // 手動での座標回転ロジックを完全に削除。
                    // 親(itemContainer)の回転に任せる。
                    arrowToShow.setVisible(true).setPosition(basePos.x, basePos.y);
                }
            }
        } else {
            arrowContainer.setVisible(false);
        }
    }

    // playDamageEffects を、この構文修正済みのバージョンに置き換えてください

    /**
     * ダメージ発生時のすべての視覚エfectsを再生する (スプライトシート版)
     * @param {string} targetSide - 'player' または 'enemy'
     * @param {number} amount - ダメージ量
     */
    playDamageEffects(targetSide, amount) {
        if (amount <= 0) return;

        const damage = Math.floor(amount);
        const targetAvatar = (targetSide === 'player') ? this.playerAvatar : this.enemyAvatar;
        if (!targetAvatar) return;

        // --- 1. ダメージ数字のポップアップ ---
        let fontSize = 24;
        let fill = '#ffffff';
        let stroke = '#000000';
        let strokeThickness = 4;
        if (damage >= 50) {
            fontSize = 48;
            fill = '#ff0000';
            stroke = '#ffffff';
            strokeThickness = 6;
        } else if (damage >= 20) {
            fontSize = 36;
            fill = '#ffdd00';
        }
        const damageText = this.add.text(0, 0, damage.toString(), {
            fontSize: `${fontSize}px`, fill, stroke, strokeThickness, fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(1002);

        const initialX = targetAvatar.x;
        const initialY = targetAvatar.y - (targetAvatar.displayHeight / 2) - 10;
        damageText.setPosition(initialX, initialY);
        this.tweens.add({
            targets: damageText,
            x: initialX + Phaser.Math.Between(-40, 40),
            y: initialY - 100,
            alpha: 0,
            duration: 1500,
            ease: 'Power1',
            onComplete: () => damageText.destroy()
        });

        // --- 2. 画面シェイク ---
        const shakeIntensity = Math.min(0.015, 0.002 + damage * 0.0002);
        const shakeDuration = Math.min(200, 100 + damage * 2);
        this.cameras.main.shake(shakeDuration, shakeIntensity);

        // --- 3. 赤点滅ティント ---
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
            repeat: 3,
            callbackScope: this
        });
        this.time.delayedCall(80 * 4 + 10, () => {
            if (targetAvatar && targetAvatar.active) targetAvatar.clearTint();
            if (blinkTimer) blinkTimer.remove();
        });

        // --- 4. 斬撃ラインエフェクト (復活) ---
        const slashGraphics = this.add.graphics().setDepth(1001); // 煙より手前
        slashGraphics.lineStyle(8, 0xffffff, 1.0); // 太い白線

        const lineLength = targetAvatar.displayWidth * 1.2;
        const centerX = targetAvatar.x;
        const centerY = targetAvatar.y;

        const slashContainer = this.add.container(centerX, centerY).setDepth(1001);
        slashContainer.add(slashGraphics);

        // 2本の線を交差させて描画
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
            targets: slashContainer,
            scale: 1.0,
            alpha: 0,
            duration: 250,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                slashContainer.destroy();
            }
        });

        // --- 5. スプライトシートによるインパクトアニメーション (サイズ調整付き) ---
        const effectSprite = this.add.sprite(centerX, centerY, 'effect_impact').setDepth(1000); // 斬撃より奥

        // アバターの表示幅を基準に、エフェクトのスケールを動的に調整
        // (例: エフェクトの幅がアバターの幅の1.5倍になるように)
        const desiredWidth = targetAvatar.displayWidth * 1.5;
        const scale = desiredWidth / effectSprite.width;
        effectSprite.setScale(scale);

        effectSprite.play('impact_anim');
        effectSprite.on('animationcomplete', () => {
            effectSprite.destroy();
        });
    }
    // BattleScene.js にこの新しいメソッドを追加してください
    /**
     * インベントリ内のアイテムのレイアウトを更新し、再配置する
     */
    updateInventoryLayout() {
        const gameWidth = this.scale.width;
        const inventoryAreaY = 520;
        const inventoryAreaHeight = 500; // createから値を参照できないため、ここで仮定義

        const inventoryContentWidth = gameWidth - 200;
        const itemCount = this.inventoryItemImages.length;
        if (itemCount === 0) return;

        const itemSpacing = inventoryContentWidth / itemCount;
        const itemStartX = 100 + (itemSpacing / 2);

        this.inventoryItemImages.forEach((itemContainer, index) => {
            const targetX = itemStartX + (index * itemSpacing);
            const targetY = inventoryAreaY + 140; // createから値を参照できないため、ここで仮定義

            // 新しい「帰るべき場所」として origin データを更新
            itemContainer.setData({ originX: targetX, originY: targetY });

            // Tweenでスムーズに移動させる
            this.tweens.add({
                targets: itemContainer,
                x: targetX,
                y: targetY,
                duration: 200,
                ease: 'Power2'
            });
        });
    }

    // BattleScene.js にこの新しいメソッドを追加してください
    playAttackAnimation(sourceObject, attackerType) {
        if (!sourceObject) return;

        const moveDistance = 20; // 前に突き出す距離
        let moveX = 0;
        let moveY = 0;

        // プレイヤーは右に、敵は左に突き出す
        if (attackerType === 'player') {
            moveX = moveDistance;
        } else { // 'enemy'
            moveX = -moveDistance;
        }

        // YOYO効果のあるTweenで、前に出てすぐ戻る動きを表現
        this.tweens.add({
            targets: sourceObject,
            x: sourceObject.x + moveX,
            y: sourceObject.y + moveY,
            duration: 100, // 突き出す速さ
            ease: 'Power1',
            yoyo: true, // trueにすると元の位置に自動で戻る
            onStart: () => {
                sourceObject.setDepth(100); // アニメーション中だけ最前面に
            },
            onComplete: () => {
                sourceObject.setDepth(12); // 終わったら深度を戻す (敵は3)
                if (attackerType === 'enemy') {
                    sourceObject.setDepth(3);
                }
            }
        });
    }

    // BattleScene.js にこの2つのメソッドを追加

    /**
     * ブロック獲得時に数値をポップアップさせるメソッド
     * @param {Phaser.GameObjects.Container} targetObject - 対象のキャラクターオブジェクト
     * @param {number} amount - 獲得したブロック量
     */
    showGainBlockPopup(targetObject, amount) {
        if (!targetObject || amount <= 0) return;

        // 緑色のテキストで獲得量を表示
        const blockText = this.add.text(0, 0, `+${amount} Block`, {
            fontSize: '28px',
            fill: '#4caf50', // 緑色
            stroke: '#ffffff',
            strokeThickness: 5,
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // キャラクターの頭上に表示
        const x = targetObject.x;
        const y = targetObject.y - (targetObject.height / 2);
        blockText.setPosition(x, y).setDepth(999);

        // 少し上に移動して消えるTween
        this.tweens.add({
            targets: blockText,
            y: y - 50,
            alpha: 0,
            duration: 1200,
            ease: 'Power1',
            onComplete: () => blockText.destroy()
        });
    }

    /**
     * ダメージをブロックした際に盾アイコンを表示するメソッド
     * @param {Phaser.GameObjects.Container} targetObject - 対象のキャラクターオブジェクト
     */
    showBlockSuccessIcon(targetSide) {
        let targetObject;
        if (targetSide === 'player') {
            targetObject = this.playerAvatar;
        } else {
            targetObject = this.enemyAvatar;
        }
        if (!targetObject) return;


        // ★★★ 注意：'shield_icon' という画像キーを事前にロードしておく必要があります ★★★
        // 仮にテキストで代用することも可能
        const icon = this.add.text(0, 0, '🛡️', { fontSize: '48px' }).setOrigin(0.5);
        // const icon = this.add.image(0, 0, 'shield_icon').setScale(0.5);

        // キャラクターの中央に表示
        const x = targetObject.x;
        const y = targetObject.y;
        icon.setPosition(x, y).setDepth(1000);

        // 少しだけ表示して、ブルっと震えて消える
        icon.setAlpha(0);
        this.tweens.chain({
            targets: icon,
            tweens: [
                { alpha: 1, duration: 100 }, // パッと表示
                { scale: 1.2, duration: 150, ease: 'Sine.easeInOut', yoyo: true }, // ブルっと震える
                { alpha: 0, duration: 200, delay: 300 } // 少し待ってから消える
            ],
            onComplete: () => icon.destroy()
        });
    }

    // BattleScene.js にこの新しいメソッドを追加してください

    /**
     * 回復時に緑色の数値をポップアップさせるメソッド
     * @param {Phaser.GameObjects.Container} targetObject - 対象のアバターオブジェクト
     * @param {number} amount - 回復量
     */
    showHealPopup(targetObject, amount) {
        if (!targetObject || amount <= 0) return;

        // ポジティブな印象を与える緑色のテキスト
        const healText = this.add.text(0, 0, `+${amount}`, {
            fontSize: '32px',
            fill: '#abffab', // 明るい緑
            stroke: '#1b5e20', // 暗い緑の縁取り
            strokeThickness: 5,
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // アバターの頭上に表示
        const x = targetObject.x;
        const y = targetObject.y - (targetObject.displayHeight / 2);
        healText.setPosition(x, y).setDepth(999);

        // 少し上に移動して消えるTween
        this.tweens.add({
            targets: healText,
            y: y - 60,
            alpha: 0,
            duration: 1500,
            ease: 'Power1',
            onComplete: () => healText.destroy()
        });
    }
    // BattleScene.js にこの2つのメソッドを追加

    /**
     * ショップUIの骨格を作成する
     */
    setupShop() {
        const gameWidth = this.scale.width;
        const inventoryAreaY = 520;
        const inventoryAreaHeight = 500; // 仮

        // ショップUI全体をまとめるコンテナ（最初は非表示）
        this.shopContainer = this.add.container(0, 0).setVisible(false);
        this.prepareContainer.add(this.shopContainer); // prepareContainerの子にする

        // リロールボタン
        const rerollButton = this.add.text(gameWidth / 2 + 200, inventoryAreaY + 30, 'リロール (1 coin)', { /* ... style ... */ })
            .setOrigin(0.5).setInteractive().setDepth(12);
        rerollButton.on('pointerdown', () => {
            const rerollCost = 1;
            const currentCoins = this.stateManager.sf.coins || 0;
            if (currentCoins >= rerollCost) {
                this.stateManager.setSF('coins', currentCoins - rerollCost);
                this.refreshShop(); // 商品を再抽選
            } else {
                console.log("コインが足りません！"); // 将来的にはポップアップ表示
            }
        });
        this.shopContainer.add(rerollButton);
    }

    /**
     * ショップの商品を抽選し、表示を更新する (最終確定版)
     */
    refreshShop() {
        // 既存の商品スロットがあれば全て破棄してクリア
        this.shopItemSlots.forEach(slot => slot.destroy());
        this.shopItemSlots = [];

        // --- 1. レイアウトとラウンド数の準備 ---
        const gameWidth = this.scale.width;
        const inventoryAreaY = 480; // UI領域の開始Y座標
        const inventoryAreaHeight = this.scale.height - inventoryAreaY; // UI領域の高さ
        const currentRound = this.initialBattleParams.round || 1;

        // --- 2. ラウンドに応じた商品数を決定 ---
        let slotCount = 3;
        if (currentRound >= 5) slotCount = 4;
        if (currentRound >= 8) slotCount = 5;

        // --- 3. ラウンドに応じた抽選プールを作成 ---
        const fullPool = Object.keys(ITEM_DATA);
        const shopPool = fullPool.filter(id => {
            const item = ITEM_DATA[id];
            if (!item.cost || !item.rarity) return false; // costとrarityがないアイテムは除外
            if (currentRound < 3 && item.rarity > 1) return false;
            if (currentRound < 6 && item.rarity > 2) return false;
            return true;
        });

        // --- 4. 商品をランダムに抽選 ---
        const selectedItems = [];
        const rewardCount = Math.min(slotCount, shopPool.length); // プールが枯渇しないように
        for (let i = 0; i < rewardCount; i++) {
            const randomIndex = Phaser.Math.Between(0, shopPool.length - 1);
            selectedItems.push(shopPool.splice(randomIndex, 1)[0]);
        }

        // --- 5. 商品スロットをUIに生成 ---
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

            // --- UI要素の生成 ---
            const itemImage = this.add.image(0, -50, itemData.storage);

            const imageAreaWidth = 100;
            const imageAreaHeight = 80;
            if (itemImage.width > imageAreaWidth || itemImage.height > imageAreaHeight) {
                const scale = Math.min(imageAreaWidth / itemImage.width, imageAreaHeight / itemImage.height);
                itemImage.setScale(scale);
            }

            const nameText = this.add.text(0, 30, itemId, { fontSize: '20px', fill: '#fff', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5);
            const costText = this.add.text(0, 55, `${itemData.cost} coins`, { fontSize: '18px', fill: '#ffd700', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5);
            const buyButtonBg = this.add.rectangle(0, 90, 100, 40, 0x3399ff).setStrokeStyle(2, 0xffffff);
            const buyButtonText = this.add.text(0, 90, '購入', { fontSize: '22px', fill: '#fff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);

            slotContainer.add([itemImage, nameText, costText, buyButtonBg, buyButtonText]);
            const currentCoins = this.stateManager.sf.coins || 0;
            if (currentCoins < itemData.cost) {
                buyButtonText.setText('コイン不足');
                buyButtonBg.setFillStyle(0x888888);
                slotContainer.setData('canBuy', false);
            } else {
                slotContainer.setData('canBuy', true);
            }


            // --- 入力処理をコンテナに集約 ---
            slotContainer.on('pointerdown', (pointer, localX, localY, event) => {
                event.stopPropagation();
                this.tooltip.hide();

                // 購入ボタンの領域（Y座標が70より下）がクリックされたか判定
                if (localY > 70) {
                    const currentCoins = this.stateManager.sf.coins || 0;
                    if (currentCoins >= itemData.cost) {
                        this.stateManager.setSF('coins', currentCoins - itemData.cost);
                        const currentInventory = this.stateManager.sf.player_inventory;
                        currentInventory.push(itemId);
                        this.stateManager.setSF('player_inventory', currentInventory);
                        // ★★★ 3. 【重要】画面上のインベントリにもアイテムを追加 ★★★
                        // createItemで新しいGameObjectを作成 (画面外の適当な位置でOK)
                        const newItemContainer = this.createItem(itemId, -100, -100);
                        if (newItemContainer) {
                            this.inventoryItemImages.push(newItemContainer);
                            // インベントリのレイアウトを更新して、新しいアイテムを正しい位置に移動させる
                            this.updateInventoryLayout();
                        }
                        buyButtonText.setText('購入済み');
                        buyButtonBg.setFillStyle(0x555555);
                        slotContainer.removeInteractive(); // 二重購入防止
                    } else {
                        console.log("コインが足りません！");
                        this.tweens.add({ targets: buyButtonBg, scaleX: 1.1, scaleY: 1.1, duration: 80, yoyo: true });
                    }
                } else {
                    // 画像領域がクリックされたらツールチップを表示
                    const t = (key) => TOOLTIP_TRANSLATIONS[key] || key;
                    let tooltipText = `【${itemId}】\n`;
                    // 属性の表示
                    const itemElements = itemData.tags.filter(tag => ELEMENT_RESONANCE_RULES[tag]);
                    if (itemElements.length > 0) {
                        tooltipText += `属性: [${itemElements.map(el => t(el)).join(', ')}]\n`;
                    }
                    const sizeH = itemData.shape.length;
                    const sizeW = itemData.shape[0].length;

                    tooltipText += `サイズ: ${sizeH} x ${sizeW}\n\n`;
                    if (itemData.recast && itemData.recast > 0) { tooltipText += `リキャスト: ${itemData.recast.toFixed(1)}秒\n`; }
                    if (itemData.action) { tooltipText += `効果: ${itemData.action.type} ${itemData.action.value}\n`; }
                    if (itemData.synergy) { tooltipText += `\nシナジー:\n  - ${t(itemData.synergy.direction)}の味方に\n    効果: ${t(itemData.synergy.effect.type)} +${itemData.synergy.effect.value}\n`; }

                    this.tooltip.show(slotContainer, tooltipText);
                    const matrix = slotContainer.getWorldTransformMatrix();
                    const worldX = matrix.tx;
                    const worldY = matrix.ty;
                    this.tooltip.showAt(worldX, worldY - slotContainer.height / 2 - 10, tooltipText);
                }
            });
        });
    }

    /*  // BattleScene.js にこの新しいメソッドを追加してください/**
   * トドメの一撃の演出を再生する (最終確定版)
   * @param {Phaser.GameObjects.Container} targetAvatar - 対象のアバターオブジェクト
   */
    playFinishBlowEffects(targetAvatar) {
        if (!targetAvatar) return;

        // 1. スローモーション開始
        this.time.timeScale = 0.2;

        // 2. 「中央が太く、両端が細い」斬撃エフェクト (Graphics)
        const finishSlash = this.add.graphics().setDepth(2001);
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        const lineLength = this.scale.width;
        const centerWidth = 30; // 中央の太さ

        // 塗りつぶしの色と、輪郭線のスタイルを設定
        finishSlash.fillStyle(0xffffff, 1.0);   // 塗りは純白
        finishSlash.lineStyle(2, 0xffff00, 1.0); // 輪郭は黄色

        // ひし形（中央が太く、両端が細い多角形）の4つの頂点を定義
        const points = [
            { x: -lineLength / 2, y: 0 },              // 左端
            { x: 0, y: -centerWidth / 2 }, // 中央上
            { x: lineLength / 2, y: 0 },              // 右端
            { x: 0, y: centerWidth / 2 }  // 中央下
        ];

        // 多角形を描画
        finishSlash.beginPath();
        finishSlash.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            finishSlash.lineTo(points[i].x, points[i].y);
        }
        finishSlash.closePath();
        finishSlash.fillPath();
        finishSlash.strokePath();

        const slashContainer = this.add.container(centerX, centerY).setAngle(-20);
        slashContainer.add(finishSlash);

        // 斬撃アニメーション
        this.tweens.add({
            targets: slashContainer,
            scale: { from: 0.3, to: 1.5 },
            alpha: { from: 1, to: 0 },
            duration: 400, // 実時間
            ease: 'Cubic.easeOut',
            onComplete: () => {
                slashContainer.destroy();
            }
        });


        // 3. スプライトシートアニメーション
        const effectSprite = this.add.sprite(targetAvatar.x, targetAvatar.y, 'effect_finish').setDepth(2000);
        const desiredWidth = targetAvatar.displayWidth * 2.5;
        effectSprite.setScale(desiredWidth / effectSprite.width);
        effectSprite.play('finish_anim');
        effectSprite.on('animationcomplete', () => {
            effectSprite.destroy();
        });

        // 4. スローモーション解除とバトル終了処理
        this.time.delayedCall(1500, () => {
            this.time.timeScale = 1.0;
            const currentRound = this.stateManager.sf.round || 1;
            const FINAL_ROUND = 10; // ★最終ラウンドを定義

            // ★★★ ここからが修正箇所 ★★★
            if (currentRound >= FINAL_ROUND) {
                // --- ゲームクリア処理 ---
                console.log("★★★★ GAME CLEAR! ★★★★");
                this.add.text(this.scale.width / 2, this.scale.height / 2, 'GAME CLEAR!', { fontSize: '64px', fill: '#ffd700' }).setOrigin(0.5);

                // クリア時もデータをリセットして「はじめから」に戻す
                this.handleGameOver(); // 共通のゲームオーバー（リセット）処理を流用

            } else {

                const finalBackpackData = {};
                this.placedItemImages.forEach((item, index) => {
                    const gridPos = item.getData('gridPos');
                    if (gridPos) {
                        finalBackpackData[`uid_${index}`] = {
                            itemId: item.getData('itemId'), row: gridPos.row, col: gridPos.col, rotation: item.getData('rotation')
                        };
                    }
                });
                const finalInventoryData = this.inventoryItemImages.map(item => item.getData('itemId'));
                this.stateManager.setSF('player_backpack', finalBackpackData);
                this.stateManager.setSF('player_inventory', finalInventoryData);
                // ★★★ ここからが追加箇所 ★★★
                // 3. コイン獲得処理
                const currentCoins = this.stateManager.sf.coins || 0;
                // const currentRound = this.stateManager.sf.round || 1;
                const rewardCoins = 10 + (currentRound * 2); // ラウンド数に応じた報酬
                this.stateManager.setSF('coins', currentCoins + rewardCoins);

                this.stateManager.setSF('round', currentRound + 1);
                this.stateManager.setF('player_hp', this.playerStats.hp);

                this.scene.get('SystemScene').events.emit('request-scene-transition', {
                    to: 'RewardScene',
                    from: this.scene.key
                });
            }
        }, [], this);
    }
    // BattleScene.js にこの新しいメソッドを追加してください

    /**
     * ゲームオーバー処理を一元管理する
     */
    handleGameOver() {
        console.log("ゲームオーバー処理を開始します。");

        // 1. 全てのデータをリセット
        this.stateManager.setSF('player_backpack', {});
        this.stateManager.setSF('player_inventory', ['sword', 'shield', 'potion']);
        this.stateManager.setSF('round', 1);
        this.stateManager.setSF('coins', 0); // ★コインを0にリセットし、HUD更新をトリガー

        // f変数もクリア
        this.stateManager.f = {};
        this.stateManager.setF('player_hp', 100);
        this.stateManager.setF('player_max_hp', 100);

        // 2. localStorageの物理削除は不要（setSFが上書き保存するため）

        // 3. タイトル画面に戻るのが理想だが、今はリスタート
        // 少しディレイを入れて、プレイヤーが何が起きたか認識する時間を与える
        this.time.delayedCall(2000, () => {
            this.scene.start('BattleScene');
        }, [], this);
    }
    shutdown() {
        console.log("BattleScene: shutdown されました。");
    }
}
