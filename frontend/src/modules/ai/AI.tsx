import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bot, Sparkles, Send, User, BrainCircuit, Activity, 
  Calendar, Receipt, Trash2, Copy, Check, Terminal, HeartPulse 
} from "lucide-react";
import { toast } from "sonner";
import { api } from '@/shared/lib/api';
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import { safeLocalStorageParse } from '@/shared/lib/storage';

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const CHAT_STORAGE_KEY = "siara_ai_chat_history";

const defaultMessages: Message[] = [
  {
    role: "assistant",
    content: "Hello Dr. Saikiran! I am Siara AI, your clinical co-pilot. I am fully grounded with secure, real-time access to patient files, appointment calendars, treatment logs, and billing ledgers.\n\nHow can I assist you with clinical calculations or operations today?",
    timestamp: new Date().toISOString(),
  },
];

function loadMessages(): Message[] {
  return safeLocalStorageParse<Message[]>(CHAT_STORAGE_KEY, defaultMessages);
}

const AI: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>(loadMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = "AI Clinical Co-Pilot | Siara Dental";
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // ignore storage errors
    }
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (customMessage?: string) => {
    const textToSend = customMessage || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: textToSend, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    if (!customMessage) setInput("");
    setIsLoading(true);

    try {
      const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
      const response = await api.chatWithAI(textToSend, history);
      
      const assistantMsg: Message = {
        role: "assistant",
        content: response.data,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      toast.error("Failed to get response from clinical AI");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages(defaultMessages);
    toast.success("Consultation history cleared");
  };

  const handleCopyMessage = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(index);
    toast.success("Copied clinical note to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickInquiries = [
    {
      title: "Today's Schedule",
      prompt: "How many appointments do we have today?",
      desc: "Retrieve calendar metrics",
      icon: Calendar,
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
    },
    {
      title: "Patient Operations",
      prompt: "Show me recent patient activity",
      desc: "Fetch clinical logs",
      icon: Activity,
      color: "text-blue-500 bg-blue-500/10 border-blue-500/20"
    },
    {
      title: "Financial Health",
      prompt: "Check pending invoices summary",
      desc: "Calculate active cashflow",
      icon: Receipt,
      color: "text-amber-500 bg-amber-500/10 border-amber-500/20"
    },
    {
      title: "Clinical Advice",
      prompt: "What are the common symptoms of gingivitis?",
      desc: "Standard diagnostics",
      icon: HeartPulse,
      color: "text-purple-500 bg-purple-500/10 border-purple-500/20"
    }
  ];

  // If chat only contains the initial system message, we consider it "empty" and show the gorgeous centered landing grid!
  const isChatEmpty = messages.length <= 1;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.3 }}
      className="flex h-[calc(100vh-7.5rem)] flex-col space-y-3 overflow-hidden w-full max-w-5xl mx-auto"
    >
      {/* Premium Header - Compact & Clean */}
      <div className="flex items-center justify-between shrink-0 px-2">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 shadow-inner">
            <BrainCircuit className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-heading font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/95 to-orange-500/90 leading-tight">
              Siara Clinical Co-Pilot
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className="text-[9px] uppercase tracking-tight bg-primary/5 border-primary/20 text-primary py-0 px-1.5 h-4.5 font-bold gap-1 shrink-0">
                <Terminal className="h-2.5 w-2.5" />
                Gemini 3.1
              </Badge>
              <div className="flex items-center gap-1 bg-green-500/5 px-1.5 py-0 rounded-full border border-green-500/20 h-4.5">
                <div className="h-1 w-1 rounded-full bg-green-500 animate-ping" />
                <span className="text-[9px] text-green-600 dark:text-green-400 font-bold uppercase tracking-tight">Grounded</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleClearChat}
          className="text-[11px] font-bold text-muted-foreground border-border/60 hover:text-destructive hover:bg-destructive/5 transition-all flex items-center gap-1 h-8 px-2.5 shrink-0"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear Chat
        </Button>
      </div>

      {/* Unified Single Page Container */}
      <Card className="flex-1 border-border/40 flex flex-col shadow-xl shadow-primary/5 bg-background/50 backdrop-blur-md overflow-hidden min-h-0">
        
        {/* Chat Canvas Timeline */}
        <div 
          className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 min-h-0 custom-scrollbar flex flex-col" 
          ref={scrollRef}
        >
          <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col">
            
            {/* Conditional Dynamic Landing Centerpiece */}
            {isChatEmpty ? (
              <div className="flex-1 flex flex-col justify-center items-center py-6 space-y-8">
                
                {/* pulsing medical orb centerpiece */}
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-col items-center text-center space-y-3"
                >
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 shadow-lg">
                    <div className="absolute inset-0 rounded-2xl border border-primary/20 animate-ping opacity-60" />
                    <Bot className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-heading font-extrabold tracking-tight text-foreground">
                      How can I assist your workflow today, Dr. Saikiran?
                    </h2>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 font-medium leading-relaxed">
                      Analyze radiology records, reconcile active payment ledgers, optimize treatment templates, or get verified clinical guidance instantly.
                    </p>
                  </div>
                </motion.div>

                {/* Gorgeous Centered 2x2 Grid of Quick Inquiries */}
                <motion.div 
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-3.5 w-full max-w-3xl"
                >
                  {quickInquiries.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(s.prompt)}
                      disabled={isLoading}
                      className="text-left p-4 rounded-xl border border-border/40 bg-background/80 hover:bg-muted/40 hover:border-primary/30 transition-all duration-300 group flex items-start gap-4 text-xs shadow-sm hover:shadow-md"
                    >
                      <div className={`p-2 rounded-lg border shrink-0 ${s.color} transition-transform group-hover:scale-105`}>
                        <s.icon className="h-4.5 w-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground/90 tracking-tight text-sm leading-none">{s.title}</p>
                        <p className="text-[11px] text-muted-foreground font-mono leading-normal mt-1 italic">"{s.prompt}"</p>
                      </div>
                    </button>
                  ))}
                </motion.div>
                
              </div>
            ) : (
              /* Chat Message list */
              <div className="space-y-5 flex-1">
                <AnimatePresence initial={false}>
                  {messages.map((m, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`flex gap-3 max-w-[85%] ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                        
                        {/* Avatar */}
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-sm relative ${
                          m.role === "user" 
                            ? "bg-primary border-primary text-primary-foreground" 
                            : "bg-background border-primary/20 text-primary"
                        }`}>
                          {m.role === "user" ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <>
                              <div className="absolute inset-0 rounded-full border border-primary/30 animate-pulse" />
                              <Bot className="h-4 w-4" />
                            </>
                          )}
                        </div>

                        {/* Message bubble */}
                        <div className={`space-y-0.5 ${m.role === "user" ? "items-end" : "items-start"}`}>
                          <div className={`relative rounded-xl px-4 py-3 text-xs shadow-sm leading-relaxed border transition-all ${
                            m.role === "user" 
                              ? "bg-gradient-to-br from-primary via-primary to-orange-600 text-white rounded-tr-none border-primary/20" 
                              : "bg-white dark:bg-muted/40 border-border/40 rounded-tl-none border-l-4 border-l-primary/50 text-foreground group/bubble"
                          }`}>
                            {m.content.split('\n').map((line, idx) => (
                              <p key={idx} className={line.trim() ? "mb-2 last:mb-0" : "h-1"}>
                                {line.split('**').map((chunk, chunkIdx) => (
                                  chunkIdx % 2 === 1 ? <strong key={chunkIdx} className="font-extrabold text-foreground dark:text-white underline decoration-primary/20 decoration-2">{chunk}</strong> : chunk
                                ))}
                              </p>
                            ))}

                            {/* Copy button */}
                            {m.role === "assistant" && (
                              <div className="absolute top-1.5 right-1.5 opacity-0 group-hover/bubble:opacity-100 transition-opacity duration-200">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-5.5 w-5.5 bg-background border border-border/60 hover:bg-muted rounded-md"
                                  onClick={() => handleCopyMessage(m.content, i)}
                                >
                                  {copiedId === i ? (
                                    <Check className="h-2.5 w-2.5 text-green-500" />
                                  ) : (
                                    <Copy className="h-2.5 w-2.5 text-muted-foreground" />
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Timestamp */}
                          <p className="text-[8px] text-muted-foreground font-mono px-1">
                            {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>

                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Glowing Typing Indicator */}
                {isLoading && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="flex justify-start"
                  >
                    <div className="flex gap-3 max-w-[85%] items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background border border-primary/20 text-primary relative shrink-0">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="flex items-center gap-1.5 bg-muted/40 px-3.5 py-2.5 rounded-xl rounded-tl-none border border-border/30">
                        <span className="text-[10px] text-muted-foreground font-semibold mr-0.5">Co-Pilot is thinking</span>
                        <div className="flex gap-1">
                          <div className="h-1 w-1 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                          <div className="h-1 w-1 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                          <div className="h-1 w-1 rounded-full bg-primary animate-bounce" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
            
          </div>
        </div>

        {/* Centered Floating Chat Bar Input */}
        <div className="border-t border-border/40 bg-background/95 p-4 shrink-0 w-full">
          <div className="max-w-4xl w-full mx-auto">
            <div className="relative flex items-center gap-2">
              <Input
                placeholder="Ask clinical logs, schedules, or accounts..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                className="pr-12 h-11 bg-background/90 border-border/60 focus-visible:ring-primary shadow-inner rounded-xl font-medium placeholder:text-muted-foreground/60 text-xs"
              />
              <Button 
                size="icon" 
                onClick={() => handleSend()} 
                disabled={isLoading || !input.trim()}
                className="absolute right-1.5 h-8.5 w-8.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-md transition-all hover:scale-105"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
            
            <div className="mt-2 flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse shrink-0" />
                <p className="text-[9px] text-muted-foreground font-semibold">
                  Secure Clinical AI. Always confirm diagnostics and signatures.
                </p>
              </div>
              <span className="text-[8px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded border border-border/30 shrink-0">
                Enter to send
              </span>
            </div>
          </div>
        </div>

      </Card>
    </motion.div>
  );
};

export default AI;
