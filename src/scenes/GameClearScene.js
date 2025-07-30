export default class GameClearScene extends Phaser.Scene {
    constructor() {
        super('GameClearScene');
        this.stateManager = null;
        this.soundManager = null;
        this.transitionTimer = null;
        // ★ initで受け取ったデータを保持するためのプロパティ
        this.receivedParams = {};
    }

    init(data) {
        // ★★★ SystemSceneから渡されたデータを正しく受け取る ★★★
        // dataは { transitionParams: { finalRound: 10 } } という構造になっている
        this.receivedParams = data.transitionParams || {};
        console.log("GameClearScene init. Received params:", this.receivedParams);
    }

    create() {
        console.log("GameClearScene: create");

        this.stateManager = this.sys.registry.get('stateManager');
        this.soundManager = this.sys.registry.get('soundManager');
        // this.soundManager.playBgm('fanfare_success');

        this.cameras.main.setBackgroundColor('#000000');
        const background = this.add.image(this.scale.width / 2, this.scale.height / 2, 'background1')
            .setDisplaySize(this.scale.width, this.scale.height)
            .setAlpha(0);
            
        const clearText = this.add.text(this.scale.width / 2, this.scale.height / 2, 'GAME CLEAR!', {
            fontSize: '80px', fill: '#ffd700', stroke: '#ffffff', strokeThickness: 8,
            shadow: { offsetX: 5, offsetY: 5, color: '#000000', blur: 10, stroke: true, fill: true }
        }).setOrigin(0.5).setAlpha(0).setScale(0.5);

        this.tweens.add({ targets: background, alpha: 1, duration: 1000, ease: 'Power1' });
        this.tweens.add({ targets: clearText, alpha: 1, scale: 1, duration: 1500, ease: 'Elastic.Out', delay: 500 });

        const transitionDelay = 4000;
        this.transitionTimer = this.time.delayedCall(transitionDelay, () => {
            console.log("GameClearScene: Transitioning to ScoreScene.");
            
            // ★★★ ScoreSceneへ渡すデータ構造を修正 ★★★
            const payload = {
                to: 'ScoreScene',
                from: this.scene.key,
                // ScoreSceneに渡すデータを 'params' オブジェクトにまとめる
                params: {
                    result: 'clear', // 'clear' という結果を追加
                    finalRound: this.receivedParams.finalRound // initで受け取ったデータを渡す
                }
            };
            this.scene.get('SystemScene').events.emit('request-scene-transition', payload);
        });

        this.events.emit('scene-ready');
        console.log("GameClearScene: scene-ready emitted.");
    }
    
    shutdown() {
        console.log("GameClearScene: shutdown");
        if (this.transitionTimer) {
            this.transitionTimer.remove();
            this.transitionTimer = null;
        }
    }
}