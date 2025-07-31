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
        this.cameras.main.fadeIn(300, 0, 0, 0); // フェードイン

        this.stateManager = this.sys.registry.get('stateManager');
        this.soundManager = this.sys.registry.get('soundManager');
        this.receivedData = this.sys.settings.data.transitionParams || {};

        // --- 1. 背景とBGM設定 ---
        this.cameras.main.setBackgroundColor('#1a1a1a');
        // ★★★ 仮の背景を追加 ★★★
        this.add.image(this.scale.width / 2, this.scale.height / 2, 'background1')
            .setAlpha(0.5) // 少し暗めにする
            .setDisplaySize(this.scale.width, this.scale.height);
        
        try { this.soundManager.playBgm('result_music'); }
        catch(e) { console.warn("BGM 'result_music' not found."); }

        // --- 2. スコア計算ロジック (変更なし) ---
        const finalRound = this.receivedData.finalRound || 1;
        const result = this.receivedData.result || 'lose';
        let score = (finalRound - 1) * 100;
        let expGained = (finalRound - 1) * 10;
        if (result === 'clear') {
            score += 1000;
            expGained += 100;
        }

        // --- 3. プレイヤープロファイルの読み込みと更新 (変更なし) ---
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

        // --- 4. 結果表示UIのアニメーション ---
        const titleText = (result === 'clear') ? 'GAME CLEAR' : 'GAME OVER';
        this.add.text(this.scale.width / 2, 80, titleText, { fontSize: '60px', fill: '#e0e0e0' }).setOrigin(0.5);

        const resultLines = [
            { label: '到達ラウンド', value: finalRound },
            { label: '獲得スコア', value: `${score} ${score > oldHighScore ? '(New!)' : ''}` },
            { label: '獲得経験値', value: expGained },
        ];
        
        const lineObjects = [];
        const startY = 200;
        const stepY = 70;

        // まずテキストオブジェクトを全て作成し、非表示にする
        resultLines.forEach((line, index) => {
            const y = startY + index * stepY;
            const labelText = this.add.text(this.scale.width / 2 - 100, y, line.label, { fontSize: '32px', fill: '#cccccc' }).setOrigin(1, 0.5).setAlpha(0);
            const valueText = this.add.text(this.scale.width / 2 + 100, y, line.value, { fontSize: '40px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0, 0.5).setAlpha(0);
            lineObjects.push({ label: labelText, value: valueText });
        });
        
        // Tweenのタイムラインを作成
        const timeline = this.tweens.createTimeline();

        lineObjects.forEach(line => {
            timeline.add({
                targets: [line.label, line.value],
                alpha: 1,
                scale: { from: 1.2, to: 1 },
                duration: 250,
                ease: 'Cubic.easeOut',
                onStart: () => {
                    // ★★★ SE再生をtry-catchで囲む ★★★
                    try { this.soundManager.playSe('se_result_pop'); }
                    catch(e) { console.warn("SE 'se_result_pop' not found."); }
                },
                offset: '-=50' // 前のアニメーションと少し重ねる
            });
        });

        // 全てのアニメーションが終わった後に、次のステップ（経験値バーなど）に進む
        timeline.on('complete', () => {
            console.log("リザルト表示完了。次の演出へ。");
            // ★ここに次の「経験値バー演出」の呼び出しを追加する
            this._playExpBarAnimation(expGained, profile.totalExp - expGained, newRank !== oldRank);
        });

        timeline.play();
        
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
