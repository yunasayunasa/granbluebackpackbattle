// src/scenes/ScoreScene.js (新規作成)

export default class ScoreScene extends Phaser.Scene {
    constructor() {
        super('ScoreScene');
        this.stateManager = null;
        this.runResult = {}; // 今回の挑戦結果
    }

    init(data) {
        console.log("ScoreScene: init", data);
        // BattleSceneから今回の挑戦結果を受け取る
        this.runResult = data;
    }

    create() {
        console.log("ScoreScene: create");
        this.cameras.main.setBackgroundColor('#2c3e50');

        this.stateManager = this.sys.registry.get('stateManager');
        const profile = this.stateManager.sf.player_profile;
        const oldExp = profile.totalExp;

        // --- 1. スコア計算 ---
        const roundScore = (this.runResult.round - 1) * 100;
        const winScore = this.runResult.wins * 50;
        const coinScore = this.runResult.coins;
        const totalScore = roundScore + winScore + coinScore;

        // --- 2. プロフィール更新と保存 ---
        profile.totalExp += totalScore;
        // (将来的に、ここでランクアップ判定)
        this.stateManager.setSF('player_profile', profile);

        // --- 3. UI表示 ---
        this.add.text(this.scale.width / 2, 100, 'RESULT', { fontSize: '64px', fill: '#fff' }).setOrigin(0.5);

        // スコア詳細
        let resultText = `到達ラウンド: ${this.runResult.round} (+${roundScore} EXP)\n`;
        resultText += `勝利数: ${this.runResult.wins} (+${winScore} EXP)\n`;
        resultText += `所持コイン: ${this.runResult.coins} (+${coinScore} EXP)\n\n`;
        resultText += `今回獲得経験値: ${totalScore} EXP`;
        this.add.text(this.scale.width / 2, 250, resultText, { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);
        
        // 累計経験値
        this.add.text(this.scale.width / 2, 450, `累計経験値: ${oldExp} -> ${profile.totalExp}`, { fontSize: '40px', fill: '#ffd700' }).setOrigin(0.5);
        
        // --- 4. 「タイトルへ戻る」ボタン ---
        const backButton = this.add.text(this.scale.width / 2, 600, 'タイトルへ戻る', { /* ... */ }).setOrigin(0.5).setInteractive();

        backButton.on('pointerdown', () => {
            // 今回の挑戦データ(player_data)をリセット
            this.stateManager.setSF('player_data', undefined);
            // 将来的にはTitleSceneへ遷移
            this.scene.get('SystemScene').events.emit('request-scene-transition', { to: 'BattleScene', from: this.scene.key });
        });

        this.events.emit('scene-ready');
    }
}