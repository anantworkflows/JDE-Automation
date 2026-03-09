import { chromium, Page, Browser } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface CIResult {
  iteration: number;
  stepName: string;
  status: 'PASS' | 'FAIL' | 'REGRESSION';
  durationMs: number;
  screenshot?: string;
  error?: string;
  regressionDetected?: boolean;
  previousStepsStatus?: Record<string, boolean>;
  capturedValues?: Record<string, string>;
}

interface WorkflowState {
  currentStep: number;
  stepResults: CIResult[];
  capturedValues: Record<string, string>;
  evoScore: number;
  regressionCount: number;
  iterationsPerStep: Record<string, number>;
}

export class CILoop {
  private browser?: Browser;
  private page?: Page;
  private state: WorkflowState;
  private screenshotsDir: string;
  private logsDir: string;

  constructor(private workflowName: string) {
    this.screenshotsDir = path.join(process.cwd(), 'screenshots', 'ci-loop');
    this.logsDir = path.join(process.cwd(), 'logs', 'ci-loop');
    
    // Ensure directories exist
    if (!fs.existsSync(this.screenshotsDir)) {
      fs.mkdirSync(this.screenshotsDir, { recursive: true });
    }
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }

    this.state = {
      currentStep: 0,
      stepResults: [],
      capturedValues: {},
      evoScore: 0,
      regressionCount: 0,
      iterationsPerStep: {}
    };
  }

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({ headless: true });
    this.page = await this.browser.newPage({
      viewport: { width: 1920, height: 1080 }
    });
    console.log('[CI] Browser initialized');
  }

  async executeStep(
    stepName: string,
    implementation: (page: Page) => Promise<void>,
    iteration: number = 1
  ): Promise<CIResult> {
    const startTime = Date.now();
    const result: CIResult = {
      iteration,
      stepName,
      status: 'FAIL',
      durationMs: 0
    };

    console.log(`\n[CI] Executing step: ${stepName} (iteration ${iteration})`);

    try {
      // 1. Run the implementation
      await implementation(this.page!);
      
      // 2. Capture screenshot
      const screenshotPath = path.join(
        this.screenshotsDir,
        `${this.workflowName}-${stepName}-iter${iteration}-${Date.now()}.png`
      );
      await this.page!.screenshot({ path: screenshotPath, fullPage: true });
      result.screenshot = screenshotPath;
      console.log(`[CI] Screenshot saved: ${screenshotPath}`);

      // 3. Regression check - verify previous steps still work
      if (this.state.currentStep > 0) {
        console.log('[CI] Running regression checks...');
        result.previousStepsStatus = await this.runRegressionChecks();
        result.regressionDetected = Object.values(result.previousStepsStatus).some(v => !v);
        
        if (result.regressionDetected) {
          result.status = 'REGRESSION';
          this.state.regressionCount++;
          console.log('[CI] ⚠️ REGRESSION DETECTED');
        } else {
          result.status = 'PASS';
          console.log('[CI] ✅ No regression');
        }
      } else {
        result.status = 'PASS';
      }

      // 4. Update state
      this.state.currentStep++;
      this.state.stepResults.push(result);
      this.updateEvoScore();

    } catch (error) {
      result.status = 'FAIL';
      result.error = error instanceof Error ? error.message : String(error);
      console.error(`[CI] ❌ Step failed: ${result.error}`);

      // Capture error screenshot
      const errorScreenshot = path.join(
        this.screenshotsDir,
        `${this.workflowName}-${stepName}-iter${iteration}-ERROR-${Date.now()}.png`
      );
      await this.page!.screenshot({ path: errorScreenshot });
      result.screenshot = errorScreenshot;
    }

    result.durationMs = Date.now() - startTime;
    
    // Track iterations per step
    this.state.iterationsPerStep[stepName] = iteration;

    // Save state
    this.saveState();

    return result;
  }

  private async runRegressionChecks(): Promise<Record<string, boolean>> {
    const checks: Record<string, boolean> = {};
    
    // Quick health checks for previous steps
    // This would be customized per workflow
    
    // Example: Check if still logged in
    try {
      const logoutBtn = this.page!.locator('a[href*="logout" i], button:has-text("Logout")');
      checks['login'] = await logoutBtn.count() > 0;
    } catch {
      checks['login'] = false;
    }

    // Example: Check if main menu accessible
    try {
      const menuBtn = this.page!.locator('#drop_mainmenu');
      checks['menu_accessible'] = await menuBtn.count() > 0;
    } catch {
      checks['menu_accessible'] = false;
    }

    return checks;
  }

  private updateEvoScore(): void {
    // EvoScore: weighted average where later steps matter more
    // gamma = 1.5 (future-weighted)
    const gamma = 1.5;
    let weightedSum = 0;
    let weightSum = 0;

    this.state.stepResults.forEach((result, index) => {
      const stepScore = result.status === 'PASS' ? 1 : 
                        result.status === 'REGRESSION' ? -1 : 0;
      const weight = Math.pow(gamma, index + 1);
      weightedSum += weight * stepScore;
      weightSum += weight;
    });

    this.state.evoScore = weightSum > 0 ? weightedSum / weightSum : 0;
  }

  private saveState(): void {
    const statePath = path.join(this.logsDir, `${this.workflowName}-state.json`);
    fs.writeFileSync(statePath, JSON.stringify(this.state, null, 2));
  }

  getState(): WorkflowState {
    return { ...this.state };
  }

  getMetrics() {
    const totalSteps = this.state.stepResults.length;
    const passedSteps = this.state.stepResults.filter(r => r.status === 'PASS').length;
    const failedSteps = this.state.stepResults.filter(r => r.status === 'FAIL').length;
    const regressionSteps = this.state.stepResults.filter(r => r.status === 'REGRESSION').length;
    
    const totalIterations = Object.values(this.state.iterationsPerStep).reduce((a, b) => a + b, 0);
    const avgIterationsPerStep = totalSteps > 0 ? totalIterations / totalSteps : 0;

    return {
      evoScore: this.state.evoScore.toFixed(3),
      zeroRegressionRate: totalSteps > 0 ? ((totalSteps - regressionSteps) / totalSteps).toFixed(2) : '0.00',
      passRate: totalSteps > 0 ? (passedSteps / totalSteps).toFixed(2) : '0.00',
      totalSteps,
      passedSteps,
      failedSteps,
      regressionSteps,
      avgIterationsPerStep: avgIterationsPerStep.toFixed(2),
      capturedValues: this.state.capturedValues
    };
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      console.log('[CI] Browser closed');
    }
    
    // Print final metrics
    console.log('\n[CI] Final Metrics:');
    console.log(JSON.stringify(this.getMetrics(), null, 2));
  }
}

// Example usage:
/*
const ci = new CILoop('order-to-cash');
await ci.initialize();

// Iteration 1: Login
const result1 = await ci.executeStep('login', async (page) => {
  await page.goto('https://demo.steltix.com/jde/E1Menu.maf');
  await page.locator('input[name="User"]').fill('demo');
  await page.locator('input[name="Password"]').fill('demo');
  await page.locator('input[type="submit"]').click();
  await page.waitForTimeout(5000);
});

if (result1.status === 'PASS') {
  // Proceed to next step
  const result2 = await ci.executeStep('navigate_address_book', async (page) => {
    // ... implementation
  });
}

await ci.close();
*/
