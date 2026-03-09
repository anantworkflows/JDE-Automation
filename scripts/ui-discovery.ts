import { chromium, Browser, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';
import JDEHelper from '../utils/jde-helper';

interface DiscoveredElement {
  type: string;
  selector: string;
  text?: string;
  id?: string;
  name?: string;
  placeholder?: string;
  tagName: string;
  location: { x: number; y: number };
}

interface UIPage {
  name: string;
  url: string;
  fastPath?: string;
  elements: DiscoveredElement[];
  forms: DiscoveredElement[];
  grids: DiscoveredElement[];
  buttons: DiscoveredElement[];
  navigation: DiscoveredElement[];
}

interface UIMap {
  application: string;
  baseUrl: string;
  discoveredAt: string;
  pages: UIPage[];
  commonSelectors: {
    login: {
      username: string[];
      password: string[];
      submit: string[];
    };
    navigation: {
      fastPath: string[];
      menuItems: string[];
    };
    common: {
      loading: string[];
      grid: string[];
      search: string[];
    };
  };
}

export class UIDiscovery {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private helper: JDEHelper | null = null;
  private uiMap: UIMap;

  constructor() {
    this.uiMap = {
      application: 'JD Edwards EnterpriseOne',
      baseUrl: 'https://demo.steltix.com/jde/E1Menu.maf',
      discoveredAt: new Date().toISOString(),
      pages: [],
      commonSelectors: {
        login: {
          username: [],
          password: [],
          submit: []
        },
        navigation: {
          fastPath: [],
          menuItems: []
        },
        common: {
          loading: [],
          grid: [],
          search: []
        }
      }
    };
  }

  async initialize(): Promise<void> {
    logger.info('Initializing browser for UI discovery');
    this.browser = await chromium.launch({ headless: false, slowMo: 100 });
    const context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: { dir: './screenshots/videos/' }
    });
    this.page = await context.newPage();
    this.helper = new JDEHelper(this.page);
  }

  async discover(): Promise<UIMap> {
    if (!this.page || !this.helper) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    try {
      // Phase 1: Discover Login Page
      await this.discoverLoginPage();

      // Phase 2: Login to access the application
      await this.helper.login({ username: 'demo', password: 'demo' });

      // Phase 3: Discover Main Navigation
      await this.discoverMainNavigation();

      // Phase 4: Discover Fast Path functionality
      await this.discoverFastPath();

      // Phase 5: Explore specific modules
      await this.discoverAddressBook();
      await this.discoverSalesOrderEntry();
      await this.discoverInventoryInquiry();

      // Phase 6: Logout
      await this.helper.logout();

      // Save UI Map
      await this.saveUIMap();

      return this.uiMap;
    } catch (error) {
      logger.error('UI Discovery failed:', error);
      throw error;
    } finally {
      await this.close();
    }
  }

  private async discoverLoginPage(): Promise<void> {
    if (!this.page) return;

    logger.info('Discovering login page elements');
    await this.page.goto('https://demo.steltix.com/jde/E1Menu.maf', { waitUntil: 'networkidle' });
    
    const loginPage: UIPage = {
      name: 'Login Page',
      url: this.page.url(),
      elements: [],
      forms: [],
      grids: [],
      buttons: [],
      navigation: []
    };

    // Discover input fields
    const inputs = await this.page.locator('input').all();
    for (const input of inputs) {
      const element = await this.extractElementInfo(input);
      if (element) {
        loginPage.elements.push(element);
        
        if (element.type === 'password') {
          this.uiMap.commonSelectors.login.password.push(element.selector);
        } else if (element.type === 'text' && 
          (element.name?.toLowerCase().includes('user') || 
           element.placeholder?.toLowerCase().includes('user'))) {
          this.uiMap.commonSelectors.login.username.push(element.selector);
        }
      }
    }

    // Discover buttons
    const buttons = await this.page.locator('button, input[type="submit"], input[type="button"]').all();
    for (const button of buttons) {
      const element = await this.extractElementInfo(button);
      if (element) {
        loginPage.buttons.push(element);
        if (element.type === 'submit' || element.text?.toLowerCase().includes('login')) {
          this.uiMap.commonSelectors.login.submit.push(element.selector);
        }
      }
    }

    this.uiMap.pages.push(loginPage);
    logger.info(`Discovered ${loginPage.elements.length} elements on login page`);
  }

  private async discoverMainNavigation(): Promise<void> {
    if (!this.page) return;

    logger.info('Discovering main navigation');
    
    const navPage: UIPage = {
      name: 'Main Navigation',
      url: this.page.url(),
      elements: [],
      forms: [],
      grids: [],
      buttons: [],
      navigation: []
    };

    // Discover menu items
    const menuSelectors = [
      'a.menu-item', '.menu a', '.nav-item', '[role="menuitem"]',
      'a:has-text("Sales")', 'a:has-text("Inventory")', 'a:has-text("Financial")',
      'a:has-text("Address Book")', 'a:has-text("System")'
    ];

    for (const selector of menuSelectors) {
      try {
        const elements = await this.page.locator(selector).all();
        for (const el of elements.slice(0, 5)) { // Limit to first 5
          const info = await this.extractElementInfo(el);
          if (info) {
            navPage.navigation.push(info);
            this.uiMap.commonSelectors.navigation.menuItems.push(info.selector);
          }
        }
      } catch {
        // Ignore errors for selectors that don't match
      }
    }

    // Discover Fast Path input
    const fastPathSelectors = [
      'input[placeholder*="Fast Path" i]',
      'input[name*="fastPath" i]',
      'input[id*="fastPath" i]',
      '.fastpath input'
    ];

    for (const selector of fastPathSelectors) {
      try {
        const element = this.page.locator(selector).first();
        await element.waitFor({ state: 'visible', timeout: 3000 });
        this.uiMap.commonSelectors.navigation.fastPath.push(selector);
        const info = await this.extractElementInfo(element);
        if (info) navPage.elements.push(info);
        break;
      } catch {
        // Continue to next selector
      }
    }

    this.uiMap.pages.push(navPage);
    logger.info(`Discovered ${navPage.navigation.length} navigation elements`);
  }

  private async discoverFastPath(): Promise<void> {
    if (!this.page || !this.helper) return;

    logger.info('Testing Fast Path navigation');
    
    const fastPaths = [
      { code: 'P01012', name: 'Address Book' },
      { code: 'P4210', name: 'Sales Order Entry' },
      { code: 'P41200', name: 'Inventory Inquiry' }
    ];

    for (const fp of fastPaths) {
      try {
        await this.helper.navigateByFastPath(fp.code);
        await this.page.waitForTimeout(3000);
        
        const page: UIPage = {
          name: fp.name,
          url: this.page.url(),
          fastPath: fp.code,
          elements: [],
          forms: await this.discoverForms(),
          grids: await this.discoverGrids(),
          buttons: await this.discoverButtons(),
          navigation: []
        };

        this.uiMap.pages.push(page);
        logger.info(`Discovered ${fp.name} via Fast Path ${fp.code}`);
      } catch (error) {
        logger.warn(`Failed to discover ${fp.name}:`, error);
      }
    }
  }

  private async discoverAddressBook(): Promise<void> {
    if (!this.page || !this.helper) return;
    
    logger.info('Discovering Address Book (P01012)');
    try {
      await this.helper.navigateByFastPath('P01012');
      
      const page: UIPage = {
        name: 'Address Book - P01012',
        url: this.page.url(),
        fastPath: 'P01012',
        elements: [],
        forms: await this.discoverForms(),
        grids: await this.discoverGrids(),
        buttons: await this.discoverButtons(),
        navigation: []
      };

      // Look for specific Address Book fields
      const searchFields = await this.page.locator('input[name*="search"], input[placeholder*="Search" i]').all();
      for (const field of searchFields) {
        const info = await this.extractElementInfo(field);
        if (info) page.elements.push(info);
      }

      // Update or add to pages
      const existingIndex = this.uiMap.pages.findIndex(p => p.fastPath === 'P01012');
      if (existingIndex >= 0) {
        this.uiMap.pages[existingIndex] = page;
      } else {
        this.uiMap.pages.push(page);
      }
    } catch (error) {
      logger.error('Failed to discover Address Book:', error);
    }
  }

  private async discoverSalesOrderEntry(): Promise<void> {
    if (!this.page || !this.helper) return;
    
    logger.info('Discovering Sales Order Entry (P4210)');
    try {
      await this.helper.navigateByFastPath('P4210');
      
      const page: UIPage = {
        name: 'Sales Order Entry - P4210',
        url: this.page.url(),
        fastPath: 'P4210',
        elements: [],
        forms: await this.discoverForms(),
        grids: await this.discoverGrids(),
        buttons: await this.discoverButtons(),
        navigation: []
      };

      // Look for order-specific fields
      const orderFields = await this.page.locator('input[name*="order" i], input[name*="customer" i]').all();
      for (const field of orderFields) {
        const info = await this.extractElementInfo(field);
        if (info) page.elements.push(info);
      }

      const existingIndex = this.uiMap.pages.findIndex(p => p.fastPath === 'P4210');
      if (existingIndex >= 0) {
        this.uiMap.pages[existingIndex] = page;
      } else {
        this.uiMap.pages.push(page);
      }
    } catch (error) {
      logger.error('Failed to discover Sales Order Entry:', error);
    }
  }

  private async discoverInventoryInquiry(): Promise<void> {
    if (!this.page || !this.helper) return;
    
    logger.info('Discovering Inventory Inquiry (P41200)');
    try {
      await this.helper.navigateByFastPath('P41200');
      
      const page: UIPage = {
        name: 'Inventory Inquiry - P41200',
        url: this.page.url(),
        fastPath: 'P41200',
        elements: [],
        forms: await this.discoverForms(),
        grids: await this.discoverGrids(),
        buttons: await this.discoverButtons(),
        navigation: []
      };

      const existingIndex = this.uiMap.pages.findIndex(p => p.fastPath === 'P41200');
      if (existingIndex >= 0) {
        this.uiMap.pages[existingIndex] = page;
      } else {
        this.uiMap.pages.push(page);
      }
    } catch (error) {
      logger.error('Failed to discover Inventory Inquiry:', error);
    }
  }

  private async discoverForms(): Promise<DiscoveredElement[]> {
    if (!this.page) return [];
    
    const forms: DiscoveredElement[] = [];
    const formElements = await this.page.locator('form, fieldset').all();
    
    for (const el of formElements) {
      const info = await this.extractElementInfo(el);
      if (info) forms.push(info);
    }
    
    return forms;
  }

  private async discoverGrids(): Promise<DiscoveredElement[]> {
    if (!this.page) return [];
    
    const grids: DiscoveredElement[] = [];
    const gridSelectors = ['table', '.grid', '[role="grid"]', '.dataTable', '.jde-grid'];
    
    for (const selector of gridSelectors) {
      try {
        const elements = await this.page.locator(selector).all();
        for (const el of elements.slice(0, 3)) {
          const info = await this.extractElementInfo(el);
          if (info) {
            grids.push(info);
            this.uiMap.commonSelectors.common.grid.push(info.selector);
          }
        }
      } catch {
        // Ignore
      }
    }
    
    return grids;
  }

  private async discoverButtons(): Promise<DiscoveredElement[]> {
    if (!this.page) return [];
    
    const buttons: DiscoveredElement[] = [];
    const buttonElements = await this.page.locator('button, input[type="button"], input[type="submit"], .btn').all();
    
    for (const el of buttonElements.slice(0, 20)) {
      const info = await this.extractElementInfo(el);
      if (info) buttons.push(info);
    }
    
    return buttons;
  }

  private async extractElementInfo(element: any): Promise<DiscoveredElement | null> {
    if (!this.page) return null;
    
    try {
      const tagName = await element.evaluate((el: HTMLElement) => el.tagName.toLowerCase());
      const type = await element.evaluate((el: HTMLElement) => (el as HTMLInputElement).type || '');
      const id = await element.evaluate((el: HTMLElement) => el.id || '');
      const name = await element.evaluate((el: HTMLElement) => (el as HTMLInputElement).name || '');
      const text = await element.textContent() || '';
      const placeholder = await element.evaluate((el: HTMLElement) => (el as HTMLInputElement).placeholder || '');
      
      // Build selector
      let selector = tagName;
      if (id) selector += `#${id}`;
      else if (name) selector += `[name="${name}"]`;
      else if (placeholder) selector += `[placeholder="${placeholder}"]`;
      
      const boundingBox = await element.boundingBox();
      
      return {
        type,
        selector,
        text: text.trim().substring(0, 100),
        id,
        name,
        placeholder,
        tagName,
        location: boundingBox ? { x: boundingBox.x, y: boundingBox.y } : { x: 0, y: 0 }
      };
    } catch {
      return null;
    }
  }

  private async saveUIMap(): Promise<void> {
    const outputPath = path.join(__dirname, '../ui-map.json');
    fs.writeFileSync(outputPath, JSON.stringify(this.uiMap, null, 2));
    logger.info(`UI Map saved to ${outputPath}`);
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

// Run discovery if called directly
if (require.main === module) {
  const discovery = new UIDiscovery();
  discovery.initialize()
    .then(() => discovery.discover())
    .then((uiMap) => {
      console.log('UI Discovery completed successfully');
      console.log(`Discovered ${uiMap.pages.length} pages`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('UI Discovery failed:', error);
      process.exit(1);
    });
}

export default UIDiscovery;
