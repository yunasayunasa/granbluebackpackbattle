// scenes/RankMatchScoreScene.js

export default class RankMatchScoreScene extends Phaser.Scene {
    constructor() {
        super('RankMatchScoreScene');
        this.stateManager = null;
        this.soundManager = null;
        this.receivedData = null;
        this.titleButton = null;

        // ランク定義を一元管理
        this.rankMap = {
            'C':  { threshold: 100, image: 'rank_c', name: 'ランク C' },
            'B':  { threshold: 300, image: 'rank_b', name: 'ランク B' },
            'A':  { threshold: 700, image: 'rank_a', name: 'ランク A' },
            'S':  { threshold: 1500, image: 'rank_s', name: 'ランク S' },
            'S+': { threshold: 99999, image: 'rank_s_plus', name: 'ランク S+' },
        };
        
        // ★★★ この挑戦料の一覧定義が抜けていました ★★★
        this.rankFeeMap = { 'C': 0, 'B': 20, 'A': 40, 'S': 60, 'S+': 80 };
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
        
        // --- 1. 勝利数と獲得RPを計算 ---
        const wins = (result === 'win') ? finalRound : finalRound - 1;
        const roundWinBonus = wins * 10;
        const clearBonus = (result === 'win' && finalRound >= 10) ? 100 : 0;
        const totalReward = roundWinBonus + clearBonus;
        
        // --- 2. sf.rank_match_profile.rp に、報酬を加算する ---
        const rpBeforeReward = profile.rp;
        profile.rp += totalReward;
        const finalRp = profile.rp;
        
        // --- 3. 表示用の数値を計算 ---
        const rankAtStart = this.getRankKeyForRp(rpBeforeReward);
        const entryFee = this.rankFeeMap[rankAtStart] || 0; // ここで this.rankFeeMap を参照
        const rpChange = totalReward - entryFee;
        
        // --- 4. ランクの最終確定と戦績の更新 ---
        const oldRank = rankAtStart;
        const newRank = this.getRankKeyForRp(finalRp);
        profile.rank = newRank;
        if (result === 'win') profile.wins++; else profile.losses++;
        this.stateManager.setSF('rank_match_profile', profile);

        const rankChangeKey = Object.keys(this.rankMap).indexOf(newRank) - Object.keys(this.rankMap).indexOf(oldRank);
        let rankChangeText = '';
        if (rankChangeKey > 0) rankChangeText = '(昇格!)';
        if (rankChangeKey < 0) rankChangeText = '(降格…)';

        // --- UI表示 ---
        const titleTextStr = (result === 'win') ? 'VICTORY' : 'DEFEAT';
        this.add.text(this.scale.width / 2, 80, titleTextStr, { fontSize: '60px', fill: '#e0e0e0' }).setOrigin(0.5);

        const resultLines = [
            { label: '挑戦料', value: `-${entryFee} RP` },
            { label: '獲得RP', value: `+${totalReward} RP` },
            { label: '最終収支', value: `${rpChange >= 0 ? '+' : ''}${rpChange} RP`, isDivider: true },
            { label: 'ランク', value: `${oldRank} → ${newRank} ${rankChangeText}` },
            { label: '最終RP', value: finalRp },
        ];
        
        // --- アニメーション表示 ---
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
        
        // --- 「タイトルへ」ボタン ---
        this.titleButton = this.add.text(this.scale.width / 2, this.scale.height - 100, 'タイトルへ戻る', { fontSize: '32px', fill: '#fff', backgroundColor: '#0055aa', padding: { x: 20, y: 10 } }).setOrigin(0.5).setInteractive().setAlpha(0);
        const totalAnimationTime = startDelay + resultLines.length * stepDelay + 500;
        this.time.delayedCall(totalAnimationTime, () => {
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
    
    getRankKeyForRp(rp) {
        if (rp >= 1500) return 'S+';
        if (rp >= 700) return 'S';
        if (rp >= 300) return 'A';
        if (rp >= 100) return 'B';
        return 'C';
    }
}