import { Tool, ITool } from '../models/Tool';

export class ToolService {
  private static instance: ToolService;
  private toolDescriptions: Map<string, string> = new Map();

  private constructor() {}

  public static getInstance(): ToolService {
    if (!ToolService.instance) {
      ToolService.instance = new ToolService();
    }
    return ToolService.instance;
  }

  public async loadToolDescriptions(): Promise<void> {
    try {
      const tools = await Tool.find({});
      this.toolDescriptions.clear();
      
      tools.forEach(tool => {
        this.toolDescriptions.set(tool.name, tool.description);
      });

      console.log(`Loaded ${tools.length} tool descriptions from database`);
    } catch (error) {
      console.error('Error loading tool descriptions:', error);
      throw error;
    }
  }

  public getToolDescription(toolName: string): string | undefined {
    return this.toolDescriptions.get(toolName);
  }

  public async upsertTool(name: string, description: string): Promise<ITool> {
    try {
      const tool = await Tool.findOneAndUpdate(
        { name },
        { name, description },
        { upsert: true, new: true }
      );

      // Update local cache
      this.toolDescriptions.set(name, description);
      
      return tool;
    } catch (error) {
      console.error('Error upserting tool:', error);
      throw error;
    }
  }

  public async getAllTools(): Promise<ITool[]> {
    try {
      return await Tool.find({}).sort({ name: 1 });
    } catch (error) {
      console.error('Error fetching tools:', error);
      throw error;
    }
  }

  public getAvailableTools(): { name: string; description: string }[] {
    return Array.from(this.toolDescriptions.entries()).map(([name, description]) => ({
      name,
      description
    }));
  }
}