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

    // BattleScene.js の prepareForBattle メソッド (完全版)

    prepareForBattle() {
        console.log("--- 戦闘準備開始 ---");
        
        // --- 1. 全ての配置済みアイテムの「戦闘用コピー」を作成 ---
        const playerFinalItems = [];
        for (const itemImage of this.placedItemImages) {
            const gridPos = itemImage.getData('gridPos');
            const itemId = itemImage.getData('itemId');
            const itemInstance = JSON.parse(JSON.stringify(ITEM_DATA[itemId]));
            itemInstance.id = itemId;
            itemInstance.row = gridPos.row;
            itemInstance.col = gridPos.col;
            // ★ 回転情報をコピーに含める
            itemInstance.rotation = itemImage.getData('rotation') || 0;
            playerFinalItems.push(itemInstance);
        }

        // --- 2. シナジー効果を計算し、コピーの性能を書き換える ---
        console.log("シナジー計算を開始...");
        for (const sourceItem of playerFinalItems) {
            if (!sourceItem.synergy) continue;

            const rotation = sourceItem.rotation;
            let targetPositions = [];

            if (sourceItem.synergy.direction === 'adjacent') {
                targetPositions = [
                    {r: sourceItem.row - 1, c: sourceItem.col}, {r: sourceItem.row + 1, c: sourceItem.col},
                    {r: sourceItem.row, c: sourceItem.col - 1}, {r: sourceItem.row, c: sourceItem.col + 1}
                ];
            }
            // (ここに 'down' などの方向と回転を考慮したロジックを追加)

            for (const pos of targetPositions) {
                const targetItem = playerFinalItems.find(item => item.row === pos.r && item.col === pos.c);
                if (targetItem && targetItem.tags && targetItem.tags.includes(sourceItem.synergy.targetTag)) {
                    const effect = sourceItem.synergy.effect;
                    if (effect.type === 'add_attack' && targetItem.action) {
                        targetItem.action.value += effect.value;
                        console.log(`★ シナジー: [${sourceItem.id}] -> [${targetItem.id}] 攻撃力+${effect.value}`);
                    }
                }
            }
        }
        console.log("シナジー計算完了。");
        
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // ★★★ ここがエラーの出ていた部分の修正版です ★★★
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        
        // --- 3. 性能が確定したコピーを元に、最終ステータスを計算 ---
        this.playerStats = { 
            attack: 0, 
            defense: 0, 
            hp: this.initialBattleParams.playerHp, // HPは初期値から
            block: 0 
        };
        this.playerBattleItems = [];

        // ★ ループ変数を `item` に統一
        for (const item of playerFinalItems) {
            // パッシブ効果を計算
            if (item.passive && item.passive.effects) {
                for(const effect of item.passive.effects){
                    if (effect.type === 'defense') {
                        this.playerStats.defense += effect.value;
                    }
                    if (effect.type === 'max_hp') {
                        // 最大HPは直接加算せず、現在のHPと比較する形が良い（後で調整）
                    }
                }
            }
            
            // 行動するアイテムをリストアップ
            if (item.recast > 0) {
                this.playerBattleItems.push({
                    data: item, // シナジーで強化された後のデータ
                    nextActionTime: item.recast
                });
            }
        }
        console.log("プレイヤー最終ステータス:", this.playerStats);
        console.log("プレイヤー行動アイテム:", this.playerBattleItems);


        // --- 4. 敵のステータスと行動アイテムを初期化 (仮) ---
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

   // BattleScene.js の createItem メソッド (改訂版)

   // BattleScene.js の createItem メソッド (最終修正版)

    // BattleScene.js の createItem メソッド (四方矢印対応版)

    createItem(itemId, x, y) {
        const itemData = ITEM_DATA[itemId];
        if (!itemData) return null;
        
        // 1. メインのコンテナを作成
        const itemContainer = this.add.container(x, y);
        const containerWidth = itemData.shape[0].length * this.cellSize;
        const containerHeight = itemData.shape.length * this.cellSize;
        itemContainer.setSize(containerWidth, containerHeight);
        
        // 2. アイテム画像を生成
        const itemImage = this.add.image(0, 0, itemData.storage);
        itemImage.setDisplaySize(containerWidth, containerHeight);

        // ★★★ 3. 矢印を管理するための「矢印用コンテナ」を作成 ★★★
        const arrowContainer = this.add.container(0, 0);
        const arrowStyle = { fontSize: '32px', color: '#ffdd00', stroke: '#000', strokeThickness: 4 };

        // 上下左右の矢印テキストを生成し、名前を付けておく
        const arrowUp = this.add.text(0, 0, '▲', arrowStyle).setOrigin(0.5).setName('up');
        const arrowDown = this.add.text(0, 0, '▼', arrowStyle).setOrigin(0.5).setName('down');
        const arrowLeft = this.add.text(0, 0, '◀', arrowStyle).setOrigin(0.5).setName('left');
        const arrowRight = this.add.text(0, 0, '▶', arrowStyle).setOrigin(0.5).setName('right');
        
        // 矢印コンテナに全て追加
        arrowContainer.add([arrowUp, arrowDown, arrowLeft, arrowRight]);
        arrowContainer.setVisible(false); // コンテナごと非表示に
        
        // 4. 全ての部品をメインのコンテナに追加
        itemContainer.add([itemImage, arrowContainer]);
        
        // ★★★ 5. コンテナにデータとインタラクションを設定 ★★★
        itemContainer.setDepth(12);
        itemContainer.setInteractive(); // ← setInteractiveは必須
        itemContainer.setData({
            itemId: itemId,
            originX: x, originY: y,
            gridPos: null,
            itemImage: itemImage,
            arrowContainer: arrowContainer,
            rotation: 0 // ★★★ 回転角度をデータとして初期化 (0度) ★★★
        });

        this.input.setDraggable(itemContainer);
        this.addTooltipEvents(itemContainer, itemId); // ツールチップは変更なし

      

        itemContainer.on('dragstart', () => {
            this.tooltip.hide();
            itemContainer.setDepth(99);
            this.removeItemFromBackpack(itemContainer);
        });
        itemContainer.on('drag', (pointer, dragX, dragY) => {
            itemContainer.setPosition(dragX, dragY);
        });
        itemContainer.on('dragend', (pointer) => {
            itemContainer.setDepth(12);
            const gridCol = Math.floor((pointer.x - this.gridX) / this.cellSize);
            const gridRow = Math.floor((pointer.y - this.gridY) / this.cellSize);
            if (this.canPlaceItem(itemContainer, gridCol, gridRow)) {
                this.placeItemInBackpack(itemContainer, gridCol, gridRow);
            } else {
                itemContainer.x = itemContainer.getData('originX');
                itemContainer.y = itemContainer.getData('originY');
            }
        });
         // ★★★ 7. 回転とタップのイベントを再設計 ★★★
        let pressTimer = null;
        
        itemContainer.on('pointerdown', (pointer) => {
            // 右クリックは即時回転
            if (pointer.rightButtonDown()) {
                this.rotateItem(itemContainer);
                return; // 右クリック時は他の処理をしない
            }

            // 長押しタイマースタート
            itemContainer.setData('isLongPress', false);
            pressTimer = this.time.delayedCall(500, () => {
                this.rotateItem(itemContainer);
                itemContainer.setData('isLongPress', true);
            });
        });

        // ★★★ ドラッグ中のイベントを追加 ★★★
        itemContainer.on('drag', () => {
            // 少しでもドラッグされたら、長押しタイマーを即座にキャンセルする
            if (pressTimer) {
                pressTimer.remove();
                pressTimer = null;
            }
        });
        
        itemContainer.on('pointerup', (pointer, localX, localY, event) => {
            // ボタンが離されたら、まずタイマーを止める
            if (pressTimer) {
                pressTimer.remove();
                pressTimer = null;
            }

            // 長押しが「発動した後」や、ドラッグ中だった場合は、タップ処理をしない
            if (itemContainer.getData('isLongPress') || (itemContainer.input && itemContainer.input.dragState > 0)) {
                // 何もしない
            } else {
                // タップと判定し、ツールチップを表示
                // (addTooltipEventsは不要になる)
                const itemData = ITEM_DATA[itemId];
                if (!itemData) return;
                let tooltipText = `【${itemId}】\n\n`;
                if (itemData.recast > 0) tooltipText += `リキャスト: ${itemData.recast}秒\n`;
                if (itemData.action) tooltipText += `効果: ${itemData.action.type} ${itemData.action.value}\n`;
                if (itemData.passive && itemData.passive.effects) {
                    itemData.passive.effects.forEach(e => {
                        tooltipText += `パッシブ: ${e.type} +${e.value}\n`;
                    });
                }
                this.tooltip.show(itemContainer, tooltipText);
                event.stopPropagation();
            }
            
            // フラグをリセット
            itemContainer.setData('isLongPress', false);
        });

        
        return itemContainer;
    }


// BattleScene.js に追加する新しいヘルパーメソッド

    /**
     * アイテムコンテナを90度回転させる
     * @param {Phaser.GameObjects.Container} itemContainer
     */
    // BattleScene.js の rotateItem メソッド (回転補正・スマホ対応版)

    // BattleScene.js の canPlaceItem メソッド (回転対応版)

   // BattleScene.js の既存の canPlaceItem を、これに置き換えてください

    canPlaceItem(itemContainer, startCol, startRow) {
        const itemData = ITEM_DATA[itemContainer.getData('itemId')];
        const rotation = itemContainer.getData('rotation') || 0;
        let shape = itemData.shape;

        // 回転が90度か270度の場合、形状データを擬似的に回転させる
        if (rotation === 90 || rotation === 270) {
            const newShape = [];
            for (let x = 0; x < shape[0].length; x++) {
                const newRow = [];
                for (let y = shape.length - 1; y >= 0; y--) {
                    newRow.push(shape[y][x]);
                }
                newShape.push(newRow);
            }
            shape = newShape;
        }
        
        // (以降の配置チェックロジックは変更なし)
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
   // BattleScene.js の removeItemFromBackpack メソッド (最終修正版)

    removeItemFromBackpack(itemContainer) {
        const gridPos = itemContainer.getData('gridPos');
        if (!gridPos) return;

        const itemId = itemContainer.getData('itemId');
        const itemData = ITEM_DATA[itemId];
        const shape = itemData.shape;

        // 1. 論理データをクリア
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c] === 1) {
                    this.backpack[gridPos.row + r][gridPos.col + c] = 0;
                }
            }
        }
        itemContainer.setData('gridPos', null);

        // ★★★ ここからが修正箇所 ★★★
        // 2. 所属チームを移動させる
        //    (itemImage ではなく itemContainer を探す)
        const index = this.placedItemImages.indexOf(itemContainer);
        if (index > -1) {
            this.placedItemImages.splice(index, 1);
        }
        this.inventoryItemImages.push(itemContainer);

        // 3. シナジー矢印の表示を更新
        this.updateArrowVisibility(itemContainer);
    }
      // BattleScene.js に、このメソッドをまるごと追加してください

    rotateItem(itemContainer) {
        const itemId = itemContainer.getData('itemId');
        const itemData = ITEM_DATA[itemId];
        const shape = itemData.shape;

        // 1. 新しい回転角度を計算・保存
        let currentRotation = itemContainer.getData('rotation');
        currentRotation = (currentRotation + 90) % 360;
        itemContainer.setData('rotation', currentRotation);

        // 2. コンテナ自体を回転させる
        itemContainer.setAngle(currentRotation);

        // 3. 形状の中心からのズレを補正する
        const shapeWidth = shape[0].length;
        const shapeHeight = shape.length;
        const offsetX = (shapeHeight - shapeWidth) * this.cellSize / 2;
        const offsetY = (shapeWidth - shapeHeight) * this.cellSize / 2;
        const itemImage = itemContainer.getData('itemImage');
        const arrowContainer = itemContainer.getData('arrowContainer');
        
        // 回転角度に応じて、補正値を適用
        if (currentRotation === 90) {
            itemImage.setPosition(offsetX, offsetY);
            arrowContainer.setPosition(offsetX, offsetY);
        } else if (currentRotation === 270) {
            itemImage.setPosition(-offsetX, -offsetY);
            arrowContainer.setPosition(-offsetX, -offsetY);
        } else {
            itemImage.setPosition(0, 0);
            arrowContainer.setPosition(0, 0);
        }

        // グリッドに配置済みの場合は、再配置チェック
        const gridPos = itemContainer.getData('gridPos');
        if (gridPos) {
            if (!this.canPlaceItem(itemContainer, gridPos.col, gridPos.row)) {
                // 置けなくなったらインベントリに戻す
                this.removeItemFromBackpack(itemContainer);
                itemContainer.x = itemContainer.getData('originX');
                itemContainer.y = itemContainer.getData('originY');
                itemContainer.setAngle(0);
                itemContainer.setData('rotation', 0);
                // ★ 矢印表示も更新する
                this.updateArrowVisibility(itemContainer); 
            }
        }
        console.log(`アイテム[${itemId}]を回転: ${currentRotation}度`);
    }

 // BattleScene.js の placeItemInBackpack メソッド (最終修正版)

    placeItemInBackpack(itemContainer, startCol, startRow) {
        const itemId = itemContainer.getData('itemId');
        const itemData = ITEM_DATA[itemId];
        const shape = itemData.shape;

        // 1. 視覚的な位置をグリッドにスナップさせる
        const itemWidthInCells = shape[0].length;
        const itemHeightInCells = shape.length;
        itemContainer.x = this.gridX + (startCol * this.cellSize) + (itemWidthInCells * this.cellSize / 2);
        itemContainer.y = this.gridY + (startRow * this.cellSize) + (itemHeightInCells * this.cellSize / 2);

        // 2. 論理的なデータを更新
        itemContainer.setData('gridPos', { row: startRow, col: startCol });
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c] === 1) {
                    this.backpack[startRow + r][startCol + c] = itemId;
                }
            }
        }

        // ★★★ ここからが修正箇所 ★★★
        // 3. 所属チームを移動させる
        //    (itemImage ではなく itemContainer を探す)
        const index = this.inventoryItemImages.indexOf(itemContainer);
        if (index > -1) {
            this.inventoryItemImages.splice(index, 1);
        }
        this.placedItemImages.push(itemContainer);
        
        // 4. シナジー矢印の表示を更新
        this.updateArrowVisibility(itemContainer);
    }
    // BattleScene.js に追加する endBattle メソッド
 /**
     * アイテムのシナジー矢印の表示・非表示と向きを更新する
     */
   // BattleScene.js に記述する updateArrowVisibility メソッド

   // BattleScene.js に追加する updateArrowVisibility メソッド

    updateArrowVisibility(itemContainer) {
        const itemId = itemContainer.getData('itemId');
        const itemData = ITEM_DATA[itemId];
        const arrowContainer = itemContainer.getData('arrowContainer');

        if (!arrowContainer) return;
        
        if (itemData.synergy) {
            arrowContainer.setVisible(true);
            const direction = itemData.synergy.direction;
            const offset = this.cellSize / 2 + 10;
            
            // 最初に全ての矢印を隠す
            arrowContainer.each(arrow => arrow.setVisible(false));

            if (direction === 'adjacent') {
                arrowContainer.getByName('up').setVisible(true).setY(-offset);
                arrowContainer.getByName('down').setVisible(true).setY(offset);
                arrowContainer.getByName('left').setVisible(true).setX(-offset);
                arrowContainer.getByName('right').setVisible(true).setX(offset);
            }
            else if (direction === 'down')  arrowContainer.getByName('down').setVisible(true).setY(offset);
            else if (direction === 'up')    arrowContainer.getByName('up').setVisible(true).setY(-offset);
            else if (direction === 'right') arrowContainer.getByName('right').setVisible(true).setX(offset);
            else if (direction === 'left')  arrowContainer.getByName('left').setVisible(true).setX(-offset);
            
        } else {
            arrowContainer.setVisible(false);
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
