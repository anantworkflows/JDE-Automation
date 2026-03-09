# Jira QA Automation Integration

This document explains how to run JDE automation tests directly from Jira.

## Quick Start

### 1. Test Cases Created

Two automated test cases have been prepared:

| Test Case | Description | Script |
|-----------|-------------|--------|
| **TC-JDE-001** | Order-to-Cash Workflow | `scripts/jde-order-to-cash.ts` |
| **TC-JDE-002** | Procure-to-Pay Workflow | `scripts/jde-procure-to-pay.ts` |

### 2. Automation Scripts Location

Scripts are attached to Jira test cases and available at:
- GitHub: https://github.com/anantworkflows/JDE-Automation
- Files: `scripts/jde-order-to-cash.ts`, `scripts/jde-procure-to-pay.ts`

### 3. Running Tests from Jira

#### Option A: GitHub Actions Integration (Recommended)

When you transition a Jira test case or click "Run Automation":
1. Jira sends webhook to GitHub Actions
2. GitHub Actions checks out code
3. Runs the appropriate test script
4. Posts results back to Jira as a comment

**Setup Required:**
```bash
# 1. Get Jira API token
# Visit: https://id.atlassian.com/manage-profile/security/api-tokens

# 2. Add GitHub Secrets
# Go to: GitHub Repo → Settings → Secrets and variables → Actions
# Add: JIRA_API_TOKEN = your-token

# 3. Create test cases in Jira
export JIRA_API_TOKEN=your-token
node scripts/setup-jira-test-cases.js
```

#### Option B: Manual Execution

Run tests manually and update Jira:

```bash
# Clone repository
git clone https://github.com/anantworkflows/JDE-Automation.git
cd JDE-Automation
npm install

# Run Order-to-Cash test
npx ts-node scripts/jde-order-to-cash.ts

# Run Procure-to-Pay test  
npx ts-node scripts/jde-procure-to-pay.ts
```

Then manually attach screenshots to Jira test case.

#### Option C: UiPath Integration (Existing)

If using existing UiPath setup:
1. Transition Jira issue to "In Progress"
2. UiPath webhook triggers automatically
3. UiPath downloads and executes script
4. Results posted back to Jira

## Test Case Details

### TC-JDE-001: Order-to-Cash

**Objective:** Validate complete sales workflow

**Steps:**
1. Login to JDE
2. Navigate to Address Book (P01012)
3. Create customer
4. Navigate to Sales Order Entry (P4210)
5. Create sales order
6. Check inventory (P41200)
7. Confirm shipment (P4205)
8. Generate invoice (R42800)
9. Logout

**Expected Duration:** ~2 minutes

### TC-JDE-002: Procure-to-Pay

**Objective:** Validate complete procurement workflow

**Steps:**
1. Login to JDE
2. Create supplier (P01012)
3. Create purchase order (P4310)
4. Receive goods (P4312)
5. Validate inventory (P41200)
6. Create invoice (P0411)
7. Process payment (P0413M)
8. Logout

**Expected Duration:** ~2 minutes

## GitHub Actions Workflow

The workflow file (`.github/workflows/jira-test-trigger.yml`) handles:
- Receiving triggers from Jira
- Installing dependencies
- Running Playwright tests
- Capturing screenshots
- Uploading artifacts
- Commenting results back to Jira

## Troubleshooting

### Issue: GitHub Actions not triggered from Jira

**Solution:**
1. Verify Jira automation rule is configured
2. Check GitHub token has `repo` scope
3. Verify webhook URL is correct

### Issue: Tests fail in GitHub Actions but pass locally

**Solution:**
- Check JDE credentials are correct
- Verify headless mode works: `HEADLESS=true npm test`
- Check screenshots in GitHub Actions artifacts

### Issue: Cannot create test cases via API

**Solution:**
Create manually in Jira:
1. Go to https://workflows.atlassian.net
2. Project: QA Automation
3. Create Issue → Type: Test
4. Copy summary and description from this doc
5. Attach script file manually

## Support

For issues with:
- **Jira integration:** Check Jira automation logs
- **GitHub Actions:** Check Actions tab in repository
- **Test scripts:** Review screenshots in artifacts

## Files Reference

| File | Purpose |
|------|---------|
| `scripts/jde-order-to-cash.ts` | Order-to-Cash automation |
| `scripts/jde-procure-to-pay.ts` | Procure-to-Pay automation |
| `.github/workflows/jira-test-trigger.yml` | GitHub Actions workflow |
| `scripts/setup-jira-test-cases.js` | Automated test case creation |
| `docs/JIRA-TEST-INTEGRATION.md` | Detailed integration guide |
