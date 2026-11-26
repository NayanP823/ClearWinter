import { Send, Square, Trash2 } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import type {
  AirQualitySnapshot,
  ChatMessage,
  HouseholdProfile,
  InversionRiskAssessment,
  VentilationWindow,
} from '../domain/types';
import { buildAirQualityContext, streamAdvisorChat } from '../services/api';

interface SmogAdvisorChatProps {
  snapshot: AirQualitySnapshot;
  inversion: InversionRiskAssessment;
  ventilation: VentilationWindow;
  profile: HouseholdProfile;
}

const STARTER_PROMPTS = [
  'Is it safe for senior citizens to go for a morning walk today, or should we wait?',
  'How can we make a budget DIY air filter under ₹3,500 using an Indian fan?',
  'How does pausing agarbatti and using an electric kettle protect elders at home?',
  'Write a polite WhatsApp message for our RWA group about stopping car idling at the gate.',
];

export function SmogAdvisorChat({
  snapshot,
  inversion,
  ventilation,
  profile,
}: SmogAdvisorChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendQuestion = async (rawQuestion: string) => {
    const question = rawQuestion.trim();
    if (!question || isStreaming) return;

    setErrorMsg(null);
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const assistantId = `assistant-${Date.now() + 1}`;
    const assistantPlaceholder: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const historyForApi = [...messages, userMsg]
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
    setInputValue('');
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamAdvisorChat({
        profile,
        airQuality: buildAirQualityContext(snapshot, inversion, ventilation),
        messages: historyForApi,
        signal: controller.signal,
        onChunk: (chunkText) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + chunkText } : m,
            ),
          );
        },
      });
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to complete response right now.';
        setErrorMsg(message);
        setMessages((prev) => prev.filter((m) => m.id !== assistantId || m.content.length > 0));
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendQuestion(inputValue);
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
  };

  return (
    <section
      aria-labelledby="advisor-chat-heading"
      className="bg-white border border-slate-200 rounded-lg flex flex-col min-h-[600px]"
    >
      <div className="p-5 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2
            id="advisor-chat-heading"
            className="text-lg font-semibold text-slate-900"
          >
            Ask Your Family Air Advisor
          </h2>
          <p className="text-sm text-slate-700 mt-1">
            Tailored for {snapshot.city.name} (AQI{' '}
            <span className="font-mono tabular-nums font-medium">{snapshot.usAqi}</span>,
            PM2.5{' '}
            <span className="font-mono tabular-nums font-medium">{snapshot.pm25}</span>{' '}
            µg/m³) and your {profile.householdSize}-member home. All budgets in ₹.
          </p>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => {
              handleStop();
              setMessages([]);
              setErrorMsg(null);
            }}
            className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-800 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            Clear Chat
          </button>
        )}
      </div>

      {/* Conversation Transcript */}
      <div
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-5"
      >
        {messages.length === 0 ? (
          <div className="max-w-3xl">
            <p className="text-base text-slate-800 leading-relaxed">
              Tap one of the common family questions below, or type your own question in plain words.
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void sendQuestion(prompt)}
                  className="p-4 text-left text-sm font-medium text-slate-900 bg-slate-50 hover:bg-teal-50/70 border border-slate-200 hover:border-teal-300 rounded-md transition-colors leading-relaxed cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <article
              key={msg.id}
              className={`max-w-3xl ${msg.role === 'user' ? 'ml-auto' : 'mr-auto'}`}
            >
              <div className="flex items-center gap-2 text-xs text-slate-600 mb-1.5">
                <span className="font-semibold text-slate-800">
                  {msg.role === 'user' ? 'You' : 'ClearAir Advisor'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{msg.timestamp}</span>
              </div>
              <div
                className={`p-4 rounded-lg text-base leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-teal-700 text-white'
                    : 'bg-slate-50 border border-slate-200 text-slate-900'
                }`}
              >
                {msg.content || (isStreaming ? 'Checking today’s air and writing simple steps...' : '')}
              </div>
            </article>
          ))
        )}

        {errorMsg && (
          <div
            role="alert"
            className="p-4 rounded-md bg-red-50 border border-red-200 text-sm text-red-900"
          >
            {errorMsg}
          </div>
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={handleSubmit}
        className="p-4 sm:p-5 border-t border-slate-200 flex items-center gap-3 bg-slate-50/60 rounded-b-lg"
      >
        <label htmlFor="advisor-question-input" className="sr-only">
          Type your question for ClearAir Advisor
        </label>
        <input
          id="advisor-question-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          maxLength={1000}
          placeholder={`Type a question about air quality in ${snapshot.city.name}...`}
          className="flex-1 h-12 px-4 text-base bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-500"
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={handleStop}
            className="h-12 px-5 inline-flex items-center gap-2 text-sm font-medium text-slate-900 bg-slate-200 hover:bg-slate-300 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Square className="w-4 h-4" aria-hidden="true" />
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="h-12 px-5 inline-flex items-center gap-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            Ask
          </button>
        )}
      </form>
    </section>
  );
}
