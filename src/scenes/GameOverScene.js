// src/scenes/GameOverScene.js (全文・改訂版)

export default class GameOverScene extends Phaser.Scene {
    constructor() {
        super('GameOverScene');
        this.runResult = {};
    }

    init(data) {
        // BattleSceneから挑戦結果を受け取る
        this.runResult = data;
    }

    create() {
        this.cameras.main.setBackgroundColor('#1c1c1c');

        this.add.text(this.scale.width / 2, this.scale.height / 2, 'GAME OVER', {
            fontSize: '120px', fill: '#e74c3c'
        }).setOrigin(0.5);

        // 2秒後にScoreSceneへ自動遷移
        this.time.delayedCall(2000, () => {
            this.scene.get('SystemScene').events.emit('request-scene-transition', {
                to: 'ScoreScene',
                from: this.scene.key,
                params: this.runResult // 受け取った結果をそのまま渡す
            });
        });

        this.events.emit('scene-ready');
    }
}