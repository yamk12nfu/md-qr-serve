import * as fs from "fs";
import * as http from "http";
import * as os from "os";
import * as path from "path";

import { describe, expect, it } from "vitest";

import { getMermaidKatexStyles } from "../mermaidKatex";
import { buildHtmlDocument, escapeHtml, getLanIp, startServer, stopServer } from "../server";
import { getThemeStyles } from "../theme";

function requestHeaders(
  baseUrl: string,
  pathname: string,
): Promise<{ statusCode: number | undefined; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const req = http.request(new URL(pathname, baseUrl), { method: "GET" }, (res) => {
      resolve({ statusCode: res.statusCode, headers: res.headers });
      res.destroy();
    });
    req.on("error", reject);
    req.end();
  });
}

function requestText(
  baseUrl: string,
  pathname: string,
): Promise<{ statusCode: number | undefined; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(new URL(pathname, baseUrl), { method: "GET" }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk: string) => {
        body += chunk;
      });
      res.on("end", () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, body });
      });
    });
    req.on("error", reject);
    req.end();
  });
}

describe("getLanIp", () => {
  it("returns an IPv4 address format", () => {
    const lanIp = getLanIp();
    expect(lanIp).toMatch(/^\d{1,3}(?:\.\d{1,3}){3}$/);
  });

  it("does not return an empty string", () => {
    expect(getLanIp()).not.toBe("");
  });
});

describe("escapeHtml", () => {
  it("escapes ampersand", () => {
    expect(escapeHtml("&")).toBe("&amp;");
  });

  it("escapes less-than", () => {
    expect(escapeHtml("<")).toBe("&lt;");
  });

  it("escapes greater-than", () => {
    expect(escapeHtml(">")).toBe("&gt;");
  });

  it("escapes double quote", () => {
    expect(escapeHtml('"')).toBe("&quot;");
  });

  it("escapes single quote", () => {
    expect(escapeHtml("'")).toBe("&#39;");
  });

  it("returns the same string when no special chars are present", () => {
    expect(escapeHtml("plain text 123")).toBe("plain text 123");
  });

  it("escapes a string containing multiple special chars", () => {
    expect(escapeHtml("Tom & <Jerry> \"quote\" 'single'"))
      .toBe("Tom &amp; &lt;Jerry&gt; &quot;quote&quot; &#39;single&#39;");
  });

  it("returns empty string for empty input", () => {
    expect(escapeHtml("")).toBe("");
  });
});

describe("buildHtmlDocument", () => {
  it("starts with doctype declaration", () => {
    const html = buildHtmlDocument("doc.md", "<p>content</p>", "one-time-token");
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
  });

  it("includes escaped title in title tag", () => {
    const html = buildHtmlDocument('x&<y>"\'.md', "<p>content</p>", "one-time-token");
    expect(html).toContain("<title>x&amp;&lt;y&gt;&quot;&#39;.md</title>");
  });

  it("includes rendered html inside body", () => {
    const renderedHtml = "<article><p>Rendered body</p></article>";
    const html = buildHtmlDocument("doc.md", renderedHtml, "one-time-token");
    expect(html).toContain("<body>");
    expect(html).toContain(renderedHtml);
  });

  it("contains viewport meta tag for mobile", () => {
    const html = buildHtmlDocument("doc.md", "<p>content</p>", "one-time-token");
    expect(html).toContain('<meta name="viewport"');
  });

  it("includes EventSource script for live reload", () => {
    const html = buildHtmlDocument("doc.md", "<p>content</p>", "one-time-token");
    expect(html).toContain("new EventSource('/sse?token=one-time-token')");
  });

  it("includes Mermaid CDN script tag", () => {
    const html = buildHtmlDocument("doc.md", "<p>content</p>", "one-time-token");
    expect(html).toContain("https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs");
  });

  it("includes KaTeX CSS CDN link and does not include client-side auto-render scripts", () => {
    const html = buildHtmlDocument("doc.md", "<p>content</p>", "one-time-token");
    expect(html).toContain("https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css");
    expect(html).not.toContain("https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js");
    expect(html).not.toContain("https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js");
  });

  it("includes theme CSS for prefers-color-scheme", () => {
    const html = buildHtmlDocument("doc.md", "<p>content</p>", "one-time-token");
    expect(html).toContain("(prefers-color-scheme: dark)");
  });

  it("includes theme toggle button", () => {
    const html = buildHtmlDocument("doc.md", "<p>content</p>", "one-time-token");
    expect(html).toContain('id="theme-toggle"');
  });
});

describe("SSE endpoint", () => {
  it("returns event-stream headers for /sse", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "md-qr-serve-test-"));
    const mdPath = path.join(tempDir, "sample.md");
    fs.writeFileSync(mdPath, "# hello", "utf8");

    const basePort = 22000 + Math.floor(Math.random() * 10000);
    const serverInfo = await startServer(mdPath, basePort);

    try {
      expect(serverInfo.token).toMatch(/^[a-f0-9]{32}$/);
      expect(new URL(serverInfo.url).searchParams.get("token")).toBe(serverInfo.token);

      const response = await requestHeaders(serverInfo.url, `/sse?token=${serverInfo.token}`);
      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("text/event-stream");
      expect(response.headers["cache-control"]).toBe("no-cache");
    } finally {
      stopServer();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe("Token authentication", () => {
  it("returns 403 when token is missing", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "md-qr-serve-token-missing-test-"));
    const mdPath = path.join(tempDir, "sample.md");
    fs.writeFileSync(mdPath, "# hello", "utf8");

    const basePort = 23400 + Math.floor(Math.random() * 10000);
    const serverInfo = await startServer(mdPath, basePort);

    try {
      const response = await requestText(serverInfo.url, "/");
      expect(response.statusCode).toBe(403);
      expect(response.body).toBe("Forbidden");
    } finally {
      stopServer();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("returns 403 when token is invalid", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "md-qr-serve-token-invalid-test-"));
    const mdPath = path.join(tempDir, "sample.md");
    fs.writeFileSync(mdPath, "# hello", "utf8");

    const basePort = 23500 + Math.floor(Math.random() * 10000);
    const serverInfo = await startServer(mdPath, basePort);

    try {
      const response = await requestText(serverInfo.url, "/?token=invalid-token");
      expect(response.statusCode).toBe(403);
      expect(response.body).toBe("Forbidden");
    } finally {
      stopServer();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("returns 403 for /sse when token is missing", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "md-qr-serve-sse-token-missing-test-"));
    const mdPath = path.join(tempDir, "sample.md");
    fs.writeFileSync(mdPath, "# hello", "utf8");

    const basePort = 23600 + Math.floor(Math.random() * 10000);
    const serverInfo = await startServer(mdPath, basePort);

    try {
      const response = await requestText(serverInfo.url, "/sse");
      expect(response.statusCode).toBe(403);
      expect(response.body).toBe("Forbidden");
    } finally {
      stopServer();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("returns 403 for /sse when token is invalid", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "md-qr-serve-sse-token-invalid-test-"));
    const mdPath = path.join(tempDir, "sample.md");
    fs.writeFileSync(mdPath, "# hello", "utf8");

    const basePort = 23700 + Math.floor(Math.random() * 10000);
    const serverInfo = await startServer(mdPath, basePort);

    try {
      const response = await requestText(serverInfo.url, "/sse?token=invalid-token");
      expect(response.statusCode).toBe(403);
      expect(response.body).toBe("Forbidden");
    } finally {
      stopServer();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe("Markdown rendering with KaTeX", () => {
  it("renders inline math without turning underscores into emphasis", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "md-qr-serve-katex-inline-test-"));
    const mdPath = path.join(tempDir, "inline-math.md");
    fs.writeFileSync(mdPath, "Inline math: $a_b$.", "utf8");

    const basePort = 23200 + Math.floor(Math.random() * 10000);
    const serverInfo = await startServer(mdPath, basePort);

    try {
      const response = await requestText(serverInfo.url, `/?token=${serverInfo.token}`);
      expect(response.statusCode).toBe(200);
      expect(response.body).toContain("katex");
      expect(response.body).not.toContain("<em>");
      expect(response.body).toContain("annotation");
    } finally {
      stopServer();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("renders block math on the server without turning underscores into emphasis", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "md-qr-serve-katex-test-"));
    const mdPath = path.join(tempDir, "math.md");
    fs.writeFileSync(mdPath, "$$\na_b\n$$", "utf8");

    const basePort = 23000 + Math.floor(Math.random() * 10000);
    const serverInfo = await startServer(mdPath, basePort);

    try {
      const response = await requestText(serverInfo.url, `/?token=${serverInfo.token}`);
      expect(response.statusCode).toBe(200);
      expect(response.body).toContain("katex-display");
      expect(response.body).not.toContain("<em>");
      expect(response.body).toContain("annotation");
      expect(response.body).toContain("math");
    } finally {
      stopServer();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("keeps Mermaid code blocks and KaTeX rendering together in one document", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "md-qr-serve-mermaid-katex-test-"));
    const mdPath = path.join(tempDir, "mixed.md");
    fs.writeFileSync(
      mdPath,
      "```mermaid\ngraph LR\n  A --> B\n```\n\nInline math: $a_b$",
      "utf8",
    );

    const basePort = 23300 + Math.floor(Math.random() * 10000);
    const serverInfo = await startServer(mdPath, basePort);

    try {
      const response = await requestText(serverInfo.url, `/?token=${serverInfo.token}`);
      expect(response.statusCode).toBe(200);
      expect(response.body).toContain("language-mermaid");
      expect(response.body).toContain("katex");
      expect(response.body).toContain("annotation");
      expect(response.body).not.toContain("<em>");
    } finally {
      stopServer();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe("Mermaid/KaTeX and theme style helpers", () => {
  it("getMermaidKatexStyles contains mermaid horizontal overflow rule", () => {
    expect(getMermaidKatexStyles()).toContain(".mermaid { overflow-x: auto; }");
  });

  it("getThemeStyles contains dark background color", () => {
    expect(getThemeStyles()).toContain("#1a1a2e");
  });
});
