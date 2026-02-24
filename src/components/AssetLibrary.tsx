import React, { useState } from 'react';
import { Asset } from '../types';
import { Image, Music, FileCode, Plus, Trash2 } from 'lucide-react';

interface AssetLibraryProps {
  assets: Asset[];
  onAddAsset: (asset: Asset) => void;
  onRemoveAsset: (id: string) => void;
}

const AssetLibrary: React.FC<AssetLibraryProps> = ({ assets, onAddAsset, onRemoveAsset }) => {
  const [newAssetUrl, setNewAssetUrl] = useState('');
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetType, setNewAssetType] = useState<'image' | 'audio' | 'script'>('image');

  const handleAdd = () => {
    if (newAssetUrl && newAssetName) {
      onAddAsset({
        id: crypto.randomUUID(),
        name: newAssetName,
        type: newAssetType,
        url: newAssetUrl,
      });
      setNewAssetUrl('');
      setNewAssetName('');
    }
  };

  return (
    <div className="flex h-full flex-col bg-gray-900 text-white">
      <div className="border-b border-gray-800 p-4">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-cyan-400">
          Asset Library
        </h2>
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Asset Name"
            value={newAssetName}
            onChange={(e) => setNewAssetName(e.target.value)}
            className="w-full rounded bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
          <input
            type="text"
            placeholder="URL (e.g., https://... or data:image/...)"
            value={newAssetUrl}
            onChange={(e) => setNewAssetUrl(e.target.value)}
            className="w-full rounded bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
          <div className="flex space-x-2">
            <select
              value={newAssetType}
              onChange={(e) => setNewAssetType(e.target.value as any)}
              className="flex-1 rounded bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="image">Image</option>
              <option value="audio">Audio</option>
              <option value="script">Script</option>
            </select>
            <button
              onClick={handleAdd}
              disabled={!newAssetUrl || !newAssetName}
              className="flex items-center justify-center rounded bg-cyan-600 px-4 py-2 text-sm font-medium hover:bg-cyan-500 disabled:opacity-50"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {assets.length === 0 ? (
          <div className="text-center text-sm text-gray-500 italic">No assets loaded.</div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="group relative flex flex-col items-center justify-center rounded-lg border border-gray-800 bg-gray-800/50 p-4 hover:border-cyan-500/50"
              >
                {asset.type === 'image' && (
                  <div className="mb-2 h-16 w-16 overflow-hidden rounded bg-gray-900 flex items-center justify-center">
                    <img src={asset.url} alt={asset.name} className="max-h-full max-w-full object-contain" />
                  </div>
                )}
                {asset.type === 'audio' && <Music size={32} className="mb-2 text-purple-400" />}
                {asset.type === 'script' && <FileCode size={32} className="mb-2 text-green-400" />}
                <span className="text-xs text-gray-300 truncate w-full text-center" title={asset.name}>
                  {asset.name}
                </span>
                <button
                  onClick={() => onRemoveAsset(asset.id)}
                  className="absolute right-2 top-2 hidden rounded bg-red-500/20 p-1 text-red-400 hover:bg-red-500 hover:text-white group-hover:block"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetLibrary;
