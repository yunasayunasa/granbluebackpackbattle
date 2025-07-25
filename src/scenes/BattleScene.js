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
        this.enemyItemImages = [];
        this.playerAvatar = null; // ★追加
this.enemyAvatar = null;  // ★追加
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
        this.enemyItemImages = [];
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
// ★★★ ここから追加 ★★★
// 3a-2. プレイヤーアバターの配置
this.playerAvatar = this.add.sprite(
    this.gridX - 80, // グリッドの左側に配置
    this.gridY + gridHeight / 2,
    'player_avatar_placeholder' // ★事前にロードが必要なアバター画像キー
).setOrigin(0.5).setDepth(5);
        // 3b. 敵グリッドと敵アイテム
        const enemyGridX = gameWidth - 100 - gridWidth;
        const enemyGridY = this.gridY;
        this.add.rectangle(enemyGridX + gridWidth / 2, enemyGridY + gridHeight / 2, gridWidth, gridHeight, 0x500000, 0.9).setDepth(1);
        for (let i = 0; i <= this.backpackGridSize; i++) {
            this.add.line(0, 0, enemyGridX, enemyGridY + i * this.cellSize, enemyGridX + gridWidth, enemyGridY + i * this.cellSize, 0x888888, 0.5).setOrigin(0).setDepth(2);
            this.add.line(0, 0, enemyGridX + i * this.cellSize, enemyGridY, enemyGridX + i * this.cellSize, enemyGridY + gridHeight, 0x888888, 0.5).setOrigin(0).setDepth(2);
        }
        // 3b-2. 敵アバターの配置
this.enemyAvatar = this.add.sprite(
    enemyGridX + gridWidth + 80, // グリッドの右側に配置
    enemyGridY + gridHeight / 2,
    'enemy_avatar_placeholder' // ★事前にロードが必要なアバター画像キー
).setOrigin(0.5).setDepth(5);
// ★★★ 追加ここまで ★★★

        const enemyLayouts = { 1: { 'sword': { pos: [2, 2], angle: 0 } } };
const currentRound = this.initialBattleParams.round;
const currentLayout = enemyLayouts[currentRound] || {};

// ★★★ ここから修正 ★★★
this.enemyItemImages = []; // createの開始時に一度クリア
for (const itemId in currentLayout) {
    const itemData = ITEM_DATA[itemId];
    if (!itemData) continue;
    const pos = currentLayout[itemId].pos;

    // itemImage を itemContainer に変更し、プレイヤー側と構造を合わせる
    const containerWidth = itemData.shape[0].length * this.cellSize;
    const containerHeight = itemData.shape.length * this.cellSize;
    const itemContainer = this.add.container(
        enemyGridX + (pos[1] * this.cellSize) + (containerWidth / 2),
        enemyGridY + (pos[0] * this.cellSize) + (containerHeight / 2)
    ).setSize(containerWidth, containerHeight);

     // 1. ベース画像
    const itemImage = this.add.image(0, 0, itemData.storage)
        .setDisplaySize(containerWidth, containerHeight);
        
    // ★★★ ここからが追加/変更箇所 ★★★

    // 2. リキャストオーバーレイ
    const recastOverlay = this.add.image(0, 0, itemData.storage)
        .setDisplaySize(containerWidth, containerHeight)
        .setTint(0x00aaff, 0.3)
        .setVisible(false);

    // 3. マスク
    // ★★★ ここからが修正箇所 ★★★
const maskGraphics = this.add.graphics();
maskGraphics.setVisible(false);
recastOverlay.setMask(maskGraphics.createGeometryMask());
// ★★★ 修正箇所ここまで ★★★
    // コンテナに追加
   itemContainer.add([itemImage, recastOverlay, maskGraphics]);
    // データをコンテナに持たせる
    itemContainer.setData({
        itemId,
        recastOverlay: recastOverlay, // ★追加
        recastMask: maskGraphics      // ★追加
    });

    // リキャストがなければ非表示
    if (!itemData.recast || itemData.recast <= 0) {
        recastOverlay.setVisible(false);
    } else {
        recastOverlay.setVisible(true);
    }
    
    itemContainer.setDepth(3).setInteractive({ draggable: false });
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
                
                this.tooltip.show(itemContainer, tooltipText);
                event.stopPropagation();
            });
         this.enemyItemImages.push(itemContainer); // ★生成したコンテナを配列に追加
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
   this.placedItemImages.forEach((itemContainer, index) => {
    const itemInstance = JSON.parse(JSON.stringify(ITEM_DATA[itemContainer.getData('itemId')]));
        itemInstance.id = itemContainer.getData('itemId');
        const gridPos = itemContainer.getData('gridPos');
        itemInstance.row = gridPos.row;
        itemInstance.col = gridPos.col;
        itemInstance.rotation = itemContainer.getData('rotation') || 0;
        itemInstance.gameObject = itemContainer; // ★★★ GameObjectへの参照を直接持たせる
    playerFinalItems.push(itemInstance);
});
    

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
                { x: w / 2,  y: h / 2 - fillHeight }, // 右下
                { x: w / 2,  y: h / 2 },              // 右上
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
executeAction(itemData, attacker, defender, attackerObject) {
    if (attackerObject) {
        this.playAttackAnimation(attackerObject, attacker);
    }

    const action = itemData.action;
    if (!action) return;

    const defenderStats = this[`${defender}Stats`];
    const itemName = itemData.id || "アイテム";

    if (action.type === 'attack') {
        const totalAttack = action.value;
        let damage = Math.max(0, totalAttack - defenderStats.defense);
        let blockedDamage = 0; // ブロックしたダメージ量を記録

        if (defenderStats.block > 0 && damage > 0) {
            blockedDamage = Math.min(defenderStats.block, damage);
            defenderStats.block -= blockedDamage;
            damage -= blockedDamage;
             this.showBlockSuccessIcon(defender);
            console.log(` > ${defender}が${blockedDamage}ダメージをブロック！`);
        }

        if (blockedDamage > 0) {
            // ★★★ 修正箇所 ★★★
            // ブロック成功エフェクトを表示
            // defenderのGameObjectを特定する必要がある
            let defenderObject = null;
            if(defender === 'player'){
                // プレイヤーが攻撃された場合、誰が受けたか？という問題。一旦全体の位置に。
            } else { // 敵が攻撃された場合
                 // 敵の中から誰か（今は一人しかいない想定）
                defenderObject = this.enemyItemImages[0];
            }
            // ★将来的には攻撃対象を特定するロジックが必要
            this.showBlockSuccessIcon(defenderObject);
        }

        if (damage > 0) {
            this.showDamagePopup(defender, Math.floor(damage));
            const newHp = defenderStats.hp - damage;
            defenderStats.hp = newHp;
            this.stateManager.setF(`${defender}_hp`, newHp);
              this.showDamagePopup(defender, Math.floor(damage));
            console.log(` > ${attacker}の${itemName}が攻撃！...`);
            
            if (newHp <= 0) {
                this.gameState = 'end';
                this.endBattle(attacker === 'player' ? 'win' : 'lose');
            }
        } else if(blockedDamage > 0) {
            console.log(` > ${attacker}の${itemName}の攻撃は完全に防がれた！`);
        } else {
            console.log(` > ${attacker}の${itemName}の攻撃は防がれた！`);
        }
    }
    
    else if (action.type === 'block') {
        const attackerStats = this[`${attacker}Stats`]; 
        attackerStats.block += action.value;
        console.log(` > ${attacker}の${itemName}が発動！ ブロックを${action.value}獲得...`);
        
           let targetAvatar = (attacker === 'player') ? this.playerAvatar : this.enemyAvatar;
        this.showGainBlockPopup(targetAvatar, action.value);
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

// BattleScene.js にこの新しいメソッドを追加してください
showDamagePopup(target, amount) {
    if (amount <= 0) return; // 0以下のダメージは表示しない

    // ダメージ量に応じてスタイルを決定
    let fontSize = 24;
    let fill = '#ffffff'; // 通常ダメージの色 (白)
    let stroke = '#000000';
    let strokeThickness = 4;

    if (amount >= 50) { // 大ダメージ
        fontSize = 48;
        fill = '#ff0000'; // 赤色
        stroke = '#ffffff';
        strokeThickness = 6;
    } else if (amount >= 20) { // 中ダメージ
        fontSize = 36;
        fill = '#ffdd00'; // 黄色
    }
    
    // 表示テキストを作成
    const damageText = this.add.text(0, 0, amount.toString(), {
        fontSize: `${fontSize}px`,
        fill: fill,
        stroke: stroke,
        strokeThickness: strokeThickness,
        fontStyle: 'bold'
    }).setOrigin(0.5);

    // どのキャラクターに追従するかを決める
    // target は 'player' または 'enemy' という文字列
    // ★★★ 注意：ここではまだ敵キャラクターのオブジェクトがないため、仮の位置に表示します ★★★
    // 後で敵キャラクターのGameObjectを管理する仕組みができたら、そこと連携させます
    let targetX, targetY;
// ★★★ 修正箇所 ★★★
if (target === 'player') {
    targetX = this.playerAvatar.x;
    targetY = this.playerAvatar.y;
} else { // 'enemy'
    targetX = this.enemyAvatar.x;
    targetY = this.enemyAvatar.y;
}
    
    // テキストの初期位置を設定
    damageText.setPosition(targetX, targetY - (this.playerAvatar.height / 2));
    damageText.setDepth(999); // 最前面に表示

    // ランダムな横揺れと上昇しながら消えるTween
    this.tweens.add({
        targets: damageText,
        x: targetX + Phaser.Math.Between(-40, 40), // 左右にランダムに-40pxから+40pxの間で揺れる
        y: targetY - 100, // 100px上昇
        alpha: 0,
        duration: 1500,
        ease: 'Power1',
        onComplete: () => {
            damageText.destroy(); // Tween完了後にオブジェクトを破棄
        }
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

    shutdown() {
        console.log("BattleScene: shutdown されました。");
    }
}
