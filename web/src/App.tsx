import React, { useState } from 'react';
import { ArtifactViewer } from './components/ArtifactViewer';

function App() {
  const [sessionInfo] = useState({ provider: 'groq', model: 'llama-3' });
  const [isOllamaDown, setIsOllamaDown] = useState(false);
  const sampleArtifact = "<h1>Hello Artifact</h1>";
  
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col md:flex-row">
      <div className="session-list w-full md:w-1/4 border-r border-gray-800 p-4">
         <button className="new-chat bg-blue-600 px-4 py-2 rounded mb-4" aria-label="New Chat">New Chat</button>
      </div>
      
      <div className="chat-center w-full md:w-2/4 p-4 flex flex-col relative">
         <div className="badge absolute top-2 right-2 bg-gray-800 px-2 py-1 rounded text-xs">
            {sessionInfo.provider} / {sessionInfo.model}
         </div>
         {isOllamaDown && <div className="fallback-banner bg-red-800 text-white p-2 text-sm text-center mb-2">Ollama is down or unreachable. Grounded search may fail.</div>}
         <div className="messages flex-grow">
            <div className="message user-message bg-gray-800 p-3 rounded mb-2">Write an essay</div>
         </div>
      </div>
      
      <div className="artifact-panel w-full md:w-1/4 p-4">
         <ArtifactViewer content={sampleArtifact} />
      </div>
    </div>
  );
}

export default App;
