import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({
  window: {
    activeTextEditor: null as any,
  },
}));

import * as vscode from "vscode";
import { getActiveMarkdownFilePath } from "../extension";

describe("getActiveMarkdownFilePath", () => {
  beforeEach(() => {
    (vscode.window as any).activeTextEditor = null;
  });

  it("returns null when activeTextEditor is null", () => {
    expect(getActiveMarkdownFilePath()).toBeNull();
  });

  it("returns null when file is not .md", () => {
    (vscode.window as any).activeTextEditor = {
      document: {
        uri: { fsPath: "/tmp/note.txt" },
        languageId: "markdown",
      },
    };

    expect(getActiveMarkdownFilePath()).toBeNull();
  });

  it("returns null when languageId is not markdown", () => {
    (vscode.window as any).activeTextEditor = {
      document: {
        uri: { fsPath: "/tmp/note.md" },
        languageId: "plaintext",
      },
    };

    expect(getActiveMarkdownFilePath()).toBeNull();
  });

  it("returns filePath for markdown file with markdown languageId", () => {
    (vscode.window as any).activeTextEditor = {
      document: {
        uri: { fsPath: "/tmp/note.md" },
        languageId: "markdown",
      },
    };

    expect(getActiveMarkdownFilePath()).toBe("/tmp/note.md");
  });
});
