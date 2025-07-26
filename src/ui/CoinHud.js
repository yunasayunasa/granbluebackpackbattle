// src/ui/CoinHud.js (sf対応・完成版)

export default class CoinHud extends Phaser.GameObjects.Container {
    constructor(scene, config) {
        const x = config.x || 0;
        const y = config.y || 0;
        const stateManager = config.stateManager;

        super(scene, x, y);

        if (!stateManager) {
            console.error("CoinHud: constructorにstateManagerが渡されていません！");
            return;
        }
        this.stateManager = stateManager;

        // アイコンとテキストの作成 (💰はフォントによって表示できない可能性があるため、画像キーを推奨)
        const icon = scene.add.image(0, 0, 'coin_icon'||'💰');
        icon.setScale(0.5); // サイズ調整
        this.add(icon);
        
        this.coinText = scene.add.text(40, 0, '0', {
            fontSize: '32px',
            fill: '#ffd700', // 金色
            stroke: '#4a2500', // 茶色い縁取り
            strokeThickness: 4
        }).setOrigin(0, 0.5);
        this.add(this.coinText);

        // ★★★ 修正箇所: sf.coins から初期値を取得 ★★★
        this.updateCoinText(this.stateManager.sf.coins || 0);

        // ★★★ 修正箇所: sf変数の変更イベントを購読 ★★★
        this.stateManager.on('sf-variable-changed', this.onSFVariableChanged, this);

        scene.add.existing(this);
    }

    // ★★★ 修正箇所: sf変数が変更されたときに呼ばれるコールバック ★★★
    onSFVariableChanged(key, value) {
        // 'coins'キーの変更のみを監視
        if (key === 'coins') {
            this.updateCoinText(value);
        }
    }

    updateCoinText(value) {
        if (this.coinText) {
            this.coinText.setText(String(value || 0)); // valueがundefinedの場合も考慮
        }
    }
    
    destroy(fromScene) {
        console.log("CoinHud: destroyされました。イベントリスナーを解除します。");
        if (this.stateManager) {
            // ★★★ 修正箇所: sf変数のイベントリスナーを解除 ★★★
            this.stateManager.off('sf-variable-changed', this.onSFVariableChanged, this);
        }
        super.destroy(fromScene);
    }
}