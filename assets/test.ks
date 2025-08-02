; === Odyssey Engine Title Screen ===
[hidewindow]

[bg storage="title"]
[flash time=1000 wait=false]
[playbgm storage="bgm_prepare"]

[image storage="titlelogo" time=500]
[link target="*start_score_attack" size=28 text="スコアアタック"]
[link target="*start_rank_match" size=28 text="ランクマッチ"]
[p]
[s]
; assets/scenario/title.ks

; ...

; ...


; === ラベル定義 ===


; ... (変更なし) ...


; --- 1. ランクマッチの解放条件をチェック ---
[if exp="sf.player_profile && sf.player_profile.highScore > 0"]
    [jump target="*rank_match_entry"]
[else]
    [eval exp="f.popup_message = 'ランクマッチは、一度スコアアタックをプレイすると解放されます。'"]
    [call_overlay storage="popup_info.ks"] 
    ; ★ お知らせ用の別シナリオが良い
    [jump storage="title.ks" target="*show_menu_again"]
[endif]

*rank_match_entry
; --- 2. ランクマッチプロファイルの初期化と挑戦料計算 ---
[eval exp="sf.rank_match_profile = sf.rank_match_profile || { rp: 100, rank: 'C', wins: 0, losses: 0 }"]
[eval exp="f.rank_keys = ['C', 'B', 'A', 'S', 'S+']"]
[eval exp="f.current_rank_index = f.rank_keys.indexOf(sf.rank_match_profile.rank)"]
[eval exp="f.entry_fee = f.current_rank_index * 20"]

[if exp="sf.rank_match_profile.rp >= f.entry_fee"]
    ; --- 3a. RPが足りている場合：ポップアップで確認 ---
    [eval exp="f.popup_message = '挑戦料として ' + f.entry_fee + ' RP を支払いますか？\n（現在のRP: ' + sf.rank_match_profile.rp + '）'"]
    [eval exp="sf.popup_result = 'no'"]
    [call_overlay storage="popup_confirm.ks"]
    
    [if exp="sf.popup_result == 'yes'"]
        [jump target="*pay_fee_and_start"]
    [else]
        [jump target="*show_menu_again"]
    [endif]
[else]
    ; --- 3b. RPが足りていない場合：ポップアップでお知らせ ---
    [eval exp="f.popup_message = 'RPが不足しています。\n必要なRP: ' + f.entry_fee + '\n現在のRP: ' + sf.rank_match_profile.rp"]
    ; ★ お知らせ用のpopup_info.ks を呼び出すのが理想
    [call_overlay storage="popup_info.ks"]
    [jump storage="title.ks" target="*show_menu_again"]
[endif]

*pay_fee_and_start
[eval exp="sf.rank_match_profile.rp -= f.entry_fee"]

[jump storage="MatchingScene"]




*show_menu_again
; 何もせずにタイトル選択肢に戻るための共通ラベル
[cm]
[position layer="message0" left=440 top=300]
[link target="*start_score_attack" size="28" text="スコアアタック"]

[link target="*start_rank_match" size="28"text="ランクマッチ"]

[link target="*start_story" size="28"]*ストーリー (準備中)[endlink]
[p]
[s]

; === ラベル定義 ===

*start_score_attack
; スコアアタックモードを開始する

; ★重要★ プロファイル以外の進行状況をリセットする
; ScoreSceneから戻ってきた際に、前回のプレイデータをクリアするため



; f変数もクリア (HUD表示等に影響するため)
[eval exp="f = {}"]
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
[eval exp="f = {}"]
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
