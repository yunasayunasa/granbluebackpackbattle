// BattleScene.js (最終決定版・完全体)
import { ITEM_DATA } from '../core/ItemData.js';
import Tooltip from '../ui/Tooltip.js';
// BattleScene.js の上部に追加

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
    fire:  { threshold: 3, description: (count) => `攻撃力+${Math.floor(count / 2)}` },
    wind:  { threshold: 3, description: (count) => `リキャスト-${(0.2 * (count - 2)).toFixed(1)}s` },
    earth: { threshold: 3, description: (count) => `ブロック効果+${count * 2}` },
    // 他の属性もここに追加
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
        this.battleEnded = false;
         this.ghostImage = null;
         this.finalizedPlayerItems = [];
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
          const initialInventory = ['sword', 'shield', 'potion', 'item_spiky_shield','leather_armor', 'berserker_axe'];
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

   // BattleScene.js にこのメソッドを貼り付けて、既存のものと置き換えてください
prepareForBattle() {
    console.log("--- 戦闘準備開始 ---");
    
    // 0. 全ての配置済みアイテムの「戦闘用コピー」を作成
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

    // prepareForBattle の STEP 1 をこれに置き換え
// ★★★ STEP 1: 属性共鳴バフの計算 ★★★
console.log("属性共鳴の計算を開始...");
const elementCounts = { fire: 0, water: 0, earth: 0, wind: 0, light: 0, dark: 0 };
const elementKeys = Object.keys(elementCounts);

playerFinalItems.forEach(item => {
    item.tags.forEach(tag => {
        if (elementKeys.includes(tag)) {
            elementCounts[tag]++;
        }
    });
});
console.log("配置済みアイテムの属性カウント:", elementCounts);

// ★★★ 修正箇所 ★★★
// 定義したルールブック(ELEMENT_RESONANCE_RULES)に基づいてバフを適用
for (const element in ELEMENT_RESONANCE_RULES) {
    const rule = ELEMENT_RESONANCE_RULES[element];
    const count = elementCounts[element] || 0;

    if (count >= rule.threshold) {
        const effectDesc = rule.description(count);
        console.log(`🔥 属性共鳴発動！ [${element}]属性: ${effectDesc}`);
        
        // 各属性ごとの効果を適用
        playerFinalItems.forEach(item => {
            if (item.tags.includes(element)) {
                if (element === 'fire' && item.action) {
                    item.action.value += Math.floor(count / 2);
                }
                if (element === 'wind' && item.recast) {
                    item.recast = Math.max(0.1, item.recast - (0.2 * (count - 2)));
                }
                if (element === 'earth') {
                    const bonus = count * 2;
                    if (item.action && item.action.type === 'block') item.action.value += bonus;
                    if (item.synergy && item.synergy.effect.type.includes('block')) {
                        item.synergy.effect.value += bonus;
                    }
                }
                // ... 他の属性効果もここに追加
            }
        });
    }
}


    // ★★★ STEP 2: 隣接 & 方向シナジーの計算 ★★★
    
     console.log("隣接・方向シナジーの計算を開始...");
    playerFinalItems.forEach((sourceItem, sourceIndex) => {
        if (!sourceItem.synergy) return;

        playerFinalItems.forEach((targetItem, targetIndex) => {
            // ★★★ 修正箇所 ★★★
            // targetTagのチェックを削除。自分自身でなければOK。
            if (sourceIndex === targetIndex) {
                return;
            }
       
              let synergyAppliedForThisPair = false;
            const sourceShape = this.getRotatedShape(sourceItem.id, sourceItem.rotation);
            const targetShape = this.getRotatedShape(targetItem.id, targetItem.rotation);

            for (let sr = 0; sr < sourceShape.length; sr++) {
                if (synergyAppliedForThisPair) break;
                for (let sc = 0; sc < sourceShape[sr].length; sc++) {
                    if (synergyAppliedForThisPair) break;
                    if (sourceShape[sr][sc] === 0) continue;

                    const sourceCellPos = { r: sourceItem.row + sr, c: sourceItem.col + sc };

                    for (let tr = 0; tr < targetShape.length; tr++) {
                        if (synergyAppliedForThisPair) break;
                        for (let tc = 0; tc < targetShape[tr].length; tc++) {
                            if (targetShape[tr][tc] === 0) continue;

                            const targetCellPos = { r: targetItem.row + tr, c: targetItem.col + tc };
                            let isMatch = false;
                            
                            if (sourceItem.synergy.direction === 'adjacent') {
                                isMatch = Math.abs(sourceCellPos.r - targetCellPos.r) + Math.abs(sourceCellPos.c - targetCellPos.c) === 1;
                            } else {
                                let targetDir = {r: 0, c: 0};
                                switch(sourceItem.synergy.direction) {
                                    case 'up':    targetDir = {r: -1, c: 0}; break;
                                    case 'down':  targetDir = {r: 1, c: 0}; break;
                                    case 'left':  targetDir = {r: 0, c: -1}; break;
                                    case 'right': targetDir = {r: 0, c: 1}; break;
                                }

                                const rad = Phaser.Math.DegToRad(sourceItem.rotation);
                                const rotatedC = Math.round(targetDir.c * Math.cos(rad) - targetDir.r * Math.sin(rad));
                                const rotatedR = Math.round(targetDir.c * Math.sin(rad) + targetDir.r * Math.cos(rad));
                                
                                if (sourceCellPos.r + rotatedR === targetCellPos.r && sourceCellPos.c + rotatedC === targetCellPos.c) {
                                    isMatch = true;
                                }
                            }

                            if (isMatch) {
                                const effect = sourceItem.synergy.effect;
                                if (effect.type === 'add_attack' && targetItem.action) {
                                    targetItem.action.value += effect.value;
                                    console.log(`★ シナジー適用: [${sourceItem.id}] -> [${targetItem.id}] に 攻撃力+${effect.value}`);
                                }
                                if (effect.type === 'add_recast' && targetItem.recast > 0) {
                                    targetItem.recast = Math.max(0.1, targetItem.recast + effect.value);
                                     console.log(`★ シナジー適用: [${sourceItem.id}] -> [${targetItem.id}] に リキャスト${effect.value}秒`);
                                }
                                synergyAppliedForThisPair = true;
                                break;
                            }
                        }
                    }
                }
            }
        });
    });
    console.log("シナジー計算完了。");

    // ★★★ STEP 3: 最終ステータスの計算 ★★★ (ここは変更なし)
    let finalMaxHp = this.initialBattleParams.playerMaxHp;
    let finalDefense = 0;
    this.playerBattleItems = [];
  

    for (const item of playerFinalItems) {
        if (item.passive && item.passive.effects) {
            for(const effect of item.passive.effects){
                if (effect.type === 'defense') finalDefense += effect.value;
                if (effect.type === 'max_hp') finalMaxHp += effect.value;
            }
        }
        if (item.recast > 0) {
            this.playerBattleItems.push({ data: item, nextActionTime: item.recast });
        }
    }
    finalMaxHp = Math.max(1, finalMaxHp);
    this.stateManager.setF('player_max_hp', finalMaxHp);
    this.stateManager.setF('player_hp', finalMaxHp);
    this.playerStats = { attack: 0, defense: finalDefense, hp: finalMaxHp, block: 0 };
    this.finalizedPlayerItems = playerFinalItems; // ★★★ この行を追加 ★★★
    console.log("プレイヤー最終ステータス:", this.playerStats);
    
    // 4. 敵のステータス初期化
    this.enemyStats = { attack: 0, defense: 2, hp: this.stateManager.f.enemy_hp, block: 0 };
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

   // BattleScene.js の executeAction メソッド (シンタックス修正・完成版)

  // BattleScene.js にこのメソッドを貼り付けて、既存のものと置き換えてください
// BattleScene.js の executeAction をこれに置き換え
executeAction(itemData, attacker, defender) {
    const action = itemData.action;
    if (!action) return;

    // const attackerStats = this[`${attacker}Stats`]; // もう不要
    const defenderStats = this[`${defender}Stats`];
    
    const itemName = itemData.id || "アイテム";

    if (action.type === 'attack') {
        // ★★★ 修正箇所 ★★★
        // アイテムの火力（バフ込み）をそのまま攻撃力とする
        const totalAttack = action.value; 
        let damage = Math.max(0, totalAttack - defenderStats.defense);
        
        // (以降のロジックは変更なし)
        if (defenderStats.block > 0 && damage > 0) {
            const blockDamage = Math.min(defenderStats.block, damage);
            defenderStats.block -= blockDamage;
            damage -= blockDamage;
            console.log(` > ${defender}が${blockDamage}ダメージをブロック！ (残りブロック: ${defenderStats.block})`);
        }

        if (damage > 0) {
            const newHp = defenderStats.hp - damage;
            defenderStats.hp = newHp;
            this.stateManager.setF(`${defender}_hp`, newHp);
            console.log(` > ${attacker}の${itemName}が攻撃！ ${defender}に${damage}ダメージ (合計攻撃力: ${totalAttack}, 残りHP: ${newHp})`);
            
            if (newHp <= 0) {
                this.gameState = 'end';
                this.endBattle(attacker === 'player' ? 'win' : 'lose');
            }
        } else {
             console.log(` > ${attacker}の${itemName}の攻撃は防がれた！ (合計攻撃力: ${totalAttack})`);
        }
    }
    
    else if (action.type === 'block') {
        // attackerStats はブロック計算で必要なので残す
        const attackerStats = this[`${attacker}Stats`]; 
        attackerStats.block += action.value;
        console.log(` > ${attacker}の${itemName}が発動！ ブロックを${action.value}獲得 (合計ブロック: ${attackerStats.block})`);
    }
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

    
  // BattleScene.js にこのメソッドを貼り付けて、既存のものと置き換えてください
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

        // 日本語変換ヘルパー関数
        const t = (key) => TOOLTIP_TRANSLATIONS[key] || key;
        
        let tooltipText = `【${itemId}】\n`;

        // 属性の表示
        const itemElements = baseItemData.tags.filter(tag => ELEMENT_RESONANCE_RULES[tag]);
        if (itemElements.length > 0) {
            tooltipText += `属性: [${itemElements.map(el => t(el)).join(', ')}]\n`;
        }
        tooltipText += '\n';

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

        // 属性共鳴ルールの表示
        tooltipText += `\n--- 属性共鳴 ---\n`;
        for (const element in ELEMENT_RESONANCE_RULES) {
            const rule = ELEMENT_RESONANCE_RULES[element];
            const effectText = rule.description(rule.threshold); // 閾値時点での効果を表示
            tooltipText += `[${t(element)}] ${rule.threshold}体以上: ${effectText}\n`;
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

            switch(direction) {
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
    
    shutdown() {
        console.log("BattleScene: shutdown されました。");
    }
}
