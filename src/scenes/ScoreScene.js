// scenes/ScoreScene.js

export default class ScoreScene extends Phaser.Scene {
    constructor() {
        super('ScoreScene');
        this.stateManager = null;
        this.soundManager = null;
        this.receivedData = null;
        this.titleButton = null;

        // ★ スコアアタック用のランク定義
        this.rankMap = {
            '駆け出し': { threshold: 100,  image: 'rank_c', next: 'ブロンズ' },
            'ブロンズ': { threshold: 300,  image: 'rank_b', next: 'シルバー' },
            'シルバー': { threshold: 700,  image: 'rank_a', next: 'ゴールド' },
            'ゴールド': { threshold: 1500, image: 'rank_s', next: 'プラチナ' },
            'プラチナ': { threshold: 99999, image: 'rank_s_plus', next: null },
        };
    }

    init(data) {
        this.receivedData = data.transitionParams || data || {};
    }

    create() {
        this.cameras.main.fadeIn(300, 0, 0, 0);
        this.stateManager = this.sys.registry.get('stateManager');
        this.soundManager = this.sys.registry.get('soundManager');

        this.add.image(this.scale.width / 2, this.scale.height / 2, 'background1')
            .setAlpha(0.5).setDisplaySize(this.scale.width, this.scale.height);
        
        try { this.soundManager.playBgm('bgm_prepare'); } catch(e) {}

        const finalRound = this.receivedData.finalRound || 1;
        const result = this.receivedData.result || 'lose';
        let score = (finalRound - 1) * 100;
        let expGained = (finalRound - 1) * 10;
        if (result === 'clear') { score += 1000; expGained += 100; }

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
            { label: '獲得経験値', value: expGained, isDivider: true },
            { label: 'ランク', value: `${oldRank} → ${newRank} ${newRank !== oldRank ? '(ランクアップ!)' : ''}` },
            { label: '累計経験値', value: profile.totalExp },
        ];
        
        const startY = 200; const stepY = 70; const startDelay = 500; const stepDelay = 400;
        resultLines.forEach((line, index) => {
            const y = startY + index * stepY;
            const delay = startDelay + index * stepDelay;
            if (line.isDivider) {
                const lineObj = this.add.line(0, 0, this.scale.width/2 - 200, y, this.scale.width/2 + 200, y, 0xffffff).setLineWidth(2).setAlpha(0);
                this.tweens.add({ targets: lineObj, delay: delay, alpha: 0.5, duration: 250 });
                return;
            }
            const labelText = this.add.text(this.scale.width / 2 - 10, y, `${line.label}:`, { fontSize: '32px', fill: '#cccccc' }).setOrigin(1, 0.5).setAlpha(0).setScale(1.2);
            const valueText = this.add.text(this.scale.width / 2 + 10, y, line.value, { fontSize: '36px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0, 0.5).setAlpha(0).setScale(1.2);
            this.tweens.add({ targets: [labelText, valueText], delay: delay, alpha: 1, scale: 1, duration: 250, ease: 'Cubic.easeOut', onStart: () => { try { this.soundManager.playSe('se_result_pop'); } catch(e) {} } });
        });

        this.titleButton = this.add.text(this.scale.width / 2, this.scale.height - 100, 'タイトルへ戻る', { fontSize: '32px', fill: '#fff', backgroundColor: '#0055aa', padding: { x: 20, y: 10 } }).setOrigin(0.5).setInteractive().setAlpha(0);
        
        const totalAnimationTime = startDelay + resultLines.length * stepDelay + 500;
        this.time.delayedCall(totalAnimationTime, async () => {
            console.log("リザルト表示完了。経験値バー演出へ。");
            
            // バーのアニメーションが完了するのを待つ
            await this._playExpBarAnimation(expGained, oldTotalExp, newRank !== oldRank);
            
            // どの場合でも、最後に必ずボタンを表示する
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
        if (exp >= 1500) return 'プラチナ';
        if (exp >= 700) return 'ゴールド';
        if (exp >= 300) return 'シルバー';
        if (exp >= 100) return 'ブロンズ';
        return '駆け出し';
    }

    async _playExpBarAnimation(expGained, oldTotalExp, didRankUp) {
        const { width, height } = this.scale;
        
        const oldRankKey = this.getRankForExp(oldTotalExp);
        const oldRankData = this.rankMap[oldRankKey];
        if (!oldRankData) { return; } // 安全装置
        
        const rankKeys = Object.keys(this.rankMap);
        const oldRankIndex = rankKeys.indexOf(oldRankKey);
        const prevRankThreshold = oldRankIndex > 0 ? this.rankMap[rankKeys[oldRankIndex - 1]].threshold : 0;
        
        const barWidth = 600; const barHeight = 30;
        const barX = width / 2; const barY = height / 2 + 150;
        
        this.add.graphics().fillStyle(0x333333).fillRect(barX - barWidth / 2, barY - barHeight / 2, barWidth, barHeight);
        const expBar = this.add.graphics();
        const expText = this.add.text(barX, barY + 40, `EXP:`, { fontSize: '24px', fill: '#fff' }).setOrigin(0.5);

        const currentRankImageKey = oldRankData.image || 'rank_c';
        this.add.image(barX - barWidth / 2 - 50, barY, currentRankImageKey).setScale(barHeight * 2 / 256);
        const nextRankKey = oldRankData.next;
        if (nextRankKey) {
            const nextRankImageKey = this.rankMap[nextRankKey]?.image || 'rank_c';
            this.add.image(barX + barWidth / 2 + 50, barY, nextRankImageKey).setScale(barHeight * 2 / 256).setTint(0x333333);
        }

        const targetExp = oldTotalExp + expGained;
        const rankThreshold = oldRankData.threshold;
        const rankExpRange = rankThreshold - prevRankThreshold;
        
        const expCounter = { value: oldTotalExp };
        try { this.soundManager.playSe('se_exp_bar_fill'); } catch(e) {}
        
        // --- メインのアニメーション ---
        const mainTween = this.tweens.add({
            targets: expCounter,
            value: targetExp,
            duration: 1500,
            ease: 'Cubic.easeOut',
            onUpdate: () => {
                const animatedExp = expCounter.value;
                const expInRank = animatedExp - prevRankThreshold;
                const progress = Math.min(1.0, expInRank / rankExpRange); // 100%以上にならないように
                expBar.clear().fillStyle(0xffdd00).fillRect(barX - barWidth / 2, barY - barHeight / 2, barWidth * progress, barHeight);
                expText.setText(`EXP: ${Math.floor(animatedExp)} / ${rankThreshold}`);
            }
        });

        // --- ランクアップ演出の挟み込み ---
        if (didRankUp) {
            // ランクアップするまでの時間を計算
            const expToRankUp = rankThreshold - oldTotalExp;
            const durationToRankUp = (expToRankUp / expGained) * 1500;

            // ランクアップのタイミングでメインのTweenを一時停止
            this.time.delayedCall(durationToRankUp, () => {
                if(mainTween.isPlaying()) mainTween.pause();
                
                this._playRankUpEffect().then(() => {
                    // TODO: ランクアップ後のゲージ継続アニメーション
                    // 今回は、演出後にメインTweenを即座に完了させる
                    if (mainTween.isPaused()) {
                        mainTween.seek(1); // Tweenを最後の状態へ
                        mainTween.stop();  // 完全に停止
                    }
                });
            });
        }
        
        // --- Tweenの完了を待つためのPromise ---
        return new Promise(resolve => {
            mainTween.on('complete', resolve);
        });
    }
    _playRankUpEffect() {
        return new Promise(resolve => {
            const { width, height } = this.scale;
            const newRankKey = this.stateManager.sf.player_profile.rank;
            const rankImageKey = this.rankMap[newRankKey]?.image || 'rank_c';
            try { this.soundManager.playSe('se_rank_up'); } catch(e) {}
            this.cameras.main.shake(300, 0.01);
            
            const rankGlow = this.add.image(width / 2, height / 2, rankImageKey).setDepth(6999).setTint(0xffff00).setBlendMode('ADD').setAlpha(0);
            const rankImage = this.add.image(width / 2, height / 2, rankImageKey).setDepth(7000).setScale(3).setAlpha(0);
            
            this.tweens.chain({
                targets: rankImage,
                tweens: [
                    { scale: 1, alpha: 1, duration: 300, ease: 'Elastic.Out(1, 0.5)' },
                    { scale: 1, duration: 800, onStart: () => {
                        this.tweens.add({ targets: rankGlow, alpha: 0.7, scale: 1.1, duration: 400, ease: 'Cubic.easeOut', yoyo: true });
                    }}
                ],
                onComplete: () => {
                    const continueText = this.add.text(width / 2, height - 150, 'TAP TO CONTINUE', { fontSize: '28px', fill: '#ffffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5).setDepth(8000);
                    this.input.once('pointerdown', () => {
                        continueText.destroy();
                        this.tweens.add({
                            targets: [rankImage, rankGlow], alpha: 0, duration: 300,
                            onComplete: () => {
                                rankImage.destroy();
                                rankGlow.destroy();
                                resolve();
                            }
                        });
                    });
                }
            });
        });
    }
}
