import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader2, RefreshCw, X, Maximize2 } from 'lucide-react';
import { ChatMessage } from '../types';
import { api } from '../services/api';
import { ObbyTechLogoEmblem } from './ObbyTechBrand';

interface AppexAiChatProps {
  customerPhone?: string;
  isFullMode?: boolean;
  onEnterFullMode?: () => void;
  onExitFullMode?: () => void;
  onCloseChat?: () => void;
}

export const AppexAiChat: React.FC<AppexAiChatProps> = ({
  customerPhone,
  isFullMode = false,
  onEnterFullMode,
  onExitFullMode,
  onCloseChat,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: 'Hello! Welcome to OBBY TECH. I am Obby Ai, your intelligent shopping & service assistant. How can I help you today with Phones, Laptops, CCTV systems, Accessories, or Repair & Design Services?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-u`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await api.sendAppexAiMessage(query);
      const aiMsg: ChatMessage = {
        id: `msg-${Date.now()}-a`,
        sender: 'assistant',
        text: res.reply || "I am Obby Ai. Please let me know how I can assist you with Obby Tech products.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('Obby Ai Error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-err`,
          sender: 'assistant',
          text: "I don't currently have that information. Please contact Obby Tech by Call at +255 779 594 321 or WhatsApp at +255 713 340 900.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    'What repair & design services do you offer?',
    'Do you have laptops in stock?',
    'What are your payment numbers?',
    'Delivery charges outside Dodoma',
    'Check my orders & bookings',
  ];

  return (
    <div
      className={
        isFullMode
          ? 'fixed inset-0 z-50 bg-white flex flex-col h-[100dvh] w-full max-w-full'
          : 'bg-white min-h-[85vh] pb-24 max-w-2xl mx-auto flex flex-col h-[calc(100vh-120px)] border-x border-gray-100'
      }
    >
      {/* Top Header Bar */}
      <div className="bg-[#0C0826] text-white p-3.5 flex items-center justify-between sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-2.5">
          <ObbyTechLogoEmblem size="xs" className="border border-white/15" />

          <div>
            {/* EXACT REQUIRED ASSISTANT NAME: Obby Ai */}
            <h1 className="text-sm font-obby-brand font-extrabold tracking-tight flex items-center gap-1.5">
              <span>Obby </span>
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(180deg, #29C5F6 0%, #24D164 100%)' }}
              >
                Ai
              </span>
              <Sparkles className="w-3.5 h-3.5 text-[#29C5F6]" />
            </h1>
            <p className="text-[10px] text-slate-300 font-medium">
              Official Obby Tech Assistant
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {!isFullMode && (
            <button
              type="button"
              onClick={() => onEnterFullMode?.()}
              className="p-1.5 hover:bg-white/15 rounded-full text-white transition-colors"
              title="Enter Full Chat Mode"
              aria-label="Enter Full Chat Mode"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              setMessages([
                {
                  id: `reset-${Date.now()}`,
                  sender: 'assistant',
                  text: 'Chat reset. How can Obby Ai help you with Obby Tech products today?',
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
              ])
            }
            className="p-1.5 hover:bg-white/15 rounded-full text-white transition-colors"
            title="Reset conversation"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Close / Exit Chat Button */}
          {isFullMode ? (
            <button
              type="button"
              onClick={onExitFullMode}
              className="p-1.5 ml-1 text-white hover:bg-white/20 rounded-full transition-colors flex items-center justify-center cursor-pointer active:scale-95 bg-white/10"
              title="Exit Full Chat Mode"
              aria-label="Exit Full Chat Mode"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          ) : (
            onCloseChat && (
              <button
                type="button"
                onClick={onCloseChat}
                className="p-1.5 hover:bg-white/15 rounded-full text-white transition-colors cursor-pointer"
                title="Close Obby Ai"
                aria-label="Close Obby Ai"
              >
                <X className="w-4 h-4" />
              </button>
            )
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2 ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.sender === 'assistant' && (
              <div className="w-7 h-7 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 shadow-xs">
                AI
              </div>
            )}

            <div
              className={`max-w-[82%] p-3 rounded-2xl text-xs leading-relaxed space-y-1 shadow-xs ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-none font-medium'
                  : 'bg-white text-slate-800 rounded-tl-none border border-slate-200 font-normal'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.text}</div>
              <div
                className={`text-[9px] text-right font-medium ${
                  msg.sender === 'user' ? 'text-blue-100' : 'text-slate-400'
                }`}
              >
                {msg.timestamp}
              </div>
            </div>

            {msg.sender === 'user' && (
              <div className="w-7 h-7 bg-slate-800 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 shadow-xs">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-500 p-2.5 bg-white rounded-xl border border-slate-200 w-max shadow-xs">
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
            <span className="font-semibold text-slate-600">Obby Ai is thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestion Chips */}
      <div className="p-2 bg-white border-t border-slate-100 overflow-x-auto flex gap-1.5 scrollbar-none">
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            disabled={loading}
            onClick={() => handleSend(prompt)}
            className="flex-shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] px-3 py-1.5 rounded-full border border-slate-200 transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div className="p-3 bg-white border-t border-slate-100">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onFocus={() => {
              if (!isFullMode && onEnterFullMode) {
                onEnterFullMode();
              }
            }}
            onClick={() => {
              if (!isFullMode && onEnterFullMode) {
                onEnterFullMode();
              }
            }}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Obby Ai about phones, laptops, CCTV, orders..."
            className="flex-1 bg-slate-100 border border-slate-200 text-xs font-medium p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className={`p-2.5 rounded-xl text-white transition-all flex items-center justify-center ${
              !input.trim() || loading
                ? 'bg-slate-300 cursor-not-allowed'
                : 'bg-slate-900 hover:bg-slate-800 shadow-xs active:scale-95'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
