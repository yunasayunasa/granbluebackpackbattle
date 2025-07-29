export default class GameClearScene extends Phaser.Scene {
    constructor() {
        super('GameClearScene');
        this.stateManager = null;
        this.soundManager = null;
        this.transitionTimer = null;
    }

    // dataにはBattleSceneから渡された情報が入る想定
    // 例: { from: 'BattleScene', finalRound: 10 }
    init(data) {
        // SystemSceneに渡すためのデータを保持
        this.transitionData = data; 
    }

    create() {
        console.log("GameClearScene: create");

        // --- 1. マネージャーの取得 ---
        this.stateManager = this.sys.registry.get('stateManager');
        this.soundManager = this.sys.registry.get('soundManager');

        // --- 2. BGMの再生 ---
        // 勝利を祝うような、明るいファンファーレやBGMを再生
       // this.soundManager.playBgm('fanfare_success'); // 仮のBGMキーです。PreloadSceneでロードしてください。

        // --- 3. 背景とクリアメッセージの表示 ---
        this.cameras.main.setBackgroundColor('#000000');
        const background = this.add.image(this.scale.width / 2, this.scale.height / 2, 'background1') // 仮の背景キーです
            .setDisplaySize(this.scale.width, this.scale.height)
            .setAlpha(0);
            
        const clearText = this.add.text(this.scale.width / 2, this.scale.height / 2, 'GAME CLEAR!', {
            fontSize: '80px',
            fill: '#ffd700',
            stroke: '#ffffff',
            strokeThickness: 8,
            shadow: {
                offsetX: 5,
                offsetY: 5,
                color: '#000000',
                blur: 10,
                stroke: true,
                fill: true
            }
        }).setOrigin(0.5).setAlpha(0).setScale(0.5);

        // --- 4. 演出 (フェードイン & スケールアップ) ---
        this.tweens.add({
            targets: background,
            alpha: 1,
            duration: 1000,
            ease: 'Power1'
        });

        this.tweens.add({
            targets: clearText,
            alpha: 1,
            scale: 1,
            duration: 1500,
            ease: 'Elastic.Out', // バネのような動き
            delay: 500
        });

        // --- 5. ScoreSceneへの自動遷移タイマー ---
        const transitionDelay = 4000; // 4秒後に遷移
        this.transitionTimer = this.time.delayedCall(transitionDelay, () => {
            console.log("GameClearScene: Transitioning to ScoreScene.");
            // BattleSceneから受け取ったデータをそのままScoreSceneに渡す
            const payload = {
                to: 'ScoreScene',
                from: this.scene.key,
                result: 'clear', // 'clear' という結果を追加
                ...this.transitionData // finalRoundなどの情報を含む
            };
            this.scene.get('SystemScene').events.emit('request-scene-transition', payload);
        });

        // --- 6. 遷移完了をSystemSceneに通知 ---
        this.events.emit('scene-ready');
        console.log("GameClearScene: scene-ready emitted.");
    }
    
    shutdown() {
        console.log("GameClearScene: shutdown");
        // シーン終了時にタイマーを確実に破棄する
        if (this.transitionTimer) {
            this.transitionTimer.remove();
            this.transitionTimer = null;
        }
        // イベントリスナーのクリーンアップはPhaserが自動で行う
    }
}