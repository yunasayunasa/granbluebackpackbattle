// scenes/ScoreScene.js

export default class ScoreScene extends Phaser.Scene {
    constructor() {
        super('ScoreScene');
        this.stateManager = null;
        this.soundManager = null;
        this.receivedData = null;
        this.titleButton = null;

        // スコアアタック用のランクテーブル
        this.rankTable = [
            { exp: 0,    rank: "駆け出し" }, { exp: 100,  rank: "ブロンズ" }, { exp: 300,  rank: "シルバー" },
            { exp: 700,  rank: "ゴールド" }, { exp: 1500, rank: "プラチナ" },
        ];
    }

    init(data) {
        this.receivedData = data.transitionParams || data || {};
    }

    create() {
        console.log("ScoreScene: create");
        this.cameras.main.fadeIn(300, 0, 0, 0);

        this.stateManager = this.sys.registry.get('stateManager');
        this.soundManager = this.sys.registry.get('soundManager');

        this.add.image(this.scale.width / 2, this.scale.height / 2, 'background1')
            .setAlpha(0.5).setDisplaySize(this.scale.width, this.scale.height);
        
        try { this.soundManager.playBgm('bgm_prepare'); }
        catch(e) { console.warn("BGM 'bgm_prepare' not found."); }

        const finalRound = this.receivedData.finalRound || 1;
        const result = this.receivedData.result || 'lose';
        let score = (finalRound - 1) * 100;
        let expGained = (finalRound - 1) * 10;
        if (result === 'clear') {
            score += 1000; expGained += 100;
        }

        const profile = this.stateManager.sf.player_profile;
        const oldRank = profile.rank;
        const oldHighScore = profile.highScore || 0;
        const oldTotalExp = profile.totalExp;
        
        profile.totalExp += expGained;
        if (result === 'clear') { profile.totalWins = (profile.totalWins || 0) + 1; }
        profile.highScore = Math.max(oldHighScore, score);
        
        let newRank = this.getRankForExp(profile.totalExp);
        profile.rank = newRank;
        this.stateManager.setSF('player_profile', profile);

        const titleText = (result === 'clear') ? 'GAME CLEAR' : 'GAME OVER';
        this.add.text(this.scale.width / 2, 80, titleText, { fontSize: '60px', fill: '#e0e0e0' }).setOrigin(0.5);

        const resultLines = [
            { label: '到達ラウンド', value: finalRound },
            { label: '獲得スコア', value: `${score} ${score > oldHighScore ? '(New!)' : ''}` },
            { label: '獲得経験値', value: expGained },
        ];
        
        const startY = 200; const stepY = 70; const startDelay = 500; const stepDelay = 300;
        resultLines.forEach((line, index) => {
            const y = startY + index * stepY;
            const labelText = this.add.text(this.scale.width / 2 - 100, y, line.label, { fontSize: '32px', fill: '#cccccc' }).setOrigin(1, 0.5).setAlpha(0).setScale(1.2);
            const valueText = this.add.text(this.scale.width / 2 + 100, y, line.value, { fontSize: '40px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0, 0.5).setAlpha(0).setScale(1.2);
            const delay = startDelay + index * stepDelay;
            this.tweens.add({ targets: labelText, delay: delay, alpha: 1, scale: 1, duration: 250, ease: 'Cubic.easeOut', onStart: () => { try { this.soundManager.playSe('se_result_pop'); } catch(e) {} } });
            this.tweens.add({ targets: valueText, delay: delay, alpha: 1, scale: 1, duration: 250, ease: 'Cubic.easeOut' });
        });

        this.titleButton = this.add.text(this.scale.width / 2, this.scale.height - 100, 'タイトルへ戻る', { fontSize: '32px', fill: '#fff', backgroundColor: '#0055aa', padding: { x: 20, y: 10 } }).setOrigin(0.5).setInteractive().setAlpha(0);
        
        const totalAnimationTime = startDelay + resultLines.length * stepDelay + 250;
        this.time.delayedCall(totalAnimationTime, () => {
            // TODO: EXPバーとランクアップ演出
            this.tweens.add({ targets: this.titleButton, alpha: 1, duration: 500 });
        });

        this.titleButton.on('pointerdown', () => {
            this.cameras.main.fadeOut(300, 0, 0, 0, (camera, progress) => {
                if (progress === 1) {
                    this.scene.get('SystemScene').events.emit('request-scene-transition', {
                        to: 'GameScene', from: this.scene.key, params: { storage: 'title.ks' }
                    });
                }
            });
        });
        
        this.events.emit('scene-ready');
    }

    getRankForExp(exp) {
        let currentRank = "駆け出し";
        for (const rankInfo of this.rankTable) {
            if (exp >= rankInfo.exp) {
                currentRank = rankInfo.rank;
            }
        }
        return currentRank;
    }
}