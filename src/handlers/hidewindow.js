// src/handlers/hidewindow.js

/**
 * [hidewindow] タグ
 * メッセージウィンドウを非表示にする
 */
export function handleHideWindow(manager, params) {
    if (manager.messageWindow) {
        manager.messageWindow.setVisible(false);
    }
}