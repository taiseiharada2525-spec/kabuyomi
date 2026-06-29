# カブヨミ 📰 日本株ニュースPWA

> 気になる銘柄を登録するだけ。関連ニュースをまとめてチェックできる無料の日本株ニュースアプリ。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/taiseiharada2525-spec/kabuyomi)

## 🎯 特徴

- **銘柄ウォッチリスト** — 気になる銘柄を登録して関連ニュースだけを表示
- **センチメント分析** — ニュースの強気・弱気・中立を自動判定
- **市場概況** — 日経平均・TOPIX・グロース250をリアルタイム表示
- **PWA対応** — ホーム画面に追加してネイティブアプリのように使える
- **完全無料** — アカウント登録不要、データはすべて端末内に保存

## 📱 対応銘柄（主要25社）

トヨタ、ソニー、ソフトバンクG、キーエンス、東京エレクトロン、リクルートHD、KDDI、NTT、三菱UFJ、住友商事 など

## 🚀 使い方

1. [カブヨミを開く](https://kabuyomi.vercel.app/)
2. 「銘柄登録」タブから気になる銘柄を追加
3. 「マイ」タブで登録銘柄の関連ニュースを確認

## 🛠 技術スタック

- Vanilla JS（フレームワークなし）
- PWA（Service Worker + Web App Manifest）
- CSS Variables によるダークテーマ

## 📂 ファイル構成

```
kabuyomi/
├── index.html       # メインアプリ
├── app.js           # ロジック
├── data.js          # 銘柄マスタ・ニュースデータ
├── styles.css       # スタイル
├── manifest.json    # PWA設定
├── sw.js            # Service Worker
├── privacy.html     # プライバシーポリシー
├── disclaimer.html  # 免責事項
├── contact.html     # お問い合わせ
└── icons/           # アプリアイコン
```

## ⚖️ 免責事項

当アプリが提供する情報は一般的な情報提供を目的としており、投資助言・売買推奨を目的とするものではありません。詳細は[免責事項](disclaimer.html)をご確認ください。

## 📜 ライセンス

MIT License — 自由にフォーク・改変いただけます。
