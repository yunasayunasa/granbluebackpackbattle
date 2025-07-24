// BattleScene.js (最終確定・完全版)
import { ITEM_DATA } from '../core/ItemData.js';
import Tooltip from '../ui/Tooltip.js';

export default class BattleScene extends Phaser.Scene {
    constructor() {
        super('BattleScene');
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
        this.battleEnded = false;
    }

    init(data) {
        this.receivedParams = data.params || {};
        const initialMaxHp = this.receivedParams.player_max_hp || 100;
        this.initialBattleParams = {
            playerMaxHp: initialMaxHp, 
            playerHp: initialMaxHp,
            round: this.receivedParams.round || 1,
        };
        this.inventoryItemImages = [];
        this.placedItemImages = [];
        this.battleEnded = false;
    }

    async create() {
        console.log("BattleScene: create 開始");
        this.cameras.main.setBackgroundColor('#8a2be2');

        // --- 1. 準備：マネージャーと変数の定義 ---
        this.gameState = 'prepare';
        this.stateManager = this.sys.registry.get('stateManager');
        this.soundManager = this.sys.registry.get('soundManager');
        this.tooltip = new Tooltip(this);
        const gameWidth = this.scale.width;
        const gameHeight = this.scale.height;
        const gridWidth = this.backpackGridSize * this.cellSize;
        const gridHeight = this.backpackGridSize * this.cellSize;
        this.gridX = 100;
        this.gridY = gameHeight / 2 - gridHeight / 2 - 50;
        this.backpack = Array(this.backpackGridSize).fill(null).map(() => Array(this.backpackGridSize).fill(0));
        this.prepareContainer = this.add.container(0, 0);
        this.battleContainer = this.add.container(0, 0).setVisible(false);

        // --- 2. 状態の初期化：BGMとHP ---
        this.soundManager.playBgm('ronpa_bgm');
        this.stateManager.setF('player_max_hp', this.initialBattleParams.playerMaxHp); 
        this.stateManager.setF('player_hp', this.initialBattleParams.playerHp);
        this.stateManager.setF('enemy_max_hp', 100); 
        this.stateManager.setF('enemy_hp', 100);

        // --- 3. 画面オブジェクトの描画 ---
        // 3a. プレイヤーグリッド
        this.add.rectangle(this.gridX + gridWidth / 2, this.gridY + gridHeight / 2, gridWidth, gridHeight, 0x333333, 0.9).setDepth(1);
        for (let i = 0; i <= this.backpackGridSize; i++) {
            this.add.line(0, 0, this.gridX, this.gridY + i * this.cellSize, this.gridX + gridWidth, this.gridY + i * this.cellSize, 0x666666, 0.5).setOrigin(0).setDepth(2);
            this.add.line(0, 0, this.gridX + i * this.cellSize, this.gridY, this.gridX + i * this.cellSize, this.gridY + gridHeight, 0x666666, 0.5).setOrigin(0).setDepth(2);
        }

        // 3b. 敵グリッドと敵アイテム
        const enemyGridX = gameWidth - 100 - gridWidth;
        const enemyGridY = this.gridY;
        this.add.rectangle(enemyGridX + gridWidth / 2, enemyGridY + gridHeight / 2, gridWidth, gridHeight, 0x500000, 0.9).setDepth(1);
        for (let i = 0; i <= this.backpackGridSize; i++) {
            this.add.line(0, 0, enemyGridX, enemyGridY + i * this.cellSize, enemyGridX + gridWidth, enemyGridY + i * this.cellSize, 0x888888, 0.5).setOrigin(0).setDepth(2);
            this.add.line(0, 0, enemyGridX + i * this.cellSize, enemyGridY, enemyGridX + i * this.cellSize, enemyGridY + gridHeight, 0x888888, 0.5).setOrigin(0).setDepth(2);
        }
        const enemyLayouts = { 1: { 'sword': { pos: [2, 2], angle: 0 } } };
        const currentRound = this.initialBattleParams.round;
        const currentLayout = enemyLayouts[currentRound] || {};
        for (const itemId in currentLayout) {
            const itemData = ITEM_DATA[itemId];
            if (!itemData) continue;
            const pos = currentLayout[itemId].pos;
            const itemImage = this.add.image(
                enemyGridX + (pos[1] * this.cellSize) + (itemData.shape[0].length * this.cellSize / 2),
                enemyGridY + (pos[0] * this.cellSize) + (itemData.shape.length * this.cellSize / 2),
                itemData.storage
            ).setDepth(3)   .setInteractive({ draggable: false }); // ← オブジェクトでオプションを指定;
            
            itemImage.setDisplaySize(itemData.shape[0].length * this.cellSize, itemData.shape.length * this.cellSize);
            this.addTooltipEvents(itemImage, itemId);
        }

        // 3c. インベントリ
        const inventoryAreaY = 520;
        const inventoryAreaHeight = gameHeight - inventoryAreaY;
        const invBg = this.add.rectangle(gameWidth / 2, inventoryAreaY + inventoryAreaHeight / 2, gameWidth, inventoryAreaHeight, 0x000000, 0.8).setDepth(10);
        const invText = this.add.text(gameWidth / 2, inventoryAreaY + 30, 'インベントリ', { fontSize: '24px', fill: '#fff' }).setOrigin(0.5).setDepth(11);
        this.prepareContainer.add([invBg, invText]);

        // 3d. ドラッグ可能なアイテム
        const initialInventory = ['sword', 'shield', 'potion'];
        const itemStartX = 200;
        const itemSpacing = 150;
        initialInventory.forEach((itemId, index) => {
            const itemImage = this.createItem(itemId, itemStartX + (index * itemSpacing), inventoryAreaY + inventoryAreaHeight / 2 + 20);
            if (itemImage) this.inventoryItemImages.push(itemImage);
        });

        // 3e. 戦闘開始ボタン
        this.startBattleButton = this.add.text(gameWidth - 150, gameHeight - 50, '戦闘開始', { fontSize: '28px', backgroundColor: '#080', padding: {x:10, y:5} }).setOrigin(0.5).setInteractive().setDepth(11);
        this.prepareContainer.add(this.startBattleButton);

        // --- 4. イベントリスナーの設定 ---
        this.startBattleButton.on('pointerdown', () => {
            if (this.gameState !== 'prepare') return;
            this.gameState = 'battle';
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
            this.time.delayedCall(500, this.startBattle, [], this);
        });

        this.input.on('pointerdown', (pointer) => {
            if (!pointer.gameObject && this.tooltip.visible) {
                 this.tooltip.hide();
            }
        }, this);

        // --- 5. 準備完了を通知 ---
        this.events.emit('scene-ready');
        console.log("BattleScene: create 完了");
    }
    
      /**
     * 戦闘開始前の最終準備（ステータス計算など）
     */
   // BattleScene.js の prepareForBattle メソッド (シナジー計算機能付き)

    prepareForBattle() {
        console.log("--- 戦闘準備開始 ---");
        
        // --- 1. 全ての配置済みアイテムの「戦闘用コピー」を作成 ---
        // これからシナジーで性能を書き換えるため、元のITEM_DATAを汚さないようにする
        const playerFinalItems = [];
        for (const itemImage of this.placedItemImages) {
            const gridPos = itemImage.getData('gridPos');
            const itemId = itemImage.getData('itemId');
            
            // JSONを使って元のデータをディープコピー（深い複製）する
            const itemInstance = JSON.parse(JSON.stringify(ITEM_DATA[itemId]));
            
            // 戦闘に必要な情報を追加
            itemInstance.id = itemId;
            itemInstance.row = gridPos.row;
            itemInstance.col = gridPos.col;
            
            playerFinalItems.push(itemInstance);
        }

        // --- 2. シナジー効果を計算し、「戦闘用コピー」の性能を書き換える ---
        console.log("シナジー計算を開始...");
        // まず、シナジーを与える側のアイテムをループ
        for (const sourceItem of playerFinalItems) {
            if (!sourceItem.synergy) continue; // シナジーを持たないアイテムはスキップ

            // 「隣接(adjacent)」シナジーの処理
            if (sourceItem.synergy.direction === 'adjacent') {
                const neighbors = [
                    {r: sourceItem.row - 1, c: sourceItem.col}, // 上
                    {r: sourceItem.row + 1, c: sourceItem.col}, // 下
                    {r: sourceItem.row, c: sourceItem.col - 1}, // 左
                    {r: sourceItem.row, c: sourceItem.col + 1}  // 右
                ];

                for (const pos of neighbors) {
                    // 隣接セルにいるアイテムを、戦闘用コピーのリストから探す
                    const targetItem = playerFinalItems.find(item => item.row === pos.r && item.col === pos.c);
                    
                    // 条件に合うアイテムが見つかったら、効果を適用
                    if (targetItem && targetItem.tags && targetItem.tags.includes(sourceItem.synergy.targetTag)) {
                        
                        if (sourceItem.synergy.effect.type === 'add_attack' && targetItem.action) {
                            targetItem.action.value += sourceItem.synergy.effect.value;
                            console.log(`★ シナジー発動: [${sourceItem.id}] -> [${targetItem.id}] の攻撃力が ${sourceItem.synergy.effect.value} アップ！`);
                        }
                        // (ここに add_defense や add_recast などの効果も追加していく)
                    }
                }
            }
            // (ここに 'down' や 'right' などの他の方向のシナジー処理も追加していく)
        }
        console.log("シナジー計算完了。");
        
        // --- 3. 性能が確定した「戦闘用コピー」を元に、最終ステータスを計算 ---
        this.playerStats = { attack: 0, defense: 0, hp: this.stateManager.f.player_hp, block: 0 };
        this.playerBattleItems = [];

        for (const item of playerFinalItems) {
            // パッシブ効果を計算
            if (item.passive && item.passive.effects) {
                for(const effect of item.passive.effects){
                    if (effect.type === 'defense') {
                        this.playerStats.defense += effect.value;
                    }
                    // (ここに max_hp などの効果も追加していく)
                }
            }
            
            // 行動するアイテムをリストアップ
            if (item.recast > 0) {
                this.playerBattleItems.push({
                    data: item, // ★ シナジーで強化された後のデータを格納
                    nextActionTime: item.recast
                });
            }
        }
        console.log("プレイヤー最終ステータス:", this.playerStats);
        console.log("プレイヤー行動アイテム:", this.playerBattleItems);


        // --- 4. 敵のステータスと行動アイテムを初期化 (今は仮のまま) ---
        this.enemyStats = { attack: 0, defense: 2, hp: this.stateManager.f.enemy_hp, block: 0 };
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

  // BattleScene.js に記述する createItem メソッド (完成版)

    createItem(itemId, x, y) {
        const itemData = ITEM_DATA[itemId];
        if (!itemData) return null;
        
        // 1. アイテム画像を生成し、インタラクティブにする
        const itemImage = this.add.image(x, y, itemData.storage)
            .setInteractive()
            .setDepth(12)
            .setData({
                itemId: itemId,
                originX: x,
                originY: y,
                gridPos: null
            });
   // ★ アイテムにシナジー用の矢印グラフィックを追加しておく
        const arrow = this.add.text(0, 0, '→', { fontSize: '32px', color: '#ff0' });
        arrow.setVisible(false); // 最初は非表示
        
        // itemImageにarrowをデータとして持たせる
        itemImage.setData('arrow', arrow);
        itemImage.setDisplaySize(itemData.shape[0].length * this.cellSize, itemData.shape.length * this.cellSize);
        
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // ★★★ ここからが修正の核心 ★★★
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        
        // 2. このアイテムにツールチップ表示機能を追加する
        this.addTooltipEvents(itemImage, itemId);

        // 3. このアイテムをドラッグ可能にする
        this.input.setDraggable(itemImage);

        // --- 4. ドラッグイベントの処理を定義 ---

        itemImage.on('dragstart', () => {
            // ドラッグ開始時にツールチップを隠す（タップと誤認された場合のため）
            this.tooltip.hide();
            
            itemImage.setDepth(99); // ドラッグ中は最前面に
            this.removeItemFromBackpack(itemImage);
        });

        itemImage.on('drag', (pointer, dragX, dragY) => {
            itemImage.setPosition(dragX, dragY);
        });

        itemImage.on('dragend', (pointer) => {
            itemImage.setDepth(12); // ドラッグが終わったら元の深度に
            
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
// BattleScene.js に記述する addTooltipEvents メソッド (最終確定版)

    addTooltipEvents(itemImage, itemId) {
        // pointerdown: マウスボタンが押された「瞬間」のイベント
        itemImage.on('pointerdown', (pointer) => {
            // タップかドラッグかを判定するためのフラグをセット
            itemImage.setData('isDown', true);
            itemImage.setData('moved', false);
        });

        // pointermove: マウスが動いた時のイベント
        itemImage.on('pointermove', (pointer) => {
            // ボタンが押された状態で少しでも動いたら「ドラッグ」とみなす
            if (itemImage.getData('isDown')) {
                itemImage.setData('moved', true);
            }
        });
        
        // pointerup: マウスボタンが離された「瞬間」のイベント
        itemImage.on('pointerup', (pointer, localX, localY, event) => {
            // ★★★★★★★★★★★★★★★★★★★★★★★★★★★
            // ★★★ これが核心：タップ判定ロジック ★★★
            // ★★★★★★★★★★★★★★★★★★★★★★★★★★★

            // ボタンが押された後、一度も動いていなければ「タップ」と判定
            if (itemImage.getData('isDown') && !itemImage.getData('moved')) {
                const itemData = ITEM_DATA[itemId];
                if (!itemData) return;

                let tooltipText = `【${itemId}】\n\n`;
                if (itemData.recast > 0) tooltipText += `リキャスト: ${itemData.recast}秒\n`;
                if (itemData.action) tooltipText += `効果: ${itemData.action.type} ${itemData.action.value}\n`;
                if (itemData.passive && itemData.passive.effects) {
                    itemData.passive.effects.forEach(e => {
                        tooltipText += `パッシブ: ${e.type} +${e.value}\n`;
                    });
                if (itemData.synergy) {
                    tooltipText += `\nシナジー:\n`;
                    const dir = itemData.synergy.direction; // 'adjacent', 'down', etc.
                    const tag = itemData.synergy.targetTag;
                    const effect = itemData.synergy.effect;
                    
                    tooltipText += `  - ${dir}の[${tag}]アイテムに\n`;
                    tooltipText += `    効果: ${effect.type} +${effect.value}\n`;
                }
                }
                
                this.tooltip.show(itemImage, tooltipText);
                
                // ★★★ 正しいイベント伝播の停止方法 ★★★
                event.stopPropagation();
            }
            
            // フラグをリセット
            itemImage.setData('isDown', false);
            itemImage.setData('moved', false);
        });
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
        this.updateArrowVisibility(itemImage);
    }
    // BattleScene.js に追加する endBattle メソッド
 /**
     * アイテムのシナジー矢印の表示・非表示と向きを更新する
     */
    updateArrowVisibility(itemImage) {
        const itemId = itemImage.getData('itemId');
        const itemData = ITEM_DATA[itemId];
        const arrow = itemImage.getData('arrow');
        
        if (itemData.synergy && arrow) {
            arrow.setVisible(true);
            
            // アイテム画像に追従させる
            arrow.x = itemImage.x;
            arrow.y = itemImage.y;
            
            // シナジーの方向に応じて矢印の向きと位置を調整
            // (これは暫定的なものです。回転機能に合わせて後で改良します)
            const direction = itemData.synergy.direction;
            if (direction === 'adjacent') {
                arrow.setText('＋'); // 十字で表現
            } else if (direction === 'down') {
                arrow.setText('↓');
                arrow.y += this.cellSize / 2;
            } else if (direction === 'up') {
                arrow.setText('↑');
                arrow.y -= this.cellSize / 2;
            } // ... right, left も同様
            
        } else if (arrow) {
            arrow.setVisible(false);
        }
    }
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
