export default class ScoreScene extends Phaser.Scene {
    constructor() {
        super('ScoreScene');
        this.stateManager = null;
        this.soundManager = null;
        this.receivedData = null;
        this.titleButton = null;

        // ★★★ ランク定義をクラスのプロパティとして一元管理 ★★★
        this.rankMap = {
            'C':  { threshold: 100, image: 'rank_c', name: 'ランク C' },
            'B':  { threshold: 300, image: 'rank_b', name: 'ランク B' },
            'A':  { threshold: 700, image: 'rank_a', name: 'ランク A' },
            'S':  { threshold: 1500, image: 'rank_s', name: 'ランク S' },
            'S+': { threshold: 99999, image: 'rank_s_plus', name: 'ランク S+' },
        };
    }

    init(data) {
        this.receivedData = data.transitionParams || data || {};
        console.log("ScoreScene init. Received data:", this.receivedData);
    }

    create() {
        console.log("ScoreScene: create");
        this.cameras.main.fadeIn(300, 0, 0, 0);

        this.stateManager = this.sys.registry.get('stateManager');
        this.soundManager = this.sys.registry.get('soundManager');

        this.add.image(this.scale.width / 2, this.scale.height / 2, 'background1')
            .setAlpha(0.5).setDisplaySize(this.scale.width, this.scale.height);
        
        try { this.soundManager.playBgm('result_music'); }
        catch(e) { console.warn("BGM 'result_music' not found."); }

        // --- スコアと経験値の計算 ---
        const finalRound = this.receivedData.finalRound || 1;
        const result = this.receivedData.result || 'lose';
        let score = (finalRound - 1) * 100;
        let expGained = (finalRound - 1) * 10;
        if (result === 'clear') {
            score += 1000; expGained += 100;
        }

        // --- プロファイルの更新 ---
        const profile = this.stateManager.sf.player_profile;
        const oldTotalExp = profile.totalExp;
        const oldRankKey = this.getRankKeyForExp(oldTotalExp);
        const oldHighScore = profile.highScore || 0;
        
        profile.totalExp += expGained;
        if (result === 'clear') { profile.totalWins = (profile.totalWins || 0) + 1; }
        profile.highScore = Math.max(oldHighScore, score);
        
        const newRankKey = this.getRankKeyForExp(profile.totalExp);
        profile.rank = newRankKey; // 'C', 'B' などのキーを保存
        this.stateManager.setSF('player_profile', profile);

        // --- リザルトの段階表示 ---
        const titleText = (result === 'clear') ? 'GAME CLEAR' : 'GAME OVER';
        this.add.text(this.scale.width / 2, 80, titleText, { fontSize: '60px', fill: '#e0e0e0' }).setOrigin(0.5);

        const resultLines = [
            { label: '到達ラウンド', value: finalRound },
            { label: '獲得スコア', value: `${score} ${score > oldHighScore ? '(New!)' : ''}` },
            { label: '獲得経験値', value: expGained },
        ];
        
        // ... (段階表示のロジックは変更なし) ...
        const startY = 200; const stepY = 70; const startDelay = 500; const stepDelay = 300;
        resultLines.forEach((line, index) => {
            const y = startY + index * stepY;
            const labelText = this.add.text(this.scale.width / 2 - 100, y, line.label, { fontSize: '32px', fill: '#cccccc' }).setOrigin(1, 0.5).setAlpha(0).setScale(1.2);
            const valueText = this.add.text(this.scale.width / 2 + 100, y, line.value, { fontSize: '40px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0, 0.5).setAlpha(0).setScale(1.2);
            const delay = startDelay + index * stepDelay;
            this.tweens.add({ targets: labelText, delay: delay, alpha: 1, scale: 1, duration: 250, ease: 'Cubic.easeOut', onStart: () => { try { this.soundManager.playSe('se_result_pop'); } catch(e) { console.warn("SE 'se_result_pop' not found."); } } });
            this.tweens.add({ targets: valueText, delay: delay, alpha: 1, scale: 1, duration: 250, ease: 'Cubic.easeOut' });
        });

        const totalAnimationTime = startDelay + resultLines.length * stepDelay + 250;
        this.time.delayedCall(totalAnimationTime, () => {
            console.log("リザルト表示完了。次の演出へ。");
            this._playExpBarAnimation(expGained, oldTotalExp, newRankKey !== oldRankKey);
        });

        // --- 「タイトルへ」ボタンの作成 ---
        this.titleButton = this.add.text(this.scale.width / 2, this.scale.height - 100, 'タイトルへ戻る', {
            fontSize: '32px', fill: '#fff', backgroundColor: '#0055aa', padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive().setAlpha(0);
        
        this.titleButton.on('pointerdown', () => {
            this.stateManager.setSF('player_backpack', {});
            this.stateManager.setSF('player_inventory', ['sword', 'luria', 'potion']);
            this.stateManager.setSF('round', 1);
            this.stateManager.setSF('coins', 0); // 初期コインは0のはず
            this.stateManager.setSF('player_base_max_hp', 100);
            this.stateManager.f = {};
            this.scene.get('SystemScene').events.emit('request-scene-transition', {
                to: 'GameScene', from: this.scene.key, params: { storage: 'title.ks' }
            });
        });
        
        this.events.emit('scene-ready');
    }

    // 経験値からランクキー('C', 'B'...)を返すヘルパーメソッド
    getRankKeyForExp(exp) {
        const rankKeys = Object.keys(this.rankMap);
        for (let i = rankKeys.length - 1; i >= 0; i--) {
            const key = rankKeys[i];
            const prevThreshold = i > 0 ? this.rankMap[rankKeys[i-1]].threshold : 0;
            if (exp >= prevThreshold) {
                return key;
            }
        }
        return rankKeys[0]; // C
    }
    
    // ... (_playExpBarAnimation と _playRankUpEffect は次のコードブロック) ...

// ScoreScene.js の末尾 (続き)

    async _playExpBarAnimation(expGained, oldTotalExp, didRankUp) {
        const { width, height } = this.scale;
        
        const oldRankKey = this.getRankKeyForExp(oldTotalExp);
        const oldRankData = this.rankMap[oldRankKey];
        
        const rankKeys = Object.keys(this.rankMap);
        const oldRankIndex = rankKeys.indexOf(oldRankKey);
        const prevRankThreshold = oldRankIndex > 0 ? this.rankMap[rankKeys[oldRankIndex - 1]].threshold : 0;
        
        const barWidth = 600; const barHeight = 30;
        const barX = width / 2; const barY = height / 2 + 100;
        
        this.add.graphics().fillStyle(0x333333).fillRect(barX - barWidth / 2, barY - barHeight / 2, barWidth, barHeight);
        const expBar = this.add.graphics();
        const expText = this.add.text(barX, barY + 40, `EXP:`, { fontSize: '24px', fill: '#fff' }).setOrigin(0.5);

        let currentExp = oldTotalExp;
        const targetExp = oldTotalExp + expGained;
        
        const rankThreshold = oldRankData.threshold;
        const rankExpRange = rankThreshold - prevRankThreshold;
        const startExpInRank = currentExp - prevRankThreshold;
        const startWidth = (startExpInRank / rankExpRange) * barWidth;

        expBar.fillStyle(0xffdd00).fillRect(barX - barWidth / 2, barY - barHeight / 2, startWidth, barHeight);
        expText.setText(`EXP: ${Math.floor(currentExp)} / ${rankThreshold}`);

        try { this.soundManager.playSe('se_exp_bar_fill'); } catch(e) {}
        
        const expCounter = { value: currentExp };
        
        const tween = this.tweens.add({
            targets: expCounter,
            value: targetExp,
            duration: 1500,
            ease: 'Cubic.easeOut',
            onUpdate: () => {
                const animatedExp = expCounter.value;
                const expInRank = animatedExp - prevRankThreshold;
                let progress = expInRank / rankExpRange;
                
                if (progress >= 1.0 && didRankUp) {
                    progress = 1.0;
                    tween.pause();
                    
                    this._playRankUpEffect().then(() => {
                        // TODO: ランクアップ後のゲージ継続アニメーション
                        this.tweens.add({ targets: this.titleButton, alpha: 1, duration: 500 });
                    });
                }
                
                expBar.clear().fillStyle(0xffdd00).fillRect(barX - barWidth / 2, barY - barHeight / 2, barWidth * progress, barHeight);
                expText.setText(`EXP: ${Math.floor(animatedExp)} / ${rankThreshold}`);
            },
            onComplete: () => {
                if (!didRankUp) {
                    this.tweens.add({ targets: this.titleButton, alpha: 1, duration: 500 });
                }
            }
        });
    }
    
  // ScoreScene.js の末尾

    _playRankUpEffect() {
        return new Promise(resolve => {
            const { width, height } = this.scale;
            const newRankKey = this.stateManager.sf.player_profile.rank;
            
            // ★★★ ここを this.rankMap に修正 ★★★
            const rankImageKey = this.rankMap[newRankKey]?.image || 'rank_c';

            try { this.soundManager.playSe('se_rank_up'); } catch(e) {}
            this.cameras.main.shake(300, 0.01);

            const rankImage = this.add.image(width / 2, height / 2, rankImageKey)
                .setDepth(7000)
                .setScale(3)
                .setAlpha(0);

            const bloom = rankImage.setPostPipeline('Bloom');
            if (bloom) {
                bloom.bloomRadius = 0.0; bloom.bloomIntensity = 0.0;
            }
            
            this.tweens.chain({
                targets: rankImage,
                tweens: [
                    { scale: 1, alpha: 1, duration: 300, ease: 'Elastic.Out(1, 0.5)' },
                    { scale: 1, duration: 1000, onStart: () => {
                        if (bloom) this.tweens.add({ targets: bloom, bloomRadius: 5.0, bloomIntensity: 1.5, duration: 500, ease: 'Cubic.easeOut', yoyo: true });
                    }},
                    { alpha: 0, duration: 300, ease: 'Cubic.easeIn' }
                ],
                onComplete: () => {
                    rankImage.destroy();
                    resolve();
                }
            });
        });
    }
}