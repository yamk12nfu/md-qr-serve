# TODO

## P0（必須）
- [ ] npm install / ビルド確認
  - `npm install` と `npm run compile` を実行し、依存解決・TypeScriptコンパイル・`out/extension.js` 生成まで確認する（未実行）。

- [ ] F5デバッグでの動作確認
  - Extension Development Host を起動し、`md-qr-serve.start` / `md-qr-serve.stop` をコマンドパレット・エディタ右クリック・Explorer右クリックの全導線で確認する。

- [ ] 実機（スマホ/iPad）での閲覧確認
  - 同一Wi-Fi上の実機でQR読み取り→表示確認。Markdown更新後の再アクセス反映、停止後アクセス不可（接続失敗）も検証する。

- [ ] LICENSE ファイルの追加
  - 配布前提のためリポジトリ直下にライセンスを明示する（`package.json` との整合も確認）。

## P1（重要）
- [ ] 単体テストの整備
  - 実装計画書 9.2 にある `getLanIp` / `buildHtmlDocument` / `escapeHtml`（`server.ts`, `qrPanel.ts`）と `getActiveMarkdownFilePath` の分岐テストを追加する。

- [ ] VSCode Marketplace への公開準備
  - `publisher` の最終確認、`README`/`CHANGELOG`/`icon`/`keywords`/`repository`/`license` など公開メタ情報を整備し、`vsce package` でVSIX生成確認する。

- [ ] Markdown HTMLのサニタイズ対応
  - `marked.parse` の結果をそのまま返却しているため、悪意あるMarkdown混入時のXSS対策としてサニタイズ層（例: DOMPurify等）を導入する。

- [ ] HTTPリクエストメソッドの制限
  - 現状は `HEAD` 以外も `/` でHTML返却されるため、`GET` / `HEAD` のみ許可し、それ以外は `405 Method Not Allowed` を返す。

- [ ] `extension.ts` の判定ロジック整理
  - `getActiveMarkdownFilePath` の `languageId` と拡張子判定に冗長条件があるため、意図を明確化した単純な条件へ整理しテストで担保する。

## P2（あったらいい）
- [ ] WebSocket/SSE による自動リロード対応
  - 実装計画書 8.1 の拡張候補。現在は `fs.watchFile` で次回アクセス時に反映のため、接続中クライアントへのライブリロードを追加する。

- [ ] 複数ファイル同時配信対応
  - 現在は `currentMdFilePath` 単一管理のため、ファイルごとにURLを持てるルーティング設計へ拡張する。

- [ ] テーマ切替（ライト/ダーク）
  - サーバ側HTML/CSSが固定配色のため、クエリまたはUI操作でテーマ切替できるようにする。

- [ ] Mermaid/KaTeX対応
  - Markdownレンダリング後にMermaid図・数式描画を有効化し、モバイル表示時の崩れも合わせて調整する。

- [ ] ファイル監視方式の見直し
  - `fs.watchFile` ポーリング（500ms）を利用しているため、更新頻度や電力効率を見て `fs.watch` / chokidar への置換を検討する。

- [ ] エラーハンドリングと運用情報の強化
  - `startServer` / `stopServer` の状態遷移ログや、ポート確保失敗・ファイル削除時のユーザー向けメッセージをより具体化する。
