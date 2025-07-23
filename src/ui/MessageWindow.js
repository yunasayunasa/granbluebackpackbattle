const Container = Phaser.GameObjects.Container;

export default class MessageWindow extends Container {
    constructor(scene, soundManager, configManager) {
        super(scene, 0, 0);

        this.scene = scene; // ★ シーンへの参照を保持
        this.soundManager = soundManager;
        this.configManager = configManager;
        this.charByCharTimer = null;
        this.isTyping = false;

        // ★★★ セーブ＆ロード用の状態保持プロパティ ★★★
        this.currentText = '';
        this.currentSpeaker = null;

        // --- ウィンドウとテキストのセットアップ ---
        const gameWidth = scene.scale.width;
        const gameHeight = scene.scale.height;
        const windowY = gameHeight - 180;
        this.windowImage = scene.add.image(gameWidth / 2, windowY, 'message_window');

        const padding = 35;
        const textWidth = this.windowImage.width - (padding * 2);
        const textHeight = this.windowImage.height - (padding * 2);

        this.textObject = scene.add.text(
            this.windowImage.x - (this.windowImage.width / 2) + padding,
            this.windowImage.y - (this.windowImage.height / 2) + padding,
            '',
            {
                fontFamily: '"Noto Sans JP", sans-serif',
                fontSize: '36px',
                fill: '#ffffff',
                fixedWidth: textWidth,
                fixedHeight: textHeight
            }
        );

        // --- コンフィグと連携するテキスト速度 ---
        this.textDelay = 50; // デフォルト値
        this.updateTextSpeed(); // コンフィグから初期値を取得
        this.configManager.on('change:textSpeed', this.updateTextSpeed, this);

        // --- クリック待ちアイコン ---
        const iconX = (gameWidth / 2) + (this.windowImage.width / 2) - 60;
        const iconY = windowY + (this.windowImage.height / 2) - 50;
        this.nextArrow = scene.add.image(iconX, iconY, 'next_arrow');
        this.nextArrow.setScale(0.5).setVisible(false);
        this.arrowTween = scene.tweens.add({
            targets: this.nextArrow,
            y: this.nextArrow.y - (10 * this.nextArrow.scaleY),
            duration: 400,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
            paused: true
        });

        // --- コンテナに追加 & シーンに登録 ---
        this.add([this.windowImage, this.textObject, this.nextArrow]);
        scene.add.existing(this);
    }

    // ★★★ コンフィグ値から速度を更新するヘルパーメソッド ★★★
    updateTextSpeed() {
        const textSpeedValue = this.configManager.getValue('textSpeed');
        this.textDelay = 100 - textSpeedValue;
        console.log(`テキスト表示速度を ${this.textDelay}ms に更新`);
    }

    // ★★★ セッターをリネーム（より明確に） ★★★
    setTypingSpeed(newSpeed) {
        this.textDelay = newSpeed;
    }

    /**
     * テキストを設定するメソッド
     * @param {string} text - 表示する全文
     * @param {boolean} useTyping - テロップ表示を使うかどうか
     * @param {Function} onComplete - 表示完了時に呼ばれるコールバック関数
     * @param {string|null} speaker - 話者名（任意）
     */
    setText(text, useTyping = true, onComplete = () => {}, speaker = null) {
        // ★★★ 現在の状態をプロパティとして保存 ★★★
        this.currentText = text;
        this.currentSpeaker = speaker;

        this.textObject.setText('');
        if (this.charByCharTimer) {
            this.charByCharTimer.remove();
        }

        const typeSoundMode = this.configManager.getValue('typeSound');

        if (!useTyping || text.length === 0 || this.textDelay <= 0) {
            this.textObject.setText(text);
            this.isTyping = false;
            if(onComplete) onComplete();
            return;
        }
        
        this.isTyping = true;
        let index = 0;
        // ★ timerConfigをletに変更
        let timerConfig = {
            delay: this.textDelay,
            callback: () => {
                if (typeSoundMode === 'se') {
                    this.soundManager.playSe('popopo');
                }
                this.textObject.text += timerConfig.fullText[index];
                index++;
                if (index === timerConfig.fullText.length) {
                    this.charByCharTimer.remove();
                    this.isTyping = false;
                    onComplete();
                }
            },
            callbackScope: this,
            loop: true,
            fullText: text
        };
        
        this.charByCharTimer = this.scene.time.addEvent(timerConfig);
    }
    
    skipTyping() {
        if (!this.isTyping) return;
        this.textObject.setText(this.charByCharTimer.fullText);
        this.charByCharTimer.remove();
        this.isTyping = false;
    }

    // ★★★ ロード時にウィンドウの状態をリセットするためのメソッド ★★★
    reset() {
        this.textObject.setText('');
        this.currentText = '';
        this.currentSpeaker = null;
        this.isTyping = false;
        if (this.charByCharTimer) {
            this.charByCharTimer.remove();
        }
        this.hideNextArrow();
    }

    showNextArrow() {
        this.nextArrow.setVisible(true);
        if (this.arrowTween.isPaused()) {
            this.arrowTween.resume();
        }
    }
    
    hideNextArrow() {
        this.nextArrow.setVisible(false);
        if (this.arrowTween.isPlaying()) {
            this.arrowTween.pause();
        }
    }

    get textBoxWidth() {
        return this.textObject.width;
    }
}