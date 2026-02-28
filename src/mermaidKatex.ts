export function getMermaidKatexHeadHtml(): string {
  return `<!-- KaTeX CSS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
<!-- Mermaid JS -->
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
  document.querySelectorAll('pre > code.language-mermaid').forEach((el) => {
    const pre = el.parentElement;
    if (!pre) {
      return;
    }

    const div = document.createElement('div');
    div.className = 'mermaid';
    div.textContent = el.textContent;
    pre.replaceWith(div);
  });
  mermaid.initialize({ startOnLoad: true });
</script>`;
}

export function getMermaidKatexStyles(): string {
  return `.mermaid { overflow-x: auto; }
pre > code.language-mermaid { display: block; background: none; color: inherit; }
.katex-display { overflow-x: auto; }`;
}

export function getCdnDomains(): string[] {
  return ["cdn.jsdelivr.net"];
}
