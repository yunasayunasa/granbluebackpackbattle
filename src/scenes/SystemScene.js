import SoundManager from '../core/SoundManager.js';

export default class SystemScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SystemScene' });
        this.globalCharaDefs = null;
        this.isProcessingTransition = false;
        this.initialGameData = null;
        this.novelBgmKey = null;
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

        const { width, height } = this.scale;
        this.transitionWipe = this.add.rectangle(width * 1.5, height / 2, width, height, 0x000000)
            .setDepth(10000)
            .setScrollFactor(0);
        this.transitionWipe.setInteractive(false); 
        // ★★★ 暗幕を最初は非表示にしておく ★★★
        this.transitionWipe.setVisible(false);

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
        // UISceneの表示制御は、各シーンが責任を持つか、
        // あるいは 'transition-complete' イベントを購読して行うのがより堅牢です。
        // ここでは一旦コメントアウトします。
        // if (this.scene.isActive('UIScene')) {
        //     this.scene.get('UIScene').setVisible(false);
        // }
        this._startAndMonitorScene(data.to, {
            transitionParams: data.params 
        });
    };
    
    _handleReturnToNovel(data) {
        console.log(`[SystemScene] ノベル復帰リクエスト: from ${data.from}`);
        if (this.scene.isActive(data.from)) {
            this.scene.stop(data.from);
        }
        // if (this.scene.isActive('UIScene')) {
        //     this.scene.get('UIScene').setVisible(true);
        // }
        this._startAndMonitorScene('GameScene', {
            charaDefs: this.globalCharaDefs,
            resumedFrom: data.from,
            returnParams: data.params,
        });
    }

    _handleRequestOverlay(data) {
        console.log(`[SystemScene] オーバーレイ表示リクエストを受信 (from: ${data.from})`);
        const fromScene = this.scene.get(data.from);
        if (fromScene && fromScene.scene.isActive()) {
            fromScene.input.enabled = false;
        }
        this.scene.launch('NovelOverlayScene', { 
            scenario: data.scenario,
            charaDefs: this.globalCharaDefs,
            returnTo: data.from
        });
    }

    _handleEndOverlay(data) {
        console.log(`[SystemScene] オーバーレイ終了リクエストを受信 (return to: ${data.returnTo})`);
        if (this.scene.isActive(data.from)) {
            this.scene.stop(data.from); 
        }
        const returnScene = this.scene.get(data.returnTo);
        if (returnScene && returnScene.scene.isActive()) { 
            returnScene.input.enabled = true; 
            console.log(`[SystemScene] シーン[${data.returnTo}]の入力を再有効化しました。`);
        }
    }

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

        const { width } = this.scale;
        const transitionSpeed = 300;

        this.transitionWipe.setVisible(true);

        this.tweens.add({
            targets: this.transitionWipe,
            x: width / 2,
            duration: transitionSpeed,
            ease: 'Expo.easeInOut',
            onComplete: () => {
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

    _onTransitionComplete(sceneKey) {
        const { width } = this.scale;
        const transitionSpeed = 300;

        this.tweens.add({
            targets: this.transitionWipe,
            x: -width / 2,
            duration: transitionSpeed,
            ease: 'Expo.easeInOut',
            onComplete: () => {
                this.isProcessingTransition = false;
                this.game.input.enabled = true;
                console.log(`[SystemScene] シーン[${sceneKey}]の遷移が完了。ゲーム全体の入力を再有効化。`);
                this.events.emit('transition-complete', sceneKey);
                this.transitionWipe.setX(width * 1.5);
                this.transitionWipe.setVisible(false);
            }
        });
    }
}
