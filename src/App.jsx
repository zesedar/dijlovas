import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, Edit2, ChevronUp, ChevronDown, Copy, X, Eye, EyeOff, FileDown, FileUp, BookOpen, Folder, Printer, Check, AlertCircle } from 'lucide-react';

// ════════════════════════════════════════════════════════════
// PÁLYAADATOK – csak 20×40 m kis pálya
// ════════════════════════════════════════════════════════════
const ARENA_LEN = 40;

const LETTERS = {
  A: { x: 10, y: 40 }, K: { x: 20, y: 34 }, E: { x: 20, y: 20 },
  H: { x: 20, y: 6 },  C: { x: 10, y: 0 },  M: { x: 0, y: 6 },
  B: { x: 0, y: 20 },  F: { x: 0, y: 34 },
  D: { x: 10, y: 34 }, X: { x: 10, y: 20 }, G: { x: 10, y: 6 },
};

// Karám menti pontok sorrendben (CW = óramutató járásával, Y le van fordítva)
const PERIMETER = [
  { name: 'A', x: 10, y: 40 },
  { name: '_AK', x: 20, y: 40, isCorner: true },
  { name: 'K', x: 20, y: 34 },
  { name: 'E', x: 20, y: 20 },
  { name: 'H', x: 20, y: 6 },
  { name: '_HC', x: 20, y: 0, isCorner: true },
  { name: 'C', x: 10, y: 0 },
  { name: '_CM', x: 0, y: 0, isCorner: true },
  { name: 'M', x: 0, y: 6 },
  { name: 'B', x: 0, y: 20 },
  { name: 'F', x: 0, y: 34 },
  { name: '_FA', x: 0, y: 40, isCorner: true },
];

const INTERIOR_LETTERS = ['D', 'X', 'G'];

// ════════════════════════════════════════════════════════════
// MOZGÁSTÍPUS-OPCIÓK
// ════════════════════════════════════════════════════════════
const MOVEMENT_TYPES = [
  { id: 'straight',         name: 'Egyenes vonal',          mode: 'straight' },
  { id: 'centerline',       name: 'Középen',                mode: 'centerline' },
  { id: 'half_school',      name: 'Félpálya (E↔B)',         mode: 'half_school' },
  { id: 'small_circle_8',   name: 'Kiskör (8 m)',           mode: 'circle', diameter: 8 },
  { id: 'small_circle_10',  name: 'Kiskör (10 m)',          mode: 'circle', diameter: 10 },
  { id: 'small_circle_15',  name: 'Kör (15 m)',             mode: 'circle', diameter: 15 },
  { id: 'large_circle',     name: 'Nagykör (20 m)',         mode: 'circle', diameter: 20 },
  { id: 'diagonal',         name: 'Átlóváltás',             mode: 'diagonal' },
  { id: 'half_diagonal',    name: 'Félátlóváltás',          mode: 'half_diagonal' },
  { id: 'change_in_circle', name: 'Körben válts',           mode: 'change_in_circle' },
];

const CENTERLINE_OPTIONS = [
  { id: 'A_C', from: 'A', to: 'C', label: 'A → C (belovaglás)' },
  { id: 'C_A', from: 'C', to: 'A', label: 'C → A (kilovaglás)' },
];

const HALF_SCHOOL_OPTIONS = [
  { id: 'E_B', from: 'E', to: 'B', label: 'E → B' },
  { id: 'B_E', from: 'B', to: 'E', label: 'B → E' },
];

const DIAGONAL_OPTIONS = [
  { id: 'KXM', from: 'K', to: 'M', label: 'KXM (jobb-alsó → bal-felső)' },
  { id: 'FXH', from: 'F', to: 'H', label: 'FXH (bal-alsó → jobb-felső)' },
  { id: 'HXF', from: 'H', to: 'F', label: 'HXF (jobb-felső → bal-alsó)' },
  { id: 'MXK', from: 'M', to: 'K', label: 'MXK (bal-felső → jobb-alsó)' },
];

const VALID_DIAGONAL_STARTS = ['K', 'F', 'H', 'M'];

// ════════════════════════════════════════════════════════════
// KONTEXTUS-ÉRZÉKENY LOGIKA – mit lehet csinálni egy adott pontból
// ════════════════════════════════════════════════════════════
const START_POSITION = 'X';   // a ló mindig X-ből indul

// Alapértelmezett "tipikus" végpont az adott kezdőpontból
const DEFAULT_NEXT = {
  X: 'C',  A: 'C',  C: 'A',
  K: 'E',  E: 'B',  H: 'C',
  F: 'B',  B: 'E',  M: 'B',
  D: 'A',  G: 'C',
};
function getDefaultEndFor(pos) {
  return DEFAULT_NEXT[pos] || 'C';
}

// Adott pontból elérhető-e az adott mozgástípus?
function isTypeAvailableFrom(typeId, pos) {
  switch (typeId) {
    case 'straight':         return true;
    case 'centerline':       return pos === 'A' || pos === 'C';
    case 'half_school':      return pos === 'E' || pos === 'B';
    case 'small_circle_8':
    case 'small_circle_10':
    case 'small_circle_15':
    case 'large_circle':     return true;
    case 'diagonal':         return VALID_DIAGONAL_STARTS.includes(pos);
    case 'half_diagonal':    return VALID_DIAGONAL_STARTS.includes(pos);
    case 'change_in_circle': return ['A','C','E','B'].includes(pos);
    default:                 return true;
  }
}

// Amikor a típust választjuk, a paraméterek automatikusan beállnak a kezdőpont szerint
function autoParamsForType(typeId, pos, prev) {
  const td = MOVEMENT_TYPES.find(t => t.id === typeId);
  const updates = { type: typeId };
  switch (td?.mode) {
    case 'straight':
      updates.startLetter = pos;
      // Ha az előző state-ben volt értelmes endLetter (és nem azonos a kezdőponttal), tartsuk meg
      updates.endLetter = (prev?.endLetter && prev.endLetter !== pos)
        ? prev.endLetter
        : getDefaultEndFor(pos);
      break;
    case 'half_diagonal':
      updates.startLetter = pos;
      updates.endLetter   = pos === 'X' ? 'C' : 'X'; // sarokból X-be megy
      break;
    case 'centerline':
      updates.choice = pos === 'A' ? 'A_C' : 'C_A';
      break;
    case 'half_school':
      updates.choice = pos === 'E' ? 'E_B' : 'B_E';
      break;
    case 'diagonal': {
      const opt = DIAGONAL_OPTIONS.find(d => d.from === pos);
      updates.choice = opt?.id || 'KXM';
      break;
    }
    case 'circle':
    case 'change_in_circle':
      updates.centerLetter = pos;
      break;
    default: break;
  }
  return updates;
}

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

// ════════════════════════════════════════════════════════════
// LOCAL STORAGE
// ════════════════════════════════════════════════════════════
const STORAGE_PREFIX = 'dijlovas:program:';

function listPrograms() {
  const out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIX)) {
      try {
        const v = localStorage.getItem(key);
        if (v) out.push(migrateProgram(JSON.parse(v)));
      } catch (e) { /* skip */ }
    }
  }
  return out;
}
function saveProgram(p)        { localStorage.setItem(STORAGE_PREFIX + p.id, JSON.stringify(p)); }
function deleteStoredProgram(id) { localStorage.removeItem(STORAGE_PREFIX + id); }

// ════════════════════════════════════════════════════════════
// MIGRATION – régi programok / mozgások konvertálása
// ════════════════════════════════════════════════════════════
function migrateMovement(m) {
  const t = MOVEMENT_TYPES.find(t => t.id === m.type);
  if (!t) return m;
  const out = { ...m };
  if (t.mode === 'centerline' && !m.choice && m.startLetter && m.endLetter) {
    out.choice = CENTERLINE_OPTIONS.find(o => o.from === m.startLetter && o.to === m.endLetter)?.id || 'A_C';
  }
  if (t.mode === 'half_school' && !m.choice && m.startLetter && m.endLetter) {
    out.choice = HALF_SCHOOL_OPTIONS.find(o => o.from === m.startLetter && o.to === m.endLetter)?.id || 'E_B';
  }
  if (t.mode === 'diagonal' && !m.choice && m.startLetter && m.endLetter) {
    out.choice = DIAGONAL_OPTIONS.find(o => o.from === m.startLetter && o.to === m.endLetter)?.id || 'KXM';
  }
  return out;
}

function isMovementValid(m) {
  const checks = [m.startLetter, m.endLetter, m.centerLetter].filter(Boolean);
  return checks.every(l => Object.keys(LETTERS).includes(l));
}

function migrateProgram(p) {
  return {
    ...p,
    arenaSize: '20x40',
    movements: (p.movements || []).map(migrateMovement).filter(isMovementValid),
  };
}

// ════════════════════════════════════════════════════════════
// PATH GENERÁLÁS – segédfüggvények
// ════════════════════════════════════════════════════════════
const isInterior = (letter) => INTERIOR_LETTERS.includes(letter);

function perimeterPathBetween(startLetter, endLetter, direction) {
  const len = PERIMETER.length;
  const startIdx = PERIMETER.findIndex(p => p.name === startLetter);
  const endIdx   = PERIMETER.findIndex(p => p.name === endLetter);
  if (startIdx < 0 || endIdx < 0) return [];
  const points = [];
  let i = startIdx;
  if (direction === 'cw') {
    while (i !== endIdx) { points.push(PERIMETER[i]); i = (i + 1) % len; }
    points.push(PERIMETER[endIdx]);
  } else {
    while (i !== endIdx) { points.push(PERIMETER[i]); i = (i - 1 + len) % len; }
    points.push(PERIMETER[endIdx]);
  }
  return points;
}

function pathLength(points) {
  let l = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i-1].x;
    const dy = points[i].y - points[i-1].y;
    l += Math.sqrt(dx*dx + dy*dy);
  }
  return l;
}

function pointsToSvgPath(points) {
  return points.map((p, i) => i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`).join(' ');
}

function getCircleCenter(letterPos, radius) {
  if (letterPos.x === 10 && letterPos.y === 0)         return { x: 10, y: radius };
  if (letterPos.x === 10 && letterPos.y === ARENA_LEN) return { x: 10, y: ARENA_LEN - radius };
  if (letterPos.x === 0)                                return { x: radius, y: letterPos.y };
  if (letterPos.x === 20)                               return { x: 20 - radius, y: letterPos.y };
  return { ...letterPos };
}

// ════════════════════════════════════════════════════════════
// PATH GENERÁTOROK
// ════════════════════════════════════════════════════════════
function generateStraightPath(m) {
  const start = LETTERS[m.startLetter];
  const end   = LETTERS[m.endLetter];
  if (!start || !end) return '';

  const sInt = isInterior(m.startLetter);
  const eInt = isInterior(m.endLetter);

  // (1) Mindkettő belső – egyenes a középvonalon
  if (sInt && eInt) return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;

  // (2) Mindkettő karám – karám mentén, sarkokon át
  if (!sInt && !eInt) {
    const cw  = perimeterPathBetween(m.startLetter, m.endLetter, 'cw');
    const ccw = perimeterPathBetween(m.startLetter, m.endLetter, 'ccw');
    const variant = m.variant || 'auto';
    let chosen;
    if      (variant === 'cw')  chosen = cw;
    else if (variant === 'ccw') chosen = ccw;
    else if (variant === 'alt') chosen = pathLength(cw) <= pathLength(ccw) ? ccw : cw;
    else                        chosen = pathLength(cw) <= pathLength(ccw) ? cw : ccw;
    return pointsToSvgPath(chosen);
  }

  // (3) Egyik belső, másik karám
  const interiorLetter = sInt ? m.startLetter : m.endLetter;
  const exteriorLetter = sInt ? m.endLetter   : m.startLetter;
  const interiorPoint  = LETTERS[interiorLetter];
  const exteriorPoint  = LETTERS[exteriorLetter];

  const exitMode = m.exitMode || 'centerline';
  let intermediateLetter;
  if (exitMode === 'centerline') {
    const dA = Math.abs(exteriorPoint.y - LETTERS.A.y);
    const dC = Math.abs(exteriorPoint.y - LETTERS.C.y);
    intermediateLetter = dA <= dC ? 'A' : 'C';
  } else {
    intermediateLetter = exteriorPoint.x === 0 ? 'B' : 'E';
  }

  if (intermediateLetter === exteriorLetter) {
    return sInt
      ? `M ${interiorPoint.x} ${interiorPoint.y} L ${exteriorPoint.x} ${exteriorPoint.y}`
      : `M ${exteriorPoint.x} ${exteriorPoint.y} L ${interiorPoint.x} ${interiorPoint.y}`;
  }

  const cw  = perimeterPathBetween(intermediateLetter, exteriorLetter, 'cw');
  const ccw = perimeterPathBetween(intermediateLetter, exteriorLetter, 'ccw');
  const variant = m.variant || 'auto';
  let perimChosen;
  if      (variant === 'cw')  perimChosen = cw;
  else if (variant === 'ccw') perimChosen = ccw;
  else if (variant === 'alt') perimChosen = pathLength(cw) <= pathLength(ccw) ? ccw : cw;
  else                        perimChosen = pathLength(cw) <= pathLength(ccw) ? cw : ccw;

  const allPoints = sInt
    ? [interiorPoint, ...perimChosen]
    : [...perimChosen.slice().reverse(), interiorPoint];

  return pointsToSvgPath(allPoints);
}

function generateCenterlinePath(m) {
  const o = CENTERLINE_OPTIONS.find(c => c.id === m.choice);
  if (!o) return '';
  const a = LETTERS[o.from], b = LETTERS[o.to];
  return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
}

function generateHalfSchoolPath(m) {
  const o = HALF_SCHOOL_OPTIONS.find(h => h.id === m.choice);
  if (!o) return '';
  const a = LETTERS[o.from], b = LETTERS[o.to];
  return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
}

function generateDiagonalPath(m) {
  const o = DIAGONAL_OPTIONS.find(d => d.id === m.choice);
  if (!o) return '';
  const a = LETTERS[o.from], b = LETTERS[o.to], X = LETTERS.X;
  return `M ${a.x} ${a.y} L ${X.x} ${X.y} L ${b.x} ${b.y}`;
}

function generateHalfDiagonalPath(m) {
  const a = LETTERS[m.startLetter], b = LETTERS[m.endLetter];
  if (!a || !b) return '';
  return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
}

function generateCirclePath(m, diameter) {
  const ctr = LETTERS[m.centerLetter];
  if (!ctr) return '';
  const r = diameter / 2;
  const c = getCircleCenter(ctr, r);
  return `M ${c.x - r} ${c.y} A ${r} ${r} 0 1 1 ${c.x + r} ${c.y} A ${r} ${r} 0 1 1 ${c.x - r} ${c.y}`;
}

function generateChangeInCirclePath(m) {
  const ctr = LETTERS[m.centerLetter];
  if (!ctr) return '';
  const big = getCircleCenter(ctr, 10);
  const horizontal = ctr.x === 10;
  return horizontal
    ? `M 20 ${big.y} A 5 5 0 0 1 10 ${big.y} A 5 5 0 0 0 0 ${big.y}`
    : `M ${big.x} ${big.y - 10} A 5 5 0 0 0 ${big.x} ${big.y} A 5 5 0 0 1 ${big.x} ${big.y + 10}`;
}

function generatePath(m) {
  const t = MOVEMENT_TYPES.find(t => t.id === m.type);
  if (!t) return '';
  switch (t.mode) {
    case 'straight':         return generateStraightPath(m);
    case 'centerline':       return generateCenterlinePath(m);
    case 'half_school':      return generateHalfSchoolPath(m);
    case 'diagonal':         return generateDiagonalPath(m);
    case 'half_diagonal':    return generateHalfDiagonalPath(m);
    case 'circle':           return generateCirclePath(m, t.diameter);
    case 'change_in_circle': return generateChangeInCirclePath(m);
    default:                 return '';
  }
}

// ════════════════════════════════════════════════════════════
// MOZGÁS START / END BETŰJE (folytonosság-ellenőrzés)
// ════════════════════════════════════════════════════════════
function getMovementStart(m) {
  const t = MOVEMENT_TYPES.find(t => t.id === m.type);
  if (!t) return null;
  switch (t.mode) {
    case 'straight':
    case 'half_diagonal':    return m.startLetter;
    case 'centerline':       return CENTERLINE_OPTIONS.find(c => c.id === m.choice)?.from;
    case 'half_school':      return HALF_SCHOOL_OPTIONS.find(h => h.id === m.choice)?.from;
    case 'diagonal':         return DIAGONAL_OPTIONS.find(d => d.id === m.choice)?.from;
    case 'circle':
    case 'change_in_circle': return m.centerLetter;
    default:                 return null;
  }
}

function getMovementEnd(m) {
  const t = MOVEMENT_TYPES.find(t => t.id === m.type);
  if (!t) return null;
  switch (t.mode) {
    case 'straight':
    case 'half_diagonal':    return m.endLetter;
    case 'centerline':       return CENTERLINE_OPTIONS.find(c => c.id === m.choice)?.to;
    case 'half_school':      return HALF_SCHOOL_OPTIONS.find(h => h.id === m.choice)?.to;
    case 'diagonal':         return DIAGONAL_OPTIONS.find(d => d.id === m.choice)?.to;
    case 'circle':
    case 'change_in_circle': return m.centerLetter;
    default:                 return null;
  }
}

function getMovementMidpoint(m) {
  const t = MOVEMENT_TYPES.find(t => t.id === m.type);
  if (!t) return null;
  switch (t.mode) {
    case 'straight':
    case 'half_diagonal': {
      const a = LETTERS[m.startLetter], b = LETTERS[m.endLetter];
      if (!a || !b) return null;
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
    case 'centerline': {
      const o = CENTERLINE_OPTIONS.find(c => c.id === m.choice);
      if (!o) return null;
      const a = LETTERS[o.from], b = LETTERS[o.to];
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
    case 'half_school': {
      const o = HALF_SCHOOL_OPTIONS.find(h => h.id === m.choice);
      if (!o) return null;
      const a = LETTERS[o.from], b = LETTERS[o.to];
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
    case 'diagonal':         return LETTERS.X;
    case 'circle':           return getCircleCenter(LETTERS[m.centerLetter], t.diameter / 2);
    case 'change_in_circle': return getCircleCenter(LETTERS[m.centerLetter], 10);
    default:                 return null;
  }
}

// ════════════════════════════════════════════════════════════
// SVG PÁLYA
// ════════════════════════════════════════════════════════════
function Arena({ movements, highlightedIdx, showAll, previewMovement }) {
  const padX = 4.5, padY = 4.5;
  return (
    <svg viewBox={`${-padX} ${-padY} ${20 + padX * 2} ${ARENA_LEN + padY * 2}`} className="w-full h-full" style={{ maxHeight: '100%' }}>
      <rect x={-padX} y={-padY} width={20 + padX * 2} height={ARENA_LEN + padY * 2} fill="#faf6ec" />
      <rect x="0" y="0" width="20" height={ARENA_LEN} fill="#ffffff" stroke="#1a1a18" strokeWidth="0.18" />
      <rect x="1" y="1" width="18" height={ARENA_LEN - 2} fill="none" stroke="#d4c9a8" strokeWidth="0.05" strokeDasharray="0.6 0.4" />
      <line x1="10" y1="0" x2="10" y2={ARENA_LEN} stroke="#c9bfa3" strokeWidth="0.05" strokeDasharray="0.5 0.5" />
      <line x1="0" y1={ARENA_LEN / 2} x2="20" y2={ARENA_LEN / 2} stroke="#c9bfa3" strokeWidth="0.05" strokeDasharray="0.5 0.5" />
      <g>
        <line x1="9.3" y1={ARENA_LEN / 2 - 0.7} x2="10.7" y2={ARENA_LEN / 2 + 0.7} stroke="#a89880" strokeWidth="0.1" />
        <line x1="9.3" y1={ARENA_LEN / 2 + 0.7} x2="10.7" y2={ARENA_LEN / 2 - 0.7} stroke="#a89880" strokeWidth="0.1" />
      </g>

      {movements.map((m, idx) => {
        if (!showAll && idx !== highlightedIdx) return null;
        const isHi   = idx === highlightedIdx;
        const path   = generatePath(m);
        if (!path) return null;
        const gait   = GAITS.find(g => g.id === m.gait);
        const color  = gait?.color || '#5e5b54';
        const dashed = gait?.dash;
        return (
          <path key={m.id} d={path} fill="none" stroke={color}
                strokeWidth={isHi ? 0.55 : 0.35}
                strokeOpacity={(showAll && !isHi && highlightedIdx != null) ? 0.32 : 0.92}
                strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray={dashed ? '0.7 0.4' : undefined} />
        );
      })}

      {movements.map((m, idx) => {
        if (!showAll && idx !== highlightedIdx) return null;
        const isHi  = idx === highlightedIdx;
        const mid   = getMovementMidpoint(m);
        if (!mid) return null;
        const gait  = GAITS.find(g => g.id === m.gait);
        const color = gait?.color || '#5e5b54';
        return (
          <g key={`n-${m.id}`}>
            <circle cx={mid.x} cy={mid.y} r={isHi ? 1.3 : 1.05}
                    fill="#faf6ec" stroke={color}
                    strokeWidth={isHi ? 0.25 : 0.18}
                    opacity={(showAll && !isHi && highlightedIdx != null) ? 0.5 : 1} />
            <text x={mid.x} y={mid.y}
                  fontSize={isHi ? 1.4 : 1.15}
                  fontFamily="'Fraunces', Georgia, serif"
                  fontWeight="600" textAnchor="middle" dominantBaseline="central"
                  fill={color}
                  opacity={(showAll && !isHi && highlightedIdx != null) ? 0.6 : 1}>
              {idx + 1}
            </text>
          </g>
        );
      })}

      {/* ÉLŐ PREVIEW – a most szerkesztett mozgás szaggatott zöld vonalként */}
      {previewMovement && (() => {
        const path = generatePath(previewMovement);
        if (!path) return null;
        const start = LETTERS[getMovementStart(previewMovement)];
        return (
          <g>
            <path d={path} fill="none" stroke="#2e5f3e"
                  strokeWidth={0.55}
                  strokeOpacity={0.7}
                  strokeLinecap="round" strokeLinejoin="round"
                  strokeDasharray="0.5 0.4" />
            {start && (
              <circle cx={start.x} cy={start.y} r={0.7}
                      fill="#2e5f3e" fillOpacity={0.7} />
            )}
          </g>
        );
      })()}

      {Object.entries(LETTERS).map(([letter, pos]) => {
        const onLeft   = pos.x === 0;
        const onRight  = pos.x === 20;
        const onShortA = pos.y === ARENA_LEN;
        const onShortC = pos.y === 0;
        const onCenter = pos.x === 10 && !onShortA && !onShortC;
        let tx = pos.x, ty = pos.y;
        if (onLeft)        tx = -2.5;
        else if (onRight)  tx = 22.5;
        else if (onShortA) ty = ARENA_LEN + 3;
        else if (onShortC) ty = -2.2;
        else if (onCenter) tx = 11.7;
        return (
          <g key={letter}>
            {!onCenter && (
              <line
                x1={onLeft ? 0 : onRight ? 20 : pos.x}
                y1={onShortA ? ARENA_LEN : onShortC ? 0 : pos.y}
                x2={onLeft ? -1.2 : onRight ? 21.2 : pos.x}
                y2={onShortA ? ARENA_LEN + 1.2 : onShortC ? -1.2 : pos.y}
                stroke="#1a1a18" strokeWidth="0.12"
              />
            )}
            <text x={tx} y={ty}
                  fontSize={onCenter ? 2 : 2.6}
                  fontFamily="'Fraunces', Georgia, serif"
                  fontWeight={onCenter ? 500 : 700}
                  textAnchor="middle" dominantBaseline="central"
                  fill={onCenter ? '#9a8e75' : '#1a1a18'}
                  fontStyle={onCenter ? 'italic' : 'normal'}>
              {letter}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ════════════════════════════════════════════════════════════
// MOZGÁS-SZERKESZTŐ FORM
// ════════════════════════════════════════════════════════════
function buildPayloadFromState(state, currentPos, initialId) {
  const td = MOVEMENT_TYPES.find(t => t.id === state.type);
  const payload = {
    id: initialId || Date.now().toString(36) + Math.random().toString(36).slice(2,6),
    type: state.type,
    gait: state.gait,
    notes: state.notes,
  };
  if (!td) return payload;
  switch (td.mode) {
    case 'straight':
      payload.startLetter = currentPos;
      payload.endLetter   = state.endLetter;
      payload.exitMode    = state.exitMode;
      payload.variant     = state.variant;
      break;
    case 'centerline':
    case 'half_school':
    case 'diagonal':
      payload.choice = state.choice;
      break;
    case 'half_diagonal':
      payload.startLetter = currentPos;
      payload.endLetter   = state.endLetter;
      break;
    case 'circle':
    case 'change_in_circle':
      payload.centerLetter = currentPos;
      break;
  }
  return payload;
}

function MovementForm({ initial, currentPos, onSave, onCancel, onPreview }) {
  const letterKeys = Object.keys(LETTERS);

  // A szerkesztett mozgás kezdőpontja: ha edit módban van, az initial-ből, egyébként a currentPos
  const effectivePos = initial
    ? (getMovementStart(initial) || currentPos || START_POSITION)
    : (currentPos || START_POSITION);

  const [state, setState] = useState(() => {
    if (initial) return { ...initial };
    // Kezdő típus: ha a sarokponton van → szabad választás, default 'straight'
    const initType = 'straight';
    const auto = autoParamsForType(initType, effectivePos, null);
    return {
      type:        initType,
      startLetter: effectivePos,
      endLetter:   auto.endLetter || getDefaultEndFor(effectivePos),
      centerLetter: effectivePos,
      choice:      auto.choice || null,
      variant:     'auto',
      exitMode:    'centerline',
      gait:        'trot_working',
      notes:       '',
    };
  });

  const update = (patch) => setState(s => ({ ...s, ...patch }));
  const typeDef = MOVEMENT_TYPES.find(t => t.id === state.type);

  // Élő preview: ha a state változik, küldünk egy "ideiglenes mozgást" felfelé
  useEffect(() => {
    if (!onPreview) return;
    const payload = buildPayloadFromState(state, effectivePos, initial?.id || 'preview');
    onPreview(payload);
  }, [state, effectivePos]);

  // Form bezáráskor töröljük a preview-t
  useEffect(() => () => { if (onPreview) onPreview(null); }, []);

  function handleSelectType(newType) {
    const updates = autoParamsForType(newType, effectivePos, state);
    update(updates);
  }

  function handleSave() {
    onSave(buildPayloadFromState(state, effectivePos, initial?.id));
  }

  const inputClass = "w-full px-3 py-2 bg-paper border border-[#d4c9a8] rounded text-charcoal focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest/30 transition";
  const labelClass = "block text-[11px] font-medium text-[#5e5b54] uppercase tracking-wider mb-1";

  const straightInfo = useMemo(() => {
    if (typeDef?.mode !== 'straight') return null;
    const sInt = isInterior(effectivePos);
    const eInt = isInterior(state.endLetter);
    return {
      bothInterior: sInt && eInt,
      bothExterior: !sInt && !eInt,
      mixed:        sInt !== eInt,
    };
  }, [typeDef, effectivePos, state.endLetter]);

  return (
    <div className="space-y-3">
      {/* AKTUÁLIS POZÍCIÓ – kiemelt badge */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#f0eadc] border border-[#d4c9a8] rounded">
        <span className="text-[11px] uppercase tracking-wider text-[#5e5b54] font-medium">Innen indulsz</span>
        <span className="px-2.5 py-0.5 bg-forest text-cream rounded font-display italic font-bold tracking-wider text-sm">
          {effectivePos}
        </span>
        {effectivePos === START_POSITION && !initial && (
          <span className="text-[11px] text-[#9a8e75] italic">(belovaglás után)</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelClass}>Mit csinálsz innen?</label>
          <select className={inputClass} value={state.type} onChange={e => handleSelectType(e.target.value)}>
            {MOVEMENT_TYPES.map(t => {
              const available = isTypeAvailableFrom(t.id, effectivePos);
              return (
                <option key={t.id} value={t.id} disabled={!available}>
                  {t.name}{!available ? '  — innen nem' : ''}
                </option>
              );
            })}
          </select>
        </div>

        {typeDef.mode === 'straight' && (
          <>
            <div className="col-span-2">
              <label className={labelClass}>Hová mész egyenesen?</label>
              <select className={inputClass} value={state.endLetter} onChange={e => update({ endLetter: e.target.value })}>
                {letterKeys.filter(k => k !== effectivePos).map(k => (
                  <option key={k} value={k}>{k}{isInterior(k) ? ' (belső)' : ''}</option>
                ))}
              </select>
            </div>

            {straightInfo?.bothInterior && (
              <div className="col-span-2 text-[11px] text-[#5e5b54] italic px-1">
                Két belső pont – egyenes a középvonalon.
              </div>
            )}

            {straightInfo?.mixed && (
              <>
                <div className="col-span-2">
                  <label className={labelClass}>Kifelé haladás módja</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button"
                            onClick={() => update({ exitMode: 'centerline' })}
                            className={`px-2 py-2 rounded text-[11px] leading-tight border transition ${
                              state.exitMode === 'centerline'
                                ? 'bg-forest text-cream border-forest'
                                : 'bg-paper border-[#d4c9a8] text-[#5e5b54] hover:bg-[#f0eadc]'
                            }`}>
                      Középvonalon át<br/>
                      <span className="text-[10px] opacity-80">(rövid oldali karámra)</span>
                    </button>
                    <button type="button"
                            onClick={() => update({ exitMode: 'perpendicular' })}
                            className={`px-2 py-2 rounded text-[11px] leading-tight border transition ${
                              state.exitMode === 'perpendicular'
                                ? 'bg-forest text-cream border-forest'
                                : 'bg-paper border-[#d4c9a8] text-[#5e5b54] hover:bg-[#f0eadc]'
                            }`}>
                      Merőlegesen kifelé<br/>
                      <span className="text-[10px] opacity-80">(hosszú oldali karámra)</span>
                    </button>
                  </div>
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Karám menti irány</label>
                  <select className={inputClass} value={state.variant} onChange={e => update({ variant: e.target.value })}>
                    <option value="auto">Rövidebb úton (auto)</option>
                    <option value="alt">Másik (hosszabb) úton</option>
                  </select>
                </div>
              </>
            )}

            {straightInfo?.bothExterior && (
              <div className="col-span-2">
                <label className={labelClass}>Karám menti irány (jobbra / balra)</label>
                <select className={inputClass} value={state.variant} onChange={e => update({ variant: e.target.value })}>
                  <option value="auto">Rövidebb úton (auto)</option>
                  <option value="alt">Másik (hosszabb) úton</option>
                </select>
              </div>
            )}
          </>
        )}

        {typeDef.mode === 'centerline' && (
          <div className="col-span-2 px-2.5 py-2 text-[12px] text-forest italic bg-[#f5f0e0] border border-[#d4c9a8] rounded">
            <strong className="not-italic font-medium">Automatikus:</strong>{' '}
            {effectivePos === 'A' ? 'Belovaglás A → C (középvonalon)' : 'Kilovaglás C → A (középvonalon)'}
          </div>
        )}

        {typeDef.mode === 'half_school' && (
          <div className="col-span-2 px-2.5 py-2 text-[12px] text-forest italic bg-[#f5f0e0] border border-[#d4c9a8] rounded">
            <strong className="not-italic font-medium">Automatikus:</strong>{' '}
            Félpálya {effectivePos === 'E' ? 'E → B' : 'B → E'}
          </div>
        )}

        {typeDef.mode === 'diagonal' && (
          <div className="col-span-2 px-2.5 py-2 text-[12px] text-forest italic bg-[#f5f0e0] border border-[#d4c9a8] rounded">
            <strong className="not-italic font-medium">Automatikus átló:</strong>{' '}
            {DIAGONAL_OPTIONS.find(d => d.id === state.choice)?.label || ''}
          </div>
        )}

        {typeDef.mode === 'half_diagonal' && (
          <div className="col-span-2">
            <label className={labelClass}>Félátló végpontja</label>
            <select className={inputClass} value={state.endLetter} onChange={e => update({ endLetter: e.target.value })}>
              {letterKeys.filter(k => k !== effectivePos).map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
        )}

        {(typeDef.mode === 'circle' || typeDef.mode === 'change_in_circle') && (
          <div className="col-span-2 px-2.5 py-2 text-[12px] text-forest italic bg-[#f5f0e0] border border-[#d4c9a8] rounded">
            <strong className="not-italic font-medium">{typeDef.name}</strong> {effectivePos}-nél
          </div>
        )}

        <div className="col-span-2">
          <label className={labelClass}>Jármód</label>
          <select className={inputClass} value={state.gait} onChange={e => update({ gait: e.target.value })}>
            {GAITS.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>

        <div className="col-span-2">
          <label className={labelClass}>Megjegyzés</label>
          <textarea className={inputClass} rows={2} value={state.notes}
                    onChange={e => update({ notes: e.target.value })}
                    placeholder="pl. átmenet, segítségadás, hangulat..." />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={handleSave}
                className="flex-1 px-4 py-2.5 bg-forest text-cream rounded font-medium hover:bg-[#2a4d3a] transition flex items-center justify-center gap-2">
          <Check size={16} />
          {initial ? 'Mentés' : 'Hozzáadás'}
        </button>
        <button onClick={onCancel}
                className="px-4 py-2.5 bg-transparent border border-[#d4c9a8] text-[#5e5b54] rounded font-medium hover:bg-[#f0eadc] transition">
          Mégse
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MOZGÁS LISTA
// ════════════════════════════════════════════════════════════
function describeMovement(m) {
  const t = MOVEMENT_TYPES.find(t => t.id === m.type);
  if (!t) return 'ismeretlen';
  switch (t.mode) {
    case 'centerline':       return `Középen – ${CENTERLINE_OPTIONS.find(c => c.id === m.choice)?.label || ''}`;
    case 'half_school':      return `Félpálya – ${HALF_SCHOOL_OPTIONS.find(h => h.id === m.choice)?.label || ''}`;
    case 'diagonal':         return `Átló – ${DIAGONAL_OPTIONS.find(d => d.id === m.choice)?.label || ''}`;
    case 'circle':
    case 'change_in_circle': return `${t.name} – ${m.centerLetter}-nél`;
    case 'half_diagonal':
    case 'straight':         return `${t.name} – ${m.startLetter}–${m.endLetter}`;
    default:                 return t.name;
  }
}

function MovementListItem({ m, idx, total, isHi, isContinuous, onClick, onEdit, onDelete, onMoveUp, onMoveDown }) {
  const gait = GAITS.find(g => g.id === m.gait);
  return (
    <div onClick={onClick}
         className={`group relative px-3 py-2.5 border-l-2 cursor-pointer transition ${
           isHi ? 'bg-[#f0eadc] border-forest' : 'bg-transparent border-transparent hover:bg-[#f5f0e0]'
         }`}
         style={{ borderLeftColor: isHi ? gait?.color : 'transparent' }}>
      <div className="flex items-start gap-2.5">
        <div className="flex-none w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5"
             style={{ backgroundColor: '#faf6ec',
                      border: `1.5px solid ${gait?.color || '#5e5b54'}`,
                      color: gait?.color || '#5e5b54' }}>
          {idx + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-charcoal leading-tight truncate flex items-center gap-1.5">
            {!isContinuous && idx > 0 && (
              <span title="Nem folytonos az előző mozgással">
                <AlertCircle size={11} className="text-[#925a1a] flex-none" />
              </span>
            )}
            {describeMovement(m)}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: gait?.color }}>{gait?.name}</div>
          {m.notes && <div className="text-[11px] text-[#5e5b54] italic mt-1 line-clamp-2">{m.notes}</div>}
        </div>
        <div className="flex-none flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition">
          <button onClick={e => { e.stopPropagation(); onMoveUp(); }} disabled={idx === 0}
                  className="p-1 rounded hover:bg-[#e8dfc8] disabled:opacity-30" title="Előre">
            <ChevronUp size={12} />
          </button>
          <button onClick={e => { e.stopPropagation(); onMoveDown(); }} disabled={idx === total - 1}
                  className="p-1 rounded hover:bg-[#e8dfc8] disabled:opacity-30" title="Hátra">
            <ChevronDown size={12} />
          </button>
        </div>
      </div>
      <div className="flex gap-2 mt-1.5 ml-9 opacity-0 group-hover:opacity-100 transition">
        <button onClick={e => { e.stopPropagation(); onEdit(); }}
                className="text-[11px] text-[#5e5b54] hover:text-forest flex items-center gap-1">
          <Edit2 size={11} /> szerkeszt
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete(); }}
                className="text-[11px] text-[#5e5b54] hover:text-[#922c2c] flex items-center gap-1">
          <Trash2 size={11} /> törlés
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// FŐKOMPONENS
// ════════════════════════════════════════════════════════════
export default function App() {
  const [programs, setPrograms]             = useState([]);
  const [currentId, setCurrentId]           = useState(null);
  const [editing, setEditing]               = useState(null);
  const [showAll, setShowAll]               = useState(true);
  const [highlightedIdx, setHighlightedIdx] = useState(null);
  const [drawerOpen, setDrawerOpen]         = useState(false);
  const [loaded, setLoaded]                 = useState(false);
  const [savingState, setSavingState]       = useState('idle');
  const [previewMovement, setPreviewMovement] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    try {
      const list = listPrograms();
      list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      if (list.length === 0) {
        const fresh = {
          id: Date.now().toString(36),
          name: 'Új program', arenaSize: '20x40', level: '',
          movements: [], updatedAt: Date.now(),
        };
        list.push(fresh); saveProgram(fresh);
      }
      setPrograms(list);
      setCurrentId(list[0].id);
    } finally { setLoaded(true); }
  }, []);

  const current = useMemo(() => programs.find(p => p.id === currentId), [programs, currentId]);

  useEffect(() => {
    if (!loaded || !current) return;
    setSavingState('saving');
    const t = setTimeout(() => {
      try { saveProgram(current); setSavingState('saved'); setTimeout(() => setSavingState('idle'), 1200); }
      catch { setSavingState('idle'); }
    }, 400);
    return () => clearTimeout(t);
  }, [current, loaded]);

  const continuityFlags = useMemo(() => {
    if (!current?.movements) return [];
    return current.movements.map((m, idx) => {
      const prevEnd = idx === 0 ? START_POSITION : getMovementEnd(current.movements[idx - 1]);
      const currStart = getMovementStart(m);
      return prevEnd === currStart;
    });
  }, [current]);

  const currentPos = useMemo(() => {
    if (!current) return START_POSITION;
    const ms = current.movements || [];
    if (editing?.mode === 'edit') {
      return editing.idx > 0 ? getMovementEnd(ms[editing.idx - 1]) : START_POSITION;
    }
    return ms.length > 0 ? getMovementEnd(ms[ms.length - 1]) : START_POSITION;
  }, [current, editing]);

  // Preview törlése amikor bezárul a form
  useEffect(() => {
    if (!editing) setPreviewMovement(null);
  }, [editing]);

  function updateCurrent(patch) {
    setPrograms(ps => ps.map(p => p.id === currentId ? { ...p, ...patch, updatedAt: Date.now() } : p));
  }
  function newProgram() {
    const p = { id: Date.now().toString(36) + Math.random().toString(36).slice(2,5),
                name: 'Új program', arenaSize: '20x40', level: '',
                movements: [], updatedAt: Date.now() };
    setPrograms(ps => [p, ...ps]); setCurrentId(p.id);
    setHighlightedIdx(null); setDrawerOpen(false);
  }
  function deleteProgram(id) {
    if (!confirm('Biztosan törlöd ezt a programot?')) return;
    deleteStoredProgram(id);
    setPrograms(ps => {
      const filtered = ps.filter(p => p.id !== id);
      if (filtered.length === 0) {
        const fresh = { id: Date.now().toString(36), name: 'Új program', arenaSize: '20x40',
                        level: '', movements: [], updatedAt: Date.now() };
        saveProgram(fresh); setCurrentId(fresh.id); return [fresh];
      }
      if (id === currentId) setCurrentId(filtered[0].id);
      return filtered;
    });
  }
  function duplicateProgram() {
    if (!current) return;
    const copy = { ...current, id: Date.now().toString(36) + Math.random().toString(36).slice(2,5),
                   name: current.name + ' (másolat)', updatedAt: Date.now() };
    setPrograms(ps => [copy, ...ps]); setCurrentId(copy.id);
  }
  function addMovement(m) {
    updateCurrent({ movements: [...(current.movements || []), m] });
    setEditing(null);
    setHighlightedIdx((current.movements || []).length);
  }
  function updateMovement(idx, m) {
    const list = [...(current.movements || [])]; list[idx] = m;
    updateCurrent({ movements: list }); setEditing(null);
  }
  function deleteMovement(idx) {
    const list = (current.movements || []).filter((_, i) => i !== idx);
    updateCurrent({ movements: list });
    if (highlightedIdx === idx) setHighlightedIdx(null);
  }
  function moveMovement(idx, dir) {
    const list = [...(current.movements || [])];
    const ni = idx + dir;
    if (ni < 0 || ni >= list.length) return;
    [list[idx], list[ni]] = [list[ni], list[idx]];
    updateCurrent({ movements: list });
    if (highlightedIdx === idx) setHighlightedIdx(ni);
    else if (highlightedIdx === ni) setHighlightedIdx(idx);
  }
  function exportJSON() {
    const blob = new Blob([JSON.stringify(current, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = (current.name || 'program').replace(/[^a-z0-9]+/gi, '_') + '.json';
    a.click(); URL.revokeObjectURL(url);
  }
  function importJSON(e) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        const prog = migrateProgram({ ...data,
          id: Date.now().toString(36) + Math.random().toString(36).slice(2,5),
          updatedAt: Date.now() });
        saveProgram(prog);
        setPrograms(ps => [prog, ...ps]); setCurrentId(prog.id);
      } catch { alert('Hibás JSON fájl'); }
    };
    reader.readAsText(file); e.target.value = '';
  }

  if (!loaded || !current) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-cream text-[#5e5b54]">
        <div className="text-3xl font-display italic">Betöltés...</div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-cream font-body text-charcoal flex flex-col">
      <header className="no-print border-b border-[#d4c9a8] bg-[#f5f0e0]/60 backdrop-blur-sm sticky top-0 z-30">
        <div className="px-4 md:px-6 py-3 flex items-center gap-3">
          <button onClick={() => setDrawerOpen(true)}
                  className="md:hidden p-2 hover:bg-[#e8dfc8] rounded transition" title="Programok">
            <Folder size={18} />
          </button>
          <div className="flex-1 min-w-0 flex items-center gap-3">
            <div className="hidden sm:block text-2xl font-display font-semibold tracking-tight text-forest">
              Díjlovagló&nbsp;tervező
            </div>
            <div className="text-[#9a8e75] hidden sm:block">·</div>
            <input type="text" value={current.name}
                   onChange={e => updateCurrent({ name: e.target.value })}
                   className="bg-transparent border-none outline-none text-base md:text-lg font-display italic text-charcoal flex-1 min-w-0 focus:bg-paper focus:px-2 focus:rounded transition"
                   placeholder="Program neve..." />
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#5e5b54] mr-1">
            {savingState === 'saving' && <span className="italic">mentés...</span>}
            {savingState === 'saved'  && <span className="text-forest flex items-center gap-1"><Check size={12}/>mentve</span>}
          </div>
          <button onClick={() => window.print()} className="hidden md:flex p-2 hover:bg-[#e8dfc8] rounded transition text-[#5e5b54]" title="Nyomtatás">
            <Printer size={16} />
          </button>
          <button onClick={exportJSON} className="hidden md:flex p-2 hover:bg-[#e8dfc8] rounded transition text-[#5e5b54]" title="Export JSON">
            <FileDown size={16} />
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="hidden md:flex p-2 hover:bg-[#e8dfc8] rounded transition text-[#5e5b54]" title="Import JSON">
            <FileUp size={16} />
          </button>
          <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={importJSON} />
        </div>
        <div className="px-4 md:px-6 pb-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-xs text-[#9a8e75] italic mr-2">20×40 m kis pálya</span>
          <input type="text" value={current.level}
                 onChange={e => updateCurrent({ level: e.target.value })}
                 placeholder="Szint / kategória (pl. E, A, L, M)"
                 className="bg-paper border border-[#d4c9a8] rounded px-2 py-1 text-xs flex-1 min-w-[120px] max-w-[240px]" />
          <button onClick={() => setShowAll(!showAll)}
                  className="ml-auto flex items-center gap-1.5 text-xs px-2 py-1 hover:bg-[#e8dfc8] rounded transition text-[#5e5b54]">
            {showAll ? <Eye size={13}/> : <EyeOff size={13}/>}
            {showAll ? 'Minden látszik' : 'Csak kiválasztott'}
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row min-h-0">
        <aside className="no-print hidden md:flex flex-col w-56 border-r border-[#d4c9a8] bg-[#f5f0e0]/40">
          <div className="p-3 flex items-center justify-between border-b border-[#d4c9a8]">
            <div className="text-xs uppercase tracking-wider text-[#5e5b54] font-medium">Programok</div>
            <button onClick={newProgram} className="p-1 hover:bg-[#e8dfc8] rounded transition text-forest" title="Új program">
              <Plus size={15} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {programs.map(p => (
              <div key={p.id}
                   onClick={() => { setCurrentId(p.id); setHighlightedIdx(null); }}
                   className={`group px-3 py-2 cursor-pointer border-l-2 transition ${
                     p.id === currentId ? 'bg-[#f0eadc] border-forest' : 'border-transparent hover:bg-[#f5f0e0]'
                   }`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[13px] font-medium truncate font-display italic">{p.name}</div>
                  <button onClick={e => { e.stopPropagation(); deleteProgram(p.id); }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[#e8dfc8] rounded text-[#922c2c]">
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="text-[10px] text-[#9a8e75] mt-0.5">{p.movements?.length || 0} mozgás</div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-[#d4c9a8]">
            <button onClick={duplicateProgram}
                    className="w-full text-xs text-[#5e5b54] hover:text-forest flex items-center justify-center gap-1.5 py-1.5">
              <Copy size={12} /> Aktuális duplikálása
            </button>
          </div>
        </aside>

        <section className="flex-1 flex items-center justify-center p-4 md:p-6 min-h-[400px] print-arena">
          <div className="w-full h-full max-w-md flex items-center justify-center" style={{ aspectRatio: '20/40' }}>
            <Arena movements={current.movements || []} highlightedIdx={highlightedIdx} showAll={showAll} previewMovement={previewMovement} />
          </div>
        </section>

        <aside className="no-print hidden md:flex flex-col w-80 border-l border-[#d4c9a8] bg-[#f5f0e0]/30">
          <div className="p-3 flex items-center justify-between border-b border-[#d4c9a8]">
            <div className="text-xs uppercase tracking-wider text-[#5e5b54] font-medium">
              Mozgások · {current.movements?.length || 0}
            </div>
            <button onClick={() => setEditing({ mode: 'new' })}
                    className="flex items-center gap-1 px-2 py-1 bg-forest text-cream rounded text-xs font-medium hover:bg-[#2a4d3a] transition">
              <Plus size={13} /> Új
            </button>
          </div>
          {editing && (
            <div className="p-3 border-b border-[#d4c9a8] bg-paper">
              <div className="text-xs uppercase tracking-wider text-[#5e5b54] font-medium mb-2">
                {editing.mode === 'new' ? 'Új mozgás' : `${editing.idx + 1}. mozgás szerkesztése`}
              </div>
              <MovementForm
                initial={editing.mode === 'edit' ? current.movements[editing.idx] : null}
                currentPos={currentPos}
                onSave={m => editing.mode === 'new' ? addMovement(m) : updateMovement(editing.idx, m)}
                onCancel={() => setEditing(null)}
                onPreview={setPreviewMovement}
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
                key={m.id} m={m} idx={idx} total={current.movements.length}
                isHi={highlightedIdx === idx}
                isContinuous={continuityFlags[idx]}
                onClick={() => setHighlightedIdx(highlightedIdx === idx ? null : idx)}
                onEdit={() => setEditing({ mode: 'edit', idx })}
                onDelete={() => deleteMovement(idx)}
                onMoveUp={() => moveMovement(idx, -1)}
                onMoveDown={() => moveMovement(idx, +1)}
              />
            ))}
          </div>
        </aside>

        <section className="md:hidden border-t border-[#d4c9a8]">
          <div className="px-4 py-2 flex items-center justify-between border-b border-[#d4c9a8] bg-[#f5f0e0]/40">
            <div className="text-xs uppercase tracking-wider text-[#5e5b54] font-medium">
              Mozgások · {current.movements?.length || 0}
            </div>
            <button onClick={() => setEditing({ mode: 'new' })}
                    className="flex items-center gap-1 px-2 py-1 bg-forest text-cream rounded text-xs font-medium">
              <Plus size={13} /> Új
            </button>
          </div>
          {editing && (
            <div className="p-3 border-b border-[#d4c9a8] bg-paper">
              <MovementForm
                initial={editing.mode === 'edit' ? current.movements[editing.idx] : null}
                currentPos={currentPos}
                onSave={m => editing.mode === 'new' ? addMovement(m) : updateMovement(editing.idx, m)}
                onCancel={() => setEditing(null)}
                onPreview={setPreviewMovement}
              />
            </div>
          )}
          <div>
            {(current.movements || []).map((m, idx) => (
              <MovementListItem
                key={m.id} m={m} idx={idx} total={current.movements.length}
                isHi={highlightedIdx === idx}
                isContinuous={continuityFlags[idx]}
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

      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex no-print">
          <div className="flex-1 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="w-72 bg-cream flex flex-col">
            <div className="p-3 flex items-center justify-between border-b border-[#d4c9a8]">
              <div className="text-sm font-display italic">Programok</div>
              <button onClick={() => setDrawerOpen(false)} className="p-1"><X size={18}/></button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {programs.map(p => (
                <div key={p.id}
                     onClick={() => { setCurrentId(p.id); setHighlightedIdx(null); setDrawerOpen(false); }}
                     className={`px-3 py-2.5 cursor-pointer border-l-2 ${
                       p.id === currentId ? 'bg-[#f0eadc] border-forest' : 'border-transparent'
                     }`}>
                  <div className="text-sm font-medium font-display italic">{p.name}</div>
                  <div className="text-[10px] text-[#9a8e75]">{p.movements?.length || 0} mozgás</div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-[#d4c9a8] space-y-2">
              <button onClick={newProgram}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-forest text-cream rounded text-sm">
                <Plus size={14}/> Új program
              </button>
              <button onClick={() => { exportJSON(); setDrawerOpen(false); }}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-[#d4c9a8] text-[#5e5b54] rounded text-sm">
                <FileDown size={14}/> Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
