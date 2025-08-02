export function handleEndOverlay(manager, params) {
    const fromSceneKey = manager.scene.scene.key; 
    manager.scene.scene.get('SystemScene').events.emit('end-overlay', {
        from: fromSceneKey,
        returnTo: 'GameScene' // NovelOverlaySceneは常にGameSceneに戻る
    });
    return Promise.resolve();
}