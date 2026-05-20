import React, { useState } from 'react';
import { ToothCondition, ToothRecord } from '@/types';
import { UPPER_TEETH, LOWER_TEETH } from './ToothPaths';

// FDI tooth numbering: quadrants 1-4, teeth 1-8 per quadrant
const UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
const UPPER_LEFT  = [21, 22, 23, 24, 25, 26, 27, 28];
// Lower teeth need to be [48..41] and [31..38]
const LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41];
const LOWER_LEFT  = [31, 32, 33, 34, 35, 36, 37, 38];

const CONDITION_COLORS: Record<ToothCondition, string> = {
  healthy:     '#E2E8F0', // Replaced with enamel-like color below
  caries:      '#EF4444',
  filling:     '#3B82F6',
  crown:       '#EAB308',
  root_canal:  '#A855F7',
  extraction:  '#EF4444',
  missing:     '#94A3B8',
  implant:     '#0EA5E9',
  bridge:      '#F97316',
  veneer:      '#10B981',
  sealant:     '#FDE047',
};

const CONDITION_LABELS: Record<ToothCondition, string> = {
  healthy: 'Healthy', caries: 'Caries', filling: 'Filling', crown: 'Crown',
  root_canal: 'Root Canal', extraction: 'Extracted', missing: 'Missing',
  implant: 'Implant', bridge: 'Bridge', veneer: 'Veneer', sealant: 'Sealant',
};

const TOOTH_NAMES: Record<number, string> = {
  11: 'Central Incisor', 12: 'Lateral Incisor', 13: 'Canine', 14: '1st Premolar',
  15: '2nd Premolar', 16: '1st Molar', 17: '2nd Molar', 18: '3rd Molar (Wisdom)',
  21: 'Central Incisor', 22: 'Lateral Incisor', 23: 'Canine', 24: '1st Premolar',
  25: '2nd Premolar', 26: '1st Molar', 27: '2nd Molar', 28: '3rd Molar (Wisdom)',
  31: 'Central Incisor', 32: 'Lateral Incisor', 33: 'Canine', 34: '1st Premolar',
  35: '2nd Premolar', 36: '1st Molar', 37: '2nd Molar', 38: '3rd Molar (Wisdom)',
  41: 'Central Incisor', 42: 'Lateral Incisor', 43: 'Canine', 44: '1st Premolar',
  45: '2nd Premolar', 46: '1st Molar', 47: '2nd Molar', 48: '3rd Molar (Wisdom)',
};

interface ToothProps {
  number: number;
  condition: ToothCondition;
  isSelected: boolean;
  onClick: () => void;
  isUpper: boolean;
}

const ToothSVG: React.FC<ToothProps> = React.memo(({ number, condition, isSelected, onClick, isUpper }) => {
  const position = number % 10;
  const isRightQuadrant = number < 20 || (number >= 40 && number < 50);
  
  const shape = isUpper ? UPPER_TEETH[position] : LOWER_TEETH[position];
  
  if (!shape) return null; // Safety fallback
  
  const isMissing = condition === 'missing';
  
  // Transform: mirror for right quadrants, rotate for lower arch
  const scaleX = isRightQuadrant ? -1 : 1;
  const scaleY = isUpper ? 1 : -1;
  const transform = `scale(${scaleX}, ${scaleY})`;

  const overlayColor = condition !== 'healthy' && condition !== 'missing' && condition !== 'extraction' 
    ? CONDITION_COLORS[condition] 
    : 'transparent';

  return (
    <g 
      onClick={onClick} 
      style={{ cursor: 'pointer', transition: 'all 0.2s ease-in-out' }}
      className={`group ${isSelected ? 'scale-110' : 'hover:scale-105'}`}
      opacity={isMissing ? 0.2 : 1}
    >
      <g transform={transform}>
        {/* Root */}
        {condition === 'implant' ? (
          <path d="M -3,-5 L 3,-5 L 3,-30 L 0,-35 L -3,-30 Z" fill="#94A3B8" stroke="#475569" strokeWidth="1" />
        ) : (
          <path 
            d={shape.root} 
            fill={isMissing ? 'transparent' : 'url(#rootGradient)'} 
            stroke={isSelected ? 'hsl(var(--primary))' : '#CBD5E1'} 
            strokeWidth={isSelected ? "1.5" : "0.75"} 
            className="transition-colors duration-200"
          />
        )}
        
        {/* Crown */}
        <path 
          d={shape.crown} 
          fill={isMissing ? 'transparent' : (condition === 'crown' ? '#FDE047' : 'url(#enamelGradient)')} 
          stroke={isSelected ? 'hsl(var(--primary))' : '#94A3B8'} 
          strokeWidth={isSelected ? "2" : "1"} 
          className="transition-colors duration-200"
        />

        {/* Condition Overlay (Filling, Caries, Veneer, Sealant) */}
        {overlayColor !== 'transparent' && condition !== 'root_canal' && condition !== 'crown' && condition !== 'implant' && (
           <circle cx="0" cy="12" r="5" fill={overlayColor} opacity="0.8" />
        )}
        
        {/* Root Canal Indicator */}
        {condition === 'root_canal' && (
           <line x1="0" y1="5" x2="0" y2="-25" stroke={CONDITION_COLORS.root_canal} strokeWidth="2" strokeDasharray="2 2" />
        )}
      </g>
      
      {/* Extraction Cross */}
      {condition === 'extraction' && (
        <g stroke={CONDITION_COLORS.extraction} strokeWidth="3" opacity="0.9">
          <line x1="-10" y1="-10" x2="10" y2="25" />
          <line x1="10" y1="-10" x2="-10" y2="25" />
        </g>
      )}

      {/* Hover/Selection Ring */}
      {isSelected && (
        <circle cx="0" cy="0" r="28" fill="transparent" stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="4 4" className="animate-spin-slow" />
      )}

      {/* Tooth Number Label */}
      <text
        x={0} y={isUpper ? -45 : 45}
        textAnchor="middle"
        fontSize={10}
        fill={isSelected ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
        fontWeight={isSelected ? "bold" : "normal"}
        fontFamily="var(--font-heading)"
      >
        {number}
      </text>
    </g>
  );
});

interface DentalChartProps {
  teeth: ToothRecord[];
  onTeethChange: (teeth: ToothRecord[]) => void;
  readOnly?: boolean;
}

const DentalChart: React.FC<DentalChartProps> = ({ teeth, onTeethChange, readOnly = false }) => {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);

  const getCondition = (num: number): ToothCondition => {
    const record = teeth.find((t) => t.toothNumber === num);
    return record?.condition || 'healthy';
  };

  const getRecord = (num: number): ToothRecord | undefined => {
    return teeth.find((t) => t.toothNumber === num);
  };

  const setCondition = (num: number, condition: ToothCondition) => {
    if (readOnly) return;
    const existing = teeth.filter((t) => t.toothNumber !== num);
    if (condition === 'healthy') {
      onTeethChange(existing);
    } else {
      onTeethChange([...existing, { toothNumber: num, condition, date: new Date().toISOString().slice(0, 10) }]);
    }
  };

  const renderRow = (numbers: number[], isUpper: boolean) => {
    const startX = 60;
    const spacing = 42;
    return numbers.map((num, i) => (
      <g key={num} transform={`translate(${startX + i * spacing}, 0)`}>
        <ToothSVG
          number={num}
          condition={getCondition(num)}
          isSelected={selectedTooth === num}
          onClick={() => setSelectedTooth(selectedTooth === num ? null : num)}
          isUpper={isUpper}
        />
      </g>
    ));
  };

  const selected = selectedTooth ? getRecord(selectedTooth) : undefined;
  const selectedCondition = selectedTooth ? getCondition(selectedTooth) : 'healthy';
  const quadrantLabel = selectedTooth
    ? selectedTooth < 20 ? 'Upper Right' : selectedTooth < 30 ? 'Upper Left' : selectedTooth < 40 ? 'Lower Left' : 'Lower Right'
    : '';

  return (
    <div className="space-y-6">
      {/* SVG Chart */}
      <div className="overflow-x-auto rounded-xl border border-border/60 bg-gradient-to-b from-card to-background p-4 shadow-sm" style={{ touchAction: "pan-x pinch-zoom" }}>
        <svg viewBox="0 0 850 340" className="mx-auto w-full max-w-4xl" style={{ minWidth: 600 }}>
          <defs>
            {/* Realistic Enamel Gradient */}
            <linearGradient id="enamelGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="70%" stopColor="#F8FAFC" />
              <stop offset="100%" stopColor="#E2E8F0" />
            </linearGradient>
            
            {/* Root Dentin Gradient */}
            <linearGradient id="rootGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFF1F2" />
              <stop offset="100%" stopColor="#FFE4E6" />
            </linearGradient>

            {/* Gum line gradient */}
            <linearGradient id="gumGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="50%" stopColor="#FDA4AF" stopOpacity="0.4" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>

          {/* Labels */}
          <text x="425" y="25" textAnchor="middle" fontSize="13" fill="hsl(var(--muted-foreground))" fontFamily="var(--font-heading)" className="font-semibold tracking-widest uppercase">Maxillary (Upper Arch)</text>
          <text x="425" y="325" textAnchor="middle" fontSize="13" fill="hsl(var(--muted-foreground))" fontFamily="var(--font-heading)" className="font-semibold tracking-widest uppercase">Mandibular (Lower Arch)</text>

          {/* Quadrant labels */}
          <text x="25" y="110" fontSize="14" fill="hsl(var(--muted-foreground))" fontFamily="var(--font-heading)" fontWeight="bold" opacity="0.3">Q1</text>
          <text x="825" y="110" fontSize="14" fill="hsl(var(--muted-foreground))" fontFamily="var(--font-heading)" fontWeight="bold" opacity="0.3">Q2</text>
          <text x="825" y="240" fontSize="14" fill="hsl(var(--muted-foreground))" fontFamily="var(--font-heading)" fontWeight="bold" opacity="0.3">Q3</text>
          <text x="25" y="240" fontSize="14" fill="hsl(var(--muted-foreground))" fontFamily="var(--font-heading)" fontWeight="bold" opacity="0.3">Q4</text>

          {/* Midline */}
          <line x1="425" y1="40" x2="425" y2="300" stroke="hsl(var(--border))" strokeWidth={1.5} strokeDasharray="6 6" opacity="0.5" />

          {/* Gum Lines */}
          <rect x="40" y="105" width="770" height="15" fill="url(#gumGradient)" rx="7.5" />
          <rect x="40" y="220" width="770" height="15" fill="url(#gumGradient)" rx="7.5" />

          {/* Upper teeth */}
          <g transform="translate(10, 110)">
            {renderRow(UPPER_RIGHT, true)}
            <g transform={`translate(${42 * 8 + 30}, 0)`}>
              {renderRow(UPPER_LEFT, true)}
            </g>
          </g>

          {/* Lower teeth */}
          <g transform="translate(10, 230)">
            {renderRow(LOWER_RIGHT, false)}
            <g transform={`translate(${42 * 8 + 30}, 0)`}>
              {renderRow(LOWER_LEFT, false)}
            </g>
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 p-4 bg-muted/30 rounded-lg border border-border/50">
        {Object.entries(CONDITION_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-2 text-sm font-medium">
            <span
              className="inline-block h-3.5 w-3.5 rounded-full shadow-sm"
              style={{ backgroundColor: key === 'healthy' ? '#E2E8F0' : CONDITION_COLORS[key as ToothCondition], opacity: key === 'missing' ? 0.3 : 1 }}
            />
            <span className="text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* Selected tooth panel */}
      {selectedTooth && (
        <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-transparent p-5 space-y-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading text-lg font-bold text-foreground">
                Tooth #{selectedTooth} — {TOOTH_NAMES[selectedTooth] || 'Unknown'}
              </h3>
              <p className="text-sm font-medium text-muted-foreground">{quadrantLabel}</p>
            </div>
            <span
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold shadow-sm border"
              style={{ borderColor: CONDITION_COLORS[selectedCondition] + '40', backgroundColor: CONDITION_COLORS[selectedCondition] + '15', color: CONDITION_COLORS[selectedCondition] === '#E2E8F0' ? 'hsl(var(--foreground))' : CONDITION_COLORS[selectedCondition] }}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CONDITION_COLORS[selectedCondition] === '#E2E8F0' ? '#94A3B8' : CONDITION_COLORS[selectedCondition] }} />
              {CONDITION_LABELS[selectedCondition]}
            </span>
          </div>

          {!readOnly && (
            <div className="flex flex-wrap gap-2 pt-2">
              {(Object.keys(CONDITION_LABELS) as ToothCondition[]).map((c) => {
                const color = c === 'healthy' ? '#94A3B8' : CONDITION_COLORS[c];
                return (
                  <button
                    key={c}
                    onClick={() => setCondition(selectedTooth, c)}
                    className={`px-3 py-1.5 rounded-md text-sm font-semibold border transition-all duration-200 ${
                      selectedCondition === c
                        ? 'ring-2 ring-offset-1 border-transparent shadow-sm'
                        : 'border-border/60 hover:border-border hover:bg-muted/50'
                    }`}
                    style={{
                      backgroundColor: selectedCondition === c ? color : 'transparent',
                      color: selectedCondition === c ? 'white' : 'hsl(var(--foreground))',
                      borderColor: selectedCondition === c ? color : undefined,
                      '--tw-ring-color': color
                    } as React.CSSProperties}
                  >
                    {CONDITION_LABELS[c]}
                  </button>
                )
              })}
            </div>
          )}

          {selected?.notes && (
            <p className="text-sm text-foreground bg-background/50 p-3 rounded-md border border-border/50">{selected.notes}</p>
          )}
          {selected?.date && (
            <p className="text-xs font-medium text-muted-foreground">Last updated: {new Date(selected.date).toLocaleDateString()}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default DentalChart;
