import * as fs from "fs";
import * as http from "http";
import * as os from "os";
import * as path from "path";

import { marked } from "marked";

export interface ServerInfo {
  url: string;
  port: number;
  lanIp: string;
}

const DEFAULT_PORT = 13579;
const MAX_PORT_ATTEMPTS = 10;
const WATCH_INTERVAL_MS = 500;

let server: http.Server | null = null;
let currentMdFilePath: string | null = null;
let watchedMdFilePath: string | null = null;
let cachedHtmlDocument = "";
let isMarkdownDirty = true;

marked.use({ gfm: true, breaks: true });

function getLanIp(): string {
  const nets = os.networkInterfaces();
  const preferred = ["en0", "eth0", "wlan0"];

  for (const name of preferred) {
    const iface = nets[name];
    if (!iface) {
      continue;
    }

    for (const net of iface) {
      if (!net.internal && net.family === "IPv4") {
        return net.address;
      }
    }
  }

  for (const name of Object.keys(nets)) {
    const iface = nets[name];
    if (!iface) {
      continue;
    }

    for (const net of iface) {
      if (!net.internal && net.family === "IPv4") {
        return net.address;
      }
    }
  }

  return "127.0.0.1";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildHtmlDocument(mdFileName: string, renderedHtml: string): string {
  const safeTitle = escapeHtml(mdFileName);

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
                   'Helvetica Neue', Arial, sans-serif;
      line-height: 1.7; color: #1a1a1a; background: #fafafa;
      padding: 16px; max-width: 800px; margin: 0 auto;
    }
    h1, h2, h3, h4, h5, h6 { margin: 1.2em 0 0.6em; color: #2c3e50; }
    h1 { font-size: 1.8em; border-bottom: 2px solid #3498db; padding-bottom: 0.3em; }
    h2 { font-size: 1.4em; border-bottom: 1px solid #ddd; padding-bottom: 0.2em; }
    p { margin: 0.8em 0; }
    code {
      background: #f0f0f0; padding: 2px 6px; border-radius: 3px;
      font-size: 0.9em; font-family: 'SF Mono', Monaco, monospace;
    }
    pre {
      background: #2d2d2d; color: #f8f8f2; padding: 16px;
      border-radius: 8px; overflow-x: auto; margin: 1em 0;
    }
    pre code { background: none; color: inherit; padding: 0; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f5f5f5; }
    blockquote {
      border-left: 4px solid #3498db; margin: 1em 0;
      padding: 0.5em 1em; background: #f0f7ff;
    }
    a { color: #3498db; }
    img { max-width: 100%; height: auto; }
    ul, ol { padding-left: 1.5em; margin: 0.8em 0; }
    li { margin: 0.3em 0; }
    @media (max-width: 600px) {
      body { padding: 12px; font-size: 15px; }
      h1 { font-size: 1.5em; }
      pre { padding: 12px; font-size: 13px; }
    }
  </style>
</head>
<body>
  ${renderedHtml}
</body>
</html>`;
}

function readAndRenderMarkdown(): string {
  if (!currentMdFilePath) {
    throw new Error("Markdown file path is not set.");
  }

  const markdownText = fs.readFileSync(currentMdFilePath, "utf8");
  const parsed = marked.parse(markdownText);

  if (typeof parsed !== "string") {
    throw new Error("Marked returned an async result unexpectedly.");
  }

  return buildHtmlDocument(path.basename(currentMdFilePath), parsed);
}

function getHtmlDocument(): string {
  if (isMarkdownDirty || cachedHtmlDocument.length === 0) {
    cachedHtmlDocument = readAndRenderMarkdown();
    isMarkdownDirty = false;
  }

  return cachedHtmlDocument;
}

function resetContentState(): void {
  currentMdFilePath = null;
  cachedHtmlDocument = "";
  isMarkdownDirty = true;
}

function unwatchMarkdownFile(): void {
  if (!watchedMdFilePath) {
    return;
  }

  fs.unwatchFile(watchedMdFilePath);
  watchedMdFilePath = null;
}

function startMarkdownWatcher(mdFilePath: string): void {
  unwatchMarkdownFile();
  watchedMdFilePath = mdFilePath;

  fs.watchFile(mdFilePath, { interval: WATCH_INTERVAL_MS }, () => {
    isMarkdownDirty = true;
  });
}

function createRequestHandler(allowedMdFilePath: string): http.RequestListener {
  return (req, res) => {
    const rawUrl = req.url ?? "/";
    let pathname = "/";

    try {
      pathname = new URL(rawUrl, "http://localhost").pathname;
    } catch {
      pathname = rawUrl;
    }

    if (pathname !== "/") {
      res.writeHead(404, {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      });
      res.end("Not Found");
      return;
    }

    if (currentMdFilePath !== allowedMdFilePath) {
      res.writeHead(404, {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      });
      res.end("Not Found");
      return;
    }

    try {
      const htmlDocument = getHtmlDocument();
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      });

      if (req.method === "HEAD") {
        res.end();
        return;
      }

      res.end(htmlDocument);
    } catch {
      res.writeHead(500, {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      });
      res.end("Failed to render markdown file.");
    }
  };
}

function listenOnPort(mdFilePath: string, port: number): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    const candidateServer = http.createServer(createRequestHandler(mdFilePath));

    const onError = (error: NodeJS.ErrnoException): void => {
      cleanup();
      reject(error);
    };

    const onListening = (): void => {
      cleanup();
      resolve(candidateServer);
    };

    const cleanup = (): void => {
      candidateServer.off("error", onError);
      candidateServer.off("listening", onListening);
    };

    candidateServer.on("error", onError);
    candidateServer.on("listening", onListening);
    candidateServer.listen(port, "0.0.0.0");
  });
}

function closeServerInstance(activeServer: http.Server): Promise<void> {
  return new Promise((resolve) => {
    if (!activeServer.listening) {
      resolve();
      return;
    }

    activeServer.close(() => {
      resolve();
    });
  });
}

export async function startServer(mdFilePath: string, port = DEFAULT_PORT): Promise<ServerInfo> {
  if (!mdFilePath) {
    throw new Error("Markdown file path is required.");
  }

  const resolvedMdFilePath = path.resolve(mdFilePath);

  if (path.extname(resolvedMdFilePath).toLowerCase() !== ".md") {
    throw new Error("Only .md files can be served.");
  }

  const stats = fs.statSync(resolvedMdFilePath);
  if (!stats.isFile()) {
    throw new Error("Specified markdown path is not a file.");
  }

  if (server) {
    const previousServer = server;
    server = null;
    await closeServerInstance(previousServer);
    unwatchMarkdownFile();
    resetContentState();
  }

  currentMdFilePath = resolvedMdFilePath;
  cachedHtmlDocument = "";
  isMarkdownDirty = true;

  try {
    // Validate file readability and parser behavior before listening.
    void getHtmlDocument();
    startMarkdownWatcher(resolvedMdFilePath);
  } catch (error) {
    unwatchMarkdownFile();
    resetContentState();
    throw error;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_PORT_ATTEMPTS; attempt += 1) {
    const candidatePort = port + attempt;

    try {
      const startedServer = await listenOnPort(resolvedMdFilePath, candidatePort);
      server = startedServer;

      const lanIp = getLanIp();
      return {
        url: `http://${lanIp}:${candidatePort}`,
        port: candidatePort,
        lanIp,
      };
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === "EADDRINUSE") {
        continue;
      }

      lastError = nodeError;
      break;
    }
  }

  unwatchMarkdownFile();
  resetContentState();

  if (lastError) {
    throw lastError;
  }

  throw new Error(`No available port found in range ${port}-${port + MAX_PORT_ATTEMPTS - 1}.`);
}

export function stopServer(): void {
  unwatchMarkdownFile();

  if (server) {
    const activeServer = server;
    server = null;
    activeServer.close();
  }

  resetContentState();
}

export function isServerRunning(): boolean {
  return Boolean(server && server.listening);
}
