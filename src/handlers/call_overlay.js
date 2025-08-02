export function handleCallOverlay(manager, params) {
    return new Promise(resolve => {
        const fromSceneKey = manager.scene.scene.key;

        manager.scene.scene.get('SystemScene').events.once('end-overlay-complete', () => {
            console.log("Overlay has ended. Resuming scenario.");
            resolve();
        });

        manager.scene.scene.get('SystemScene').events.emit('request-overlay', { 
            from: fromSceneKey,
            scenario: params.storage
        });
    });
}