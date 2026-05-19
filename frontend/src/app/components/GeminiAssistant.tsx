import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, MessageSquare, Send, Mic, Bot, Sparkles, Navigation, Calendar, Users, CreditCard, Camera } from 'lucide-react';
import { api } from '@/shared/lib/api';
import './GeminiAssistant.css';
import geminiLogo from '@/assets/gemini-logo.png';

type Message = {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
  actions?: Array<{ label: string; path: string; icon: React.ReactNode }>;
};

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const GeminiAssistant: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('Siara AI Logo Asset loaded:', geminiLogo);
  }, []);

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      content: 'Hello! I am Siara AI, your clinical dental assistant. How can I help you streamline clinic operations, patients, billing, or diagnostic analysis today?',
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll to the bottom of the chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isThinking]);

  // Set up Speech Recognition
  useEffect(() => {
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputValue((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please try Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  // Compute route-aware starting questions
  const currentSuggestions = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith('/patients')) {
      return [
        { text: 'Show total registered patients count', prompt: 'How many patients are currently registered in the database, and what are their statuses?' },
        { text: 'Who is the latest patient registered?', prompt: 'Show the details of the most recently registered patients.' },
        { text: 'Add a new patient details requirements', prompt: 'What are the typical mandatory fields required to create a new patient profile?' },
      ];
    } else if (path.startsWith('/billing') || path.startsWith('/invoices')) {
      return [
        { text: 'Check outstanding invoices', prompt: 'Are there pending or unpaid invoices? Give me a list of pending invoice amounts.' },
        { text: 'What is today\'s billing revenue?', prompt: 'Show a summary of billed revenue and payment activity today.' },
        { text: 'How do I record an advance payment?', prompt: 'Provide step-by-step instructions on recording patient partial and advance payments.' },
      ];
    } else if (path.startsWith('/appointments')) {
      return [
        { text: 'Summary of appointments today', prompt: 'Give me a summary list of all dental appointments scheduled for today.' },
        { text: 'Check dentist doctor scheduling', prompt: 'Who is the doctor assigned to appointments today, and are there time overlaps?' },
        { text: 'How to reschedule an appointment', prompt: 'How do I change the date or status of an existing appointment in SmartCare?' },
      ];
    } else if (path.startsWith('/xrays')) {
      return [
        { text: 'How to run AI X-ray analysis?', prompt: 'Explain how the Gemini Vision AI radiographic diagnostic viewer works in SmartCare.' },
        { text: 'Check latest X-rays status', prompt: 'Have any patient X-rays been uploaded recently that require clinical review?' },
        { text: 'Share X-ray report options', prompt: 'What are the available sharing options (WhatsApp, Email) for diagnostic X-ray reports?' },
      ];
    } else {
      // Default dashboard/global suggestions
      return [
        { text: 'Give me today\'s clinic overview', prompt: 'Based on the real-time dashboard data, summarize today\'s appointments, revenue, and active patients.' },
        { text: 'What are the primary operational tasks?', prompt: 'What are the top recommended tasks or follow-ups for dentists today?' },
        { text: 'Show recent activity logs', prompt: 'Tell me about the latest system changes or audits performed recently.' },
      ];
    }
  }, [location.pathname]);

  // Send a message
  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend || inputValue).trim();
    if (!content) return;

    if (!textToSend) {
      setInputValue('');
    }

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    try {
      // Construct history in standard format { role: 'user' | 'model', content: string }
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Call pre-existing backend proxy endpoint
      const response = await api.chatWithAI(content, historyPayload);

      // Clean the response
      const answer = response.data || 'I am sorry, but I received an empty response. Please try again.';

      // Smart navigation helper detector
      const actions: Message['actions'] = [];
      const lowerAnswer = answer.toLowerCase();
      if (lowerAnswer.includes('billing') || lowerAnswer.includes('invoice') || lowerAnswer.includes('payment')) {
        actions.push({ label: 'Open Billing 💳', path: '/billing', icon: <CreditCard className="h-3 w-3" /> });
      }
      if (lowerAnswer.includes('patient') || lowerAnswer.includes('register')) {
        actions.push({ label: 'View Patients 👥', path: '/patients', icon: <Users className="h-3 w-3" /> });
      }
      if (lowerAnswer.includes('appointment') || lowerAnswer.includes('schedule') || lowerAnswer.includes('calendar')) {
        actions.push({ label: 'Appointments 📅', path: '/appointments', icon: <Calendar className="h-3 w-3" /> });
      }
      if (lowerAnswer.includes('x-ray') || lowerAnswer.includes('radiograph') || lowerAnswer.includes('xray')) {
        actions.push({ label: 'X-Rays Hub 🦷', path: '/xrays', icon: <Camera className="h-3 w-3" /> });
      }

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: 'model',
        content: answer,
        timestamp: new Date(),
        actions: actions.length > 0 ? actions : undefined,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (error: any) {
      console.error('Error talking to Gemini assistant:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'model',
          content: 'Apologies, I encountered a temporary connection failure. Please ensure the backend server is active and try again.',
          timestamp: new Date(),
        }
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleShortcutClick = (path: string) => {
    navigate(path);
  };

  return (
    <div className="gf-container">
      {/* Interactive Chat Panel */}
      <div className={`gf-panel ${isOpen ? 'gf-open' : ''}`}>
        {/* Panel Header */}
        <div className="gf-header">
          <div className="gf-header-title">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm overflow-hidden p-1 shrink-0">
              <img src={geminiLogo} alt="AI" className="h-full w-full object-contain animate-[gf-rotate-logo_20s_linear_infinite]" />
            </div>
            <div>
              <span className="gf-header-name">Siara AI</span>
              <p className="text-[10px] text-muted-foreground m-0 p-0 font-medium">Assistant Copilot</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="gf-status-indicator">
              <span className="gf-status-dot"></span>
              <span>Active</span>
            </div>
            <button className="gf-close-btn animate-hover" onClick={() => setIsOpen(false)} aria-label="Close Assistant">
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Global Navigation Utility Bar */}
        <div className="flex items-center gap-2 border-b border-border/40 bg-zinc-50/60 dark:bg-zinc-950/40 px-4 py-2 text-[10.5px] select-none scrollbar-none overflow-x-auto shrink-0">
          <span className="font-semibold text-[9.5px] uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1 shrink-0">
            <Navigation className="h-3 w-3 text-primary" /> Shortcuts:
          </span>
          <button onClick={() => handleShortcutClick('/')} className="px-2 py-0.5 rounded-full bg-secondary/80 hover:bg-primary/10 hover:text-primary transition-all flex items-center gap-1 shrink-0 font-semibold text-foreground/85 text-[10px]">
            📅 Dashboard
          </button>
          <button onClick={() => handleShortcutClick('/patients')} className="px-2 py-0.5 rounded-full bg-secondary/80 hover:bg-primary/10 hover:text-primary transition-all flex items-center gap-1 shrink-0 font-semibold text-foreground/85 text-[10px]">
            👥 Patients
          </button>
          <button onClick={() => handleShortcutClick('/billing')} className="px-2 py-0.5 rounded-full bg-secondary/80 hover:bg-primary/10 hover:text-primary transition-all flex items-center gap-1 shrink-0 font-semibold text-foreground/85 text-[10px]">
            💳 Billing
          </button>
          <button onClick={() => handleShortcutClick('/xrays')} className="px-2 py-0.5 rounded-full bg-secondary/80 hover:bg-primary/10 hover:text-primary transition-all flex items-center gap-1 shrink-0 font-semibold text-foreground/85 text-[10px]">
            🦷 X-Rays
          </button>
        </div>

        {/* Messages Container */}
        <div className="gf-messages-container scroll-container">
          {messages.map((message) => (
            <div key={message.id} className={`gf-message ${message.role}`}>
              <div className="gf-bubble">
                <p className="m-0 whitespace-pre-wrap">{message.content}</p>
                
                {/* Actions mapping */}
                {message.actions && (
                  <div className="flex flex-wrap gap-2 mt-2 pt-1 border-t border-border/10">
                    {message.actions.map((act, index) => (
                      <button
                        key={index}
                        onClick={() => handleShortcutClick(act.path)}
                        className="gf-bubble-action flex items-center gap-1 hover:-translate-y-0.5 transition-transform"
                      >
                        {act.icon}
                        <span>{act.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span className="gf-message-time">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
          {isThinking && (
            <div className="gf-message model">
              <div className="gf-bubble bg-secondary/60 dark:bg-white/5 border border-border/30">
                <div className="gf-typing">
                  <span className="gf-typing-dot"></span>
                  <span className="gf-typing-dot"></span>
                  <span className="gf-typing-dot"></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Dynamic Context Suggestions Chips */}
        {currentSuggestions.length > 0 && !isThinking && messages.length <= 1 && (
          <div className="gf-suggestions">
            <span className="gf-suggestions-title flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-primary animate-pulse" /> Page Insights
            </span>
            <div className="gf-chips-wrapper">
              {currentSuggestions.map((sug, i) => (
                <button
                  key={i}
                  className="gf-chip"
                  onClick={() => handleSendMessage(sug.prompt)}
                >
                  {sug.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer Input Controls */}
        <div className="gf-footer">
          <div className="gf-input-row">
            <div className="gf-input-wrapper">
              <input
                className="gf-input"
                placeholder="Ask about dental metrics, workflows..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                disabled={isThinking}
              />
              <button
                className={`gf-voice-btn ${isListening ? 'active' : ''}`}
                onClick={toggleListening}
                disabled={isThinking}
                title="Voice Input (Speech-to-Text)"
                type="button"
              >
                <Mic className="h-4 w-4" />
              </button>
            </div>
            <button
              className="gf-send-btn"
              onClick={() => handleSendMessage()}
              disabled={isThinking || !inputValue.trim()}
              aria-label="Send query"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="gf-disclaimer">
            Dental suggestion assistant. Confirm clinical decisions offline.
          </p>
        </div>
      </div>

      {/* Floating Main Button */}
      <button
        className={`gf-trigger ${isOpen ? 'gf-active' : ''} ${isThinking ? 'gf-thinking' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Open clinical AI assistant"
      >
        <img
          src={geminiLogo}
          alt="Siara AI Logo"
          className="gf-logo-img"
        />
      </button>
    </div>
  );
};
