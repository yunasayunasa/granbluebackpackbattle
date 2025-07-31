#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D uMainSampler;
uniform vec2 uTextureSize;
uniform float uBloomRadius;
uniform float uBloomIntensity;

varying vec2 outTexCoord;

void main(void) {
    vec4 sum = vec4(0);
    vec2 texcoord = outTexCoord;
    int j;
    int i;

    for( i = -4; i < 4; i++) {
        for (j = -3; j < 3; j++) {
            sum += texture2D(uMainSampler, texcoord + vec2(j, i) * uBloomRadius / uTextureSize.xy) * uBloomIntensity;
        }
    }

    if (texture2D(uMainSampler, texcoord).r < 0.3) {
        gl_FragColor = sum * sum * 0.012 + texture2D(uMainSampler, texcoord);
    } else {
        gl_FragColor = sum * sum * 0.009 + texture2D(uMainSampler, texcoord);
    }
}