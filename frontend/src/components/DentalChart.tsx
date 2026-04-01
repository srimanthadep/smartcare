import React, { useState } from 'react';
import { ToothCondition, ToothRecord } from '@/types';

// FDI tooth numbering: quadrants 1-4, teeth 1-8 per quadrant
const UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
const UPPER_LEFT  = [21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_LEFT  = [38, 37, 36, 35, 34, 33, 32, 31];
const LOWER_RIGHT = [41, 42, 43, 44, 45, 46, 47, 48];

const CONDITION_COLORS: Record<ToothCondition, string> = {
  healthy:     'hsl(170, 60%, 45%)',
  caries:      'hsl(0, 70%, 55%)',
  filling:     'hsl(220, 65%, 55%)',
  crown:       'hsl(45, 85%, 55%)',
  root_canal:  'hsl(280, 55%, 50%)',
  extraction:  'hsl(0, 0%, 70%)',
  missing:     'hsl(0, 0%, 88%)',
  implant:     'hsl(200, 80%, 50%)',
  bridge:      'hsl(30, 70%, 55%)',
  veneer:      'hsl(160, 50%, 55%)',
  sealant:     'hsl(50, 60%, 60%)',
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
  isMolar: boolean;
  isUpper: boolean;
}

const ToothSVG: React.FC<ToothProps> = ({ number, condition, isSelected, onClick, isMolar, isUpper }) => {
  const fill = condition === 'missing' ? 'transparent' : CONDITION_COLORS[condition];
  const stroke = isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))';
  const strokeWidth = isSelected ? 2.5 : 1;
  const size = isMolar ? 36 : 28;
  const r = size / 2 - 2;

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      {/* Tooth shape */}
      {isMolar ? (
        <rect
          x={-size / 2} y={-size / 2}
          width={size} height={size}
          rx={6} ry={6}
          fill={fill} stroke={stroke} strokeWidth={strokeWidth}
          opacity={condition === 'missing' ? 0.3 : 1}
        />
      ) : (
        <circle
          cx={0} cy={0} r={r}
          fill={fill} stroke={stroke} strokeWidth={strokeWidth}
          opacity={condition === 'missing' ? 0.3 : 1}
        />
      )}
      {/* Root lines */}
      {condition !== 'missing' && (
        <line
          x1={0} y1={isUpper ? size / 2 : -size / 2}
          x2={0} y2={isUpper ? size / 2 + 8 : -size / 2 - 8}
          stroke={CONDITION_COLORS[condition]} strokeWidth={2} opacity={0.5}
        />
      )}
      {/* Cross for extraction */}
      {condition === 'extraction' && (
        <>
          <line x1={-6} y1={-6} x2={6} y2={6} stroke="hsl(0, 70%, 45%)" strokeWidth={2} />
          <line x1={6} y1={-6} x2={-6} y2={6} stroke="hsl(0, 70%, 45%)" strokeWidth={2} />
        </>
      )}
      {/* Tooth number */}
      <text
        x={0} y={isUpper ? -size / 2 - 8 : size / 2 + 13}
        textAnchor="middle"
        fontSize={9}
        fill="hsl(var(--muted-foreground))"
        fontFamily="var(--font-heading)"
      >
        {number}
      </text>
    </g>
  );
};

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

  const renderRow = (numbers: number[], isUpper: boolean, yOffset: number) => {
    const startX = 60;
    const spacing = 48;
    return numbers.map((num, i) => {
      const isMolar = num % 10 >= 6;
      return (
        <g key={num} transform={`translate(${startX + i * spacing}, ${yOffset})`}>
          <ToothSVG
            number={num}
            condition={getCondition(num)}
            isSelected={selectedTooth === num}
            onClick={() => setSelectedTooth(selectedTooth === num ? null : num)}
            isMolar={isMolar}
            isUpper={isUpper}
          />
        </g>
      );
    });
  };

  const selected = selectedTooth ? getRecord(selectedTooth) : undefined;
  const selectedCondition = selectedTooth ? getCondition(selectedTooth) : 'healthy';
  const quadrantLabel = selectedTooth
    ? selectedTooth < 20 ? 'Upper Right' : selectedTooth < 30 ? 'Upper Left' : selectedTooth < 40 ? 'Lower Left' : 'Lower Right'
    : '';

  return (
    <div className="space-y-4">
      {/* SVG Chart */}
      <div className="overflow-x-auto rounded-lg border border-border/50 bg-card p-4">
        <svg viewBox="0 0 830 280" className="w-full max-w-3xl mx-auto" style={{ minWidth: 600 }}>
          {/* Labels */}
          <text x="415" y="20" textAnchor="middle" fontSize="12" fill="hsl(var(--muted-foreground))" fontFamily="var(--font-heading)" fontWeight="600">UPPER ARCH</text>
          <text x="415" y="270" textAnchor="middle" fontSize="12" fill="hsl(var(--muted-foreground))" fontFamily="var(--font-heading)" fontWeight="600">LOWER ARCH</text>

          {/* Quadrant labels */}
          <text x="20" y="85" fontSize="10" fill="hsl(var(--muted-foreground))" fontFamily="var(--font-heading)">Q1</text>
          <text x="800" y="85" fontSize="10" fill="hsl(var(--muted-foreground))" fontFamily="var(--font-heading)">Q2</text>
          <text x="800" y="205" fontSize="10" fill="hsl(var(--muted-foreground))" fontFamily="var(--font-heading)">Q3</text>
          <text x="20" y="205" fontSize="10" fill="hsl(var(--muted-foreground))" fontFamily="var(--font-heading)">Q4</text>

          {/* Midline */}
          <line x1="415" y1="35" x2="415" y2="255" stroke="hsl(var(--border))" strokeWidth={1} strokeDasharray="4 4" />

          {/* Upper teeth */}
          <g transform="translate(0, 80)">
            {renderRow(UPPER_RIGHT, true, 0)}
            <g transform={`translate(${48 * 8}, 0)`}>
              {renderRow(UPPER_LEFT, true, 0)}
            </g>
          </g>

          {/* Lower teeth */}
          <g transform="translate(0, 200)">
            {renderRow(LOWER_RIGHT, false, 0)}
            <g transform={`translate(${48 * 8}, 0)`}>
              {renderRow(LOWER_LEFT, false, 0)}
            </g>
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(CONDITION_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs">
            <span
              className="inline-block h-3 w-3 rounded-sm border border-border/50"
              style={{ backgroundColor: CONDITION_COLORS[key as ToothCondition], opacity: key === 'missing' ? 0.3 : 1 }}
            />
            <span className="text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* Selected tooth panel */}
      {selectedTooth && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-heading font-semibold">
                Tooth #{selectedTooth} — {TOOTH_NAMES[selectedTooth] || 'Unknown'}
              </p>
              <p className="text-xs text-muted-foreground">{quadrantLabel}</p>
            </div>
            <span
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border"
              style={{ borderColor: CONDITION_COLORS[selectedCondition] + '40', backgroundColor: CONDITION_COLORS[selectedCondition] + '15', color: CONDITION_COLORS[selectedCondition] }}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CONDITION_COLORS[selectedCondition] }} />
              {CONDITION_LABELS[selectedCondition]}
            </span>
          </div>

          {!readOnly && (
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(CONDITION_LABELS) as ToothCondition[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCondition(selectedTooth, c)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                    selectedCondition === c
                      ? 'ring-2 ring-primary/50 border-primary'
                      : 'border-border/50 hover:border-border'
                  }`}
                  style={{
                    backgroundColor: selectedCondition === c ? CONDITION_COLORS[c] + '20' : undefined,
                    color: selectedCondition === c ? CONDITION_COLORS[c] : undefined,
                  }}
                >
                  {CONDITION_LABELS[c]}
                </button>
              ))}
            </div>
          )}

          {selected?.notes && (
            <p className="text-sm text-muted-foreground">{selected.notes}</p>
          )}
          {selected?.date && (
            <p className="text-xs text-muted-foreground">Last updated: {selected.date}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default DentalChart;
