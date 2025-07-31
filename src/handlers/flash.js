// src/handlers/flash.js

/**
 * [flash] タグ
 * 画面全体をフラッシュさせる
 * @param {Object} params - { duration, color, wait }
 */
export async function handleFlash(manager, params) {
    const duration = params.duration ? parseInt(params.duration, 10) : 500; // デフォルト500ms
    const colorStr = params.color || '0xffffff'; // デフォルトは白
    const wait = params.wait !== 'false'; // デフォルトは完了を待つ

    // '0x'で始まるカラーコードをパースする
    const color = parseInt(colorStr, 16);
    const r = (color >> 16) & 0xFF;
    const g = (color >> 8) & 0xFF;
    const b = color & 0xFF;
    
    const promise = new Promise(resolve => {
        manager.scene.cameras.main.flash(duration, r, g, b, false, (camera, progress) => {
            if (progress === 1) {
                resolve();
            }
        });
    });

    if (wait) {
        await promise;
    }
}