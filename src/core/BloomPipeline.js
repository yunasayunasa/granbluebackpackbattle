export default class BloomPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
    constructor(game) {
        super({
            game: game,
            fragShader: game.cache.shader.get('Bloom')
            // ★ fragShaderKeyがダメなら、元の game.cache.shader.get に戻します
            //   エラーの原因は onBoot だったため、こちらは問題ないはずです
        });
        
        this.bloomRadius = 1.0;
        this.bloomIntensity = 1.0;
    }

    // ★ onBootは削除

    // onPreRenderは、毎フレーム描画の直前に呼ばれる
    onPreRender() {
        // ★★★ setTextureSize の代わりに set2f を使う ★★★
        this.set2f('uTextureSize', this.renderer.width, this.renderer.height);

        // 他のuniform変数の設定は変更なし
        this.set1f('uBloomRadius', this.bloomRadius);
        this.set1f('uBloomIntensity', this.bloomIntensity);
    }
}