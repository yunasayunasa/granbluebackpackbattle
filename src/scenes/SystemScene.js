import SoundManager from '../core/SoundManager.js';

export default class SystemScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SystemScene' });
        this.globalCharaDefs = null;
        this.isProcessingTransition = false;
        this.initialGameData = null;
        this.novelBgmKey = null;
        
        // ★★★ 暗幕ワイプ用のプロパティを追加 ★★★
        this.transitionWipe = null;
    }

    init(data) {
        if (data && data.initialGameData) {
            this.initialGameData = data.initialGameData;
        }
    }

    create() {
        console.log("SystemScene: 起動・グローバルサービスのセットアップを開始。");
        const soundManager = new SoundManager(this.game);
        this.sys.registry.set('soundManager', soundManager);
        this.input.once('pointerdown', () => soundManager.resumeContext(), this);
        console.log("SystemScene: SoundManagerを生成・登録しました。");

        // ★★★ 暗幕オブジェクトを作成 ★★★
        const { width, height } = this.scale;
        this.transitionWipe = this.add.rectangle(width * 1.5, height / 2, width, height, 0x000000)
            .setDepth(10000) // どんなUIよりも手前に表示
            .setScrollFactor(0); // カメラが動いても追従しない

        this.events.on('request-scene-transition', this._handleRequestSceneTransition, this);
        this.events.on('return-to-novel', this._handleReturnToNovel, this);
        this.events.on('request-overlay', this._handleRequestOverlay, this);
        this.events.on('end-overlay', this._handleEndOverlay, this);
        
        if (this.initialGameData) {
            this._startInitialGame(this.initialGameData);
        }
    }

    _startInitialGame(initialData) {
        this.globalCharaDefs = initialData.charaDefs;
        console.log(`[SystemScene] 初期ゲーム起動リクエストを受信。`);
        this.scene.launch('UIScene');
        this._startAndMonitorScene('GameScene', {
            charaDefs: this.globalCharaDefs,
            startScenario: initialData.startScenario,
            startLabel: null,
        });
    }
    
    _handleRequestSceneTransition(data) {
        console.log(`[SystemScene] シーン遷移リクエスト: ${data.from} -> ${data.to}`);
        if (this.scene.isActive(data.from)) {
            this.scene.stop(data.from); 
        }
        if (this.scene.isActive('UIScene')) {
            // UISceneはstopせず、不可視にするだけ
        }
        this._startAndMonitorScene(data.to, {
            transitionParams: data.params 
        });
    };
    
    _handleReturnToNovel(data) {
        console.log(`[SystemScene] ノベル復帰リクエスト: from ${data.from}`);
        if (this.scene.isActive(data.from)) {
            this.scene.stop(data.from);
        }
        if (this.scene.isActive('UIScene')) {
            // UISceneはstopせず、可視にする
        }
        this._startAndMonitorScene('GameScene', {
            charaDefs: this.globalCharaDefs,
            resumedFrom: data.from,
            returnParams: data.params,
        });
    }

    // _handleRequestOverlay と _handleEndOverlay は変更なし
    _handleRequestOverlay(data) { /* ... */ }
    _handleEndOverlay(data) { /* ... */ }

    // ★★★ このメソッドを全面的に書き換え ★★★
    _startAndMonitorScene(sceneKey, params) {
        if (this.isProcessingTransition) {
            console.warn(`[SystemScene] 遷移処理中に新たな遷移リクエスト(${sceneKey})が、無視されました。`);
            return;
        }
        this.isProcessingTransition = true;
        this.game.input.enabled = false;
        console.log(`[SystemScene] シーン[${sceneKey}]の起動を開始。ゲーム全体の入力を無効化。`);
        this.tweens.killAll();
        console.log("[SystemScene] すべての既存Tweenを強制終了しました。");

        const { width, height } = this.scale;
        const transitionSpeed = 300; // ワイプの速度(ミリ秒)
this.transitionWipe.setVisible(true);
        // 1. 暗幕で画面を覆う (ワイプイン)
        this.tweens.add({
            targets: this.transitionWipe,
            x: width / 2,
            duration: transitionSpeed,
            ease: 'Expo.easeInOut',
            onComplete: () => {
                // 2. 暗幕が画面を覆い隠した後に、シーンの準備を開始
                const targetScene = this.scene.get(sceneKey);
                
                const onSceneReady = () => {
                    this._onTransitionComplete(sceneKey);
                };

                if (sceneKey === 'GameScene') {
                    targetScene.events.once('gameScene-load-complete', onSceneReady);
                } else {
                    targetScene.events.once('scene-ready', onSceneReady);
                }

                this.scene.run(sceneKey, params);
            }
        });
    }

    // ★★★ このメソッドを全面的に書き換え ★★★
    _onTransitionComplete(sceneKey) {
        const { width, height } = this.scale;
        const transitionSpeed = 300;

        // 3. 新しいシーンの準備が完了したら、暗幕を開ける (ワイプアウト)
        this.tweens.add({
            targets: this.transitionWipe,
            x: -width / 2,
            duration: transitionSpeed,
            ease: 'Expo.easeInOut',
            onComplete: () => {
                // 4. 暗幕が完全に画面外に出たら、遷移完了処理を行う
                this.isProcessingTransition = false;
                this.game.input.enabled = true;
                console.log(`[SystemScene] シーン[${sceneKey}]の遷移が完了。ゲーム全体の入力を再有効化。`);
                this.events.emit('transition-complete', sceneKey);

                // 暗幕を次の遷移のために画面右側に戻しておく
                this.transitionWipe.setX(width * 1.5);
                this.transitionWipe.setVisible(false);
            }
        });
    }



    /**
     * オーバーレイ表示のリクエストを処理
     * @param {object} data - { from: string, scenario: string }
     */
    _handleRequestOverlay(data) {
        console.log(`[SystemScene] オーバーレイ表示リクエストを受信 (from: ${data.from})`);

        // オーバーレイ表示中は、背後のシーンの入力を無効化する
        const fromScene = this.scene.get(data.from);
        if (fromScene && fromScene.scene.isActive()) {
            fromScene.input.enabled = false;
        }

        // UISceneはオーバーレイの下に表示され続けるので、入力は有効のまま
        
        // NovelOverlaySceneを現在のシーンの上にlaunchする
        this.scene.launch('NovelOverlayScene', { 
            scenario: data.scenario,
            charaDefs: this.globalCharaDefs,
            returnTo: data.from // どのシーンに戻るべきかを渡す
        });
    }

    /**
     * オーバーレイ終了のリクエストを処理
     * @param {object} data - { from: 'NovelOverlayScene', returnTo: string }
     */
    _handleEndOverlay(data) {
        console.log(`[SystemScene] オーバーレイ終了リクエストを受信 (return to: ${data.returnTo})`);

        // NovelOverlaySceneを停止する
        if (this.scene.isActive(data.from)) {
            this.scene.stop(data.from); 
        }

        // 元のシーンの入力を再度有効化する
        const returnScene = this.scene.get(data.returnTo);
        if (returnScene && returnScene.scene.isActive()) { 
            returnScene.input.enabled = true; 
            console.log(`[SystemScene] シーン[${data.returnTo}]の入力を再有効化しました。`);
        }
    }
}
