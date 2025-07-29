export default class ScoreScene extends Phaser.Scene {
    constructor() {
        super('ScoreScene');
        this.stateManager = null;
        this.soundManager = null;
        this.receivedData = null;
    }

    init(data) {
        // 前のシーンから渡されたデータを受け取る
        // 例: { from: 'GameClearScene', result: 'clear', finalRound: 10 }
        // 例: { from: 'BattleScene', result: 'lose', finalRound: 5 }
        this.receivedData = data;
    }

    create() {
        console.log("ScoreScene: create");
        this.stateManager = this.sys.registry.get('stateManager');
        this.soundManager = this.sys.registry.get('soundManager');

        // --- 1. 背景とBGM設定 ---
        this.cameras.main.setBackgroundColor('#1a1a1a');
      //  this.soundManager.playBgm('result_music'); // 仮の結果発表BGM

        // --- 2. スコア計算ロジック ---
        const finalRound = this.receivedData.finalRound || 1;
        const result = this.receivedData.result || 'lose';

        let score = (finalRound - 1) * 100; // 1ラウンドごとに100点
        let expGained = (finalRound - 1) * 10;   // 1ラウンドごとに10経験値

        // ゲームクリアボーナス
        if (result === 'clear') {
            score += 1000; // クリアボーナス
            expGained += 100;
        }

        // --- 3. プレイヤープロファイルの読み込みと更新 ---
        const profile = this.stateManager.sf.player_profile;
        const oldRank = profile.rank;
        const oldHighScore = profile.highScore || 0;

        profile.totalExp += expGained;
        if (result === 'clear') {
            profile.totalWins = (profile.totalWins || 0) + 1;
        }
        profile.highScore = Math.max(oldHighScore, score);

        // ランク判定（仮）
        // このテーブルは後で自由に調整できます
        const rankTable = [
            { exp: 0,    rank: "駆け出し" },
            { exp: 100,  rank: "ブロンズ" },
            { exp: 300,  rank: "シルバー" },
            { exp: 700,  rank: "ゴールド" },
            { exp: 1500, rank: "プラチナ" },
        ];
        
        let newRank = oldRank;
        for (let i = rankTable.length - 1; i >= 0; i--) {
            if (profile.totalExp >= rankTable[i].exp) {
                newRank = rankTable[i].rank;
                break;
            }
        }
        profile.rank = newRank;

        // ★★★ StateManagerに更新後のプロファイルを保存 ★★★
        this.stateManager.setSF('player_profile', profile);

        // --- 4. 結果表示UIの作成 ---
        const titleText = (result === 'clear') ? 'GAME CLEAR' : 'GAME OVER';
        this.add.text(this.scale.width / 2, 80, titleText, { fontSize: '60px', fill: '#e0e0e0' }).setOrigin(0.5);

        // 表示用のテキストを作成
        const resultLines = [
            `到達ラウンド: ${finalRound}`,
            `獲得スコア: ${score}`,
            `ハイスコア: ${profile.highScore} ${score > oldHighScore ? '(New!)' : ''}`,
            `---`,
            `獲得経験値: ${expGained}`,
            `累計経験値: ${profile.totalExp}`,
            `ランク: ${oldRank} → ${newRank} ${newRank !== oldRank ? '(Rank Up!)' : ''}`
        ];

        resultLines.forEach((line, index) => {
            this.add.text(this.scale.width / 2, 180 + index * 50, line, { fontSize: '32px', fill: '#ffffff' }).setOrigin(0.5);
        });

        // --- 5. 「タイトルへ」ボタン ---
        const titleButton = this.add.text(this.scale.width / 2, this.scale.height - 100, 'タイトルへ戻る', {
            fontSize: '32px', fill: '#fff', backgroundColor: '#0055aa', padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive();

        titleButton.on('pointerdown', () => {
            console.log("ScoreScene: Returning to TitleScene.");
            
            // ★重要★ 次の挑戦のために、プロファイル以外のsf変数をリセットする
            this.stateManager.setSF('player_backpack', {});
            this.stateManager.setSF('player_inventory', ['sword', 'shield', 'potion']);
            this.stateManager.setSF('round', 1);
            this.stateManager.setSF('coins', 0);
            this.stateManager.setSF('player_base_max_hp', 100);

            // f変数もリセット
            this.stateManager.f = {};

            // TitleSceneへ遷移
            this.scene.get('SystemScene').events.emit('request-scene-transition', {
                to: 'TitleScene', // TitleSceneを後で作成します
                from: this.scene.key
            });
        });
        
        // --- 6. 遷移完了を通知 ---
        this.events.emit('scene-ready');
    }
}