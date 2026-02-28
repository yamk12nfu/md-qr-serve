export function getThemeStyles(): string {
  return `
/* OS setting follow (default) */
@media (prefers-color-scheme: dark) {
  html:not([data-theme="light"]) body {
    background: #1a1a2e;
    color: #e0e0e0;
  }
  html:not([data-theme="light"]) h1,
  html:not([data-theme="light"]) h2,
  html:not([data-theme="light"]) h3,
  html:not([data-theme="light"]) h4,
  html:not([data-theme="light"]) h5,
  html:not([data-theme="light"]) h6 {
    color: #82b1ff;
  }
  html:not([data-theme="light"]) h1 {
    border-bottom-color: #82b1ff;
  }
  html:not([data-theme="light"]) h2 {
    border-bottom-color: #444;
  }
  html:not([data-theme="light"]) th {
    background: #2a2a3e;
  }
  html:not([data-theme="light"]) th,
  html:not([data-theme="light"]) td {
    border-color: #444;
  }
  html:not([data-theme="light"]) blockquote {
    background: #1e2a3a;
    border-left-color: #82b1ff;
  }
  html:not([data-theme="light"]) pre,
  html:not([data-theme="light"]) code {
    background: #2d2d2d;
    color: #f8f8f2;
  }
  html:not([data-theme="light"]) a {
    color: #82b1ff;
  }
}

/* Manual dark mode */
html[data-theme="dark"] body {
  background: #1a1a2e;
  color: #e0e0e0;
}
html[data-theme="dark"] h1,
html[data-theme="dark"] h2,
html[data-theme="dark"] h3,
html[data-theme="dark"] h4,
html[data-theme="dark"] h5,
html[data-theme="dark"] h6 {
  color: #82b1ff;
}
html[data-theme="dark"] h1 {
  border-bottom-color: #82b1ff;
}
html[data-theme="dark"] h2 {
  border-bottom-color: #444;
}
html[data-theme="dark"] th {
  background: #2a2a3e;
}
html[data-theme="dark"] th,
html[data-theme="dark"] td {
  border-color: #444;
}
html[data-theme="dark"] blockquote {
  background: #1e2a3a;
  border-left-color: #82b1ff;
}
html[data-theme="dark"] pre,
html[data-theme="dark"] code {
  background: #2d2d2d;
  color: #f8f8f2;
}
html[data-theme="dark"] a {
  color: #82b1ff;
}

/* Toggle button */
.theme-toggle {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 1000;
  background: none;
  border: 1px solid #888;
  border-radius: 20px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 14px;
  color: inherit;
  opacity: 0.7;
  transition: opacity 0.2s;
}
.theme-toggle:hover {
  opacity: 1;
}
`;
}

export function getThemeToggleHtml(): string {
  return `
<button class="theme-toggle" id="theme-toggle" aria-label="Toggle theme">🌓</button>
<script>
  (function() {
    var storageKey = "md-qr-serve-theme";
    var root = document.documentElement;
    var toggle = document.getElementById("theme-toggle");
    var saved = null;

    try {
      saved = localStorage.getItem(storageKey);
    } catch (e) {
      saved = null;
    }

    if (saved === "light" || saved === "dark") {
      root.setAttribute("data-theme", saved);
    }

    if (!toggle) {
      return;
    }

    toggle.addEventListener("click", function() {
      var current = root.getAttribute("data-theme");
      if (current !== "light" && current !== "dark") {
        current =
          window.matchMedia &&
          window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
      }
      var next = current === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try {
        localStorage.setItem(storageKey, next);
      } catch (e) {}
    });
  })();
</script>
`;
}
