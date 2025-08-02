; === 確認ポップアップ汎用シナリオ ===

pop

; 背景を少し暗くする
[image storage="black_overlay" layer="1" width="1280" height="720" opacity="150" time="200"]

; ポップアップウィンドウの背景
[image storage="popup_window_bg" layer="2" x="340" y="260" time="200"]

; 呼び出し元から渡されたメッセージを表示
[position layer="2" left="390" top="320" width="500" height="100"]
[p]

; 「はい」「いいえ」の選択肢
[position layer="2" left="490" top="420"]
[link target="*answer_yes" size="24" text="はい"]

[position layer="2" left="690" top="420"]
[link target="*answer_no" size="24" text="いいえ"]
[p]
[s]


*answer_yes
[eval exp="sf.popup_result = 'yes'"]

[freeimage layer="1"]
[freeimage layer="2"]
[end_overlay]

*answer_no
[eval exp="sf.popup_result = 'no'"]

[freeimage layer="1"]
[freeimage layer="2"]
[end_overlay]
