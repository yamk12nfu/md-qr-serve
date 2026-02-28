# md-qr-serve

`md-qr-serve` は、Markdown ファイルをローカル HTTP サーバで配信し、QR コード経由でモバイル端末から即時閲覧できる VSCode 拡張です。

## Features
- Markdown ファイルをローカル HTTP サーバで配信
- WebView パネルに配信用 URL の QR コードを表示
- ファイル監視による内容更新の反映
- SSE ライブリロード（ファイル保存時に自動更新）
- Mermaid 図・KaTeX 数式レンダリング
- テーマ切替（OS自動追従 + 手動トグル）
- ワンタイムトークン認証（QRコード読み取り者のみアクセス可能）
- Explorer / エディタ右クリックから起動可能
- Start / Stop コマンドで配信制御

## Usage
1. 配信したい Markdown ファイルを VSCode で開きます。
2. 次のいずれかで `Serve MD with QR: Start Server`（`md-qr-serve.start`）を実行します。
   - コマンドパレット
   - エディタ右クリックメニュー
   - Explorer 右クリックメニュー
3. 表示された QR コードをモバイルで読み取り、ページを閲覧します。
4. 停止する場合は `Serve MD with QR: Stop Server`（`md-qr-serve.stop`）を実行します。

## Requirements
- VSCode 1.85 以上

## Extension Settings
- なし（現時点では拡張設定項目はありません）

## Known Issues
- PC 側のファイアウォール設定やネットワーク構成により、モバイルからアクセスできない場合があります。

## Security
- 同一ネットワーク上でのみアクセス可能。公共WiFiでの使用は推奨しません。
- ワンタイムトークンによりQRコード読み取り者のみアクセス可能です。

## Release Notes
### 0.0.1
- 初回リリース
- Markdown ローカル配信、QR コード表示、右クリック起動に対応

## License
MIT
