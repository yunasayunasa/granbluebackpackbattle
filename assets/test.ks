; === Odyssey Engine Title Screen ===
[hidewindow]

[bg storage="title"]
[flash time=1000 wait=false]
[playbgm storage="bgm_prepare"]

[image storage="titlelogo" time=500]
[link target="*start_score_attack" size=28 text="スコアアタック"]
[link target="*start_rank_match" size=28 text-"ランクマッチ"]
[p]
[s]


; === ラベル定義 ===

*start_score_attack
; スコアアタックモードを開始する

; ★重要★ プロファイル以外の進行状況をリセットする
; ScoreSceneから戻ってきた際に、前回のプレイデータをクリアするため



; f変数もクリア (HUD表示等に影響するため)
[eval exp="sf.retry_count = 0"]
[eval exp="sf.player_backpack = {}"]
[eval exp="sf.player_inventory = ['sword', 'luria', 'potion']"]
[eval exp="sf.round = 1"]
[eval exp="sf.coins = 20"]
[eval exp="sf.player_base_max_hp = 100"]
; BattleSceneへジャンプ
[jump storage="BattleScene" params="{ mode: 'new_game' }"]


; ★★★ このラベルを新規追加 ★★★
*start_rank_match
; ランクマッチを開始する
[eval exp="sf.retry_count = 0"]
[eval exp="sf.player_backpack = {}"]
[eval exp="sf.player_inventory = ['sword', 'luria', 'potion']"]
[eval exp="sf.round = 1"]
[eval exp="sf.coins = 20"]
[eval exp="sf.player_base_max_hp = 100"]
; TODO: ここに挑戦料の支払いロジックを後で追加する

; MatchingSceneへジャンプ
[jump storage="MatchingScene"]

*not_implemented
; 未実装の機能が選択された場合の処理




[wait time=1500]
; 再度タイトル画面の選択肢に戻る
[jump storage="title.ks" target="*start_over"]


*start_over
; *not_implementedからジャンプしてきた際に、選択肢を再表示するためのラベル
[cm]
[position layer="message0" left=440 top=300]
[link target="*start_score_attack" size=28]*スコアアタック[endlink]
[p]
[link target="*not_implemented" size=28]*ストーリー (準備中)[endlink]
[p]
[link target="*not_implemented" size=28]*チュートリアル (準備中)[endlink]
[p][s]
