import * as React from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useVoiceInput } from '@/shared/hooks/useVoiceInput';
import { cn } from '@/shared/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  showVoice?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, showVoice = true, onChange, ...props }, ref) => {
    const internalRef = React.useRef<HTMLInputElement>(null);
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
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        
        if (onChange) onChange(event);
        internalRef.current.value = newValue;
      }
    });

    return (
      <div className="relative w-full group">
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-all duration-200",
            showVoice && type !== "password" && type !== "number" && type !== "date" && "pr-10",
            isRecording && "border-red-400 ring-2 ring-red-400/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]",
            isProcessing && "border-primary/50 animate-pulse",
            className,
          )}
          ref={internalRef}
          onChange={onChange}
          {...props}
        />
        {showVoice && type !== "password" && type !== "number" && type !== "date" && (
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
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
                      layoutId="pulsing-ring"
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
Input.displayName = "Input";

export { Input };
