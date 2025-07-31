export default class BloomPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
    constructor(game) {
        // ★★★ この super() の呼び出し方を修正 ★★★
        super({
            game: game,
            // fragShaderプロパティではなく、シェーダーのキーを直接渡す
            // Phaserが内部で game.cache.shader.get('Bloom') を自動的に行ってくれる
            fragShaderKey: 'Bloom' 
        });
        
        this.bloomRadius = 1.0;
        this.bloomIntensity = 1.0;
    }

    onPreRender() {
        this.set1f('uBloomRadius', this.bloomRadius);
        this.set1f('uBloomIntensity', this.bloomIntensity);
        this.set2f('uTextureSize', this.renderer.width, this.renderer.height);
    }
    
    // ★★★ onBootメソッドを追加 ★★★
    // パイプラインがWebGLコンテキストにバインドされる際に一度だけ呼ばれる
    onBoot() {
        // テクスチャサイズをここで設定するのがより安全
        this.setTextureSize(this.renderer.width, this.renderer.height);
    }
}