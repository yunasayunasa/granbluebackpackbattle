export default class BloomPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
    constructor(game) {
        super({
            game: game,
            fragShader: game.cache.shader.get('Bloom')
        });
        this.bloomRadius = 1.0;
        this.bloomIntensity = 1.0;
    }

    onPreRender() {
        this.set1f('uBloomRadius', this.bloomRadius);
        this.set1f('uBloomIntensity', this.bloomIntensity);
        this.set2f('uTextureSize', this.renderer.width, this.renderer.height);
    }
}