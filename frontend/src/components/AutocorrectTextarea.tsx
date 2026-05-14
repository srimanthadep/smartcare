
import * as React from "react";
import { Textarea, TextareaProps } from "./ui/textarea";
import { getSpellchecker, addToUserDictionary, Spellchecker } from "@/lib/spellcheck";
import * as Comlink from 'comlink';
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { Plus, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const AutocorrectTextarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ onChange, onKeyDown, value, ...props }, ref) => {
    const internalRef = React.useRef<HTMLTextAreaElement>(null);
    React.useImperativeHandle(ref, () => internalRef.current!);
    
    const [checker, setChecker] = React.useState<Comlink.Remote<Spellchecker> | null>(null);
    const [suggestions, setSuggestions] = React.useState<string[]>([]);
    const [misspelledWord, setMisspelledWord] = React.useState("");
    const [popoverOpen, setPopoverOpen] = React.useState(false);
    const [popoverPos, setPopoverPos] = React.useState({ top: 0, left: 0 });
    const [isEnabled, setIsEnabled] = React.useState(true);

    React.useEffect(() => {
      const init = async () => {
        if (import.meta.env.DEV) console.log("AutocorrectTextarea: Initializing spellchecker...");
        const instance = await getSpellchecker();
        if (import.meta.env.DEV) console.log("AutocorrectTextarea: Checker methods:", Object.keys(instance));
        setChecker(() => instance);
        if (import.meta.env.DEV) console.log("AutocorrectTextarea: Spellchecker ready.");
      };
      init();

      // Check settings
      const settings = localStorage.getItem('smartcare_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setIsEnabled(parsed.autocorrectEnabled !== false);
      }
    }, []);

    const handleSpellCheck = async (text: string, cursorPosition: number) => {
      if (!checker || !isEnabled) return;
      
      if (import.meta.env.DEV) console.log("AutocorrectTextarea: checker state is present");
      if (typeof checker.check !== 'function') {
        if (import.meta.env.DEV) console.error("AutocorrectTextarea: checker.check is NOT a function!", checker);
      }

      const beforeCursor = text.substring(0, cursorPosition);
      // Find the last word before the boundary char more robustly
      const words = beforeCursor.split(/[\s,.;:!?\n\r]+/);
      const lastWord = words.filter(w => w.length > 0).pop() || "";
      
      if (import.meta.env.DEV) console.log(`AutocorrectTextarea: Identified word to check: "${lastWord}"`);

      if (!lastWord || lastWord.length < 2) {
        if (import.meta.env.DEV) console.log("AutocorrectTextarea: Word too short or empty, skipping.");
        return;
      }

      try {
        const isCorrect = await checker.check(lastWord);
        if (import.meta.env.DEV) console.log(`AutocorrectTextarea: Result for "${lastWord}": ${isCorrect}`);
        
        if (!isCorrect) {
          const results = await checker.suggest(lastWord);
          if (import.meta.env.DEV) console.log(`AutocorrectTextarea: "${lastWord}" is misspelled. Suggestions:`, results);
          
          if (results.length === 1) {
            if (import.meta.env.DEV) console.log(`AutocorrectTextarea: Auto-correcting "${lastWord}" to "${results[0]}"`);
            // Silent autocorrect
            const start = beforeCursor.lastIndexOf(lastWord);
            const newValue = text.substring(0, start) + results[0] + text.substring(cursorPosition - 1);
            
            if (internalRef.current) {
              internalRef.current.value = newValue;
              const event = {
                target: { ...internalRef.current, value: newValue },
                currentTarget: { ...internalRef.current, value: newValue },
              } as unknown as React.ChangeEvent<HTMLTextAreaElement>;
              if (onChange) onChange(event);
              
              // Move cursor after the corrected word and boundary char
              const newPos = start + results[0].length + 1;
              internalRef.current.setSelectionRange(newPos, newPos);
            }
          } else if (results.length > 0) {
            // Low confidence - show popover
            setMisspelledWord(lastWord);
            setSuggestions(results.slice(0, 3));
            
            if (internalRef.current) {
              const coords = getCaretCoordinates(internalRef.current, cursorPosition);
              setPopoverPos({ top: coords.top, left: coords.left });
              setPopoverOpen(true);
            }
          }
        }
      } catch (err) {
        console.error("AutocorrectTextarea: Spellcheck error:", err);
      }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      const cursor = e.target.selectionStart || 0;
      const lastChar = val[cursor - 1];

      if (import.meta.env.DEV) console.log(`AutocorrectTextarea: Input changed. Last char: "${lastChar}"`);

      if (onChange) onChange(e);

      // Check boundary characters (space, punctuation, newline)
      if (/[\s,.;:!?\n\r]/.test(lastChar)) {
        if (import.meta.env.DEV) console.log("AutocorrectTextarea: Boundary detected, triggering check...");
        handleSpellCheck(val, cursor);
      }
    };

    const applySuggestion = (suggestion: string) => {
      if (!internalRef.current) return;
      
      const text = internalRef.current.value;
      const cursor = internalRef.current.selectionStart || 0;
      const beforeCursor = text.substring(0, cursor);
      const start = beforeCursor.lastIndexOf(misspelledWord);
      
      const newValue = text.substring(0, start) + suggestion + text.substring(start + misspelledWord.length);
      
      internalRef.current.value = newValue;
      const event = {
        target: { ...internalRef.current, value: newValue },
        currentTarget: { ...internalRef.current, value: newValue },
      } as unknown as React.ChangeEvent<HTMLTextAreaElement>;
      if (onChange) onChange(event);
      
      const newPos = start + suggestion.length;
      internalRef.current.setSelectionRange(newPos, newPos);
      
      setPopoverOpen(false);
    };

    const addToDictionary = async () => {
      await addToUserDictionary(misspelledWord);
      setPopoverOpen(false);
    };

    return (
      <div className="relative w-full">
        <Textarea
          ref={internalRef}
          onChange={handleInputChange}
          onKeyDown={onKeyDown}
          value={value}
          {...props}
        />
        
        {popoverOpen && (
          <div 
            className="absolute z-50 bg-popover text-popover-foreground border rounded-lg shadow-lg p-2 flex flex-col gap-1 min-w-[120px]"
            style={{ 
              top: popoverPos.top + 25, 
              left: Math.min(popoverPos.left, (internalRef.current?.clientWidth || 0) - 120) 
            }}
          >
            <p className="text-[10px] text-muted-foreground px-1 mb-1">Suggestions for "{misspelledWord}"</p>
            {suggestions.map((s) => (
              <Button 
                key={s} 
                variant="ghost" 
                size="sm" 
                className="justify-start h-8 text-xs font-medium"
                onClick={() => applySuggestion(s)}
              >
                {s}
              </Button>
            ))}
            <div className="border-t my-1" />
            <Button 
              variant="ghost" 
              size="sm" 
              className="justify-start h-8 text-xs text-primary"
              onClick={addToDictionary}
            >
              <Plus className="h-3 w-3 mr-2" /> Add to dictionary
            </Button>
          </div>
        )}
      </div>
    );
  }
);

// Helper to get caret coordinates for popover positioning
function getCaretCoordinates(element: HTMLTextAreaElement, position: number) {
  const div = document.createElement('div');
  const style = window.getComputedStyle(element);
  
  for (const prop of style) {
    div.style[prop as any] = style[prop as any];
  }
  
  div.style.position = 'absolute';
  div.style.visibility = 'hidden';
  div.style.whiteSpace = 'pre-wrap';
  div.style.wordBreak = 'break-word';
  div.style.width = element.clientWidth + 'px';
  div.style.height = 'auto';
  
  const text = element.value.substring(0, position);
  div.textContent = text;
  
  const span = document.createElement('span');
  span.textContent = element.value.substring(position) || '.';
  div.appendChild(span);
  
  document.body.appendChild(div);
  const { offsetTop: top, offsetLeft: left } = span;
  document.body.removeChild(div);
  
  return { top, left };
}

AutocorrectTextarea.displayName = "AutocorrectTextarea";
