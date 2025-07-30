// src/scenes/RewardScene.js (最終完成版)

import { ITEM_DATA } from '../core/ItemData.js';

export default class RewardScene extends Phaser.Scene {
    constructor() {
        super('RewardScene');
        this.stateManager = null;
    }

    init(data) {
        console.log("RewardScene: init", data);
    }

    create() {
        this.cameras.main.fadeIn(300, 0, 0, 0); 
        console.log("RewardScene: create");
        this.add.image(this.scale.width / 2, this.scale.height / 2, 'reward_background')
            .setDisplaySize(this.scale.width, this.scale.height)
            .setDepth(-1);

        this.stateManager = this.sys.registry.get('stateManager');

        this.add.text(this.scale.width / 2, 100, '報酬を選択', {
            fontSize: '48px',
            fill: '#ecf0f1'
        }).setOrigin(0.5);

        // --- 1. 報酬候補のランダム選択 ---
        const rewardPool = Object.keys(ITEM_DATA).filter(id => 
            !['sword', 'shield', 'potion'].includes(id) // 初期アイテムは除外
        );
        const selectedRewards = [];
        const rewardCount = Math.min(3, rewardPool.length); 
        for (let i = 0; i < rewardCount; i++) {
            const randomIndex = Phaser.Math.Between(0, rewardPool.length - 1);
            selectedRewards.push(rewardPool.splice(randomIndex, 1)[0]);
        }
        console.log("提示される報酬:", selectedRewards);
        
        // --- 2. 報酬を画面に表示 ---
        selectedRewards.forEach((itemId, index) => {
            const x = (this.scale.width / 4) * (index + 1);
            const y = this.scale.height / 2;

            const card = this.add.rectangle(x, y, 150, 200, 0xbdc3c7).setInteractive();
            card.setStrokeStyle(4, 0x7f8c8d);

            const itemData = ITEM_DATA[itemId];
            if (itemData && itemData.storage) {
                const itemImage = this.add.image(x, y - 20, itemData.storage);
                const imageAreaWidth = 120;
                const imageAreaHeight = 120;
                if (itemImage.width > imageAreaWidth || itemImage.height > imageAreaHeight) {
                    const scale = Math.min(imageAreaWidth / itemImage.width, imageAreaHeight / itemImage.height);
                    itemImage.setScale(scale);
                }
            }

            this.add.text(x, y + 80, itemId, {
                fontSize: '20px',
                fill: '#2c3e50'
            }).setOrigin(0.5);

            // カードがクリックされたら、selectRewardメソッドを呼び出す
            card.on('pointerdown', () => {
                this.selectReward(itemId);
            });
        });

        this.events.emit('scene-ready');
    }

    /**
     * 報酬が選択された時の処理 (バグ修正版)
     * @param {string} selectedItemId - 選択されたアイテムのID
     */
    selectReward(selectedItemId) {
        console.log(`報酬として ${selectedItemId} を選択しました`);

        // 1. 現在のインベントリの「コピー」を作成する
        const currentInventory = this.stateManager.sf.player_inventory || [];
        const newInventory = [...currentInventory]; // スプレッド構文で新しい配列にコピー

        // 2. コピーした新しい配列に、アイテムを追加する
        newInventory.push(selectedItemId);

        // 3. 新しい配列をsetSFに渡して、変更を検知させ、自動保存をトリガーする
        this.stateManager.setSF('player_inventory', newInventory);

        // 4. 次のラウンドへ進む
        this.scene.get('SystemScene').events.emit('request-scene-transition', {
            to: 'BattleScene',
            from: this.scene.key
        });
    }
}