import { useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCreateViptiSpeech, useSendViptiChat } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Bell, BookOpen, Check, ChevronDown, Headphones, History, Keyboard, Menu,
  MessageCircle, Mic, MicOff, Moon, MoreHorizontal, Plus, Send, Settings2,
  Sparkles, Volume2, X, Zap,
} from 'lucide-react';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

type Message = { id: number; role: 'user' | 'vipti'; text: string; time: string };
type ViptiMemory = { content: string };
type RecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type RecognitionConstructor = new () => RecognitionLike;

const starterMessage: Message = {
  id: 1,
  role: 'vipti',
  text: 'Namaste! Main Vipti hoon. Jo bhi mind mein chal raha hai, seedha bol do — main dhyaan se sunungi.',
  time: 'Just now',
};

const history = [
  { title: 'The Sunday evening spiral', date: 'Yesterday', tone: 'coral' },
  { title: 'A gentler way to plan', date: 'Mon, Jun 17', tone: 'mint' },
  { title: 'Should I send the message?', date: 'Sun, Jun 16', tone: 'gold' },
  { title: 'Small question, big feeling', date: 'Thu, Jun 13', tone: 'lavender' },
];

const MEMORY_STORAGE_KEY = 'vipti-approved-memory';

function readStoredMemory(): ViptiMemory[] {
  try {
    const stored = localStorage.getItem(MEMORY_STORAGE_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ViptiMemory => (
      typeof item === 'object' &&
      item !== null &&
      'content' in item &&
      typeof item.content === 'string' &&
      item.content.trim().length >= 3
    )).slice(0, 12);
  } catch {
    return [];
  }
}

function extractApprovedMemory(text: string): ViptiMemory | null {
  const match = text.match(/(?:remember that|please remember|yaad rakhna|yaad rakho)\s*(?:that\s*)?(.+)/i);
  const content = match?.[1]?.trim().replace(/[.!?]+$/, '');
  if (!content || content.length < 3 || content.length > 160) return null;
  return { content };
}

function errorText(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: unknown }).data;
    if (typeof data === 'object' && data !== null && 'error' in data) {
      const message = (data as { error?: unknown }).error;
      if (typeof message === 'string') return message;
    }
  }
  return fallback;
}

function Logo({ small = false }: { small?: boolean }) {
  return <div className={`flex items-center gap-2.5 ${small ? 'scale-90 origin-left' : ''}`} data-testid="brand-vipti">
    <div className="relative flex h-9 w-9 items-center justify-center rounded-[13px] bg-primary text-primary-foreground shadow-sm">
      <span className="absolute h-4 w-4 rounded-full border-2 border-current" />
      <span className="absolute bottom-[7px] h-[5px] w-[5px] rounded-full bg-current" />
    </div>
    <span className="font-serif text-[25px] font-semibold tracking-[-0.04em]">vipti</span>
  </div>;
}

function Sidebar({ onNew, onSettings, collapsed, mobileOpen, onCollapse }: { onNew: () => void; onSettings: () => void; collapsed: boolean; mobileOpen: boolean; onCollapse: () => void }) {
  return <aside className={`${collapsed ? 'w-[78px]' : 'w-[272px]'} flex shrink-0 flex-col justify-between bg-sidebar px-4 py-5 text-sidebar-foreground transition-all duration-300 max-md:fixed max-md:z-30 max-md:h-full ${mobileOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'}`} data-testid="sidebar-navigation">
    <div>
      <div className="mb-8 flex items-center justify-between px-2">
        <Logo small={collapsed} />
        {!collapsed && <button className="rounded-lg p-2 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground" onClick={onCollapse} aria-label="Collapse sidebar"><ChevronDown className="h-4 w-4 rotate-90" /></button>}
      </div>
      <button onClick={onNew} className={`${collapsed ? 'justify-center px-0' : ''} mb-7 flex w-full items-center gap-2.5 rounded-xl bg-sidebar-primary px-4 py-3 text-sm font-semibold text-sidebar-primary-foreground shadow-[0_8px_20px_hsl(14_73%_52%_/_0.2)] transition hover:-translate-y-0.5`} data-testid="button-new-thought"><Plus className="h-[18px] w-[18px]" />{!collapsed && 'New thought'}</button>
      <nav className="space-y-1" aria-label="Main navigation">
        {[
          { icon: MessageCircle, label: 'Companion' },
          { icon: History, label: 'Past conversations' },
          { icon: BookOpen, label: 'Reflections' },
        ].map(({ icon: Icon, label }, index) => <button key={label} onClick={index === 0 ? onNew : undefined} className={`${index === 0 ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'} ${collapsed ? 'justify-center px-0' : ''} flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-[13px] transition`}><Icon className="h-[17px] w-[17px]" />{!collapsed && label}</button>)}
      </nav>
      {!collapsed && <div className="mt-9">
        <p className="mb-3 px-3.5 font-mono text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/40">This week</p>
        <div className="space-y-1.5">{history.slice(0, 3).map((item, i) => <button key={item.title} className="group flex w-full items-start gap-3 rounded-xl px-3.5 py-2.5 text-left hover:bg-sidebar-accent/60"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.tone === 'coral' ? 'bg-primary' : item.tone === 'mint' ? 'bg-[#78c8a5]' : 'bg-secondary'}`} /><span className="min-w-0"><span className="block truncate text-[12px] text-sidebar-foreground/80">{item.title}</span><span className="mt-0.5 block truncate text-[11px] text-sidebar-foreground/35">{item.date}</span></span></button>)}</div>
      </div>}
    </div>
    <div className="space-y-1">
      {!collapsed && <div className="mb-4 rounded-2xl border border-sidebar-border bg-sidebar-accent/45 p-3.5"><div className="mb-2 flex items-center gap-2 text-secondary"><Zap className="h-3.5 w-3.5 fill-current" /><span className="font-mono text-[10px] uppercase tracking-[.12em]">AI voice room</span></div><p className="text-[11px] leading-relaxed text-sidebar-foreground/55">Real replies, Hindi/Hinglish by default. Your API key stays server-side.</p></div>}
      <button onClick={onSettings} className={`${collapsed ? 'justify-center px-0' : ''} flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-[13px] text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground`} data-testid="button-settings"><Settings2 className="h-[17px] w-[17px]" />{!collapsed && 'Settings & accessibility'}</button>
      <div className={`${collapsed ? 'justify-center' : ''} mt-1 flex items-center gap-3 border-t border-sidebar-border px-3.5 pt-4`}><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8bc76] font-serif text-sm text-sidebar">M</div>{!collapsed && <div><p className="text-xs font-medium">Maya</p><p className="font-mono text-[9px] uppercase tracking-[.13em] text-sidebar-foreground/35">Private room</p></div>}</div>
    </div>
  </aside>;
}

function Composer({ onSend, onVoice, disabled, listening }: { onSend: (text: string) => void; onVoice: () => void; disabled: boolean; listening: boolean }) {
  const [value, setValue] = useState('');
  const submit = () => { if (value.trim() && !disabled) { onSend(value.trim()); setValue(''); } };
  return <div className="relative rounded-[22px] border border-border bg-card p-2 shadow-[0_12px_28px_hsl(280_28%_19%_/_0.06)] focus-within:border-primary/50 focus-within:shadow-[0_14px_32px_hsl(14_73%_52%_/_0.1)]">
    <textarea value={value} onChange={e => setValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }} placeholder={listening ? 'Listening…' : 'Apne mind mein kya chal raha hai?'} rows={2} disabled={disabled} className="w-full resize-none bg-transparent px-3 py-2.5 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground/65 disabled:opacity-60" data-testid="input-thought" />
    <div className="flex items-center justify-between border-t border-border/70 px-2 pt-2">
      <div className="flex items-center gap-1"><button className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Keyboard shortcuts"><Keyboard className="h-4 w-4" /></button><span className="hidden font-mono text-[10px] text-muted-foreground/60 sm:block">Shift + Enter for a new line</span></div>
      <div className="flex items-center gap-1.5"><button onClick={onVoice} className={`rounded-xl p-2.5 ${listening ? 'bg-primary text-primary-foreground' : 'text-primary hover:bg-primary/10'}`} aria-label={listening ? 'Stop listening' : 'Start voice input'} data-testid="button-voice">{listening ? <MicOff className="h-[18px] w-[18px]" /> : <Mic className="h-[18px] w-[18px]" />}</button><button onClick={submit} disabled={!value.trim() || disabled} className="flex items-center gap-2 rounded-xl bg-foreground px-3.5 py-2.5 text-xs font-semibold text-background transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-30" data-testid="button-send">Send <Send className="h-3.5 w-3.5" /></button></div>
    </div>
  </div>;
}

function useBrowserVoice(onText: (text: string) => void, onError: (message: string) => void) {
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const [listening, setListening] = useState(false);
  const toggle = () => {
    if (listening) { recognitionRef.current?.stop(); return; }
    const recognitionType = (window as Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor }).SpeechRecognition
      ?? (window as Window & { webkitSpeechRecognition?: RecognitionConstructor }).webkitSpeechRecognition;
    if (!recognitionType) { onError('Microphone input is not supported in this browser. You can still type your message.'); return; }
    const recognition = new recognitionType();
    recognition.lang = 'hi-IN';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const result = event.results[0];
      if (result?.isFinal && result[0]?.transcript.trim()) onText(result[0].transcript.trim());
    };
    recognition.onerror = (event) => {
      setListening(false);
      onError(event.error === 'not-allowed' ? 'Microphone permission was blocked. Please allow microphone access or type your message.' : 'Vipti could not hear that. Please try again or type your message.');
    };
    recognition.onend = () => { setListening(false); recognitionRef.current = null; };
    recognitionRef.current = recognition;
    setListening(true);
    try { recognition.start(); } catch { setListening(false); onError('Vipti could not start the microphone. Please try again or type your message.'); }
  };
  useEffect(() => () => recognitionRef.current?.stop(), []);
  return { listening, toggle };
}

function MessageBubble({ message, onSpeak, speaking }: { message: Message; onSpeak: () => void; speaking: boolean }) {
  return <div className={`animate-rise flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`} data-testid={`message-${message.role}-${message.id}`}>
    {message.role === 'vipti' && <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Sparkles className="h-3.5 w-3.5" /></div>}
    <div className={`${message.role === 'user' ? 'max-w-[80%] rounded-[20px_20px_5px_20px] bg-foreground text-background' : 'max-w-[86%] rounded-[5px_20px_20px_20px] border border-border bg-card'} px-4 py-3.5`}>
      <p className="whitespace-pre-wrap text-[14px] leading-[1.65]">{message.text}</p>
      <div className="mt-2 flex items-center justify-between gap-4"><p className={`font-mono text-[9px] uppercase tracking-[.12em] ${message.role === 'user' ? 'text-background/45' : 'text-muted-foreground/60'}`}>{message.time}</p>{message.role === 'vipti' && <button onClick={onSpeak} disabled={speaking} className="flex items-center gap-1 text-[10px] text-primary hover:underline disabled:opacity-60" aria-label="Listen to Vipti reply">{speaking ? <span className="animate-pulse">Speaking…</span> : <><Volume2 className="h-3 w-3" /> सुनो</>}</button>}</div>
    </div>
  </div>;
}

function Companion({ onMenu, memory, onRememberMemory }: { onMenu: () => void; memory: ViptiMemory[]; onRememberMemory: (memory: ViptiMemory) => void }) {
  const [messages, setMessages] = useState<Message[]>([starterMessage]);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState('');
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chat = useSendViptiChat();
  const speech = useCreateViptiSpeech();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const voice = useBrowserVoice((text) => { void send(text); }, setError);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, typing, error]);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || typing) return;
    setError('');
    const userMessage: Message = { id: Date.now(), role: 'user', text: clean, time: 'Just now' };
    const context = messages.map(message => ({ role: message.role === 'vipti' ? 'assistant' as const : 'user' as const, content: message.text }));
    const approvedMemory = extractApprovedMemory(clean);
    if (approvedMemory) onRememberMemory(approvedMemory);
    setMessages(prev => [...prev, userMessage]);
    setTyping(true);
    try {
      const currentMemory = approvedMemory ? [...memory, approvedMemory] : memory;
      const result = await chat.mutateAsync({ data: { message: clean, history: context, memory: currentMemory.slice(-12) } });
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'vipti', text: result.reply, time: 'Just now' }]);
    } catch (requestError) {
      setError(errorText(requestError, 'Vipti AI is not connected right now. Add OPENAI_API_KEY on the server, then try again.'));
    } finally { setTyping(false); }
  }

  async function speak(message: Message) {
    setError('');
    setSpeakingId(message.id);
    try {
      const result = await speech.mutateAsync({ data: { text: message.text } });
      audioRef.current?.pause();
      const audio = new Audio(`data:${result.contentType};base64,${result.audioBase64}`);
      audioRef.current = audio;
      audio.onended = () => setSpeakingId(null);
      await audio.play();
    } catch (requestError) {
      setSpeakingId(null);
      setError(errorText(requestError, 'Vipti voice is not connected right now. You can still read her reply.'));
    }
  }

  return <main className="flex min-w-0 flex-1 flex-col">
    <header className="flex h-[76px] items-center justify-between border-b border-border/70 px-5 lg:px-10" data-testid="main-header"><div className="flex items-center gap-3"><button onClick={onMenu} className="rounded-lg p-2 text-muted-foreground hover:bg-muted md:hidden" aria-label="Open menu"><Menu className="h-5 w-5" /></button><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Tuesday, June 18</p><h1 className="font-serif text-[24px] leading-tight tracking-[-.02em]">A quiet place to land.</h1></div></div><div className="flex items-center gap-2"><div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-2 sm:flex"><span className="h-2 w-2 rounded-full bg-accent" /><span className="font-mono text-[10px] uppercase tracking-[.12em] text-muted-foreground">Hindi / Hinglish</span></div><button className="rounded-xl p-2.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Notifications"><Bell className="h-[17px] w-[17px]" /></button><button className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8bc76] font-serif text-sm text-sidebar" aria-label="Maya profile">M</button></div></header>
    <div className="mx-auto flex w-full max-w-[920px] flex-1 flex-col overflow-hidden px-5 py-8 lg:px-10"><div className="mb-6 flex items-center justify-between"><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary text-primary-foreground"><Sparkles className="h-4 w-4" /></div><div><p className="text-sm font-semibold">Vipti</p><p className="font-mono text-[9px] uppercase tracking-[.15em] text-muted-foreground">Sun rahi hoon</p></div></div><button className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-card hover:text-foreground"><MoreHorizontal className="h-4 w-4" /> More</button></div>
      <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto pb-5 pr-1">{messages.map(message => <MessageBubble key={message.id} message={message} speaking={speakingId === message.id} onSpeak={() => void speak(message)} />)}{typing && <div className="flex items-center gap-3 animate-rise"><div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Sparkles className="h-3.5 w-3.5" /></div><div className="rounded-[5px_20px_20px_20px] border border-border bg-card px-5 py-4"><div className="flex gap-1.5"><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-.3s]" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-.15s]" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" /></div></div></div>}{error && <div className="animate-rise rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm leading-relaxed text-destructive" role="alert"><strong className="mr-1">Connection issue:</strong>{error}</div>}</div>
      <div className="mt-4"><Composer onSend={send} onVoice={voice.toggle} disabled={typing} listening={voice.listening} /><p className="mt-3 text-center font-mono text-[9px] uppercase tracking-[.12em] text-muted-foreground/60">Vipti ek thinking partner hai — professional care ka replacement nahi.</p></div>
    </div>
  </main>;
}

function VoicePanel({ onClose }: { onClose: () => void }) {
  return <div className="fixed inset-0 z-40 flex items-center justify-center bg-sidebar/40 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" data-testid="voice-panel"><div className="relative w-full max-w-[520px] overflow-hidden rounded-[30px] bg-sidebar p-8 text-sidebar-foreground shadow-2xl sm:p-12"><button onClick={onClose} className="absolute right-5 top-5 rounded-xl p-2 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground" aria-label="Close voice panel"><X className="h-5 w-5" /></button><div className="mx-auto flex max-w-[310px] flex-col items-center text-center"><div className="relative mb-8 flex h-[142px] w-[142px] items-center justify-center rounded-full bg-[#e7b876] shadow-[0_20px_50px_hsl(14_73%_52%_/_0.22)]"><span className="pulse-ring absolute inset-0 rounded-full border border-primary/70" /><span className="absolute h-[76px] w-[76px] rounded-full border border-white/30" /><Mic className="relative h-8 w-8 text-white" /></div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-secondary">Browser microphone</p><h2 className="mt-3 font-serif text-4xl tracking-[-.03em]">Bol do, main sun rahi hoon.</h2><p className="mt-4 text-sm leading-relaxed text-sidebar-foreground/55">Tap the microphone in the message box to use Hindi speech recognition. Vipti will respond to the words the browser hears.</p><button onClick={onClose} className="mt-10 rounded-full border border-sidebar-border px-5 py-3 text-xs font-semibold text-sidebar-foreground/70 hover:bg-sidebar-accent">Close</button></div></div></div>;
}

function SettingsPanel({ onClose, memory, onClearMemory }: { onClose: () => void; memory: ViptiMemory[]; onClearMemory: () => void }) {
  const [dark, setDark] = useState(false);
  const [sound, setSound] = useState(true);
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); }, [dark]);
  return <div className="fixed inset-0 z-40 flex justify-end bg-sidebar/20 backdrop-blur-[2px]" role="dialog" aria-modal="true" data-testid="settings-panel"><div className="h-full w-full max-w-[440px] overflow-y-auto border-l border-border bg-background p-6 shadow-2xl sm:p-9"><div className="mb-10 flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.17em] text-muted-foreground">Your room</p><h2 className="mt-1 font-serif text-3xl">Settings</h2></div><button onClick={onClose} className="rounded-xl p-2.5 text-muted-foreground hover:bg-muted" aria-label="Close settings"><X className="h-5 w-5" /></button></div><div className="space-y-7"><section><h3 className="mb-3 font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">Experience</h3><div className="overflow-hidden rounded-2xl border border-border bg-card"><div className="flex items-center justify-between border-b border-border p-4"><span className="flex items-center gap-3"><Moon className="h-4 w-4 text-primary" /><span><span className="block text-sm font-medium">Night room</span><span className="block text-xs text-muted-foreground">A softer palette for late thoughts</span></span></span><button onClick={() => setDark(!dark)} className={`relative h-6 w-11 rounded-full transition ${dark ? 'bg-primary' : 'bg-muted'}`} aria-label="Toggle night room"><span className={`absolute top-1 h-4 w-4 rounded-full bg-card shadow-sm transition-transform ${dark ? 'translate-x-6' : 'translate-x-1'}`} /></button></div><div className="flex items-center justify-between p-4"><span className="flex items-center gap-3"><Volume2 className="h-4 w-4 text-accent" /><span><span className="block text-sm font-medium">Voice replies</span><span className="block text-xs text-muted-foreground">Use the listen button on Vipti's replies</span></span></span><button onClick={() => setSound(!sound)} className={`relative h-6 w-11 rounded-full transition ${sound ? 'bg-accent' : 'bg-muted'}`} aria-label="Toggle voice replies"><span className={`absolute top-1 h-4 w-4 rounded-full bg-card shadow-sm transition-transform ${sound ? 'translate-x-6' : 'translate-x-1'}`} /></button></div></div></section><section><h3 className="mb-3 font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">Accessibility</h3><div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4"><Headphones className="mt-0.5 h-4 w-4 text-primary" /><div><p className="text-sm font-medium">Voice & captions</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Microphone input depends on browser support and permission. Every AI reply is always shown as text.</p></div></div></section><section><h3 className="mb-3 font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">Memory</h3><div className="rounded-2xl border border-border bg-card p-4"><div className="mb-3 flex items-center justify-between"><div><p className="text-sm font-medium">Approved memories</p><p className="mt-1 text-xs text-muted-foreground">{memory.length ? `${memory.length} saved preference${memory.length === 1 ? '' : 's'}` : 'Nothing saved yet'}</p></div><button onClick={onClearMemory} disabled={!memory.length} className="rounded-lg border border-destructive/30 px-2.5 py-1.5 text-[11px] font-semibold text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40">Clear memory</button></div>{memory.length > 0 && <ul className="space-y-2 border-t border-border pt-3">{memory.map((item, index) => <li key={`${item.content}-${index}`} className="text-xs leading-relaxed text-foreground/70">“{item.content}”</li>)}</ul>}<p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">Vipti only saves a preference when you say “remember that…” or “yaad rakhna…”.</p></div></section><section><h3 className="mb-3 font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">AI connection</h3><div className="rounded-2xl bg-[#e9d7b4]/45 p-5"><div className="mb-3 flex items-center gap-2 text-primary"><Sparkles className="h-4 w-4" /><span className="text-sm font-semibold">Private by design</span></div><p className="text-sm leading-relaxed text-foreground/70">Vipti sends messages to the server, where OPENAI_API_KEY is read privately. The key is never included in frontend code. If the connection is unavailable, Vipti shows a clear error instead of a canned reply.</p></div></section></div></div></div>;
}

function Home() {
  const [voice, setVoice] = useState(false);
  const [settings, setSettings] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  const [memory, setMemory] = useState<ViptiMemory[]>(readStoredMemory);
  useEffect(() => { localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(memory.slice(-12))); }, [memory]);
  const rememberMemory = (item: ViptiMemory) => setMemory(previous => previous.some(saved => saved.content.toLowerCase() === item.content.toLowerCase()) ? previous : [...previous, item].slice(-12));
  const clearMemory = () => setMemory([]);
  return <div className="vipti-grain flex min-h-[100dvh] bg-background text-foreground"><Sidebar onNew={() => { setSessionKey(value => value + 1); setMobileOpen(false); }} onSettings={() => { setSettings(true); setMobileOpen(false); }} collapsed={collapsed} mobileOpen={mobileOpen} onCollapse={() => setCollapsed(!collapsed)} /><Companion key={sessionKey} onMenu={() => setMobileOpen(true)} memory={memory} onRememberMemory={rememberMemory} />{voice && <VoicePanel onClose={() => setVoice(false)} />}{settings && <SettingsPanel onClose={() => setSettings(false)} memory={memory} onClearMemory={clearMemory} />}</div>;
}

function Router() { return <ErrorBoundary resetKey={useLocation()[0]}><Switch><Route path="/" component={Home} /><Route component={NotFound} /></Switch></ErrorBoundary>; }
function NotFound() { return <div className="flex min-h-screen items-center justify-center bg-background p-6"><div className="text-center"><Logo /><h1 className="mt-10 font-serif text-4xl">This room is elsewhere.</h1><p className="mt-3 text-muted-foreground">That doorway does not lead anywhere yet.</p></div></div>; }
function App() { return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>; }
export default App;