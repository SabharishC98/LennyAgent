import React, { useState } from 'react';
import { ArtifactViewer } from './components/ArtifactViewer';

function App() {
  const [sessionInfo] = useState({ provider: 'groq', model: 'llama-3' });
  const sampleArtifact = "<h1>Hello Artifact</h1><script>alert('xss')</script>";
  
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col md:flex-row">
      <div className="session-list w-full md:w-1/4 border-r border-gray-800 p-4">
         <button className="new-chat bg-blue-600 px-4 py-2 rounded mb-4" aria-label="New Chat">New Chat</button>
         <div className="history text-gray-400">Previous sessions...</div>
      </div>
      
      <div className="chat-center w-full md:w-2/4 p-4 flex flex-col relative">
         <div className="badge absolute top-2 right-2 bg-gray-800 px-2 py-1 rounded text-xs">
            {sessionInfo.provider} / {sessionInfo.model}
         </div>
         <div className="messages flex-grow">
            <div className="message user-message bg-gray-800 p-3 rounded mb-2">Write an essay</div>
            <div className="message assistant-message bg-gray-900 p-3 rounded mb-2 border border-gray-700">
               <span className="citation cursor-pointer text-blue-400 underline">Citation [1]</span>
            </div>
         </div>
         <div className="fallback-banner hidden">Ollama down banner</div>
      </div>
      
      <div className="artifact-panel w-full md:w-1/4 p-4">
         <ArtifactViewer content={sampleArtifact} />
      </div>
    </div>
  );
}

export default App;
