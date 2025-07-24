import React, { useState, useEffect } from 'react';
import { Settings, Database, Wrench } from 'lucide-react';

interface Tool {
  _id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

function App() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTools = async () => {
    try {
      const response = await fetch('/api/tool');
      if (!response.ok) throw new Error('Failed to fetch tools');
      const data = await response.json();
      setTools(data.tools || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tools');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.description.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save tool');
      
      setFormData({ name: '', description: '' });
      await fetchTools();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tool');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchTools();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-indigo-600 p-3 rounded-full mr-4">
              <Settings className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-800">MCP Tool Manager</h1>
          </div>
          <p className="text-gray-600 text-lg">
            Manage tool descriptions for Model Context Protocol integration
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Add Tool Form */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center mb-6">
              <Wrench className="w-6 h-6 text-indigo-600 mr-3" />
              <h2 className="text-2xl font-semibold text-gray-800">Add/Update Tool</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Tool Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., login, search, calculate"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Describe what this tool does..."
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Saving...' : 'Save Tool'}
              </button>
            </form>
          </div>

          {/* Tools List */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center mb-6">
              <Database className="w-6 h-6 text-indigo-600 mr-3" />
              <h2 className="text-2xl font-semibold text-gray-800">Available Tools</h2>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading tools...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-600">{error}</p>
                <button
                  onClick={fetchTools}
                  className="mt-2 text-indigo-600 hover:text-indigo-800"
                >
                  Try again
                </button>
              </div>
            ) : tools.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No tools found. Add your first tool!</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {tools.map((tool) => (
                  <div key={tool._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 mb-1">{tool.name}</h3>
                        <p className="text-gray-600 text-sm mb-2">{tool.description}</p>
                        <p className="text-xs text-gray-400">
                          Updated: {new Date(tool.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => setFormData({ name: tool.name, description: tool.description })}
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium ml-4"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500">
          <p>MCP Tool Manager - Manage your Model Context Protocol tools</p>
        </div>
      </div>
    </div>
  );
}

export default App;