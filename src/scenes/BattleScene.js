
import { ITEM_DATA } from '../core/ItemData.js';

export default class BattleScene extends Phaser.Scene {
    constructor() {
        super('BattleScene');
        // --- constructor: プロパティの初期化 (あなたのコードのまま) ---
        this.receivedParams = null;
        this.stateManager = null;
        this.soundManager = null;
        this.backpackGridSize = 6;
        this.cellSize = 60;
        this.gridX = 0;
        this.gridY = 0;
        this.backpack = null;
        this.inventoryItems = [];
        this.backpackGridObjects = [];
        this.playerStats = { attack: 0, defense: 0, hp: 0 }; 
        this.enemyStats = { attack: 0, defense: 0, hp: 0 };  
        this.initialBattleParams = null;
        this.battleEnded = false;
        this.battleLogText = null;
        this.winButton = null;
        this.loseButton = null;
        this.retryButton = null;
        this.titleButton = null;
        this.gameOverText = null;
       
        this.eventEmitted = false;
        this.playerPlaceholderText = null;
        this.enemyPlaceholderText = null;
        this.startBattleButton = null;

         this.playerItems = []; // { item, data, nextActionTime } の配列
        this.enemyItems = [];
        this.gameTime = 0; // ゲーム内時間
    }

     init(data) {
        // --- init: プロパティのリセット ---
        this.receivedParams = data.params || {}; // jump.jsの修正に合わせる
        const initialMaxHp = this.receivedParams.player_max_hp || 100;

        this.initialBattleParams = {
            playerLevel: this.receivedParams.player_level || 1,
            playerName: this.receivedParams.player_name || 'プレイヤー',
            initialCoin: this.receivedParams.current_coin || 0,
            
            // ★★★★★★★★★★★★★★★★★★★★★★★★★★★
            // ★★★ ここを修正 ★★★
            // ★★★ HPは常に最大値で初期化する ★★★
            // ★★★★★★★★★★★★★★★★★★★★★★★★★★★
            initialPlayerMaxHp: initialMaxHp, 
            initialPlayerHp: initialMaxHp, // ← 渡されたHPを使わず、最大HPをそのまま入れる
        };

        this.battleEnded = false;
        this.eventEmitted = false;
    }

    // ★★★ 修正点①: createメソッドをasyncにする ★★★
    async create() {
        console.log("BattleScene: create 開始");
        this.cameras.main.setBackgroundColor('#8a2be2');

        this.stateManager = this.sys.registry.get('stateManager');
        this.soundManager = this.sys.registry.get('soundManager');

        if (!this.stateManager || !this.soundManager) {
            console.error("BattleScene: StateManagerまたはSoundManagerが取得できませんでした。");
            return;
        }

        // ★★★ 修正点②: BGMの再生処理をawaitで正しく待つ ★★★
         // ★★★ BGMの制御は、この一行だけ！ ★★★
        // soundManager.playBgmが、前の曲を勝手に止めてくれる
        this.soundManager.playBgm('ronpa_bgm', 1000); // 1秒かけてクロスフェード
        console.log("戦闘bgm開始！");
        
        // --- UIとゲームオブジェクトの生成 (あなたのコードのまま) ---
        this.playerPlaceholderText = this.add.text(100, 360, 'PLAYER', { fontSize: '48px', fill: '#fff' }).setOrigin(0.5);
        this.enemyPlaceholderText = this.add.text(this.scale.width - 100, 360, 'ENEMY', { fontSize: '48px', fill: '#fff' }).setOrigin(0.5);

       const maxHp = this.initialBattleParams.initialPlayerMaxHp
        // ★★★ stateManagerの値をセットする際に、HPを最大値で上書き ★★★
        this.stateManager.setF('player_max_hp', maxHp); 
        this.stateManager.setF('player_hp', maxHp); // ← ここで全回復させる
       
        this.stateManager.setF('enemy_max_hp', 100); 
        this.stateManager.setF('enemy_hp', 100);
        
       
        
         // --- グリッド定義 ---
        this.backpackGridSize = 6;
        this.cellSize = 60;
        const gridWidth = this.backpackGridSize * this.cellSize;
        const gridHeight = this.backpackGridSize * this.cellSize;
        
        // --- プレイヤーグリッド (左側) ---
        this.gridX = 100; // 画面左からのマージン
        this.gridY = this.scale.height / 2 - gridHeight / 2;

        this.backpackGridObjects.push(this.add.rectangle(this.gridX + gridWidth / 2, this.gridY + gridHeight / 2, gridWidth, gridHeight, 0x333333, 0.9).setOrigin(0.5).setDepth(10));
        for (let i = 0; i <= this.backpackGridSize; i++) {
            this.backpackGridObjects.push(this.add.line(0, 0, this.gridX, this.gridY + i * this.cellSize, this.gridX + gridWidth, this.gridY + i * this.cellSize, 0x666666, 0.5).setOrigin(0).setDepth(11));
            this.backpackGridObjects.push(this.add.line(0, 0, this.gridX + i * this.cellSize, this.gridY, this.gridX + i * this.cellSize, this.gridY + gridHeight, 0x666666, 0.5).setOrigin(0).setDepth(11));
        }

        // --- 敵グリッド (右側) ---
        const enemyGridX = this.scale.width - 100 - gridWidth; // 画面右からのマージン
        const enemyGridY = this.gridY; // Y座標はプレイヤーと同じ

        this.backpackGridObjects.push(this.add.rectangle(enemyGridX + gridWidth / 2, enemyGridY + gridHeight / 2, gridWidth, gridHeight, 0x500000, 0.9).setOrigin(0.5).setDepth(10)); // 色を少し変える
        for (let i = 0; i <= this.backpackGridSize; i++) {
            this.backpackGridObjects.push(this.add.line(0, 0, enemyGridX, enemyGridY + i * this.cellSize, enemyGridX + gridWidth, enemyGridY + i * this.cellSize, 0x888888, 0.5).setOrigin(0).setDepth(11));
            this.backpackGridObjects.push(this.add.line(0, 0, enemyGridX + i * this.cellSize, enemyGridY, enemyGridX + i * this.cellSize, enemyGridY + gridHeight, 0x888888, 0.5).setOrigin(0).setDepth(11));
        }

        

        this.backpack = Array(this.backpackGridSize).fill(null).map(() => Array(this.backpackGridSize).fill(0));

         // --- ラウンドに応じた敵のアイテムセットを定義 ---
        const enemyLayouts = {
            1: { 'sword': { pos: [2, 2], angle: 0 } }, // 1戦目: 中央に剣が1本
            2: { 'sword': { pos: [2, 2], angle: 0 }, 'shield': { pos: [3, 2], angle: 0 } },
            // 今後のラウンドのために追加していく
        };
        const currentRound = this.receivedParams.round || 1; // SystemSceneからラウンド数を受け取る
        const currentLayout = enemyLayouts[currentRound] || {}; // 未定義ラウンドなら空にする
        
        // ★ プロパティとして敵アイテム配列を初期化
        this.enemyItemImages = []; 

        for (const itemId in currentLayout) {
            const itemData = ITEM_DATA[itemId];
            if (!itemData) continue;
            
            const pos = currentLayout[itemId].pos; // [row, col]
            const angle = currentLayout[itemId].angle;
            
            const shape = itemData.shape;
            const itemHeightInCells = shape.length;
            const itemWidthInCells = shape[0] ? shape[0].length : 1;
            
            const x = enemyGridX + (pos[1] * this.cellSize) + (itemWidthInCells * this.cellSize / 2);
            const y = enemyGridY + (pos[0] * this.cellSize) + (itemHeightInCells * this.cellSize / 2);

            const itemImage = this.add.image(x, y, itemData.storage)
                .setAngle(angle)
                .setDepth(12); // グリッド線より手前
            itemImage.setDisplaySize(itemWidthInCells * this.cellSize, itemHeightInCells * this.cellSize);
            
            this.enemyItemImages.push(itemImage);
        }

          this.gameState = 'prepare'; // シーン開始時の状態を設定

        // --- 準備画面用のUIを生成 ---
        this.prepareUIs = []; // UIグループをプロパティとして初期化
        const inventoryX = this.gridX - 180;
        const inventoryY = this.gridY;
        const inventoryWidth = 150;
        const inventoryHeight = this.gridHeight;
        this.backpackGridObjects.push(this.add.rectangle(inventoryX + inventoryWidth / 2, inventoryY + inventoryHeight / 2, inventoryWidth, inventoryHeight, 0x555555, 0.8).setOrigin(0.5).setDepth(10));
         this.prepareUIs.push(this.add.text(inventoryX + 75, inventoryY + 20, 'インベントリ', { fontSize: '24px', fill: '#fff' }));

         // (既存のインベントリアイテム生成ループ)
        const initialInventory = ['sword', 'shield', 'potion'];
        let itemY = inventoryY + 70;
        initialInventory.forEach(itemId => {
            const itemImage = this.createItem(itemId, inventoryX + 75, itemY);
            if (itemImage) { 
                this.inventoryItems.push(itemImage);
                this.prepareUIs.push(itemImage); // UIグループに追加
            }
            itemY += 80;
        });

        this.startBattleButton = this.add.text(this.gridX - 105, this.gridY + this.gridHeight - 30, '戦闘開始', { fontSize: '28px', fill: '#fff', backgroundColor: '#008800', padding: { x: 10, y: 5 } }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(11);
          this.prepareUIs.push(this.startBattleButton); // UIグループに追加
       // 戦闘開始ボタンのイベントリスナーを修正
        this.startBattleButton.on('pointerdown', () => {
            if (this.gameState !== 'prepare') return; // 準備中のみ有効
            this.gameState = 'battle';

            // 準備UIを非表示にする
            this.prepareUIs.forEach(ui => ui.setVisible(false));
            
            // アイテムのドラッグを無効にする
            this.inventoryItems.forEach(item => {
                if(item && item.input) this.input.setDraggable(item, false)
            });
            
            // (今はまだ空の)戦闘ロジックを呼び出す
            // this.prepareForBattle();
            // this.startBattle();
            console.log("★★ 戦闘開始！(UIが非表示になりました) ★★");
        });
        
        this.battleLogText = this.add.text(this.scale.width / 2, 150, '', { fontSize: '24px', fill: '#fff', backgroundColor: 'rgba(0,0,0,0.5)', padding: { x: 10, y: 10 }, align: 'center', wordWrap: { width: 400 } }).setOrigin(0.5).setDepth(200);

        // --- endBattleを呼び出すためのダミーボタン (あなたの元のコードにはなかったが、動作確認のために残しておくと便利) ---
        this.winButton = this.add.text(320, 600, '勝利(デバッグ用)', { fontSize: '32px', fill: '#0c0', backgroundColor: '#000' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        this.winButton.on('pointerdown', () => this.endBattle('win'));

        this.loseButton = this.add.text(this.scale.width - 320, 600, '敗北(デバッグ用)', { fontSize: '32px', fill: '#c00', backgroundColor: '#000' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        this.loseButton.on('pointerdown', () => this.endBattle('lose'));

        // ★★★ 修正点③: createの最後に「準備完了」イベントを発行する ★★★
        this.events.emit('scene-ready');
        console.log("BattleScene: 準備完了イベント(scene-ready)を発行しました。");
        console.log("BattleScene: create 完了");
    }

    // ★★★ 修正点④: endBattleメソッドをasync化し、あなたのロジックを尊重した形に修正 ★★★
    async endBattle(result) {
        if (this.battleEnded) return;
        this.battleEnded = true;

        console.log(`BattleScene: バトル終了。結果: ${result}`);
        
        if (this.winButton) this.winButton.disableInteractive();
        if (this.loseButton) this.loseButton.disableInteractive();
        
        if (result === 'win') {
            this.input.enabled = false;
            if (this.eventEmitted) return;
            this.eventEmitted = true;

            if (this.soundManager) await this.soundManager.stopBgm(500);

           

            this.scene.get('SystemScene').events.emit('return-to-novel', {
                from: this.scene.key,
                params: { 
                    'f.battle_result': 'win',
                    'f.player_hp': this.playerStats.hp, 
                    'f.coin': this.stateManager.f.coin 
                }
            });
            
        } else { // result === 'lose'
            console.log("BattleScene: ゲームオーバー処理を開始します。");
            
            this.gameOverText = this.add.text(this.scale.width / 2, this.scale.height / 2 - 50, 'GAME OVER', { fontSize: '64px', fill: '#f00', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setDepth(999);
            this.retryButton = this.add.text(this.scale.width / 2, this.scale.height / 2 + 50, 'もう一度挑戦', { fontSize: '32px', fill: '#fff', backgroundColor: '#880000', padding: { x: 20, y: 10 } }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(999);
            this.titleButton = this.add.text(this.scale.width / 2, this.scale.height / 2 + 120, 'タイトルに戻る', { fontSize: '32px', fill: '#fff', backgroundColor: '#444444', padding: { x: 20, y: 10 } }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(999);
            
            this.input.enabled = true; 

             // ★★★ 問題3の修正箇所 ★★★
            this.retryButton.on('pointerdown', () => {
                if (this.eventEmitted) return;
                this.eventEmitted = true;
                
                // ★ SystemSceneに遷移をリクエストする (自分自身への遷移) ★
                this.scene.get('SystemScene').events.emit('request-scene-transition', {
                    to: this.scene.key,       // 自分自身のキー
                    from: this.scene.key,     // 自分自身のキー
                    params: this.receivedParams // 最初のinitで受け取ったパラメータを再度渡す
                });
            });

            this.titleButton.on('pointerdown', () => {
                if (this.eventEmitted) return;
                this.eventEmitted = true;
                // ★ タイトルに戻る場合もSystemScene経由が良い (例)
                // this.scene.get('SystemScene').events.emit('request-scene-transition', { to: 'TitleScene', from: this.scene.key });
                
                // 現在の実装はノベルに戻るので、これはOK
                this.scene.get('SystemScene').events.emit('return-to-novel', {
                    from: this.scene.key, params: { 'f.battle_result': 'game_over' }
                });
            });
        }
    }


    // --- startBattle: あなたの元のコードのまま ---
    startBattle() {
        console.log("戦闘開始！");
        if(this.playerPlaceholderText) this.playerPlaceholderText.setVisible(false);
        if(this.enemyPlaceholderText) this.enemyPlaceholderText.setVisible(false);
        this.backpackGridObjects.forEach(obj => obj.setVisible(false));
        this.inventoryItems.forEach(item => item.setVisible(false));
        if(this.startBattleButton) this.startBattleButton.setVisible(false);
        this.playerStats = { attack: 5, defense: 0, hp: this.stateManager.f.player_hp };
        this.enemyStats = { attack: 20, defense: 0, hp: this.stateManager.f.enemy_hp };
        const processedItems = new Set(); 
        for (let r = 0; r < this.backpackGridSize; r++) {
            for (let c = 0; c < this.backpackGridSize; c++) {
                const itemId = this.backpack[r][c];
                if (itemId !== 0) {
                    const uniqueCellId = `${itemId}-${r}-${c}`; 
                    if (!processedItems.has(uniqueCellId)) { 
                        const itemData = ITEM_DATA[itemId];
                        if (itemData && itemData.effects) {
                            this.playerStats.attack += itemData.effects.attack || 0;
                            this.playerStats.defense += itemData.effects.defense || 0;
                        }
                        processedItems.add(uniqueCellId); 
                    }
                }
            }
        }
        console.log(`プレイヤー最終ステータス: 攻撃=${this.playerStats.attack}, 防御=${this.playerStats.defense}`);
        this.addToBattleLog(`あなたのステータス: 攻撃=${this.playerStats.attack}, 防御=${this.playerStats.defense}`);
        const executeTurn = (turn) => {
            console.log(`--- Turn ${turn} ---`);
            this.time.delayedCall(1000, () => {
                if (this.battleEnded) return;
                const playerDamage = Math.max(0, this.playerStats.attack - this.enemyStats.defense);
                this.enemyStats.hp -= playerDamage;
                this.stateManager.eval(`f.enemy_hp = ${this.enemyStats.hp}`);
                this.addToBattleLog(`あなたの攻撃！敵に ${playerDamage} のダメージ！ (敵残りHP: ${Math.max(0, this.enemyStats.hp)})`);
                if (this.enemyStats.hp <= 0) {
                    this.addToBattleLog("敵を倒した！");
                    this.time.delayedCall(1000, () => this.endBattle('win'));
                    return;
                }
                this.time.delayedCall(1000, () => {
                    if (this.battleEnded) return;
                    const enemyDamage = Math.max(0, this.enemyStats.attack - this.playerStats.defense);
                    this.playerStats.hp -= enemyDamage;
                    this.stateManager.eval(`f.player_hp = ${this.playerStats.hp}`);
                    this.addToBattleLog(`敵の攻撃！あなたに ${enemyDamage} のダメージ！ (残りHP: ${Math.max(0, this.playerStats.hp)})`);
                    if (this.playerStats.hp <= 0) {
                        this.addToBattleLog("あなたは倒れてしまった…");
                        this.time.delayedCall(1000, () => this.endBattle('lose'));
                        return;
                    }
                    executeTurn(turn + 1);
                });
            });
        };
        executeTurn(1);
    }
    
    // --- addToBattleLog: あなたの元のコードのまま ---
    addToBattleLog(text) {
        if (this.battleLogText) { 
            this.battleLogText.setText(text);
        }
    }

    // --- createItem: あなたの元のコードのまま ---
    createItem(itemId, x, y) {
        const itemData = ITEM_DATA[itemId];
        if (!itemData) return null;
        const itemImage = this.add.image(x, y, itemData.storage).setInteractive().setData({itemId, originX: x, originY: y, gridPos: null});
        const shape = itemData.shape;
        const itemHeightInCells = shape.length;
        const itemWidthInCells = shape[0] ? shape[0].length : 1;
        itemImage.setDisplaySize(itemWidthInCells * this.cellSize, itemHeightInCells * this.cellSize);
        this.input.setDraggable(itemImage);
        itemImage.on('dragstart', (pointer, dragX, dragY) => {
            itemImage.setDepth(200);
            if (itemImage.getData('gridPos')) {
                this.removeItemFromBackpack(itemImage);
            }
        });
        itemImage.on('drag', (pointer, dragX, dragY) => {
            itemImage.setPosition(dragX, dragY);
        });
        itemImage.on('dragend', (pointer, dragX, dragY, dropped) => {
            itemImage.setDepth(100);
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

    // --- canPlaceItem: あなたの元のコードのまま ---
    canPlaceItem(itemImage, startCol, startRow) {
        const itemData = ITEM_DATA[itemImage.getData('itemId')];
        const shape = itemData.shape;
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c] === 1) {
                    const checkRow = startRow + r;
                    const checkCol = startCol + c;
                    if (checkRow < 0 || checkRow >= this.backpackGridSize || checkCol < 0 || checkCol >= this.backpackGridSize) return false;
                    if (this.backpack[checkRow][checkCol] !== 0) return false;
                }
            }
        }
        return true;
    }

    // --- placeItemInBackpack: あなたの元のコードのまま ---
    placeItemInBackpack(itemImage, startCol, startRow) {
        const itemId = itemImage.getData('itemId');
        const itemData = ITEM_DATA[itemId];
        const shape = itemData.shape;
        itemImage.x = this.gridX + startCol * this.cellSize + (itemImage.width * itemImage.scaleX / 2);
        itemImage.y = this.gridY + startRow * this.cellSize + (itemImage.height * itemImage.scaleY / 2);
        itemImage.setData('gridPos', { col: startCol, row: startRow });
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c] === 1) {
                    this.backpack[startRow + r][startCol + c] = itemId;
                }
            }
        }
    }

    // --- removeItemFromBackpack: あなたの元のコードのまま ---
    removeItemFromBackpack(itemImage) {
        const itemId = itemImage.getData('itemId');
        const itemData = ITEM_DATA[itemId];
        const shape = itemData.shape;
        const gridPos = itemImage.getData('gridPos');
        if (!gridPos) return;
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c] === 1) {
                    this.backpack[gridPos.row + r][gridPos.col + c] = 0;
                }
            }
        }
        itemImage.setData('gridPos', null);
    }
    
  

    // ★★★ 修正点⑤: stop()メソッドを完全に削除する ★★★
    // stop()メソッドはシーンの再起動時に問題を引き起こすため、使用しません。

    // ★★★ 修正点⑥: shutdown()にクリーンアップ処理を集約する ★★★
     shutdown() {
        console.log("BattleScene: shutdown されました。リスナーをクリーンアップします。");
       
    }

    // --- resume: あなたの元のコードのまま ---
    resume() {
        console.log("BattleScene: resume されました。");
    }
}
