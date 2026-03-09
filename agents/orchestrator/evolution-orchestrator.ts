import { CILoop } from '../ci-loop/executor';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

interface ArchitectOutput {
  iteration: number;
  analysis: string;
  requirements: Requirement[];
  success_criteria: string[];
  estimated_complexity: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface Requirement {
  description: string;
  success_criteria: string;
  abstract_elements: string[];
}

interface ProgrammerOutput {
  code: string;
  imports: string[];
  helper_functions: string[];
  test_assertions: string[];
}

interface IterationResult {
  iteration: number;
  stepName: string;
  architectOutput: ArchitectOutput;
  programmerOutput: ProgrammerOutput;
  ciResult: {
    status: 'PASS' | 'FAIL' | 'REGRESSION';
    durationMs: number;
    error?: string;
  };
}

/**
 * Evolution-Based Orchestrator
 * 
 * Manages the iterative workflow:
 * 1. Architect analyzes and writes requirements (WHAT)
 * 2. Programmer implements requirements (HOW)
 * 3. CI Loop tests and validates
 * 4. If failed, iterate with feedback
 * 5. If passed, move to next step
 */
export class EvolutionOrchestrator {
  private maxIterations: number = 5;
  private currentStep: number = 0;
  private results: IterationResult[] = [];
  private ciLoop?: CILoop;
  
  // Model assignments
  private models = {
    orchestrator: 'kimi-k2.5',      // Max (you)
    architect: 'kimi-k2.5',         // Reasoning ON
    programmer: 'qwen3:8b'          // Local, fast
  };

  constructor(
    private workflowName: string,
    private steps: string[]
  ) {}

  async initialize(): Promise<void> {
    console.log(`\n🚀 Evolution Orchestrator Initialized`);
    console.log(`   Workflow: ${this.workflowName}`);
    console.log(`   Steps: ${this.steps.join(' → ')}`);
    console.log(`   Models: Architect=${this.models.architect}(reasoning), Programmer=${this.models.programmer}(local)`);
    
    this.ciLoop = new CILoop(this.workflowName);
    await this.ciLoop.initialize();
  }

  async run(): Promise<void> {
    for (let i = 0; i < this.steps.length; i++) {
      this.currentStep = i;
      const stepName = this.steps[i];
      
      console.log(`\n${'='.repeat(60)}`);
      console.log(`STEP ${i + 1}/${this.steps.length}: ${stepName.toUpperCase()}`);
      console.log(`${'='.repeat(60)}`);

      const success = await this.evolveStep(stepName);
      
      if (!success) {
        console.error(`\n❌ Step ${stepName} failed after max iterations`);
        console.log('Escalating to human...');
        // TODO: Implement human escalation
        break;
      }

      console.log(`\n✅ Step ${stepName} complete`);
    }

    await this.ciLoop!.close();
    this.printSummary();
  }

  private async evolveStep(stepName: string): Promise<boolean> {
    let iteration = 1;
    
    while (iteration <= this.maxIterations) {
      console.log(`\n--- Iteration ${iteration}/${this.maxIterations} ---`);

      // PHASE 1: Architect analyzes and writes requirements
      console.log('\n🏗️  ARCHITECT (kimi-k2.5, reasoning=ON)');
      const architectOutput = await this.runArchitect(stepName, iteration);
      console.log(`   Analysis: ${architectOutput.analysis.substring(0, 100)}...`);
      console.log(`   Requirements: ${architectOutput.requirements.length}`);
      
      // PHASE 2: Programmer implements
      console.log('\n💻 PROGRAMMER (qwen3:8b, local)');
      const programmerOutput = await this.runProgrammer(architectOutput);
      console.log(`   Code generated: ${programmerOutput.code.length} chars`);
      
      // PHASE 3: CI Loop validates
      console.log('\n🧪 CI LOOP');
      const ciResult = await this.runCI(stepName, programmerOutput, iteration);
      console.log(`   Status: ${ciResult.status}`);
      console.log(`   Duration: ${ciResult.durationMs}ms`);

      // Store result
      this.results.push({
        iteration,
        stepName,
        architectOutput,
        programmerOutput,
        ciResult
      });

      // Check if passed
      if (ciResult.status === 'PASS') {
        console.log('\n✅ PASS - Moving to next step');
        return true;
      }

      // Check for regression
      if (ciResult.status === 'REGRESSION') {
        console.log('\n⚠️  REGRESSION DETECTED - Rolling back and retrying');
        // Reset to known good state
        await this.resetToLastGoodState();
      }

      // Failed but no regression - iterate with feedback
      console.log(`\n❌ FAIL - Analyzing error and retrying...`);
      iteration++;
    }

    return false; // Max iterations reached
  }

  private async runArchitect(
    stepName: string,
    iteration: number
  ): Promise<ArchitectOutput> {
    // Load prompt template
    const promptPath = path.join(__dirname, '../architect/prompts');
    
    // Get previous results for context
    const previousResults = this.results.filter(r => r.stepName === stepName);
    const lastError = previousResults.length > 0 
      ? previousResults[previousResults.length - 1].ciResult.error 
      : null;

    // Build prompt
    const systemPrompt = fs.readFileSync(path.join(promptPath, 'system.md'), 'utf8');
    
    // In real implementation, this would call kimi-k2.5 with reasoning=ON
    // For now, return mock/example output
    
    const mockOutput: ArchitectOutput = {
      iteration,
      analysis: iteration === 1 
        ? `Step ${stepName} needs to be implemented. Analyzing current state.`
        : `Previous iteration failed with: ${lastError}. Adjusting approach.`,
      requirements: [
        {
          description: `Execute ${stepName} workflow step`,
          success_criteria: 'Step completes without errors',
          abstract_elements: ['page', 'navigation', 'form_elements']
        }
      ],
      success_criteria: [
        'Navigation successful',
        'Form elements accessible',
        'Data captured correctly'
      ],
      estimated_complexity: iteration === 1 ? 'MEDIUM' : 'HIGH'
    };

    // Add delay to simulate LLM call
    await this.delay(1000);

    return mockOutput;
  }

  private async runProgrammer(
    architectOutput: ArchitectOutput
  ): Promise<ProgrammerOutput> {
    // Load ui-map.json
    const uiMapPath = path.join(process.cwd(), 'ui-map.json');
    const uiMap = JSON.parse(fs.readFileSync(uiMapPath, 'utf8'));
    
    // Get step definition
    const stepName = this.steps[this.currentStep];
    const stepDef = uiMap.steps[stepName as keyof typeof uiMap.steps];
    
    if (!stepDef) {
      throw new Error(`Step ${stepName} not found in ui-map.json`);
    }

    // Generate code from step definition
    const code = this.generateCodeFromStep(stepDef, uiMap.selectors);
    
    // In real implementation, this would:
    // 1. Call qwen3:8b (local) with the prompt
    // 2. Programmer uses ui-map to resolve abstract names
    // 3. Returns generated TypeScript code
    
    const mockOutput: ProgrammerOutput = {
      code,
      imports: [
        "import { Page } from '@playwright/test';",
        "import { uiMap } from '../ui-map';"
      ],
      helper_functions: [
        'resolveSelectors',
        'fillWithFallback',
        'waitForElement'
      ],
      test_assertions: [
        'expect(element).toBeVisible()',
        'expect(value).toBeDefined()'
      ]
    };

    // Save generated code
    const codePath = path.join(
      process.cwd(),
      'generated',
      `${stepName}.ts`
    );
    fs.mkdirSync(path.dirname(codePath), { recursive: true });
    fs.writeFileSync(codePath, code);

    // Add delay to simulate LLM call (local = faster)
    await this.delay(500);

    return mockOutput;
  }

  private generateCodeFromStep(stepDef: any, selectors: any): string {
    // Generate TypeScript implementation from UI map
    const lines: string[] = [];
    
    lines.push(`export async function ${stepDef.description.replace(/\s+/g, '_')}(`);
    lines.push(`  page: Page`);
    lines.push(`): Promise<void> {`);
    lines.push(`  console.log('Executing: ${stepDef.description}');`);
    lines.push('');

    for (const action of stepDef.actions) {
      switch (action.type) {
        case 'navigate':
          lines.push(`  // Navigate to ${action.target}`);
          lines.push(`  await page.goto('${action.target}', { waitUntil: '${action.wait_until}' });`);
          break;
          
        case 'fill':
          const fieldSelectors = selectors[action.field];
          lines.push(`  // Fill ${action.field}`);
          lines.push(`  const ${action.field} = await resolveSelectors(page, ['${fieldSelectors?.join("', '")}']);`);
          lines.push(`  await ${action.field}.fill('${action.value}');`);
          break;
          
        case 'click':
          const elementSelectors = selectors[action.element];
          lines.push(`  // Click ${action.element}`);
          lines.push(`  const ${action.element} = await resolveSelectors(page, ['${elementSelectors?.join("', '")}']);`);
          lines.push(`  await ${action.element}.click();`);
          break;
          
        case 'wait':
          lines.push(`  // Wait ${action.duration_ms}ms`);
          lines.push(`  await page.waitForTimeout(${action.duration_ms});`);
          break;
          
        case 'wait_for_frame':
          lines.push(`  // Wait for frame: ${action.frame_url_pattern}`);
          lines.push(`  await page.waitForSelector('iframe[src*="${action.frame_url_pattern}"]', { timeout: ${action.timeout_ms} });`);
          break;
          
        case 'refresh_frame_context':
          lines.push(`  // Refresh frame context`);
          lines.push(`  await findAppFrame(page);`);
          break;
      }
      lines.push('');
    }

    lines.push('  console.log(\'Step completed successfully\');');
    lines.push('}');
    
    return lines.join('\n');
  }

  private async runCI(
    stepName: string,
    programmerOutput: ProgrammerOutput,
    iteration: number
  ): Promise<{ status: 'PASS' | 'FAIL' | 'REGRESSION'; durationMs: number; error?: string }> {
    // Execute the generated code through CI Loop
    // This runs the actual Playwright test
    
    const startTime = Date.now();
    
    try {
      // Import and execute the generated code
      const codePath = path.join(process.cwd(), 'generated', `${stepName}.ts`);
      
      // In real implementation, this would:
      // 1. Compile the TypeScript
      // 2. Execute against browser
      // 3. Capture results
      
      // For now, simulate CI execution
      const result = await this.ciLoop!.executeStep(
        stepName,
        async (page) => {
          // Execute the generated implementation
          // This would dynamically import and run the generated code
          console.log(`   Executing generated code for ${stepName}`);
        },
        iteration
      );

      return {
        status: result.status,
        durationMs: Date.now() - startTime,
        error: result.error
      };
      
    } catch (error) {
      return {
        status: 'FAIL',
        durationMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async resetToLastGoodState(): Promise<void> {
    console.log('   Resetting to last known good state...');
    // Reload browser, restore session, etc.
    await this.ciLoop!.close();
    this.ciLoop = new CILoop(this.workflowName);
    await this.ciLoop.initialize();
    
    // Replay previous successful steps
    for (let i = 0; i < this.currentStep; i++) {
      console.log(`   Replaying step: ${this.steps[i]}`);
      // Would replay from saved state
    }
  }

  private printSummary(): void {
    console.log(`\n${'='.repeat(60)}`);
    console.log('EVOLUTION ORCHESTRATOR SUMMARY');
    console.log(`${'='.repeat(60)}`);
    
    const metrics = this.ciLoop!.getMetrics();
    console.log(`\n📊 Metrics:`);
    console.log(`   EvoScore: ${metrics.evoScore}`);
    console.log(`   Zero-Regression Rate: ${metrics.zeroRegressionRate}`);
    console.log(`   Pass Rate: ${metrics.passRate}`);
    console.log(`   Avg Iterations/Step: ${metrics.avgIterationsPerStep}`);
    
    console.log(`\n📋 Iteration Details:`);
    for (const result of this.results) {
      const status = result.ciResult.status === 'PASS' ? '✅' : 
                     result.ciResult.status === 'REGRESSION' ? '⚠️' : '❌';
      console.log(`   ${status} ${result.stepName} (iter ${result.iteration}): ${result.ciResult.status}`);
    }
    
    console.log(`\n💾 Artifacts saved to:`);
    console.log(`   Screenshots: ./screenshots/ci-loop/`);
    console.log(`   Logs: ./logs/ci-loop/`);
    console.log(`   Generated Code: ./generated/`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Example usage
if (require.main === module) {
  const orchestrator = new EvolutionOrchestrator(
    'order-to-cash',
    [
      'login',
      'navigate_address_book',
      'create_customer',
      'navigate_sales_order',
      'create_sales_order'
    ]
  );
  
  orchestrator.initialize().then(() => {
    orchestrator.run();
  });
}
