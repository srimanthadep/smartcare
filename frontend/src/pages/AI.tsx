import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Sparkles, Send, User, ChevronRight, BrainCircuit, Activity, Calendar, Receipt } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const AI: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello Dr. Saikiran! I am Siara AI, your clinical assistant. I have access to all patient records, appointments, and billing data. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: input, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
      const response = await api.chatWithAI(input, history);
      
      const assistantMsg: Message = {
        role: "assistant",
        content: response.data,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      toast.error("Failed to get response from AI");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    "How many appointments do we have today?",
    "Show me recent patient activity",
    "What are the common symptoms of gingivitis?",
    "Check pending invoices summary",
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-[calc(100vh-10rem)] space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 shadow-inner">
            <BrainCircuit className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">Siara AI Assistant</h1>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider bg-primary/5 border-primary/20 text-primary">Connected to Mistral-Small</Badge>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] text-muted-foreground uppercase font-medium">Real-time Data Access</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0">
        {/* Sidebar Info */}
        <div className="hidden lg:flex flex-col gap-4">
          <Card className="border-border/40 bg-secondary/10 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <Activity className="h-12 w-12" />
            </div>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Capabilities</p>
              <div className="space-y-2">
                {[
                  { icon: Activity, text: "Patient Records", color: "text-blue-500" },
                  { icon: Calendar, text: "Schedules", color: "text-green-500" },
                  { icon: Receipt, text: "Financial Data", color: "text-amber-500" },
                  { icon: Sparkles, text: "Clinical Advice", color: "text-purple-500" },
                ].map((cap, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm font-medium">
                    <cap.icon className={`h-4 w-4 ${cap.color}`} />
                    <span>{cap.text}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Quick Prompts</p>
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => setInput(s)}
                className="w-full text-left p-3 text-xs rounded-xl border border-border/40 bg-background hover:bg-muted/50 hover:border-primary/40 transition-all group flex items-center justify-between"
              >
                <span className="line-clamp-1">{s}</span>
                <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>

        {/* Chat Interface */}
        <Card className="lg:col-span-3 border-border/40 flex flex-col shadow-2xl shadow-primary/5 bg-background/50 backdrop-blur-sm overflow-hidden">
          <ScrollArea className="flex-1 p-4 lg:p-6" ref={scrollRef}>
            <div className="space-y-6">
              <AnimatePresence initial={false}>
                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`flex gap-3 max-w-[85%] ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-sm ${
                        m.role === "user" ? "bg-primary border-primary text-primary-foreground" : "bg-muted border-border"
                      }`}>
                        {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </div>
                      <div className={`space-y-1 ${m.role === "user" ? "items-end" : "items-start"}`}>
                        <div className={`rounded-2xl px-4 py-3 text-sm shadow-sm leading-relaxed ${
                          m.role === "user" 
                            ? "bg-primary text-primary-foreground rounded-tr-none" 
                            : "bg-white dark:bg-muted/50 border border-border/40 rounded-tl-none"
                        }`}>
                          {m.content.split('\n').map((line, idx) => (
                            <p key={idx} className={line.trim() ? "mb-2 last:mb-0" : "h-2"}>{line}</p>
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground font-medium px-1">
                          {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="flex gap-3 max-w-[85%] items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted border border-border">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="flex gap-1">
                      <div className="h-2 w-2 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.3s]" />
                      <div className="h-2 w-2 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.15s]" />
                      <div className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-border/40 bg-muted/20 backdrop-blur-md">
            <div className="relative flex items-center gap-2">
              <Input
                placeholder="Ask Siara AI anything about your clinic..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                className="pr-12 h-12 bg-background border-border/60 focus-visible:ring-primary shadow-inner rounded-xl"
              />
              <Button 
                size="icon" 
                onClick={handleSend} 
                disabled={isLoading || !input.trim()}
                className="absolute right-1.5 h-9 w-9 rounded-lg shadow-lg hover:scale-105 transition-transform"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-2 flex items-center gap-1.5 px-1">
              <Sparkles className="h-3 w-3 text-primary animate-pulse" />
              <p className="text-[10px] text-muted-foreground font-medium">AI can make mistakes. Always verify clinical decisions.</p>
            </div>
          </div>
        </Card>
      </div>
    </motion.div>
  );
};

export default AI;
