; === Odyssey Engine Title Screen ===


[link target="*start_score_attack" size=28 text="スコアアタック"]
[p]
[link target="*not_implemented" size=28]*ストーリー (準備中)[endlink]
[p]
[link target="*not_implemented" size=28]*チュートリアル (準備中)[endlink]
[p][s]


; === ラベル定義 ===

*start_score_attack
; スコアアタックモードを開始する

; ★重要★ プロファイル以外の進行状況をリセットする
; ScoreSceneから戻ってきた際に、前回のプレイデータをクリアするため



; f変数もクリア (HUD表示等に影響するため)

[eval exp="sf.player_backpack = {}"]
[eval exp="sf.player_inventory = ['sword', 'luria', 'potion']"]
[eval exp="sf.round = 1"]
[eval exp="sf.coins = 20"]
[eval exp="sf.player_base_max_hp = 100"]
; BattleSceneへジャンプ
[jump storage="BattleScene" params="{ mode: 'new_game' }"]


*not_implemented
; 未実装の機能が選択された場合の処理
[cm]
[position layer="message0" left=440 top=450]
[font color=0xff0000]
このモードは現在準備中です。
[resetfont]
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
