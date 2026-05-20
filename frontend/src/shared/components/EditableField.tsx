import React, { useMemo, useState } from 'react';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Button } from '@/shared/ui/button';
import { Check, Pencil, X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

type Props = {
  label: string;
  value: string;
  onSave: (next: string) => void;
  type?: string;
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
          type === 'textarea' ? (
            <Textarea
              autoFocus
              value={draft}
              onChange={(e) => {
                let val = e.target.value;
                val = val.split('\n').map(line => line.charAt(0).toUpperCase() + line.slice(1)).join('\n');
                setDraft(val);
              }}
              placeholder={placeholder}
              className="mt-1"
              disabled={disabled}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.shiftKey)) {
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
            <Input
              autoFocus
              type={type}
              value={draft}
              onChange={(e) => {
                let val = e.target.value;
                if (type === 'text') {
                  val = val.split('\n').map(line => line.charAt(0).toUpperCase() + line.slice(1)).join('\n');
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
          )
        ) : (
          <p className={cn(
            "mt-1 text-sm font-medium",
            type === 'textarea' ? "whitespace-pre-wrap" : "truncate"
          )}>
            {value || '—'}
          </p>
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

