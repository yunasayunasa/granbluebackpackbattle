// src/scenes/ActionScene.js

import CoinHud from '../ui/CoinHud.js'; // CoinHudは使用されていませんが、もし使うなら残します
export default class ActionScene extends Phaser.Scene {
    constructor() {
        super('ActionScene');
        this.receivedParams = null; 
        this.eventEmitted = false; // ★★★ 追加: イベント発行済みフラグ ★★★
        this.winButton = null; // ボタンへの参照をプロパティとして初期化
        this.loseButton = null; // ボタンへの参照をプロパティとして初期化
    }

    init(data) {
        this.receivedParams = data.transitionParams || {}; 
        console.log("ActionScene: init 完了。受け取ったパラメータ:", this.receivedParams);
        
        this.eventEmitted = false; // シーンが再initされる際にリセット
    }

    create() {
        console.log("ActionScene: create 開始");
        this.cameras.main.setBackgroundColor('#4a86e8');
        const player = this.add.text(100, 360, 'PLAYER', { fontSize: '48px', fill: '#fff' }).setOrigin(0.5);
        this.tweens.add({ targets: player, x: 1180, duration: 4000, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });
        
        // --- オーバーレイ表示リクエスト ---
        this.time.delayedCall(3000, () => {
            console.log("ActionScene: request-overlay を発行");
            // オーバーレイは遷移ではないので、isProcessingTransitionフラグは使わない
            // ただし、二重発行を防ぎたいなら、オーバーレイ用のフラグを別途持つことも検討
            this.scene.get('SystemScene').events.emit('request-overlay', { 
                from: this.scene.key,
                scenario: 'overlay_test.ks'
            });
        });

        // --- ★★★ 勝利ボタン ★★★ ---
        this.winButton = this.add.text(320, 600, 'ボスに勝利してノベルパートに戻る', { fontSize: '32px', fill: '#0c0', backgroundColor: '#000' })
            .setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        this.winButton.on('pointerdown', () => {
            // ★★★ 修正箇所: クリック時にボタンの入力を即座に無効化 ★★★
            this.winButton.disableInteractive(); 
            if (this.loseButton) this.loseButton.disableInteractive(); 

            // ★★★ 修正箇所: イベントがまだ発行されていない場合のみ発行 ★★★
            if (!this.eventEmitted) {
                this.eventEmitted = true; // フラグを立てる
                console.log("ActionScene: 勝利ボタンクリック -> return-to-novel を発行");
                this.scene.get('SystemScene').events.emit('return-to-novel', {
                    from: this.scene.key,
                    params: { 'f.battle_result': 'win' } 
                });
            } else {
                console.warn("ActionScene: return-to-novel イベントは既に発行されています。スキップします。");
            }
        });

        // --- ★★★ 敗北ボタン ★★★ ---
        this.loseButton = this.add.text(960, 600, 'ボスに敗北してノベルパートに戻る', { fontSize: '32px', fill: '#c00', backgroundColor: '#000' })
            .setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        this.loseButton.on('pointerdown', () => {
            // ★★★ 修正箇所: クリック時にボタンの入力を即座に無効化 ★★★
            this.loseButton.disableInteractive(); 
            if (this.winButton) this.winButton.disableInteractive(); 

            // ★★★ 修正箇所: イベントがまだ発行されていない場合のみ発行 ★★★
            if (!this.eventEmitted) {
                this.eventEmitted = true; // フラグを立てる
                console.log("ActionScene: 敗北ボタンクリック -> return-to-novel を発行");
                this.scene.get('SystemScene').events.emit('return-to-novel', {
                    from: this.scene.key,
                    params: { 'f.battle_result': 'lose' } 
                });
            } else {
                console.warn("ActionScene: return-to-novel イベントは既に発行されています。スキップします。");
            }
        });
        console.log("ActionScene: create 完了");
    }

    // SystemSceneがstart/stop/resumeを制御するので、このシーンでは特に処理は不要ですが、
    // ログのために残しておくのは良いでしょう。
    start() {
        super.start();
        console.log("ActionScene: start されました。");
    }

    stop() {
        super.stop();
        console.log("ActionScene: stop されました。");
        // シーン停止時にボタンがあれば破棄 (念のため)
        if (this.winButton) { this.winButton.destroy(); this.winButton = null; }
        if (this.loseButton) { this.loseButton.destroy(); this.loseButton = null; }
    }

    resume() {
        console.log("ActionScene: resume されました。入力を再有効化します。");
        // SystemSceneが制御するため、ここでの input.enabled = true; は不要。
        // ただし、ActionSceneが自分で入力有効化を管理したい場合はここに書く。
        // 現状、SystemSceneが責任を持つ設計なので、ここはコメントアウトするか削除しても良い。
        // this.input.enabled = true;
    }
}
