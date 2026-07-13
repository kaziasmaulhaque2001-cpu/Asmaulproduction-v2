import React, { useState, useEffect, useRef } from 'react';
import { useBrand } from '../contexts/BrandContext';
import { offlineService } from '../services/offlineService';
import { Payment } from '../types';
import { 
  Box, 
  Typography, 
  IconButton, 
  TextField, 
  CircularProgress 
} from '@mui/material';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  X, 
  Send, 
  Bot, 
  User, 
  Minimize2, 
  TrendingUp, 
  RotateCw,
  AlertCircle
} from 'lucide-react';

interface MiniChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export const AIFloatingWidget: React.FC = () => {
  const { settings, formatCurrency } = useBrand();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<MiniChatMessage[]>([
    {
      id: 'floating-welcome',
      role: 'model',
      text: "How can I assist your photography workspace right now?"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statsSummary, setStatsSummary] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages, loading]);

  // Load context background
  useEffect(() => {
    if (!isOpen) return;
    const loadContext = async () => {
      try {
        const bookings = await offlineService.getBookings();
        const totalBookings = bookings.length;
        const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
        const paidAmount = bookings.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
        const dueAmount = totalRevenue - paidAmount;

        setStatsSummary(`
ACTIVE STATE SUMMARY:
- Total bookings: ${totalBookings}
- Active Revenue: ${formatCurrency(totalRevenue)}
- Collected: ${formatCurrency(paidAmount)}
- Dues: ${formatCurrency(dueAmount)}
`);
      } catch (err) {
        console.error("Error loading floating context stats:", err);
      }
    };
    loadContext();
  }, [isOpen, formatCurrency]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;

    setInput('');
    const userMsg: MiniChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setError(null);

    try {
      const combinedHistory = [
        {
          role: 'user',
          parts: [{ text: `Background system state:\n${statsSummary}\n\nYou are Kazi, a helpful online assistant. Respond in short, concise, elite sentences.` }]
        },
        {
          role: 'model',
          parts: [{ text: "Greetings, I am connected to the real-time core. Ready." }]
        }
      ];

      messages.forEach(m => {
        if (m.id !== 'floating-welcome') {
          combinedHistory.push({
            role: m.role,
            parts: [{ text: m.text }]
          });
        }
      });

      combinedHistory.push({
        role: 'user',
        parts: [{ text }]
      });

      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: combinedHistory,
          systemInstruction: "You are Kazi, the luxury operations manager for Asmaul Production. Respond with brief, direct, elegant, and actionable suggestions. Format with bold terms where needed.",
          model: 'gemini-3.5-flash'
        })
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to query Gemini.");
      }

      const botMsg: MiniChatMessage = {
        id: `msg-bot-${Date.now()}`,
        role: 'model',
        text: data.text || "I was unable to find a reply."
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      console.error("Floating chatbot error:", err);
      setError(err.message || "Connection failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans select-none pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            transition={{ type: 'spring', damping: 20, stiffness: 220 }}
            className="w-80 sm:w-96 h-[480px] bg-[#0A0A09] border border-[#D4AF37]/35 rounded-2xl shadow-[0_15px_50px_-15px_rgba(212,175,55,0.15)] overflow-hidden flex flex-col pointer-events-auto mb-4"
          >
            {/* Header */}
            <Box className="p-3 bg-gradient-to-r from-black via-[#0B0B0A] to-black border-b border-[#D4AF37]/20 flex items-center justify-between px-4">
              <Box className="flex items-center gap-2">
                <Box className="w-6 h-6 rounded bg-[#12110D] border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                  <Sparkles className="w-3.5 h-3.5" />
                </Box>
                <div>
                  <Typography variant="subtitle2" className="text-[#FFF] font-serif font-bold text-xs uppercase tracking-wider">
                    Kazi Live Concierge
                  </Typography>
                  <Typography className="text-[9px] text-gray-400 font-mono tracking-widest leading-none mt-0.5">
                    REALTIME ASSISTANT
                  </Typography>
                </div>
              </Box>

              <Box className="flex items-center gap-1">
                <IconButton onClick={() => setIsOpen(false)} size="small" className="text-gray-400 hover:text-white">
                  <Minimize2 className="w-4 h-4" />
                </IconButton>
              </Box>
            </Box>

            {/* Chat list */}
            <Box className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#080807]">
              {messages.map((m) => {
                const isBot = m.role === 'model';
                return (
                  <div key={m.id} className={`flex gap-2 max-w-[85%] ${isBot ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}>
                    <div className={`w-6.5 h-6.5 rounded-md flex items-center justify-center flex-shrink-0 text-xs ${
                      isBot ? 'bg-black border border-[#D4AF37]/20 text-[#D4AF37]' : 'bg-[#D4AF37] text-black font-semibold'
                    }`}>
                      {isBot ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                    </div>

                    <div className={`rounded-xl px-3 py-2 text-xs border ${
                      isBot ? 'bg-black/40 border-[#D4AF37]/10 text-gray-200' : 'bg-[#151310] border-[#D4AF37]/20 text-white'
                    }`}>
                      <p className="whitespace-pre-line text-left leading-relaxed">{m.text}</p>
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex gap-2 mr-auto items-center">
                  <div className="w-6.5 h-6.5 rounded bg-black border border-[#D4AF37]/20 flex items-center justify-center animate-spin">
                    <RotateCw className="w-3.5 h-3.5 text-[#D4AF37]" />
                  </div>
                  <span className="text-[10px] text-[#D4AF37] font-mono tracking-wider uppercase animate-pulse">Thinking...</span>
                </div>
              )}

              {error && (
                <div className="p-2 bg-red-950/20 border border-red-500/25 rounded-lg text-red-300 text-[10px] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </Box>

            {/* Form */}
            <Box className="p-3 bg-black/50 border-t border-[#D4AF37]/15">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex gap-2 items-center"
              >
                <TextField
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Kazi anything..."
                  disabled={loading}
                  variant="outlined"
                  size="small"
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#FFF',
                      fontSize: '11px',
                      height: '34px',
                      '& fieldset': {
                        borderColor: 'rgba(212, 175, 55, 0.15)',
                        borderRadius: '8px'
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(212, 175, 55, 0.35)'
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#D4AF37',
                      }
                    }
                  }}
                />
                <IconButton
                  type="submit"
                  disabled={loading || !input.trim()}
                  className={`p-2 rounded-lg ${
                    input.trim() 
                      ? 'bg-gold-gradient text-black hover:opacity-90' 
                      : 'bg-[#12110D] text-gray-600'
                  }`}
                  size="small"
                >
                  <Send className="w-3.5 h-3.5" />
                </IconButton>
              </form>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating launcher trigger circle */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-gradient-to-br from-[#12110D] to-[#252015] border border-[#D4AF37] hover:border-[#FFF] rounded-full shadow-[0_8px_30px_rgba(212,175,55,0.25)] flex items-center justify-center cursor-pointer pointer-events-auto transition-all relative overflow-hidden group outline-none"
      >
        <span className="absolute inset-0 bg-gold-gradient opacity-0 group-hover:opacity-10 transition-opacity" />
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="w-6 h-6 text-[#D4AF37]" />
            </motion.div>
          ) : (
            <motion.div
              key="spark"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="relative flex items-center justify-center"
            >
              <Sparkles className="w-6 h-6 text-[#D4AF37] group-hover:text-white transition-colors" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#D4AF37] rounded-full border border-black animate-ping" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#D4AF37] rounded-full border border-black" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
};
