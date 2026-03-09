# JD Edwards EnterpriseOne Automation Lab

A comprehensive automation testing suite for JD Edwards EnterpriseOne using Playwright and TypeScript. This project enables automated testing of critical business processes including Order-to-Cash workflows, customer management, inventory inquiries, and sales order processing.

## 🎯 Features

### Core Capabilities
- **End-to-End Testing**: Full browser automation with Playwright
- **Self-Healing Locators**: Resilient element detection with fallback strategies
- **Business Process Automation**: Complete Order-to-Cash workflow testing
- **UI Discovery**: Automatic mapping of JDE interface elements
- **Comprehensive Reporting**: HTML reports with screenshots and business data
- **Modular Architecture**: Reusable helpers and utilities

### Test Coverage
- ✅ Customer Search & Management (P01012)
- ✅ Sales Order Entry & Inquiry (P4210, P43025)
- ✅ Inventory Availability Checking (P41200)
- ✅ Order Status Validation
- ✅ Shipment Confirmation (P4205)
- ✅ Sales Update & Invoice Generation (R42800)

## 📁 Project Structure

```
jde-enterprise-automation-lab/
├── config.json                 # Application configuration
├── playwright.config.ts        # Playwright test configuration
├── tsconfig.json              # TypeScript configuration
├── package.json               # Dependencies and scripts
├── scripts/                   # Standalone automation scripts
│   ├── order-to-cash.ts      # Complete O2C workflow
│   ├── ui-discovery.ts       # UI element mapping
│   └── generate-report.ts    # Report generation
├── tests/                     # Playwright test specs
│   ├── customer-search.spec.ts
│   ├── sales-order-inquiry.spec.ts
│   ├── inventory-check.spec.ts
│   └── order-status-validation.spec.ts
├── utils/                     # Utility modules
│   ├── jde-helper.ts         # Core JDE automation helper
│   ├── self-healing.ts       # Self-healing locator utility
│   └── logger.ts             # Winston logging configuration
├── logs/                      # Execution logs
├── screenshots/               # Captured screenshots
└── reports/                   # Generated reports
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone or navigate to project directory
cd jde-enterprise-automation-lab

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium
```

### Configuration

Update `config.json` with your JDE environment details:

```json
{
  "targetApplication": {
    "name": "JD Edwards EnterpriseOne",
    "url": "https://your-jde-server.com/jde/E1Menu.maf",
    "credentials": {
      "username": "your-username",
      "password": "your-password"
    }
  }
}
```

## 🧪 Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Headed Mode (Visible Browser)
```bash
npm run test:headed
```

### Run Tests with UI Mode
```bash
npm run test:ui
```

### Run Specific Test File
```bash
npx playwright test tests/customer-search.spec.ts
```

### Debug Mode
```bash
npm run debug
```

## 📜 Available Scripts

### Standalone Automation Scripts

#### Order-to-Cash Workflow
Executes the complete Order-to-Cash business process:
```bash
npm run order-to-cash
```

This script:
1. Logs into JDE
2. Creates a new customer (P01012)
3. Creates a sales order (P4210)
4. Validates inventory availability (P41200)
5. Confirms shipment (P4205)
6. Generates invoice (R42800)
7. Produces a detailed execution report

#### UI Discovery
Automatically maps JDE interface elements:
```bash
npm run discover
```

Generates `ui-map.json` with discovered selectors for all major pages.

#### Generate Report
Creates HTML report from execution results:
```bash
npm run generate-report
```

## 🔧 Utilities

### JDE Helper (`utils/jde-helper.ts`)

Core automation helper with methods for:

```typescript
// Login/Logout
await helper.login({ username: 'demo', password: 'demo' });
await helper.logout();

// Fast Path Navigation
await helper.navigateByFastPath('P4210');

// Form Interactions
await helper.fillFormField('Customer Name', 'Acme Corp');
await helper.clickButton('Submit');
await helper.clickMenuItem('Sales Order');

// Data Extraction
const gridData = await helper.getGridData();
const fieldValue = await helper.getFieldValue('Order Number');

// Screenshots
await helper.takeScreenshot('step-name');
```

### Self-Healing Locator (`utils/self-healing.ts`)

Resilient element detection with multiple fallback strategies:

```typescript
const strategy: SelectorStrategy = {
  primary: 'input[name="username"]',
  alternates: [
    'input[id="username"]',
    'input[placeholder="Username"]'
  ],
  textAnchors: ['Username', 'User']
};

await selfHealing.click(strategy);
await selfHealing.fill(strategy, 'demo');
```

## 📊 Test Reports

### Playwright HTML Report
```bash
npm run report
```

### Custom Business Report
After running `order-to-cash`, view the detailed report at:
```
reports/jde-order-to-cash-report.html
```

Reports include:
- Execution summary with pass/fail statistics
- Business data generated (Customer, Order, Invoice numbers)
- Step-by-step execution details
- Screenshots at each step
- Error details for failed steps

## 🎭 Playwright Configuration

Key settings in `playwright.config.ts`:

- **Browser**: Chromium (Chrome)
- **Viewport**: 1920x1080
- **Headless**: Configurable via `HEADLESS` env variable
- **Retries**: 1 retry locally, 2 in CI
- **Tracing**: Enabled for debugging
- **Screenshots**: Captured on every step
- **Videos**: Recorded for failed tests

## 🔐 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `HEADLESS` | Run browser in headless mode | `true` |
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | `info` |
| `NODE_ENV` | Environment (development, production) | `development` |

## 📝 Writing Custom Tests

### Basic Test Structure

```typescript
import { test, expect, Page } from '@playwright/test';
import JDEHelper from '../utils/jde-helper';

test.describe('My Feature', () => {
  let page: Page;
  let helper: JDEHelper;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    page = await context.newPage();
    helper = new JDEHelper(page);
    await helper.login({ username: 'demo', password: 'demo' });
  });

  test.afterEach(async () => {
    await helper.logout();
    await page.close();
  });

  test('my test case', async () => {
    await helper.navigateByFastPath('P4210');
    // Your test steps here
  });
});
```

## 🐛 Debugging

### Enable Debug Mode
```bash
npm run debug
```

### View Traces
Traces are saved in `test-results/` and can be viewed with:
```bash
npx playwright show-trace test-results/trace.zip
```

### Check Logs
Execution logs are stored in:
- `logs/automation.log` - All log levels
- `logs/error.log` - Errors only

## 🏗️ Architecture

### Self-Healing Mechanism
The automation uses a multi-tier fallback system:

1. **Primary Selector**: Try the main CSS selector
2. **Alternate Selectors**: Try backup selectors
3. **Text Anchors**: Find by visible text
4. **Retry with Backoff**: Wait and retry with increasing delays

### Page Object Pattern
Tests use helper classes to encapsulate JDE-specific logic:
- `JDEHelper`: Core navigation and interaction
- `SelfHealingLocator`: Resilient element finding
- `ReportGenerator`: Business-focused reporting

## 📚 Fast Path Codes

Common JDE Fast Path codes used in this project:

| Code | Description |
|------|-------------|
| P01012 | Address Book |
| P4210 | Sales Order Entry |
| P43025 | Sales Order Inquiry |
| P41200 | Inventory Inquiry |
| P4205 | Shipment Confirmation |
| R42800 | Sales Update (UBEs) |

## 🤝 Contributing

1. Create a new test file in `tests/`
2. Follow the existing naming convention: `*.spec.ts`
3. Use the JDEHelper for all JDE interactions
4. Add screenshots at key validation points
5. Update this README with new features

## 📄 License

ISC License - See package.json for details

## 🆘 Support

For issues or questions:
1. Check the logs in `logs/automation.log`
2. Review screenshots in `screenshots/`
3. Run with debug mode: `npm run debug`
4. Check Playwright documentation: https://playwright.dev

---

**Built with**: Playwright + TypeScript + Winston
**Target Platform**: JD Edwards EnterpriseOne 9.2
**Demo Environment**: https://demo.steltix.com/jde/E1Menu.maf
