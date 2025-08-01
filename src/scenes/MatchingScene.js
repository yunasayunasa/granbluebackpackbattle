// scenes/MatchingScene.js

export default class MatchingScene extends Phaser.Scene {
    constructor() {
        super('MatchingScene');
        this.stateManager = null;
        this.firebaseManager = null;
    }

    create() {
        this.cameras.main.fadeIn(300, 0, 0, 0);

        // --- 1. マネージャーの取得 ---
        this.stateManager = this.sys.registry.get('stateManager');
        this.firebaseManager = this.sys.registry.get('firebaseManager');

        // --- 2. UIの表示 ---
        this.add.image(this.scale.width / 2, this.scale.height / 2, 'background1')
            .setAlpha(0.5).setDisplaySize(this.scale.width, this.scale.height);

        this.add.text(this.scale.width / 2, this.scale.height / 2, '対戦相手を探しています...', {
            fontSize: '48px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 5
        }).setOrigin(0.5);

        // --- 3. マッチング処理の開始 ---
        this.startMatching();

        this.events.emit('scene-ready');
    }

    /**
     * マッチング処理を実行し、完了後に戦闘シーンへ遷移する
     * @private
     */
    async startMatching() {
        // プレイヤーのランクマッチランクを取得 (まだ未実装なので、仮のランクを使う)
        // TODO: 将来的に sf.rank_match_profile.rank を参照するようにする
        const playerRank = this.stateManager.sf.player_profile.rank || 'C';

        // FirebaseManagerに対戦相手リストの取得を依頼
        const opponentList = await this.firebaseManager.findOpponentList(playerRank);

        if (opponentList) {
            // 対戦相手が見つかったので、RankMatchBattleSceneへ遷移
            console.log("マッチング成功！戦闘シーンへ遷移します。");
            this._transitionToScene({
                to: 'RankMatchBattleScene',
                from: this.scene.key,
                params: {
                    ghostDataList: opponentList // 取得した10人分のリストを渡す
                }
            });
        } else {
            // 対戦相手が見つからなかった場合のエラーハンドリング
            console.error("マッチングに失敗しました。タイトルに戻ります。");
            // (ここにエラーメッセージを表示する処理を追加しても良い)
            this._transitionToScene({
                to: 'GameScene',
                from: this.scene.key,
                params: { storage: 'title.ks' }
            });
        }
    }

    /**
     * フェードアウトしてから指定のシーンへ遷移する (BattleSceneから拝借)
     * @private
     */
    _transitionToScene(payload) {
        const transitionSpeed = 300;
        this.cameras.main.fadeOut(transitionSpeed, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.get('SystemScene').events.emit('request-scene-transition', payload);
        });
    }
}