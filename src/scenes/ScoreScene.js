export default class ScoreScene extends Phaser.Scene {
    constructor() {
        super('ScoreScene');
        this.stateManager = null;
        this.soundManager = null;
        this.receivedData = null;
    }

     init(data) {
        // ★★★ このように修正 ★★★
        // どんな形式でデータが来ても、正しく受け取れるようにする
        this.receivedData = data.transitionParams || data || {};
        console.log("ScoreScene init. Received data:", this.receivedData);
    }

    create() {
        console.log("ScoreScene: create");
        this.cameras.main.fadeIn(300, 0, 0, 0);

        this.stateManager = this.sys.registry.get('stateManager');
        this.soundManager = this.sys.registry.get('soundManager');
        this.receivedData = this.sys.settings.data.transitionParams || {};

        this.add.image(this.scale.width / 2, this.scale.height / 2, 'background1')
            .setAlpha(0.5)
            .setDisplaySize(this.scale.width, this.scale.height);
        
        try { this.soundManager.playBgm('result_music'); }
        catch(e) { console.warn("BGM 'result_music' not found."); }

        const finalRound = this.receivedData.finalRound || 1;
        const result = this.receivedData.result || 'lose';
        let score = (finalRound - 1) * 100;
        let expGained = (finalRound - 1) * 10;
        if (result === 'clear') {
            score += 1000;
            expGained += 100;
        }

        const profile = this.stateManager.sf.player_profile;
        const oldRank = profile.rank;
        const oldHighScore = profile.highScore || 0;
        profile.totalExp += expGained;
        if (result === 'clear') {
            profile.totalWins = (profile.totalWins || 0) + 1;
        }
        profile.highScore = Math.max(oldHighScore, score);
        const rankTable = [
            { exp: 0,    rank: "駆け出し" }, { exp: 100,  rank: "ブロンズ" }, { exp: 300,  rank: "シルバー" },
            { exp: 700,  rank: "ゴールド" }, { exp: 1500, rank: "プラチナ" },
        ];
        let newRank = oldRank;
        for (let i = rankTable.length - 1; i >= 0; i--) {
            if (profile.totalExp >= rankTable[i].exp) {
                newRank = rankTable[i].rank;
                break;
            }
        }
        profile.rank = newRank;
        this.stateManager.setSF('player_profile', profile);

        // ★★★ このブロックを全面的に書き換え (タイムライン不使用版) ★★★
        const titleText = (result === 'clear') ? 'GAME CLEAR' : 'GAME OVER';
        this.add.text(this.scale.width / 2, 80, titleText, { fontSize: '60px', fill: '#e0e0e0' }).setOrigin(0.5);

        const resultLines = [
            { label: '到達ラウンド', value: finalRound },
            { label: '獲得スコア', value: `${score} ${score > oldHighScore ? '(New!)' : ''}` },
            { label: '獲得経験値', value: expGained },
        ];
        
        const startY = 200;
        const stepY = 70;
        const startDelay = 500; // 最初のアニメーションが始まるまでの時間
        const stepDelay = 300; // 各項目が表示される時間差

        resultLines.forEach((line, index) => {
            const y = startY + index * stepY;
            
            // ラベルと値のテキストオブジェクトを作成し、最初は見えなくしておく
            const labelText = this.add.text(this.scale.width / 2 - 100, y, line.label, { fontSize: '32px', fill: '#cccccc' }).setOrigin(1, 0.5).setAlpha(0).setScale(1.2);
            const valueText = this.add.text(this.scale.width / 2 + 100, y, line.value, { fontSize: '40px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0, 0.5).setAlpha(0).setScale(1.2);

            // indexを使って、各アニメーションの開始時間をずらす
            const delay = startDelay + index * stepDelay;

            // ラベル用Tween
            this.tweens.add({
                targets: labelText,
                delay: delay,
                alpha: 1,
                scale: 1,
                duration: 250,
                ease: 'Cubic.easeOut',
                onStart: () => {
                    try { this.soundManager.playSe('se_result_pop'); }
                    catch(e) { console.warn("SE 'se_result_pop' not found."); }
                }
            });

            // 値用Tween (同じタイミングで開始)
            this.tweens.add({
                targets: valueText,
                delay: delay,
                alpha: 1,
                scale: 1,
                duration: 250,
                ease: 'Cubic.easeOut'
            });
        });

        // 最後の項目のアニメーションが終わった後に、次のステップに進む
        const totalAnimationTime = startDelay + resultLines.length * stepDelay + 250;
        this.time.delayedCall(totalAnimationTime, () => {
            console.log("リザルト表示完了。次の演出へ。");
            this._playExpBarAnimation(expGained, profile.totalExp - expGained, newRank !== oldRank);
        });

        this.titleButton = this.add.text(this.scale.width / 2, this.scale.height - 100, 'タイトルへ戻る', {
            fontSize: '32px', fill: '#fff', backgroundColor: '#0055aa', padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive().setAlpha(0);
        
        // --- 5. 「タイトルへ」ボタン (最初は非表示) ---
        this.titleButton = this.add.text(this.scale.width / 2, this.scale.height - 100, 'タイトルへ戻る', {
            fontSize: '32px', fill: '#fff', backgroundColor: '#0055aa', padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive().setAlpha(0); // ★alpha: 0 に変更
this.titleButton.on('pointerdown', () => {
    
            console.log("リセット前 コイン:", this.stateManager.sf.coins);
            this.stateManager.setSF('player_backpack', {});
            this.stateManager.setSF('player_inventory', ['sword', 'luria', 'potion']);
            this.stateManager.setSF('round', 1);
            this.stateManager.setSF('coins', 20);
            this.stateManager.setSF('player_base_max_hp', 100);
            console.log("リセット後 コイン:", this.stateManager.sf.coins);
            // f変数もクリア
            this.stateManager.f = {};
            // ★★★★★ 修正ここまで ★★★★★
            // [jump storage="GameScene" params="{storage:'title.ks'}"] と同じ効果を
            // request-scene-transition イベントで実現する。
            // これにより、既存のシーンを停止し、新しいGameSceneを起動する。
            this.scene.get('SystemScene').events.emit('request-scene-transition', {
                to: 'GameScene',
                from: this.scene.key,
                params: {
                    storage: 'title.ks' // GameSceneのinitが解釈するパラメータ
                }
            });
        });
        
        // --- 6. 遷移完了を通知 ---
        this.events.emit('scene-ready');
    }
   // ScoreScene.js の末尾

    // ★★★ このメソッドを全文置き換え ★★★
    async _playExpBarAnimation(expGained, oldTotalExp, didRankUp) {
        const { width, height } = this.scale;
        
        // --- 1. ランク定義 ---
        const rankMap = {
            'C': { threshold: 100, image: 'rank_c' },
            'B': { threshold: 300, image: 'rank_b' },
            'A': { threshold: 700, image: 'rank_a' },
            'S': { threshold: 1500, image: 'rank_s' },
            'S+': { threshold: 99999, image: 'rank_s_plus' },
        };
        const oldRankData = rankMap[this.stateManager.sf.player_profile.rank] || rankMap['C'];
        
        // --- 2. EXPバーのUIを作成 ---
        const barWidth = 600;
        const barHeight = 30;
        const barX = width / 2;
        const barY = height / 2 + 100;
        
        this.add.graphics().fillStyle(0x333333).fillRect(barX - barWidth / 2, barY - barHeight / 2, barWidth, barHeight);
        const expBar = this.add.graphics();
        
        // ランクアップ前のEXP割合を計算
        const oldExpInRank = oldTotalExp - (Object.values(rankMap).find(r => r.threshold > oldTotalExp)?.threshold - rankMap[Object.keys(rankMap)[Object.keys(rankMap).indexOf(this.stateManager.sf.player_profile.rank)-1]]?.threshold || 0);

        const startWidth = (oldExpInRank / oldRankData.threshold) * barWidth;
        expBar.fillStyle(0xffdd00).fillRect(barX - barWidth / 2, barY - barHeight / 2, startWidth, barHeight);
        
        const expText = this.add.text(barX, barY + 40, `EXP: ${oldTotalExp} / ${oldRankData.threshold}`, { fontSize: '24px', fill: '#fff' }).setOrigin(0.5);

        // --- 3. EXPが増えるアニメーション ---
        try { this.soundManager.playSe('se_exp_bar_fill'); } catch(e) {}
        
        const newTotalExp = oldTotalExp + expGained;
        let finalWidth = ((newTotalExp % oldRankData.threshold) / oldRankData.threshold) * barWidth;
        if (didRankUp) finalWidth = barWidth; // ランクアップ時は満タンまで

        this.tweens.add({
            targets: { value: startWidth },
            value: finalWidth,
            duration: 1500,
            ease: 'Cubic.easeOut',
            onUpdate: (tween) => {
                expBar.clear().fillStyle(0xffdd00).fillRect(barX - barWidth / 2, barY - barHeight / 2, tween.getValue(), barHeight);
                const currentExp = oldTotalExp + Math.floor((tween.getValue() / barWidth) * oldRankData.threshold * (expGained/expGained));
                 expText.setText(`EXP: ${currentExp} / ${oldRankData.threshold}`);

            },
            onComplete: async () => {
                if (didRankUp) {
                    await this._playRankUpEffect();
                    // ★ ランクアップ後のバーアニメーションは、今回は省略（複雑になりすぎるため）
                }

                // 全ての演出が終わったので、「タイトルへ」ボタンを表示する
                this.tweens.add({
                    targets: this.titleButton,
                    alpha: 1,
                    duration: 500
                });
            }
        });
    }
    
    // ★★★ ランクアップ演出用のメソッドを新規追加 ★★★
    async _playRankUpEffect() {
        return new Promise(resolve => {
            const { width, height } = this.scale;
            const newRankKey = this.stateManager.sf.player_profile.rank;
            const rankImageKey = {
                'C':'rank_c', 'B':'rank_b', 'A':'rank_a', 'S':'rank_s', 'S+':'rank_s_plus'
            }[newRankKey] || 'rank_c';

            try { this.soundManager.playSe('se_rank_up'); } catch(e) {}
            this.cameras.main.shake(300, 0.01);

            const rankImage = this.add.image(width / 2, height / 2, rankImageKey)
                .setDepth(7000)
                .setScale(3)
                .setAlpha(0);

            // ★★★ ブルームエフェクトを適用 ★★★
            const bloom = rankImage.setPostPipeline('Bloom');
            bloom.bloomRadius = 0.0;
            bloom.bloomIntensity = 0.0;
            
            this.tweens.chain({
                targets: rankImage,
                tweens: [
                    { scale: 1, alpha: 1, duration: 300, ease: 'Elastic.Out(1, 0.5)' }, // 叩きつけ
                    { scale: 1, duration: 1000, onStart: () => { // 発光
                        this.tweens.add({ targets: bloom, bloomRadius: 5.0, bloomIntensity: 1.5, duration: 500, ease: 'Cubic.easeOut', yoyo: true });
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
