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
            this.playerBattleItems = []; // { data, nextActionTime } プレイヤーの行動アイテム
        this.enemyBattleItems = [];  // { data, nextActionTime } 敵の行動アイテム
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
            
            // ★★★ これから作るメソッドを呼び出す ★★★
            this.prepareForBattle();
            
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
             // 戦闘ロジックの開始
            this.time.delayedCall(500, () => {
                this.startBattle(); // ★★★ これから作るメソッドを呼び出す ★★★
            });
        });

        // --- 5. 準備完了を通知 ---
        this.events.emit('scene-ready');
        console.log("BattleScene: create 完了");
    }

      /**
     * 戦闘開始前の最終準備（ステータス計算など）
     */
    prepareForBattle() {
        console.log("--- 戦闘準備開始 ---");
        
        // 1. プレイヤーのステータスと行動アイテムを初期化
        this.playerStats = { attack: 0, defense: 0, hp: this.stateManager.f.player_hp };
        this.playerBattleItems = [];

        for (const itemImage of this.placedItemImages) {
            const itemId = itemImage.getData('itemId');
            const itemData = ITEM_DATA[itemId];

            // パッシブ効果を計算 (例: 盾の防御力)
            if (itemData.passive && itemData.passive.type === 'defense') {
                this.playerStats.defense += itemData.passive.value;
            }
            
            // 行動するアイテムをリストアップ
            if (itemData.recast > 0) {
                this.playerBattleItems.push({
                    data: itemData,
                    nextActionTime: itemData.recast // 最初の行動時間
                });
            }
        }
        console.log("プレイヤー最終ステータス:", this.playerStats);
        console.log("プレイヤー行動アイテム:", this.playerBattleItems);

        // 2. 敵のステータスと行動アイテムを初期化 (今は仮)
        this.enemyStats = { attack: 0, defense: 2, hp: this.stateManager.f.enemy_hp };
        this.enemyBattleItems = [{
            data: ITEM_DATA['sword'],
            nextActionTime: ITEM_DATA['sword'].recast
        }];
        console.log("敵最終ステータス:", this.enemyStats);
    }
    
    /**
     * リアルタイムバトルを開始する
     */
    startBattle() {
        console.log("★★ 戦闘開始！ ★★");
        // updateループを有効化するだけ。実際の処理はupdateメソッドに記述。
    }
    
    /**
     * アイテムの行動を実行する
     */
    executeAction(itemData, attacker, defender) {
        const action = itemData.action;
        if (!action) return;

        const attackerStats = this[`${attacker}Stats`];
        const defenderStats = this[`${defender}Stats`];

        if (action.type === 'attack') {
            const damage = Math.max(1, action.value + attackerStats.attack - defenderStats.defense);
            
            const newHp = defenderStats.hp - damage;
            defenderStats.hp = newHp; // メモリ上のHPを更新
            this.stateManager.setF(`${defender}_hp`, newHp); // グローバルなHPを更新

            console.log(`${attacker}の${itemData.storage}が攻撃！ ${defender}に${damage}ダメージ。残りHP: ${newHp}`);

            // 勝敗判定
            if (newHp <= 0) {
                this.gameState = 'end'; // バトル終了状態
                console.log(`${defender}は倒れた！`);
                this.endBattle(attacker === 'player' ? 'win' : 'lose');
            }
        }
    }

    /**
     * Phaserによって毎フレーム呼ばれるメインループ
     */
    update(time, delta) {
        // 戦闘中でなければ何もしない
        if (this.gameState !== 'battle') return;

        // --- プレイヤーのアイテム行動処理 ---
        for (const item of this.playerBattleItems) {
            // nextActionTimeを毎フレーム減算していく
            item.nextActionTime -= delta / 1000;
            
            if (item.nextActionTime <= 0) {
                this.executeAction(item.data, 'player', 'enemy');
                // 次の行動時間を再設定
                item.nextActionTime += item.data.recast;
                
                // バトルが終了していたら、このループを抜ける
                if (this.gameState !== 'battle') break;
            }
        }

        // --- 敵のアイテム行動処理 ---
        if (this.gameState === 'battle') { // プレイヤーの攻撃で戦闘が終わってないかチェック
            for (const item of this.enemyBattleItems) {
                item.nextActionTime -= delta / 1000;
                if (item.nextActionTime <= 0) {
                    this.executeAction(item.data, 'enemy', 'player');
                    item.nextActionTime += item.data.recast;
                    if (this.gameState !== 'battle') break;
                }
            }
        }
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
    // BattleScene.js に追加する endBattle メソッド

    async endBattle(result) {
        // 二重呼び出しを防止
        if (this.battleEnded) return;
        this.battleEnded = true;

        console.log(`BattleScene: バトル終了。結果: ${result}`);
        
        // --- 勝利した場合 ---
        if (result === 'win') {
            // (ここに勝利演出などを追加)
            
            // ★ TODO: リワード画面への遷移ロジックを後で追加
            
            // とりあえず今はノベルパートに戻る
            this.scene.get('SystemScene').events.emit('return-to-novel', {
                from: this.scene.key,
                params: { 
                    'f.battle_result': '"win"', // 文字列は""で囲む
                    'f.player_hp': this.playerStats.hp,
                }
            });
            
        } 
        // --- 敗北した場合 ---
        else { // result === 'lose'
            console.log("BattleScene: ゲームオーバー処理を開始します。");
            
            // ゲームオーバーUIを表示
            this.add.text(this.scale.width / 2, this.scale.height / 2 - 50, 'GAME OVER', { fontSize: '64px', fill: '#f00', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setDepth(999);
            const retryButton = this.add.text(this.scale.width / 2, this.scale.height / 2 + 50, 'もう一度挑戦', { fontSize: '32px', fill: '#fff', backgroundColor: '#880000', padding: { x: 20, y: 10 } }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(999);
            const titleButton = this.add.text(this.scale.width / 2, this.scale.height / 2 + 120, 'タイトルに戻る', { fontSize: '32px', fill: '#fff', backgroundColor: '#444444', padding: { x: 20, y: 10 } }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(999);
            
            // リトライボタンの処理
            retryButton.on('pointerdown', () => {
                this.scene.get('SystemScene').events.emit('request-scene-transition', {
                    to: this.scene.key,
                    from: this.scene.key,
                    params: this.receivedParams // 最初のinitで受け取ったパラメータで再挑戦
                });
            });

            // タイトルへ戻るボタンの処理
            titleButton.on('pointerdown', () => {
                this.scene.get('SystemScene').events.emit('return-to-novel', {
                    from: this.scene.key, 
                    params: { 'f.battle_result': '"lose"' }
                });
            });
        }
    }
    
    // shutdown, endBattle, etc. はまだ実装しないので、空かコメントアウトでOK
    shutdown() {
        console.log("BattleScene: shutdown されました。");
    }
}
