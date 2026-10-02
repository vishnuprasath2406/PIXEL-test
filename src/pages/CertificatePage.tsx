import React, { useEffect, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';

/* Event names must match the "event" column in public/participants.csv */
const CATEGORIES: Record<string, string[]> = {
  'Technical': ['PaperQuest', 'AI FilmForge'],
  'Non-Technical': ['Checkmate', 'Mine Relay'],
};
const TEMPLATE = '/certificate-template.png';

/* Where each detail is written, in template pixels (template is 1534 x 1025).
   cx = centre x, y = text baseline (just above the blank line), w = max width, size = font size */
const FIELDS = {
  name:    { cx: 942, y: 597, w: 940,  size: 40, style: 'italic 700' },
  college: { cx: 785, y: 657, w: 1400, size: 34, style: '700' },
  event:   { cx: 696, y: 716, w: 440,  size: 32, style: '700' },
};
const INK = '#0a1e6e';
const FONT = '"Times New Roman", Times, serif';

interface Person { name: string; college: string; event: string }
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
const tidyName = (s: string) =>
  s === s.toLowerCase() || s === s.toUpperCase() ? s.toLowerCase().replace(/(^|[\s.])([a-z])/g, (_, a, b) => a + b.toUpperCase()) : s;

function parseCSV(text: string): Person[] {
  const rows = text.replace(/\r/g, '').split('\n').filter(r => r.trim()).map(r => {
    const out: string[] = []; let c = ''; let q = false;
    for (const ch of r) {
      if (ch === '"') q = !q;
      else if (ch === ',' && !q) { out.push(c.trim()); c = ''; }
      else c += ch;
    }
    out.push(c.trim()); return out;
  });
  if (!rows.length) return [];
  const h = rows[0].map(x => x.toLowerCase());
  const ni = Math.max(0, h.indexOf('name')), ci = h.indexOf('college'), ei = h.indexOf('event');
  return rows.slice(1).filter(r => r[ni]).map(r => ({
    name: r[ni], college: ci >= 0 ? r[ci] || '' : '', event: ei >= 0 ? r[ei] || '' : '',
  }));
}

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
}

export const CertificatePage: React.FC = () => {
  const [people, setPeople] = useState<Person[]>([]);
  const [cat, setCat] = useState('');
  const [event, setEvent] = useState('');
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState<Person | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetch('/participants.csv').then(r => (r.ok ? r.text() : '')).then(t => setPeople(parseCSV(t))).catch(() => setPeople([]));
  }, []);

  const q = norm(query);
  const matches = event && q.length >= 3
    ? people.filter(p => norm(p.event) === norm(event) && norm(p.name).includes(q)).slice(0, 8) : [];

  const draw = async (d: Person) => {
    const cv = canvasRef.current; if (!cv) return;
    const im = await loadImg(TEMPLATE); if (!im) return;
    cv.width = im.naturalWidth; cv.height = im.naturalHeight;
    const ctx = cv.getContext('2d')!; ctx.drawImage(im, 0, 0);
    const k = cv.width / 1534; // scale if the template is exported at a different size
    const put = (f: typeof FIELDS.name, text: string) => {
      if (!text) return;
      let size = f.size * k;
      ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      do { ctx.font = `${f.style} ${size}px ${FONT}`; size -= 1; } while (ctx.measureText(text).width > f.w * k && size > 12);
      ctx.fillText(text, f.cx * k, f.y * k);
    };
    put(FIELDS.name, tidyName(d.name)); put(FIELDS.college, d.college); put(FIELDS.event, d.event);
  };

  useEffect(() => { if (chosen) draw(chosen); }, [chosen]);

  const fname = chosen ? `${chosen.name} - ${chosen.event}` : 'certificate';
  const png = () => { const a = document.createElement('a'); a.download = `${fname}.png`; a.href = canvasRef.current!.toDataURL('image/png'); a.click(); };
  const pdf = () => {
    const cv = canvasRef.current!;
    const p = new jsPDF({ orientation: 'landscape', unit: 'px', format: [cv.width, cv.height] });
    p.addImage(cv.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, cv.width, cv.height); p.save(`${fname}.pdf`);
  };
  const reset = () => { setChosen(null); setQuery(''); };
  const isTech = cat === 'Technical';

  return (
    <PageTransition>
      <div className="min-h-screen bg-background-warm/40 pt-24 pb-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <div className="text-xs font-bold tracking-[0.3em] text-phoenix-orange uppercase mb-2">PIXEL-3.O · NATIONAL LEVEL SYMPOSIUM</div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-2">E-CERTIFICATE</h1>
            <p className="text-xs sm:text-sm text-foreground-secondary">14 October 2026 · Department of CSE · Adhiparasakthi Engineering College</p>
          </div>

          <div className="bg-white rounded-3xl border border-border shadow-sm p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="text-xl font-bold tracking-tight text-foreground mb-1">SELECT CATEGORY</h3>
              <p className="text-xs text-foreground-secondary mb-3">Choose the type of event you participated in.</p>
              <div className="grid grid-cols-2 gap-3">
                {Object.keys(CATEGORIES).map(c => {
                  const on = cat === c; const tech = c === 'Technical';
                  return (
                    <button key={c} type="button" onClick={() => { setCat(c); setEvent(''); reset(); }}
                      className={`p-4 rounded-2xl border-2 text-left transition-all duration-200 ${on
                        ? (tech ? 'border-phoenix-orange bg-phoenix-orange/5 ring-2 ring-phoenix-orange/20 shadow-phoenix-subtle' : 'border-phoenix-magenta bg-phoenix-magenta/5 ring-2 ring-phoenix-magenta/20 shadow-phoenix-subtle')
                        : 'border-border bg-white hover:border-phoenix-orange/50'}`}>
                      <div className={`text-[10px] font-bold tracking-widest uppercase ${tech ? 'text-phoenix-orange' : 'text-phoenix-magenta'}`}>{tech ? 'Technical' : 'Non-Technical'}</div>
                      <div className="text-sm font-bold text-foreground mt-0.5">{CATEGORIES[c].length} events</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {cat && (
              <div>
                <h3 className="text-xl font-bold tracking-tight text-foreground mb-3">SELECT EVENT</h3>
                <div className="grid gap-3">
                  {CATEGORIES[cat].map(e => {
                    const on = event === e;
                    return (
                      <button key={e} type="button" onClick={() => { setEvent(e); reset(); }}
                        className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 flex items-center justify-between ${on
                          ? (isTech ? 'border-phoenix-orange bg-phoenix-orange/5 ring-2 ring-phoenix-orange/20' : 'border-phoenix-magenta bg-phoenix-magenta/5 ring-2 ring-phoenix-magenta/20')
                          : 'border-border bg-white hover:border-phoenix-orange/50'}`}>
                        <span className="text-sm sm:text-base font-bold tracking-tight text-foreground uppercase">{e}</span>
                        {on && <CheckCircle2 className={`w-5 h-5 ${isTech ? 'text-phoenix-orange' : 'text-phoenix-magenta'}`} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {event && (
              <div>
                <h3 className="text-xl font-bold tracking-tight text-foreground mb-1">ENTER YOUR NAME</h3>
                <p className="text-xs text-foreground-secondary mb-3">Type your name as you registered, then select it.</p>
                <input value={query} onChange={e => { setQuery(e.target.value); setChosen(null); }}
                  placeholder="Start typing your name…" autoComplete="off"
                  className="w-full px-4 py-3 rounded-xl border border-border text-sm font-medium text-foreground bg-background-warm/40 placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-phoenix-orange/30 transition-all" />
                {!chosen && matches.length > 0 && (
                  <div className="mt-3 grid gap-2">
                    {matches.map((p, i) => (
                      <button key={i} type="button" onClick={() => setChosen(p)}
                        className="text-left p-3 rounded-xl bg-white border border-border hover:border-phoenix-orange transition-colors">
                        <div className="text-sm font-semibold text-foreground">{p.name}</div>
                        {p.college && <div className="text-xs text-foreground-secondary">{p.college}</div>}
                      </button>
                    ))}
                  </div>
                )}
                {!chosen && q.length >= 3 && matches.length === 0 && (
                  <div className="mt-3 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-600 font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Name not found for {event}. Check the spelling or contact the organisers.
                  </div>
                )}
              </div>
            )}

            {chosen && (
              <div className="p-5 rounded-2xl bg-background-warm border border-border space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                  <CheckCircle2 className="w-5 h-5" /> Certificate ready for {chosen.name}
                </div>
                <canvas ref={canvasRef} className="w-full h-auto rounded-xl border border-border bg-white" />
                <div className="flex gap-3">
                  <button type="button" onClick={png}
                    className="flex-1 phoenix-gradient-btn py-3.5 rounded-full text-white font-bold tracking-wider uppercase text-xs sm:text-sm flex items-center justify-center gap-2 shadow-phoenix-subtle">
                    <Download className="w-4 h-4" /> Download PNG
                  </button>
                  <button type="button" onClick={pdf}
                    className="flex-1 py-3.5 rounded-full border border-border bg-white text-foreground font-bold tracking-wider uppercase text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-background-warm transition-colors">
                    <Download className="w-4 h-4" /> Download PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
};
