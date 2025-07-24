import { Router } from 'express';
import { ToolService } from '../services/toolService';

export const apiRouter = Router();

// Get all tools
apiRouter.get('/tool', async (req, res) => {
  try {
    const tools = await ToolService.getInstance().getAllTools();
    res.json({ tools });
  } catch (error) {
    console.error('Error fetching tools:', error);
    res.status(500).json({ error: 'Failed to fetch tools' });
  }
});

// Add or update tool description
apiRouter.post('/tool', async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !description) {
      return res.status(400).json({ 
        error: 'Both name and description are required' 
      });
    }

    if (typeof name !== 'string' || typeof description !== 'string') {
      return res.status(400).json({ 
        error: 'Name and description must be strings' 
      });
    }

    const tool = await ToolService.getInstance().upsertTool(name.trim(), description.trim());
    
    res.json({ 
      message: 'Tool saved successfully',
      tool: {
        name: tool.name,
        description: tool.description,
        createdAt: tool.createdAt,
        updatedAt: tool.updatedAt
      }
    });
  } catch (error) {
    console.error('Error saving tool:', error);
    res.status(500).json({ error: 'Failed to save tool' });
  }
});

// Delete tool
apiRouter.delete('/tool/:name', async (req, res) => {
  try {
    const { name } = req.params;
    
    // Note: In a real app, you might want to implement this
    res.status(501).json({ error: 'Delete functionality not implemented yet' });
  } catch (error) {
    console.error('Error deleting tool:', error);
    res.status(500).json({ error: 'Failed to delete tool' });
  }
});