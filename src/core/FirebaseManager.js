// src/core/FirebaseManager.js

// Firebase SDK v9のモジュラー方式で必要な関数をインポート
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDocs,
    query,
    where,
    limit,
    orderBy
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

export default class FirebaseManager {
    constructor() {
        // index.htmlでグローバルに公開したFirestoreインスタンスを取得
        this.db = window.firebaseServices.db;
        if (!this.db) {
            console.error("FirebaseManager: Firestoreが初期化されていません！ index.htmlを確認してください。");
        }
    }

    /**
     * ゴーストデータをFirestoreにアップロードする
     * @param {object} ghostData - ランクマッチ用のデータ
     * @returns {Promise<void>}
     */
    async uploadGhostData(ghostData) {
        if (!this.db) return;

        try {
            // 保存先のパスを決定 (例: ghosts/C/round_1)
            const collectionPath = `ghosts/${ghostData.rank}/round_${ghostData.round}`;
            const collectionRef = collection(this.db, collectionPath);
            
            // 新しいドキュメントを自動IDで作成し、データを保存
            const newDocRef = doc(collectionRef);
            await setDoc(newDocRef, ghostData);

            console.log(`%c[Firebase] ゴーストデータをアップロードしました。 Path: ${collectionPath}`, "color: green;");

        } catch (error) {
            console.error("[Firebase] ゴーストデータのアップロードに失敗しました:", error);
        }
    }

    /**
     * 指定された条件に合う対戦相手のゴーストデータを取得する
     * @param {string} playerRank - プレイヤーの現在のランク (例: 'C')
     * @param {number} playerRound - プレイヤーの現在のラウンド
     * @returns {Promise<object|null>}
     */
    async findOpponent(playerRank, playerRound) {
        if (!this.db) return null;

        console.log(`%c[Firebase] 対戦相手を探しています... Rank: ${playerRank}, Round: ${playerRound}`, "color: blue;");

        // --- マッチングロジック (近傍マッチング) ---
        const searchPaths = [
            `ghosts/${playerRank}/round_${playerRound}`,     // 同格
            `ghosts/${playerRank}/round_${playerRound - 1}`, // 少し格下
            `ghosts/${playerRank}/round_${playerRound + 1}`, // 少し格上
        ];

        for (const path of searchPaths) {
            if (path.includes("round_0")) continue; // round 0は存在しないのでスキップ

            try {
                const collectionRef = collection(this.db, path);
                
                // パスからランダムに1件取得するクエリ
                // (Firestoreには直接ランダム取得がないため、IDで並び替えて先頭1件を取る疑似ランダム)
                const q = query(collectionRef, orderBy('__name__'), limit(1));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    // データが見つかった
                    const opponentData = querySnapshot.docs[0].data();
                    console.log(`%c[Firebase] 対戦相手が見つかりました！ Path: ${path}`, "color: blue;");
                    return opponentData;
                }
            } catch (error) {
                // このパスにコレクションが存在しない場合など
                console.warn(`[Firebase] Path '${path}' の検索中にエラー:`, error.message);
            }
        }

        console.warn(`%c[Firebase] 適切な対戦相手が見つかりませんでした。`, "color: orange;");
        return null; // 全てのパスで相手が見つからなかった
    }
}