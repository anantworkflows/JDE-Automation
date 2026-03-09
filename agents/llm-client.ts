/**
 * LLM Client - Integration layer for Agent Architecture
 * 
 * Provides unified interface to call different LLMs:
 * - kimi-k2.5 (via OpenAI-compatible API)
 * - qwen3:8b (via local Ollama)
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  durationMs: number;
}

export interface ArchitectOutput {
  iteration: number;
  analysis: string;
  requirements: Array<{
    description: string;
    success_criteria: string;
    abstract_elements: string[];
  }>;
  success_criteria: string[];
  estimated_complexity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ProgrammerOutput {
  code: string;
  imports: string[];
  helper_functions: string[];
  test_assertions: string[];
}

export class LLMClient {
  private config: {
    kimiApiKey?: string;
    kimiBaseUrl: string;
    ollamaBaseUrl: string;
    defaultTimeout: number;
  };

  constructor() {
    // Load from environment or use defaults
    this.config = {
      kimiApiKey: process.env.KIMI_API_KEY,
      kimiBaseUrl: process.env.KIMI_BASE_URL || 'https://api.moonshot.cn/v1',
      ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      defaultTimeout: 60000
    };
  }

  /**
   * Call Architect Agent (kimi-k2.5 with reasoning)
   * Used for: Requirement analysis, system design, WHAT not HOW
   */
  async callArchitect(
    stepName: string,
    workflowState: any,
    previousResult: any,
    iteration: number
  ): Promise<ArchitectOutput> {
    const startTime = Date.now();
    
    console.log(`\n🏗️  ARCHITECT (kimi-k2.5, reasoning=ON)`);
    console.log(`   Step: ${stepName}, Iteration: ${iteration}`);

    // Build system prompt
    const systemPrompt = this.loadPrompt('architect/system');
    
    // Build user prompt
    const userPrompt = `
## Current Task
Design requirements for step: "${stepName}"

## Workflow State
${JSON.stringify(workflowState, null, 2)}

## Previous Attempt Result
${JSON.stringify(previousResult, null, 2)}

## Iteration
${iteration}

## Instructions
1. Analyze what needs to be done
2. Identify any failures from previous attempts
3. Design 1-5 clear requirements
4. Use abstract element names only (no selectors)
5. Define clear success criteria

## Output Format
Return valid YAML only:

iteration: ${iteration}
analysis: "Your analysis here"
requirements:
  - description: "What to do"
    success_criteria: "How to verify"
    abstract_elements: ["element1", "element2"]
success_criteria:
  - "Criterion 1"
  - "Criterion 2"
estimated_complexity: LOW|MEDIUM|HIGH
`;

    try {
      // Call kimi-k2.5 via OpenAI-compatible API
      const response = await this.callKimiAPI(systemPrompt, userPrompt);
      
      // Parse YAML response
      const architectOutput = this.parseArchitectOutput(response.content);
      
      console.log(`   ✅ Analysis complete`);
      console.log(`   📋 Requirements: ${architectOutput.requirements.length}`);
      console.log(`   📊 Complexity: ${architectOutput.estimated_complexity}`);
      
      return architectOutput;
      
    } catch (error) {
      console.error(`   ❌ Architect call failed:`, error);
      // Return fallback
      return this.getFallbackArchitectOutput(stepName, iteration);
    }
  }

  /**
   * Call Programmer Agent (qwen3:8b local)
   * Used for: Code implementation, HOW not WHAT
   */
  async callProgrammer(
    architectOutput: ArchitectOutput,
    uiMap: any
  ): Promise<ProgrammerOutput> {
    const startTime = Date.now();
    
    console.log(`\n💻 PROGRAMMER (qwen3:8b, local)`);
    console.log(`   Requirements: ${architectOutput.requirements.length}`);

    // Build system prompt
    const systemPrompt = this.loadPrompt('programmer/system');
    
    // Build user prompt
    const userPrompt = `
## Requirements to Implement
${JSON.stringify(architectOutput.requirements, null, 2)}

## Available UI Elements (from ui-map.json)
${JSON.stringify(uiMap.selectors, null, 2)}

## Instructions
1. Implement the requirements in TypeScript
2. Use Playwright for browser automation
3. Use flexible selector fallbacks from ui-map
4. Add error handling and logging
5. Keep code under 100 lines

## Code Template
\`\`\`typescript
import { Page } from '@playwright/test';
import { uiMap } from '../ui-map';

export async function stepName(page: Page): Promise<boolean> {
  try {
    // Implementation here
    return true;
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}
\`\`\`

Generate the complete implementation.
`;

    try {
      // Call local qwen3:8b via Ollama
      const response = await this.callOllamaAPI('qwen3:8b', systemPrompt, userPrompt);
      
      // Parse code response
      const programmerOutput = this.parseProgrammerOutput(response.content);
      
      console.log(`   ✅ Code generated (${programmerOutput.code.length} chars)`);
      console.log(`   📦 Imports: ${programmerOutput.imports.length}`);
      
      return programmerOutput;
      
    } catch (error) {
      console.error(`   ❌ Programmer call failed:`, error);
      return this.getFallbackProgrammerOutput(architectOutput);
    }
  }

  /**
   * Call kimi-k2.5 via OpenAI-compatible API
   */
  private async callKimiAPI(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    const startTime = Date.now();
    
    // For now, simulate API call (replace with actual fetch)
    // In production, this would be:
    /*
    const response = await fetch(`${this.config.kimiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.kimiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'kimi-k2.5',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        reasoning: true
      })
    });
    */
    
    // Simulation for now
    await this.delay(1000);
    
    return {
      content: this.simulateArchitectResponse(userPrompt),
      model: 'kimi-k2.5',
      usage: { promptTokens: 500, completionTokens: 300, totalTokens: 800 },
      durationMs: Date.now() - startTime
    };
  }

  /**
   * Call local Ollama API for qwen3:8b
   */
  private async callOllamaAPI(
    model: string,
    systemPrompt: string,
    userPrompt: string
  ): Promise<LLMResponse> {
    const startTime = Date.now();
    
    try {
      // Try to call Ollama
      const result = execSync(
        `curl -s ${this.config.ollamaBaseUrl}/api/generate -d '${JSON.stringify({
          model: model,
          prompt: `${systemPrompt}\n\n${userPrompt}`,
          stream: false
        })}'`,
        { encoding: 'utf8', timeout: this.config.defaultTimeout }
      );
      
      const response = JSON.parse(result);
      
      return {
        content: response.response,
        model: model,
        durationMs: Date.now() - startTime
      };
      
    } catch (error) {
      // If Ollama not available, simulate
      console.log(`   ⚠️  Ollama not available, using simulation`);
      await this.delay(500);
      
      return {
        content: this.simulateProgrammerResponse(userPrompt),
        model: model,
        durationMs: Date.now() - startTime
      };
    }
  }

  // Helper methods
  private loadPrompt(name: string): string {
    const promptPath = path.join(__dirname, '..', 'agents', name.split('/')[0], 'prompts', `${name.split('/')[1]}.md`);
    if (fs.existsSync(promptPath)) {
      return fs.readFileSync(promptPath, 'utf8');
    }
    return '';
  }

  private parseArchitectOutput(content: string): ArchitectOutput {
    try {
      // Try to parse YAML
      const lines = content.split('\n');
      const output: Partial<ArchitectOutput> = {
        iteration: 1,
        analysis: '',
        requirements: [],
        success_criteria: [],
        estimated_complexity: 'MEDIUM'
      };
      
      // Simple YAML parsing (in production, use js-yaml)
      let currentSection = '';
      let currentRequirement: any = null;
      
      for (const line of lines) {
        if (line.startsWith('iteration:')) {
          output.iteration = parseInt(line.split(':')[1].trim());
        } else if (line.startsWith('analysis:')) {
          output.analysis = line.split(':')[1].trim().replace(/"/g, '');
        } else if (line.startsWith('estimated_complexity:')) {
          output.estimated_complexity = line.split(':')[1].trim() as any;
        } else if (line.includes('description:')) {
          currentRequirement = { description: line.split(':')[1].trim().replace(/"/g, ''), success_criteria: '', abstract_elements: [] };
          output.requirements!.push(currentRequirement);
        }
      }
      
      return output as ArchitectOutput;
    } catch (error) {
      return this.getFallbackArchitectOutput('unknown', 1);
    }
  }

  private parseProgrammerOutput(content: string): ProgrammerOutput {
    // Extract code from markdown code blocks
    const codeMatch = content.match(/```typescript\n([\s\S]*?)```/);
    const code = codeMatch ? codeMatch[1] : content;
    
    return {
      code: code,
      imports: this.extractImports(code),
      helper_functions: this.extractFunctions(code),
      test_assertions: []
    };
  }

  private extractImports(code: string): string[] {
    const importMatches = code.match(/import.*?from.*?['"].*?['"];/g);
    return importMatches || [];
  }

  private extractFunctions(code: string): string[] {
    const functionMatches = code.match(/(?:async\s+)?function\s+\w+\s*\(/g);
    return functionMatches ? functionMatches.map(f => f.replace(/function\s+/, '').replace('async ', '').replace('(', '')) : [];
  }

  private getFallbackArchitectOutput(stepName: string, iteration: number): ArchitectOutput {
    return {
      iteration,
      analysis: `Implementing ${stepName} step`,
      requirements: [
        {
          description: `Execute ${stepName}`,
          success_criteria: 'Step completes without errors',
          abstract_elements: ['page', 'navigation']
        }
      ],
      success_criteria: ['Step executes successfully'],
      estimated_complexity: 'MEDIUM'
    };
  }

  private getFallbackProgrammerOutput(architectOutput: ArchitectOutput): ProgrammerOutput {
    return {
      code: `export async function ${architectOutput.requirements[0]?.description.replace(/\s+/g, '_')}(page: Page): Promise<boolean> {\n  try {\n    // TODO: Implement\n    return true;\n  } catch (error) {\n    return false;\n  }\n}`,
      imports: ["import { Page } from '@playwright/test';"],
      helper_functions: [],
      test_assertions: []
    };
  }

  private simulateArchitectResponse(prompt: string): string {
    return `
iteration: 1
analysis: "Analyzing the current state and identifying requirements"
requirements:
  - description: "Navigate to target application"
    success_criteria: "Application frame loaded successfully"
    abstract_elements: ["menu_button", "fast_path_input", "app_frame"]
  - description: "Execute main action"
    success_criteria: "Action completed and verified"
    abstract_elements: ["action_button", "form_fields", "confirm_button"]
success_criteria:
  - "Navigation successful"
  - "Action completed"
  - "Results verified"
estimated_complexity: MEDIUM
`;
  }

  private simulateProgrammerResponse(prompt: string): string {
    return `
\`\`\`typescript
import { Page } from '@playwright/test';
import { uiMap } from '../ui-map';

export async function executeStep(page: Page): Promise<boolean> {
  try {
    console.log('Executing step...');
    
    // Navigate using menu
    await page.locator('#drop_mainmenu').click();
    await page.waitForTimeout(1000);
    
    // Implementation here
    
    return true;
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}
\`\`\`
`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const llmClient = new LLMClient();
