export function handleOverlayEnd(manager, params) {
    console.log("[overlay_end] タグ実行。オーバーレイ終了を報告します。");
    
  // ★★★ 呼び出し元のシーンキーを取得 ★★★
    // NovelOverlaySceneのinitで渡されたデータを参照する
    const returnToSceneKey = manager.scene.returnTo;

    manager.scene.scene.get('SystemScene').events.emit('end-overlay', { 
        from: manager.scene.scene.key, // 'NovelOverlayScene'
        returnTo: returnToSceneKey      // 'ActionScene'
    });
}