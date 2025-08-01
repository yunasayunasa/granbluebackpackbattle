// scenes/RankMatchBattleScene.js

import BattleScene from './BattleScene.js';
import { ITEM_DATA } from '../core/ItemData.js';

export default class RankMatchBattleScene extends BattleScene {
     constructor() {
        // ★★★ super() に、このシーン専用のユニークなキーを渡す ★★★
        super();
        this.ghostData = null; // 対戦相手のゴーストデータを保持するプロパティ
    }

    init(data) {
        this.scene.key = 'RankMatchBattleScene';
        super.init(data);
        
        // ★ ghostData -> ghostDataList に変更
        this.ghostData = data.transitionParams.ghostDataList; 
        if (!this.ghostData) {
            console.error("RankMatchBattleScene: ゴーストデータが渡されませんでした！");
            // エラーハンドリング: タイトルに戻るなど
            this.scene.get('SystemScene').events.emit('request-scene-transition', { to: 'GameScene', from: this.scene.key, params: { storage: 'title.ks' } });
        }
    }

    create() {
        // 親クラスのcreateメソッドを呼び出して、基本的な描画を全て行わせる
        super.create();

        // ★★★ ランクマッチ専用の変更点 ★★★

        // 1. 敵のアバターを「ゴースト」アバターに設定
        this.enemyAvatar.setTexture('avatar_ghost');

        // 2. 敵のHPを、ゴーストデータのものを反映させる
        //    (prepareForBattleで参照される値を上書き)
        const enemyHp = this.ghostData.base_max_hp || 100;
        this.stateManager.setF('enemy_max_hp', enemyHp);
        this.stateManager.setF('enemy_hp', enemyHp);

        // 3. タイトルやラウンド表示をランクマッチ用に変更
        //    (これはUI/UXの好みに応じて後で調整)
        console.log(`ランクマッチ開始！ Round ${this.ghostData.round} のゴーストと対戦します。`);
    }

    // RankMatchBattleScene.js 内

    /**
     * ★★★ 敵のセットアップ処理をオーバーライド ★★★
     * ゴーストデータがあれば盤面を再現し、なければEnemyGeneratorで生成する
     */
    setupEnemy(gridY) {
        // 現在のラウンドに対応するゴーストデータをリストから取得
        const currentRound = this.stateManager.sf.round || 1;
        // this.ghostData は init で受け取った10人分のリスト
        const ghostForThisRound = this.ghostData[currentRound - 1]; 

        if (ghostForThisRound && ghostForThisRound !== 'generate') {
            // --- A: ゴーストデータが存在する場合の処理 ---
            console.log(`Round ${currentRound}: ゴーストデータから敵の盤面を再現します。`);
            this.setupEnemyFromGhost(gridY, ghostForThisRound.backpack);
            
            // 敵のHPもゴーストのものを反映
            const enemyHp = ghostForThisRound.base_max_hp || 100;
            this.stateManager.setF('enemy_max_hp', enemyHp);
            this.stateManager.setF('enemy_hp', enemyHp);

        } else {
            // --- B: ゴーストデータがない('generate')、またはnullだった場合の処理 ---
            console.log(`Round ${currentRound}: 通常の敵を生成します。`);
            // 親クラス(BattleScene)の敵生成ロジックを借用
            const enemyData = EnemyGenerator.getLayoutForRound(currentRound);
            this.currentEnemyLayout = enemyData.layout;
            super.setupEnemy(gridY, this.currentEnemyLayout);
        }
    }

    /**
     * ゴーストデータのbackpack情報から敵を配置するヘルパーメソッド
     * @private
     */
    setupEnemyFromGhost(gridY, ghostLayout) {
        const gameWidth = this.scale.width;
        const gridWidth = this.backpackGridSize * this.cellSize;
        const enemyGridX = gameWidth - 100 - gridWidth;

        this.enemyItemImages.forEach(item => item.destroy());
        this.enemyItemImages = [];

        for (const uid in ghostLayout) {
            const itemInfo = ghostLayout[uid];
            const itemData = ITEM_DATA[itemInfo.itemId];
            if (!itemData) { continue; }

            const shape = this.getRotatedShape(itemInfo.itemId, itemInfo.rotation);
            const containerWidth = shape[0].length * this.cellSize;
            const containerHeight = shape.length * this.cellSize;
            
            const itemContainer = this.add.container(
                enemyGridX + (itemInfo.col * this.cellSize) + (containerWidth / 2),
                gridY + (itemInfo.row * this.cellSize) + (containerHeight / 2)
            ).setSize(containerWidth, containerHeight);

            const itemImage = this.add.image(0, 0, itemData.storage).setDisplaySize(containerWidth, containerHeight);
            itemContainer.add(itemImage);
            itemContainer.setAngle(itemInfo.rotation);
            itemContainer.setData({
                itemId: itemInfo.itemId,
                uniqueId: `${itemInfo.itemId}_ghost`
            });
            
            this.enemyItemImages.push(itemContainer);
        }
    }
}