// scenes/RankMatchBattleScene.js

import BattleScene from './BattleScene.js';
import { ITEM_DATA } from '../core/ItemData.js';

export default class RankMatchBattleScene extends BattleScene {
    constructor() {
        super(); // 親クラス(BattleScene)のコンストラクタを呼び出す
        this.ghostData = null; // 対戦相手のゴーストデータを保持するプロパティ
    }

    init(data) {
        super.init(data); // 親クラスのinitを呼び出す
        // マッチングシーンから渡されたゴーストデータを取得
        this.ghostData = data.transitionParams.ghostData;
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

    /**
     * ★★★ 敵のセットアップ処理をオーバーライド ★★★
     * EnemyGeneratorを使わず、ゴーストデータから盤面を再現する
     */
    setupEnemy(gridY) {
        const gameWidth = this.scale.width;
        // 敵グリッドサイズは親クラス(BattleScene)で定義されたものを使う
        const gridWidth = this.backpackGridSize * this.cellSize;
        const enemyGridX = gameWidth - 100 - gridWidth;
        const enemyGridY = gridY;

        this.enemyItemImages.forEach(item => item.destroy());
        this.enemyItemImages = [];

        const ghostLayout = this.ghostData.backpack;
        console.log("ゴーストデータから敵の盤面を再現:", ghostLayout);

        // ゴーストデータのbackpack情報を元に、敵のアイテムを配置
        for (const uid in ghostLayout) {
            const itemInfo = ghostLayout[uid];
            const itemData = ITEM_DATA[itemInfo.itemId];

            if (!itemData) {
                console.warn(`ITEM_DATAに'${itemInfo.itemId}'が見つかりません。`);
                continue;
            }

            // 親クラスのsetupEnemyからコードを拝借・簡略化
            const shape = this.getRotatedShape(itemInfo.itemId, itemInfo.rotation);
            const containerWidth = shape[0].length * this.cellSize;
            const containerHeight = shape.length * this.cellSize;
            
            const itemContainer = this.add.container(
                enemyGridX + (itemInfo.col * this.cellSize) + (containerWidth / 2),
                enemyGridY + (itemInfo.row * this.cellSize) + (containerHeight / 2)
            ).setSize(containerWidth, containerHeight);

            // ... (ツールチップやリキャストマスクなどの表示設定は親クラスのものを参考に実装) ...
            const itemImage = this.add.image(0, 0, itemData.storage).setDisplaySize(containerWidth, containerHeight);
            itemContainer.add(itemImage);
            itemContainer.setAngle(itemInfo.rotation);
            itemContainer.setData({
                itemId: itemInfo.itemId,
                uniqueId: `${itemInfo.itemId}_ghost` // 識別用ID
            });
            
            this.enemyItemImages.push(itemContainer);
        }
    }
}