// BattleScene.js (最終決定版・完全体)
import { ITEM_DATA } from '../core/ItemData.js';
import Tooltip from '../ui/Tooltip.js';

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
        this.battleEnded = false;
         this.ghostImage = null;
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

    create() {
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
 this.ghostImage = this.add.rectangle(0, 0, this.cellSize, this.cellSize, 0xffffff, 0.5).setVisible(false).setDepth(5);
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
            ).setDepth(3).setInteractive({ draggable: false });
            itemImage.setDisplaySize(itemData.shape[0].length * this.cellSize, itemData.shape.length * this.cellSize);
              itemImage.on('pointerup', (pointer, localX, localY, event) => {
                const itemData = ITEM_DATA[itemId];
                if (!itemData) return;
                
                let tooltipText = `【${itemId}】\n\n`;
                if (itemData.recast > 0) tooltipText += `リキャスト: ${itemData.recast}秒\n`;
                if (itemData.action) tooltipText += `効果: ${itemData.action.type} ${itemData.action.value}\n`;
                if (itemData.passive && itemData.passive.effects) {
                    itemData.passive.effects.forEach(e => { tooltipText += `パッシブ: ${e.type} +${e.value}\n`; });
                }
                if (itemData.synergy) {
                    tooltipText += `\nシナジー:\n  - ${itemData.synergy.direction}の[${itemData.synergy.targetTag}]に\n    効果: ${itemData.synergy.effect.type} +${itemData.synergy.effect.value}\n`;
                }
                
                this.tooltip.show(itemImage, tooltipText);
                event.stopPropagation();
            });
        }
              

        // 3c. インベントリ
        const inventoryAreaY = 520;
        const inventoryAreaHeight = gameHeight - inventoryAreaY;
        const invBg = this.add.rectangle(gameWidth / 2, inventoryAreaY + inventoryAreaHeight / 2, gameWidth, inventoryAreaHeight, 0x000000, 0.8).setDepth(10);
        const invText = this.add.text(gameWidth / 2, inventoryAreaY + 30, 'インベントリ', { fontSize: '24px', fill: '#fff' }).setOrigin(0.5).setDepth(11);
        this.prepareContainer.add([invBg, invText]);

          // 3d. ドラッグ可能なアイテム (準備中のみ)
        this.inventoryItemImages = [];
          const initialInventory = ['sword', 'shield', 'potion', 'leather_armor', 'berserker_axe'];
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // ★★★ ここからが動的レイアウトのロジック ★★★
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        const inventoryContentWidth = gameWidth - 200; // インベントリの左右マージン
        const itemCount = initialInventory.length;
        
        // アイテム数に応じて、最適な間隔を自動計算
        const itemSpacing = inventoryContentWidth / itemCount;
        // 最初のアイテムの開始位置を計算
        const itemStartX = 100 + (itemSpacing / 2);

        initialInventory.forEach((itemId, index) => {
            const x = itemStartX + (index * itemSpacing);
            const y = inventoryAreaY + inventoryAreaHeight / 2 + 20;
            const itemImage = this.createItem(itemId, x, y);
            if (itemImage) {
                this.inventoryItemImages.push(itemImage);
            }
        });

       // 3e. 戦闘開始ボタン (準備中のみ)
        // ★★★ 座標を画面中央下部に変更 ★★★
        this.startBattleButton = this.add.text(
            gameWidth / 2, // X座標を中央に
            inventoryAreaY - 40, // Y座標をインベントリ領域の少し上に
            '戦闘開始', 
            { fontSize: '28px', backgroundColor: '#080', padding: {x:20, y:10} }
        ).setOrigin(0.5).setInteractive().setDepth(11);
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
    
    // --- ヘルパーメソッド群 (ここから下はすべて完成版) ---

    // BattleScene.js の prepareForBattle メソッド (完成版)

    // BattleScene.js の prepareForBattle メソッド (方向シナジー対応版)

    prepareForBattle() {
        console.log("--- 戦闘準備開始 ---");
        
        // 1. 戦闘用のアイテム情報リストを作成
        const playerFinalItems = [];
        for (const itemContainer of this.placedItemImages) {
            const itemInstance = JSON.parse(JSON.stringify(ITEM_DATA[itemContainer.getData('itemId')]));
            itemInstance.id = itemContainer.getData('itemId');
            const gridPos = itemContainer.getData('gridPos');
            itemInstance.row = gridPos.row;
            itemInstance.col = gridPos.col;
            itemInstance.rotation = itemContainer.getData('rotation') || 0;
            playerFinalItems.push(itemInstance);
        }

        // 2. パッシブ効果を計算 (シナジーの前に計算するのが安全)
        let finalMaxHp = this.initialBattleParams.playerMaxHp;
        let finalDefense = 0;
        for (const item of playerFinalItems) {
            if (item.passive && item.passive.effects) {
                for(const effect of item.passive.effects){
                    if (effect.type === 'defense') finalDefense += effect.value;
                    if (effect.type === 'max_hp') finalMaxHp += effect.value;
                }
            }
        }
        finalMaxHp = Math.max(1, finalMaxHp);
        this.stateManager.setF('player_max_hp', finalMaxHp);
        this.stateManager.setF('player_hp', finalMaxHp);
        
       // --- 3. シナジー効果を計算 ---
        console.log("シナジー計算を開始...");
        for (const sourceItem of playerFinalItems) {
            if (!sourceItem.synergy) continue;
            
            const rotation = sourceItem.rotation;
            const direction = sourceItem.synergy.direction;
            const sourceShape = this.getRotatedShape(sourceItem.id, rotation);
            
            // sourceItemが占めているセルのリスト
            const sourceCells = [];
            for (let r = 0; r < sourceShape.length; r++) {
                for (let c = 0; c < sourceShape[r].length; c++) {
                    if (sourceShape[r][c] === 1) sourceCells.push({ r: sourceItem.row + r, c: sourceItem.col + c });
                }
            }

            const checkedTargets = new Set(); // 重複バフ防止

            // ★★★ sourceItemの各セルからターゲットを探す ★★★
            for (const cell of sourceCells) {
                let targetPositions = [];
                
                // どの方向をチェックするか決める
                if (direction === 'adjacent') {
                    targetPositions = [
                        {r: cell.r - 1, c: cell.c}, {r: cell.r + 1, c: cell.c},
                        {r: cell.r, c: cell.c - 1}, {r: cell.r, c: cell.c + 1}
                    ];
                } else {
                    let targetDir = {r: 0, c: 0};
                    if (direction === 'down')  targetDir = {r: 1, c: 0};
                    else if (direction === 'up')    targetDir = {r: -1, c: 0};
                    else if (direction === 'left')  targetDir = {r: 0, c: -1};
                    else if (direction === 'right') targetDir = {r: 0, c: 1};
                    
                    if (rotation === 90)  targetDir = {r: -targetDir.c, c: targetDir.r};
                    else if (rotation === 180) targetDir = {r: -targetDir.r, c: -targetDir.c};
                    else if (rotation === 270) targetDir = {r: targetDir.c, c: -targetDir.r};
                    
                    targetPositions.push({ r: cell.r + targetDir.r, c: cell.c + targetDir.c });
                }
                
                // ターゲット位置にあるアイテムに効果を適用
                for (const pos of targetPositions) {
                    // ★ ターゲットセルの上に「左上」があるアイテムを探す
                    const targetItem = playerFinalItems.find(item => {
                        const targetShape = this.getRotatedShape(item.id, item.rotation);
                        for (let r = 0; r < targetShape.length; r++) {
                            for (let c = 0; c < targetShape[r].length; c++) {
                                if (targetShape[r][c] === 1 && (item.row + r) === pos.r && (item.col + c) === pos.c) {
                                    return true;
                                }
                            }
                        }
                        return false;
                    });

                    if (targetItem && !checkedTargets.has(targetItem.id) && targetItem.tags.includes(sourceItem.synergy.targetTag)) {
                        if (targetItem.id === sourceItem.id) continue;
                        const effect = sourceItem.synergy.effect;
                        if (effect.type === 'add_attack' && targetItem.action) {
                            targetItem.action.value += effect.value;
                            console.log(`★ シナジー: [${sourceItem.id}] -> [${targetItem.id}] 攻撃力+${effect.value}`);
                            checkedTargets.add(targetItem.id);
                        }
                        // (他の効果もここに追加)
                    }
                }
            }
        }
        console.log("シナジー計算完了。");
        // (以降の最終ステータス計算は変更なし)
        // 4. 最終的なステータスと行動アイテムリストを作成
        this.playerStats = { attack: 0, defense: finalDefense, hp: finalMaxHp, block: 0 };
        this.playerBattleItems = [];
        for (const item of playerFinalItems) {
            // シナジーによって攻撃力が直接加算されるタイプもあるため、ここで集計
            if (item.action && item.action.type === 'attack') {
                this.playerStats.attack += item.action.value;
            }
            if (item.recast > 0) {
                this.playerBattleItems.push({ data: item, nextActionTime: item.recast });
            }
        }
        console.log("プレイヤー最終ステータス:", this.playerStats);

        // 5. 敵のステータス初期化
        this.enemyStats = { attack: 5, defense: 2, hp: this.stateManager.f.enemy_hp, block: 0 }; // 基礎攻撃力を持たせる
        this.enemyBattleItems = [{ data: ITEM_DATA['sword'], nextActionTime: ITEM_DATA['sword'].recast }];
        console.log("敵最終ステータス:", this.enemyStats);
    }
    startBattle() {
        console.log("★★ 戦闘開始！ ★★");
    }
    
    update(time, delta) {
        if (this.gameState !== 'battle') return;
        for (const item of this.playerBattleItems) {
            item.nextActionTime -= delta / 1000;
            if (item.nextActionTime <= 0) {
                this.executeAction(item.data, 'player', 'enemy');
                item.nextActionTime += item.data.recast;
                if (this.gameState !== 'battle') break;
            }
        }
        if (this.gameState === 'battle') {
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

    // BattleScene.js の executeAction メソッド (ブロック対応版)

    executeAction(itemData, attacker, defender) {
        const action = itemData.action;
        if (!action) return;

        const attackerStats = this[`${attacker}Stats`];
        const defenderStats = this[`${defender}Stats`];
        const itemName = itemData.id || "アイテム"; // ログ表示用の名前

        // --- 行動タイプに応じた処理 ---

        if (action.type === 'attack') {
            const totalAttack = action.value + attackerStats.attack;
            let damage = Math.max(0, totalAttack - defenderStats.defense); // ★ ダメージは0もあり得る
            
            // ★ 1. ブロックがあれば、まずブロックでダメージを受ける
            if (defenderStats.block > 0 && damage > 0) {
                const blockDamage = Math.min(defenderStats.block, damage);
                defenderStats.block -= blockDamage;
                damage -= blockDamage;
                console.log(` > ${defender}が${blockDamage}ダメージをブロック！ (残りブロック: ${defenderStats.block})`);
                // ★ TODO: ブロックHUDを更新する (後で)
            }

            // ★ 2. 残りのダメージをHPで受ける
            if (damage > 0) {
                const newHp = defenderStats.hp - damage;
                defenderStats.hp = newHp;
                this.stateManager.setF(`${defender}_hp`, newHp); // HUDに通知
                console.log(` > ${attacker}の${itemName}が攻撃！ ${defender}に${damage}ダメージ (残りHP: ${newHp})`);
                
                if (newHp <= 0) {
                    this.gameState = 'end';
                    this.endBattle(attacker === 'player' ? 'win' : 'lose');
                }
            } else {
                 console.log(` > ${attacker}の${itemName}の攻撃は防がれた！`);
            }
        }
        
        else if (action.type === 'block') {
            // ★ 3. ブロックを付与するアクション
            attackerStats.block += action.value;
            console.log(` > ${attacker}の${itemName}が発動！ ブロックを${action.value}獲得 (合計ブロック: ${attackerStats.block})`);
            // ★ TODO: ブロックHUDを更新する (後で)
        }

        // (ここに 'heal' などの他のアクションタイプを追加していく)
    }

    endBattle(result) {
        if (this.battleEnded) return;
        this.battleEnded = true;
        console.log(`バトル終了。結果: ${result}`);
        if (result === 'win') {
            this.scene.get('SystemScene').events.emit('return-to-novel', { from: this.scene.key, params: { 'f.battle_result': '"win"', 'f.player_hp': this.playerStats.hp } });
        } else {
            this.add.text(this.scale.width / 2, this.scale.height / 2 - 50, 'GAME OVER', { fontSize: '64px', fill: '#f00' }).setOrigin(0.5).setDepth(999);
            const retryButton = this.add.text(this.scale.width / 2, this.scale.height / 2 + 50, 'もう一度挑戦', { fontSize: '32px', fill: '#fff', backgroundColor: '#880000' }).setOrigin(0.5).setInteractive().setDepth(999);
            retryButton.on('pointerdown', () => { this.scene.get('SystemScene').events.emit('request-scene-transition', { to: this.scene.key, from: this.scene.key, params: this.receivedParams }); });
        }
    }

    // BattleScene.js の createItem メソッド (ドラッグ追従・最終版)

    // BattleScene.js の createItem メソッド (イベントリスナー完全版)

    
    createItem(itemId, x, y) {
        const itemData = ITEM_DATA[itemId];
        if (!itemData) return null;

        const containerWidth = itemData.shape[0].length * this.cellSize;
        const containerHeight = itemData.shape.length * this.cellSize;
        const itemContainer = this.add.container(x, y).setSize(containerWidth, containerHeight);
        const itemImage = this.add.image(0, 0, itemData.storage).setDisplaySize(containerWidth, containerHeight);
        const arrowContainer = this.add.container(0, 0).setVisible(false);
        const arrowStyle = { fontSize: '32px', color: '#ffdd00', stroke: '#000', strokeThickness: 4 };
        arrowContainer.add([
            this.add.text(0, 0, '▲', arrowStyle).setOrigin(0.5).setName('up'),
            this.add.text(0, 0, '▼', arrowStyle).setOrigin(0.5).setName('down'),
            this.add.text(0, 0, '◀', arrowStyle).setOrigin(0.5).setName('left'),
            this.add.text(0, 0, '▶', arrowStyle).setOrigin(0.5).setName('right')
        ]);
        itemContainer.add([itemImage, arrowContainer]).setDepth(12).setInteractive();
        itemContainer.setData({ itemId, originX: x, originY: y, gridPos: null, itemImage, arrowContainer, rotation: 0 });
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
                if (isDown && !isDragging) { // ★ 押されたままで、ドラッグしていなければ長押し成立
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
            // ドラッグ中に長押しタイマーが動いてしまうのを防ぐ
            if (pressTimer) pressTimer.remove();
            itemContainer.setPosition(dragX, dragY);
            // (ゴースト表示ロジック)
            const gridCol = Math.floor((pointer.x - this.gridX) / this.cellSize);
            const gridRow = Math.floor((pointer.y - this.gridY) / this.cellSize);
            const shape = this.getRotatedShape(itemId, itemContainer.getData('rotation'));
            if (gridCol >= 0 && gridCol < this.backpackGridSize && gridRow >= 0 && gridRow < this.backpackGridSize) {
                this.ghostImage.setVisible(true);
                this.ghostImage.width = shape[0].length * this.cellSize;
                this.ghostImage.height = shape.length * this.cellSize;
                this.ghostImage.setPosition(this.gridX + gridCol * this.cellSize, this.gridY + gridRow * this.cellSize).setOrigin(0);
                this.ghostImage.setFillStyle(this.canPlaceItem(itemContainer, gridCol, gridRow) ? 0x00ff00 : 0xff0000, 0.5);
            } else {
                this.ghostImage.setVisible(false);
            }
        });

         itemContainer.on('dragend', (pointer) => {
            // isDragging = false; // dragendの後にpointerupが来るので、ここではリセットしない
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

          itemContainer.on('pointerup', (pointer, localX, localY, event) => {
            if (pressTimer) pressTimer.remove();
            
            // ★ タップ判定: ドラッグしておらず、長押しも成立していない場合
            if (!isDragging && !itemContainer.getData('isLongPress')) {
                const itemData = ITEM_DATA[itemId];
                if (!itemData) return;
                
                // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
                // ★★★ シナジー情報を正しく表示するコード ★★★
                // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
                let tooltipText = `【${itemId}】\n\n`;
                if (itemData.recast > 0) tooltipText += `リキャスト: ${itemData.recast}秒\n`;
                if (itemData.action) tooltipText += `効果: ${itemData.action.type} ${itemData.action.value}\n`;
                if (itemData.passive && itemData.passive.effects) {
                    itemData.passive.effects.forEach(e => { tooltipText += `パッシブ: ${e.type} +${e.value}\n`; });
                }
                if (itemData.synergy) {
                    tooltipText += `\nシナジー:\n`;
                    const dir = itemData.synergy.direction;
                    const tag = itemData.synergy.targetTag;
                    const effect = itemData.synergy.effect;
                    tooltipText += `  - ${dir}の[${tag}]に\n`;
                    tooltipText += `    効果: ${effect.type} +${effect.value}\n`;
                }
                
                this.tooltip.show(itemContainer, tooltipText);
                event.stopPropagation();
            }
             isDown = false;
            isDragging = false;
            itemContainer.setData('isLongPress', false);
        });
        
        return itemContainer;
    }

    

    rotateItem(itemContainer) {
        const originalRotation = itemContainer.getData('rotation');
        const newRotation = (originalRotation + 90) % 360;
        itemContainer.setData('rotation', newRotation);
        const gridPos = itemContainer.getData('gridPos');
        if (gridPos) {
            if (!this.canPlaceItem(itemContainer, gridPos.col, gridPos.row)) {
                itemContainer.setData('rotation', originalRotation);
                this.removeItemFromBackpack(itemContainer);
                itemContainer.x = itemContainer.getData('originX');
                itemContainer.y = itemContainer.getData('originY');
                itemContainer.setAngle(0);
                itemContainer.setData('rotation', 0);
                this.updateArrowVisibility(itemContainer);
                return;
            }
        }
        itemContainer.setAngle(newRotation);
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
        this.placedItemImages.push(itemContainer);
        this.updateArrowVisibility(itemContainer);
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
        itemContainer.setData('gridPos', null);
        const index = this.placedItemImages.indexOf(itemContainer);
        if (index > -1) this.placedItemImages.splice(index, 1);
        this.inventoryItemImages.push(itemContainer);
        this.updateArrowVisibility(itemContainer);
    }

    getRotatedShape(itemId, rotation) {
        let shape = ITEM_DATA[itemId].shape;
        if (rotation === 90 || rotation === 270) {
            const newShape = [];
            for (let x = 0; x < shape[0].length; x++) {
                const newRow = [];
                for (let y = shape.length - 1; y >= 0; y--) {
                    newRow.push(shape[y][x]);
                }
                newShape.push(newRow);
            }
            return newShape;
        }
        return shape;
    }

    updateArrowVisibility(itemContainer) {
        const itemId = itemContainer.getData('itemId');
        const itemData = ITEM_DATA[itemId];
        const arrowContainer = itemContainer.getData('arrowContainer');
        if (!arrowContainer) return;
        if (itemData.synergy) {
            arrowContainer.setVisible(true);
            const direction = itemData.synergy.direction;
            const offset = this.cellSize / 2 + 10;
            arrowContainer.each(arrow => arrow.setVisible(false));
            if (direction === 'adjacent') {
                arrowContainer.getByName('up').setVisible(true).setY(-offset);
                arrowContainer.getByName('down').setVisible(true).setY(offset);
                arrowContainer.getByName('left').setVisible(true).setX(-offset);
                arrowContainer.getByName('right').setVisible(true).setX(offset);
            } else if (direction === 'down') arrowContainer.getByName('down').setVisible(true).setY(offset);
        } else {
            arrowContainer.setVisible(false);
        }
    }
    
    shutdown() {
        console.log("BattleScene: shutdown されました。");
    }
}