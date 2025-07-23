; === Odyssey Engine 総合チュートリアル (最終統合テスト版) ===

; --- 0. 変数の初期化と事前テスト ---
[eval exp="f.love_meter = 0"]       
  ; 既存
[eval exp="sf.boot_count = (sf.boot_count || 0) + 1"] 
; 既存（起動回数を永続化）
[eval exp="f.player_name = 'マスター'"] 
; 既存
[eval exp="f.coin = 0"]            
 ; ★★★ 追加: コイン変数の初期化 (HUD連携テスト用) ★★★
[eval exp="f.test_item = 0"]      
  ; ★★★ 追加: アイテム取得テスト用変数 ★★★
[eval exp="f.test_flag = 'none'"]  
 ; ★★★ 追加: IF分岐テスト用変数 ★★★
[eval exp="f.sub_result = 'none'"] 
 ; ★★★ 追加: サブルーチン戻り値用変数 ★★★
[eval exp="f.battle_result = 'none'"]
 ; ★★★ 追加: 戦闘結果用変数 ★★★
[eval exp="f.final_status = 'none'"] 
; ★★★ 追加: 最終ステータス用変数 ★★★

; --- １．基本的な表示と演出 ---
[playbgm storage="cafe" time=1000]
[bg storage="bg_school" time=1500]
[wait time=1500]
[chara_show name="yuna" pos="left" y=800 visible=false] 
; y=800 は画面外のはず
[move name="yuna" y=450 alpha=1 time=1000] 
; ★★★ y=450は画面内のy座標に修正（中心付近）★★★
[wait time=1000]

[delay speed=80]
yuna:「ようこそ！これは、あなたと一緒に作ったゲームエンジンのチュートリアルです。」
yuna:テストテキト最初にバトルシーンテストです！

[jump storage="BattleScene" params="{player_level:f.love_meter, player_name:'&f.player_name;', start_area:'bridge', current_coin:f.coin, player_max_hp:f.player_max_hp, player_hp:f.player_hp}"]
[fadein time=500]
yuna:「このゲームを起動するのは、&sf.boot_count 回目ですね。」
 ; ★ sf.boot_countのテスト

[chara_show name="kaito" pos="right" time=1000]
[wait time=1000]

kaito:「僕の`[chara_show]`は、`time`属性でフェードインしたよ。」

yuna:「じゃあ、いくつか演出を見せるね。まずは揺れてみる。」

; --- ２．動的演出タグ ---

[shake name="yuna" time=500 power=10]
[vibrate time=300 power=0.01]
[wait time=500]
kaito:「わっ、びっくりした！」


[chara_jump name="kaito" height=50 time=600]
[wait time=600]



[flip name="yuna" time=400]
; ★★★ [walk]タグの代替 (x=-200 は画面外のはずなので x=400 に変更) ★★★

; ユナの跳ねるアニメーションを開始
[walk name="yuna" x=-200 alpha=1 time=1000]      
 ; ユナを画面左寄りに移動させる
[wait time=1000]
 ; 移動とジャンプが終わるのを待つ
[stop_anim name="yuna"] 
; ジャンプアニメーションを停止

yuna:「じゃあ、私は向こうに歩いていくね。」
[chara_hide name="yuna"]

; --- ３．条件分岐と選択肢 ---
[chara_show name="kaito" pos="right" time=500] 
; カイトが消えた後なので再表示
[wait time=500]
kaito:「さて、&f.player_name。僕に話しかけてみるかい？」
[link target="*talk_to_kaito" text="話しかける"]
[link target="*ignore_kaito" text="無視する"]
[p]
[s]
 ; ★★★ 重要: pタグの直後には[s]タグを置く (セーブ/ロード/オート進行対策) ★★★

*talk_to_kaito
[eval exp="f.love_meter += 10"]
[eval exp="f.coin += 10"] 
; ★★★ コインを増やす ★★★
kaito:「話しかけてくれて嬉しいよ！コインが&f.coin 個になったね！」
[jump target="*choice_end"]

*ignore_kaito
[eval exp="f.love_meter -= 5"]
[eval exp="f.coin -= 5"]
; ★★★ コインを減らす ★★★
kaito:「そっか…ちょっと寂しいな。コインは&f.coin 個になっちゃったね。」
[jump target="*choice_end"]

*choice_end
[log exp="f.love_meter"]
[log exp="f.coin"] 
; ★★★ コインの最終確認 ★★★
[if exp="f.love_meter > 0"]
  kaito:「君は優しい人だね。」
  [eval exp="f.test_flag = 'love_positive'"] 
  ; ★ IF分岐テスト用変数名をより明確に
[else]
  kaito:「次は話しかけてくれると嬉しいな。」
  [eval exp="f.test_flag = 'love_negative'"] 
  ; ★ IF分岐テスト用変数名をより明確に
[endif]
[log exp="f.test_flag"] 
; ★ IF分岐結果ログ
kaito:「この[if]分岐の直後で、セーブ＆ロードしても変数は正しい状態を保つはずです。」




; --- ４．画像とレイヤー操作 ---
kaito:「ここで、思い出の一枚絵を表示してみよう。」
[image storage="cg01" layer="cg" time=1000]
[wait time=1500]

; ★★★ 重要: pタグの直後には[s]タグを置く ★★★
[freeimage layer="cg"]


[cm]
[wait time=500]
[wait time=1000]
[chara_hide name="kaito"]

; --- ５．セーブ＆ロードとファイル呼び出し ---
[er layer="character"]
yuna:「この状態でセーブができます。メニューから試してみてね。」



yuna:「次に、`scene2.ks`をサブルーチンとして呼び出します。」

[fadeout time=500]
[wait time=500]
[call storage="scene2.ks"] 
; ★ サブルーチン用のファイル名を指定
[fadein time=500]

yuna:「サブルーチンから戻ってきました。」
yuna:「[call]の途中や[return]の直前でセーブ＆ロードしても、正しく戻れたでしょうか？」
[log exp="f.sub_result"]
 ; サブルーチンからの戻り値ログ


yuna:「次はアクションシーンを呼び出します。」
yuna:「コールタグによるテストです。」
; --- 5. アクションシーン連携([jump]と[return-to-novel])のテスト ---
kaito:「いよいよアクションシーンへ突入！戻ってきたら結果を確認しよう。」

[fadeout time=500]
[wait time=500]
; ★★★ jumpタグにparams属性を追加 ★★★
; ActionSceneに、f.love_meter (player_level), f.player_name, f.coin を渡す
[jump storage="BattleScene" params="{player_level:f.love_meter, player_name:'&f.player_name;', start_area:'bridge', current_coin:f.coin, player_max_hp:f.player_max_hp, player_hp:f.player_hp}"]
[fadein time=500]

[chara_show name="yuna" pos="left" time=500] 
; 戻ってからキャラ表示
[chara_show name="kaito" pos="right" time=500]

kaito:「アクションシーンから戻ってきました！戦闘結果は &f.battle_result です。」
[log exp="f.battle_result"]
 ; 戦闘結果ログ

[if exp="f.battle_result == 'win'"]
  yuna:「勝利おめでとうございます！コインが&f.coin 個になりましたね！」
  [eval exp="f.final_status = 'winner'"]
[else]
  yuna:「残念、敗北しましたね…コインは&f.coin 個のままだよ。」
  [eval exp="f.final_status = 'loser'"]
[endif]
[log exp="f.final_status"] 
; 最終ステータスログ



; --- 6. 最終確認セクション ---
[cm]
yuna:「すべてのテストポイントを通過しました。」
[log exp="f.test_item"]   
 ; アイテム取得フラグ
[log exp="f.test_flag"]  
  ; 条件分岐結果
[log exp="f.sub_result"]  
 ; サブルーチン戻り値
[log exp="f.battle_result"] 
; 戦闘結果
[log exp="f.final_status"]
 ; 最終ステータス
[log exp="f.coin"]        
 ; コイン数
[log exp="sf.boot_count"]  
; 起動回数
yuna:「これらの変数が全て正しい値であれば、テストは成功です！」
[s]
