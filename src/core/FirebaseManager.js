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

  // core/FirebaseManager.js 内

    /**
     * ★★★ findOpponent をこの findOpponentList に置き換え ★★★
     * ランクマッチ10ラウンド分の対戦相手リストを取得する
     * @param {string} playerRank - プレイヤーの現在のランク (例: 'C')
     * @returns {Promise<Array|null>} 10人分のゴーストデータの配列、または見つからなかった場合はnull
     */
    async findOpponentList(playerRank) {
        if (!this.db) return null;

        console.log(`%c[Firebase] ランクマッチの対戦相手リストを探しています... Rank: ${playerRank}`, "color: blue;");
        
        const opponentList = [];
        const numRounds = 10;

        for (let i = 1; i <= numRounds; i++) {
            const targetRound = i;
            let opponentData = null;

            // --- マッチングロジック (ラウンドごとに相手を探す) ---
            const searchPaths = [
                `ghosts/${playerRank}/round_${targetRound}`,     // 同格
                `ghosts/${playerRank}/round_${targetRound - 1}`, // 少し格下
                `ghosts/${playerRank}/round_${targetRound + 1}`, // 少し格上
                // ★ 将来的には、別ランクのパスも検索候補に加えるとマッチング率が上がる
                // `ghosts/B/round_${targetRound}` など
            ];

            for (const path of searchPaths) {
                if (path.includes("round_0")) continue;

                try {
                    const collectionRef = collection(this.db, path);
                    const q = query(collectionRef, orderBy('__name__'), limit(1)); // 簡易ランダム取得
                    const querySnapshot = await getDocs(q);

                    if (!querySnapshot.empty) {
                        opponentData = querySnapshot.docs[0].data();
                        console.log(` > Round ${targetRound} の相手が見つかりました。 Path: ${path}`);
                        break; // このラウンドの相手が見つかったので、次のラウンドを探しに行く
                    }
                } catch (error) {
                    // このパスにデータがない場合はエラーになるが、処理は続ける
                }
            }

            if (opponentData) {
                opponentList.push(opponentData);
            } else {
                console.warn(` > Round ${targetRound} の相手が見つかりませんでした。代わりに通常エネミーを生成します。`);
                
                // ★★★ 'null' の代わりに 'generate' という文字列を入れる ★★★
                opponentList.push('generate');
            }
        }

        // 10人分のデータ（または'generate'）が揃ったかチェック
        if (opponentList.length === numRounds) {
            console.log(`%c[Firebase] 対戦相手リスト(10人分)の準備が完了しました。`, "color: blue;");
            return opponentList;
        } else {
            console.error("[Firebase] 対戦相手リストの作成に失敗しました。");
            return null;
        }
    }
}