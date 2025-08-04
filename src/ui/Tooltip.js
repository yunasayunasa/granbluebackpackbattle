// src/ui/Tooltip.js (最終修正版)

// ui/Tooltip.js

export default class Tooltip extends Phaser.GameObjects.Container {
    constructor(scene) {
        super(scene, 0, 0);

        this.background = scene.add.rectangle(0, 0, 0, 0, 0x000000, 0.8);
        this.textObject = scene.add.text(0, 0, '', {
            fontSize: '18px',
            fill: '#ffffff',
            align: 'left',
            wordWrap: { width: 250, useAdvancedWrap: true }
        }).setOrigin(0.5);

        this.add([this.background, this.textObject]);
        this.setDepth(20000).setVisible(false).setScrollFactor(0);
        
        scene.add.existing(this);
    }

    // ★★★ この setText メソッドを、サイズを返すように修正 ★★★
    setText(text) {
        this.textObject.setText(text);
        
        // テキストのサイズを取得
        const bounds = this.textObject.getBounds();
        const padding = 10;
        const newWidth = bounds.width + padding * 2;
        const newHeight = bounds.height + padding * 2;

        // 背景のサイズを更新
        this.background.setSize(newWidth, newHeight);
        
        // コンテナ自体のサイズも更新
        this.setSize(newWidth, newHeight);

        // ★★★ 計算したサイズを返す ★★★
        return { width: newWidth, height: newHeight };
    }

    // ★★★ show メソッドを、setTextが返すサイズを使うように修正 ★★★
    show(target, text) {
        const tooltipSize = this.setText(text); // ★ setTextからサイズを受け取る
        this.setVisible(true);

        const targetBounds = target.getBounds();
        const sceneWidth = this.scene.scale.width;
        const sceneHeight = this.scene.scale.height;
        const offset = 10;

        let newX = targetBounds.centerX;
        let newY;

        if (targetBounds.centerY < sceneHeight / 2) {
            // 上半分 -> 下に表示
            newY = targetBounds.bottom + offset + tooltipSize.height / 2;
        } else {
            // 下半分 -> 上に表示
            newY = targetBounds.top - offset - tooltipSize.height / 2;
        }

        // 左右のはみ出し防止
        if (newX - tooltipSize.width / 2 < 0) {
            newX = tooltipSize.width / 2;
        }
        if (newX + tooltipSize.width / 2 > sceneWidth) {
            newX = sceneWidth - tooltipSize.width / 2;
        }
        
        this.setPosition(newX, newY);
    }
    
    hide() {
        this.setVisible(false);
    }
}
    // ★★★ 2. showAt メソッドを正しく実装 ★★★
    /**
     * 特定の座標を基準にツールチップを（主に上方向に）表示する
     * @param {number} x - 表示の基準となるX座標
     * @param {number} y - 表示の基準となるY座標
     * @param {string} text - 表示するテキスト
     */
    showAt(x, y, text) {
        this.setText(text);
        this.setVisible(true);
        this.currentTarget = null; // 特定のターゲットに紐づかない

        // アンカーポイント(x,y)の中心から上に表示されるように計算
        const newX = x - this.width / 2;
        const newY = y - this.height - 10; // 10pxのマージン

        this.setPosition(newX, newY);

        // 画面外にはみ出さないように最終調整
        if (this.x < 10) this.x = 10;
        if (this.x + this.width > this.scene.scale.width - 10) {
            this.x = this.scene.scale.width - this.width - 10;
        }
        if (this.y < 10) this.y = 10;
    }

    hide() {
        this.setVisible(false);
        this.currentTarget = null;
    }
}