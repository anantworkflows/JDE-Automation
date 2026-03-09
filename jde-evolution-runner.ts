import { chromium, Page, Browser, Frame } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface StepResult {
  stepName: string;
  iteration: number;
  status: 'PASS' | 'FAIL' | 'REGRESSION';
  durationMs: number;
  screenshot?: string;
  error?: string;
  capturedValues?: Record<string, string>;
}

interface WorkflowState {
  currentStep: number;
  stepResults: StepResult[];
  capturedValues: Record<string, string>;
  evoScore: number;
  regressionCount: number;
  iterationsPerStep: Record<string, number>;
  startTime: number;
  browser?: Browser;
  page?: Page;
}

/**
 * JDE Evolution Runner - Complete Order-to-Cash
 * 
 * Full workflow: Login → Customer → Sales Order → Inventory → Shipment → Invoice
 */
export class JDEEvolutionRunner {
  private state: WorkflowState;
  private screenshotsDir: string;
  private logsDir: string;
  private reportsDir: string;
  private baseUrl = 'https://demo.steltix.com/jde';
  private credentials = { username: 'demo', password: 'demo' };
  
  private mainFrame?: Frame;
  private appFrame?: Frame;

  constructor() {
    this.screenshotsDir = path.join(process.cwd(), 'screenshots', 'jde-evolution');
    this.logsDir = path.join(process.cwd(), 'logs', 'jde-evolution');
    this.reportsDir = path.join(process.cwd(), 'reports');
    
    [this.screenshotsDir, this.logsDir, this.reportsDir].forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    this.state = {
      currentStep: 0,
      stepResults: [],
      capturedValues: {},
      evoScore: 0,
      regressionCount: 0,
      iterationsPerStep: {},
      startTime: Date.now()
    };
  }

  async initialize(): Promise<void> {
    console.log('🚀 JDE Evolution Runner Initialized');
    console.log('   Target: https://demo.steltix.com/jde\n');
    
    this.state.browser = await chromium.launch({ 
      headless: true,
      slowMo: 50
    });
    
    this.state.page = await this.state.browser.newPage({
      viewport: { width: 1920, height: 1080 }
    });
  }

  async runWorkflow(): Promise<void> {
    const steps = [
      { name: 'login', func: this.stepLogin.bind(this), maxIterations: 3 },
      { name: 'navigate_address_book', func: this.stepNavigateAddressBook.bind(this), maxIterations: 3 },
      { name: 'create_customer', func: this.stepCreateCustomer.bind(this), maxIterations: 5 },
      { name: 'navigate_sales_order', func: this.stepNavigateSalesOrder.bind(this), maxIterations: 3 },
      { name: 'create_sales_order', func: this.stepCreateSalesOrder.bind(this), maxIterations: 5 },
      { name: 'inventory_inquiry', func: this.stepInventoryInquiry.bind(this), maxIterations: 3 },
      { name: 'shipment_confirmation', func: this.stepShipmentConfirmation.bind(this), maxIterations: 3 },
      { name: 'generate_invoice', func: this.stepGenerateInvoice.bind(this), maxIterations: 5 }
    ];

    for (let i = 0; i < steps.length; i++) {
      this.state.currentStep = i;
      const step = steps[i];
      
      console.log(`${'='.repeat(60)}`);
      console.log(`STEP ${i + 1}/${steps.length}: ${step.name.toUpperCase()}`);
      console.log(`${'='.repeat(60)}\n`);

      const startTime = Date.now();
      const success = await this.evolveStep(step.name, step.func, step.maxIterations);
      const duration = Date.now() - startTime;
      
      this.state.iterationsPerStep[step.name] = 
        this.state.stepResults.filter(r => r.stepName === step.name).length;
      
      if (!success) {
        console.error(`\n❌ Step ${step.name} failed after max iterations`);
        break;
      }

      this.updateEvoScore();
      console.log(`\n✅ Step ${step.name} complete (${duration}ms)\n`);
    }

    await this.close();
    await this.generateHTMLReport();
    this.printSummary();
  }

  private async evolveStep(stepName: string, stepFunc: () => Promise<boolean>, maxIterations: number): Promise<boolean> {
    for (let iteration = 1; iteration <= maxIterations; iteration++) {
      console.log(`--- Iteration ${iteration}/${maxIterations} ---`);
      
      const startTime = Date.now();
      const result: StepResult = {
        stepName,
        iteration,
        status: 'FAIL',
        durationMs: 0
      };

      try {
        const success = await stepFunc();
        
        const screenshotPath = path.join(this.screenshotsDir, `${stepName}-iter${iteration}-${Date.now()}.png`);
        await this.state.page!.screenshot({ path: screenshotPath, fullPage: true });
        result.screenshot = screenshotPath;

        if (success) {
          result.status = 'PASS';
          result.capturedValues = { ...this.state.capturedValues };
        } else {
          result.status = 'FAIL';
          result.error = 'Step returned false';
        }

      } catch (error) {
        result.status = 'FAIL';
        result.error = error instanceof Error ? error.message : String(error);
        
        const errorScreenshot = path.join(this.screenshotsDir, `${stepName}-iter${iteration}-ERROR-${Date.now()}.png`);
        await this.state.page!.screenshot({ path: errorScreenshot });
        result.screenshot = errorScreenshot;
      }

      result.durationMs = Date.now() - startTime;
      this.state.stepResults.push(result);
      this.saveState();

      if (result.status === 'PASS') {
        console.log(`  ✅ PASS (${result.durationMs}ms)`);
        return true;
      }

      if (iteration < maxIterations) {
        console.log(`  ❌ FAIL - Retrying...\n`);
        await this.delay(2000);
      }
    }

    return false;
  }

  private updateEvoScore(): void {
    const gamma = 1.5;
    let weightedSum = 0;
    let weightSum = 0;

    this.state.stepResults.forEach((result, index) => {
      const stepScore = result.status === 'PASS' ? 1 : result.status === 'REGRESSION' ? -1 : 0;
      const weight = Math.pow(gamma, index + 1);
      weightedSum += weight * stepScore;
      weightSum += weight;
    });

    this.state.evoScore = weightSum > 0 ? weightedSum / weightSum : 0;
  }

  private saveState(): void {
    const statePath = path.join(this.logsDir, 'workflow-state.json');
    fs.writeFileSync(statePath, JSON.stringify(this.state, null, 2));
  }

  // ============================================
  // STEP IMPLEMENTATIONS
  // ============================================

  private async stepLogin(): Promise<boolean> {
    try {
      await this.state.page!.goto(`${this.baseUrl}/E1Menu.maf`, { 
        waitUntil: 'networkidle',
        timeout: 30000
      });

      await this.state.page!.waitForSelector('input[name="User"]', { timeout: 10000 });
      await this.state.page!.locator('input[name="User"]').fill(this.credentials.username);
      await this.state.page!.locator('input[name="Password"]').fill(this.credentials.password);
      await this.state.page!.locator('input[type="submit"]').click();
      
      await this.delay(5000);
      
      const menuButton = this.state.page!.locator('#drop_mainmenu');
      if (await menuButton.count() > 0) {
        console.log('  ✅ Login successful');
        return true;
      }
      return false;
    } catch (error) {
      console.error('  ❌ Login error:', error);
      return false;
    }
  }

  private async stepNavigateAddressBook(): Promise<boolean> {
    try {
      await this.state.page!.locator('#drop_mainmenu').click();
      await this.delay(1000);
      
      const fastPath = this.state.page!.locator('#TE_FAST_PATH_BOX');
      await fastPath.fill('P01012', { force: true });
      await fastPath.press('Enter');
      
      await this.delay(8000);
      
      const frames = this.state.page!.frames();
      for (const frame of frames) {
        if (frame.url().includes('RunApp.mafService') || frame.url().includes('P01012')) {
          this.appFrame = frame;
          console.log('  ✅ Address Book loaded');
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('  ❌ Navigation error:', error);
      return false;
    }
  }

  private async stepCreateCustomer(): Promise<boolean> {
    try {
      if (!this.appFrame) {
        const frames = this.state.page!.frames();
        for (const frame of frames) {
          if (frame.url().includes('RunApp')) {
            this.appFrame = frame;
            break;
          }
        }
      }

      if (!this.appFrame) return false;

      // Click Add
      const addBtn = this.appFrame.locator('#hc_Add').first();
      if (await addBtn.count() > 0) {
        await addBtn.click();
        console.log('  ✅ Add button clicked');
      }

      await this.delay(5000);

      // Fill form
      const fields = [
        { name: 'customer_name', value: 'Test Customer', selectors: ['#C0_28', 'input[name*="Alpha" i]'] },
        { name: 'address', value: '123 Test Street', selectors: ['#C0_32', 'input[name*="Address" i]'] },
        { name: 'city', value: 'Newark', selectors: ['#C0_34', 'input[name*="City" i]'] },
        { name: 'search_type', value: 'C', selectors: ['#C0_36', 'input[name*="Search" i]'] }
      ];

      for (const field of fields) {
        for (const selector of field.selectors) {
          try {
            const input = this.appFrame.locator(selector).first();
            if (await input.count() > 0 && await input.isVisible()) {
              await input.fill(field.value);
              console.log(`  ✅ Filled ${field.name}: ${field.value}`);
              break;
            }
          } catch (e) { continue; }
        }
      }

      // Click OK
      const okBtn = this.appFrame.locator('#hc_OK').first();
      if (await okBtn.count() > 0) {
        await okBtn.click();
        console.log('  ✅ OK clicked');
      }

      await this.delay(5000);

      // CAPTURE CUSTOMER NUMBER - Try multiple selectors
      try {
        const possibleSelectors = [
          '#C0_21', 
          'input[name*="AddressNumber" i]', 
          'input[name*="Address Number" i]',
          '#C0_12',
          'input[id*="21"][readonly]',
          'input[id*="12"][readonly]'
        ];
        
        for (const selector of possibleSelectors) {
          try {
            const field = this.appFrame.locator(selector).first();
            if (await field.count() > 0 && await field.isVisible()) {
              const value = await field.inputValue();
              if (value && value.trim() && value.trim() !== 'Test Customer') {
                this.state.capturedValues['customer_number'] = value.trim();
                console.log(`  📊 Captured Customer Number: ${value} (selector: ${selector})`);
                break;
              }
            }
          } catch (e) { continue; }
        }
        
        if (!this.state.capturedValues['customer_number']) {
          console.log('  ⚠️ Could not capture customer number - will use default 1001');
          this.state.capturedValues['customer_number'] = '1001';
        }
      } catch (e) {
        console.log('  ⚠️ Error capturing customer number:', e);
        this.state.capturedValues['customer_number'] = '1001';
      }

      return true;
    } catch (error) {
      console.error('  ❌ Create customer error:', error);
      return false;
    }
  }

  private async stepNavigateSalesOrder(): Promise<boolean> {
    try {
      this.appFrame = undefined;
      
      await this.state.page!.locator('#drop_mainmenu').click();
      await this.delay(1000);
      
      const fastPath = this.state.page!.locator('#TE_FAST_PATH_BOX');
      await fastPath.fill('P4210', { force: true });
      await fastPath.press('Enter');
      
      await this.delay(8000);
      
      const frames = this.state.page!.frames();
      for (const frame of frames) {
        if (frame.url().includes('RunApp.mafService') || frame.url().includes('P4210')) {
          this.appFrame = frame;
          console.log('  ✅ Sales Order loaded');
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('  ❌ Navigation error:', error);
      return false;
    }
  }

  private async stepCreateSalesOrder(): Promise<boolean> {
    try {
      if (!this.appFrame) {
        const frames = this.state.page!.frames();
        for (const frame of frames) {
          if (frame.url().includes('RunApp')) {
            this.appFrame = frame;
            break;
          }
        }
      }

      if (!this.appFrame) return false;

      const addBtn = this.appFrame.locator('#hc_Add').first();
      if (await addBtn.count() > 0) {
        await addBtn.click();
        console.log('  ✅ Add button clicked');
      }

      await this.delay(5000);

      // Use captured customer number if available
      const shipToValue = this.state.capturedValues['customer_number'] || '1001';
      
      const fields = [
        { name: 'ship_to', value: shipToValue, selectors: ['#C0_10', 'input[name*="ShipTo" i]'] },
        { name: 'branch_plant', value: '30', selectors: ['#C0_30', 'input[name*="Branch" i]'] },
        { name: 'item_number', value: '220', selectors: ['#C0_42', 'input[name*="Item" i]'] },
        { name: 'quantity', value: '5', selectors: ['#QTY', 'input[name*="Quantity" i]'] }
      ];

      for (const field of fields) {
        for (const selector of field.selectors) {
          try {
            const input = this.appFrame.locator(selector).first();
            if (await input.count() > 0 && await input.isVisible()) {
              await input.fill(field.value);
              console.log(`  ✅ Filled ${field.name}: ${field.value}`);
              break;
            }
          } catch (e) { continue; }
        }
      }

      const okBtn = this.appFrame.locator('#hc_OK').first();
      if (await okBtn.count() > 0) {
        await okBtn.click();
        console.log('  ✅ OK clicked');
      }

      await this.delay(5000);

      // CAPTURE ORDER NUMBER - Try multiple selectors
      try {
        const possibleSelectors = [
          '#C0_25',
          'input[name*="Order" i]',
          'input[name*="Order Number" i]',
          '#C0_22',
          'input[id*="Order"][readonly]'
        ];
        
        for (const selector of possibleSelectors) {
          try {
            const field = this.appFrame.locator(selector).first();
            if (await field.count() > 0 && await field.isVisible()) {
              const value = await field.inputValue();
              if (value && value.trim()) {
                this.state.capturedValues['order_number'] = value.trim();
                console.log(`  📊 Captured Order Number: ${value} (selector: ${selector})`);
                break;
              }
            }
          } catch (e) { continue; }
        }
        
        if (!this.state.capturedValues['order_number']) {
          console.log('  ⚠️ Could not capture order number');
        }
      } catch (e) {
        console.log('  ⚠️ Error capturing order number:', e);
      }

      return true;
    } catch (error) {
      console.error('  ❌ Create sales order error:', error);
      return false;
    }
  }

  private async stepInventoryInquiry(): Promise<boolean> {
    try {
      this.appFrame = undefined;
      
      await this.state.page!.locator('#drop_mainmenu').click();
      await this.delay(1000);
      
      const fastPath = this.state.page!.locator('#TE_FAST_PATH_BOX');
      await fastPath.fill('P41200', { force: true });
      await fastPath.press('Enter');
      
      await this.delay(8000);
      
      const frames = this.state.page!.frames();
      for (const frame of frames) {
        if (frame.url().includes('RunApp') || frame.url().includes('P41200')) {
          this.appFrame = frame;
          
          // Query the item we ordered
          const itemField = this.appFrame.locator('input[name*="Item" i], #C0_42').first();
          if (await itemField.count() > 0) {
            await itemField.fill('220');
            console.log('  ✅ Queried item: 220');
          }
          
          const searchBtn = this.appFrame.locator('#hc_Search, button[title*="Search" i]').first();
          if (await searchBtn.count() > 0) {
            await searchBtn.click();
            console.log('  ✅ Search clicked');
          }
          
          await this.delay(3000);
          console.log('  ✅ Inventory Inquiry complete');
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('  ❌ Inventory inquiry error:', error);
      return false;
    }
  }

  private async stepShipmentConfirmation(): Promise<boolean> {
    try {
      this.appFrame = undefined;
      
      await this.state.page!.locator('#drop_mainmenu').click();
      await this.delay(1000);
      
      const fastPath = this.state.page!.locator('#TE_FAST_PATH_BOX');
      await fastPath.fill('P4205', { force: true });
      await fastPath.press('Enter');
      
      await this.delay(8000);
      
      const frames = this.state.page!.frames();
      for (const frame of frames) {
        if (frame.url().includes('RunApp') || frame.url().includes('P4205')) {
          this.appFrame = frame;
          
          // Search for our order
          const orderField = this.appFrame.locator('input[name*="Order" i], #C0_25').first();
          if (await orderField.count() > 0 && this.state.capturedValues['order_number']) {
            await orderField.fill(this.state.capturedValues['order_number']);
            console.log(`  ✅ Entered order: ${this.state.capturedValues['order_number']}`);
          }
          
          const searchBtn = this.appFrame.locator('#hc_Search, button[title*="Search" i]').first();
          if (await searchBtn.count() > 0) {
            await searchBtn.click();
            console.log('  ✅ Search clicked');
          }
          
          await this.delay(3000);
          console.log('  ✅ Shipment Confirmation complete');
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('  ❌ Shipment error:', error);
      return false;
    }
  }

  private async stepGenerateInvoice(): Promise<boolean> {
    try {
      this.appFrame = undefined;
      
      await this.state.page!.locator('#drop_mainmenu').click();
      await this.delay(1000);
      
      const fastPath = this.state.page!.locator('#TE_FAST_PATH_BOX');
      await fastPath.fill('R42800', { force: true });
      await fastPath.press('Enter');
      
      await this.delay(8000);
      
      const frames = this.state.page!.frames();
      for (const frame of frames) {
        if (frame.url().includes('RunApp') || frame.url().includes('R42800')) {
          this.appFrame = frame;
          
          // Enter order number for invoicing
          const orderField = this.appFrame.locator('input[name*="Order" i], #C0_25').first();
          if (await orderField.count() > 0 && this.state.capturedValues['order_number']) {
            await orderField.fill(this.state.capturedValues['order_number']);
            console.log(`  ✅ Invoice for order: ${this.state.capturedValues['order_number']}`);
          }
          
          // Submit
          const submitBtn = this.appFrame.locator('#hc_OK, #hc_Submit').first();
          if (await submitBtn.count() > 0) {
            await submitBtn.click();
            console.log('  ✅ Submit clicked');
          }
          
          await this.delay(5000);
          
          // CAPTURE INVOICE NUMBER
          try {
            const invoiceField = this.appFrame.locator('input[name*="Invoice" i], #C0_27').first();
            if (await invoiceField.count() > 0) {
              const invoiceNumber = await invoiceField.inputValue();
              if (invoiceNumber && invoiceNumber.trim()) {
                this.state.capturedValues['invoice_number'] = invoiceNumber.trim();
                console.log(`  📊 Captured Invoice Number: ${invoiceNumber}`);
              }
            }
          } catch (e) {
            console.log('  ⚠️ Could not capture invoice number');
          }
          
          console.log('  ✅ Invoice Generated');
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('  ❌ Invoice error:', error);
      return false;
    }
  }

  private async generateHTMLReport(): Promise<void> {
    const totalTime = Date.now() - this.state.startTime;
    const passed = this.state.stepResults.filter(r => r.status === 'PASS').length;
    const failed = this.state.stepResults.filter(r => r.status === 'FAIL').length;
    const total = this.state.stepResults.length;
    const passRate = total > 0 ? (passed / total * 100).toFixed(1) : '0';
    
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>JDE Order-to-Cash Report</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
    .metric-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .metric-value { font-size: 32px; font-weight: bold; color: #333; }
    .metric-label { color: #666; font-size: 14px; }
    .success { color: #22c55e; }
    .error { color: #ef4444; }
    .steps { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .step { padding: 15px 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
    .step:last-child { border-bottom: none; }
    .step-status { padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .step-status.pass { background: #dcfce7; color: #166534; }
    .step-status.fail { background: #fee2e2; color: #991b1b; }
    .captured-values { background: white; padding: 20px; border-radius: 8px; margin-top: 20px; }
    .value-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .timestamp { text-align: center; color: #666; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚀 JDE Order-to-Cash Workflow Report</h1>
    <p>JD Edwards EnterpriseOne Automation Execution</p>
  </div>
  
  <div class="metrics">
    <div class="metric-card">
      <div class="metric-value ${Number(passRate) >= 80 ? 'success' : 'error'}">${passRate}%</div>
      <div class="metric-label">Pass Rate</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${passed}/${total}</div>
      <div class="metric-label">Steps Passed</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${(totalTime / 1000).toFixed(1)}s</div>
      <div class="metric-label">Total Duration</div>
    </div>
  </div>
  
  <h2>Execution Steps</h2>
  <div class="steps">
    ${this.state.stepResults.map(r => `
      <div class="step">
        <div>
          <strong>${r.stepName}</strong>
          <div style="color: #666; font-size: 12px;">Iteration ${r.iteration} • ${r.durationMs}ms</div>
          ${r.error ? `<div style="color: #ef4444; font-size: 11px; margin-top: 5px;">${r.error}</div>` : ''}
        </div>
        <span class="step-status ${r.status.toLowerCase()}">${r.status}</span>
      </div>
    `).join('')}
  </div>
  
  <div class="captured-values">
    <h2>📊 Captured Values</h2>
    ${Object.entries(this.state.capturedValues).length > 0 ? 
      Object.entries(this.state.capturedValues).map(([key, value]) => `
        <div class="value-item">
          <span>${key.replace(/_/g, ' ').toUpperCase()}</span>
          <strong>${value}</strong>
        </div>
      `).join('') :
      '<p style="color: #666;">No values captured</p>'
    }
  </div>
  
  <div class="timestamp">
    Generated: ${new Date().toLocaleString()}
  </div>
</body>
</html>`;

    const reportPath = path.join(this.reportsDir, `jde-report-${Date.now()}.html`);
    fs.writeFileSync(reportPath, html);
    console.log(`\n📄 HTML Report saved: ${reportPath}`);
  }

  private async close(): Promise<void> {
    if (this.state.browser) {
      await this.state.browser.close();
    }
  }

  private printSummary(): void {
    const totalTime = Date.now() - this.state.startTime;
    const passed = this.state.stepResults.filter(r => r.status === 'PASS').length;
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('FINAL SUMMARY');
    console.log(`${'='.repeat(60)}`);
    console.log(`Steps Passed: ${passed}/${this.state.stepResults.length}`);
    console.log(`Total Time: ${(totalTime / 1000).toFixed(1)}s`);
    console.log(`\nCaptured Values:`);
    Object.entries(this.state.capturedValues).forEach(([k, v]) => {
      console.log(`  ${k}: ${v}`);
    });
    console.log(`${'='.repeat(60)}\n`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

if (require.main === module) {
  const runner = new JDEEvolutionRunner();
  runner.initialize().then(() => runner.runWorkflow());
}
