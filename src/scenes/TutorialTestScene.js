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
        this.events.emit('scene-ready');
    }
}
