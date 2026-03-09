import { Page, Frame, expect } from '@playwright/test';
import logger from './logger';
import SelfHealingLocator, { SelectorStrategy } from './self-healing';

export interface JDECredentials {
  username: string;
  password: string;
  environment?: string;
  role?: string;
}

export class JDEHelper {
  page: Page;
  selfHealing: SelfHealingLocator;
  mainFrame: Frame | null = null;  // E1Menu frame
  appFrame: Frame | null = null;   // RunApp frame (current application)

  constructor(page: Page) {
    this.page = page;
    this.selfHealing = new SelfHealingLocator(page, { maxAttempts: 3, backoffMs: 1000, dynamicWait: true });
  }

  /**
   * Find and cache the main E1Menu frame
   */
  async findMainFrame(): Promise<Frame | null> {
    const frames = this.page.frames();
    for (const frame of frames) {
      const url = frame.url();
      if (url.includes('E1Menu.maf') && !url.includes('FastPath') && !url.includes('RunApp')) {
        this.mainFrame = frame;
        logger.info(`Found main frame (E1Menu): ${url.substring(0, 80)}`);
        return frame;
      }
    }
    return null;
  }

  /**
   * Find the application frame (RunApp.mafService)
   */
  async findAppFrame(): Promise<Frame | null> {
    const frames = this.page.frames();
    for (const frame of frames) {
      const url = frame.url();
      if (url.includes('RunApp.mafService')) {
        this.appFrame = frame;
        logger.info(`Found app frame (RunApp): ${url.substring(0, 80)}`);
        return frame;
      }
    }
    return null;
  }

  async login(credentials: JDECredentials): Promise<boolean> {
    logger.info('Starting JDE login process');
    
    try {
      // Navigate to JDE
      await this.page.goto('https://demo.steltix.com/jde/E1Menu.maf', { waitUntil: 'networkidle' });
      await this.takeScreenshot('login-page');

      // Wait for login form - check multiple possible selectors
      const userInput = this.page.locator('input[name="User"], input[name="username"], input[id="User"]').first();
      await userInput.waitFor({ timeout: 30000 });

      // Fill username
      await userInput.fill(credentials.username);
      logger.info('Username filled');

      // Fill password
      const passInput = this.page.locator('input[name="Password"], input[type="password"]').first();
      await passInput.fill(credentials.password);
      logger.info('Password filled');

      // Click login button
      const loginBtn = this.page.locator('input[type="submit"], button[type="submit"]').first();
      await loginBtn.click();
      logger.info('Login submitted');

      // Wait for post-login load
      await this.page.waitForTimeout(8000);
      await this.takeScreenshot('login-success');
      
      // Find and cache the main frame
      await this.findMainFrame();

      logger.info('JDE login successful');
      return true;
    } catch (error) {
      logger.error('JDE login failed:', error);
      await this.takeScreenshot('login-failed');
      throw error;
    }
  }

  async navigateByFastPath(fastPath: string): Promise<void> {
    logger.info(`Navigating via Fast Path: ${fastPath}`);
    
    try {
      // Ensure we have the main frame
      if (!this.mainFrame) {
        await this.findMainFrame();
      }
      
      if (!this.mainFrame) {
        throw new Error('Main E1Menu frame not found');
      }

      // STEP 1: Click the main menu button to reveal Fast Path
      logger.info('Clicking main menu button (#drop_mainmenu)');
      const menuButton = this.mainFrame.locator('#drop_mainmenu');
      const menuCount = await menuButton.count();
      
      if (menuCount > 0) {
        await menuButton.click({ timeout: 10000 });
        logger.info('Menu button clicked');
        await this.page.waitForTimeout(2000);
      } else {
        logger.warn('Menu button not found, trying to proceed without clicking');
      }

      // STEP 2: Find and use the Fast Path input in the main frame
      logger.info('Looking for Fast Path input');
      const fastPathInput = this.mainFrame.locator('#TE_FAST_PATH_BOX').first();
      
      if (await fastPathInput.count() === 0) {
        throw new Error('Fast Path input (#TE_FAST_PATH_BOX) not found');
      }

      // Fill Fast Path using force (may be off-screen)
      logger.info(`Filling Fast Path with: ${fastPath}`);
      await fastPathInput.fill(fastPath, { force: true });
      await this.page.waitForTimeout(500);
      
      // Press Enter
      logger.info('Pressing Enter');
      await fastPathInput.press('Enter');
      
      // STEP 3: Wait for RunApp frame to load
      logger.info('Waiting for application to load (RunApp.mafService)...');
      const maxWaitTime = 30000; // 30 seconds
      const checkInterval = 1000;
      const startTime = Date.now();
      let appLoaded = false;
      
      while (Date.now() - startTime < maxWaitTime) {
        await this.page.waitForTimeout(checkInterval);
        
        // Check if RunApp frame loaded
        const appFrame = await this.findAppFrame();
        if (appFrame) {
          appLoaded = true;
          logger.info('✅ Application frame loaded successfully');
          break;
        }
        
        // Log progress
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        if (elapsed % 5 === 0) {
          logger.info(`Waiting for app... ${elapsed}s`);
        }
      }
      
      if (!appLoaded) {
        logger.warn('⚠️ Application frame did not load within 30 seconds');
      }
      
      await this.takeScreenshot(`fastpath-${fastPath}`);
      logger.info(`Navigation to ${fastPath} complete`);
      
    } catch (error) {
      logger.error(`Failed to navigate via Fast Path: ${fastPath}`, error);
      await this.takeScreenshot(`fastpath-${fastPath}-error`);
      throw error;
    }
  }

  async clickToolbarButton(buttonName: string): Promise<void> {
    logger.info(`Clicking toolbar button: ${buttonName}`);
    
    try {
      // Use app frame if available, otherwise main frame
      const context = this.appFrame || this.mainFrame || this.page;
      
      // Try multiple selectors for toolbar buttons
      const selectors = [
        `#hc_${buttonName}`,
        `img[alt*="${buttonName}" i]`,
        `img[title*="${buttonName}" i]`,
        `button:has-text("${buttonName}")`,
        `[title*="${buttonName}" i]`
      ];
      
      for (const selector of selectors) {
        try {
          const btn = context.locator(selector).first();
          if (await btn.count() > 0) {
            logger.info(`Found ${buttonName} button with: ${selector}`);
            await btn.click({ timeout: 10000 });
            logger.info(`✅ Clicked ${buttonName} button`);
            await this.page.waitForTimeout(1000);
            return;
          }
        } catch (e) {
          // Try next selector
        }
      }
      
      throw new Error(`Toolbar button "${buttonName}" not found`);
    } catch (error) {
      logger.error(`Failed to click ${buttonName}:`, error);
      throw error;
    }
  }

  async fillField(fieldLabel: string, value: string): Promise<void> {
    logger.info(`Filling field "${fieldLabel}" with "${value}"`);
    
    try {
      const context = this.appFrame || this.mainFrame || this.page;
      
      // Try multiple selectors
      const selectors = [
        `input[aria-label*="${fieldLabel}" i]`,
        `input[name*="${fieldLabel.replace(/\s/g, '')}" i]`,
        `input[id*="${fieldLabel.replace(/\s/g, '')}" i]`,
        `input[placeholder*="${fieldLabel}" i]`,
        `label:has-text("${fieldLabel}") + input`
      ];
      
      for (const selector of selectors) {
        try {
          const field = context.locator(selector).first();
          if (await field.count() > 0) {
            await field.fill(value);
            logger.info(`✅ Filled ${fieldLabel}`);
            return;
          }
        } catch (e) {
          // Try next
        }
      }
      
      throw new Error(`Field "${fieldLabel}" not found`);
    } catch (error) {
      logger.error(`Failed to fill ${fieldLabel}:`, error);
      throw error;
    }
  }

  async waitForJDELoad(timeout: number = 30000): Promise<void> {
    logger.info('Waiting for JDE page load...');
    
    try {
      // Wait for loading indicators to disappear
      await this.page.waitForTimeout(3000);
      
      // Wait for network to be idle
      await this.page.waitForLoadState('networkidle', { timeout: timeout / 2 }).catch(() => {
        logger.warn('Network idle timeout, continuing...');
      });
      
      logger.info('JDE load complete');
    } catch (error) {
      logger.warn('Wait for load warning:', (error as Error).message);
    }
  }

  async takeScreenshot(name: string): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${name}-${timestamp}.png`;
      const filepath = `./screenshots/${filename}`;
      
      await this.page.screenshot({ path: filepath, fullPage: true });
      logger.info(`Screenshot saved: ${filepath}`);
      return filepath;
    } catch (error) {
      logger.warn('Screenshot failed:', (error as Error).message);
      return '';
    }
  }

  async logout(): Promise<void> {
    logger.info('Starting JDE logout');
    try {
      // Try clicking Sign Out in main frame
      const context = this.mainFrame || this.page;
      const signOut = context.locator('a:has-text("Sign Out"), text=Sign Out').first();
      
      if (await signOut.count() > 0) {
        await signOut.click();
        logger.info('Logout clicked');
        await this.page.waitForTimeout(2000);
      } else {
        logger.info('No logout link found');
      }
    } catch (error) {
      logger.warn('Logout (non-critical):', (error as Error).message);
    }
  }

  /**
   * Get the Address Book browse frame (grid view)
   */
  async getAddressBookBrowseFrame(): Promise<Frame | null> {
    logger.info('Looking for Address Book browse frame');
    const frames = this.page.frames();
    
    for (const frame of frames) {
      const url = frame.url();
      if (url.includes('P01012') || url.includes('AddressBookBrowse')) {
        logger.info(`Found Address Book browse frame: ${url.substring(0, 60)}`);
        return frame;
      }
    }
    
    // If not found by URL, use the current app frame
    if (this.appFrame) {
      logger.info('Using current app frame as Address Book browse');
      return this.appFrame;
    }
    
    return null;
  }

  /**
   * Get the Address Book revision form frame (add/edit form)
   */
  async getAddressBookRevisionFrame(): Promise<Frame | null> {
    logger.info('Looking for Address Book revision form frame');
    const frames = this.page.frames();
    
    for (const frame of frames) {
      const url = frame.url();
      if (url.includes('P01012') && (url.includes('Revision') || url.includes('Form'))) {
        logger.info(`Found Address Book revision frame: ${url.substring(0, 60)}`);
        return frame;
      }
    }
    
    // Look for any frame that might be the form (not the browse frame)
    for (const frame of frames) {
      const url = frame.url();
      if (url.includes('RunApp.mafService') && url.includes('P01012')) {
        // Check if this frame has form inputs (not just grid)
        const hasFormInputs = await frame.locator('input#C0_28, input[name*="Alpha"]').count() > 0;
        if (hasFormInputs) {
          logger.info(`Found revision frame by form content: ${url.substring(0, 60)}`);
          return frame;
        }
      }
    }
    
    return null;
  }

  /**
   * Get form frame for a specific application
   */
  async getFormFrame(appCode: string): Promise<Frame | null> {
    logger.info(`Looking for form frame for ${appCode}`);
    const frames = this.page.frames();
    
    for (const frame of frames) {
      const url = frame.url();
      if (url.includes(appCode) && url.includes('RunApp')) {
        logger.info(`Found ${appCode} form frame: ${url.substring(0, 60)}`);
        return frame;
      }
    }
    
    return null;
  }

  /**
   * Alias for fillField - compatibility with existing code
   */
  async fillFormField(fieldName: string, value: string): Promise<void> {
    return this.fillField(fieldName, value);
  }

  /**
   * Alias for clickToolbarButton - compatibility with existing code
   */
  async clickButton(buttonName: string): Promise<void> {
    return this.clickToolbarButton(buttonName);
  }

  /**
   * Get grid data from current application frame
   */
  async getGridData(): Promise<any[]> {
    logger.info('Getting grid data');
    const context = this.appFrame || this.mainFrame || this.page;
    
    try {
      // Look for table/grid rows
      const rows = await context.locator('tr.dataRow, tr.gridRow, .jde-grid-row').all();
      const data = [];
      
      for (const row of rows.slice(0, 10)) { // Limit to first 10 rows
        const cells = await row.locator('td').all();
        const rowData = [];
        for (const cell of cells) {
          const text = await cell.textContent().catch(() => '');
          rowData.push(text?.trim());
        }
        if (rowData.some(d => d)) {
          data.push(rowData);
        }
      }
      
      logger.info(`Retrieved ${data.length} rows from grid`);
      return data;
    } catch (error) {
      logger.warn('Could not get grid data:', (error as Error).message);
      return [];
    }
  }
}

export default JDEHelper;
