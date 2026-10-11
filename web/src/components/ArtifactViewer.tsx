import React, { useState } from 'react';
import DOMPurify from 'dompurify';

export const ArtifactViewer = ({ content }: { content: string }) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);

  const sanitized = DOMPurify.sanitize(content, { USE_PROFILES: { html: true } });

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
            padding: 16px;
            margin: 0;
            background-color: #ffffff;
          }
          h1, h2, h3 { color: #111827; margin-top: 1.2em; margin-bottom: 0.6em; }
          h1 { font-size: 1.5rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
          h2 { font-size: 1.25rem; }
          p { margin: 0.8em 0; }
          strong { color: #000; }
          ul, ol { padding-left: 20px; }
          li { margin-bottom: 4px; }
          pre, code { background: #f3f4f6; border-radius: 4px; font-family: monospace; }
          pre { padding: 12px; overflow-x: auto; }
          code { padding: 2px 4px; }
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
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'artifact.html';
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
            title="Download as HTML"
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
