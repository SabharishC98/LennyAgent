import React, { useState, useEffect, useRef } from 'react';
import { ArtifactViewer } from './components/ArtifactViewer';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface Session {
  id: string;
  title: string;
}

function App() {
  const [sessions, setSessions] = useState<Session[]>([{ id: 'default', title: 'Welcome Session' }]);
  const [currentSessionId, setCurrentSessionId] = useState('default');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Welcome! Ask a growth or PM question from Lenny’s Podcast, or ask me to write a Ship 30 essay.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({ provider: 'groq', model: 'llama-3.3-70b-versatile' });
  const [artifactContent, setArtifactContent] = useState<string | null>(null);
  const [selectedCitation, setSelectedCitation] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => setConfig({ provider: data.provider || 'groq', model: data.model || 'llama-3' }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleNewChat = () => {
    const newId = `session-${Date.now()}`;
    const newSession = { id: newId, title: `Chat ${sessions.length + 1}` };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newId);
    setMessages([
      {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: 'New chat started. What topic or guest would you like to explore?'
      }
    ]);
    setArtifactContent(null);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = input.trim();
    if (!query || loading) return;

    const userMsg: Message = { id: `user-${Date.now()}`, role: 'user', content: query };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`/api/sessions/${currentSessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query })
      });

      if (!res.body) {
        setMessages(prev => [...prev, { id: `err-${Date.now()}`, role: 'assistant', content: 'No response stream available.' }]);
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';
      const assistantMsgId = `assistant-${Date.now()}`;

      setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const textChunk = decoder.decode(value, { stream: true });
        const lines = textChunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const rawData = line.replace(/^data:\s*/, '').trim();
            if (rawData === '[DONE]') continue;

            try {
              const payload = JSON.parse(rawData);
              if (payload.text) {
                assistantText += payload.text;
                setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: assistantText } : m));
              }
              if (payload.artifact) {
                setArtifactContent(payload.artifact);
              }
            } catch {
              if (rawData && rawData !== '[DONE]') {
                assistantText += rawData;
                setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: assistantText } : m));
              }
            }
          }
        }
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        { id: `err-${Date.now()}`, role: 'assistant', content: `Error communicating with server: ${err?.message || err}` }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col md:flex-row h-screen overflow-hidden">
      {/* 1. Left Sidebar: Sessions */}
      <div className="session-list w-full md:w-64 border-r border-gray-800 p-4 flex flex-col bg-gray-900">
        <button
          onClick={handleNewChat}
          className="new-chat bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg mb-4 flex items-center justify-center gap-2 transition"
          aria-label="New Chat"
        >
          <span>+</span> New Chat
        </button>

        <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Sessions</div>
        <div className="overflow-y-auto flex-1 space-y-1">
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => setCurrentSessionId(s.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm truncate block transition ${
                s.id === currentSessionId ? 'bg-gray-800 text-blue-400 font-medium' : 'text-gray-400 hover:bg-gray-800/50'
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Middle Panel: Chat Stream */}
      <div className="chat-center flex-1 flex flex-col relative bg-gray-950 border-r border-gray-800">
        {/* Header Badge */}
        <header className="border-b border-gray-800 px-6 py-3 flex items-center justify-between bg-gray-900/60 backdrop-blur">
          <div className="font-semibold text-gray-200">Lenny Growth Assistant</div>
          <div className="badge bg-gray-800 border border-gray-700 px-3 py-1 rounded-full text-xs text-gray-300">
            {config.provider} / {config.model}
          </div>
        </header>

        {/* Message Stream */}
        <div className="messages flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map(m => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-2xl p-4 rounded-xl text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-gray-900 border border-gray-800 text-gray-200 rounded-bl-none shadow-sm'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content || (loading && m.role === 'assistant' ? 'Thinking...' : '')}</div>
                {m.content.includes('[Guest - Episode') && (
                  <button
                    onClick={() => setSelectedCitation("Episode metadata retrieved from indexed podcast corpus.")}
                    className="mt-2 text-xs text-blue-400 hover:underline block"
                  >
                    View Citation Details
                  </button>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Citation Drawer if selected */}
        {selectedCitation && (
          <div className="bg-gray-900 border-t border-blue-500/30 p-3 flex items-center justify-between text-xs text-gray-300">
            <span>{selectedCitation}</span>
            <button onClick={() => setSelectedCitation(null)} className="text-gray-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-800 bg-gray-900/50 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about retention, PMF, growth loops, or write an essay..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition"
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>

      {/* 3. Right Panel: Artifact Viewer */}
      <div className="artifact-panel w-full md:w-96 p-4 bg-gray-900/80 flex flex-col">
        <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">Artifact Viewer</h2>
        <div className="flex-1 overflow-hidden">
          <ArtifactViewer content={artifactContent || "<h2>No Artifact Yet</h2><p>Ask the assistant to write an essay or draft content to display an artifact preview here.</p>"} />
        </div>
      </div>
    </div>
  );
}

export default App;
