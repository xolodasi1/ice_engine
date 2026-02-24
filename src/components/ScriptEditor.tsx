import React from 'react';
import Editor from '@monaco-editor/react';
import { X, Save } from 'lucide-react';

interface ScriptEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (code: string) => void;
  initialCode: string;
  entityName: string;
}

const ScriptEditor: React.FC<ScriptEditorProps> = ({
  isOpen,
  onClose,
  onSave,
  initialCode,
  entityName,
}) => {
  const [code, setCode] = React.useState(initialCode);

  React.useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="flex h-[80vh] w-[80vw] flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-700 bg-gray-800 px-4 py-3">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-sm text-blue-400">script.js</span>
            <span className="text-xs text-gray-500">({entityName})</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                onSave(code);
                onClose();
              }}
              className="flex items-center space-x-1 rounded bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-700"
            >
              <Save size={14} />
              <span>Save & Close</span>
            </button>
            <button
              onClick={onClose}
              className="rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1">
          <Editor
            height="100%"
            defaultLanguage="javascript"
            theme="vs-dark"
            value={code}
            onChange={(value) => setCode(value || '')}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </div>
        
        {/* Footer / Help */}
        <div className="bg-gray-800 px-4 py-2 text-xs text-gray-400 border-t border-gray-700">
            Available variables: <code>entity</code>, <code>input</code>, <code>dt</code> (deltaTime). 
            Example: <code>entity.transform.position.x += 10 * dt;</code>
        </div>
      </div>
    </div>
  );
};

export default ScriptEditor;
