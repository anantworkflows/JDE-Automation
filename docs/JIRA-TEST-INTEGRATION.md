# Jira Test Case Creation & Automation Integration

## Overview
This guide creates test cases in Jira QA Automation project and links them to the TypeScript automation scripts.

## Test Cases to Create

### Test Case 1: TC-JDE-001 - Order-to-Cash Workflow
**Type:** Automated Test  
**Priority:** High  
**Component:** JDE EnterpriseOne - Sales

**Description:**
Complete Order-to-Cash workflow automation testing in JD Edwards EnterpriseOne. Validates the full sales process from customer creation to invoice generation.

**Preconditions:**
- JDE demo environment accessible (https://demo.steltix.com/jde)
- Valid credentials (demo/demo)
- Playwright automation framework configured

**Test Steps:**
1. Login to JDE EnterpriseOne
2. Navigate to Address Book (P01012)
3. Create new customer
4. Navigate to Sales Order Entry (P4210)
5. Create sales order for customer
6. Check inventory levels (P41200)
7. Confirm shipment (P4205)
8. Generate invoice (R42800)
9. Logout

**Expected Results:**
- All 8 steps execute successfully
- Customer number captured
- Order number generated
- Invoice created
- Execution time < 2 minutes

**Automation Script:**
- File: `scripts/jde-order-to-cash.ts`
- Runner: `npx ts-node scripts/jde-order-to-cash.ts`
- Repository: https://github.com/anantworkflows/JDE-Automation

---

### Test Case 2: TC-JDE-002 - Procure-to-Pay Workflow
**Type:** Automated Test  
**Priority:** High  
**Component:** JDE EnterpriseOne - Procurement

**Description:**
Complete Procure-to-Pay workflow automation testing in JD Edwards EnterpriseOne. Validates the full procurement process from supplier creation to payment processing.

**Preconditions:**
- JDE demo environment accessible (https://demo.steltix.com/jde)
- Valid credentials (demo/demo)
- Playwright automation framework configured

**Test Steps:**
1. Login to JDE EnterpriseOne
2. Create supplier in Address Book (P01012)
3. Create purchase order (P4310)
4. Receive goods (P4312)
5. Validate inventory increase (P41200)
6. Create supplier invoice (P0411)
7. Process payment (P0413M)
8. Logout

**Expected Results:**
- All 8 steps execute successfully
- Supplier number captured
- PO number generated
- Invoice matched and payment processed
- Execution time < 2 minutes

**Automation Script:**
- File: `scripts/jde-procure-to-pay.ts`
- Runner: `npx ts-node scripts/jde-procure-to-pay.ts`
- Repository: https://github.com/anantworkflows/JDE-Automation

---

## GitHub Actions Workflow for Jira Integration

Create `.github/workflows/jira-test-trigger.yml`:

```yaml
name: Jira Test Execution

on:
  repository_dispatch:
    types: [jira-test-trigger]
  workflow_dispatch:
    inputs:
      test_case:
        description: 'Test case to run (TC-JDE-001 or TC-JDE-002)'
        required: true
        default: 'TC-JDE-001'
      jira_issue:
        description: 'Jira issue key'
        required: true

jobs:
  run-test:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
      
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Install Playwright
      run: npx playwright install chromium
      
    - name: Run Order-to-Cash Test
      if: github.event.inputs.test_case == 'TC-JDE-001' || github.event.client_payload.test_case == 'TC-JDE-001'
      run: npx ts-node scripts/jde-order-to-cash.ts
      env:
        JDE_URL: https://demo.steltix.com/jde
        JDE_USERNAME: demo
        JDE_PASSWORD: demo
        
    - name: Run Procure-to-Pay Test
      if: github.event.inputs.test_case == 'TC-JDE-002' || github.event.client_payload.test_case == 'TC-JDE-002'
      run: npx ts-node scripts/jde-procure-to-pay.ts
      env:
        JDE_URL: https://demo.steltix.com/jde
        JDE_USERNAME: demo
        JDE_PASSWORD: demo
        
    - name: Upload screenshots
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: test-screenshots
        path: screenshots/
        
    - name: Comment on Jira Issue
      uses: atlassian/gajira-comment@v3
      if: always()
      with:
        issue: ${{ github.event.inputs.jira_issue || github.event.client_payload.jira_issue }}
        comment: |
          Test execution completed: ${{ job.status }}
          Test Case: ${{ github.event.inputs.test_case || github.event.client_payload.test_case }}
          Run: ${{ github.run_url }}
          Screenshots: Attached as artifacts
```

---

## Jira Automation Setup

### Step 1: Create Test Cases Manually

1. Go to: https://workflows.atlassian.net
2. Navigate to: QA Automation project
3. Click: Create Issue
4. Issue Type: Test
5. Fill in details from above (TC-JDE-001, TC-JDE-002)
6. Add label: `automated`
7. Save

### Step 2: Add Automation Rule

1. Project Settings → Automation → Create Rule
2. **Trigger:** Manual trigger (or Issue transitioned)
3. **Condition:** Issue type = Test
4. **Action:** Send web request

**For GitHub Actions trigger:**
```
URL: https://api.github.com/repos/anantworkflows/JDE-Automation/dispatches
Method: POST
Headers:
  Authorization: Bearer {{secrets.GITHUB_TOKEN}}
  Accept: application/vnd.github+json
  Content-Type: application/json

Body:
{
  "event_type": "jira-test-trigger",
  "client_payload": {
    "test_case": "{{issue.fields.summary}}",
    "jira_issue": "{{issue.key}}",
    "test_script": "{{issue.fields.customfield_test_script}}"
  }
}
```

### Step 3: Attach Scripts to Test Cases

**Option A: Link to GitHub**
- Add field: Automation Script URL
- Value: `https://github.com/anantworkflows/JDE-Automation/blob/main/scripts/jde-order-to-cash.ts`

**Option B: Download and Attach**
```bash
# Download scripts
curl -o jde-order-to-cash.ts https://raw.githubusercontent.com/anantworkflows/JDE-Automation/main/scripts/jde-order-to-cash.ts

# Attach to Jira issue via API
curl -X POST \
  -H "Authorization: Bearer $JIRA_TOKEN" \
  -F "file=@jde-order-to-cash.ts" \
  "https://workflows.atlassian.net/rest/api/3/issue/TC-JDE-001/attachments"
```

---

## API Script for Automated Setup

Create `setup-jira-test-cases.js`:

```javascript
const axios = require('axios');

const JIRA_BASE_URL = 'https://workflows.atlassian.net';
const JIRA_TOKEN = process.env.JIRA_API_TOKEN;
const PROJECT_KEY = 'QA'; // QA Automation project

const testCases = [
  {
    key: 'TC-JDE-001',
    summary: 'Order-to-Cash Workflow Automation',
    description: `Complete Order-to-Cash workflow testing:
    1. Login to JDE
    2. Create customer (P01012)
    3. Create sales order (P4210)
    4. Inventory inquiry (P41200)
    5. Shipment confirmation (P4205)
    6. Generate invoice (R42800)
    7. Logout`,
    priority: 'High',
    component: 'JDE EnterpriseOne',
    labels: ['automated', 'regression', 'sales']
  },
  {
    key: 'TC-JDE-002',
    summary: 'Procure-to-Pay Workflow Automation',
    description: `Complete Procure-to-Pay workflow testing:
    1. Login to JDE
    2. Create supplier (P01012)
    3. Create purchase order (P4310)
    4. Receive goods (P4312)
    5. Validate inventory (P41200)
    6. Create invoice (P0411)
    7. Process payment (P0413M)
    8. Logout`,
    priority: 'High',
    component: 'JDE EnterpriseOne',
    labels: ['automated', 'regression', 'procurement']
  }
];

async function createTestCase(testCase) {
  try {
    const response = await axios.post(
      `${JIRA_BASE_URL}/rest/api/3/issue`,
      {
        fields: {
          project: { key: PROJECT_KEY },
          summary: testCase.summary,
          description: {
            type: 'doc',
            version: 1,
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: testCase.description }]
            }]
          },
          issuetype: { name: 'Test' },
          priority: { name: testCase.priority },
          components: [{ name: testCase.component }],
          labels: testCase.labels
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${JIRA_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`Created: ${response.data.key}`);
    return response.data.key;
  } catch (error) {
    console.error(`Failed to create ${testCase.key}:`, error.message);
    throw error;
  }
}

async function attachScript(issueKey, scriptPath, scriptName) {
  const fs = require('fs');
  const FormData = require('form-data');
  
  const form = new FormData();
  form.append('file', fs.createReadStream(scriptPath), scriptName);
  
  try {
    await axios.post(
      `${JIRA_BASE_URL}/rest/api/3/issue/${issueKey}/attachments`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${JIRA_TOKEN}`,
          'X-Atlassian-Token': 'no-check'
        }
      }
    );
    console.log(`Attached ${scriptName} to ${issueKey}`);
  } catch (error) {
    console.error(`Failed to attach to ${issueKey}:`, error.message);
  }
}

async function main() {
  console.log('Creating Jira test cases...\n');
  
  for (const testCase of testCases) {
    const issueKey = await createTestCase(testCase);
    
    // Attach corresponding script
    const scriptName = testCase.key === 'TC-JDE-001' 
      ? 'jde-order-to-cash.ts'
      : 'jde-procure-to-pay.ts';
    
    await attachScript(issueKey, `./scripts/${scriptName}`, scriptName);
  }
  
  console.log('\n✅ Test cases created and scripts attached');
}

main().catch(console.error);
```

---

## Execution from Jira

### Method 1: Manual Trigger (GitHub Actions)
1. Open test case in Jira
2. Click "Run Automation" button (if configured)
3. Or use workflow transition trigger
4. GitHub Actions workflow runs
5. Results posted back to Jira as comment

### Method 2: UiPath Integration (Existing)
Use the existing UiPath webhook setup:
- Jira automation rule sends webhook to UiPath
- UiPath process downloads and executes script
- Results posted back to Jira

### Method 3: Direct API Trigger
```bash
# Trigger test from command line
curl -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/anantworkflows/JDE-Automation/dispatches \
  -d '{
    "event_type": "jira-test-trigger",
    "client_payload": {
      "test_case": "TC-JDE-001",
      "jira_issue": "QA-123"
    }
  }'
```

---

## Required Secrets

Configure in GitHub repository (Settings → Secrets):

| Secret | Value |
|--------|-------|
| `JIRA_API_TOKEN` | Your Jira API token |
| `GITHUB_TOKEN` | Auto-generated |
| `JDE_USERNAME` | demo |
| `JDE_PASSWORD` | demo |

Configure in Jira (Project Settings → Secrets):

| Secret | Value |
|--------|-------|
| `GITHUB_TOKEN` | GitHub personal access token |

---

## Summary

1. **Test Cases Created:** TC-JDE-001, TC-JDE-002
2. **Scripts Attached:** jde-order-to-cash.ts, jde-procure-to-pay.ts
3. **Execution Method:** GitHub Actions triggered from Jira
4. **Results:** Posted back to Jira as comments with artifacts

**Next Steps:**
1. Run `setup-jira-test-cases.js` to create issues
2. Configure GitHub Actions workflow
3. Set up Jira automation rule
4. Test execution from Jira
