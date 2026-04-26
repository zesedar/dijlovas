import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Save, Trash2, Edit2, ChevronUp, ChevronDown, Copy, X, Eye, EyeOff, FileDown, FileUp, BookOpen, Folder, Printer, Check } from 'lucide-react';

// ────────────────────────────────────────────────────────────
// PÁLYAADATOK – betűk pozíciója (méterben), A lent, C fent
// ────────────────────────────────────────────────────────────
const LETTERS_60 = {
  A: { x: 10, y: 60 }, K: { x: 20, y: 54 }, V: { x: 20, y: 42 },
  E: { x: 20, y: 30 }, S: { x: 20, y: 18 }, H: { x: 20, y: 6 },
  C: { x: 10, y: 0 }, M: { x: 0, y: 6 }, R: { x: 0, y: 18 },
  B: { x: 0, y: 30 }, P: { x: 0, y: 42 }, F: { x: 0, y: 54 },
  D: { x: 10, y: 54 }, L: { x: 10, y: 42 }, X: { x: 10, y: 30 },
  I: { x: 10, y: 18 }, G: { x: 10, y: 6 },
};

const LETTERS_40 = {
  A: { x: 10, y: 40 }, K: { x: 20, y: 34 }, E: { x: 20, y: 20 },
  H: { x: 20, y: 6 }, C: { x: 10, y: 0 }, M: { x: 0, y: 6 },
  B: { x: 0, y: 20 }, F: { x: 0, y: 34 },
  D: { x: 10, y: 34 }, X: { x: 10, y: 20 }, G: { x: 10, y: 6 },
};

const MOVEMENT_TYPES = [
  { id: 'straight',         name: 'Egyenes vonal',          mode: 'two_letters' },
  { id: 'centerline',       name: 'Középen (középvonal)',   mode: 'two_letters', defaults: { startLetter: 'A', endLetter: 'C' } },
  { id: 'half_school',      name: 'Félpálya (E–B átvágás)', mode: 'two_letters', defaults: { startLetter: 'E', endLetter: 'B' } },
  { id: 'small_circle_8',   name: 'Kiskör (8 m)',           mode: 'circle', diameter: 8 },
  { id: 'small_circle_10',  name: 'Kiskör (10 m)',          mode: 'circle', diameter: 10 },
  { id: 'small_circle_15',  name: 'Kör (15 m)',             mode: 'circle', diameter: 15 },
  { id: 'large_circle',     name: 'Nagykör (20 m)',         mode: 'circle', diameter: 20 },
  { id: 'diagonal',         name: 'Átlóváltás (X-en át)',   mode: 'diagonal' },
  { id: 'half_diagonal',    name: 'Félátlóváltás',          mode: 'two_letters' },
  { id: 'change_in_circle', name: 'Körben válts',           mode: 'change_in_circle' },
];

const GAITS = [
  { id: 'halt',             name: 'Megállás',           color: '#5e5b54', dash: false },
  { id: 'walk_collected',   name: 'Gyűjtött lépés',     color: '#4a6fa5', dash: true  },
  { id: 'walk_medium',      name: 'Középütemű lépés',   color: '#2e5288', dash: true  },
  { id: 'walk_extended',    name: 'Nyújtott lépés',     color: '#1e3d6e', dash: true  },
  { id: 'walk_free',        name: 'Szabad lépés',       color: '#7a99c2', dash: true  },
  { id: 'trot_collected',   name: 'Gyűjtött ügetés',    color: '#4a7a4f', dash: false },
  { id: 'trot_working',     name: 'Munkaügetés',        color: '#356139', dash: false },
  { id: 'trot_medium',      name: 'Középütemű ügetés',  color: '#244c28', dash: false },
  { id: 'trot_extended',    name: 'Nyújtott ügetés',    color: '#173919', dash: false },
  { id: 'canter_collected', name: 'Gyűjtött vágta',     color: '#b07a1f', dash: false },
  { id: 'canter_working',   name: 'Munkavágta',         color: '#92621a', dash: false },
  { id: 'canter_medium',    name: 'Középütemű vágta',   color: '#714813', dash: false },
  { id: 'canter_extended',  name: 'Nyújtott vágta',     color: '#5a360c', dash: false },
];

// ────────────────────────────────────────────────────────────
// ÚTVONAL GENERÁLÁS – SVG path string
// ────────────────────────────────────────────────────────────
function getCircleCenter(letterPos, radius, arenaLen) {
  if (letterPos.x === 10 && letterPos.y === 0)        return { x: 10, y: radius };
  if (letterPos.x === 10 && letterPos.y === arenaLen) return { x: 10, y: arenaLen - radius };
  if (letterPos.x === 0)                              return { x: radius, y: letterPos.y };
  if (letterPos.x === 20)                             return { x: 20 - radius, y: letterPos.y };
  return { ...letterPos };
}

function generatePath(m, letters, arenaLen) {
  const type = MOVEMENT_TYPES.find(t => t.id === m.type);
  if (!type) return '';

  const start = letters[m.startLetter];
  const end   = letters[m.endLetter];
  const ctr   = letters[m.centerLetter];

  switch (type.mode) {
    case 'two_letters': {
      if (!start || !end) return '';
      return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
    }
    case 'diagonal': {
      const X = letters['X'];
      if (!start || !end || !X) return '';
      return `M ${start.x} ${start.y} L ${X.x} ${X.y} L ${end.x} ${end.y}`;
    }
    case 'circle': {
      if (!ctr) return '';
      const r = type.diameter / 2;
      const c = getCircleCenter(ctr, r, arenaLen);
      return `M ${c.x - r} ${c.y} A ${r} ${r} 0 1 1 ${c.x + r} ${c.y} A ${r} ${r} 0 1 1 ${c.x - r} ${c.y}`;
    }
    case 'change_in_circle': {
      // Két 10 m-es félkör 20 m-es körön belül – S alak az átmérőn
      if (!ctr) return '';
      const big = getCircleCenter(ctr, 10, arenaLen);
      // Vízszintes (rövid oldalon centrált) vagy függőleges (hosszú oldalon)?
      const horizontal = ctr.x === 10;
      if (horizontal) {
        // Átmérő vízszintes az x = 0..20 között a big.y magasságban
        return `M 20 ${big.y} A 5 5 0 0 1 10 ${big.y} A 5 5 0 0 0 0 ${big.y}`;
      } else {
        // Átmérő függőleges
        return `M ${big.x} ${big.y - 10} A 5 5 0 0 0 ${big.x} ${big.y} A 5 5 0 0 1 ${big.x} ${big.y + 10}`;
      }
    }
    default:
      return '';
  }
}

function getMovementMidpoint(m, letters, arenaLen) {
  const type = MOVEMENT_TYPES.find(t => t.id === m.type);
  if (!type) return null;
  if (type.mode === 'two_letters') {
    const a = letters[m.startLetter], b = letters[m.endLetter];
    if (!a || !b) return null;
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }
  if (type.mode === 'diagonal') {
    return letters['X'] || null;
  }
  if (type.mode === 'circle') {
    const ctr = letters[m.centerLetter];
    if (!ctr) return null;
    const r = type.diameter / 2;
    return getCircleCenter(ctr, r, arenaLen);
  }
  if (type.mode === 'change_in_circle') {
    const ctr = letters[m.centerLetter];
    if (!ctr) return null;
    return getCircleCenter(ctr, 10, arenaLen);
  }
  return null;
}

// ────────────────────────────────────────────────────────────
// SVG PÁLYA
// ────────────────────────────────────────────────────────────
function Arena({ size, movements, highlightedIdx, showAll }) {
  const letters  = size === '20x60' ? LETTERS_60 : LETTERS_40;
  const arenaLen = size === '20x60' ? 60 : 40;
  const padX = 4.5, padY = 4.5;

  return (
    <svg
      viewBox={`${-padX} ${-padY} ${20 + padX * 2} ${arenaLen + padY * 2}`}
      className="w-full h-full"
      style={{ maxHeight: '100%' }}
    >
      {/* Háttér – krém papír */}
      <rect
        x={-padX} y={-padY}
        width={20 + padX * 2} height={arenaLen + padY * 2}
        fill="#faf6ec"
      />

      {/* Lovaglópálya */}
      <rect
        x="0" y="0" width="20" height={arenaLen}
        fill="#ffffff"
        stroke="#1a1a18"
        strokeWidth="0.18"
      />

      {/* Belső sáv – patanyom (1 m) */}
      <rect
        x="1" y="1" width="18" height={arenaLen - 2}
        fill="none"
        stroke="#d4c9a8"
        strokeWidth="0.05"
        strokeDasharray="0.6 0.4"
      />

      {/* Középvonal */}
      <line
        x1="10" y1="0" x2="10" y2={arenaLen}
        stroke="#c9bfa3" strokeWidth="0.05" strokeDasharray="0.5 0.5"
      />

      {/* Középvonal merőlegese (E–B vagy E–B) */}
      <line
        x1="0" y1={arenaLen / 2} x2="20" y2={arenaLen / 2}
        stroke="#c9bfa3" strokeWidth="0.05" strokeDasharray="0.5 0.5"
      />

      {/* X jelölés */}
      <g>
        <line x1="9.3" y1={arenaLen / 2 - 0.7} x2="10.7" y2={arenaLen / 2 + 0.7}
              stroke="#a89880" strokeWidth="0.1" />
        <line x1="9.3" y1={arenaLen / 2 + 0.7} x2="10.7" y2={arenaLen / 2 - 0.7}
              stroke="#a89880" strokeWidth="0.1" />
      </g>

      {/* Útvonalak */}
      {movements.map((m, idx) => {
        if (!showAll && idx !== highlightedIdx) return null;
        const isHi   = idx === highlightedIdx;
        const path   = generatePath(m, letters, arenaLen);
        if (!path) return null;
        const gait   = GAITS.find(g => g.id === m.gait);
        const color  = gait?.color || '#5e5b54';
        const dashed = gait?.dash;

        return (
          <g key={m.id}>
            <path
              d={path}
              fill="none"
              stroke={color}
              strokeWidth={isHi ? 0.55 : 0.35}
              strokeOpacity={(showAll && !isHi && highlightedIdx != null) ? 0.32 : 0.92}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={dashed ? '0.7 0.4' : undefined}
            />
          </g>
        );
      })}

      {/* Sorszámok */}
      {movements.map((m, idx) => {
        if (!showAll && idx !== highlightedIdx) return null;
        const isHi = idx === highlightedIdx;
        const mid  = getMovementMidpoint(m, letters, arenaLen);
        if (!mid) return null;
        const gait  = GAITS.find(g => g.id === m.gait);
        const color = gait?.color || '#5e5b54';
        return (
          <g key={`n-${m.id}`}>
            <circle
              cx={mid.x} cy={mid.y} r={isHi ? 1.3 : 1.05}
              fill="#faf6ec" stroke={color}
              strokeWidth={isHi ? 0.25 : 0.18}
              opacity={(showAll && !isHi && highlightedIdx != null) ? 0.5 : 1}
            />
            <text
              x={mid.x} y={mid.y}
              fontSize={isHi ? 1.4 : 1.15}
              fontFamily="'Fraunces', Georgia, serif"
              fontWeight="600"
              textAnchor="middle"
              dominantBaseline="central"
              fill={color}
              opacity={(showAll && !isHi && highlightedIdx != null) ? 0.6 : 1}
            >{idx + 1}</text>
          </g>
        );
      })}

      {/* Betűk */}
      {Object.entries(letters).map(([letter, pos]) => {
        const onLeft   = pos.x === 0;
        const onRight  = pos.x === 20;
        const onShortA = pos.y === arenaLen;
        const onShortC = pos.y === 0;
        const onCenter = pos.x === 10 && !onShortA && !onShortC;

        let tx = pos.x, ty = pos.y;
        if (onLeft)        tx = -2.5;
        else if (onRight)  tx = 22.5;
        else if (onShortA) ty = arenaLen + 3;
        else if (onShortC) ty = -2.2;
        else if (onCenter) tx = 11.7;

        const isCenterMark = onCenter;

        return (
          <g key={letter}>
            {!isCenterMark && (
              <line
                x1={onLeft ? 0 : onRight ? 20 : pos.x}
                y1={onShortA ? arenaLen : onShortC ? 0 : pos.y}
                x2={onLeft ? -1.2 : onRight ? 21.2 : pos.x}
                y2={onShortA ? arenaLen + 1.2 : onShortC ? -1.2 : pos.y}
                stroke="#1a1a18"
                strokeWidth="0.12"
              />
            )}
            <text
              x={tx} y={ty}
              fontSize={isCenterMark ? 2 : 2.6}
              fontFamily="'Fraunces', Georgia, serif"
              fontWeight={isCenterMark ? 500 : 700}
              textAnchor="middle"
              dominantBaseline="central"
              fill={isCenterMark ? '#9a8e75' : '#1a1a18'}
              fontStyle={isCenterMark ? 'italic' : 'normal'}
            >{letter}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ────────────────────────────────────────────────────────────
// MOZGÁS-SZERKESZTŐ FORM
// ────────────────────────────────────────────────────────────
function MovementForm({ initial, arenaSize, onSave, onCancel }) {
  const letters = arenaSize === '20x60' ? LETTERS_60 : LETTERS_40;
  const letterKeys = Object.keys(letters);

  const [type, setType]   = useState(initial?.type   || 'straight');
  const [start, setStart] = useState(initial?.startLetter   || 'A');
  const [end, setEnd]     = useState(initial?.endLetter     || 'C');
  const [ctr, setCtr]     = useState(initial?.centerLetter  || 'X');
  const [gait, setGait]   = useState(initial?.gait || 'trot_working');
  const [notes, setNotes] = useState(initial?.notes || '');

  const typeDef = MOVEMENT_TYPES.find(t => t.id === type);

  // Ha váltok típust és nincs initial érték, állítsam be a defaultot
  useEffect(() => {
    if (initial && initial.type === type) return;
    const td = MOVEMENT_TYPES.find(t => t.id === type);
    if (td?.defaults) {
      setStart(td.defaults.startLetter || start);
      setEnd(td.defaults.endLetter || end);
    }
    if (td?.mode === 'circle' || td?.mode === 'change_in_circle') {
      // legyen X vagy A alapból
      if (!letterKeys.includes(ctr)) setCtr('X');
    }
    if (td?.mode === 'diagonal') {
      // alap: H-X-F
      if (!start || !end) { setStart('H'); setEnd('F'); }
    }
  }, [type]); // eslint-disable-line

  function handleSave() {
    const payload = {
      id:    initial?.id || Date.now().toString(36) + Math.random().toString(36).slice(2,6),
      type, gait, notes,
    };
    if (typeDef.mode === 'two_letters' || typeDef.mode === 'diagonal') {
      payload.startLetter = start;
      payload.endLetter   = end;
    }
    if (typeDef.mode === 'circle' || typeDef.mode === 'change_in_circle') {
      payload.centerLetter = ctr;
    }
    onSave(payload);
  }

  const inputClass  = "w-full px-3 py-2 bg-[#fdfaf2] border border-[#d4c9a8] rounded text-[#1a1a18] focus:outline-none focus:border-[#1f3a2c] focus:ring-1 focus:ring-[#1f3a2c]/30 transition";
  const labelClass  = "block text-[11px] font-medium text-[#5e5b54] uppercase tracking-wider mb-1";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelClass}>Mozgás típusa</label>
          <select className={inputClass} value={type} onChange={e => setType(e.target.value)}>
            {MOVEMENT_TYPES.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {(typeDef.mode === 'two_letters' || typeDef.mode === 'diagonal') && (
          <>
            <div>
              <label className={labelClass}>Kezdő betű</label>
              <select className={inputClass} value={start} onChange={e => setStart(e.target.value)}>
                {letterKeys.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Záró betű</label>
              <select className={inputClass} value={end} onChange={e => setEnd(e.target.value)}>
                {letterKeys.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
          </>
        )}

        {(typeDef.mode === 'circle' || typeDef.mode === 'change_in_circle') && (
          <div className="col-span-2">
            <label className={labelClass}>Központ (mely betűnél)</label>
            <select className={inputClass} value={ctr} onChange={e => setCtr(e.target.value)}>
              {letterKeys.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
        )}

        <div className="col-span-2">
          <label className={labelClass}>Jármód</label>
          <select className={inputClass} value={gait} onChange={e => setGait(e.target.value)}>
            {GAITS.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>

        <div className="col-span-2">
          <label className={labelClass}>Megjegyzés</label>
          <textarea
            className={inputClass}
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="pl. átmenet, segítségadás, hangulat..."
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          className="flex-1 px-4 py-2.5 bg-[#1f3a2c] text-[#faf6ec] rounded font-medium hover:bg-[#2a4d3a] transition flex items-center justify-center gap-2"
        >
          <Check size={16} />
          {initial ? 'Mentés' : 'Hozzáadás'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2.5 bg-transparent border border-[#d4c9a8] text-[#5e5b54] rounded font-medium hover:bg-[#f0eadc] transition"
        >
          Mégse
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// MOZGÁS LISTA ELEM
// ────────────────────────────────────────────────────────────
function describeMovement(m) {
  const t = MOVEMENT_TYPES.find(t => t.id === m.type);
  if (!t) return 'ismeretlen';
  if (t.mode === 'circle' || t.mode === 'change_in_circle')
    return `${t.name} – ${m.centerLetter}-nél`;
  if (t.mode === 'diagonal')
    return `${t.name} – ${m.startLetter}–X–${m.endLetter}`;
  return `${t.name} – ${m.startLetter}–${m.endLetter}`;
}

function MovementListItem({ m, idx, total, isHi, onClick, onEdit, onDelete, onMoveUp, onMoveDown }) {
  const gait = GAITS.find(g => g.id === m.gait);
  return (
    <div
      onClick={onClick}
      className={`group relative px-3 py-2.5 border-l-2 cursor-pointer transition ${
        isHi
          ? 'bg-[#f0eadc] border-[#1f3a2c]'
          : 'bg-transparent border-transparent hover:bg-[#f5f0e0]'
      }`}
      style={{ borderLeftColor: isHi ? gait?.color : 'transparent' }}
    >
      <div className="flex items-start gap-2.5">
        <div
          className="flex-none w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5"
          style={{
            backgroundColor: '#faf6ec',
            border: `1.5px solid ${gait?.color || '#5e5b54'}`,
            color: gait?.color || '#5e5b54',
          }}
        >
          {idx + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-[#1a1a18] leading-tight truncate">
            {describeMovement(m)}
          </div>
          <div className="text-[11px] text-[#5e5b54] mt-0.5" style={{ color: gait?.color }}>
            {gait?.name}
          </div>
          {m.notes && (
            <div className="text-[11px] text-[#5e5b54] italic mt-1 line-clamp-2">
              {m.notes}
            </div>
          )}
        </div>
        <div className="flex-none flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition">
          <button
            onClick={e => { e.stopPropagation(); onMoveUp(); }}
            disabled={idx === 0}
            className="p-1 rounded hover:bg-[#e8dfc8] disabled:opacity-30"
            title="Előre"
          >
            <ChevronUp size={12} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onMoveDown(); }}
            disabled={idx === total - 1}
            className="p-1 rounded hover:bg-[#e8dfc8] disabled:opacity-30"
            title="Hátra"
          >
            <ChevronDown size={12} />
          </button>
        </div>
      </div>
      <div className="flex gap-2 mt-1.5 ml-9 opacity-0 group-hover:opacity-100 transition">
        <button
          onClick={e => { e.stopPropagation(); onEdit(); }}
          className="text-[11px] text-[#5e5b54] hover:text-[#1f3a2c] flex items-center gap-1"
        >
          <Edit2 size={11} /> szerkeszt
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="text-[11px] text-[#5e5b54] hover:text-[#922c2c] flex items-center gap-1"
        >
          <Trash2 size={11} /> törlés
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// FŐKOMPONENS
// ────────────────────────────────────────────────────────────
export default function DressagePlanner() {
  const [programs, setPrograms]               = useState([]);
  const [currentId, setCurrentId]             = useState(null);
  const [editing, setEditing]                 = useState(null); // { mode: 'new'|'edit', idx? }
  const [showAll, setShowAll]                 = useState(true);
  const [highlightedIdx, setHighlightedIdx]   = useState(null);
  const [drawerOpen, setDrawerOpen]           = useState(false);
  const [loaded, setLoaded]                   = useState(false);
  const [savingState, setSavingState]         = useState('idle'); // idle | saving | saved
  const fileInputRef = useRef(null);

  // ─── Betöltés
  useEffect(() => {
    (async () => {
      try {
        const list = await window.storage.list('program:');
        const out = [];
        for (const k of (list?.keys || [])) {
          try {
            const r = await window.storage.get(k);
            if (r?.value) out.push(JSON.parse(r.value));
          } catch (e) { /* skip */ }
        }
        out.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        if (out.length === 0) {
          // Üres kezdés – készítsünk egy demó programot
          const demo = {
            id: 'demo-' + Date.now().toString(36),
            name: 'Új program',
            arenaSize: '20x60',
            level: 'E (kezdő)',
            movements: [],
            updatedAt: Date.now(),
          };
          out.push(demo);
        }
        setPrograms(out);
        setCurrentId(out[0].id);
      } catch (e) {
        console.error('storage load failed', e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const current = useMemo(
    () => programs.find(p => p.id === currentId),
    [programs, currentId]
  );

  // ─── Mentés (debounced)
  useEffect(() => {
    if (!loaded || !current) return;
    setSavingState('saving');
    const t = setTimeout(async () => {
      try {
        await window.storage.set(`program:${current.id}`, JSON.stringify(current));
        setSavingState('saved');
        setTimeout(() => setSavingState('idle'), 1200);
      } catch (e) {
        console.error('storage save failed', e);
        setSavingState('idle');
      }
    }, 400);
    return () => clearTimeout(t);
  }, [current, loaded]);

  function updateCurrent(patch) {
    setPrograms(ps => ps.map(p =>
      p.id === currentId ? { ...p, ...patch, updatedAt: Date.now() } : p
    ));
  }

  function newProgram() {
    const p = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2,5),
      name: 'Új program',
      arenaSize: '20x60',
      level: '',
      movements: [],
      updatedAt: Date.now(),
    };
    setPrograms(ps => [p, ...ps]);
    setCurrentId(p.id);
    setHighlightedIdx(null);
    setDrawerOpen(false);
  }

  async function deleteProgram(id) {
    if (!confirm('Biztosan törlöd ezt a programot?')) return;
    try { await window.storage.delete(`program:${id}`); } catch(e){}
    setPrograms(ps => {
      const filtered = ps.filter(p => p.id !== id);
      if (filtered.length === 0) {
        const fresh = {
          id: Date.now().toString(36),
          name: 'Új program',
          arenaSize: '20x60',
          level: '',
          movements: [],
          updatedAt: Date.now(),
        };
        setCurrentId(fresh.id);
        return [fresh];
      }
      if (id === currentId) setCurrentId(filtered[0].id);
      return filtered;
    });
  }

  function duplicateProgram() {
    if (!current) return;
    const copy = {
      ...current,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2,5),
      name: current.name + ' (másolat)',
      updatedAt: Date.now(),
    };
    setPrograms(ps => [copy, ...ps]);
    setCurrentId(copy.id);
  }

  function addMovement(m) {
    updateCurrent({ movements: [...(current.movements || []), m] });
    setEditing(null);
    setHighlightedIdx((current.movements || []).length);
  }

  function updateMovement(idx, m) {
    const list = [...(current.movements || [])];
    list[idx] = m;
    updateCurrent({ movements: list });
    setEditing(null);
  }

  function deleteMovement(idx) {
    const list = (current.movements || []).filter((_, i) => i !== idx);
    updateCurrent({ movements: list });
    if (highlightedIdx === idx) setHighlightedIdx(null);
  }

  function moveMovement(idx, dir) {
    const list = [...(current.movements || [])];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= list.length) return;
    [list[idx], list[newIdx]] = [list[newIdx], list[idx]];
    updateCurrent({ movements: list });
    if (highlightedIdx === idx) setHighlightedIdx(newIdx);
    else if (highlightedIdx === newIdx) setHighlightedIdx(idx);
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(current, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (current.name || 'program').replace(/[^a-z0-9]+/gi, '_') + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        const prog = {
          ...data,
          id: Date.now().toString(36) + Math.random().toString(36).slice(2,5),
          updatedAt: Date.now(),
        };
        setPrograms(ps => [prog, ...ps]);
        setCurrentId(prog.id);
      } catch (err) {
        alert('Hibás JSON fájl');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  if (!loaded || !current) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-[#faf6ec] text-[#5e5b54]">
        <div className="text-center">
          <div className="text-3xl mb-2" style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic' }}>
            Betöltés...
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Fraunces', Georgia, serif; }
        .font-body    { font-family: 'IBM Plex Sans', -apple-system, sans-serif; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #faf6ec; }
        ::-webkit-scrollbar-thumb { background: #d4c9a8; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #b8a778; }
        @media print {
          .no-print { display: none !important; }
          .print-arena { width: 60% !important; }
        }
      `}</style>

      <div className="w-full min-h-screen bg-[#faf6ec] font-body text-[#1a1a18] flex flex-col">

        {/* ───── HEADER ───── */}
        <header className="no-print border-b border-[#d4c9a8] bg-[#f5f0e0]/60 backdrop-blur-sm sticky top-0 z-30">
          <div className="px-4 md:px-6 py-3 flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="md:hidden p-2 hover:bg-[#e8dfc8] rounded transition"
              title="Programok"
            >
              <Folder size={18} />
            </button>

            <div className="flex-1 min-w-0 flex items-center gap-3">
              <div className="hidden sm:block text-2xl font-display font-semibold tracking-tight text-[#1f3a2c]">
                Díjlovagló&nbsp;tervező
              </div>
              <div className="text-[#9a8e75] hidden sm:block">·</div>
              <input
                type="text"
                value={current.name}
                onChange={e => updateCurrent({ name: e.target.value })}
                className="bg-transparent border-none outline-none text-base md:text-lg font-display italic text-[#1a1a18] flex-1 min-w-0 focus:bg-[#fdfaf2] focus:px-2 focus:rounded transition"
                placeholder="Program neve..."
              />
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#5e5b54] mr-1">
              {savingState === 'saving' && <span className="italic">mentés...</span>}
              {savingState === 'saved'  && <span className="text-[#1f3a2c] flex items-center gap-1"><Check size={12}/>mentve</span>}
            </div>

            <button
              onClick={() => window.print()}
              className="hidden md:flex p-2 hover:bg-[#e8dfc8] rounded transition text-[#5e5b54]"
              title="Nyomtatás"
            >
              <Printer size={16} />
            </button>
            <button
              onClick={exportJSON}
              className="hidden md:flex p-2 hover:bg-[#e8dfc8] rounded transition text-[#5e5b54]"
              title="Export JSON"
            >
              <FileDown size={16} />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="hidden md:flex p-2 hover:bg-[#e8dfc8] rounded transition text-[#5e5b54]"
              title="Import JSON"
            >
              <FileUp size={16} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={importJSON}
            />
          </div>

          <div className="px-4 md:px-6 pb-3 flex flex-wrap items-center gap-2 text-sm">
            <select
              value={current.arenaSize}
              onChange={e => updateCurrent({ arenaSize: e.target.value })}
              className="bg-[#fdfaf2] border border-[#d4c9a8] rounded px-2 py-1 text-xs"
            >
              <option value="20x60">20×60 m (nagy pálya)</option>
              <option value="20x40">20×40 m (kis pálya)</option>
            </select>
            <input
              type="text"
              value={current.level}
              onChange={e => updateCurrent({ level: e.target.value })}
              placeholder="Szint / kategória (pl. E, A, L, M)"
              className="bg-[#fdfaf2] border border-[#d4c9a8] rounded px-2 py-1 text-xs flex-1 min-w-[120px] max-w-[240px]"
            />
            <button
              onClick={() => setShowAll(!showAll)}
              className="ml-auto flex items-center gap-1.5 text-xs px-2 py-1 hover:bg-[#e8dfc8] rounded transition text-[#5e5b54]"
            >
              {showAll ? <Eye size={13}/> : <EyeOff size={13}/>}
              {showAll ? 'Minden látszik' : 'Csak kiválasztott'}
            </button>
          </div>
        </header>

        {/* ───── MAIN ───── */}
        <main className="flex-1 flex flex-col md:flex-row min-h-0">

          {/* PROGRAMOK SIDEBAR – DESKTOP */}
          <aside className="no-print hidden md:flex flex-col w-56 border-r border-[#d4c9a8] bg-[#f5f0e0]/40">
            <div className="p-3 flex items-center justify-between border-b border-[#d4c9a8]">
              <div className="text-xs uppercase tracking-wider text-[#5e5b54] font-medium">Programok</div>
              <button
                onClick={newProgram}
                className="p-1 hover:bg-[#e8dfc8] rounded transition text-[#1f3a2c]"
                title="Új program"
              >
                <Plus size={15} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {programs.map(p => (
                <div
                  key={p.id}
                  onClick={() => { setCurrentId(p.id); setHighlightedIdx(null); }}
                  className={`group px-3 py-2 cursor-pointer border-l-2 transition ${
                    p.id === currentId
                      ? 'bg-[#f0eadc] border-[#1f3a2c]'
                      : 'border-transparent hover:bg-[#f5f0e0]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[13px] font-medium truncate font-display italic">{p.name}</div>
                    <button
                      onClick={e => { e.stopPropagation(); deleteProgram(p.id); }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[#e8dfc8] rounded text-[#922c2c]"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="text-[10px] text-[#9a8e75] mt-0.5">
                    {p.movements?.length || 0} mozgás · {p.arenaSize}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-[#d4c9a8]">
              <button
                onClick={duplicateProgram}
                className="w-full text-xs text-[#5e5b54] hover:text-[#1f3a2c] flex items-center justify-center gap-1.5 py-1.5"
              >
                <Copy size={12} /> Aktuális duplikálása
              </button>
            </div>
          </aside>

          {/* ARÉNA – KÖZÉPSŐ */}
          <section className="flex-1 flex items-center justify-center p-4 md:p-6 min-h-[400px] print-arena">
            <div className="w-full h-full max-w-md flex items-center justify-center" style={{ aspectRatio: current.arenaSize === '20x60' ? '20/60' : '20/40' }}>
              <Arena
                size={current.arenaSize}
                movements={current.movements || []}
                highlightedIdx={highlightedIdx}
                showAll={showAll}
              />
            </div>
          </section>

          {/* MOZGÁSOK – JOBB SIDEBAR (DESKTOP) */}
          <aside className="no-print hidden md:flex flex-col w-80 border-l border-[#d4c9a8] bg-[#f5f0e0]/30">
            <div className="p-3 flex items-center justify-between border-b border-[#d4c9a8]">
              <div className="text-xs uppercase tracking-wider text-[#5e5b54] font-medium">
                Mozgások · {current.movements?.length || 0}
              </div>
              <button
                onClick={() => setEditing({ mode: 'new' })}
                className="flex items-center gap-1 px-2 py-1 bg-[#1f3a2c] text-[#faf6ec] rounded text-xs font-medium hover:bg-[#2a4d3a] transition"
              >
                <Plus size={13} /> Új
              </button>
            </div>

            {editing && (
              <div className="p-3 border-b border-[#d4c9a8] bg-[#fdfaf2]">
                <div className="text-xs uppercase tracking-wider text-[#5e5b54] font-medium mb-2">
                  {editing.mode === 'new' ? 'Új mozgás' : `${editing.idx + 1}. mozgás szerkesztése`}
                </div>
                <MovementForm
                  initial={editing.mode === 'edit' ? current.movements[editing.idx] : null}
                  arenaSize={current.arenaSize}
                  onSave={m => editing.mode === 'new' ? addMovement(m) : updateMovement(editing.idx, m)}
                  onCancel={() => setEditing(null)}
                />
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {(current.movements || []).length === 0 && !editing && (
                <div className="p-6 text-center text-[#9a8e75]">
                  <BookOpen className="mx-auto mb-3 opacity-40" size={32} />
                  <div className="text-sm font-display italic">Még nincs mozgás</div>
                  <div className="text-xs mt-1">Kattints az "Új" gombra a kezdéshez</div>
                </div>
              )}
              {(current.movements || []).map((m, idx) => (
                <MovementListItem
                  key={m.id}
                  m={m}
                  idx={idx}
                  total={current.movements.length}
                  isHi={highlightedIdx === idx}
                  onClick={() => setHighlightedIdx(highlightedIdx === idx ? null : idx)}
                  onEdit={() => setEditing({ mode: 'edit', idx })}
                  onDelete={() => deleteMovement(idx)}
                  onMoveUp={() => moveMovement(idx, -1)}
                  onMoveDown={() => moveMovement(idx, +1)}
                />
              ))}
            </div>
          </aside>

          {/* MOBIL: MOZGÁSOK ALATT */}
          <section className="md:hidden border-t border-[#d4c9a8]">
            <div className="px-4 py-2 flex items-center justify-between border-b border-[#d4c9a8] bg-[#f5f0e0]/40">
              <div className="text-xs uppercase tracking-wider text-[#5e5b54] font-medium">
                Mozgások · {current.movements?.length || 0}
              </div>
              <button
                onClick={() => setEditing({ mode: 'new' })}
                className="flex items-center gap-1 px-2 py-1 bg-[#1f3a2c] text-[#faf6ec] rounded text-xs font-medium"
              >
                <Plus size={13} /> Új
              </button>
            </div>
            {editing && (
              <div className="p-3 border-b border-[#d4c9a8] bg-[#fdfaf2]">
                <MovementForm
                  initial={editing.mode === 'edit' ? current.movements[editing.idx] : null}
                  arenaSize={current.arenaSize}
                  onSave={m => editing.mode === 'new' ? addMovement(m) : updateMovement(editing.idx, m)}
                  onCancel={() => setEditing(null)}
                />
              </div>
            )}
            <div>
              {(current.movements || []).map((m, idx) => (
                <MovementListItem
                  key={m.id}
                  m={m}
                  idx={idx}
                  total={current.movements.length}
                  isHi={highlightedIdx === idx}
                  onClick={() => setHighlightedIdx(highlightedIdx === idx ? null : idx)}
                  onEdit={() => setEditing({ mode: 'edit', idx })}
                  onDelete={() => deleteMovement(idx)}
                  onMoveUp={() => moveMovement(idx, -1)}
                  onMoveDown={() => moveMovement(idx, +1)}
                />
              ))}
            </div>
          </section>
        </main>

        {/* MOBIL DRAWER */}
        {drawerOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex no-print">
            <div className="flex-1 bg-black/40" onClick={() => setDrawerOpen(false)} />
            <div className="w-72 bg-[#faf6ec] flex flex-col">
              <div className="p-3 flex items-center justify-between border-b border-[#d4c9a8]">
                <div className="text-sm font-display italic">Programok</div>
                <button onClick={() => setDrawerOpen(false)} className="p-1"><X size={18}/></button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {programs.map(p => (
                  <div
                    key={p.id}
                    onClick={() => { setCurrentId(p.id); setHighlightedIdx(null); setDrawerOpen(false); }}
                    className={`px-3 py-2.5 cursor-pointer border-l-2 ${
                      p.id === currentId
                        ? 'bg-[#f0eadc] border-[#1f3a2c]'
                        : 'border-transparent'
                    }`}
                  >
                    <div className="text-sm font-medium font-display italic">{p.name}</div>
                    <div className="text-[10px] text-[#9a8e75]">
                      {p.movements?.length || 0} mozgás
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-[#d4c9a8] space-y-2">
                <button
                  onClick={newProgram}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-[#1f3a2c] text-[#faf6ec] rounded text-sm"
                >
                  <Plus size={14}/> Új program
                </button>
                <button
                  onClick={() => { exportJSON(); setDrawerOpen(false); }}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-[#d4c9a8] text-[#5e5b54] rounded text-sm"
                >
                  <FileDown size={14}/> Export
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
