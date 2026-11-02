import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  BarChart2,
  Loader2,
} from 'lucide-react';
import type { ExtractedTable } from '../../extraction/types.js';
import type { ColumnInfo, FunctionId } from '../../analysis/types.js';
import { executeNaturalLanguageQuery } from '../../ai/queryInterpreter.js';
import type { ChatMessage } from '../../ai/types.js';

interface DataAssistantChatProps {
  table: ExtractedTable;
  columns: ColumnInfo[];
  onVisualizeInWorkspace: (functionId: FunctionId, primaryColumn: string) => void;
}

export const DataAssistantChat: React.FC<DataAssistantChatProps> = ({
  table,
  columns,
  onVisualizeInWorkspace,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize greeting on table load
  useEffect(() => {
    setMessages([
      {
        id: 'initial-greeting',
        role: 'assistant',
        text: `Hello! I'm your DataLens Assistant. Ask me any question about **"${table.name}"** (${table.totalRows} rows, ${table.totalColumns} columns).`,
        timestamp: Date.now(),
      },
    ]);
  }, [table.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || inputText).trim();
    if (!textToSend || isProcessing) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsProcessing(true);

    try {
      const responseMsg = await executeNaturalLanguageQuery(textToSend, table, columns, messages);
      setMessages((prev) => [...prev, responseMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: `Error analyzing query: ${err instanceof Error ? err.message : String(err)}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const sampleQuestions = [
    `What is the average ${columns.find((c) => c.dataType === 'numerical')?.name || 'value'}?`,
    `Show me the top 5 records`,
    `Are there any outliers in ${columns.find((c) => c.dataType === 'numerical')?.name || 'data'}?`,
    `Show distribution of ${columns[0]?.name || 'column'}`,
  ];

  return (
    <div className="flex h-[480px] flex-col rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-3.5 py-2.5">
        <div className="flex items-center gap-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-2xs">
            <Bot className="h-3.5 w-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800">Conversational Data Assistant</h3>
            <p className="text-[10px] text-slate-500">Natural language questions backed by real calculations</p>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-2 text-xs ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 mt-0.5">
                  <Sparkles className="h-3 w-3" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-2.5 shadow-2xs ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-br-xs'
                    : 'bg-slate-50 border border-slate-200/80 text-slate-800 rounded-bl-xs'
                }`}
              >
                <div className="leading-relaxed whitespace-pre-wrap">{msg.text}</div>

                {/* Filtered Rows Preview */}
                {msg.filteredRows && msg.filteredRows.length > 0 && (
                  <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-white text-[10px] p-1">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-100 font-semibold text-slate-500">
                          {table.headers.slice(0, 4).map((h) => (
                            <th key={h} className="p-1 truncate max-w-[80px]">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {msg.filteredRows.map((r, i) => (
                          <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                            {r.slice(0, 4).map((cell, ci) => (
                              <td key={ci} className="p-1 truncate max-w-[80px] font-mono">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Visualize Action Shortcut */}
                {msg.suggestedFunctionId && msg.suggestedColumn && (
                  <div className="mt-2 pt-1.5 border-t border-slate-200/60 flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        onVisualizeInWorkspace(msg.suggestedFunctionId!, msg.suggestedColumn!)
                      }
                      className="flex items-center gap-1 rounded-md bg-white border border-indigo-200 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 hover:bg-indigo-50 shadow-2xs cursor-pointer"
                    >
                      <BarChart2 className="h-3 w-3" />
                      <span>Visualize in Workspace</span>
                    </button>
                  </div>
                )}
              </div>

              {isUser && (
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-300 text-slate-700 mt-0.5">
                  <User className="h-3 w-3" />
                </div>
              )}
            </div>
          );
        })}

        {isProcessing && (
          <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
            <span>Interpreting query & executing calculations...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions Pills */}
      <div className="border-t border-slate-100 bg-slate-50/50 p-2 overflow-x-auto flex gap-1.5 scrollbar-none">
        {sampleQuestions.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => handleSend(q)}
            className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-medium text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 shadow-2xs transition-all cursor-pointer truncate max-w-[220px]"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div className="border-t border-slate-100 p-2 bg-white flex items-center gap-1.5">
        <input
          type="text"
          placeholder="Ask a question about this dataset..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          type="button"
          onClick={() => handleSend()}
          disabled={!inputText.trim() || isProcessing}
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs hover:bg-indigo-500 disabled:opacity-40 cursor-pointer transition-all"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
