# Evolution-Based Architecture: Implementation Guide

## Quick Reference: How It Works

```
YOU (Max/Orchestrator) → ARCHITECT (kimi-k2.5) → PROGRAMMER (qwen3:8b) → CI LOOP → RESULT
     (coordinates)          (writes WHAT)           (writes HOW)        (tests)
```

## Model Assignments

| Role | Model | Reasoning | Cost | Speed | Purpose |
|------|-------|-----------|------|-------|---------|
| **Orchestrator (You)** | kimi-k2.5 | OFF | Medium | Fast | High-level coordination, human interface |
| **Architect Agent** | kimi-k2.5 | **ON** | High | Slow | Complex analysis, requirement writing |
| **Programmer Agent** | qwen3:8b (local) | OFF | **FREE** | **Fast** | Code implementation, selector mapping |
| **CI Loop** | N/A (code) | N/A | N/A | Fast | Automated testing, regression detection |

**Why this split?**
- Architect needs reasoning for "what should we do?" (expensive but necessary)
- Programmer has well-defined task (implement spec) → local model sufficient (cheap, fast)
- CI Loop is pure code execution (no LLM cost)

## Workflow Example: Login Step

### Iteration 1 (Success Path)

**1. Orchestrator assigns task:**
```yaml
task: "Implement login step"
step_name: "login"
max_iterations: 5
```

**2. Architect analyzes (kimi-k2.5, reasoning=ON):**
```yaml
iteration: 1
analysis: "Need to authenticate with JDE demo environment"
requirements:
  - description: "Navigate to JDE login page"
    success_criteria: "Login form visible with username/password fields"
    abstract_elements: ["username_field", "password_field", "login_button"]
  
  - description: "Authenticate with demo credentials"
    success_criteria: "Login successful, main menu accessible"
    abstract_elements: ["submit_action", "main_menu_indicator"]

success_criteria:
  - "Page loads without errors"
  - "Username field is visible and fillable"
  - "Password field is visible and fillable"
  - "Submit button is clickable"
  - "After submit, main menu is accessible"
```

**3. Programmer implements (qwen3:8b, local):**
```typescript
// Looks up abstract names in ui-map.json
// username_field → ["input[name='User']", "#User", ...]
// Generates concrete code:

import { Page } from '@playwright/test';
import { uiMap } from '../ui-map';

export async function login(page: Page): Promise<void> {
  // Navigate
  await page.goto('https://demo.steltix.com/jde/E1Menu.maf', { 
    waitUntil: 'networkidle' 
  });
  
  // Fill username (with fallback selectors)
  const usernameSelectors = uiMap.resolve('username_field');
  await fillWithFallback(page, usernameSelectors, 'demo');
  
  // Fill password
  const passwordSelectors = uiMap.resolve('password_field');
  await fillWithFallback(page, passwordSelectors, 'demo');
  
  // Click login
  const loginSelectors = uiMap.resolve('login_button');
  await clickWithFallback(page, loginSelectors);
  
  // Wait for navigation
  await page.waitForTimeout(5000);
}
```

**4. CI Loop validates:**
```yaml
status: PASS
duration_ms: 5234
screenshot: ./screenshots/ci-loop/order-to-cash-login-iter1-12345.png
regression_check: N/A (first step)
```

**5. Orchestrator continues:**
- ✅ Step complete
- Move to next step: `navigate_address_book`

---

### Iteration 2 (Failure + Recovery Path)

**Context:** Implementing "create_customer" - Add button click works but form doesn't appear

**1. Architect analyzes failure:**
```yaml
iteration: 2
analysis: |
  Previous attempt: Add button clicked but form fields not found.
  Root cause: Frame context went stale after navigation to P01012.
  Need to refresh frame reference before interacting with elements.

requirements:
  - description: "Refresh application frame context after P01012 loads"
    success_criteria: "Frame reference points to RunApp.mafService"
  
  - description: "Click Add button in correct frame context"
    success_criteria: "Add button clicked successfully"
  
  - description: "Poll for form appearance with timeout"
    success_criteria: "Customer form fields visible within 10 seconds"

adjustment_note: "Added frame refresh step - this was missing in previous iteration"
```

**2. Programmer updates implementation:**
```typescript
export async function create_customer(page: Page): Promise<void> {
  // NEW: Refresh frame context
  await findAppFrame(page);
  
  // Click Add
  const addSelectors = uiMap.resolve('add_button');
  await clickWithFallback(page, addSelectors);
  
  // NEW: Poll for form with timeout
  const formSelectors = uiMap.resolve('customer_name_field');
  await pollForElement(page, formSelectors, { 
    timeout: 10000, 
    interval: 500 
  });
  
  // Fill form fields...
}
```

**3. CI Loop validates:**
```yaml
status: PASS
duration_ms: 7891
screenshot: ./screenshots/ci-loop/order-to-cash-create_customer-iter2-12346.png
regression_check:
  login: true              # ✅ Still works
  navigate_address_book: true  # ✅ Still works
iterations_to_pass: 2
```

**4. Metrics tracked:**
```yaml
evo_score: 0.85          # Good (close to 1.0)
zero_regression_rate: 1.0  # Perfect (no steps broken)
avg_iterations: 1.5      # Acceptable (< 5 target)
```

---

## Key Features

### 1. Regression Detection

Before each step, CI Loop verifies all previous steps still work:

```typescript
// Quick health checks
const checks = {
  'login': await isLoggedIn(page),
  'menu_accessible': await isMenuVisible(page),
  'previous_form_data': await verifyDataPersisted(page)
};

if (Object.values(checks).some(v => !v)) {
  return { status: 'REGRESSION', details: checks };
}
```

If regression detected:
1. Roll back to last known good state
2. Analyze what changed
3. Retry with adjusted approach

### 2. UI Map Abstraction

Separates WHAT from HOW:

```json
// ui-map.json
{
  "steps": {
    "login": {
      "description": "Authenticate with JDE",
      "actions": [
        {"type": "fill", "field": "username_field", "value": "demo"}
      ]
    }
  },
  "selectors": {
    "username_field": [
      "input[name='User']",      // Primary
      "#User",                    // Fallback 1
      "input[placeholder*='User' i]"  // Fallback 2
    ]
  }
}
```

Benefits:
- If JDE changes ID from `#User` to `#Username`, only update ui-map.json
- Architect never sees selectors (maintains abstraction)
- Programmer gets multiple fallback options

### 3. EvoScore Calculation

Later steps matter more (maintainability over time):

```javascript
// gamma = 1.5 (weights future higher)
evo_score = Σ(γ^i × step_score) / Σ(γ^i)

// Example:
// Step 1: PASS (score=1), weight=1.5^1 = 1.5
// Step 2: PASS (score=1), weight=1.5^2 = 2.25
// Step 3: FAIL (score=0), weight=1.5^3 = 3.375
// 
// EvoScore = (1.5×1 + 2.25×1 + 3.375×0) / (1.5 + 2.25 + 3.375)
//          = 3.75 / 7.125
//          = 0.53 (lower due to late failure)
```

Interpretation:
- `> 0.8`: Excellent maintainability
- `0.5 - 0.8`: Good, but some fragility
- `< 0.5`: Poor, needs refactoring

---

## Directory Structure

```
jde-enterprise-automation-lab/
├── agents/
│   ├── architect/
│   │   ├── agent.yaml          # Agent config (model: kimi-k2.5, reasoning: on)
│   │   └── prompts/            # Summarize, Locate, Design prompts
│   ├── programmer/
│   │   ├── agent.yaml          # Agent config (model: qwen3:8b)
│   │   └── prompts/            # Comprehend, Plan, Code prompts
│   ├── ci-loop/
│   │   └── executor.ts         # Test execution + regression detection
│   └── orchestrator/
│       └── evolution-orchestrator.ts  # Main coordination logic
├── ui-map.json                 # Abstraction layer (WHAT ↔ HOW)
├── generated/                  # Auto-generated code from Programmer
│   ├── login.ts
│   ├── navigate_address_book.ts
│   └── ...
└── EVOLUTION_ARCHITECTURE.md   # This documentation
```

---

## Cost Comparison

| Approach | Per Workflow Run | Notes |
|----------|------------------|-------|
| **Current (all kimi-k2.5)** | ~$5-10 | Single shot, high timeout, frequent failures |
| **Evolution-Based** | ~$1-3 | Architect (expensive) × ~3 calls + Programmer (free) × ~5 calls |
| **Savings** | **70-80%** | Fewer failures, faster iterations, local model for coding |

---

## Next Steps to Deploy

1. **Install dependencies:**
   ```bash
   npm install js-yaml
   ```

2. **Configure local model:**
   ```bash
   # Ensure qwen3:8b is available via Ollama
   ollama pull qwen3:8b
   ```

3. **Test single step:**
   ```bash
   npx ts-node agents/orchestrator/evolution-orchestrator.ts
   ```

4. **Review generated code:**
   ```bash
   ls -la generated/
   cat generated/login.ts
   ```

5. **Check metrics:**
   ```bash
   cat logs/ci-loop/order-to-cash-state.json
   ```

---

## Summary

**Evolution-based architecture gives us:**
- ✅ Separation of concerns (Architect/Programmer)
- ✅ Iterative improvement (fail → learn → retry)
- ✅ Regression detection (don't break working steps)
- ✅ Cost optimization (local model for coding)
- ✅ Better metrics (EvoScore, zero-regression rate)
- ✅ Maintainability (ui-map.json abstraction)

**Trade-offs:**
- More complex than single-shot
- Requires orchestration logic
- Slightly slower per-step (but more reliable overall)

**Bottom line:** Better reliability, lower cost, more maintainable.

**Ready to deploy?**
