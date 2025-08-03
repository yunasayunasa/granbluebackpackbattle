// src/handlers/end_overlay.js

export function handleEndOverlay(manager, params) {
    const fromSceneKey = manager.scene.scene.key; // "NovelOverlayScene"
    
    manager.scene.scene.get('SystemScene').events.emit('end-overlay', {
        from: fromSceneKey,
        // ★★★ 'GameScene' 固定ではなく、保存しておいた戻り先キーを使う ★★★
        returnTo: manager.returnToSceneKey
    });
    return Promise.resolve();
}