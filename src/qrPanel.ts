import * as vscode from 'vscode';
import QRCode from 'qrcode';
import { escapeHtml } from './utils';

let panel: vscode.WebviewPanel | null = null;

const QR_OPTIONS = {
  errorCorrectionLevel: 'H' as const,
  margin: 2,
  width: 280,
  color: { dark: '#000000', light: '#ffffff' },
};

export function showQrPanel(context: vscode.ExtensionContext, url: string): void {
  void updateQrPanel(context, url);
}

export function disposePanel(): void {
  if (!panel) {
    return;
  }

  panel.dispose();
  panel = null;
}

async function updateQrPanel(context: vscode.ExtensionContext, url: string): Promise<void> {
  let qrDataUrl: string | null = null;

  try {
    qrDataUrl = await QRCode.toDataURL(url, QR_OPTIONS);
  } catch {
    void vscode.window.showErrorMessage('QRコードの生成に失敗しました。URLを手動で入力してください。');
  }

  const activePanel = getOrCreatePanel(context);
  activePanel.webview.html = getWebviewHtml(url, qrDataUrl);
}

function getOrCreatePanel(context: vscode.ExtensionContext): vscode.WebviewPanel {
  if (panel) {
    panel.reveal(vscode.ViewColumn.Two);
    return panel;
  }

  panel = vscode.window.createWebviewPanel(
    'mdQrServe.qrPanel',
    'MD QR Server',
    vscode.ViewColumn.Two,
    { enableScripts: false }
  );

  panel.onDidDispose(() => {
    panel = null;
  });

  context.subscriptions.push(panel);
  return panel;
}

function getWebviewHtml(url: string, qrDataUrl: string | null): string {
  const safeUrl = escapeHtml(url);
  const qrContent = qrDataUrl
    ? `<img src="${qrDataUrl}" alt="QR Code" width="280" height="280" />\n        <p class="url-text">${safeUrl}</p>`
    : `<p class="url-text">${safeUrl}</p>\n        <p style="color: #e74c3c; margin-top: 8px;">QRコード生成に失敗しました。上のURLを手動で入力してください。</p>`;

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; img-src data:; style-src 'unsafe-inline';">
  <style>
    body {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; min-height: 100vh; margin: 0; padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #1e1e1e; color: #cccccc;
    }
    .qr-container {
      background: #ffffff; padding: 20px; border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.3); text-align: center;
    }
    .qr-container img { display: block; margin: 0 auto; }
    .url-text {
      margin-top: 16px; font-size: 14px; color: #1a1a1a;
      word-break: break-all; font-weight: 600;
    }
    .instruction {
      margin-top: 20px; font-size: 13px; color: #888888;
      text-align: center; line-height: 1.5;
    }
    h2 { margin-bottom: 16px; font-size: 18px; color: #cccccc; }
  </style>
</head>
<body>
  <h2>Scan to View on Mobile</h2>
  <div class="qr-container">
    ${qrContent}
  </div>
  <p class="instruction">
    同じWiFiに接続したスマホ/iPadでQRコードを読み取ってください。<br>
    サーバを停止するには: コマンドパレット → "Serve MD with QR: Stop Server"
  </p>
</body>
</html>`;
}
