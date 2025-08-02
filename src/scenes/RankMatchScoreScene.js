// scenes/RankMatchScoreScene.js

export default class RankMatchScoreScene extends Phaser.Scene {
    constructor() {
        super('RankMatchScoreScene');
        this.stateManager = null;
        this.soundManager = null;
        this.receivedData = null;
        this.titleButton = null;

        // ランクマッチ専用のランク定義
        this.rankMap = {
            'C':  { threshold: 100, image: 'rank_c', name: 'ランク C' },
            'B':  { threshold: 300, image: 'rank_b', name: 'ランク B' },
            'A':  { threshold: 700, image: 'rank_a', name: 'ランク A' },
            'S':  { threshold: 1500, image: 'rank_s', name: 'ランク S' },
            'S+': { threshold: 99999, image: 'rank_s_plus', name: 'ランク S+' },
        };
    }

    init(data) {
        this.receivedData = data.transitionParams || {};
    }

    create() {
        this.cameras.main.fadeIn(300, 0, 0, 0);
        this.stateManager = this.sys.registry.get('stateManager');
        this.soundManager = this.sys.registry.get('soundManager');
        
        this.add.image(this.scale.width / 2, this.scale.height / 2, 'background1')
            .setAlpha(0.5).setDisplaySize(this.scale.width, this.scale.height);
        
        try { this.soundManager.playBgm('bgm_prepare'); } catch(e) {}

        if (!this.stateManager.sf.rank_match_profile) {
            this.stateManager.setSF('rank_match_profile', { rp: 0, rank: 'C', wins: 0, losses: 0 });
        }
        
        const result = this.receivedData.result || 'lose';
        const finalRound = this.receivedData.finalRound || 1;
        
        const profile = this.stateManager.sf.rank_match_profile;
        const oldRank = profile.rank;
        const oldRp = profile.rp;
        const entryFee = (Object.keys(this.rankMap).indexOf(oldRank) || 0) * 20;
        const wins = (result === 'win') ? finalRound : finalRound - 1;
        const roundWinBonus = wins * 10;
        const clearBonus = (result === 'win' && finalRound >= 10) ? 100 : 0;
        const totalReward = roundWinBonus + clearBonus;
        const rpChange = totalReward - entryFee;
        
        profile.rp = Math.max(0, profile.rp + rpChange);
        if (result === 'win') profile.wins++; else profile.losses++;
        const newRank = this.getRankKeyForRp(profile.rp);
        profile.rank = newRank;
        this.stateManager.setSF('rank_match_profile', profile);

        const rankChangeKey = Object.keys(this.rankMap).indexOf(newRank) - Object.keys(this.rankMap).indexOf(oldRank);
        let rankChangeText = '';
        if (rankChangeKey > 0) rankChangeText = '(昇格!)';
        if (rankChangeKey < 0) rankChangeText = '(降格…)';

        const titleTextStr = (result === 'win') ? 'VICTORY' : 'DEFEAT';
        this.add.text(this.scale.width / 2, 80, titleTextStr, { fontSize: '60px', fill: '#e0e0e0' }).setOrigin(0.5);

        const resultLines = [
            { label: '挑戦料', value: `-${entryFee} RP` },
            { label: 'ラウンド勝利', value: `+${roundWinBonus} RP (${wins}勝)` },
            { label: '全勝ボーナス', value: (clearBonus > 0 ? `+${clearBonus} RP` : '---') },
            { label: '結果', value: `${rpChange >= 0 ? '+' : ''}${rpChange} RP`, isDivider: true },
            { label: '現在ランク', value: `${oldRank} → ${newRank} ${rankChangeText}` },
            { label: '現在RP', value: profile.rp },
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
        this.time.delayedCall(totalAnimationTime, () => {
             // ★ランクマッチにもEXPバーとランクアップ演出を追加★
            this._playExpBarAnimation(rpChange, oldRp, newRank !== oldRank);
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
    
    getRankKeyForRp(rp) {
        if (rp >= 1500) return 'S+';
        if (rp >= 700) return 'S';
        if (rp >= 300) return 'A';
        if (rp >= 100) return 'B';
        return 'C';
    }

   // scenes/RankMatchScoreScene.js の末尾に追加

    async _playExpBarAnimation(rpGained, oldTotalRp, didRankUp) {
        const { width, height } = this.scale;
        
        const oldRankKey = this.getRankKeyForRp(oldTotalRp);
        const oldRankData = this.rankMap[oldRankKey];
        if (!oldRankData) {
            console.error(`Rank data for '${oldRankKey}' not found.`);
            this.tweens.add({ targets: this.titleButton, alpha: 1, duration: 500 });
            return;
        }
        
        const rankKeys = Object.keys(this.rankMap);
        const oldRankIndex = rankKeys.indexOf(oldRankKey);
        const prevRankThreshold = oldRankIndex > 0 ? this.rankMap[rankKeys[oldRankIndex - 1]].threshold : 0;
        
        const barWidth = 600; const barHeight = 30;
        const barX = width / 2; const barY = height / 2 + 100;
        
        this.add.graphics().fillStyle(0x333333).fillRect(barX - barWidth / 2, barY - barHeight / 2, barWidth, barHeight);
        const rpBar = this.add.graphics();
        const rpText = this.add.text(barX, barY + 40, `RP:`, { fontSize: '24px', fill: '#fff' }).setOrigin(0.5);

        const currentRankImageKey = oldRankData.image || 'rank_c';
        this.add.image(barX - barWidth / 2 - 50, barY, currentRankImageKey).setScale(barHeight * 2 / 256);
        const nextRankKey = oldRankData.next;
        if (nextRankKey) {
            const nextRankImageKey = this.rankMap[nextRankKey]?.image || 'rank_c';
            this.add.image(barX + barWidth / 2 + 50, barY, nextRankImageKey).setScale(barHeight * 2 / 256).setTint(0x333333);
        }

        const targetRp = oldTotalRp + rpGained;
        const rankThreshold = oldRankData.threshold;
        const rankRpRange = rankThreshold - prevRankThreshold;
        const startRpInRank = oldTotalRp - prevRankThreshold;
        const startWidth = (startRpInRank / rankRpRange) * barWidth;

        rpBar.fillStyle(0x4a90e2).fillRect(barX - barWidth / 2, barY - barHeight / 2, startWidth, barHeight); // RPバーは青色に
        rpText.setText(`RP: ${Math.floor(oldTotalRp)} / ${rankThreshold}`);
        
        try { this.soundManager.playSe('se_exp_bar_fill'); } catch(e) {}
        
        const rpCounter = { value: oldTotalRp };
        const tween = this.tweens.add({
            targets: rpCounter, value: targetRp, duration: 1500, ease: 'Cubic.easeOut',
            onUpdate: () => {
                const animatedRp = rpCounter.value;
                const rpInRank = animatedRp - prevRankThreshold;
                let progress = rpInRank / rankRpRange;

                if (progress >= 1.0 && didRankUp) {
                    progress = 1.0;
                    if (tween.isPlaying()) tween.pause();
                    this._playRankUpEffect().then(() => {
                        // TODO: ランクアップ後のゲージ継続アニメーション
                        this.tweens.add({ targets: this.titleButton, alpha: 1, duration: 500 });
                    });
                }
                
                rpBar.clear().fillStyle(0x4a90e2).fillRect(barX - barWidth / 2, barY - barHeight / 2, barWidth * progress, barHeight);
                rpText.setText(`RP: ${Math.floor(animatedRp)} / ${rankThreshold}`);
            },
            onComplete: () => {
                if (!didRankUp) {
                    this.tweens.add({ targets: this.titleButton, alpha: 1, duration: 500 });
                }
            }
        });
    }
    
    _playRankUpEffect() {
        return new Promise(resolve => {
            const { width, height } = this.scale;
            // ★ rank_match_profile を参照
            const newRankKey = this.stateManager.sf.rank_match_profile.rank;
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