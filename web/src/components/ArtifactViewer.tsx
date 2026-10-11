import React, { useState } from 'react';
import DOMPurify from 'dompurify';

function markdownToHtml(md: string): string {
  if (/<[a-z][\s\S]*>/i.test(md)) {
    return md;
  }

  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
    .replace(/`([^`]+)`/gim, '<code>$1</code>')
    .replace(/^\s*[-*]\s+(.*$)/gim, '<li>$1</li>');

  html = html.replace(/(<li>[\s\S]*?<\/li>)/gim, '<ul>$1</ul>');

  html = html
    .split(/\n\s*\n/)
    .map(block => {
      block = block.trim();
      if (!block) return '';
      if (/^<(h[1-6]|ul|ol|blockquote|pre)/i.test(block)) {
        return block;
      }
      return `<p>${block.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('\n');

  return html;
}

export const ArtifactViewer = ({ content }: { content: string }) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);

  // Compute live Ship 30 scorecard metrics
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 225));
  const hasHook = /hook/i.test(content) || /^\*\*[^*]+\*\*/m.test(content);
  const hasHeadings = /^#{1,3}\s/m.test(content) || /<h[1-3]>/i.test(content);
  const hasTakeaway = /takeaway|conclusion|action/i.test(content);
  const hasCitations = /\[|§|sources/i.test(content);

  const parsedHtml = markdownToHtml(content);
  const sanitized = DOMPurify.sanitize(parsedHtml, { USE_PROFILES: { html: true } });

  const iframeSrc = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com data:; img-src data:;" />
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=Inter:wght@400;500;600&display=swap');
          body {
            font-family: 'Newsreader', Georgia, serif;
            color: #171717;
            line-height: 1.7;
            font-size: 16.5px;
            padding: 28px 24px;
            margin: 0;
            background-color: #F5F5F5;
          }
          h1, h2, h3 { 
            font-family: 'Inter', -apple-system, sans-serif;
            color: #0a0a0a; 
            letter-spacing: -0.02em;
            margin-top: 1.4em; 
            margin-bottom: 0.5em; 
          }
          h1 { font-size: 1.55rem; font-weight: 600; border-bottom: 1px solid #e0e0e0; padding-bottom: 12px; }
          h2 { font-size: 1.25rem; font-weight: 600; }
          h3 { font-size: 1.05rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.04em; color: #525252; }
          p { margin: 1em 0; }
          strong { font-family: 'Inter', sans-serif; font-weight: 600; color: #0a0a0a; }
          em { font-style: italic; color: #404040; }
          ul, ol { padding-left: 24px; margin: 1em 0; }
          li { margin-bottom: 6px; }
          blockquote { 
            border-left: 3px solid #262626; 
            padding-left: 16px; 
            margin: 1.4em 0; 
            color: #404040; 
            font-style: italic; 
          }
          pre, code { 
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace; 
            font-size: 0.85em; 
            background: #e5e5e5; 
            border-radius: 4px; 
          }
          pre { padding: 14px; overflow-x: auto; }
          code { padding: 2px 6px; color: #171717; font-weight: 600; }
          hr { border: 0; border-top: 1px solid #e0e0e0; margin: 2em 0; }
        </style>
      </head>
      <body>${sanitized}</body>
    </html>
  `;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const isHtml = /<[a-z][\s\S]*>/i.test(content);
    const extension = isHtml ? 'html' : 'md';
    const mimeType = isHtml ? 'text/html' : 'text/markdown';
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `artifact.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="artifact-viewer w-full h-full flex flex-col bg-surface-900 border border-neutral-800/80 rounded-xl overflow-hidden shadow-2xl">
      {/* 1. Live Ship 30 Quality Scorecard Header */}
      <div className="scorecard bg-neutral-900/95 border-b border-neutral-800 px-4 py-2 flex flex-wrap items-center justify-between text-[11px] text-neutral-300 gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-neutral-400">Words:</span>
            <span className={`font-semibold ${wordCount >= 100 ? 'text-[#F5F5F5]' : 'text-neutral-400'}`}>
              {wordCount.toLocaleString()}
            </span>
          </div>
          <span className="text-neutral-700">|</span>
          <div className="flex items-center gap-1 text-neutral-400 font-mono">
            <span>⏱</span> {readingTimeMin} min read
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px]">
          <span className={`px-1.5 py-0.5 rounded ${hasHook ? 'bg-neutral-800 text-[#F5F5F5]' : 'text-neutral-600'}`}>
            {hasHook ? '✓ Hook' : '○ Hook'}
          </span>
          <span className={`px-1.5 py-0.5 rounded ${hasHeadings ? 'bg-neutral-800 text-[#F5F5F5]' : 'text-neutral-600'}`}>
            {hasHeadings ? '✓ Structure' : '○ Structure'}
          </span>
          <span className={`px-1.5 py-0.5 rounded ${hasTakeaway ? 'bg-neutral-800 text-[#F5F5F5]' : 'text-neutral-600'}`}>
            {hasTakeaway ? '✓ Takeaway' : '○ Takeaway'}
          </span>
          <span className={`px-1.5 py-0.5 rounded ${hasCitations ? 'bg-neutral-800 text-[#F5F5F5]' : 'text-neutral-600'}`}>
            {hasCitations ? '✓ Grounded' : '○ Grounded'}
          </span>
        </div>
      </div>

      {/* 2. Tab and Export Controls */}
      <div className="tabs bg-surface-950/90 px-4 py-2 border-b border-neutral-800/80 flex items-center justify-between backdrop-blur">
        <div className="flex gap-1.5 p-0.5 bg-neutral-900 rounded-lg border border-neutral-800">
          <button
            onClick={() => setActiveTab('preview')}
            className={`preview-tab text-xs font-medium px-3 py-1 rounded-md transition-all ${
              activeTab === 'preview'
                ? 'bg-[#F5F5F5] text-black font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-[#F5F5F5] hover:bg-neutral-800/60'
            }`}
          >
            Preview
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`code-tab text-xs font-medium px-3 py-1 rounded-md transition-all ${
              activeTab === 'code'
                ? 'bg-[#F5F5F5] text-black font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-[#F5F5F5] hover:bg-neutral-800/60'
            }`}
          >
            Code
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="text-xs text-neutral-400 hover:text-[#F5F5F5] bg-neutral-900 hover:bg-neutral-850 px-2.5 py-1 rounded-md border border-neutral-800 transition"
            title="Copy to clipboard"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={handleDownload}
            className="text-xs text-neutral-400 hover:text-[#F5F5F5] bg-neutral-900 hover:bg-neutral-850 px-2.5 py-1 rounded-md border border-neutral-800 transition"
            title="Download file"
          >
            Export
          </button>
        </div>
      </div>

      {/* 3. Rendered Content */}
      <div className="flex-1 overflow-hidden relative bg-[#F5F5F5]">
        {activeTab === 'preview' ? (
          <iframe
            title="artifact-sandbox"
            srcDoc={iframeSrc}
            sandbox="allow-scripts"
            className="w-full h-full border-0"
          />
        ) : (
          <div className="w-full h-full overflow-auto bg-surface-950 p-5 text-xs font-mono text-neutral-300 whitespace-pre-wrap select-all leading-relaxed">
            {content}
          </div>
        )}
      </div>
    </div>
  );
};
