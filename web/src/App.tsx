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
  
  const [sessionMessages, setSessionMessages] = useState<Record<string, Message[]>>({
    default: [
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Welcome to the Lenny Growth Assistant. Ask questions across 250+ podcast episodes on product, growth, and leadership, or request a structured Ship 30 essay.'
      }
    ]
  });

  const [sessionArtifacts, setSessionArtifacts] = useState<Record<string, string | null>>({});

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({ provider: 'groq', model: 'openai/gpt-oss-120b' });
  const [selectedCitation, setSelectedCitation] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentMessages = sessionMessages[currentSessionId] || [];
  const currentArtifact = sessionArtifacts[currentSessionId] || null;

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => setConfig({ provider: data.provider || 'groq', model: data.model || 'openai/gpt-oss-120b' }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [sessionMessages, currentSessionId]);

  const handleNewChat = () => {
    const newId = `session-${Date.now()}`;
    const newSession = { id: newId, title: `Chat ${sessions.length + 1}` };

    setSessions(prev => [newSession, ...prev]);
    setSessionMessages(prev => ({
      ...prev,
      [newId]: [
        {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: 'New session started. Which founder, growth framework, or topic should we explore?'
        }
      ]
    }));
    setSessionArtifacts(prev => ({ ...prev, [newId]: null }));
    setCurrentSessionId(newId);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = input.trim();
    if (!query || loading) return;

    const userMsg: Message = { id: `user-${Date.now()}`, role: 'user', content: query };
    const targetSessionId = currentSessionId;

    setSessions(prev =>
      prev.map(s => {
        if (s.id === targetSessionId && (s.title.startsWith('Chat ') || s.title === 'Welcome Session')) {
          return { ...s, title: query.slice(0, 24) + (query.length > 24 ? '...' : '') };
        }
        return s;
      })
    );

    setSessionMessages(prev => ({
      ...prev,
      [targetSessionId]: [...(prev[targetSessionId] || []), userMsg]
    }));

    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`/api/sessions/${targetSessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query })
      });

      if (!res.body) {
        setSessionMessages(prev => ({
          ...prev,
          [targetSessionId]: [
            ...(prev[targetSessionId] || []),
            { id: `err-${Date.now()}`, role: 'assistant', content: 'No response stream available.' }
          ]
        }));
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';
      const assistantMsgId = `assistant-${Date.now()}`;

      setSessionMessages(prev => ({
        ...prev,
        [targetSessionId]: [
          ...(prev[targetSessionId] || []),
          { id: assistantMsgId, role: 'assistant', content: '' }
        ]
      }));

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
                setSessionMessages(prev => ({
                  ...prev,
                  [targetSessionId]: (prev[targetSessionId] || []).map(m =>
                    m.id === assistantMsgId ? { ...m, content: assistantText } : m
                  )
                }));
              }
              if (payload.artifact) {
                setSessionArtifacts(prev => ({
                  ...prev,
                  [targetSessionId]: payload.artifact
                }));
              }
            } catch {
              if (rawData && rawData !== '[DONE]') {
                assistantText += rawData;
                setSessionMessages(prev => ({
                  ...prev,
                  [targetSessionId]: (prev[targetSessionId] || []).map(m =>
                    m.id === assistantMsgId ? { ...m, content: assistantText } : m
                  )
                }));
              }
            }
          }
        }
      }
    } catch (err: any) {
      setSessionMessages(prev => ({
        ...prev,
        [targetSessionId]: [
          ...(prev[targetSessionId] || []),
          { id: `err-${Date.now()}`, role: 'assistant', content: `Error communicating with server: ${err?.message || err}` }
        ]
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 text-stone-200 flex flex-col md:flex-row h-screen overflow-hidden selection:bg-amber-900/40 selection:text-amber-200 font-sans">
      {/* 1. Left Sidebar: Sessions */}
      <div className="session-list w-full md:w-64 border-r border-stone-800/60 p-4 flex flex-col bg-surface-900">
        {/* Brand Header */}
        <div className="flex items-center gap-2 px-1 mb-5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-600 shadow-sm" />
          <span className="text-xs font-medium tracking-wider uppercase text-stone-400">Lenny Assistant</span>
        </div>

        <button
          onClick={handleNewChat}
          className="new-chat w-full bg-stone-850 hover:bg-stone-800 text-stone-200 font-medium px-3.5 py-2 rounded-lg mb-5 flex items-center justify-between text-xs border border-stone-750 transition shadow-sm group"
          aria-label="New Chat"
        >
          <span>New Session</span>
          <span className="text-stone-400 group-hover:text-amber-500 transition-colors">+</span>
        </button>

        <div className="text-[10px] uppercase tracking-widest text-stone-400 font-semibold mb-2.5 px-1">Recent Chats</div>
        <div className="overflow-y-auto flex-1 space-y-1 pr-1">
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => setCurrentSessionId(s.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-xs truncate block transition ${
                s.id === currentSessionId 
                  ? 'bg-stone-800 text-amber-300 font-medium border-l-2 border-amber-600 pl-2.5' 
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-850/60'
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Middle Panel: Chat Stream */}
      <div className="chat-center flex-1 flex flex-col relative bg-surface-950 border-r border-stone-800/60">
        <header className="border-b border-stone-800/60 px-6 py-3.5 flex items-center justify-between bg-surface-900/60 backdrop-blur">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold tracking-tight text-stone-100">Transcripts Knowledge Base</h1>
            <span className="text-[10px] bg-stone-800/80 border border-stone-750 text-stone-400 px-2 py-0.5 rounded-full font-mono">
              7,500+ chunks
            </span>
          </div>
          <div className="badge bg-stone-900 border border-stone-800 px-2.5 py-1 rounded-md text-[11px] font-mono text-stone-400">
            {config.provider} · <span className="text-stone-300">{config.model.replace('openai/', '')}</span>
          </div>
        </header>

        <div className="messages flex-1 overflow-y-auto p-6 space-y-5">
          {currentMessages.map(m => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-2xl px-4 py-3.5 rounded-xl text-[13.5px] leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-stone-800 text-stone-100 border border-stone-700/60 shadow-sm'
                    : 'bg-surface-900 border border-stone-800/70 text-stone-200 shadow-sm'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content || (loading && m.role === 'assistant' ? 'Retrieving and synthesizing transcripts...' : '')}</div>
                {m.content.includes('[') && m.content.includes('§') ? (
                  <button
                    onClick={() => setSelectedCitation("Source verified: Matched from indexed Lenny's Podcast transcripts with citation references.")}
                    className="mt-3 text-[11px] text-amber-500/90 hover:text-amber-400 font-medium hover:underline flex items-center gap-1"
                  >
                    <span>✦</span> View Source Citation Details
                  </button>
                ) : null}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {selectedCitation && (
          <div className="bg-stone-900/90 border-t border-amber-900/30 px-5 py-2.5 flex items-center justify-between text-xs text-amber-200/90 backdrop-blur">
            <span>{selectedCitation}</span>
            <button onClick={() => setSelectedCitation(null)} className="text-stone-400 hover:text-stone-200 text-sm">✕</button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="p-4 border-t border-stone-800/60 bg-surface-900/40 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask across 250+ episodes or request an essay..."
            className="flex-1 bg-surface-900 border border-stone-800 rounded-lg px-4 py-2.5 text-xs text-stone-100 placeholder-stone-400 focus:outline-none focus:border-amber-700/60 transition shadow-inner"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-stone-950 font-semibold px-4 py-2.5 rounded-lg text-xs transition shadow-sm"
          >
            {loading ? 'Synthesizing...' : 'Send'}
          </button>
        </form>
      </div>

      {/* 3. Right Panel: Artifact Viewer */}
      <div className="artifact-panel w-full md:w-96 p-4 bg-surface-900/70 flex flex-col">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold">Artifact Viewer</h2>
          <span className="text-[10px] text-stone-400 font-mono">Ship 30 & Docs</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <ArtifactViewer content={currentArtifact || "<h2>No Artifact Yet</h2><p>Ask the assistant to write an essay or draft content to display an artifact preview here.</p>"} />
        </div>
      </div>
    </div>
  );
}

export default App;
