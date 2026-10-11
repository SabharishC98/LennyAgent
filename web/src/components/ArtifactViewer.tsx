import React, { useState } from 'react';
import DOMPurify from 'dompurify';

// Converts common Markdown syntax into clean HTML
function markdownToHtml(md: string): string {
  // If it already contains HTML tags, return directly
  if (/<[a-z][\s\S]*>/i.test(md)) {
    return md;
  }

  let html = md
    // Escape HTML special chars
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headings
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold and italics
    .replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    // Blockquotes
    .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
    // Inline code
    .replace(/`([^`]+)`/gim, '<code>$1</code>')
    // Bullet lists
    .replace(/^\s*[-*]\s+(.*$)/gim, '<li>$1</li>');

  // Wrap lists in <ul>
  html = html.replace(/(<li>[\s\S]*?<\/li>)/gim, '<ul>$1</ul>');

  // Paragraphs for remaining text blocks
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

  // 1. Transform markdown to HTML if markdown is detected
  const parsedHtml = markdownToHtml(content);

  // 2. Sanitize through DOMPurify for strict defense-in-depth security
  const sanitized = DOMPurify.sanitize(parsedHtml, { USE_PROFILES: { html: true } });

  const iframeSrc = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:;" />
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1f2937;
            line-height: 1.6;
            padding: 20px;
            margin: 0;
            background-color: #ffffff;
          }
          h1, h2, h3 { color: #111827; margin-top: 1.2em; margin-bottom: 0.6em; }
          h1 { font-size: 1.5rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
          h2 { font-size: 1.25rem; }
          h3 { font-size: 1.1rem; }
          p { margin: 0.8em 0; }
          strong { color: #111827; }
          em { color: #374151; }
          ul, ol { padding-left: 24px; margin: 0.8em 0; }
          li { margin-bottom: 4px; }
          blockquote { border-left: 3px solid #3b82f6; padding-left: 12px; margin-left: 0; color: #4b5563; font-style: italic; }
          pre, code { background: #f3f4f6; border-radius: 4px; font-family: monospace; }
          pre { padding: 12px; overflow-x: auto; }
          code { padding: 2px 4px; color: #dc2626; }
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
    <div className="artifact-viewer w-full h-full flex flex-col bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-lg">
      {/* Tab controls */}
      <div className="tabs bg-gray-950 px-4 py-2 border-b border-gray-800 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('preview')}
            className={`preview-tab text-xs font-medium px-3 py-1.5 rounded-md transition ${
              activeTab === 'preview'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            Preview
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`code-tab text-xs font-medium px-3 py-1.5 rounded-md transition ${
              activeTab === 'code'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            Code
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-2.5 py-1 rounded border border-gray-700 transition"
            title="Copy to clipboard"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={handleDownload}
            className="text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-2.5 py-1 rounded border border-gray-700 transition"
            title="Download file"
          >
            Download
          </button>
        </div>
      </div>

      {/* Content panel */}
      <div className="flex-1 overflow-hidden relative bg-white">
        {activeTab === 'preview' ? (
          <iframe
            title="artifact-sandbox"
            srcDoc={iframeSrc}
            sandbox="allow-scripts"
            className="w-full h-full border-0"
          />
        ) : (
          <div className="w-full h-full overflow-auto bg-gray-950 p-4 text-xs font-mono text-gray-200 whitespace-pre-wrap select-all">
            {content}
          </div>
        )}
      </div>
    </div>
  );
};
