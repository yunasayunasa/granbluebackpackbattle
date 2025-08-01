// scenes/MatchingScene.js

export default class MatchingScene extends Phaser.Scene {
    constructor() {
        super('MatchingScene');
        this.stateManager = null;
        this.firebaseManager = null;
    }

    init(data) {
        console.log("MatchingScene: init", data);
        // isFirstRound フラグを受け取るため、initも定義しておく
        this.isFirstRound = (data && data.transitionParams && data.transitionParams.isFirstRound) || false;
    }

    create() {
        this.cameras.main.fadeIn(300, 0, 0, 0);

        this.stateManager = this.sys.registry.get('stateManager');
        this.firebaseManager = this.sys.registry.get('firebaseManager');

        this.add.image(this.scale.width / 2, this.scale.height / 2, 'background1')
            .setAlpha(0.5).setDisplaySize(this.scale.width, this.scale.height);

        this.add.text(this.scale.width / 2, this.scale.height / 2, '対戦相手を探しています...', {
            fontSize: '48px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 5
        }).setOrigin(0.5);

        this.startMatching();

        this.events.emit('scene-ready');
    }

    async startMatching() {
        // TODO: 将来的に sf.rank_match_profile.rank を参照
        const playerRank = this.stateManager.sf.player_profile.rank || 'C';
        const opponentList = await this.firebaseManager.findOpponentList(playerRank);

         if (opponentList) {
            // ★★★ このブロックを全面的に書き換え ★★★
            console.log("マッチング成功！ランクマッチセッションを初期化します。");
            const stateManager = this.sys.registry.get('stateManager');

            // --- 次の挑戦のためにsf変数をリセット ---
            stateManager.setSF('round', 1);
            // stateManager.setSF('coins', 0); // コインは挑戦料支払いなどで変動するので、ここではリセットしない
            stateManager.setSF('player_backpack', {}); // backpackは空から
            stateManager.setSF('player_inventory', ['sword', 'luria', 'potion']); // 初期装備
            
            // --- HUD表示のためにf変数をリセット＆初期化 ---
            const basePlayerMaxHp = stateManager.sf.player_base_max_hp || 100;
            stateManager.f = {}; 
            stateManager.setF('player_max_hp', basePlayerMaxHp);
            stateManager.setF('player_hp', basePlayerMaxHp);
            stateManager.setF('coins', stateManager.sf.coins || 0);
            // ★★★ 書き換えここまで ★★★

        } else {
            console.error("マッチングに失敗しました。タイトルに戻ります。");
            this._transitionToScene({
                to: 'GameScene',
                from: this.scene.key,
                params: { storage: 'title.ks' }
            });
        }
    }

    _transitionToScene(payload) {
        const transitionSpeed = 300;
        this.cameras.main.fadeOut(transitionSpeed, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.get('SystemScene').events.emit('request-scene-transition', payload);
        });
    }
}