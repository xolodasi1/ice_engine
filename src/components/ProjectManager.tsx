import React, { useState, useEffect } from 'react';
import { Project, Scene } from '../types';
import { FolderPlus, FolderOpen, Trash2 } from 'lucide-react';

interface ProjectManagerProps {
  onOpenProject: (project: Project) => void;
}

const INITIAL_SCENE: Scene = {
  backgroundColor: '#1a1a1a',
  entities: [],
};

const ProjectManager: React.FC<ProjectManagerProps> = ({ onOpenProject }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  useEffect(() => {
    const savedProjects = localStorage.getItem('web2d_projects');
    if (savedProjects) {
      try {
        setProjects(JSON.parse(savedProjects));
      } catch (e) {
        console.error('Failed to parse projects', e);
      }
    }
  }, []);

  const saveProjects = (updatedProjects: Project[]) => {
    localStorage.setItem('web2d_projects', JSON.stringify(updatedProjects));
    setProjects(updatedProjects);
  };

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;

    const newProject: Project = {
      id: crypto.randomUUID(),
      name: newProjectName,
      createdAt: Date.now(),
      scene: JSON.parse(JSON.stringify(INITIAL_SCENE)),
    };

    const updatedProjects = [...projects, newProject];
    saveProjects(updatedProjects);
    setNewProjectName('');
    setIsCreating(false);
    onOpenProject(newProject);
  };

  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project?')) {
      const updatedProjects = projects.filter((p) => p.id !== id);
      saveProjects(updatedProjects);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-950 text-white">
      <div className="w-full max-w-2xl rounded-xl border border-gray-800 bg-gray-900 p-8 shadow-2xl">
        <h1 className="mb-8 text-3xl font-bold text-blue-500">Web2D Engine</h1>

        {!isCreating ? (
          <>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Your Projects</h2>
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center space-x-2 rounded bg-blue-600 px-4 py-2 font-bold hover:bg-blue-700"
              >
                <FolderPlus size={20} />
                <span>New Project</span>
              </button>
            </div>

            <div className="grid gap-4">
              {projects.length === 0 ? (
                <div className="rounded border border-dashed border-gray-700 p-8 text-center text-gray-500">
                  No projects found. Create one to get started!
                </div>
              ) : (
                projects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => onOpenProject(project)}
                    className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-800 bg-gray-800 p-4 transition hover:border-blue-500 hover:bg-gray-750"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="rounded bg-blue-500/20 p-2 text-blue-400">
                        <FolderOpen size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold">{project.name}</h3>
                        <p className="text-xs text-gray-500">
                          Created: {new Date(project.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteProject(project.id, e)}
                      className="rounded p-2 text-gray-400 hover:bg-red-500/20 hover:text-red-500"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Create New Project</h2>
            <div>
              <label className="mb-1 block text-sm text-gray-400">Project Name</label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white focus:border-blue-500 focus:outline-none"
                placeholder="My Awesome Game"
                autoFocus
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => setIsCreating(false)}
                className="rounded px-4 py-2 text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
                className="rounded bg-blue-600 px-6 py-2 font-bold disabled:opacity-50 hover:bg-blue-700"
              >
                Create Project
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectManager;
