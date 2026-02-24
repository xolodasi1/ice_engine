import React, { useState } from 'react';
import { Entity, Asset, Scene } from '../types';
import { Code, Edit, Camera } from 'lucide-react';
import ScriptEditor from './ScriptEditor';
import DraggableNumberInput from './DraggableNumberInput';

interface InspectorProps {
  entity: Entity | null;
  scene: Scene;
  onUpdateEntity: (entity: Entity) => void;
  onUpdateScene: (scene: Scene) => void;
  assets: Asset[];
}

const Inspector: React.FC<InspectorProps> = ({ entity, scene, onUpdateEntity, onUpdateScene, assets }) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const handleSceneChange = (field: string, value: any) => {
    onUpdateScene({
      ...scene,
      [field]: value,
    });
  };

  const handleCameraChange = (field: string, value: any) => {
    onUpdateScene({
      ...scene,
      camera: {
        ...(scene.camera || { position: { x: 0, y: 0 }, zoom: 1, lerpSpeed: 0.1 }),
        [field]: value,
      },
    });
  };

  if (!entity) {
    return (
      <div className="flex h-full w-64 flex-col border-l border-gray-800 bg-gray-900 p-4 text-white overflow-y-auto">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-cyan-400">
          Scene Settings
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Background Color</label>
            <input
              type="color"
              value={scene.backgroundColor}
              onChange={(e) => handleSceneChange('backgroundColor', e.target.value)}
              className="h-8 w-full cursor-pointer rounded bg-gray-800"
            />
          </div>

          <div className="border-t border-gray-800 pt-4">
            <h3 className="mb-2 flex items-center space-x-2 text-xs font-bold uppercase text-cyan-400">
              <Camera size={14} />
              <span>Camera</span>
            </h3>
            <div className="space-y-2">
              <DraggableNumberInput
                label="Zoom"
                value={scene.camera?.zoom || 1}
                step={0.1}
                onChange={(v) => handleCameraChange('zoom', Math.max(0.1, v))}
              />
              <DraggableNumberInput
                label="Lerp Speed"
                value={scene.camera?.lerpSpeed || 0.1}
                step={0.01}
                onChange={(v) => handleCameraChange('lerpSpeed', Math.max(0.01, Math.min(1, v)))}
              />
              <div>
                <label className="block text-xs text-gray-500">Follow Target</label>
                <select
                  value={scene.camera?.targetId || ''}
                  onChange={(e) => handleCameraChange('targetId', e.target.value || null)}
                  className="w-full rounded bg-gray-800 px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="">None</option>
                  {scene.entities.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-4">
            <h3 className="mb-2 text-xs font-bold uppercase text-cyan-400">
              Physics Settings
            </h3>
            <div className="space-y-2">
              <DraggableNumberInput
                label="Fixed Timestep (Hz)"
                value={scene.physics?.fixedTimestep ? Math.round(1 / scene.physics.fixedTimestep) : 60}
                step={1}
                onChange={(v) => onUpdateScene({
                  ...scene,
                  physics: {
                    ...(scene.physics || { fixedTimestep: 1/60 }),
                    fixedTimestep: 1 / Math.max(10, Math.min(240, v))
                  }
                })}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleChange = (
    section: 'transform' | 'renderer' | 'physics' | 'particles' | 'tilemap',
    field: string,
    value: any
  ) => {
    const updatedEntity = { ...entity };
    // @ts-ignore
    updatedEntity[section] = { ...updatedEntity[section], [field]: value };
    onUpdateEntity(updatedEntity);
  };

  const imageAssets = assets.filter(a => a.type === 'image');

  return (
    <>
      <div className="flex h-full w-64 flex-col border-l border-gray-800 bg-gray-900 p-4 text-white overflow-y-auto">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-cyan-400">
          Inspector
        </h2>

        <div className="mb-4">
          <label className="mb-1 block text-xs text-gray-500">Name</label>
          <input
            type="text"
            value={entity.name}
            onChange={(e) => onUpdateEntity({ ...entity, name: e.target.value })}
            className="w-full rounded bg-gray-800 px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        {/* Transform */}
        <div className="mb-6 border-t border-gray-800 pt-4">
          <h3 className="mb-2 text-xs font-bold uppercase text-cyan-400">
            Transform
          </h3>
          <div className="space-y-2">
            <div className="flex items-center space-x-2 mb-2">
              <input
                type="checkbox"
                checked={entity.transform.isUI || false}
                onChange={(e) => handleChange('transform', 'isUI', e.target.checked)}
                className="rounded border-gray-700 bg-gray-800 text-cyan-500 focus:ring-cyan-500"
              />
              <label className="text-xs text-gray-300">Is UI Element (Screen Space)</label>
            </div>
            
            {entity.transform.isUI && (
              <div className="mb-2">
                <label className="block text-xs text-gray-500 mb-1">Anchor</label>
                <select
                  value={entity.transform.anchor || 'center'}
                  onChange={(e) => handleChange('transform', 'anchor', e.target.value)}
                  className="w-full rounded bg-gray-800 px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="top-left">Top Left</option>
                  <option value="top-center">Top Center</option>
                  <option value="top-right">Top Right</option>
                  <option value="center-left">Center Left</option>
                  <option value="center">Center</option>
                  <option value="center-right">Center Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="bottom-center">Bottom Center</option>
                  <option value="bottom-right">Bottom Right</option>
                </select>
              </div>
            )}

            <div className="flex space-x-2">
              <div className="flex-1">
                <DraggableNumberInput
                  label="Pos X"
                  value={entity.transform.position.x}
                  onChange={(v) =>
                    handleChange('transform', 'position', {
                      ...entity.transform.position,
                      x: v,
                    })
                  }
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <div className="flex-1">
                <DraggableNumberInput
                  label="Pos Y"
                  value={entity.transform.position.y}
                  onChange={(v) =>
                    handleChange('transform', 'position', {
                      ...entity.transform.position,
                      y: v,
                    })
                  }
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <div className="flex-1">
                <DraggableNumberInput
                  label="Rotation"
                  value={entity.transform.rotation}
                  onChange={(v) =>
                    handleChange('transform', 'rotation', v)
                  }
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <div className="flex-1">
                <DraggableNumberInput
                  label="Scale X"
                  value={entity.transform.scale.x}
                  step={0.1}
                  onChange={(v) =>
                    handleChange('transform', 'scale', {
                      ...entity.transform.scale,
                      x: v,
                    })
                  }
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <div className="flex-1">
                <DraggableNumberInput
                  label="Scale Y"
                  value={entity.transform.scale.y}
                  step={0.1}
                  onChange={(v) =>
                    handleChange('transform', 'scale', {
                      ...entity.transform.scale,
                      y: v,
                    })
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* Renderer */}
        <div className="mb-6 border-t border-gray-800 pt-4">
          <h3 className="mb-2 text-xs font-bold uppercase text-cyan-400">
            Renderer
          </h3>
          <div className="mb-2">
            <label className="block text-xs text-gray-500">Color</label>
            <input
              type="color"
              value={entity.renderer.color}
              onChange={(e) =>
                handleChange('renderer', 'color', e.target.value)
              }
              className="h-8 w-full cursor-pointer rounded bg-gray-800"
            />
          </div>
          <div className="space-y-2">
            <div className="flex space-x-2">
              <div className="flex-1">
                <DraggableNumberInput
                  label="Width"
                  value={entity.renderer.width}
                  onChange={(v) =>
                    handleChange('renderer', 'width', v)
                  }
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <div className="flex-1">
                <DraggableNumberInput
                  label="Height"
                  value={entity.renderer.height}
                  onChange={(v) =>
                    handleChange('renderer', 'height', v)
                  }
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <div className="flex-1">
                <DraggableNumberInput
                  label="Parallax"
                  value={entity.renderer.parallaxFactor ?? 1}
                  step={0.1}
                  onChange={(v) =>
                    handleChange('renderer', 'parallaxFactor', v)
                  }
                />
              </div>
            </div>
          </div>

          {/* Button Specific Properties */}
          {entity.renderer.type === 'button' && (
            <div className="mt-2 space-y-2 border-t border-gray-800 pt-2">
              <div>
                <label className="block text-xs text-gray-500">Text</label>
                <input
                  type="text"
                  value={entity.renderer.text || ''}
                  onChange={(e) =>
                    handleChange('renderer', 'text', e.target.value)
                  }
                  className="w-full rounded bg-gray-800 px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  placeholder="Button Text"
                />
              </div>
              <div>
                <DraggableNumberInput
                  label="Font Size"
                  value={entity.renderer.fontSize || 16}
                  onChange={(v) => handleChange('renderer', 'fontSize', v)}
                />
              </div>
            </div>
          )}

          {/* Sprite Specific Properties */}
          {entity.renderer.type === 'sprite' && (
            <div className="mt-2 space-y-2 border-t border-gray-800 pt-2">
              <div>
                <label className="block text-xs text-gray-500">Image Asset</label>
                <select
                  value={entity.renderer.spriteUrl || ''}
                  onChange={(e) => handleChange('renderer', 'spriteUrl', e.target.value)}
                  className="w-full rounded bg-gray-800 px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="">Select an image...</option>
                  {imageAssets.map(asset => (
                    <option key={asset.id} value={asset.url}>{asset.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <DraggableNumberInput
                    label="Cols"
                    value={entity.renderer.cols || 1}
                    onChange={(v) => handleChange('renderer', 'cols', Math.max(1, Math.floor(v)))}
                  />
                </div>
                <div>
                  <DraggableNumberInput
                    label="Rows"
                    value={entity.renderer.rows || 1}
                    onChange={(v) => handleChange('renderer', 'rows', Math.max(1, Math.floor(v)))}
                  />
                </div>
              </div>
              <div>
                <DraggableNumberInput
                  label="Current Frame"
                  value={entity.renderer.currentFrame || 0}
                  onChange={(v) => handleChange('renderer', 'currentFrame', Math.max(0, Math.floor(v)))}
                />
              </div>
            </div>
          )}
        </div>

        {/* Physics */}
        <div className="mb-6 border-t border-gray-800 pt-4">
          <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase text-cyan-400">
              Physics
              </h3>
              <button 
                  onClick={() => {
                      if (entity.physics) {
                          const { physics, ...rest } = entity;
                          onUpdateEntity(rest as Entity);
                      } else {
                          onUpdateEntity({
                              ...entity,
                              physics: {
                                  velocity: { x: 0, y: 0 },
                                  isStatic: false,
                                  gravityScale: 1
                              }
                          });
                      }
                  }}
                  className="text-xs text-cyan-500 hover:text-cyan-400"
              >
                  {entity.physics ? 'Remove' : 'Add'}
              </button>
          </div>
          
          {entity.physics && (
              <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                      <input
                          type="checkbox"
                          checked={entity.physics.isStatic}
                          onChange={(e) =>
                              handleChange('physics', 'isStatic', e.target.checked)
                          }
                          className="rounded bg-gray-800 text-cyan-500 focus:ring-cyan-500"
                      />
                      <label className="text-xs text-gray-300">Is Static</label>
                  </div>
                  <div>
                      <DraggableNumberInput
                          label="Gravity"
                          value={entity.physics.gravityScale}
                          step={0.1}
                          onChange={(v) =>
                              handleChange('physics', 'gravityScale', v)
                          }
                      />
                  </div>
              </div>
          )}
        </div>

        {/* Particles */}
        {entity.particles && (
          <div className="mb-6 border-t border-gray-800 pt-4">
            <h3 className="mb-2 text-xs font-bold uppercase text-cyan-400">
              Particles
            </h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="checkbox"
                  checked={entity.particles.emitting}
                  onChange={(e) => handleChange('particles', 'emitting', e.target.checked)}
                  className="rounded border-gray-700 bg-gray-800 text-cyan-500 focus:ring-cyan-500"
                />
                <label className="text-xs text-gray-300">Emitting</label>
              </div>
              <DraggableNumberInput label="Max Particles" value={entity.particles.maxParticles} onChange={(v) => handleChange('particles', 'maxParticles', v)} />
              <DraggableNumberInput label="Emission Rate" value={entity.particles.emissionRate} onChange={(v) => handleChange('particles', 'emissionRate', v)} />
              <DraggableNumberInput label="Lifetime" value={entity.particles.lifetime} step={0.1} onChange={(v) => handleChange('particles', 'lifetime', v)} />
              <DraggableNumberInput label="Speed" value={entity.particles.speed} onChange={(v) => handleChange('particles', 'speed', v)} />
              <DraggableNumberInput label="Angle" value={entity.particles.angle} onChange={(v) => handleChange('particles', 'angle', v)} />
              <DraggableNumberInput label="Spread" value={entity.particles.spread} onChange={(v) => handleChange('particles', 'spread', v)} />
              
              <div className="flex space-x-2">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500">Start Color</label>
                  <input type="color" value={entity.particles.colorStart} onChange={(e) => handleChange('particles', 'colorStart', e.target.value)} className="h-8 w-full cursor-pointer rounded bg-gray-800" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500">End Color</label>
                  <input type="color" value={entity.particles.colorEnd} onChange={(e) => handleChange('particles', 'colorEnd', e.target.value)} className="h-8 w-full cursor-pointer rounded bg-gray-800" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tilemap */}
        {entity.tilemap && (
          <div className="mb-6 border-t border-gray-800 pt-4">
            <h3 className="mb-2 text-xs font-bold uppercase text-cyan-400">
              Tilemap
            </h3>
            <div className="space-y-2">
              <DraggableNumberInput label="Tile Size" value={entity.tilemap.tileSize} onChange={(v) => handleChange('tilemap', 'tileSize', v)} />
              <DraggableNumberInput label="Columns" value={entity.tilemap.columns} onChange={(v) => handleChange('tilemap', 'columns', v)} />
              <DraggableNumberInput label="Rows" value={entity.tilemap.rows} onChange={(v) => handleChange('tilemap', 'rows', v)} />
              
              <div>
                <label className="block text-xs text-gray-500">Tileset Image</label>
                <select
                  value={entity.tilemap.tilesetUrl || ''}
                  onChange={(e) => handleChange('tilemap', 'tilesetUrl', e.target.value)}
                  className="w-full rounded bg-gray-800 px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="">None</option>
                  {imageAssets.map(a => (
                    <option key={a.id} value={a.url}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Script */}
        <div className="mb-6 border-t border-gray-800 pt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase text-cyan-400">
              Script
            </h3>
            {entity.script?.type === 'custom' && (
              <button
                onClick={() => setIsEditorOpen(true)}
                className="flex items-center space-x-1 text-xs text-cyan-500 hover:text-cyan-400"
              >
                <Code size={12} />
                <span>Edit Code</span>
              </button>
            )}
          </div>
          
          <div className="space-y-2">
            <select
                value={entity.script?.type || 'none'}
                onChange={(e) => {
                const type = e.target.value as any;
                if (type === 'none') {
                    const { script, ...rest } = entity;
                    onUpdateEntity(rest as Entity);
                } else {
                    // Default script template
                    const defaultCode = `// Available: entity, input, dt
// Example: Move right
// entity.transform.position.x += 100 * dt;

if (input.action) {
// Do something when action button is pressed
}
`;
                    onUpdateEntity({
                        ...entity,
                        script: { 
                            type: 'custom',
                            name: 'New Script',
                            content: entity.script?.content || defaultCode
                        }
                    });
                }
                }}
                className="w-full rounded bg-gray-800 px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
                <option value="none">None</option>
                <option value="custom">Custom Script (JS)</option>
            </select>

            {entity.script?.type === 'custom' && (
                <div>
                    <label className="block text-xs text-gray-500">Script Name</label>
                    <input
                        type="text"
                        value={entity.script.name || ''}
                        onChange={(e) =>
                            onUpdateEntity({
                                ...entity,
                                script: { ...entity.script!, name: e.target.value }
                            })
                        }
                        className="w-full rounded bg-gray-800 px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        placeholder="MyScript"
                    />
                </div>
            )}
          </div>
        </div>
      </div>

      {/* Script Editor Modal */}
      {isEditorOpen && entity.script?.type === 'custom' && (
        <ScriptEditor
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          initialCode={entity.script.content || ''}
          entityName={entity.name}
          onSave={(newCode) => {
            onUpdateEntity({
              ...entity,
              script: {
                ...entity.script!,
                content: newCode
              }
            });
          }}
        />
      )}
    </>
  );
};

export default Inspector;
