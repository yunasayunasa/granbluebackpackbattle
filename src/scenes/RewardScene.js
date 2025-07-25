// src/scenes/RewardScene.js (新規作成)

export default class RewardScene extends Phaser.Scene {
    constructor() {
        super('RewardScene');
        this.stateManager = null;
    }

    init(data) {
        // 前のシーンからデータを受け取る（今回は使わないが作法として）
        console.log("RewardScene: init", data);
    }

    create() {
        console.log("RewardScene: create");
        this.cameras.main.setBackgroundColor('#2c3e50');

        // StateManagerを取得
        this.stateManager = this.sys.registry.get('stateManager');

        // 画面中央にタイトルを表示
        this.add.text(this.scale.width / 2, 100, '報酬を選択', {
            fontSize: '48px',
            fill: '#ecf0f1'
        }).setOrigin(0.5);

        // 仮の報酬データを定義
        const rewards = ['potion', 'berserker_axe', 'item_spiky_shield'];

        // 報酬を画面に表示
        rewards.forEach((itemId, index) => {
            const x = (this.scale.width / 4) * (index + 1);
            const y = this.scale.height / 2;

            // 報酬カードの背景
            const card = this.add.rectangle(x, y, 150, 200, 0xbdc3c7).setInteractive();
            card.setStrokeStyle(4, 0x7f8c8d);

            // アイテム画像
            this.add.image(x, y - 20, `item_${itemId}`).setScale(1.5);

            // アイテム名
            this.add.text(x, y + 80, itemId, {
                fontSize: '20px',
                fill: '#2c3e50'
            }).setOrigin(0.5);

            // カードがクリックされた時の処理
            card.on('pointerdown', () => {
                this.selectReward(itemId);
            });
        });
        
        // 準備完了を通知
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