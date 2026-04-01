import React, { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bot, Lightbulb, Send, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

export const AIAssistantPanel: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: api.getDashboard,
  });
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const insights = useMemo(() => {
    const stats = data?.stats;
    if (!stats) return [];
    return [
      { title: "Operational", text: `${stats.dailyPatients} patients are on today's schedule. Balance chair time around peak hours.`, tag: "Live" },
      { title: "Clinical", text: `${stats.pendingLabs} cases are waiting on X-rays. Prioritize urgent callbacks.`, tag: "Care" },
      { title: "Revenue", text: `Current billed revenue is Rs ${stats.revenue.toLocaleString()}. Review pending invoices for faster collection.`, tag: "Finance" },
    ];
  }, [data]);

  const send = () => {
    const value = text.trim();
    if (!value) return;
    const answer = data
      ? `SmartDental AI summary: ${data.stats.dailyPatients} patients today, ${data.stats.appointments} active appointments, Rs ${data.stats.revenue.toLocaleString()} billed, and ${data.stats.pendingLabs} pending X-rays.`
      : "SmartDental AI is waiting for live dashboard data.";
    setMessages((current) => [
      ...current,
      { id: `u-${Date.now()}`, role: "user", text: value },
      { id: `a-${Date.now()}`, role: "assistant", text: answer },
    ]);
    setText("");
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 0);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="right" className="w-full p-0 sm:max-w-lg">
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-border/60 p-4">
            <SheetTitle className="flex items-center gap-2 font-heading">
              <Bot className="h-5 w-5 text-primary" /> AI Assistant
            </SheetTitle>
            <p className="text-xs text-muted-foreground">Live dashboard summary + guided insights</p>
          </SheetHeader>

          <div className="border-b border-border/60 bg-secondary/15 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Lightbulb className="h-4 w-4 text-warning" /> Quick insights
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const summary = insights.map((item) => `- ${item.text}`).join("\n");
                  setMessages((current) => [...current, { id: `i-${Date.now()}`, role: "assistant", text: `Generated insights:\n${summary}` }]);
                }}
              >
                <Sparkles className="mr-1 h-4 w-4" /> Generate
              </Button>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2">
              {insights.map((item) => (
                <div key={item.title} className="rounded-lg border border-border/50 bg-card p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{item.title}</p>
                    <Badge variant="secondary" className="text-[10px]">{item.tag}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-3 p-4">
              {messages.map((message) => (
                <div key={message.id} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div className={message.role === "user" ? "max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-sm text-primary-foreground" : "max-w-[85%] rounded-2xl rounded-tl-sm border border-border/50 bg-secondary/60 px-3 py-2 text-sm"}>
                    <p className="whitespace-pre-wrap">{message.text}</p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          <div className="border-t border-border/60 p-4">
            <div className="flex items-center gap-2">
              <Input value={text} onChange={(event) => setText(event.target.value)} placeholder="Ask about appointments, X-rays, insights..." onKeyDown={(event) => event.key === "Enter" && send()} />
              <Button onClick={send} size="icon" aria-label="Send">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">Responses are generated from your live SmartDental dashboard data.</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
