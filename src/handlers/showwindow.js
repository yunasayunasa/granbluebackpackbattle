// src/handlers/showwindow.js

/**
 * [showwindow] タグ
 * メッセージウィンドウを表示する
 */
export function handleShowWindow(manager, params) {
    if (manager.messageWindow) {
        manager.messageWindow.setVisible(true);
    }
}