import React from 'react';
import DOMPurify from 'dompurify';

export const ArtifactViewer = ({ content }: { content: string }) => {
  const sanitized = DOMPurify.sanitize(content, { USE_PROFILES: { html: true } });
  
  const iframeSrc = "<html><head><meta http-equiv='Content-Security-Policy' content='default-src \"none\"; style-src \"unsafe-inline\"; img-src data:;' /></head><body>" + sanitized + "</body></html>";

  return (
    <div className="artifact-viewer w-full h-full p-4 border border-gray-700">
      <div className="tabs mb-2 flex gap-2">
         <button className="preview-tab bg-blue-600 px-2 py-1 rounded">Preview</button>
         <button className="code-tab bg-gray-600 px-2 py-1 rounded">Code</button>
      </div>
      <iframe 
         title="artifact-sandbox"
         srcDoc={iframeSrc}
         sandbox="allow-scripts" 
         className="w-full h-96 bg-white"
      />
    </div>
  );
};
