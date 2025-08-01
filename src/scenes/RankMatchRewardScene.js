// src/scenes/RewardScene.js

import { ITEM_DATA } from '../core/ItemData.js';

export default class RankMatchRewardScene extends Phaser.Scene {
    constructor() {
        // ★ 2. シーンキーを変更
        super('RankMatchRewardScene');
        this.stateManager = null;;
        this.soundManager = null;
        
        // デフォルトの戻り先シーンキー
        this.returnSceneKey = 'BattleScene'; 
    }

    init(data) {
        console.log("RewardScene: init", data);
        // 遷移元のシーンキーがあれば、それを戻り先として記憶する
        if (data && data.from) {
            this.returnSceneKey = data.from; 
            console.log(`次の戻り先シーンを設定: ${this.returnSceneKey}`);
        }
    }

    create() {
        this.cameras.main.fadeIn(300, 0, 0, 0); 
        this.stateManager = this.sys.registry.get('stateManager');
        this.soundManager = this.sys.registry.get('soundManager');

        try { this.soundManager.playBgm('bgm_prepare'); } catch(e) {}
        
        this.add.image(this.scale.width / 2, this.scale.height / 2, 'reward_background')
            .setDisplaySize(this.scale.width, this.scale.height).setDepth(-1);

        this.add.text(this.scale.width / 2, 100, '報酬を選択', { fontSize: '48px', fill: '#ecf0f1' }).setOrigin(0.5);

        const rewardPool = Object.keys(ITEM_DATA).filter(id => !['sword', 'shield', 'potion'].includes(id));
        const selectedRewards = [];
        const rewardCount = Math.min(3, rewardPool.length); 
        for (let i = 0; i < rewardCount; i++) {
            const randomIndex = Phaser.Math.Between(0, rewardPool.length - 1);
            selectedRewards.push(rewardPool.splice(randomIndex, 1)[0]);
        }
        selectedRewards.forEach((itemId, index) => {
            const x = (this.scale.width / 4) * (index + 1);
            const y = this.scale.height / 2;
            const card = this.add.rectangle(x, y, 150, 200, 0xbdc3c7).setInteractive();
            card.setStrokeStyle(4, 0x7f8c8d);
            const itemData = ITEM_DATA[itemId];
            if (itemData && itemData.storage) {
                const itemImage = this.add.image(x, y - 20, itemData.storage);
                const scale = Math.min(120 / itemImage.width, 120 / itemImage.height);
                itemImage.setScale(scale);
            }
            this.add.text(x, y + 80, itemId, { fontSize: '20px', fill: '#2c3e50' }).setOrigin(0.5);
            card.on('pointerdown', () => { this.selectReward(itemId); });
        });

        this.events.emit('scene-ready');
    }

    selectReward(selectedItemId) {
        console.log(`報酬として ${selectedItemId} を選択しました`);

        const currentInventory = this.stateManager.sf.player_inventory || [];
        const newInventory = [...currentInventory, selectedItemId];
        this.stateManager.setSF('player_inventory', newInventory);

        // フェードアウトしてから、記憶しておいたシーンキーを使って戻る
        this.cameras.main.fadeOut(300, 0, 0, 0, (camera, progress) => {
            if (progress === 1) {
                this.scene.get('SystemScene').events.emit('request-scene-transition', {
            to: 'RankMatchBattleScene',
            from: this.scene.key
        
                });
            }
        });
    }
}
