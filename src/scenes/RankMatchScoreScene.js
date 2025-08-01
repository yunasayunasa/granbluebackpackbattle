// scenes/RankMatchScoreScene.js

export default class RankMatchScoreScene extends Phaser.Scene {
    constructor() {
        super('RankMatchScoreScene');
        this.stateManager = null;
        this.soundManager = null;
        this.receivedData = null; // BattleSceneから受け取るデータ

        // ★ランクマッチ専用のランク定義
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
        
        // --- 1. ランクマッチプロファイルの初期化 ---
        if (!this.stateManager.sf.rank_match_profile) {
            this.stateManager.setSF('rank_match_profile', {
                rp: 0,
                rank: 'C',
                wins: 0,
                losses: 0
            });
        }
        
        // --- 2. 結果に基づいてRPを計算 ---
        const result = this.receivedData.result || 'lose'; // 'win' or 'lose'
        const finalRound = this.receivedData.finalRound || 1; // 勝利/敗北したラウンド
        
        const profile = this.stateManager.sf.rank_match_profile;
        const oldRp = profile.rp;
        const oldRank = profile.rank;

        // ★挑戦料 (仮の計算式)
        const entryFee = (Object.keys(this.rankMap).indexOf(oldRank) || 0) * 20;

        // ★勝利時の獲得RP (仮の計算式)
        const rewardRp = 50 + (finalRound * 5);
        
        let rpChange = 0;
        if (result === 'win') {
            rpChange = rewardRp;
            profile.wins++;
        } else { // 敗北時
            rpChange = -entryFee;
            profile.losses++;
        }
        
        profile.rp = Math.max(0, profile.rp + rpChange); // RPは0未満にならない

        // ★ランクの再計算
        // (getRankKeyForExpを参考に、getRankKeyForRpを後で作成)
        profile.rank = this.getRankKeyForRp(profile.rp);
        const newRank = profile.rank;

        this.stateManager.setSF('rank_match_profile', profile);

        // --- 3. 結果表示UI ---
        const titleText = (result === 'win') ? 'VICTORY' : 'DEFEAT';
        this.add.text(this.scale.width / 2, 80, titleText, { fontSize: '60px', fill: '#e0e0e0' }).setOrigin(0.5);

        const resultLines = [
            { label: '挑戦料', value: `-${entryFee} RP` },
            { label: '勝利ボーナス', value: (result === 'win' ? `+${rewardRp} RP` : '---') },
            { label: '結果', value: `${rpChange >= 0 ? '+' : ''}${rpChange} RP` },
            '---',
            { label: '現在ランク', value: `${oldRank} → ${newRank} ${newRank !== oldRank ? '(昇格!)' : ''}` },
            { label: '現在RP', value: `${profile.rp}` },
        ];
        
        // (ここに、ScoreSceneと同じ「デン！デン！」と表示するアニメーションロジックが入る)
        // 今回はまず静的に表示
        resultLines.forEach((line, index) => {
            if (line === '---') {
                this.add.line(0, 0, this.scale.width/2 - 200, 200 + index * 60, this.scale.width/2 + 200, 200 + index * 60, 0xffffff).setLineWidth(2);
            } else {
                 this.add.text(this.scale.width / 2, 200 + index * 60, `${line.label}: ${line.value}`, { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);
            }
        });

        // --- 4. 「タイトルへ」ボタン ---
        const titleButton = this.add.text(this.scale.width / 2, this.scale.height - 100, 'タイトルへ戻る', { /* ... */ }).setOrigin(0.5).setInteractive();
        titleButton.on('pointerdown', () => {
            // ... (タイトルへ戻る遷移処理) ...
        });
        
        this.events.emit('scene-ready');
    }
    
    // ★RPからランクキー('C', 'B'...)を返すヘルパーメソッド
    getRankKeyForRp(rp) {
        const rankKeys = Object.keys(this.rankMap);
        for (let i = rankKeys.length - 1; i >= 0; i--) {
            const key = rankKeys[i];
            const prevThreshold = i > 0 ? this.rankMap[rankKeys[i-1]].threshold : 0;
            if (rp >= prevThreshold) {
                return key;
            }
        }
        return rankKeys[0]; // C
    }
}
