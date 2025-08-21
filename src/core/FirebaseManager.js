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
    // core/FirebaseManager.js

    async findOpponentList(playerRank) {
         // ▼▼▼ この3行を追加 ▼▼▼
    console.error("！！！！！！！！！！！！！！！！！！！！！！！！");
    console.error("！！！ findOpponentListが呼び出されました ！！！");
    console.error(new Error("呼び出し元のスタックトレース")); // これでどこから呼ばれたか追跡できる
    // ▲▲▲ ここまで追加 ▲▲▲
        if (!this.db) return null;

        console.log(`%c[Firebase] ランクマッチの対戦相手リストを探しています... Rank: ${playerRank}`, "color: blue;");
        
        const opponentList = [];
        const numRoundsInMatch = 10;

        for (let i = 1; i <= numRoundsInMatch; i++) {
            let opponentData = null;
            let searchPath = '';

            // ★★★ ここからが新しいマッチングロジック ★★★
            if (i === 1) {
                // --- 1戦目：必ずラウンド1のゴーストを探す ---
                console.log(` > ランクマ 1戦目: Round 1 のゴーストを探します...`);
                searchPath = `ghosts/${playerRank}/round_1`;
            } else {
                // --- 2戦目以降：ランダムな相手を探す ---
                // プレイヤーの現在の進捗(i)に応じて、適切な強さの相手を選ぶ
                const minTargetRound = Math.max(1, i - 2); // 弱すぎない相手
                const maxTargetRound = Math.min(10, i + 1); // 強すぎない相手
                const targetGhostRound = Phaser.Math.Between(minTargetRound, maxTargetRound);
                
                console.log(` > ランクマ ${i}戦目: Round ${minTargetRound}-${maxTargetRound} のゴーストを探します... (ターゲット: Round ${targetGhostRound})`);
                searchPath = `ghosts/${playerRank}/round_${targetGhostRound}`;
            }
            // ★★★ ロジックここまで ★★★

            try {
                const collectionRef = collection(this.db, searchPath);
                // 複数件取得してクライアント側でランダムに選ぶ
                const q = query(collectionRef, limit(10)); 
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const docs = querySnapshot.docs;
                    const randomDoc = docs[Math.floor(Math.random() * docs.length)];
                    opponentData = randomDoc.data();
                    console.log(` > 相手が見つかりました (Path: ${searchPath})`);
                }
            } catch (error) {
                // パスがない場合など
            }

            if (opponentData) {
                opponentList.push(opponentData);
            } else {
                console.warn(` > 適切な相手が見つかりませんでした。代わりに通常エネミーを生成します。`);
                opponentList.push('generate');
            }
        }

        if (opponentList.length === numRoundsInMatch) {
            console.log(`%c[Firebase] 対戦相手リスト(10人分)の準備が完了しました。`, "color: blue;");
            return opponentList;
        } else {
            console.error("[Firebase] 対戦相手リストの作成に失敗しました。");
            return null;
        }
    }

}
