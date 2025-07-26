// src/scenes/RewardScene.js (新規作成)

import { ITEM_DATA } from '../core/ItemData.js'; // ★この行を追加


export default class RewardScene extends Phaser.Scene {
    constructor() {
        super('RewardScene');
        this.stateManager = null;
    }

    init(data) {
        // 前のシーンからデータを受け取る（今回は使わないが作法として）
        console.log("RewardScene: init", data);
    }

  // RewardScene.js の create メソッドを、これに置き換えてください
create() {
    console.log("RewardScene: create");
    this.cameras.main.setBackgroundColor('#2c3e50');

    this.stateManager = this.sys.registry.get('stateManager');

    this.add.text(this.scale.width / 2, 100, '報酬を選択', {
        fontSize: '48px',
        fill: '#ecf0f1'
    }).setOrigin(0.5);

    // ★★★ ここからがランダム選択ロジック ★★★

    // 1. 報酬候補となる全アイテムIDのリストを作成
    //    (ここでは'sword'や'shield'など、ゲーム開始時からある基本アイテムは除外する例)
    const rewardPool = Object.keys(ITEM_DATA).filter(id => 
        !['sword', 'shield', 'potion'].includes(id)
    );

    // 2. 報酬候補リストから、重複しないように3つをランダムに選ぶ
    const selectedRewards = [];
    // もし候補が3つより少ない場合のエラー回避
    const rewardCount = Math.min(3, rewardPool.length); 

    for (let i = 0; i < rewardCount; i++) {
        // 候補リストからランダムに1つのインデックスを選ぶ
        const randomIndex = Phaser.Math.Between(0, rewardPool.length - 1);
        // 選ばれたアイテムIDを結果リストに追加
        selectedRewards.push(rewardPool[randomIndex]);
        // 候補リストから削除し、重複を防ぐ
        rewardPool.splice(randomIndex, 1);
    }
    
    console.log("提示される報酬:", selectedRewards);
    
    // ★★★ ランダム選択ロジックここまで ★★★


    // 報酬を画面に表示 (rewards -> selectedRewards に変更)
    selectedRewards.forEach((itemId, index) => {
        const x = (this.scale.width / 4) * (index + 1);
        const y = this.scale.height / 2;

        const card = this.add.rectangle(x, y, 150, 200, 0xbdc3c7).setInteractive();
        card.setStrokeStyle(4, 0x7f8c8d);

        // ★ ITEM_DATAからstorageキーを取得するように修正 ★
        const itemData = ITEM_DATA[itemId];
        if (itemData && itemData.storage) {
            this.add.image(x, y - 20, itemData.storage).setScale(1.5);
        }

        this.add.text(x, y + 80, itemId, {
            fontSize: '20px',
            fill: '#2c3e50'
        }).setOrigin(0.5);

        card.on('pointerdown', () => {
            this.selectReward(itemId);
        });
    });
    
    this.events.emit('scene-ready');
}

    /**
     * 報酬が選択された時の処理
     * @param {string} selectedItemId - 選択されたアイテムのID
     */
    selectReward(selectedItemId) {
        console.log(`報酬として ${selectedItemId} を選択しました`);

        // 1. プレイヤーのインベントリに選択したアイテムを追加
        const currentInventory = this.stateManager.sf.player_inventory || [];
        currentInventory.push(selectedItemId);
        this.stateManager.setSF('player_inventory', currentInventory);

        // 2. 次のラウンドへ進む（SystemSceneに依頼）
        // とりあえず今は次のバトルに進むようにする
        this.scene.get('SystemScene').events.emit('request-scene-transition', {
            to: 'BattleScene',
            from: this.scene.key
        });
    }
}