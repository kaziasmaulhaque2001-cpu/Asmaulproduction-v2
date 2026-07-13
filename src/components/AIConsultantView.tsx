import React, { useState, useEffect, useRef } from 'react';
import { useBrand } from '../contexts/BrandContext';
import { offlineService } from '../services/offlineService';
import { Booking, Payment } from '../types';
import { 
  Box, 
  Typography, 
  Paper, 
  TextField, 
  IconButton, 
  Button, 
  Tooltip,
  Avatar,
  Chip,
  FormControl,
  Select,
  MenuItem,
  CircularProgress
} from '@mui/material';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  Trash2, 
  Briefcase, 
  DollarSign, 
  Info,
  Calendar,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  RotateCw,
  Sliders,
  CheckCircle2
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export const AIConsultantView: React.FC = () => {
  const { settings, formatCurrency } = useBrand();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<'advisor' | 'analyst' | 'creative'>('advisor');
  const [statsSummary, setStatsSummary] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('asmaul_ai_chat_history');
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error("Error reading chat history:", e);
      }
    } else {
      // Seed initial welcoming message
      setMessages([
        {
          id: 'welcome',
          role: 'model',
          text: `Greetings, welcome to the luxury concierge at **${settings.studioName || 'Asmaul Production'}**. I am **Kazi**, your AI Studio Advisor.\n\nI can assist you with all operations: \n*   **Analyze Financial Reports** & payment outstanding dues.\n*   **Generate Premium Contracts**, timeline drafts, and client correspondence.\n*   **Plan Creative Shot Lists** and theme concepts.\n\nHow can I elevate your studio's operations today?`,
          timestamp: Date.now()
        }
      ]);
    }
  }, [settings.studioName]);

  // Save chat history to localStorage when changed
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('asmaul_ai_chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Dynamically load real offline statistical data to inject as context!
  useEffect(() => {
    const loadContext = async () => {
      try {
        const bookings = await offlineService.getBookings();
        const payments = await offlineService.getStoreData<Payment>('payments');
        
        const totalBookings = bookings.length;
        const productionBookings = bookings.filter(b => b.type === 'production');
        const freelancerBookings = bookings.filter(b => b.type === 'freelancer');
        
        const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
        const paidAmount = bookings.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
        const dueAmount = totalRevenue - paidAmount;
        
        const completedCount = bookings.filter(b => b.status === 'completed').length;
        const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
        const pendingCount = bookings.filter(b => b.status === 'pending').length;

        // Extract freelancer/photographer distribution
        const uniquePhotographers = Array.from(new Set(bookings.map(b => b.photographer).filter(Boolean)));

        const summaryText = `
STUDIO DATABASE REAL-TIME STATE CONTEXT:
- Studio Name: ${settings.studioName || 'Asmaul Production'}
- Active Bookings Count: ${totalBookings} total bookings (${productionBookings.length} production / ${freelancerBookings.length} freelancer)
- Booking Statuses: ${confirmedCount} Confirmed, ${pendingCount} Pending, ${completedCount} Completed
- Financial Overview:
  * Total Value of Signed Bookings: ${formatCurrency(totalRevenue)}
  * Total Revenue Collected: ${formatCurrency(paidAmount)}
  * Outstanding Receivables (Dues): ${formatCurrency(dueAmount)}
- Active Photographers/Staff: ${uniquePhotographers.join(', ') || 'None assigned yet'}
- Latest Booking Log (Up to 3 items):
${bookings.slice(0, 3).map(b => `  * Client: ${b.clientName} | Package: ${b.packageName} | Date: ${b.weddingDate} | Total: ${formatCurrency(b.totalAmount)} | Paid: ${formatCurrency(b.paidAmount)} | Status: ${b.status}`).join('\n')}
`;
        setStatsSummary(summaryText);
      } catch (err) {
        console.error("Error building AI stats context:", err);
      }
    };

    loadContext();
  }, [formatCurrency, settings.studioName]);

  const handleSendMessage = async (customPrompt?: string) => {
    const promptText = (customPrompt || input).trim();
    if (!promptText) return;

    if (!customPrompt) {
      setInput('');
    }

    const newUserMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      text: promptText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, newUserMessage]);
    setLoading(true);
    setError(null);

    try {
      // Reconstruct role and guidelines as system instructions
      let systemInstruction = "";
      if (selectedRole === 'advisor') {
        systemInstruction = `You are Kazi, the premium photography studio virtual coordinator and executive business advisor for ${settings.studioName || 'Asmaul Production'}. Your role is to help coordinate bookings, draft standard email copies, review photography contracts, and help with general studio work. Maintain an elegant, highly supportive, premium tone. Avoid technical developer jargon.`;
      } else if (selectedRole === 'analyst') {
        systemInstruction = `You are Kazi, the chief financial analyst and strategy coordinator for ${settings.studioName || 'Asmaul Production'}. You assist in reviewing revenues, payments, receivables, and providing concrete actionable suggestions to maximize cashflow. Use the database context provided to give precise advice, cite numbers directly, and look out for overdue balances or payment discrepancies.`;
      } else if (selectedRole === 'creative') {
        systemInstruction = `You are Kazi, the luxury creative director and lead conceptual scheduler for ${settings.studioName || 'Asmaul Production'}. You specialize in producing outstanding outdoor and indoor wedding schedules, conceptual theme suggestions, lighting styles, camera setups, and detailed shooting lists (hour-by-hour). Inject high enthusiasm and cinematic artistry into your answers.`;
      }

      // Inject actual local numbers and statistics context into the conversation as background information
      const combinedHistory = [
        {
          role: 'user',
          parts: [{ text: `${statsSummary}\n\nPlease keep the above real-time data in mind. I am consulting you now. Let's begin.` }]
        },
        {
          role: 'model',
          parts: [{ text: `Understood. I have accessed the latest real-time database state for **${settings.studioName || 'Asmaul Production'}**. I am fully up to date with your ${formatCurrency ? 'financial overview' : 'operations'} and active clients. How can I help?` }]
        }
      ];

      // Format messages history for Gemini @google/genai SDK format: { role, parts: [{ text }] }
      // Skip the initial welcome message to avoid polluting, or include it
      messages.forEach(m => {
        if (m.id !== 'welcome') {
          combinedHistory.push({
            role: m.role,
            parts: [{ text: m.text }]
          });
        }
      });

      // Append current message
      combinedHistory.push({
        role: 'user',
        parts: [{ text: promptText }]
      });

      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: combinedHistory,
          systemInstruction,
          model: 'gemini-3.5-flash' // Standard model for fast general tasks
        })
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "An unexpected error occurred.");
      }

      const newBotMessage: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role: 'model',
        text: data.text || "I was unable to formulate a response. Please try again.",
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, newBotMessage]);
    } catch (err: any) {
      console.error("AI Assistant error:", err);
      setError(err.message || "Failed to communicate with the AI model. Check server API key configuration.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to archive and clear this chat session?")) {
      localStorage.removeItem('asmaul_ai_chat_history');
      setMessages([
        {
          id: 'welcome',
          role: 'model',
          text: `Greetings, session archived successfully. I am ready to begin a fresh operations consultation. How may I assist you now?`,
          timestamp: Date.now()
        }
      ]);
    }
  };

  // Pre-baked templates
  const PRESETS = [
    { label: "📊 Audit Business Finances", text: "Please look at my financial overview. Provide a complete analysis of my bookings, total cash collected, outstanding dues, and identify which clients have pending retainers that require quick follow-up." },
    { label: "💍 Wedding Day Shot List", text: "Draft a high-end, premium Wedding Day Shot List. Provide suggestions for bridal preparation details, sunset couple portrait styles, reception candids, and recommended prime lenses for low-light." },
    { label: "🤝 Client Email Draft", text: "Help me write an elegant, premium client email template requesting the remaining milestone payment (due 7 days before their scheduled wedding shoot)." },
    { label: "⚡ Freelance Coordinator Guide", text: "Give me some best practices on coordinating freelance photographers, assigning shoots, and establishing high quality control standards matching our premium brand." }
  ];

  // Markdown parser helper for simple elegant formatting in list
  const formatMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Bold syntax **text** -> <strong>text</strong>
      let cleanLine = line;
      const boldRegex = /\*\*(.*?)\*\*/g;
      cleanLine = cleanLine.replace(boldRegex, '<strong class="text-[#D4AF37] font-semibold">$1</strong>');
      
      // Inline code `code`
      const codeRegex = /`(.*?)`/g;
      cleanLine = cleanLine.replace(codeRegex, '<code class="bg-[#1C1A16] px-1.5 py-0.5 rounded text-xs font-mono border border-[#D4AF37]/15 text-[#FFF]">$1</code>');

      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        const listText = cleanLine.replace(/^[\s]*[\*\-]\s+/, '');
        return (
          <li key={idx} className="ml-4 list-disc pl-1 mb-1 text-gray-300 text-xs sm:text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: listText }} />
        );
      }

      if (line.trim().startsWith('### ')) {
        const headingText = cleanLine.replace(/^###\s+/, '');
        return (
          <Typography key={idx} variant="subtitle1" className="text-white font-serif font-semibold mt-4 mb-2 text-sm uppercase tracking-wide border-b border-[#D4AF37]/10 pb-1" dangerouslySetInnerHTML={{ __html: headingText }} />
        );
      }

      if (line.trim().startsWith('## ')) {
        const headingText = cleanLine.replace(/^##\s+/, '');
        return (
          <Typography key={idx} variant="h6" className="text-[#D4AF37] font-serif font-bold mt-5 mb-2.5 text-base" dangerouslySetInnerHTML={{ __html: headingText }} />
        );
      }

      if (line.trim().startsWith('# ')) {
        const headingText = cleanLine.replace(/^#\s+/, '');
        return (
          <Typography key={idx} variant="h5" className="text-gold-gradient font-serif font-extrabold mt-6 mb-3 text-lg" dangerouslySetInnerHTML={{ __html: headingText }} />
        );
      }

      if (line.trim() === '') {
        return <div key={idx} className="h-2" />;
      }

      return (
        <p key={idx} className="mb-2 text-gray-300 text-xs sm:text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: cleanLine }} />
      );
    });
  };

  return (
    <Box className="w-full flex flex-col min-h-[calc(100vh-70px)] p-4 sm:p-6 lg:p-8 bg-[#0D0D0C]">
      {/* Visual Title Header */}
      <Box className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-[#D4AF37]/10 pb-6">
        <div>
          <Box className="flex items-center gap-2.5 mb-1.5">
            <Sparkles className="w-5 h-5 text-[#D4AF37]" />
            <span className="text-[10px] tracking-[0.25em] font-serif uppercase text-[#D4AF37] font-extrabold">
              STUDIO COGNITIVE LAYER
            </span>
          </Box>
          <Typography variant="h4" className="text-gold-gradient font-serif font-extrabold text-2xl sm:text-3xl uppercase tracking-wider">
            AI Studio Advisor
          </Typography>
          <Typography variant="body2" className="text-gray-400 text-xs sm:text-sm mt-1 max-w-xl">
            Meet Kazi: your premium digital concierge. Reconstruct wedding shoots, calculate payment risks, or design gorgeous shot lists.
          </Typography>
        </div>

        {/* Advisor Personality Selector */}
        <Box className="flex flex-wrap items-center gap-3">
          <FormControl size="small" className="min-w-[180px]">
            <Select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as any)}
              className="bg-[#0A0A09] border border-[#D4AF37]/20 text-xs text-gray-200 rounded-xl font-sans"
            >
              <MenuItem value="advisor" className="text-xs py-2">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-[#D4AF37]" />
                  <span>Operations Manager</span>
                </div>
              </MenuItem>
              <MenuItem value="analyst" className="text-xs py-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span>Financial Intelligence</span>
                </div>
              </MenuItem>
              <MenuItem value="creative" className="text-xs py-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <span>Creative Director</span>
                </div>
              </MenuItem>
            </Select>
          </FormControl>

          <Tooltip title="Archive and clear consultation history">
            <Button
              variant="outlined"
              onClick={handleClearHistory}
              startIcon={<Trash2 className="w-4 h-4" />}
              className="border-red-500/25 hover:border-red-500/55 hover:bg-red-500/5 text-red-400 text-xs px-3.5 py-1.5 rounded-xl font-sans"
            >
              Clear Session
            </Button>
          </Tooltip>
        </Box>
      </Box>

      {/* Main Grid: Left is thread, Right is templates and active status */}
      <Box className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
        
        {/* Chat Thread Container */}
        <Box className="lg:col-span-3 flex flex-col border border-[#D4AF37]/15 rounded-2xl bg-[#090908] overflow-hidden min-h-[500px] shadow-2xl relative">
          
          {/* Active Personality header */}
          <Box className="p-3 bg-black/40 border-b border-[#D4AF37]/10 flex items-center justify-between px-4">
            <Box className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 border border-green-300 animate-pulse" />
              <Typography className="text-gray-400 font-mono text-[10px] tracking-widest uppercase">
                Kazi Online: {selectedRole === 'advisor' ? 'Studio Coordinator' : selectedRole === 'analyst' ? 'Financial Intelligence' : 'Creative Director'}
              </Typography>
            </Box>
            
            <Chip 
              icon={<RotateCw className="w-3 h-3 text-[#D4AF37]" />}
              label="Real-time Context Synced" 
              className="bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 font-mono text-[9px] uppercase px-1 h-5"
            />
          </Box>

          {/* Messages display */}
          <Box className="flex-grow p-4 sm:p-6 overflow-y-auto max-h-[520px] min-h-[380px] space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((m) => {
                const isBot = m.role === 'model';
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex gap-3 max-w-[88%] ${isBot ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
                  >
                    {/* Avatar */}
                    <Box className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border shadow-md ${
                      isBot 
                        ? 'bg-[#12110D] border-[#D4AF37]/30 text-[#D4AF37]' 
                        : 'bg-gradient-to-br from-[#D4AF37] to-[#AA7C11] border-[#FFFDF0]/10 text-black'
                    }`}>
                      {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </Box>

                    {/* Chat Bubble card */}
                    <Box className={`rounded-2xl px-4 py-3 border shadow-sm ${
                      isBot 
                        ? 'bg-black/40 border-[#D4AF37]/10 text-gray-100 rounded-tl-none' 
                        : 'bg-[#151310] border-[#D4AF37]/25 text-[#FFFDF0] rounded-tr-none'
                    }`}>
                      <Box className="prose prose-invert max-w-none text-left">
                        {formatMarkdown(m.text)}
                      </Box>
                      <Typography className="text-[9px] text-gray-500 font-mono mt-1.5 text-right tracking-wider">
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </Box>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3 max-w-[80%] mr-auto"
              >
                <Box className="w-8 h-8 rounded-lg bg-[#12110D] border border-[#D4AF37]/30 text-[#D4AF37] flex items-center justify-center flex-shrink-0 animate-spin">
                  <RotateCw className="w-4 h-4 text-[#D4AF37]" />
                </Box>
                <Box className="bg-black/40 border border-[#D4AF37]/10 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-3">
                  <span className="text-xs text-[#D4AF37] font-mono tracking-widest uppercase animate-pulse">
                    Kazi is thinking
                  </span>
                  <Box className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </Box>
                </Box>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3 rounded-xl bg-red-950/20 border border-red-500/20 text-red-300 text-xs flex items-center gap-2 max-w-xl mx-auto"
              >
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </Box>

          {/* User Input Drawer Form */}
          <Box className="p-4 bg-[#0A0A09] border-t border-[#D4AF37]/10">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex gap-3 items-center"
            >
              <TextField
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Query Kazi about your ${selectedRole === 'analyst' ? 'finances, revenue or unpaid invoices...' : selectedRole === 'creative' ? ' wedding timings or creative shoot shot list...' : 'bookings registry, client templates...'}`}
                disabled={loading}
                variant="outlined"
                size="small"
                fullWidth
                className="bg-black/50 rounded-xl"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#FFF',
                    fontSize: '13px',
                    fontFamily: 'Inter, sans-serif',
                    '& fieldset': {
                      borderColor: 'rgba(212, 175, 55, 0.15)',
                      borderRadius: '12px'
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(212, 175, 55, 0.4)'
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
                className={`p-2.5 rounded-xl transition-all ${
                  input.trim() 
                    ? 'bg-gold-gradient text-black hover:opacity-90' 
                    : 'bg-[#151310] text-gray-500 border border-[#D4AF37]/5'
                }`}
              >
                <Send className="w-4 h-4" />
              </IconButton>
            </form>
          </Box>

        </Box>

        {/* Right Sidebar: Quick templates and context status */}
        <Box className="space-y-4">
          
          {/* Quick Prompts Panel */}
          <Paper className="p-4 sm:p-5 bg-[#090908] border border-[#D4AF37]/15 rounded-2xl shadow-xl flex flex-col h-full justify-between">
            <div>
              <Box className="flex items-center gap-2 mb-3">
                <Sliders className="w-4 h-4 text-[#D4AF37]" />
                <Typography variant="subtitle2" className="text-white font-serif font-bold uppercase tracking-wider text-xs">
                  Aura Quick Prompts
                </Typography>
              </Box>
              
              <Typography className="text-gray-400 text-[11px] mb-4 leading-relaxed">
                Click any of these pre-compiled inquiries to automatically feed your real studio stats to the Gemini model for strategic analysis.
              </Typography>

              <Box className="space-y-2.5">
                {PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(p.text)}
                    disabled={loading}
                    className="w-full text-left p-3 rounded-xl bg-black/40 hover:bg-[#D4AF37]/5 border border-[#D4AF37]/10 hover:border-[#D4AF37]/30 transition-all group outline-none"
                  >
                    <Typography className="text-gray-200 group-hover:text-[#D4AF37] text-xs font-semibold font-sans tracking-wide mb-1 transition-colors">
                      {p.label}
                    </Typography>
                    <Typography className="text-gray-500 text-[10px] line-clamp-2 leading-relaxed">
                      {p.text}
                    </Typography>
                  </button>
                ))}
              </Box>
            </div>

            {/* Micro Informational Branding */}
            <Box className="pt-4 mt-4 border-t border-[#D4AF37]/10 flex items-center gap-2.5 bg-black/10 p-2.5 rounded-xl">
              <Info className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
              <Typography className="text-[10px] text-gray-400 leading-normal">
                Kazi operates purely on server-side Gemini. No credentials are sent to the browser.
              </Typography>
            </Box>
          </Paper>

        </Box>

      </Box>
    </Box>
  );
};
