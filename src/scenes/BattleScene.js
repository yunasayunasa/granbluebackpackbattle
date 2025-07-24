import { ITEM_DATA } from '../core/ItemData.js';

export default class BattleScene extends Phaser.Scene {
    constructor() {
        super('BattleScene');
        // --- プロパティの初期化 ---
        this.receivedParams = null;
        this.stateManager = null;
        this.soundManager = null;
        
        // レイアウト関連
        this.backpackGridSize = 6;
        this.cellSize = 60;
        this.gridX = 0;
        this.gridY = 0;
        
        // 状態管理
        this.gameState = 'prepare';
        this.backpack = null;
        this.inventoryItemImages = []; // インベントリにあるアイテム
        this.placedItemImages = [];  // グリッドに配置されたアイテム
        
        // UIコンテナ
        this.prepareContainer = null;
        this.battleContainer = null;
        this.startBattleButton = null;

        // バトルロジック用 (今はまだ使わない)
        this.playerStats = { attack: 0, defense: 0, hp: 0 }; 
        this.enemyStats = { attack: 0, defense: 0, hp: 0 };
    }

    init(data) {
        this.receivedParams = data.params || {};
        const initialMaxHp = this.receivedParams.player_max_hp || 100;

        this.initialBattleParams = {
            playerMaxHp: initialMaxHp, 
            playerHp: initialMaxHp, // 常に全快でスタート
            round: this.receivedParams.round || 1,
        };
        
        // シーン再起動時にプロパティをリセット
        this.inventoryItemImages = [];
        this.placedItemImages = [];
    }

    async create() {
        console.log("BattleScene: create 開始");
        this.cameras.main.setBackgroundColor('#8a2be2');

        // --- 1. 準備：マネージャーと変数の定義 ---
        this.gameState = 'prepare';
        this.stateManager = this.sys.registry.get('stateManager');
        this.soundManager = this.sys.registry.get('soundManager');
        
        const gameWidth = this.scale.width;
        const gameHeight = this.scale.height;
        const gridWidth = this.backpackGridSize * this.cellSize;
        const gridHeight = this.backpackGridSize * this.cellSize;
        
        this.gridX = 100;
        this.gridY = gameHeight / 2 - gridHeight / 2 - 50;
        this.backpack = Array(this.backpackGridSize).fill(null).map(() => Array(this.backpackGridSize).fill(0));

        // コンテナ生成
        this.prepareContainer = this.add.container(0, 0);
        this.battleContainer = this.add.container(0, 0).setVisible(false);

        // --- 2. 状態の初期化：BGMとHP ---
        this.soundManager.playBgm('ronpa_bgm');
        this.stateManager.setF('player_max_hp', this.initialBattleParams.playerMaxHp); 
        this.stateManager.setF('player_hp', this.initialBattleParams.playerHp);
        this.stateManager.setF('enemy_max_hp', 100); 
        this.stateManager.setF('enemy_hp', 100);

        // --- 3. 画面オブジェクトの描画 ---

        // 3a. プレイヤーグリッド (常に表示)
        this.add.rectangle(this.gridX + gridWidth / 2, this.gridY + gridHeight / 2, gridWidth, gridHeight, 0x333333, 0.9).setDepth(1);
        for (let i = 0; i <= this.backpackGridSize; i++) {
            this.add.line(0, 0, this.gridX, this.gridY + i * this.cellSize, this.gridX + gridWidth, this.gridY + i * this.cellSize, 0x666666, 0.5).setOrigin(0).setDepth(2);
            this.add.line(0, 0, this.gridX + i * this.cellSize, this.gridY, this.gridX + i * this.cellSize, this.gridY + gridHeight, 0x666666, 0.5).setOrigin(0).setDepth(2);
        }

        // 3b. 敵グリッド (戦闘中のみ)
        const enemyGridX = gameWidth - 100 - gridWidth;
        const enemyGridY = this.gridY;
        const enemyGridBg = this.add.rectangle(enemyGridX + gridWidth / 2, enemyGridY + gridHeight / 2, gridWidth, gridHeight, 0x500000, 0.9).setDepth(1);
        this.battleContainer.add(enemyGridBg);
        this.battleContainer.add(enemyGridBg);
        for (let i = 0; i <= this.backpackGridSize; i++) {
            this.battleContainer.add(this.add.line(0, 0, enemyGridX, enemyGridY + i * this.cellSize, enemyGridX + gridWidth, enemyGridY + i * this.cellSize, 0x888888, 0.5).setOrigin(0).setDepth(2));
            this.battleContainer.add(this.add.line(0, 0, enemyGridX + i * this.cellSize, enemyGridY, enemyGridX + i * this.cellSize, enemyGridY + gridHeight, 0x888888, 0.5).setOrigin(0).setDepth(2));
        }
        
        const enemyLayouts = { 1: { 'sword': { pos: [2, 2], angle: 0 } } };
        const currentRound = this.receivedParams.round || 1;
        const currentLayout = enemyLayouts[currentRound] || {};
        for (const itemId in currentLayout) {
            const itemData = ITEM_DATA[itemId];
            if (!itemData) continue;
            const pos = currentLayout[itemId].pos;
            const itemImage = this.add.image(
                enemyGridX + (pos[1] * this.cellSize) + (itemData.shape[0].length * this.cellSize / 2),
                enemyGridY + (pos[0] * this.cellSize) + (itemData.shape.length * this.cellSize / 2),
                itemData.storage
            ).setDepth(3);
            itemImage.setDisplaySize(itemData.shape[0].length * this.cellSize, itemData.shape.length * this.cellSize);
            this.battleContainer.add(itemImage);
        }
        
          // 3c. インベントリ (準備中のみ)
        const inventoryAreaY = 520;
        const inventoryAreaHeight = gameHeight - inventoryAreaY;
        const invBg = this.add.rectangle(gameWidth / 2, inventoryAreaY + inventoryAreaHeight / 2, gameWidth, inventoryAreaHeight, 0x000000, 0.8).setDepth(10);
        const invText = this.add.text(gameWidth / 2, inventoryAreaY + 30, 'インベントリ', { fontSize: '24px', fill: '#fff' }).setOrigin(0.5).setDepth(11);
        this.prepareContainer.add([invBg, invText]);

        // 3d. ドラッグ可能なアイテム (準備中のみ)
        const initialInventory = ['sword', 'shield', 'potion'];
        const itemStartX = 200;
        const itemSpacing = 150;
        initialInventory.forEach((itemId, index) => {
            const itemImage = this.createItem(itemId, itemStartX + (index * itemSpacing), inventoryAreaY + inventoryAreaHeight / 2 + 20);
            if (itemImage) {
                this.inventoryItemImages.push(itemImage);
            }
        });
        
        // 3e. 戦闘開始ボタン (準備中のみ)
        this.startBattleButton = this.add.text(gameWidth - 150, gameHeight - 50, '戦闘開始', { fontSize: '28px', backgroundColor: '#080', padding: {x:10, y:5} }).setOrigin(0.5).setInteractive().setDepth(11);
        this.prepareContainer.add(this.startBattleButton);

        // --- 4. イベントリスナーの設定 ---
        this.startBattleButton.on('pointerdown', () => {
            if (this.gameState !== 'prepare') return;
            this.gameState = 'battle';
            
            const allPlayerItems = [...this.inventoryItemImages, ...this.placedItemImages];
            allPlayerItems.forEach(item => { if(item && item.input) this.input.setDraggable(item, false); });
            
            this.tweens.add({
                targets: [this.prepareContainer, ...this.inventoryItemImages],
                alpha: 0,
                duration: 300,
                onComplete: () => {
                    this.prepareContainer.setVisible(false);
                    this.inventoryItemImages.forEach(img => img.setVisible(false));
                }
            });
            
            this.battleContainer.setVisible(true).setAlpha(0);
            this.tweens.add({
                targets: this.battleContainer,
                alpha: 1,
                duration: 300,
                delay: 200
            });
        });

        // --- 5. 準備完了を通知 ---
        this.events.emit('scene-ready');
        console.log("BattleScene: create 完了");
    }

    // --- ヘルパーメソッド群 ---

    createItem(itemId, x, y) {
        const itemData = ITEM_DATA[itemId];
        if (!itemData) return null;
        
        const itemImage = this.add.image(x, y, itemData.storage)
            .setInteractive().setDepth(12)
            .setData({ itemId: itemId, originX: x, originY: y, gridPos: null });

        itemImage.setDisplaySize(itemData.shape[0].length * this.cellSize, itemData.shape.length * this.cellSize);
        this.input.setDraggable(itemImage);

        itemImage.on('dragstart', () => {
            itemImage.setDepth(99);
            this.removeItemFromBackpack(itemImage);
        });
        itemImage.on('drag', (pointer, dragX, dragY) => {
            itemImage.setPosition(dragX, dragY);
        });
        itemImage.on('dragend', (pointer) => {
            itemImage.setDepth(12);
            const gridCol = Math.floor((pointer.x - this.gridX) / this.cellSize);
            const gridRow = Math.floor((pointer.y - this.gridY) / this.cellSize);
            if (this.canPlaceItem(itemImage, gridCol, gridRow)) {
                this.placeItemInBackpack(itemImage, gridCol, gridRow);
            } else {
                itemImage.x = itemImage.getData('originX');
                itemImage.y = itemImage.getData('originY');
            }
        });
        return itemImage; 
    }

    removeItemFromBackpack(itemImage) {
        const gridPos = itemImage.getData('gridPos');
        if (!gridPos) return;
        const itemId = itemImage.getData('itemId');
        const itemData = ITEM_DATA[itemId];
        for (let r = 0; r < itemData.shape.length; r++) {
            for (let c = 0; c < itemData.shape[r].length; c++) {
                if (itemData.shape[r][c] === 1) {
                    this.backpack[gridPos.row + r][gridPos.col + c] = 0;
                }
            }
        }
        itemImage.setData('gridPos', null);
        
        const index = this.placedItemImages.indexOf(itemImage);
        if (index > -1) this.placedItemImages.splice(index, 1);
        this.inventoryItemImages.push(itemImage);
    }

    canPlaceItem(itemImage, startCol, startRow) {
        const itemData = ITEM_DATA[itemImage.getData('itemId')];
        for (let r = 0; r < itemData.shape.length; r++) {
            for (let c = 0; c < itemData.shape[r].length; c++) {
                if (itemData.shape[r][c] === 1) {
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

    placeItemInBackpack(itemImage, startCol, startRow) {
        const itemId = itemImage.getData('itemId');
        const itemData = ITEM_DATA[itemId];
        itemImage.x = this.gridX + startCol * this.cellSize + (itemData.shape[0].length * this.cellSize / 2);
        itemImage.y = this.gridY + startRow * this.cellSize + (itemData.shape.length * this.cellSize / 2);
        itemImage.setData('gridPos', { row: startRow, col: startCol });
        for (let r = 0; r < itemData.shape.length; r++) {
            for (let c = 0; c < itemData.shape[r].length; c++) {
                if (itemData.shape[r][c] === 1) {
                    this.backpack[startRow + r][startCol + c] = itemId;
                }
            }
        }

        const index = this.inventoryItemImages.indexOf(itemImage);
        if (index > -1) this.inventoryItemImages.splice(index, 1);
        this.placedItemImages.push(itemImage);
    }
    
    // shutdown, endBattle, etc. はまだ実装しないので、空かコメントアウトでOK
    shutdown() {
        console.log("BattleScene: shutdown されました。");
    }
}