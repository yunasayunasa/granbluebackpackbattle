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
                'sword': { pos: [2, 2], angle: 0 } 
            },
            2: { 
                'berserker_axe': { pos: [1, 2], angle: 0 }, 
                'shield': { pos: [3, 3], angle: 0 } 
            },
            3: {
                'siegfried': { pos: [2, 1], angle: 0 }
            },
            // ... 4, 5, ... 10ラウンド目まで追加
        };
        
        // 指定されたラウンドのレイアウトがあればそれを返す
        // なければ、最後の定義済みレイアウトを返す（仮）
        return enemyLayouts[round] || enemyLayouts[Object.keys(enemyLayouts).pop()];
    }
};
