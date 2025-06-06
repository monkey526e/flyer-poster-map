# flyer-map
## 利用している外部リソースについて
本プロジェクトでは、以下のオープンソースプロジェクトを参考・改変して使用しています：

- [poster-map](https://github.com/takahiroanno2024/poster-map/)  
  © [安野貴博, takahiroanno2024] — Licensed under the GNU General Public License v3.0 (GPL-3.0)

このプロジェクト全体も GPL-3.0 ライセンスのもとに公開しています。  
元プロジェクトのライセンス条件に従い、本リポジトリのソースコードも同様のライセンスを継承しています。

## アプリケーション概要
安野氏の公開しているコードを都議会議員選挙用にカスタマイズしました。
ほぼ全てchatGPTで生成したコードですので、読みにくくて申し訳ございません。

## 謝辞
本プロジェクトでは、元のプロジェクトに加え、以下の外部ライブラリや公開データを活用させていただいています。これらを提供してくださった開発者の皆さま、関係者の皆さまに心より感謝申し上げます。
- [Linked Open Addresses Japan](https://uedayou.net/loa/)
    - 各丁目のポリゴンを取得
- [e-Stat 政府統計の総合窓口](https://www.e-stat.go.jp/)
    - 世帯数情報を取得

元プロジェクトで使用されていたものは下記のとおりです。
- [Leaflet](https://leafletjs.com/)
    - 地図上での可視化に使用
- [Bootstrap](https://getbootstrap.jp/)
    - トップページのメニューに使用 (CSSのみ)
- [Linked Open Addresses Japan](https://uedayou.net/loa/)
    - `/summary`ページで進捗を可視化する際に、各市区町村のポリゴンを利用
- [OpenStreetMap](https://www.openstreetmap.org/copyright), [国土地理院地図](https://maps.gsi.go.jp/development/ichiran.html), [Google Map](https://www.google.com/maps)
    - ベースマップとして利用

