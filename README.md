# Twin:te教室情報自動入力拡張機能

Twin:teの授業情報に教室情報を自動で追加するChrome拡張機能です。Excelファイルから教室情報を読み込み、Twin:teの授業ページで自動入力を行います。

Chrome拡張機能のストアはこちらから

https://chrome.google.com/webstore/detail/lomdamcfookckjfahmoflflofdndamjk

## 機能

- Excelファイルからの教室情報の読み込み
- Twin:teの授業ページでの教室情報の自動入力
- 複数授業の一括処理
- エラーハンドリングとステータス表示

## 使い方

1. 拡張機能をインストール
2. 教室情報が記載されたExcelファイルを用意
   - ExcelファイルはTWINSなどから各自ダウンロードして下さい。
3. Twin:teの授業一覧ページを開く
4. 拡張機能のポップアップを開き、Excelファイルを選択
5. 「入力開始」ボタンをクリックして自動入力を開始

## 注意事項

- Twin:teの授業一覧ページでのみ動作します
- 処理中は別のタブに移動しないでください
- 大量の授業を一度に処理する場合は時間がかかる場合があります

### 必要な環境

- Chrome ブラウザ

### 使用している主な技術

- Chrome Extension API
- JavaScript
- SheetJS（Excelファイル処理）

### インストール方法（開発者向け）

1. リポジトリをクローン
2. Chrome拡張機能の管理ページを開く
3. 「デベロッパーモード」を有効化
4. 「パッケージ化されていない拡張機能を読み込む」をクリック
5. クローンしたディレクトリを選択

### ファイル構成

- `manifest.json`: 拡張機能の設定ファイル
- `popup.html`: ポップアップのHTML
- `popup.js`: ポップアップのスクリプト
- `popup.css`: ポップアップのスタイル
- `content.js`: コンテンツスクリプト
- `background.js`: バックグラウンドスクリプト
- `xlsx.full.min.js`: SheetJSライブラリ

## ライセンス

MIT License

## 貢献

バグ報告や機能改善の提案は、Issueを作成してください。
プルリクエストも歓迎します。
