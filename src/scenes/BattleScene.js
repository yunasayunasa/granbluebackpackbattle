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
    fire: { threshold: 3, description: (count) => `攻撃力+${Math.floor(count / 2)}` },
    wind: { threshold: 3, description: (count) => `リキャスト-${(0.2 * (count - 2)).toFixed(1)}s` },
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

    // BattleScene.js の init をこれに置き換え
    // BattleScene.js の init をこのシンプルなバージョンに置き換えてください
    init(data) {
        // データ受け渡しに起因するバグをなくすため、ここでは何もしない。
        // 全ての初期化は create で行う。
        console.log("BattleScene: init (空)");
    }
// BattleScene.js の create を、この最終確定版に置き換えてください
create() {
    console.log("BattleScene: create - データ永続化対応版 (sf)");

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

    // --- 1b. 戦闘パラメータを決定
    const initialPlayerMaxHp = this.stateManager.f.player_max_hp || 100;
    const initialPlayerHp = this.stateManager.f.player_hp || initialPlayerMaxHp;
    const round = this.stateManager.sf.round || 1;
    this.initialBattleParams = { playerMaxHp: initialPlayerMaxHp, playerHp: initialPlayerHp, round: round };


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
    this.stateManager.setF('enemy_max_hp', 100);
    this.stateManager.setF('enemy_hp', 100);

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
    for (let i = 0; i <= this.backpackGridSize; i++) { this.add.line(0,0,this.gridX,this.gridY+i*this.cellSize,this.gridX+gridWidth,this.gridY+i*this.cellSize,0x666666,0.5).setOrigin(0).setDepth(2); this.add.line(0,0,this.gridX+i*this.cellSize,this.gridY,this.gridX+i*this.cellSize,this.gridY+gridHeight,0x666666,0.5).setOrigin(0).setDepth(2); } // prettier-ignore
    this.playerAvatar = this.add.sprite(this.gridX + gridWidth + 80, this.gridY + gridHeight / 2, 'player_avatar_placeholder').setOrigin(0.5).setDepth(5);
    const enemyGridX = gameWidth - 100 - gridWidth;
    const enemyGridY = this.gridY; 
    this.add.rectangle(enemyGridX + gridWidth / 2, this.gridY + gridHeight / 2, gridWidth, gridHeight, 0x500000, 0.9).setDepth(1);
    for (let i = 0; i <= this.backpackGridSize; i++) { this.add.line(0,0,enemyGridX,this.gridY+i*this.cellSize,enemyGridX+gridWidth,this.gridY+i*this.cellSize,0x888888,0.5).setOrigin(0).setDepth(2); this.add.line(0,0,enemyGridX+i*this.cellSize,this.gridY,enemyGridX+i*this.cellSize,this.gridY+gridHeight,0x888888,0.5).setOrigin(0).setDepth(2); } // prettier-ignore
    this.enemyAvatar = this.add.sprite(enemyGridX - 80, this.gridY + gridHeight / 2, 'enemy_avatar_placeholder').setOrigin(0.5).setDepth(5);
    const maxAvatarHeight = gridHeight * 0.8;
    [this.playerAvatar, this.enemyAvatar].forEach(avatar => { if (avatar.height > maxAvatarHeight) { avatar.setScale(maxAvatarHeight / avatar.height); } });

    // --- 3c. 敵アイテムの配置
    const enemyLayouts = { 1: { 'sword': { pos: [2, 2], angle: 0 } } };
    const currentLayout = enemyLayouts[this.initialBattleParams.round] || {};
    for (const itemId in currentLayout) {
        const itemData = ITEM_DATA[itemId];
        if (!itemData) continue;
        const pos = currentLayout[itemId].pos;
        const containerWidth = itemData.shape[0].length * this.cellSize;
        const containerHeight = itemData.shape.length * this.cellSize;
        const itemContainer = this.add.container(
            enemyGridX + (pos[1] * this.cellSize) + (containerWidth / 2),
            enemyGridY + (pos[0] * this.cellSize) + (containerHeight / 2)
        ).setSize(containerWidth, containerHeight);

        const itemImage = this.add.image(0, 0, itemData.storage).setDisplaySize(containerWidth, containerHeight);
        const recastOverlay = this.add.image(0, 0, itemData.storage).setDisplaySize(containerWidth, containerHeight).setTint(0x00aaff, 0.3).setVisible(false);
        const maskGraphics = this.add.graphics().setVisible(false);
        recastOverlay.setMask(maskGraphics.createGeometryMask());
        
        itemContainer.add([itemImage, recastOverlay, maskGraphics]);
        itemContainer.setData({ itemId, recastOverlay, recastMask: maskGraphics });

        if (itemData.recast > 0) { recastOverlay.setVisible(true); }

        itemContainer.setDepth(3).setInteractive({ draggable: false });
        itemContainer.on('pointerup', (pointer, localX, localY, event) => {
            const itemData = ITEM_DATA[itemId];
            if (!itemData) return;
            let tooltipText = `【${itemId}】\n\n`;
            if (itemData.recast > 0) tooltipText += `リキャスト: ${itemData.recast}秒\n`;
            if (itemData.action) tooltipText += `効果: ${itemData.action.type} ${itemData.action.value}\n`;
            if (itemData.passive && itemData.passive.effects) { itemData.passive.effects.forEach(e => { tooltipText += `パッシブ: ${e.type} +${e.value}\n`; }); }
            if (itemData.synergy) { tooltipText += `\nシナジー:\n  - ${itemData.synergy.direction}の[${itemData.synergy.targetTag || 'any'}]に\n    効果: ${itemData.synergy.effect.type} +${itemData.synergy.effect.value}\n`; }
            this.tooltip.show(itemContainer, tooltipText);
            event.stopPropagation();
        });
        this.enemyItemImages.push(itemContainer);
    }

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
    const inventoryAreaY = 520;
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
        const y = inventoryAreaY + inventoryAreaHeight / 2 + 20;
        const itemContainer = this.createItem(itemId, x, y);
        if (itemContainer) { this.inventoryItemImages.push(itemContainer); }
    });


  // =================================================================
    // STEP 5: イベントリスナーと完了通知
    // =================================================================
      // --- 5a. 戦闘開始ボタン ★★★ このブロックが復活しました ★★★
    this.startBattleButton = this.add.text(gameWidth / 2, inventoryAreaY - 40, '戦闘開始', { fontSize: '28px', backgroundColor: '#080', padding: {x:20, y:10} }).setOrigin(0.5).setInteractive().setDepth(11);
    this.prepareContainer.add(this.startBattleButton);
    
    this.startBattleButton.on('pointerdown', () => {
        if (this.gameState !== 'prepare') return;
        
         // 現在の盤面をsf変数に保存
        const newBackpackData = {};
        this.placedItemImages.forEach((item, index) => {
            const gridPos = item.getData('gridPos');
            if(gridPos){ // 安全策：グリッド位置がなければ保存しない
                newBackpackData[`uid_${index}`] = {
                    itemId: item.getData('itemId'),
                    row: gridPos.row,
                    col: gridPos.col,
                    rotation: item.getData('rotation')
                };
            }
        });
        const newInventoryData = this.inventoryItemImages.map(item => item.getData('itemId'));
        
        // ★★★ setSFを使って自動保存 ★★★
        this.stateManager.setSF('player_backpack', newBackpackData);
        this.stateManager.setSF('player_inventory', newInventoryData);
        
        // 戦闘開始処理
        this.gameState = 'battle';
        this.prepareForBattle();
        
        const allPlayerItems = [...this.inventoryItemImages, ...this.placedItemImages];
        allPlayerItems.forEach(item => { if (item.input) item.input.enabled = false; });
        this.startBattleButton.input.enabled = false;

        this.tweens.add({
            targets: this.prepareContainer,
            alpha: 0,
            duration: 300,
            onComplete: () => { this.prepareContainer.setVisible(false); }
        });
        
        // ★戦闘開始のディレイを削除
        // this.time.delayedCall(500, this.startBattle, [], this);
        this.startBattle();
    });

    // --- 5b. グローバルクリック（ツールチップ非表示用）
    this.input.on('pointerdown', (pointer) => { if (!pointer.gameObject && this.tooltip.visible) { this.tooltip.hide(); } }, this);

    // --- 5c. 準備完了をSystemSceneに通知
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
                                    let targetDir = { r: 0, c: 0 };
                                    switch (sourceItem.synergy.direction) {
                                        case 'up': targetDir = { r: -1, c: 0 }; break;
                                        case 'down': targetDir = { r: 1, c: 0 }; break;
                                        case 'left': targetDir = { r: 0, c: -1 }; break;
                                        case 'right': targetDir = { r: 0, c: 1 }; break;
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
                for (const effect of item.passive.effects) {
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
        this.playerStats = {
            max_hp: finalMaxHp, // ★追加
            hp: finalMaxHp,
            defense: finalDefense,
            block: 0,
            attack: 0 // attackは0のまま
        };
        this.finalizedPlayerItems = playerFinalItems; // ★★★ この行を追加 ★★★
        console.log("プレイヤー最終ステータス:", this.playerStats);

        // 4. 敵のステータス初期化
        const enemyMaxHp = this.stateManager.f.enemy_max_hp; // ★敵の最大HPも取得
        this.enemyStats = {
            max_hp: enemyMaxHp, // ★追加
            hp: enemyMaxHp,
            defense: 2,
            block: 0,
            attack: 0
        };
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

    /**
   * ダメージ発生時のすべての視覚エフェクトを再生する
   * @param {string} targetSide - 'player' または 'enemy'
   * @param {number} amount - ダメージ量
   */
    playDamageEffects(targetSide, amount) {
        if (amount <= 0) return;

        const damage = Math.floor(amount);
        let targetAvatar = (targetSide === 'player') ? this.playerAvatar : this.enemyAvatar;
        if (!targetAvatar) return;
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
        }).setOrigin(0.5).setDepth(999);

        // ★★★ ここからが修正箇所 ★★★
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
        // ダメージ量に応じて揺れの強さと時間を変える
        const shakeIntensity = Math.min(0.015, 0.002 + damage * 0.0002);
        const shakeDuration = Math.min(200, 100 + damage * 2);
        this.cameras.main.shake(shakeDuration, shakeIntensity);

        // --- 3. 赤点滅ティント ---
        // 4回点滅させる (白 -> 赤 -> 白 -> 赤)
        let blinkCount = 0;
        this.time.addEvent({
            delay: 80, // 点滅の間隔
            callback: () => {
                targetAvatar.setTint(blinkCount % 2 === 0 ? 0xff0000 : 0xffffff);
                blinkCount++;
            },
            repeat: 3, // (最初の1回 + repeat 3回 = 合計4回)
            onComplete: () => {
                targetAvatar.clearTint(); // 最後に必ずティントをクリア
            }
        });

        // --- 4. 斬撃ラインエフェクト (演出修正版) ---
        const centerX = targetAvatar.x;
        const centerY = targetAvatar.y;

        // エフェクト全体をまとめるコンテナを作成し、アバターの位置に配置
        const effectContainer = this.add.container(centerX, centerY).setDepth(1001);

        const slashGraphics = this.add.graphics();
        effectContainer.add(slashGraphics); // Graphicsをコンテナに入れる

        const lineLength = targetAvatar.displayWidth * 1.2;

        // 線の色と太さをここで明確に指定
        slashGraphics.lineStyle(8, 0xffffff, 1.0); // 太い白線

        // 2本の線を交差させて「斬」の形を作る
        // 1本目（＼）
        slashGraphics.beginPath();
        slashGraphics.moveTo(-lineLength / 2, -lineLength / 2);
        slashGraphics.lineTo(lineLength / 2, lineLength / 2);
        slashGraphics.strokePath();
        // 2本目（／）
        slashGraphics.beginPath();
        slashGraphics.moveTo(lineLength / 2, -lineLength / 2);
        slashGraphics.lineTo(-lineLength / 2, lineLength / 2);
        slashGraphics.strokePath();

        // アニメーションは、Graphicsではなく、親のコンテナに対してかける
        effectContainer.setAlpha(0.8);
        effectContainer.setScale(0.3);
        effectContainer.setAngle(Phaser.Math.DegToRad(Phaser.Math.Between(-25, 25))); // 少しランダムに傾ける

        this.tweens.add({
            targets: effectContainer,
            scale: 1.0,
            alpha: 0,
            duration: 250,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                effectContainer.destroy(); // コンテナごと破棄
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

    // BattleScene.js にこの新しいメソッドを追加してください
    playFinishBlowEffects(targetAvatar) {
        if (!targetAvatar) return;

        // 1. スローモーション開始
        this.time.timeScale = 0.2; // 時間の進みを1/5にする

        // 2. 派手な斬撃エフェクト（通常とは別）
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;

        const finishEffect = this.add.graphics().setDepth(2000);
        finishEffect.lineStyle(15, 0xffdd00, 1.0); // 金色で太い線

        const w = this.scale.width * 1.2;
        finishEffect.beginPath();
        finishEffect.moveTo(centerX - w, centerY - w);
        finishEffect.lineTo(centerX + w, centerY + w);
        finishEffect.strokePath();

        finishEffect.setAngle(Phaser.Math.DegToRad(-20));
        finishEffect.setAlpha(0);
        finishEffect.setScale(2.0);

        this.tweens.add({
            targets: finishEffect,
            alpha: 1.0,
            scale: 1.0,
            duration: 200, // スロー中でもここは実時間
            ease: 'Cubic.easeIn',
            yoyo: true, // 表示された後、逆再生で消える
            onComplete: () => {
                finishEffect.destroy();
            }
        });

        // 3. スローモーション解除とバトル終了処理
        this.time.delayedCall(1500, () => { // 1.5秒後に実行
            this.time.timeScale = 1.0; // 時間の進みを元に戻す
             // ★★★ ここからが修正箇所 ★★★
        
        // ラウンド数を進める
        const currentRound = this.stateManager.sf.round || 1;
        this.stateManager.setSF('round', currentRound + 1);
        
        // 現在のHPを保存
        this.stateManager.setF('player_hp', this.playerStats.hp);

        // SystemSceneに報酬シーンへの遷移を依頼
        this.scene.get('SystemScene').events.emit('request-scene-transition', {
            to: 'RewardScene',
            from: this.scene.key
        });

        // ★★★ 修正ここまで ★★★
    }, [], this);
}
    shutdown() {
        console.log("BattleScene: shutdown されました。");
    }
}
