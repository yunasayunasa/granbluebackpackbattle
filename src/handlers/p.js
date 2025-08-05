// handlers/p.js (最終版)

/**
 * [p] タグの処理 (クリック待ち / 選択肢表示)
 * managerの待機フラグを立てて、シナリオループを停止させる役割を担う。
 */
export function handlePageBreak(manager, params) {
    // [link]タグによって選択肢が溜まっている場合
    if (manager.scene.pendingChoices && manager.scene.pendingChoices.length > 0) {
        console.log("選択肢を表示して、プレイヤーの選択を待機します。");
        
        // 選択肢待ちフラグを立てる
        manager.isWaitingChoice = true; 
        
        // GameSceneに選択肢の表示を依頼
        manager.scene.displayChoiceButtons();
        
    } else {
        // 通常のクリック待ちの場合
        console.log("通常のクリック待機状態に入ります。");
        
        // クリック待ちフラグを立てる
        manager.isWaitingClick = true; 
        
        // クリック待ち矢印を表示
        manager.messageWindow.showNextArrow();
    }
    
    // このハンドラは「待機状態に入る」ことをScenarioManagerに伝えるのが役割。
    // ハンドラ自身の処理は同期的（一瞬）で終わるため、即座に解決されるPromiseを返す。
    // これにより、ScenarioManagerは次のループ継続判定に進み、そこで待機フラグを検知して停止する。
    return Promise.resolve();
}