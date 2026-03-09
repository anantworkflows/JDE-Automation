#!/usr/bin/env node
/**
 * Local Test Runner with Jira Integration
 * 
 * Runs tests locally and posts results to Jira
 * Usage:
 *   export JIRA_API_TOKEN=your-token
 *   export JIRA_USER_EMAIL=your-email
 *   node run-local-and-post-to-jira.js KAN-21
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const JIRA_BASE_URL = 'https://workflows.atlassian.net';
const JIRA_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_EMAIL = process.env.JIRA_USER_EMAIL;

const TEST_CASES = {
  'KAN-21': { script: 'scripts/order-to-cash.ts', name: 'Order-to-Cash' },
  'KAN-22': { script: 'scripts/jde-procure-to-pay.ts', name: 'Procure-to-Pay' }
};

function getAuth() {
  return Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64');
}

async function runTest(issueKey) {
  const testCase = TEST_CASES[issueKey];
  if (!testCase) {
    console.error(`❌ Unknown test case: ${issueKey}`);
    console.log(`Available: ${Object.keys(TEST_CASES).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running: ${testCase.name} (${issueKey})`);
  console.log(`${'='.repeat(60)}\n`);

  // Add comment to Jira - test started
  await addJiraComment(issueKey, `🚀 *Local Test Execution Started*\n\nTest: ${testCase.name}\nStarted at: ${new Date().toISOString()}\n\nRunning on local machine...`);

  const startTime = Date.now();
  let status = 'FAIL';
  let output = '';
  let error = '';

  try {
    // Run the test
    output = execSync(`npx ts-node ${testCase.script}`, {
      encoding: 'utf8',
      timeout: 300000, // 5 minutes
      cwd: path.join(__dirname, '..')
    });
    status = 'PASS';
  } catch (e) {
    status = 'FAIL';
    output = e.stdout || '';
    error = e.stderr || e.message;
  }

  const duration = Date.now() - startTime;

  // Parse results
  const results = parseResults(output, testCase.name);

  // Post results to Jira
  await postResultsToJira(issueKey, testCase.name, status, duration, results, output, error);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Test Complete: ${status}`);
  console.log(`Duration: ${(duration / 1000).toFixed(1)}s`);
  console.log(`${'='.repeat(60)}\n`);

  return status;
}

function parseResults(output, testName) {
  const results = {
    customerNumber: 'N/A',
    orderNumber: 'N/A',
    invoiceNumber: 'N/A',
    stepsCompleted: 0,
    totalSteps: 0
  };

  // Extract values from output
  const customerMatch = output.match(/Customer Number:\s*(\S+)/);
  if (customerMatch) results.customerNumber = customerMatch[1];

  const orderMatch = output.match(/Order Number:\s*(\S+)/);
  if (orderMatch) results.orderNumber = orderMatch[1];

  const invoiceMatch = output.match(/Invoice Number:\s*(\S+)/);
  if (invoiceMatch) results.invoiceNumber = invoiceMatch[1];

  const stepsMatch = output.match(/Steps Completed:\s*(\d+)\s*\/\s*(\d+)/);
  if (stepsMatch) {
    results.stepsCompleted = parseInt(stepsMatch[1]);
    results.totalSteps = parseInt(stepsMatch[2]);
  }

  return results;
}

async function addJiraComment(issueKey, comment) {
  try {
    await axios.post(
      `${JIRA_BASE_URL}/rest/api/3/issue/${issueKey}/comment`,
      { body: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: comment }] }] } },
      { headers: { 'Authorization': `Basic ${getAuth()}`, 'Content-Type': 'application/json' } }
    );
    console.log(`   ✅ Comment added to ${issueKey}`);
  } catch (e) {
    console.error(`   ❌ Failed to add comment:`, e.message);
  }
}

async function postResultsToJira(issueKey, testName, status, duration, results, output, error) {
  const statusEmoji = status === 'PASS' ? '✅' : '❌';
  
  let comment = `${statusEmoji} *Local Test Execution Complete*\n\n`;
  comment += `*Test:* ${testName}\n`;
  comment += `*Status:* ${status}\n`;
  comment += `*Duration:* ${(duration / 1000).toFixed(1)}s\n\n`;
  comment += `*Results:*\n`;
  comment += `- Customer Number: ${results.customerNumber}\n`;
  comment += `- Order Number: ${results.orderNumber}\n`;
  comment += `- Invoice Number: ${results.invoiceNumber}\n`;
  comment += `- Steps: ${results.stepsCompleted}/${results.totalSteps}\n\n`;
  comment += `*Executed on:* Local machine (${new Date().toISOString()})`;

  if (error) {
    comment += `\n\n*Error:*\n{code}${error.substring(0, 500)}{code}`;
  }

  await addJiraComment(issueKey, comment);

  // Update issue status if needed
  if (status === 'PASS') {
    await transitionIssue(issueKey, 'Done');
  }
}

async function transitionIssue(issueKey, status) {
  try {
    // Get available transitions
    const transitionsRes = await axios.get(
      `${JIRA_BASE_URL}/rest/api/3/issue/${issueKey}/transitions`,
      { headers: { 'Authorization': `Basic ${getAuth()}` } }
    );

    const transition = transitionsRes.data.transitions.find(t => t.name === status);
    if (transition) {
      await axios.post(
        `${JIRA_BASE_URL}/rest/api/3/issue/${issueKey}/transitions`,
        { transition: { id: transition.id } },
        { headers: { 'Authorization': `Basic ${getAuth()}`, 'Content-Type': 'application/json' } }
      );
      console.log(`   ✅ Issue transitioned to ${status}`);
    }
  } catch (e) {
    console.error(`   ⚠️  Could not transition issue:`, e.message);
  }
}

async function attachScreenshots(issueKey) {
  const screenshotsDir = path.join(__dirname, '..', 'screenshots');
  
  if (!fs.existsSync(screenshotsDir)) {
    console.log('   ℹ️  No screenshots directory');
    return;
  }

  const files = fs.readdirSync(screenshotsDir).filter(f => f.endsWith('.png'));
  
  for (const file of files.slice(-5)) { // Only last 5 screenshots
    const filePath = path.join(screenshotsDir, file);
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), file);

    try {
      await axios.post(
        `${JIRA_BASE_URL}/rest/api/3/issue/${issueKey}/attachments`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            'Authorization': `Basic ${getAuth()}`,
            'X-Atlassian-Token': 'no-check'
          }
        }
      );
      console.log(`   ✅ Attached: ${file}`);
    } catch (e) {
      console.error(`   ❌ Failed to attach ${file}:`, e.message);
    }
  }
}

async function main() {
  const issueKey = process.argv[2];
  
  if (!issueKey) {
    console.log('Usage: node run-local-and-post-to-jira.js <JIRA-ISSUE-KEY>');
    console.log('Example: node run-local-and-post-to-jira.js KAN-21');
    console.log('\nAvailable test cases:');
    Object.entries(TEST_CASES).forEach(([key, tc]) => {
      console.log(`  ${key}: ${tc.name}`);
    });
    process.exit(1);
  }

  if (!JIRA_TOKEN || !JIRA_EMAIL) {
    console.error('❌ Error: JIRA_API_TOKEN and JIRA_USER_EMAIL required');
    console.error('   export JIRA_API_TOKEN=your-token');
    console.error('   export JIRA_USER_EMAIL=your-email');
    process.exit(1);
  }

  const status = await runTest(issueKey);
  
  // Attach screenshots
  console.log('\n📎 Attaching screenshots...');
  await attachScreenshots(issueKey);

  console.log('\n✅ Complete!');
  process.exit(status === 'PASS' ? 0 : 1);
}

main().catch(console.error);
