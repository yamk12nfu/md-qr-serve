import * as path from "path";
import * as vscode from "vscode";

import { isServerRunning, startServer, stopServer, ServerInfo } from "./server";
import { disposePanel, showQrPanel } from "./qrPanel";

const START_COMMAND = "md-qr-serve.start";
const STOP_COMMAND = "md-qr-serve.stop";

function getActiveMarkdownFilePath(): string | null {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return null;
  }

  const filePath = editor.document.uri.fsPath;
  if (!filePath.toLowerCase().endsWith(".md")) {
    return null;
  }

  if (editor.document.languageId !== "markdown" && path.extname(filePath).toLowerCase() !== ".md") {
    return null;
  }

  return filePath;
}

export function activate(context: vscode.ExtensionContext): void {
  const startDisposable = vscode.commands.registerCommand(START_COMMAND, async (resource?: vscode.Uri) => {
    let mdFilePath: string | null = null;
    if (resource && resource.fsPath.toLowerCase().endsWith(".md")) {
      mdFilePath = resource.fsPath;
    } else {
      mdFilePath = getActiveMarkdownFilePath();
    }

    if (!mdFilePath) {
      void vscode.window.showWarningMessage("Open a Markdown (.md) file in the active editor before starting the server.");
      return;
    }

    try {
      if (isServerRunning()) {
        stopServer();
        disposePanel();
      }

      const serverInfo: ServerInfo = await startServer(mdFilePath);
      showQrPanel(context, serverInfo.url);
      vscode.window.setStatusBarMessage(`MD QR Server: ${serverInfo.url}`, 10000);
      void vscode.window.showInformationMessage(`Markdown server started: ${serverInfo.url}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`Failed to start Markdown server: ${message}`);
    }
  });

  const stopDisposable = vscode.commands.registerCommand(STOP_COMMAND, () => {
    stopServer();
    disposePanel();
    void vscode.window.showInformationMessage("Markdown server stopped.");
  });

  context.subscriptions.push(startDisposable, stopDisposable);
}

export function deactivate(): void {
  stopServer();
  disposePanel();
}
