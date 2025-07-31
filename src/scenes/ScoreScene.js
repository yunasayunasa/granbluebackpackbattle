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
    _playExpBarAnimation(expGained, oldTotalExp, didRankUp) {
        // (次のステップでこの中身を実装します)
        
        // 全ての演出が終わったので、「タイトルへ」ボタンを表示する
        this.tweens.add({
            targets: this.titleButton,
            alpha: 1,
            duration: 500
        });
    }
}
