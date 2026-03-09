#!/bin/bash
#
# Trigger JDE Test from Jira
# 
# This script can be called from Jira automation to trigger GitHub Actions
# 
# Usage in Jira Automation (Send Web Request):
#   URL: https://api.github.com/repos/anantworkflows/JDE-Automation/dispatches
#   Method: POST
#   Headers:
#     Authorization: Bearer {{secrets.GITHUB_TOKEN}}
#     Accept: application/vnd.github.v3+json
#   Body:
#     {
#       "event_type": "jira-test-trigger",
#       "client_payload": {
#         "test_case": "TC-JDE-001",
#         "jira_issue": "QA-123"
#       }
#     }

# Or run manually:
#   ./trigger-from-jira.sh TC-JDE-001 QA-123

TEST_CASE=${1:-TC-JDE-001}
JIRA_ISSUE=${2:-QA-001}
GITHUB_TOKEN=${GITHUB_TOKEN:-$JIRA_GITHUB_TOKEN}

if [ -z "$GITHUB_TOKEN" ]; then
    echo "Error: GITHUB_TOKEN not set"
    echo "Usage: GITHUB_TOKEN=your-token ./trigger-from-jira.sh TC-JDE-001 QA-123"
    exit 1
fi

echo "Triggering test execution..."
echo "Test Case: $TEST_CASE"
echo "Jira Issue: $JIRA_ISSUE"

curl -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/anantworkflows/JDE-Automation/dispatches \
  -d "{
    \"event_type\": \"jira-test-trigger\",
    \"client_payload\": {
      \"test_case\": \"$TEST_CASE\",
      \"jira_issue\": \"$JIRA_ISSUE\"
    }
  }"

echo ""
echo "✅ Trigger sent! Check GitHub Actions for progress."
