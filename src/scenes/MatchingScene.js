import { ITEM_DATA } from '../core/ItemData.js';

export default class RankMatchRewardScene extends Phaser.Scene {
    constructor() {
        // ★ 1. シーンキーをユニークなものに変更
        super('RankMatchRewardScene');
        this.stateManager = null;
        this.soundManager = null;
    }

    init(data) {
        // このシーンは遷移元を気にする必要がないので、シンプルにログ出力のみ
        console.log("RankMatchRewardScene: init", data);
    }

    create() {
        this.cameras.main.fadeIn(300, 0, 0, 0);
        this.stateManager = this.sys.registry.get('stateManager');
        this.soundManager = this.sys.registry.get('soundManager');

        try { this.soundManager.playBgm('bgm_prepare'); } catch (e) { console.warn("BGM 'bgm_prepare' not found."); }

        console.log("RankMatchRewardScene: create");
        this.add.image(this.scale.width / 2, this.scale.height / 2, 'reward_background')
            .setDisplaySize(this.scale.width, this.scale.height)
            .setDepth(-1);

        this.add.text(this.scale.width / 2, 100, '報酬を選択', {
            fontSize: '48px',
            fill: '#ecf0f1'
        }).setOrigin(0.5);

        // --- 報酬候補のランダム選択 ---
        const rewardPool = Object.keys(ITEM_DATA).filter(id =>
            !['sword', 'shield', 'potion'].includes(id)
        );
        const selectedRewards = [];
        const rewardCount = Math.min(3, rewardPool.length);
        for (let i = 0; i < rewardCount; i++) {
            const randomIndex = Phaser.Math.Between(0, rewardPool.length - 1);
            selectedRewards.push(rewardPool.splice(randomIndex, 1)[0]);
        }
        console.log("提示される報酬:", selectedRewards);

        // --- 報酬を画面に表示 ---
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

        const currentInventory = this.stateManager.sf.player_inventory || [];
        const newInventory = [...currentInventory, selectedItemId];
        this.stateManager.setSF('player_inventory', newInventory);

        // フェードアウトしてから、次のラウンドへ進む
        this.cameras.main.fadeOut(300, 0, 0, 0, (camera, progress) => {
            if (progress === 1) {
                // ★ 2. 遷移先を 'RankMatchBattleScene' に変更
                this.scene.get('SystemScene').events.emit('request-scene-transition', {
                    to: 'RankMatchBattleScene',
                    from: this.scene.key
                });
            }
        });
    }
}