import React, { useState } from 'react';
import { Entity, Asset } from '../types';
import { Layers, Square, Circle, Image as ImageIcon, MousePointerClick, Save, Plus } from 'lucide-react';

interface HierarchyProps {
  entities: Entity[];
  selectedEntityId: string | null;
  onSelectEntity: (id: string | null) => void;
  onAddEntity: (type: 'rect' | 'circle' | 'sprite' | 'button' | 'particles' | 'tilemap') => void;
  onSavePrefab: (entityId: string) => void;
  onInstantiatePrefab: (prefabId: string) => void;
  assets: Asset[];
}

const Hierarchy: React.FC<HierarchyProps> = ({
  entities,
  selectedEntityId,
  onSelectEntity,
  onAddEntity,
  onSavePrefab,
  onInstantiatePrefab,
  assets,
}) => {
  const prefabs = assets.filter(a => a.type === 'prefab');
  const [showPrefabs, setShowPrefabs] = useState(false);

  return (
    <div className="flex h-full w-64 flex-col border-r border-gray-700 bg-gray-900 text-white">
      <div className="flex flex-col border-b border-gray-700 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">
            Hierarchy
          </h2>
          <div className="flex space-x-1">
            <button
              onClick={() => onAddEntity('rect')}
              className="rounded p-1 hover:bg-gray-700"
              title="Add Rectangle"
            >
              <Square size={16} />
            </button>
            <button
              onClick={() => onAddEntity('circle')}
              className="rounded p-1 hover:bg-gray-700"
              title="Add Circle"
            >
              <Circle size={16} />
            </button>
            <button
              onClick={() => onAddEntity('button')}
              className="rounded p-1 hover:bg-gray-700"
              title="Add Button"
            >
              <MousePointerClick size={16} />
            </button>
          </div>
        </div>
        
        {/* Prefabs Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setShowPrefabs(!showPrefabs)}
            className="w-full flex items-center justify-center space-x-1 bg-gray-800 hover:bg-gray-700 text-xs py-1 rounded"
          >
            <Plus size={12} />
            <span>Instantiate Prefab</span>
          </button>
          {showPrefabs && prefabs.length > 0 && (
            <div className="absolute top-full left-0 w-full mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg z-10">
              {prefabs.map(prefab => (
                <div 
                  key={prefab.id}
                  onClick={() => {
                    onInstantiatePrefab(prefab.id);
                    setShowPrefabs(false);
                  }}
                  className="px-2 py-1 text-xs hover:bg-blue-600 cursor-pointer"
                >
                  {prefab.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        {entities.map((entity) => (
          <div
            key={entity.id}
            className={`flex cursor-pointer items-center justify-between space-x-2 rounded px-2 py-1 text-sm group ${
              selectedEntityId === entity.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <div 
              className="flex items-center space-x-2 flex-1 overflow-hidden"
              onClick={() => onSelectEntity(entity.id)}
            >
              <Layers size={14} className="opacity-50 shrink-0" />
              <span className="truncate">{entity.name}</span>
            </div>
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onSavePrefab(entity.id);
              }}
              className="opacity-0 group-hover:opacity-100 hover:text-green-400 p-1"
              title="Save as Prefab"
            >
              <Save size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Hierarchy;
