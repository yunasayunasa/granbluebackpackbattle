// handlers/p.js (最終版)

/**
 * [p] タグの処理 (クリック待ち)
 */
export function handlePageBreak(manager, params) {
    // [link]タグによって選択肢が溜まっている場合
    if (manager.scene.pendingChoices && manager.scene.pendingChoices.length > 0) {
        console.log("選択肢を表示して、プレイヤーの選択を待機します。");
        
        manager.isWaitingChoice = true;
        manager.scene.displayChoiceButtons();
        
    } else {
        // 通常のクリック待ちの場合
        console.log("通常のクリック待機状態に入ります。");
        
        manager.isWaitingClick = true;
        manager.messageWindow.showNextArrow();
    }
    
    // ★★★ 修正箇所: Promise.resolve() を返す ★★★
    // このハンドラは「待機状態に入る」ことをScenarioManagerに伝えるので、
    // 自身はPromiseを返して終了するが、ScenarioManagerはwhileループを停止する。
    return Promise.resolve();
}