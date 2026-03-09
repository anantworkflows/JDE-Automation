#!/usr/bin/env node
/**
 * Jira Test Case Setup Script
 * 
 * Creates test cases in Jira and attaches automation scripts
 * 
 * Usage:
 *   export JIRA_API_TOKEN=your-token
 *   node setup-jira-test-cases.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const JIRA_BASE_URL = process.env.JIRA_BASE_URL || 'https://workflows.atlassian.net';
const JIRA_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_EMAIL = process.env.JIRA_USER_EMAIL;
const PROJECT_KEY = process.env.JIRA_PROJECT_KEY || 'QA';

if (!JIRA_TOKEN) {
  console.error('❌ Error: JIRA_API_TOKEN environment variable required');
  console.error('   Get your token from: https://id.atlassian.com/manage-profile/security/api-tokens');
  process.exit(1);
}

if (!JIRA_EMAIL) {
  console.error('❌ Error: JIRA_USER_EMAIL environment variable required');
  console.error('   Use your Atlassian account email address');
  process.exit(1);
}

const testCases = [
  {
    summary: 'TC-JDE-001: Order-to-Cash Workflow Automation',
    description: `h2. Test Objective
Validate complete Order-to-Cash workflow in JD Edwards EnterpriseOne

h2. Preconditions
* JDE demo environment accessible
* Valid credentials (demo/demo)
* Playwright automation framework configured

h2. Test Steps
# Login to JDE EnterpriseOne
# Navigate to Address Book (P01012)
# Create new customer
# Navigate to Sales Order Entry (P4210)
# Create sales order for customer
# Check inventory levels (P41200)
# Confirm shipment (P4205)
# Generate invoice (R42800)
# Logout

h2. Expected Results
* All 8 steps execute successfully
* Customer number captured
* Order number generated
* Invoice created
* Execution time < 2 minutes

h2. Automation Script
*File:* scripts/jde-order-to-cash.ts
*Repository:* https://github.com/anantworkflows/JDE-Automation
*Runner:* npx ts-node scripts/jde-order-to-cash.ts`,
    priority: 'High',
    component: 'JDE EnterpriseOne',
    labels: ['automated', 'regression', 'sales', 'order-to-cash']
  },
  {
    summary: 'TC-JDE-002: Procure-to-Pay Workflow Automation',
    description: `h2. Test Objective
Validate complete Procure-to-Pay workflow in JD Edwards EnterpriseOne

h2. Preconditions
* JDE demo environment accessible
* Valid credentials (demo/demo)
* Playwright automation framework configured

h2. Test Steps
# Login to JDE EnterpriseOne
# Create supplier in Address Book (P01012)
# Create purchase order (P4310)
# Receive goods (P4312)
# Validate inventory increase (P41200)
# Create supplier invoice (P0411)
# Process payment (P0413M)
# Logout

h2. Expected Results
* All 8 steps execute successfully
* Supplier number captured
* PO number generated
* Invoice matched and payment processed
* Execution time < 2 minutes

h2. Automation Script
*File:* scripts/jde-procure-to-pay.ts
*Repository:* https://github.com/anantworkflows/JDE-Automation
*Runner:* npx ts-node scripts/jde-procure-to-pay.ts`,
    priority: 'High',
    component: 'JDE EnterpriseOne',
    labels: ['automated', 'regression', 'procurement', 'procure-to-pay']
  }
];

async function createTestCase(testCase) {
  console.log(`\n📝 Creating: ${testCase.summary}`);
  
  // Build auth header: email:token base64 encoded
  const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64');
  
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
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: testCase.description }]
              }
            ]
          },
          issuetype: { name: 'Test' },
          priority: { name: testCase.priority },
          components: [{ name: testCase.component }],
          labels: testCase.labels
        }
      },
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    console.log(`   ✅ Created: ${response.data.key}`);
    return response.data.key;
  } catch (error) {
    console.error(`   ❌ Failed to create test case:`, error.response?.data?.errorMessages?.[0] || error.message);
    if (error.response?.data?.errors) {
      console.error('   Details:', JSON.stringify(error.response.data.errors, null, 2));
    }
    throw error;
  }
}

async function attachScript(issueKey, scriptPath, scriptName) {
  console.log(`   📎 Attaching: ${scriptName}`);
  
  if (!fs.existsSync(scriptPath)) {
    console.error(`   ❌ Script not found: ${scriptPath}`);
    return;
  }
  
  const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64');
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
          'Authorization': `Basic ${auth}`,
          'X-Atlassian-Token': 'no-check'
        }
      }
    );
    console.log(`   ✅ Attached: ${scriptName}`);
  } catch (error) {
    console.error(`   ❌ Failed to attach:`, error.response?.data?.errorMessages?.[0] || error.message);
  }
}

async function addRemoteLink(issueKey, url, title) {
  console.log(`   🔗 Adding remote link: ${title}`);
  
  const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64');
  
  try {
    await axios.post(
      `${JIRA_BASE_URL}/rest/api/3/issue/${issueKey}/remotelink`,
      {
        application: {
          type: 'GitHub',
          name: 'GitHub Repository'
        },
        relationship: 'automates',
        object: {
          url: url,
          title: title,
          summary: 'Automation script repository'
        }
      },
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`   ✅ Remote link added`);
  } catch (error) {
    console.error(`   ⚠️  Could not add remote link:`, error.message);
  }
}

async function main() {
  console.log(`${'='.repeat(60)}`);
  console.log('JIRA TEST CASE SETUP');
  console.log(`${'='.repeat(60)}`);
  console.log(`Jira URL: ${JIRA_BASE_URL}`);
  console.log(`Project: ${PROJECT_KEY}`);
  console.log(`Test Cases: ${testCases.length}`);
  console.log(`${'='.repeat(60)}\n`);
  
  const createdIssues = [];
  
  for (const testCase of testCases) {
    try {
      const issueKey = await createTestCase(testCase);
      createdIssues.push(issueKey);
      
      // Determine which script to attach
      const isOrderToCash = testCase.summary.includes('Order-to-Cash');
      const scriptName = isOrderToCash ? 'order-to-cash.ts' : 'jde-procure-to-pay.ts';
      const scriptPath = path.join(__dirname, '..', 'scripts', scriptName);
      
      // Attach script file
      await attachScript(issueKey, scriptPath, scriptName);
      
      // Add remote link to repository
      const repoUrl = `https://github.com/anantworkflows/JDE-Automation/blob/main/scripts/${scriptName}`;
      await addRemoteLink(issueKey, repoUrl, `View ${scriptName} on GitHub`);
      
    } catch (error) {
      console.error(`\n❌ Failed to process test case:`, testCase.summary);
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('SETUP COMPLETE');
  console.log(`${'='.repeat(60)}`);
  console.log(`\nCreated Issues:`);
  createdIssues.forEach(key => {
    console.log(`  • ${JIRA_BASE_URL}/browse/${key}`);
  });
  
  console.log(`\nNext Steps:`);
  console.log(`  1. Configure GitHub Actions secrets (JIRA_API_TOKEN)`);
  console.log(`  2. Set up Jira automation rule for test execution`);
  console.log(`  3. Test running automation from Jira`);
  console.log(`${'='.repeat(60)}\n`);
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
