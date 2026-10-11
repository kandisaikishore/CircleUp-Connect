import { FormEvent, useEffect, useRef, useState } from 'react';
import { Bot, Send, Sparkles, X, Minimize2, RotateCcw } from 'lucide-react';
import './ai.css';

type ChatMessage = { role: 'user' | 'assistant'; content: string };
const API_URL = (import.meta.env.VITE_API_URL || 'https://circleup-connect-api.onrender.com').replace(/\/$/, '');
const starters = ['Help me write a post', 'Suggest communities for AI learners', 'Explain a React concept'];

export default function AICompanion() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hi! I’m CircleUp AI. I can help polish a post, brainstorm a project, explain a technical concept, or help you find your community. What’s on your mind?' }
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, open, loading]);

  async function sendMessage(event?: FormEvent, suggested?: string) {
    event?.preventDefault();
    const text = (suggested ?? input).trim();
    if (!text || loading) return;
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setInput('');
    setError('');
    setLoading(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch(API_URL + '/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: next.slice(-8, -1) }),
        signal: controller.signal
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'AI could not respond. Please try again.');
      setMessages(current => [...current, { role: 'assistant', content: String(payload.answer || 'I could not generate a response.') }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reach CircleUp AI.');
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }

  return <div className="circleup-ai-root">
    {open && <section className="circleup-ai-panel" aria-label="CircleUp AI assistant">
      <header className="circleup-ai-header">
        <div className="circleup-ai-avatar"><Sparkles size={20} /></div>
        <div className="circleup-ai-heading"><strong>CircleUp AI</strong><span>Community copilot · LLM</span></div>
        <button className="circleup-ai-head-button" aria-label="Minimize assistant" onClick={() => setOpen(false)}><Minimize2 size={17} /></button>
        <button className="circleup-ai-head-button" aria-label="Clear conversation" onClick={() => { setMessages([{ role: 'assistant', content: 'Fresh start! What can I help you with?' }]); setError(''); }}><RotateCcw size={16} /></button>
      </header>
      <div className="circleup-ai-messages" aria-live="polite">
        {messages.map((m, i) => <div className={'circleup-ai-message ' + m.role} key={i}>
          {m.role === 'assistant' && <span className="circleup-ai-message-icon"><Bot size={14}/></span>}
          <p>{m.content}</p>
        </div>)}
        {messages.length === 1 && !loading && <div className="circleup-ai-starters">{starters.map(s => <button key={s} onClick={() => void sendMessage(undefined, s)}>{s}</button>)}</div>}
        {loading && <div className="circleup-ai-typing" role="status"><span/><span/><span/> Thinking…</div>}
        {error && <div className="circleup-ai-error" role="alert">{error}</div>}
        <div ref={bottomRef}/>
      </div>
      <form className="circleup-ai-form" onSubmit={e => void sendMessage(e)}>
        <label className="circleup-ai-input-wrap"><span className="sr-only">Message CircleUp AI</span><textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }} placeholder="Ask CircleUp AI…" rows={1} maxLength={4000} /></label>
        <button type="submit" disabled={loading || !input.trim()} aria-label="Send message"><Send size={17}/></button>
      </form>
      <p className="circleup-ai-disclaimer">AI can make mistakes. Don’t share passwords or private information.</p>
    </section>}
    <button className="circleup-ai-launcher" aria-label={open ? 'Close CircleUp AI' : 'Open CircleUp AI'} aria-expanded={open} onClick={() => setOpen(v => !v)}>
      {open ? <X size={23}/> : <><Sparkles size={21}/><span>Ask AI</span></>}
    </button>
  </div>;
}
