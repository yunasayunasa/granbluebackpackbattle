; === オーバーレイ表示テスト用シナリオ ===
@image key="tutorial_elements" storage="images/tutorial_elements.png"
@image key="tutorial_arrow" storage="images/tutorial_arrow.jpg"
[chara_show name="lancelot" pos="center" time=500]
[wait time=500]

lancelot:やぁ、訓練教官を務めるランスロットだ。よろしく。

lancelot:ここでは、ナップサックバトルの基本を学ぶことが出来る。
lanelot:左の箱が君のナップサックで、右の箱が相手のナップサックだ。
lancelot:このナップサックの中にキャラクターをセットしていき、相手の体力を0にするか、タイムアップでより体力が多ければ勝利となる。
lancelot:キャラクターはドラッグで動かせるぞ。
lancelot:また、タップでキャラクターの詳細を見る事ができ、長押しor右クリックで回転させることが出来る。
lancelot:相手のキャラ詳細も見られるから、よく対策を練ろう。
lancelot:次にナップサックバトルで最も重要なバフを紹介しよう。
lancelot:それが「属性共鳴」と「ヤジルシナジー」だ。
[walk name="lancelot" x=1000]
[chara_show name="lancelot" x=1000 time=0]
[image storage="tutorial_elements" layer="cg" time=500]
lancelot:各キャラクターには属性が設定してある。俺なら水属性といった感じだな。
lancelot:そして、同じ属性のキャラクターを3人以上揃えると発動するのが属性共鳴だ！
lancelot:同じ属性のキャラクターは全てこの属性共鳴のバフを受けられるんだ。
lancelot:違う属性、例えばヴェインやパーシヴァルは水の属性共鳴は受けられないんだ。
lancelot:属性共鳴の効果は属性ごとに違うから、説明書を読んでくれ。
[image storage="tutorial_arrow" layer="cg" time=500]
lancelot:次にヤジルシナジーについて説明しよう。
lancelot:一部のキャラには黄色い矢印が付いていることがある。
lancelot:この矢印の隣にキャラを配置することで、バフを受けられるのが、ヤジルシナジーだ！
lancelot:ヤジルシナジーは必ず矢印に隣接させる必要があるが、属性に縛られない。
lancelot:どのキャラがどんなシナジーなのかは、キャラをタップすれば見られるから、あとで確認してみてくれ！
[freeimage layer="cg" time=500]
[walk name="lancelot" x=640]
[chara_show name="lancelot" pos="center" time=0]
lancelot:長くなったが最後にまとめよう。
lancelot:1.属性で揃えよう
lancelot:2.矢印の隣に置こう
lancelot:たったこれだけだ。簡単だろ？
lancelot:他にもショップでは、回復したりキャラを雇ったり売却したりできる。最初のラウンドから20コインが配られているから、色々触ってみてくれ。
lancelot:それじゃあ、チュートリアルを終了する！好きに触って、見事相手を倒してみてくれ！


[chara_hide name="lancelot" time=500]
[wait time=500]
[overlay_end]