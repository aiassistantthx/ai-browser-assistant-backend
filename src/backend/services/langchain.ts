import { OpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
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

    this.promptTemplate = new PromptTemplate({
      template: "Create a step-by-step plan to accomplish the following task in a web browser:\n{command}\n\nRespond with a JSON object containing an array of 'steps'. Each step should have 'action' (e.g., navigate, click, type) and 'params' (e.g., url, selector, text) fields.",
      inputVariables: ["command"]
    });
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