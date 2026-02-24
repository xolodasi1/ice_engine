import React, { useState, useRef, useEffect } from 'react';
import { Scene, Entity, Project, Asset } from './types';
import Hierarchy from './components/Hierarchy';
import Inspector from './components/Inspector';
import GameCanvas from './components/GameCanvas';
import TouchControls from './components/TouchControls';
import ProjectManager from './components/ProjectManager';
import Console, { LogMessage } from './components/Console';
import AssetLibrary from './components/AssetLibrary';
import { Play, Square, Smartphone, Download, ArrowLeft, SplitSquareHorizontal, Terminal, Image as ImageIcon } from 'lucide-react';
import { exportGame } from './utils/exportGame';
import { InputManager } from './utils/InputManager';

const DEVICES = [
  { name: 'Default (800x600)', width: 800, height: 600 },
  { name: 'iPhone 14 (390x844)', width: 390, height: 844 },
  { name: 'Pixel 7 (412x915)', width: 412, height: 915 },
  { name: 'Tablet (1024x768)', width: 1024, height: 768 },
  { name: 'Desktop (1920x1080)', width: 1920, height: 1080 },
];

export default function App() {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [scene, setScene] = useState<Scene | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showMobileControls, setShowMobileControls] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(DEVICES[0]);
  const [viewLayout, setViewLayout] = useState<'single' | 'split'>('single');
  const [bottomPanel, setBottomPanel] = useState<'none' | 'console' | 'assets'>('none');
  const [logs, setLogs] = useState<LogMessage[]>([]);
  
  const inputRef = useRef({ x: 0, y: 0, action: false });
  const inputManagerRef = useRef(new InputManager());

  // Initialize InputManager
  useEffect(() => {
    inputManagerRef.current.init();
    return () => inputManagerRef.current.destroy();
  }, []);

  // Update InputManager state based on play mode
  useEffect(() => {
    inputManagerRef.current.setEnabled(isPlaying);
  }, [isPlaying]);

  // Intercept Console Logs
  useEffect(() => {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    const addLog = (type: 'log' | 'warn' | 'error', args: any[]) => {
      const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
      setLogs(prev => [...prev, { id: crypto.randomUUID(), type, message, timestamp: Date.now() }]);
    };

    console.log = (...args) => { originalLog(...args); addLog('log', args); };
    console.warn = (...args) => { originalWarn(...args); addLog('warn', args); };
    console.error = (...args) => { originalError(...args); addLog('error', args); };

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  // Auto-save project
  useEffect(() => {
    if (currentProject && scene) {
      const projects = JSON.parse(localStorage.getItem('web2d_projects') || '[]');
      const updatedProjects = projects.map((p: Project) => 
        p.id === currentProject.id ? { ...p, scene, assets } : p
      );
      localStorage.setItem('web2d_projects', JSON.stringify(updatedProjects));
    }
  }, [scene, assets, currentProject]);

  const handleOpenProject = (project: Project) => {
    setCurrentProject(project);
    setScene(project.scene);
    setAssets(project.assets || []);
    setIsPlaying(false);
    setSelectedEntityId(null);
  };

  const handleCloseProject = () => {
    setCurrentProject(null);
    setScene(null);
    setAssets([]);
  };

  const handleAddEntity = (type: 'rect' | 'circle' | 'sprite' | 'button' | 'particles' | 'tilemap') => {
    if (!scene) return;
    const newEntity: Entity = {
      id: crypto.randomUUID(),
      name: `New ${type}`,
      transform: {
        position: { x: selectedDevice.width / 2, y: selectedDevice.height / 2 },
        rotation: 0,
        scale: { x: 1, y: 1 },
      },
      renderer: {
        type: type === 'particles' || type === 'tilemap' ? 'rect' : type, // Fallback renderer type
        color: type === 'rect' ? '#06b6d4' : type === 'button' ? '#0ea5e9' : 'transparent',
        width: type === 'button' ? 120 : 50,
        height: 50,
        text: type === 'button' ? 'Button' : undefined,
        fontSize: 16,
        parallaxFactor: 1,
      },
    };

    if (type === 'particles') {
      newEntity.particles = {
        emitting: true,
        maxParticles: 100,
        emissionRate: 10,
        lifetime: 2,
        lifetimeRange: 0.5,
        speed: 100,
        speedRange: 20,
        angle: -90,
        spread: 45,
        colorStart: '#ffaa00',
        colorEnd: '#ff0000',
        sizeStart: 10,
        sizeEnd: 2
      };
    } else if (type === 'tilemap') {
      newEntity.tilemap = {
        tileSize: 32,
        columns: 10,
        rows: 10,
        layers: [{ name: 'Layer 1', data: new Array(100).fill(0) }]
      };
    }

    setScene((prev) => prev ? ({
      ...prev,
      entities: [...prev.entities, newEntity],
    }) : null);
    setSelectedEntityId(newEntity.id);
  };

  const handleSavePrefab = (entityId: string) => {
    if (!scene) return;
    const entity = scene.entities.find(e => e.id === entityId);
    if (!entity) return;

    // Create a deep copy without the id
    const { id, ...entityData } = JSON.parse(JSON.stringify(entity));
    
    const newAsset: Asset = {
      id: crypto.randomUUID(),
      name: `${entity.name} Prefab`,
      type: 'prefab',
      url: '',
      data: JSON.stringify(entityData)
    };

    handleAddAsset(newAsset);
  };

  const handleInstantiatePrefab = (prefabId: string) => {
    const prefabAsset = assets.find(a => a.id === prefabId);
    if (!prefabAsset || !prefabAsset.data) return;

    try {
      const entityData = JSON.parse(prefabAsset.data);
      const newEntity: Entity = {
        ...entityData,
        id: crypto.randomUUID(),
        name: `${entityData.name} (Instance)`,
        prefabId: prefabId,
        transform: {
          ...entityData.transform,
          position: { 
            x: entityData.transform.position.x + 20, 
            y: entityData.transform.position.y + 20 
          }
        }
      };

      setScene((prev) => prev ? ({
        ...prev,
        entities: [...prev.entities, newEntity],
      }) : null);
      setSelectedEntityId(newEntity.id);
    } catch (e) {
      console.error("Failed to instantiate prefab", e);
    }
  };

  const handleUpdateEntity = (updatedEntity: Entity) => {
    setScene((prev) => prev ? ({
      ...prev,
      entities: prev.entities.map((e) =>
        e.id === updatedEntity.id ? updatedEntity : e
      ),
    }) : null);
  };

  const handleEntityTransformChange = (id: string, transform: any) => {
    setScene((prev) => {
        if (!prev) return null;
        return {
            ...prev,
            entities: prev.entities.map(e => 
                e.id === id ? { ...e, transform } : e
            )
        };
    });
  };

  const handleAddAsset = (asset: Asset) => {
    setAssets(prev => [...prev, asset]);
  };

  const handleRemoveAsset = (id: string) => {
    setAssets(prev => prev.filter(a => a.id !== id));
  };

  if (!currentProject || !scene) {
    return <ProjectManager onOpenProject={handleOpenProject} />;
  }

  const selectedEntity = scene.entities.find((e) => e.id === selectedEntityId) || null;

  return (
    <div className="flex h-screen flex-col bg-gray-950 text-white overflow-hidden font-sans">
      {/* Toolbar */}
      <div className="flex h-14 items-center justify-between border-b border-gray-800 bg-gray-900 px-4">
        <div className="flex items-center space-x-4">
          <button 
            onClick={handleCloseProject}
            className="flex items-center space-x-1 text-gray-400 hover:text-cyan-400"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Projects</span>
          </button>
          <div className="h-6 w-px bg-gray-700" />
          <span className="font-bold text-cyan-400 tracking-wider">ICE ENGINE</span>
          <span className="text-sm text-gray-500">|</span>
          <span className="text-sm font-medium text-gray-300">{currentProject.name}</span>
        </div>
        
        <div className="flex items-center space-x-3">
            {/* Device Selector */}
            <select
                value={selectedDevice.name}
                onChange={(e) => setSelectedDevice(DEVICES.find(d => d.name === e.target.value) || DEVICES[0])}
                className="rounded bg-gray-800 px-2 py-1 text-sm text-gray-300 border border-gray-700 focus:outline-none focus:border-cyan-500"
            >
                {DEVICES.map(d => (
                    <option key={d.name} value={d.name}>{d.name}</option>
                ))}
            </select>

            <div className="h-6 w-px bg-gray-700" />

            <button
                onClick={() => setBottomPanel(p => p === 'assets' ? 'none' : 'assets')}
                className={`flex items-center space-x-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                bottomPanel === 'assets' ? 'bg-cyan-900 text-cyan-300' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                }`}
                title="Toggle Asset Library"
            >
                <ImageIcon size={16} />
                <span>Assets</span>
            </button>

            <button
                onClick={() => setBottomPanel(p => p === 'console' ? 'none' : 'console')}
                className={`flex items-center space-x-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                bottomPanel === 'console' ? 'bg-cyan-900 text-cyan-300' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                }`}
                title="Toggle Console"
            >
                <Terminal size={16} />
                <span>Console</span>
            </button>

            <div className="h-6 w-px bg-gray-700" />

            <button
                onClick={() => setViewLayout(v => v === 'single' ? 'split' : 'single')}
                className={`flex items-center space-x-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                viewLayout === 'split' ? 'bg-cyan-900 text-cyan-300' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                }`}
                title="Toggle Split View"
            >
                <SplitSquareHorizontal size={16} />
                <span>Split View</span>
            </button>

            <button
                onClick={() => exportGame(scene)}
                className="flex items-center space-x-1 rounded px-3 py-1.5 text-sm font-medium bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200 transition-colors"
                title="Download HTML for Mobile"
            >
                <Download size={16} />
                <span>Export</span>
            </button>

            <button
                onClick={() => setShowMobileControls(!showMobileControls)}
                className={`flex items-center space-x-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                showMobileControls ? 'bg-purple-900 text-purple-300' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                }`}
            >
                <Smartphone size={16} />
                <span>Mobile View</span>
            </button>

            <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`flex items-center space-x-1 rounded px-4 py-1.5 text-sm font-bold transition-colors ${
                isPlaying
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50'
                    : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/50'
                }`}
            >
                {isPlaying ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                <span>{isPlaying ? 'Stop' : 'Play'}</span>
            </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Hierarchy
          entities={scene.entities}
          selectedEntityId={selectedEntityId}
          onSelectEntity={setSelectedEntityId}
          onAddEntity={handleAddEntity}
          onSavePrefab={handleSavePrefab}
          onInstantiatePrefab={handleInstantiatePrefab}
          assets={assets}
        />

        {/* Center Area (Canvas + Bottom Panel) */}
        <div className="flex flex-1 flex-col overflow-hidden bg-gray-950">
          <div className="relative flex flex-1 overflow-hidden">
              {/* Scene View */}
              <div className={`relative flex items-center justify-center p-8 ${viewLayout === 'split' ? 'w-1/2 border-r border-gray-800' : 'w-full'}`}>
                  {viewLayout === 'split' && <div className="absolute top-2 left-2 z-10 text-xs text-cyan-400 font-bold bg-gray-900/80 px-2 py-1 rounded border border-cyan-900 pointer-events-none">SCENE</div>}
                  <div 
                      className={`relative transition-all duration-300 ${showMobileControls && viewLayout === 'single' ? 'border-8 border-gray-900 rounded-3xl overflow-hidden shadow-2xl' : 'shadow-lg'}`}
                      style={{
                          width: showMobileControls && viewLayout === 'single' ? selectedDevice.width : undefined,
                          height: showMobileControls && viewLayout === 'single' ? selectedDevice.height : undefined,
                          maxWidth: showMobileControls && viewLayout === 'single' ? undefined : '100%',
                          maxHeight: showMobileControls && viewLayout === 'single' ? undefined : '100%',
                          aspectRatio: `${selectedDevice.width}/${selectedDevice.height}`
                      }}
                  >
                      <GameCanvas
                          scene={scene}
                          isPlaying={isPlaying}
                          selectedEntityId={selectedEntityId}
                          onSelectEntity={setSelectedEntityId}
                          inputRef={inputRef}
                          inputManager={inputManagerRef.current}
                          deviceSize={selectedDevice}
                          onEntityTransformChange={handleEntityTransformChange}
                      />
                      
                      {/* Mobile Controls Overlay (only in single view if playing) */}
                      {(isPlaying && showMobileControls && viewLayout === 'single') && (
                          <TouchControls
                              onInput={(input) => {
                                  inputRef.current = input;
                              }}
                          />
                      )}
                  </div>
                  
                  {/* Hint */}
                  {!isPlaying && viewLayout === 'single' && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded bg-gray-900/80 border border-gray-800 px-4 py-2 text-xs text-gray-400 backdrop-blur pointer-events-none">
                          {showMobileControls ? 'Mobile Preview Mode' : 'Editor Mode - Drag to move, scroll to scale'}
                      </div>
                  )}
              </div>

              {/* Game View */}
              {(viewLayout === 'split' || isPlaying) && (
                  <div className={`relative flex items-center justify-center p-8 ${viewLayout === 'split' && !isPlaying ? 'w-1/2' : isPlaying ? 'absolute inset-0 z-10 bg-gray-950' : 'hidden'}`}>
                      {(viewLayout === 'split' || isPlaying) && <div className="absolute top-2 left-2 z-10 text-xs text-green-400 font-bold bg-gray-900/80 px-2 py-1 rounded border border-green-900 pointer-events-none">GAME</div>}
                      <div 
                          className={`relative transition-all duration-300 ${showMobileControls ? 'border-8 border-gray-900 rounded-3xl overflow-hidden shadow-2xl' : 'shadow-lg'}`}
                          style={{
                              width: showMobileControls ? selectedDevice.width : undefined,
                              height: showMobileControls ? selectedDevice.height : undefined,
                              maxWidth: showMobileControls ? undefined : '100%',
                              maxHeight: showMobileControls ? undefined : '100%',
                              aspectRatio: `${selectedDevice.width}/${selectedDevice.height}`
                          }}
                      >
                          <GameCanvas
                              scene={scene}
                              isPlaying={isPlaying}
                              selectedEntityId={null} // No selection in Game view
                              onSelectEntity={() => {}} // No selection in Game view
                              inputRef={inputRef}
                              inputManager={inputManagerRef.current}
                              deviceSize={selectedDevice}
                              isReadOnly={true}
                          />
                          
                          {/* Mobile Controls Overlay */}
                          {(showMobileControls) && (
                              <TouchControls
                                  onInput={(input) => {
                                      inputRef.current = input;
                                  }}
                              />
                          )}
                      </div>
                  </div>
              )}
          </div>
          
          {/* Bottom Panel */}
          {bottomPanel === 'console' && (
            <Console logs={logs} onClear={() => setLogs([])} />
          )}
          {bottomPanel === 'assets' && (
            <div className="h-48 border-t border-gray-800">
              <AssetLibrary assets={assets} onAddAsset={handleAddAsset} onRemoveAsset={handleRemoveAsset} />
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <Inspector 
          entity={selectedEntity} 
          scene={scene}
          onUpdateEntity={handleUpdateEntity} 
          onUpdateScene={setScene}
          assets={assets} 
        />
      </div>
    </div>
  );
}
