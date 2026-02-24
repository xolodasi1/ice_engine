import React, { useState, useEffect, useRef } from 'react';
import { Trash2, AlertTriangle, Info, XCircle } from 'lucide-react';

export interface LogMessage {
  id: string;
  type: 'log' | 'warn' | 'error';
  message: string;
  timestamp: number;
}

interface ConsoleProps {
  logs: LogMessage[];
  onClear: () => void;
}

const Console: React.FC<ConsoleProps> = ({ logs, onClear }) => {
  const [filter, setFilter] = useState<'all' | 'log' | 'warn' | 'error'>('all');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, filter]);

  const filteredLogs = logs.filter((log) => filter === 'all' || log.type === filter);

  return (
    <div className="flex h-48 flex-col border-t border-gray-700 bg-gray-900 text-white">
      <div className="flex items-center justify-between border-b border-gray-800 bg-gray-800 px-4 py-1">
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-1 text-xs rounded ${filter === 'all' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('log')}
            className={`flex items-center space-x-1 px-2 py-1 text-xs rounded ${filter === 'log' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
          >
            <Info size={12} className="text-blue-400" />
            <span>Logs</span>
          </button>
          <button
            onClick={() => setFilter('warn')}
            className={`flex items-center space-x-1 px-2 py-1 text-xs rounded ${filter === 'warn' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
          >
            <AlertTriangle size={12} className="text-yellow-400" />
            <span>Warnings</span>
          </button>
          <button
            onClick={() => setFilter('error')}
            className={`flex items-center space-x-1 px-2 py-1 text-xs rounded ${filter === 'error' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
          >
            <XCircle size={12} className="text-red-400" />
            <span>Errors</span>
          </button>
        </div>
        <button
          onClick={onClear}
          className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-400 hover:text-white rounded hover:bg-gray-700"
        >
          <Trash2 size={12} />
          <span>Clear</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 font-mono text-xs">
        {filteredLogs.length === 0 ? (
          <div className="text-gray-500 italic">No logs to display.</div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className={`mb-1 flex items-start space-x-2 border-b border-gray-800/50 pb-1 ${
                log.type === 'error' ? 'text-red-400' : log.type === 'warn' ? 'text-yellow-400' : 'text-gray-300'
              }`}
            >
              <span className="text-gray-600">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
              {log.type === 'error' && <XCircle size={14} className="mt-0.5 flex-shrink-0" />}
              {log.type === 'warn' && <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />}
              {log.type === 'log' && <Info size={14} className="mt-0.5 flex-shrink-0 text-blue-400" />}
              <span className="break-all whitespace-pre-wrap">{log.message}</span>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
};

export default Console;
