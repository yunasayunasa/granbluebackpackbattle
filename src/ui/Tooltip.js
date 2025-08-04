// src/ui/Tooltip.js (最終修正版)

export default class Tooltip extends Phaser.GameObjects.Container {
    constructor(scene) {
        super(scene, 0, 0);
        
        // 背景のサイズを一旦小さめに設定（テキストに合わせて自動調整するため）
        this.background = scene.add.rectangle(0, 0, 100, 100, 0x000000, 0.9).setOrigin(0);
        
        this.itemText = scene.add.text(15, 15, '', { // マージンを少し広げる
            fontSize: '24px', 
            fill: '#fff', 
            wordWrap: { width: 470 } // 背景サイズ - マージン*2
        });
        
        this.add([this.background, this.itemText]);
        this.setDepth(999);
        this.setVisible(false);
        this.currentTarget = null;
        
        scene.add.existing(this);
    }

    // ★★★ 1. setText メソッドを正しく実装 ★★★
    /**
     * ツールチップのテキスト内容を更新し、背景サイズを自動調整する
     * @param {string} newText - 表示する新しいテキスト
     */
    setText(newText) {
        if (this.itemText) {
            this.itemText.setText(newText);
        }
        
        // テキストの実際の幅と高さに合わせて、背景のサイズを調整
        if (this.background && this.itemText) {
            const newWidth = this.itemText.width + 30; // 左右マージン
            const newHeight = this.itemText.height + 30; // 上下マージン
            this.background.setSize(newWidth, newHeight);
            
            // コンテナ自体のサイズも更新（setPositionなどで使うため）
            this.setSize(newWidth, newHeight);
        }
    }

    /**
     * 特定のGameObjectを基準にツールチップを表示する
     * @param {Phaser.GameObjects.GameObject} target - 表示の基準となるオブジェクト
     * @param {string} text - 表示するテキスト
     */
    // ui/Tooltip.js

    show(target, text) {
        this.setText(text);
        this.setVisible(true);

        // ★★★ このブロックを全面的に書き換え ★★★
        
        const targetBounds = target.getBounds();
        const tooltipBounds = this.getBounds();
        const sceneHeight = this.scene.scale.height;

        // ターゲットオブジェクトのY座標で判定
        if (targetBounds.centerY < sceneHeight / 2) {
            // 画面の上半分にある場合: ターゲットの下に表示
            Phaser.Display.Align.In.TopCenter(this, targetBounds, 0, -10);
        } else {
            // 画面の下半分にある場合: ターゲットの上に表示
            Phaser.Display.Align.In.BottomCenter(this, targetBounds, 0, 10);
        }

        // 左右が画面外にはみ出ないように調整
        if (this.x - tooltipBounds.width / 2 < 0) {
            this.x = tooltipBounds.width / 2;
        }
        if (this.x + tooltipBounds.width / 2 > this.scene.scale.width) {
            this.x = this.scene.scale.width - tooltipBounds.width / 2;
        }
        
        // ★★★ 書き換えここまで ★★★
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