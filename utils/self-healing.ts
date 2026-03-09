import { Page, Locator, expect } from '@playwright/test';
import logger from './logger';

export interface RetryConfig {
  maxAttempts: number;
  backoffMs: number;
  dynamicWait: boolean;
}

export interface SelectorStrategy {
  primary: string;
  alternates: string[];
  textAnchors?: string[];
}

export class SelfHealingLocator {
  private page: Page;
  private config: RetryConfig;

  constructor(page: Page, config: RetryConfig = { maxAttempts: 3, backoffMs: 1000, dynamicWait: true }) {
    this.page = page;
    this.config = config;
  }

  async findElement(strategy: SelectorStrategy): Promise<Locator | null> {
    const selectors = [strategy.primary, ...strategy.alternates];
    
    for (const selector of selectors) {
      try {
        const locator = this.page.locator(selector).first();
        await locator.waitFor({ state: 'visible', timeout: 5000 });
        logger.info(`Element found with selector: ${selector}`);
        return locator;
      } catch (error) {
        logger.warn(`Selector failed: ${selector}`);
      }
    }

    // Try text-based anchors as fallback
    if (strategy.textAnchors) {
      for (const text of strategy.textAnchors) {
        try {
          const locator = this.page.getByText(text, { exact: false }).first();
          await locator.waitFor({ state: 'visible', timeout: 5000 });
          logger.info(`Element found with text anchor: ${text}`);
          return locator;
        } catch (error) {
          logger.warn(`Text anchor failed: ${text}`);
        }
      }
    }

    return null;
  }

  async click(strategy: SelectorStrategy, options?: { force?: boolean; timeout?: number }): Promise<boolean> {
    return this.executeWithRetry(
      async () => {
        const element = await this.findElement(strategy);
        if (!element) throw new Error(`Element not found: ${JSON.stringify(strategy)}`);
        await element.click({ force: options?.force, timeout: options?.timeout || 10000 });
        return true;
      },
      `Click on element: ${strategy.primary}`
    );
  }

  async fill(strategy: SelectorStrategy, value: string, options?: { clear?: boolean }): Promise<boolean> {
    return this.executeWithRetry(
      async () => {
        const element = await this.findElement(strategy);
        if (!element) throw new Error(`Element not found: ${JSON.stringify(strategy)}`);
        
        if (options?.clear !== false) {
          await element.clear();
        }
        await element.fill(value);
        return true;
      },
      `Fill element ${strategy.primary} with value: ${value}`
    );
  }

  async selectOption(strategy: SelectorStrategy, value: string): Promise<boolean> {
    return this.executeWithRetry(
      async () => {
        const element = await this.findElement(strategy);
        if (!element) throw new Error(`Element not found: ${JSON.stringify(strategy)}`);
        await element.selectOption(value);
        return true;
      },
      `Select option ${value} in element: ${strategy.primary}`
    );
  }

  async getText(strategy: SelectorStrategy): Promise<string | null> {
    try {
      const element = await this.findElement(strategy);
      if (!element) return null;
      return await element.textContent();
    } catch (error) {
      logger.error(`Failed to get text from ${strategy.primary}:`, error);
      return null;
    }
  }

  async waitForElement(strategy: SelectorStrategy, timeout?: number): Promise<boolean> {
    const element = await this.findElement(strategy);
    if (element) return true;
    
    // If dynamic wait is enabled, try waiting longer
    if (this.config.dynamicWait && timeout) {
      try {
        await this.page.waitForSelector(strategy.primary, { state: 'visible', timeout });
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  private async executeWithRetry<T>(action: () => Promise<T>, description: string): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        logger.info(`Attempt ${attempt}/${this.config.maxAttempts}: ${description}`);
        const result = await action();
        logger.info(`Success on attempt ${attempt}: ${description}`);
        return result;
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Attempt ${attempt} failed: ${description}`, { error: (error as Error).message });
        
        if (attempt < this.config.maxAttempts) {
          const delay = this.config.backoffMs * attempt;
          logger.info(`Waiting ${delay}ms before retry...`);
          await this.page.waitForTimeout(delay);
          
          // Try to recover by checking for iframes or page state
          await this.attemptRecovery();
        }
      }
    }
    
    logger.error(`All ${this.config.maxAttempts} attempts failed: ${description}`, { error: lastError?.message });
    throw lastError || new Error(`Failed after ${this.config.maxAttempts} attempts: ${description}`);
  }

  private async attemptRecovery(): Promise<void> {
    // Check for iframes and switch if needed
    const frames = this.page.frames();
    for (const frame of frames) {
      try {
        const url = frame.url();
        if (url.includes('jde') || url.includes('E1')) {
          logger.info(`Found JDE frame: ${url}`);
        }
      } catch {
        // Ignore errors from about:blank frames
      }
    }

    // Wait for network to be idle
    try {
      await this.page.waitForLoadState('networkidle', { timeout: 5000 });
    } catch {
      // Ignore timeout
    }
  }
}

export default SelfHealingLocator;
