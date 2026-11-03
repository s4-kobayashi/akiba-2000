# 計画書との適合表

基準は承認済みの計画書(`witty-moseying-duckling.md`)の全要件。監査で、報告せずに抜けていたものが 4 件見つかった。献血ルームと献血バスは実装した。ガムの跡とブルームは未実装のまま理由を記す。

## 適合表

| 要件 | 実装箇所 | 検証 | 状態 |
|---|---|---|---|
| バスケットコート | `js/layout.js` BIG_COURT/ROUND_COURT/HOOPS, `js/ground.js` paintPlaza | 02_court, ops.js のシュート | 実装 |
| 歩ける約 350×300m | `js/layout.js` CHUO, B | walk.js 14 区間 | 実装 |
| 高架(南北+東西) | `js/rail.js` | 06_guard, 08_arches | 実装 |
| 広場+コート | `js/ground.js`, `js/props.js` fence | 02_court | 実装 |
| 献血ルーム | `js/layout.js` dicam の看板 | shots/room.png | **監査で追加**。文字看板のみ。建物は作らず、位置は推定 |
| 献血バス | `js/props.js` | shots/bus.png, bus.js の通過確認 | **監査で追加**。位置は推定 |
| 自販機 | `js/props.js` vm | 01_station | 実装 |
| 青果市場跡の駐車場 | `js/layout.js` FLAT | 07_lot | 実装 |
| 店名(ラオックス、石丸、サトーム、ヤマギワ、オノデン、ナカウラ、ラジオ会館、ロケット) | `js/signs.js`, `js/layout.js` SIGNS | grep で全数ヒット | 実装 |
| 細い路地・ガード下 | `js/layout.js` FLAT, `js/rail.js` | walk.js「路地を北へくぐる」 | 実装 |
| 工事塀・車止めで区切る | `js/layout.js` 外枠, `js/player.js` トースト | walk.js edges | 実装。形は当たり判定と案内が中心 |
| ACES、HDRI の IBL と空 | `js/main.js:32`, `:81` | grep, 01_station | 実装 |
| PCFSoft、静的影 | `js/main.js:35` | grep | 実装 |
| GTAO | `js/post.js` | 自動調整。余裕があるときだけ有効 | 実装 |
| FXAA | `js/post.js` FinalShader | 目視 | 実装 |
| 控えめなブルーム | — | grep 0 件 | **未実装**。理由は下記 |
| 実写アスファルト、マンホール、白線の摩耗、ひび割れ | `js/ground.js` | 02_court | 実装 |
| ガムの跡 | — | grep 0 件 | **未実装**。理由は下記 |
| 色あせた舗装、摩耗したライン、金網、ゴール、ネット | `js/ground.js`, `js/props.js` | 02_court | 実装 |
| 窓の interior mapping | `js/facade.js` | 04_chuo_n | 実装 |
| 室外機、配管、雨染み、袖看板、垂れ幕、店頭ワゴン | `js/buildings.js`, `js/facade.js`, `js/props.js` | grep, 目視 | 実装 |
| 黄の総武線、黄緑の山手線、青の京浜東北線 | `js/rail.js` | ops.js の電車移動 | 実装 |
| 電線、電柱、自転車 | `js/props.js` | 目視 | 実装 |
| 3on3 と通行人 | `js/people.js` | ops.js の walkerDelta | 実装 |
| WASD、Shift、Space、V | `js/ui.js`, `js/player.js` | ops.js | 実装 |
| ネームプレート、エモート 2 種、ボール | `js/player.js` | ops.js | 実装。手を振る=1、シュート=2(`js/player.js:208-209`)。ops.js で実操作を確かめたのは手を振るだけ |
| 地図メニュー、ワールド情報 | `index.html`, `js/ui.js` | ops.js | 実装 |
| タッチ操作 | `js/ui.js:37` | コード確認のみ。実機未検証 | 実装 |
| WebXR | `js/main.js:161` | 非対応時の非表示のみ確認 | **UNVERIFIED** |
| WebGL 不可のフォールバック | `index.html`, `js/main.js` | checks.js | 実装 |
| reduced-motion | `js/main.js:17` | checks.js で train 0, walker 0 | 実装 |
| タブ非表示で rAF 停止 | `js/main.js:235` | コード確認のみ | 実装 |
| 外部リクエスト 0 | — | shoot.js ext [] | 実装 |
| 描画命令 300 未満 | — | 56〜61 | 実装 |
| 内蔵 GPU で 25fps 以上 | — | 60fps を観測。ただし別プロセスのゲームが GPU を併用中で揺れが大きい | clean な状態では未測定 |
| 定点スクショ、自動歩行、overflow | `tools/` | shoot.js, walk.js, checks.js | 実装 |
| リアル | 全体 | `SOURCES.md` の限界の節 | **部分的**。写真と見間違える水準ではない |

## 未実装と理由

- **ブルーム:** 昼の屋外で光源の滲みが目立つ場面が少ない。内蔵 GPU にはパスの追加も重い。夜を入れるなら再検討する。
- **ガムの跡:** 歩道は塗装マスクを持たない別材質で、足すにはシェーダの変更が要る。歩行者の目線でほぼ判別できない細部なので見送った。

## 計画からの変更(矛盾の解釈)

- **ポート:** 計画の 9141 ではなく 9181 で登録した。変更の理由は記録に残っていない。動作には影響しない。
- **fov:** 計画は約 50 と書き、fov 32〜45 を意図的に外すとした。同じ視点で比べると 45 でも看板と路面が同時に入り、写真に近い見え方になったため 45(縦画面 64)にした。判断は `SOURCES.md` に記録済み。
- **「金網のコート」:** 計画の Signature は金網と書いたが、当時の写真のコートは低い白い柵で、高い金網は確認できない。写真を優先し、南東は低い柵(1.25m)、北西は高い柵(2.1m)にした。

## 平坦化の確認

壁種ごとの柱間、窓、色は `js/facade.js` TYPES に種類別で持つ。車の種類別パラメータは `js/props.js` の `park` と `carGeometry` にある。グローバル定数 1 本に潰した箇所は見つからなかった。

## 縮退分岐の掃引(第 3〜4 回の差分)

`T.blank` の分岐は窓の有無を変える。`T.panel` は目地の有無を変える。水切りの `free && start < 0` と `!free && start >= 0` は別の状態遷移を担う。屋上の `R() < 0.5` は鉄骨の有無を変える。両枝が同値の分岐は無い。水切りには注意点がある。`u` のループは `u <= L` まで回り、`u < L` が偽になる最後の回で必ず板を閉じる。`L` が 1.5 の倍数でないときは最後の `u` が `L` に届かず、面の端に最大 1.5m 未満の板の欠けが出るか、板自体が出ない。見た目の不具合としては軽微で、修正していない。
