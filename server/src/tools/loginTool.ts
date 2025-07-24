import { ToolService } from '../services/toolService';

export interface LoginToolParams {
  username: string;
  password: string;
}

export interface LoginToolResult {
  success: boolean;
  message: string;
  token?: string;
}

export class LoginTool {
  public static getName(): string {
    return 'login';
  }

  public static getDescription(): string {
    const toolService = ToolService.getInstance();
    const description = toolService.getToolDescription('login');
    
    return description || 'Authenticate user with username and password credentials';
  }

  public static getInputSchema() {
    return {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'User username'
        },
        password: {
          type: 'string',
          description: 'User password'
        }
      },
      required: ['username', 'password']
    };
  }

  public static async execute(params: LoginToolParams): Promise<LoginToolResult> {
    // Simulate login logic - in real app, you'd validate against database
    const { username, password } = params;
    
    // Simple demo validation
    if (username === 'admin' && password === 'password') {
      return {
        success: true,
        message: 'Login successful',
        token: 'demo-jwt-token-' + Date.now()
      };
    }
    
    return {
      success: false,
      message: 'Invalid credentials'
    };
  }
}