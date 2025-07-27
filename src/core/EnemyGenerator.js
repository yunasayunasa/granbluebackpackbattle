// src/core/EnemyGenerator.js (新規作成)

/**
 * 敵のバックパック編成をラウンドに応じて生成するクラス
 * 今は静的なデータを返すが、将来的にはランダム生成アルゴリズムをここに実装する
 */
export const EnemyGenerator = {

    /**
     * 指定されたラウンドの敵レイアウトを取得する
     * @param {number} round - 現在のラウンド数
     * @returns {object} 敵のレイアウトオブジェクト
     */
    getLayoutForRound(round) {
        // ラウンドごとの敵編成をここに定義していく
        const enemyLayouts = {
         1: { 
        'sword': { row: 2, col: 2 } 
    },
    2: { 
        'potion_of_life': { row: 1, col: 2 },
        'shield_1': { row: 3, col: 1 }, // ★ユニークなキー
        'shield_2': { row: 3, col: 3 }  // ★ユニークなキー
    },
    3: { 
        'siegfried': { row: 2, col: 2 },
        'golem_1': { row: 4, col: 1 },  // ★ユニークなキー
        'golem_2': { row: 4, col: 4 }   // ★ユニークなキー
    }
};
        
        // 指定されたラウンドのレイアウトがあればそれを返す
        // なければ、最後の定義済みレイアウトを返す（仮）
        return enemyLayouts[round] || enemyLayouts[Object.keys(enemyLayouts).pop()];
    }
};
