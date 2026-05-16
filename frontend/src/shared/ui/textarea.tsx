import * as React from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useVoiceInput } from '@/shared/hooks/useVoiceInput';
import { cn } from '@/shared/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  showVoice?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, showVoice = true, onChange, ...props }, ref) => {
    const internalRef = React.useRef<HTMLTextAreaElement>(null);
    React.useImperativeHandle(ref, () => internalRef.current!);

    const { isRecording, isProcessing, toggleRecording } = useVoiceInput((text) => {
      if (internalRef.current) {
        const start = internalRef.current.selectionStart || 0;
        const end = internalRef.current.selectionEnd || 0;
        const value = internalRef.current.value;
        const newValue = value.substring(0, start) + text + value.substring(end);
        
        const event = {
          target: { ...internalRef.current, value: newValue },
          currentTarget: { ...internalRef.current, value: newValue },
        } as unknown as React.ChangeEvent<HTMLTextAreaElement>;
        
        if (onChange) onChange(event);
        internalRef.current.value = newValue;
      }
    });

    return (
      <div className="relative w-full group">
        <textarea
          className={cn(
            "flex min-h-[120px] w-full rounded-2xl border border-border/70 bg-white/80 px-4 py-3 text-sm text-foreground shadow-sm backdrop-blur-sm transition-all duration-300 placeholder:text-muted-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:border-primary/30 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-card/80 pr-10",
            isRecording && "border-red-400 ring-2 ring-red-400/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]",
            isProcessing && "border-primary/50 animate-pulse",
            className
          )}
          ref={internalRef}
          onChange={onChange}
          {...props}
        />
        {showVoice && (
          <div className="absolute right-3 top-3 flex items-center gap-1.5">
            <AnimatePresence mode="wait">
              {isProcessing ? (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="p-1.5"
                >
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </motion.div>
              ) : (
                <motion.button
                  key="voice-trigger"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleRecording();
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "p-1.5 rounded-full transition-all duration-300 relative",
                    isRecording 
                      ? "bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]" 
                      : "text-muted-foreground hover:text-primary hover:bg-muted opacity-0 group-hover:opacity-100 focus:opacity-100"
                  )}
                  title={isRecording ? "Stop recording" : "Speech to text"}
                >
                  {isRecording && (
                    <motion.div
                      layoutId="pulsing-ring-textarea"
                      initial={{ scale: 0.8, opacity: 0.5 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                      className="absolute inset-0 rounded-full bg-red-500"
                    />
                  )}
                  {isRecording ? <MicOff className="h-4 w-4 relative z-10" /> : <Mic className="h-4 w-4 relative z-10" />}
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";

export { Textarea };
