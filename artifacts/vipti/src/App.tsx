import { useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Bell, BookOpen, Check, ChevronDown, Headphones, History, Keyboard, Menu, MessageCircle, Mic, Moon, MoreHorizontal, Plus, Send, Settings2, Sparkles, Volume2, X, Zap } from 'lucide-react';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

type Message = { id: number; role: 'user' | 'vipti'; text: string; time: string };

const initialMessages: Message[] = [
  { id: 1, role: 'user', text: 'I have a big presentation tomorrow and I keep rehearsing the opening in my head.', time: '10:41 AM' },
  { id: 2, role: 'vipti', text: 'That sounds like your brain is trying to keep you safe by staying one step ahead. What part of the opening feels most uncertain?', time: '10:41 AM' },
  { id: 3, role: 'user', text: 'The first thirty seconds. Once I get going, I know the material.', time: '10:42 AM' },
  { id: 4, role: 'vipti', text: 'Let’s make those thirty seconds a small, familiar bridge rather than a performance. You could begin with one true sentence about why this matters to the room. No polish needed yet.', time: '10:42 AM' },
];

const history = [
  { title: 'The Sunday evening spiral', detail: 'You were carrying more than you named.', date: 'Yesterday', tone: 'coral' },
  { title: 'A gentler way to plan', detail: 'Three things are enough for today.', date: 'Mon, Jun 17', tone: 'mint' },
  { title: 'Should I send the message?', detail: 'You already know what you want them to hear.', date: 'Sun, Jun 16', tone: 'gold' },
  { title: 'Small question, big feeling', detail: 'A note on making room for uncertainty.', date: 'Thu, Jun 13', tone: 'lavender' },
];

function Logo({ small = false }: { small?: boolean }) {
  return <div className={`flex items-center gap-2.5 ${small ? 'scale-90 origin-left' : ''}`} data-testid="brand-vipti">
    <div className="relative flex h-9 w-9 items-center justify-center rounded-[13px] bg-primary text-primary-foreground shadow-sm">
      <span className="absolute h-4 w-4 rounded-full border-2 border-current" />
      <span className="absolute bottom-[7px] h-[5px] w-[5px] rounded-full bg-current" />
    </div>
    <span className="font-serif text-[25px] font-semibold tracking-[-0.04em]">vipti</span>
  </div>;
}

function Sidebar({ active, onNew, onSettings, collapsed, onCollapse }: { active: string; onNew: () => void; onSettings: () => void; collapsed: boolean; onCollapse: () => void }) {
  return <aside className={`${collapsed ? 'w-[78px]' : 'w-[272px]'} flex shrink-0 flex-col justify-between bg-sidebar px-4 py-5 text-sidebar-foreground transition-all duration-300 max-md:fixed max-md:z-30 max-md:h-full ${collapsed ? 'max-md:-translate-x-full' : 'max-md:translate-x-0'}`} data-testid="sidebar-navigation">
    <div>
      <div className="mb-8 flex items-center justify-between px-2">
        <Logo small={collapsed} />
        {!collapsed && <button className="rounded-lg p-2 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground" onClick={onCollapse} aria-label="Collapse sidebar" data-testid="button-collapse-sidebar"><ChevronDown className="h-4 w-4 rotate-90" /></button>}
      </div>
      <button onClick={onNew} className={`${collapsed ? 'justify-center px-0' : ''} mb-7 flex w-full items-center gap-2.5 rounded-xl bg-sidebar-primary px-4 py-3 text-sm font-semibold text-sidebar-primary-foreground shadow-[0_8px_20px_hsl(14_73%_52%_/_0.2)] transition hover:-translate-y-0.5`} data-testid="button-new-thought"><Plus className="h-[18px] w-[18px]" />{!collapsed && 'New thought'}</button>
      <nav className="space-y-1" aria-label="Main navigation">
        {[
          { icon: MessageCircle, label: 'Companion', id: 'companion' },
          { icon: History, label: 'Past conversations', id: 'history' },
          { icon: BookOpen, label: 'Reflections', id: 'reflections' },
        ].map(({ icon: Icon, label, id }) => <button key={id} onClick={() => id === 'companion' ? onNew() : undefined} className={`${active === id ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'} ${collapsed ? 'justify-center px-0' : ''} flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-[13px] transition`} data-testid={`nav-${id}`}><Icon className="h-[17px] w-[17px]" />{!collapsed && label}</button>)}
      </nav>
      {!collapsed && <div className="mt-9">
        <p className="mb-3 px-3.5 font-mono text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/40">This week</p>
        <div className="space-y-1.5">{history.slice(0, 3).map((item, i) => <button key={item.title} className="group flex w-full items-start gap-3 rounded-xl px-3.5 py-2.5 text-left hover:bg-sidebar-accent/60" data-testid={`history-item-${i}`}><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.tone === 'coral' ? 'bg-primary' : item.tone === 'mint' ? 'bg-[#78c8a5]' : 'bg-secondary'}`} /><span className="min-w-0"><span className="block truncate text-[12px] text-sidebar-foreground/80">{item.title}</span><span className="mt-0.5 block truncate text-[11px] text-sidebar-foreground/35">{item.date}</span></span></button>)}</div>
      </div>}
    </div>
    <div className="space-y-1">
      {!collapsed && <div className="mb-4 rounded-2xl border border-sidebar-border bg-sidebar-accent/45 p-3.5"><div className="mb-2 flex items-center gap-2 text-secondary"><Zap className="h-3.5 w-3.5 fill-current" /><span className="font-mono text-[10px] uppercase tracking-[.12em]">Preview mode</span></div><p className="text-[11px] leading-relaxed text-sidebar-foreground/55">Your conversations stay in this room. Live listening arrives soon.</p></div>}
      <button onClick={onSettings} className={`${collapsed ? 'justify-center px-0' : ''} flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-[13px] text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground`} data-testid="button-settings"><Settings2 className="h-[17px] w-[17px]" />{!collapsed && 'Settings & accessibility'}</button>
      <div className={`${collapsed ? 'justify-center' : ''} mt-1 flex items-center gap-3 border-t border-sidebar-border px-3.5 pt-4`}><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8bc76] font-serif text-sm text-sidebar">M</div>{!collapsed && <div><p className="text-xs font-medium">Maya</p><p className="font-mono text-[9px] uppercase tracking-[.13em] text-sidebar-foreground/35">Private room</p></div>}</div>
    </div>
  </aside>;
}

function Orb({ listening = false }: { listening?: boolean }) {
  return <div className={`relative flex h-[142px] w-[142px] items-center justify-center rounded-full ${listening ? 'bg-[#e7b876]' : 'bg-primary'} shadow-[0_20px_50px_hsl(14_73%_52%_/_0.22)] transition-all duration-500`}>
    {listening && <><span className="pulse-ring absolute inset-0 rounded-full border border-primary/70" /><span className="pulse-ring absolute inset-0 rounded-full border border-primary/50 [animation-delay:.8s]" /></>}
    <span className="absolute h-[76px] w-[76px] rounded-full border border-white/30" />
    <span className="absolute h-[32px] w-[32px] rounded-full border-2 border-white/80" />
    <span className="absolute bottom-[39px] h-2 w-2 rounded-full bg-white" />
    <span className="absolute bottom-[37px] left-[53px] h-2 w-2 rounded-full bg-white" />
  </div>;
}

function Composer({ onSend, onVoice }: { onSend: (text: string) => void; onVoice: () => void }) {
  const [value, setValue] = useState('');
  const submit = () => { if (value.trim()) { onSend(value.trim()); setValue(''); } };
  return <div className="relative rounded-[22px] border border-border bg-card p-2 shadow-[0_12px_28px_hsl(280_28%_19%_/_0.06)] focus-within:border-primary/50 focus-within:shadow-[0_14px_32px_hsl(14_73%_52%_/_0.1)]">
    <textarea value={value} onChange={e => setValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }} placeholder="Say what’s on your mind..." rows={2} className="w-full resize-none bg-transparent px-3 py-2.5 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground/65" data-testid="input-thought" />
    <div className="flex items-center justify-between border-t border-border/70 px-2 pt-2">
      <div className="flex items-center gap-1"><button className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Open keyboard shortcuts" data-testid="button-shortcuts"><Keyboard className="h-4 w-4" /></button><span className="hidden font-mono text-[10px] text-muted-foreground/60 sm:block">Shift + Enter for a new line</span></div>
      <div className="flex items-center gap-1.5"><button onClick={onVoice} className="rounded-xl p-2.5 text-primary hover:bg-primary/10" aria-label="Start voice conversation" data-testid="button-voice"><Mic className="h-[18px] w-[18px]" /></button><button onClick={submit} disabled={!value.trim()} className="flex items-center gap-2 rounded-xl bg-foreground px-3.5 py-2.5 text-xs font-semibold text-background transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-30" data-testid="button-send">Send <Send className="h-3.5 w-3.5" /></button></div>
    </div>
  </div>;
}

function Companion({ onVoice, onMenu }: { onVoice: () => void; onMenu: () => void }) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, typing]);
  const send = (text: string) => {
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', text, time: 'Just now' }]);
    setTyping(true);
    window.setTimeout(() => { setTyping(false); setMessages(prev => [...prev, { id: Date.now() + 1, role: 'vipti', text: 'I’m with you. Let’s stay with that for a moment — what feels like the most honest next sentence?', time: 'Just now' }]); }, 1000);
  };
  return <main className="flex min-w-0 flex-1 flex-col">
    <header className="flex h-[76px] items-center justify-between border-b border-border/70 px-6 lg:px-10" data-testid="main-header"><div className="flex items-center gap-3"><button onClick={onMenu} className="rounded-lg p-2 text-muted-foreground hover:bg-muted md:hidden" aria-label="Open menu" data-testid="button-menu"><Menu className="h-5 w-5" /></button><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Tuesday, June 18</p><h1 className="font-serif text-[24px] leading-tight tracking-[-.02em]">A quiet place to land.</h1></div></div><div className="flex items-center gap-2"><div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-2 sm:flex"><span className="h-2 w-2 rounded-full bg-accent" /><span className="font-mono text-[10px] uppercase tracking-[.12em] text-muted-foreground">Preview mode</span></div><button className="rounded-xl p-2.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Notifications" data-testid="button-notifications"><Bell className="h-[17px] w-[17px]" /></button><button className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8bc76] font-serif text-sm text-sidebar" aria-label="Maya profile" data-testid="button-profile">M</button></div></header>
    <div className="mx-auto flex w-full max-w-[920px] flex-1 flex-col overflow-hidden px-5 py-8 lg:px-10"><div className="mb-6 flex items-center justify-between"><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary text-primary-foreground"><Sparkles className="h-4 w-4" /></div><div><p className="text-sm font-semibold">Vipti</p><p className="font-mono text-[9px] uppercase tracking-[.15em] text-muted-foreground">Present & listening</p></div></div><button className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-card hover:text-foreground" data-testid="button-more-conversation"><MoreHorizontal className="h-4 w-4" /> More</button></div>
      <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto pb-5 pr-1">{messages.map((message, index) => <div key={message.id} className={`animate-rise flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`} style={{ animationDelay: `${Math.min(index, 4) * 70}ms` }} data-testid={`message-${message.role}-${message.id}`}>{message.role === 'vipti' && <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Sparkles className="h-3.5 w-3.5" /></div>}<div className={`${message.role === 'user' ? 'max-w-[76%] rounded-[20px_20px_5px_20px] bg-foreground text-background' : 'max-w-[80%] rounded-[5px_20px_20px_20px] border border-border bg-card'} px-4 py-3.5`}><p className="text-[14px] leading-[1.65]">{message.text}</p><p className={`mt-2 font-mono text-[9px] uppercase tracking-[.12em] ${message.role === 'user' ? 'text-background/45' : 'text-muted-foreground/60'}`}>{message.time}</p></div></div>)}{typing && <div className="flex items-center gap-3 animate-rise"><div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Sparkles className="h-3.5 w-3.5" /></div><div className="rounded-[5px_20px_20px_20px] border border-border bg-card px-5 py-4"><div className="flex gap-1.5"><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-.3s]" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-.15s]" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" /></div></div></div>}</div>
      <div className="mt-4"><Composer onSend={send} onVoice={onVoice} /><p className="mt-3 text-center font-mono text-[9px] uppercase tracking-[.12em] text-muted-foreground/60">Vipti is a thinking partner, not a replacement for professional care.</p></div>
    </div>
  </main>;
}

function VoicePanel({ onClose }: { onClose: () => void }) {
  return <div className="fixed inset-0 z-40 flex items-center justify-center bg-sidebar/40 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" data-testid="voice-panel"><div className="relative w-full max-w-[520px] overflow-hidden rounded-[30px] bg-sidebar p-8 text-sidebar-foreground shadow-2xl sm:p-12"><button onClick={onClose} className="absolute right-5 top-5 rounded-xl p-2 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground" aria-label="Close voice panel" data-testid="button-close-voice"><X className="h-5 w-5" /></button><div className="mx-auto flex max-w-[310px] flex-col items-center text-center"><div className="mb-8"><Orb listening /></div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-secondary">Listening softly</p><h2 className="mt-3 font-serif text-4xl tracking-[-.03em]">Take your time.</h2><p className="mt-4 text-sm leading-relaxed text-sidebar-foreground/55">You can pause, change your mind, or just make a sound. I’m here.</p><div className="mt-10 flex items-center gap-3"><button onClick={onClose} className="rounded-full border border-sidebar-border px-5 py-3 text-xs font-semibold text-sidebar-foreground/70 hover:bg-sidebar-accent" data-testid="button-cancel-voice">Cancel</button><button onClick={onClose} className="flex items-center gap-2 rounded-full bg-sidebar-primary px-5 py-3 text-xs font-semibold text-sidebar-primary-foreground shadow-lg hover:-translate-y-0.5" data-testid="button-finish-voice"><Check className="h-4 w-4" /> That’s enough</button></div><p className="mt-7 font-mono text-[9px] uppercase tracking-[.14em] text-sidebar-foreground/35">Microphone access is simulated in preview</p></div></div></div>;
}

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [dark, setDark] = useState(false);
  const [sound, setSound] = useState(true);
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); }, [dark]);
  return <div className="fixed inset-0 z-40 flex justify-end bg-sidebar/20 backdrop-blur-[2px]" role="dialog" aria-modal="true" data-testid="settings-panel">
    <div className="h-full w-full max-w-[440px] overflow-y-auto border-l border-border bg-background p-6 shadow-2xl sm:p-9">
      <div className="mb-10 flex items-center justify-between">
        <div><p className="font-mono text-[10px] uppercase tracking-[.17em] text-muted-foreground">Your room</p><h2 className="mt-1 font-serif text-3xl">Settings</h2></div>
        <button onClick={onClose} className="rounded-xl p-2.5 text-muted-foreground hover:bg-muted" aria-label="Close settings" data-testid="button-close-settings"><X className="h-5 w-5" /></button>
      </div>
      <div className="space-y-7">
        <section>
          <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">Experience</h3>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border p-4">
              <span className="flex items-center gap-3"><Moon className="h-4 w-4 text-primary" /><span><span className="block text-sm font-medium">Night room</span><span className="block text-xs text-muted-foreground">A softer palette for late thoughts</span></span></span>
              <button onClick={() => setDark(!dark)} className={`relative h-6 w-11 rounded-full transition ${dark ? 'bg-primary' : 'bg-muted'}`} aria-label="Toggle night room" data-testid="toggle-night-room"><span className={`absolute top-1 h-4 w-4 rounded-full bg-card shadow-sm transition-transform ${dark ? 'translate-x-6' : 'translate-x-1'}`} /></button>
            </div>
            <div className="flex items-center justify-between p-4">
              <span className="flex items-center gap-3"><Volume2 className="h-4 w-4 text-accent" /><span><span className="block text-sm font-medium">Sound cues</span><span className="block text-xs text-muted-foreground">Little signals when Vipti is ready</span></span></span>
              <button onClick={() => setSound(!sound)} className={`relative h-6 w-11 rounded-full transition ${sound ? 'bg-accent' : 'bg-muted'}`} aria-label="Toggle sound cues" data-testid="toggle-sound-cues"><span className={`absolute top-1 h-4 w-4 rounded-full bg-card shadow-sm transition-transform ${sound ? 'translate-x-6' : 'translate-x-1'}`} /></button>
            </div>
          </div>
        </section>
        <section>
          <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">Accessibility</h3>
          <button className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 text-left hover:border-primary/50" data-testid="button-accessibility"><span className="flex items-center gap-3"><Headphones className="h-4 w-4 text-primary" /><span><span className="block text-sm font-medium">Voice & captions</span><span className="block text-xs text-muted-foreground">Manage how Vipti speaks and listens</span></span></span><ChevronDown className="h-4 w-4 -rotate-90 text-muted-foreground" /></button>
        </section>
        <section>
          <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">About preview mode</h3>
          <div className="rounded-2xl bg-[#e9d7b4]/45 p-5"><div className="mb-3 flex items-center gap-2 text-primary"><Sparkles className="h-4 w-4" /><span className="text-sm font-semibold">A small, honest room</span></div><p className="text-sm leading-relaxed text-foreground/70">These conversations use local demo replies while Vipti is being tuned. Nothing leaves this browser.</p></div>
        </section>
      </div>
    </div>
  </div>;
}

function Home() {
  const [voice, setVoice] = useState(false);
  const [settings, setSettings] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  return <div className="vipti-grain flex min-h-[100dvh] bg-background text-foreground"><Sidebar active="companion" onNew={() => setSessionKey(value => value + 1)} onSettings={() => setSettings(true)} collapsed={collapsed} onCollapse={() => setCollapsed(!collapsed)} /><Companion key={sessionKey} onVoice={() => setVoice(true)} onMenu={() => setCollapsed(false)} />{voice && <VoicePanel onClose={() => setVoice(false)} />}{settings && <SettingsPanel onClose={() => setSettings(false)} />}</div>;
}

function Router() {
  return <ErrorBoundary resetKey={useLocation()[0]}><Switch><Route path="/" component={Home} /><Route component={NotFound} /></Switch></ErrorBoundary>;
}
function NotFound() { return <div className="flex min-h-screen items-center justify-center bg-background p-6"><div className="text-center"><Logo /><h1 className="mt-10 font-serif text-4xl">This room is elsewhere.</h1><p className="mt-3 text-muted-foreground">That doorway does not lead anywhere yet.</p></div></div>; }
function App() { return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>; }
export default App;