import React, { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, Pencil, X } from 'lucide-react';

type Props = {
  label: string;
  value: string;
  onSave: (next: string) => void;
  type?: React.HTMLInputTypeAttribute;
  placeholder?: string;
  disabled?: boolean;
};

const EditableField: React.FC<Props> = ({ label, value, onSave, type = 'text', placeholder, disabled }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const changed = useMemo(() => draft.trim() !== value.trim(), [draft, value]);

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-card p-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        {editing ? (
          <Input
            autoFocus
            type={type}
            value={draft}
            onChange={(e) => {
              let val = e.target.value;
              if (type === 'text' || type === 'textarea') {
                const minorWords = ["a", "an", "the", "and", "as", "at", "but", "by", "for", "if", "in", "nor", "of", "on", "or", "so", "to", "up", "yet"];
                val = val.split(' ').map((word, index) => {
                  if (index > 0 && minorWords.includes(word.toLowerCase())) {
                    return word.toLowerCase();
                  }
                  return word.charAt(0).toUpperCase() + word.slice(1);
                }).join(' ');
              }
              setDraft(val);
            }}
            placeholder={placeholder}
            className="mt-1"
            disabled={disabled}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (changed) {
                  onSave(draft);
                  setEditing(false);
                }
              } else if (e.key === 'Escape') {
                setDraft(value);
                setEditing(false);
              }
            }}
          />
        ) : (
          <p className="mt-1 text-sm font-medium truncate">{value || '—'}</p>
        )}
      </div>

      {!disabled && (
        <div className="flex items-center gap-1 pt-3">
          {editing ? (
            <>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => {
                  setDraft(value);
                  setEditing(false);
                }}
                aria-label={`Cancel editing ${label}`}
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  onSave(draft);
                  setEditing(false);
                }}
                disabled={!changed}
                aria-label={`Save ${label}`}
              >
                <Check className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => {
                setDraft(value);
                setEditing(true);
              }}
              aria-label={`Edit ${label}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default EditableField;

