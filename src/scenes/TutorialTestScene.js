// scenes/TutorialTestScene.js
export default class TutorialTestScene extends Phaser.Scene {
    constructor() { super('TutorialTestScene'); }
    create() {
        this.stateManager = this.sys.registry.get('stateManager');
        const rect = this.add.rectangle(640, 360, 200, 200, 0xff0000).setInteractive();
        rect.on('pointerdown', () => {
            console.log("四角形がクリックされました！");
            this.stateManager.setSF('test_flag', 'clicked');
        });
        this.time.delayedCall(100, () => { // 描画が安定するのを少し待つ
            this.scene.get('SystemScene').events.emit('request-overlay', { 
                from: this.scene.key,
                scenario: 'tutorial_test.ks'
            });
        });
        this.events.emit('scene-ready');
    }
}
