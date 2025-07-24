// src/ui/Tooltip.js (タップ対応・改訂版)

export default class Tooltip extends Phaser.GameObjects.Container {
    constructor(scene) {
        super(scene, 0, 0);
        
       // ★★★ 背景のサイズを大きくする ★★★
        this.background = scene.add.rectangle(0, 0, 500, 400, 0x000000, 0.9).setOrigin(0);
        
        // ★★★ テキストのwordWrapの幅を広げる ★★★
        this.itemText = scene.add.text(10, 10, '', { fontSize: '24px', fill: '#fff', wordWrap: { width: 280 } }); // 左右マージン20px
        
        this.add([this.background, this.itemText]);
        this.setDepth(999);
        this.setVisible(false);
        this.currentTarget = null;
        
        scene.add.existing(this);
    }

    /**
     * ツールチップを表示または更新する
     * @param {Phaser.GameObjects.Image} target - タップされたアイテム
     * @param {string} text - 表示するテキスト
     */
    show(target, text) {
        // 同じターゲットを連続でタップしたら隠す
        if (this.visible && this.currentTarget === target) {
            this.hide();
            return;
        }

        this.itemText.setText(text);
        
        // ★ 表示位置をターゲットの右下か左下に自動調整
        if (target.x > this.scene.scale.width / 2) {
            // 右側のアイテムなら、左に表示
            this.setPosition(target.x - this.background.width, target.y + 20);
        } else {
            // 左側のアイテムなら、右に表示
            this.setPosition(target.x + 20, target.y + 20);
        }

        this.setVisible(true);
        this.currentTarget = target;
    }

    hide() {
        this.setVisible(false);
        this.currentTarget = null;
    }
}