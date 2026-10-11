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

  const parsedHtml = markdownToHtml(content);
  const sanitized = DOMPurify.sanitize(parsedHtml, { USE_PROFILES: { html: true } });

  // Minimalist warm-editorial typography
  const iframeSrc = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:;" />
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=Inter:wght@400;500;600&display=swap');
          body {
            font-family: 'Newsreader', Georgia, serif;
            color: #262422;
            line-height: 1.7;
            font-size: 17px;
            padding: 32px 28px;
            margin: 0;
            background-color: #fbf9f5;
          }
          h1, h2, h3 { 
            font-family: 'Inter', -apple-system, sans-serif;
            color: #161514; 
            letter-spacing: -0.02em;
            margin-top: 1.4em; 
            margin-bottom: 0.5em; 
          }
          h1 { font-size: 1.55rem; font-weight: 600; border-bottom: 1px solid #e7ded2; padding-bottom: 12px; }
          h2 { font-size: 1.25rem; font-weight: 600; }
          h3 { font-size: 1.05rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.04em; color: #78716c; }
          p { margin: 1em 0; }
          strong { font-family: 'Inter', sans-serif; font-weight: 600; color: #161514; }
          em { font-style: italic; color: #44403c; }
          ul, ol { padding-left: 24px; margin: 1em 0; }
          li { margin-bottom: 6px; }
          blockquote { 
            border-left: 2px solid #d97706; 
            padding-left: 16px; 
            margin: 1.4em 0; 
            color: #57534e; 
            font-style: italic; 
          }
          pre, code { 
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace; 
            font-size: 0.85em; 
            background: #ede8df; 
            border-radius: 4px; 
          }
          pre { padding: 14px; overflow-x: auto; }
          code { padding: 2px 6px; color: #b45309; }
          hr { border: 0; border-top: 1px solid #e7ded2; margin: 2em 0; }
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
    <div className="artifact-viewer w-full h-full flex flex-col bg-surface-900 border border-stone-800/60 rounded-xl overflow-hidden shadow-2xl">
      {/* Tab controls */}
      <div className="tabs bg-surface-950/90 px-4 py-2.5 border-b border-stone-800/60 flex items-center justify-between backdrop-blur">
        <div className="flex gap-1.5 p-0.5 bg-stone-900/80 rounded-lg border border-stone-800/50">
          <button
            onClick={() => setActiveTab('preview')}
            className={`preview-tab text-xs font-medium px-3 py-1 rounded-md transition-all ${
              activeTab === 'preview'
                ? 'bg-stone-800 text-stone-100 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
            }`}
          >
            Preview
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`code-tab text-xs font-medium px-3 py-1 rounded-md transition-all ${
              activeTab === 'code'
                ? 'bg-stone-800 text-stone-100 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
            }`}
          >
            Code
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="text-xs text-stone-400 hover:text-stone-200 bg-stone-900 hover:bg-stone-850 px-2.5 py-1 rounded-md border border-stone-800/70 transition"
            title="Copy to clipboard"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={handleDownload}
            className="text-xs text-stone-400 hover:text-stone-200 bg-stone-900 hover:bg-stone-850 px-2.5 py-1 rounded-md border border-stone-800/70 transition"
            title="Download file"
          >
            Download
          </button>
        </div>
      </div>

      {/* Content panel */}
      <div className="flex-1 overflow-hidden relative bg-[#fbf9f5]">
        {activeTab === 'preview' ? (
          <iframe
            title="artifact-sandbox"
            srcDoc={iframeSrc}
            sandbox="allow-scripts"
            className="w-full h-full border-0"
          />
        ) : (
          <div className="w-full h-full overflow-auto bg-surface-950 p-5 text-xs font-mono text-stone-300 whitespace-pre-wrap select-all leading-relaxed">
            {content}
          </div>
        )}
      </div>
    </div>
  );
};
