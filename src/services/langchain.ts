import { OpenAI } from 'langchain/llms/openai';
import { PromptTemplate } from 'langchain/prompts';
import { config } from '../config';

interface TaskStep {
  action: string;
  params: Record<string, unknown>;
}

interface TaskPlan {
  steps: TaskStep[];
}

export class LangChainService {
  private model: OpenAI;
  private promptTemplate: PromptTemplate;

  constructor() {
    this.model = new OpenAI({
      openAIApiKey: config.openaiApiKey,
      temperature: 0.7,
    });

    this.promptTemplate = PromptTemplate.fromTemplate(
      "Create a step-by-step plan to accomplish the following task in a web browser:\n{command}\n\nRespond with a JSON object containing an array of steps. Each step should have:\n- action: The browser action to perform (e.g., \"navigate\", \"click\", \"type\")\n- params: Parameters needed for the action (e.g., URL, selector, text)\n\nExample response:\n{\n  \"steps\": [\n    {\"action\": \"navigate\", \"params\": {\"url\": \"https://example.com\"}},\n    {\"action\": \"click\", \"params\": {\"selector\": \"#submit-button\"}}\n  ]\n}"
    );
  }

  async createTaskPlan(command: string): Promise<TaskPlan> {
    try {
      const prompt = await this.promptTemplate.format({ command });
      const response = await this.model.call(prompt);
      
      try {
        return JSON.parse(response);
      } catch (error) {
        console.error('Failed to parse LLM response:', response);
        throw new Error('Failed to create task plan: Invalid response format');
      }
    } catch (error) {
      console.error('LangChain error:', error);
      throw new Error('Failed to create task plan');
    }
  }
}