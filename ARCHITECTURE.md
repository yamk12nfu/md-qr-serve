# md-qr-serve 実装計画書

## 1. プロジェクト概要
### 1.1 目的
`md-qr-serve` は、現在開いている Markdown（`.md`）ファイルをローカル HTTP サーバで配信し、VSCode の WebView パネルに QR コードを表示する拡張機能です。開発中のドキュメントを、同一ネットワーク上のスマホ/iPad から即時確認できることを目的とします。

### 1.2 提供価値
- VSCode 上で `md-qr-serve.start` を実行するだけで配信開始できる。
- QR コード読み取りで URL 手入力を省略できる。
- Markdown の更新をファイル監視で検知し、次回アクセス時に反映される。

## 2. アーキテクチャ概要
### 2.1 モジュール構成
本拡張は以下 3 モジュールで構成します。

- `src/extension.ts`:
  エントリーポイント。コマンド登録、起動/停止フロー、ライフサイクル管理を担当。
- `src/server.ts`:
  HTTP サーバ、Markdown レンダリング、ファイル監視、配信制御を担当。
- `src/qrPanel.ts`:
  QR コード生成と WebView パネル表示を担当。

### 2.2 モジュール連携
1. `extension.ts` が `md-qr-serve.start` 実行時に対象 `.md` を決定。
2. `server.ts` の `startServer()` で配信開始し、`ServerInfo.url` を返却。
3. `qrPanel.ts` の `showQrPanel()` が URL の QR コードを表示。
4. `md-qr-serve.stop` または deactivate 時に `stopServer()` と `disposePanel()` を実行。

## 3. 各モジュールの責務と設計方針
### 3.1 `src/extension.ts`
- `md-qr-serve.start` / `md-qr-serve.stop` の 2 コマンドを登録。
- Start コマンドは `resource?: vscode.Uri` を受け取り、Explorer 右クリック起動時の対象ファイルを処理。
- `resource` がない場合はアクティブエディタの Markdown ファイルを採用。
- 既存サーバ起動中は `stopServer()` と `disposePanel()` を先に実行して再起動。
- 起動成功時はステータスバー表示と情報メッセージを通知。
- deactivate 時はサーバとパネルを必ず破棄。

### 3.2 `src/server.ts`
- `ServerInfo` 型（`url`, `port`, `lanIp`）を返却し、UI 側と接続情報を共有。
- LAN IP 検出は `os.networkInterfaces()` を使い、`en0` → `eth0` → `wlan0` を優先。未検出時は `127.0.0.1`。
- `marked` を `gfm: true, breaks: true` で設定し、Markdown を HTML 化。
- モバイル閲覧を意識したレスポンシブ CSS を HTML テンプレートに内包。
- ポート競合時は `DEFAULT_PORT`（13579）から最大 10 回リトライ。
- `chokidar` によるイベント駆動ファイル監視で変更検知し、HTML キャッシュを遅延再生成。
- `startServer()` の事前レンダリング（`getHtmlDocument()`）失敗時は、`unwatchMarkdownFile()` と `resetContentState()` を実行して状態をクリーンアップしてから再送出する。
- セキュリティ方針:
  - `path.resolve()` + `.md` 拡張子チェック + `statSync().isFile()` で配信対象を限定。
  - ルートパス（`/`）以外は 404 を返却。
  - すべての応答に `X-Content-Type-Options: nosniff` を付与。

### 3.3 `src/qrPanel.ts`
- `qrcode` パッケージの `toDataURL()` で QR 画像を生成。
- WebView HTML に CSP を設定:
  `default-src 'none'; img-src data:; style-src 'unsafe-inline';`
- 既存パネルがある場合は再利用（`reveal`）し、重複生成を防止。
- URL は HTML エスケープして埋め込み。
- QR 生成失敗時は URL テキストのみ表示し、手入力案内で graceful degradation を実装。

## 4. 技術スタック
### 4.1 言語・ランタイム・API
- TypeScript
- VSCode Extension API（`@types/vscode ^1.85.0`）
- Node.js 標準モジュール（`http`, `os`, `fs`, `path`）

### 4.2 ライブラリ
- `marked ^9.0.0`
- `sanitize-html ^2.13.0`
- `chokidar ^4.0.0`
- `marked-katex-extension ^5.1.2`
- `qrcode ^1.5.4`

## 5. ファイル構成
### 5.1 主要ファイル
```text
md-qr-serve/
├── package.json
├── tsconfig.json
├── .vscodeignore
└── src/
    ├── auth.ts
    ├── extension.ts
    ├── mermaidKatex.ts
    ├── qrPanel.ts
    ├── server.ts
    ├── theme.ts
    └── utils.ts
```

### 5.2 補足
- ビルド出力先は `out/`（`tsconfig.json` の `outDir`）。
- エントリーポイントは `main: ./out/extension.js`（`package.json`）。

## 6. コマンド仕様
### 6.1 `md-qr-serve.start`
- 呼び出し元:
  - コマンドパレット
  - エディタ右クリック（`editor/context`）
  - Explorer 右クリック（`explorer/context`）
- 前提:
  - 対象は Markdown ファイル（`.md`）
- 主処理:
  - 対象ファイル決定
  - 既存サーバ停止（必要時）
  - サーバ起動
  - QR パネル表示

### 6.2 `md-qr-serve.stop`
- 呼び出し元:
  - コマンドパレット
- 主処理:
  - サーバ停止
  - QR パネル破棄

## 7. セキュリティ設計
### 7.1 サーバ配信制御
- 指定ファイルのみ配信:
  - `path.resolve()` で絶対パス化
  - `.md` 拡張子検証
  - `statSync().isFile()` でファイル実体検証
- `pathname !== "/"` は 404。
- `currentMdFilePath !== allowedMdFilePath` の場合も 404。

### 7.2 ヘッダ/CSP
- 全レスポンスに `X-Content-Type-Options: nosniff` を設定。
- WebView は以下 CSP を適用:
  - `default-src 'none'`
  - `img-src data:`
  - `style-src 'unsafe-inline'`

### 7.3 HTML エスケープ
- `server.ts`:
  - タイトル埋め込み前に `escapeHtml()` を適用。
- `qrPanel.ts`:
  - URL 埋め込み前に `escapeHtml()` を適用。

## 8. 今後の拡張ポイント
### 8.1 機能拡張候補
- WebSocket/SSE による自動リロード（実装済み（`src/server.ts`））。
- 複数 Markdown ファイルの同時配信。
- 表示テーマ切替（ライト/ダーク、タイポグラフィ調整）（実装済み（`src/theme.ts`））。
- Mermaid/数式（KaTeX 等）対応（実装済み（`src/mermaidKatex.ts`））。
- 配信 URL の認証・アクセス制御オプション（実装済み（`src/auth.ts`）: ワンタイムトークン認証）。

## 9. テスト可能設計
### 9.1 最低限の手動受け入れ確認項目（tests_policy: none 前提）
- コマンドパレットから `md-qr-serve.start` を実行し、サーバ起動メッセージが表示されること。
- QR パネルが表示され、QR 画像または URL テキストが確認できること。
- 同一ネットワーク上のモバイル端末から URL にアクセスし、Markdown が表示されること。
- コマンドパレットから `md-qr-serve.stop` を実行し、サーバ停止メッセージとパネル破棄を確認できること。

### 9.2 将来の単体テスト対象（モジュール境界ベース）
- `server/qrPanel/extension` の境界を維持し、`extension.ts` では VSCode API 依存部を薄く保つ。
- `server.ts` の pure function: `getLanIp`, `buildHtmlDocument` はモック不要で入出力検証可能。
- `utils.ts` の pure function: `escapeHtml` はモック不要でエスケープ規則を直接検証可能。
- `qrPanel.ts` は `utils.ts` の `escapeHtml` 利用を前提に、URL 埋め込み時のエスケープ適用有無を検証可能。
- `extension.ts` の `getActiveMarkdownFilePath` は VSCode editor 状態の最小スタブで分岐確認可能。

## 10. セットアップ・ビルド・デバッグ手順
### 10.1 ローカル開発
```bash
cd md-qr-serve
npm install
npm run compile
# VSCode で F5 を押して Extension Development Host を起動
```

### 10.2 配布用パッケージ
```bash
cd md-qr-serve
vsce package
code --install-extension md-qr-serve-0.0.1.vsix
```

### 10.3 補足
- `vsce package` は `.vsix` を生成するため、手動インストールで動作確認可能。
- 開発中は `npm run watch` により TypeScript の監視ビルドを利用可能。
