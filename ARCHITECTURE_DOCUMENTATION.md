# OpenClaw Agent Architecture
## Evolution-Based Automation Framework

**Version:** 1.0  
**Date:** March 8, 2026  
**Author:** Max (AI Assistant)  

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Components](#architecture-components)
3. [Workflow Execution Flow](#workflow-execution-flow)
4. [Agent Roles & Responsibilities](#agent-roles--responsibilities)
5. [Data Flow](#data-flow)
6. [Error Handling & Recovery](#error-handling--recovery)
7. [Metrics & Observability](#metrics--observability)
8. [Configuration](#configuration)
9. [Usage Examples](#usage-examples)
10. [Best Practices](#best-practices)

---

## Overview

### What Is This?

The OpenClaw Agent Architecture is an **evolution-based automation framework** that uses multiple specialized AI agents to design, implement, and validate software automation workflows.

### Key Innovation: Separation of Concerns

Unlike traditional automation where a single agent does everything, this architecture separates:

| Traditional | Our Approach |
|-------------|--------------|
| One agent plans + codes + tests | **Architect** decides WHAT |
| | **Programmer** decides HOW |
| | **CI Loop** validates |
| | **Orchestrator** coordinates |

### Evolution-Based Iteration

The system doesn't give up on first failure. It:
1. **Attempts** a step
2. **Analyzes** failure if it occurs
3. **Adapts** requirements
4. **Retries** with new approach
5. **Escalates** to human if max iterations reached

---

## Architecture Components

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         HUMAN USER                                      │
│                  (Defines goal, reviews results)                        │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    LAYER 1: ORCHESTRATOR                                │
│                                                                         │
│  Responsibilities:                                                      │
│  • Receive workflow goal from human                                     │
│  • Initialize workflow state                                            │
│  • Coordinate agent execution                                           │
│  • Manage iteration lifecycle                                           │
│  • Track metrics (EvoScore, etc.)                                       │
│  • Handle human escalation                                              │
│                                                                         │
│  Model: kimi-k2.5 (reasoning: OFF)                                     │
│  Why: Fast coordination, context management                            │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                           │
                    ▼                           ▼
┌──────────────────────────┐      ┌──────────────────────────┐
│     FOR EACH STEP        │      │   ON MAX ITERATIONS      │
│                          │      │                          │
│  Call Architect          │      │  Escalate to Human       │
│  ↓                       │      │                          │
│  Call Programmer         │      │                          │
│  ↓                       │      │                          │
│  Call CI Loop            │      │                          │
│  ↓                       │      │                          │
│  Evaluate Result         │      │                          │
└──────────┬───────────────┘      └──────────────────────────┘
           │
           ▼ (PASS/FAIL)
┌─────────────────────────────────────────────────────────────────────────┐
│  PASS? ──YES──▶ Next Step                                               │
│    │                                                                    │
│    │ NO                                                                 │
│    └──▶ Increment Iteration                                             │
│         └──▶ Feedback to Architect (loop back)                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Detailed Component Breakdown

#### 1. Orchestrator (`agents/orchestrator/evolution-orchestrator.ts`)

**Purpose:** The conductor of the orchestra. Manages workflow execution.

**Key Methods:**
```typescript
class EvolutionOrchestrator {
  async initialize(): Promise<void>           // Setup browser, state
  async runWorkflow(): Promise<void>         // Main execution loop
  private evolveStep(): Promise<boolean>     // Single step iteration
  private updateEvoScore(): void             // Calculate maintainability
}
```

**State Management:**
```typescript
interface WorkflowState {
  currentStep: number;           // Which step we're on
  stepResults: StepResult[];    // History of all attempts
  capturedValues: Record<string, string>;  // Business data
  evoScore: number;             // Maintainability metric
  regressionCount: number;      // How many times we broke things
  iterationsPerStep: Record<string, number>;  // Retry counts
}
```

**Why kimi-k2.5 without reasoning?**
- Coordination is procedural, not analytical
- Needs speed for real-time workflow management
- Reasoning is expensive and unnecessary here

---

#### 2. Architect Agent (`agents/architect/agent.yaml` + `agents/llm-client.ts`)

**Purpose:** Decides WHAT needs to be done. Never writes implementation.

**Input:**
- Current workflow state
- Previous failure (if retrying)
- Target goal

**Output (YAML):**
```yaml
iteration: 2
analysis: "Previous attempt failed because frame context went stale after navigation"
requirements:
  - description: "Refresh application frame reference before interacting"
    success_criteria: "Frame locator points to correct RunApp.mafService URL"
    abstract_elements: ["app_frame", "frame_refresh_button"]
  
  - description: "Click Add button in correct frame context"
    success_criteria: "Add button clicked, form fields visible"
    abstract_elements: ["add_button", "form_container"]

success_criteria:
  - "Frame refreshed successfully"
  - "Form appears within 10 seconds"
  - "All required fields accessible"

estimated_complexity: MEDIUM
```

**Key Constraints:**
- Max 5 requirements per iteration
- Use abstract element names only (e.g., "username_field", not "#User")
- Never specify implementation details
- If previous failed, analyze and adjust

**Model: kimi-k2.5 with reasoning=ON**

**Why reasoning?**
- Complex analysis requires deep thinking
- Understanding failure root causes
- Designing robust requirements
- System-level thinking

**Prompt Flow:**
```
System Prompt (from agent.yaml)
  ↓
User Prompt (built dynamically)
  - Current workflow state
  - Previous failure details
  - Target goal
  ↓
kimi-k2.5 (reasoning=ON)
  ↓
YAML Output
  ↓
Parsed to ArchitectOutput interface
```

---

#### 3. Programmer Agent (`agents/programmer/agent.yaml` + `agents/llm-client.ts`)

**Purpose:** Decides HOW to implement. Translates requirements to code.

**Input:**
- Architect's requirements (YAML)
- ui-map.json (abstract → concrete mappings)

**Output (TypeScript):**
```typescript
export async function createSupplier(page: Page): Promise<boolean> {
  try {
    console.log('Creating supplier...');
    
    // Resolve abstract name to concrete selectors
    const menuSelectors = uiMap.resolve('menu_button');
    const menuBtn = await findElementWithFallback(page, menuSelectors);
    await menuBtn.click();
    
    const fastPathSelectors = uiMap.resolve('fast_path_input');
    const fastPath = await findElementWithFallback(page, fastPathSelectors);
    await fastPath.fill('P01012');
    await fastPath.press('Enter');
    
    // ... implementation continues
    
    return true;
  } catch (error) {
    console.error('Create supplier failed:', error);
    return false;
  }
}
```

**Key Responsibilities:**
- Implement exactly what Architect specified
- Use ui-map.json for selector resolution
- Add multiple fallback selectors
- Include error handling
- Keep code concise (<100 lines per step)

**Model: qwen3:8b (local)**

**Why local model?**
- Well-defined task (implement spec)
- Fast iteration (local = no network latency)
- Cost-effective (free, runs on your machine)
- Sufficient for code generation

**Why NOT reasoning?**
- Implementation is mechanical, not analytical
- Spec is already designed by Architect
- Speed matters for iteration cycles

---

#### 4. CI Loop (`agents/ci-loop/executor.ts`)

**Purpose:** Validates implementation. No LLM, pure code execution.

**Responsibilities:**
1. **Execute:** Run generated code in Playwright
2. **Capture:** Take screenshots at key points
3. **Validate:** Check success criteria
4. **Detect Regressions:** Verify previous steps still work
5. **Report:** PASS / FAIL / REGRESSION

**Execution Flow:**
```typescript
class CILoop {
  async executeStep(stepName, implementation, iteration): Promise<CIResult> {
    // 1. Execute the code
    const success = await implementation(this.page);
    
    // 2. Capture screenshot
    await this.page.screenshot({ path: screenshotPath });
    
    // 3. Regression check (verify previous steps)
    const previousStepsOK = await this.runRegressionChecks();
    
    // 4. Determine status
    if (success && previousStepsOK) return { status: 'PASS' };
    if (!previousStepsOK) return { status: 'REGRESSION' };
    return { status: 'FAIL', error: ... };
  }
}
```

**Regression Detection:**
```typescript
private async runRegressionChecks(): Promise<boolean> {
  // Quick health checks
  const checks = {
    'login': await this.isLoggedIn(),
    'menu_accessible': await this.isMenuVisible(),
    'previous_data': await this.verifyDataPersisted()
  };
  
  // If any check fails, we have a regression
  return !Object.values(checks).some(v => !v);
}
```

**Why no LLM?**
- Validation is deterministic
- Pass/fail is binary
- Screenshots provide evidence
- Metrics are calculated, not interpreted

---

#### 5. LLM Client (`agents/llm-client.ts`)

**Purpose:** Unified interface to different LLM providers.

**Supported Models:**

| Model | Provider | Use Case | Config |
|-------|----------|----------|--------|
| kimi-k2.5 | Moonshot AI | Architect (reasoning=ON) | API key required |
| qwen3:8b | Ollama (local) | Programmer (fast, cheap) | Local server |

**Interface:**
```typescript
class LLMClient {
  async callArchitect(stepName, workflowState, previousResult): Promise<ArchitectOutput>
  async callProgrammer(architectOutput, uiMap): Promise<ProgrammerOutput>
}
```

**Error Handling:**
- If LLM call fails, return fallback output
- Log errors for debugging
- Continue with safe defaults

---

#### 6. UI Map (`ui-map.json`)

**Purpose:** Abstraction layer between requirements and implementation.

**Why?**
- Architect writes "username_field"
- Programmer looks up what that means
- If JDE changes IDs, only update ui-map.json
- No code changes needed

**Structure:**
```json
{
  "workflows": {
    "order_to_cash": {
      "steps": ["login", "create_customer", "create_sales_order", ...]
    }
  },
  "steps": {
    "login": {
      "description": "Authenticate with JDE",
      "actions": [
        { "type": "fill", "field": "username_field", "value": "demo" },
        { "type": "fill", "field": "password_field", "value": "demo" },
        { "type": "click", "element": "login_button" }
      ]
    }
  },
  "selectors": {
    "username_field": [
      "input[name='User']",
      "#User",
      "input[placeholder*='User' i]"
    ],
    "password_field": [
      "input[name='Password']",
      "#Password",
      "input[type='password']"
    ]
  }
}
```

**Benefits:**
- Single source of truth for selectors
- Multiple fallbacks per element
- Easy maintenance when UI changes
- Abstract requirements from implementation

---

## Workflow Execution Flow

### Complete Execution Sequence

```
┌─────────────────────────────────────────────────────────────────┐
│  START: Human defines goal                                      │
│  "Create Order-to-Cash automation"                              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: ORCHESTRATOR INITIALIZATION                            │
│                                                                 │
│  • Create WorkflowState                                         │
│  • Launch browser (Playwright)                                  │
│  • Load ui-map.json                                             │
│  • Set currentStep = 0                                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: ITERATION LOOP (for each workflow step)                │
│                                                                 │
│  FOR step IN workflow.steps:                                    │
│    iteration = 1                                                │
│    maxIterations = step.maxIterations (3-5)                     │
│                                                                 │
│    WHILE iteration <= maxIterations:                            │
│                                                                 │
│      ┌─────────────────────────────────────────────────────┐    │
│      │  2A: CALL ARCHITECT AGENT                           │    │
│      │                                                     │    │
│      │  Input:                                             │    │
│      │    - step.name                                      │    │
│      │    - workflowState                                  │    │
│      │    - previousResult (if retrying)                   │    │
│      │    - iteration                                      │    │
│      │                                                     │    │
│      │  Output: ArchitectOutput (YAML)                     │    │
│      │    - analysis                                       │    │
│      │    - requirements (1-5)                             │    │
│      │    - success_criteria                               │    │
│      │    - estimated_complexity                           │    │
│      └──────────────────────────┬──────────────────────────┘    │
│                                 │                               │
│                                 ▼                               │
│      ┌─────────────────────────────────────────────────────┐    │
│      │  2B: CALL PROGRAMMER AGENT                          │    │
│      │                                                     │    │
│      │  Input:                                             │    │
│      │    - ArchitectOutput                                │    │
│      │    - ui-map.json                                    │    │
│      │                                                     │    │
│      │  Output: ProgrammerOutput (TypeScript)              │    │
│      │    - code                                           │    │
│      │    - imports                                        │    │
│      │    - helper_functions                               │    │
│      └──────────────────────────┬──────────────────────────┘    │
│                                 │                               │
│                                 ▼                               │
│      ┌─────────────────────────────────────────────────────┐    │
│      │  2C: CALL CI LOOP                                   │    │
│      │                                                     │    │
│      │  Input:                                             │    │
│      │    - step.name                                      │    │
│      │    - generated code                                 │    │
│      │    - iteration                                      │    │
│      │                                                     │    │
│      │  Actions:                                           │    │
│      │    1. Execute code in browser                       │    │
│      │    2. Capture screenshot                            │    │
│      │    3. Check previous steps (regression)             │    │
│      │    4. Evaluate success_criteria                     │    │
│      │                                                     │    │
│      │  Output: CIResult                                   │    │
│      │    - status: PASS | FAIL | REGRESSION               │    │
│      │    - durationMs                                     │    │
│      │    - screenshot                                     │    │
│      │    - error (if FAIL)                                │    │
│      └──────────────────────────┬──────────────────────────┘    │
│                                 │                               │
│                                 ▼                               │
│      ┌─────────────────────────────────────────────────────┐    │
│      │  2D: EVALUATE RESULT                                │    │
│      │                                                     │    │
│      │  IF status == PASS:                                 │    │
│      │    • Save captured values                           │    │
│      │    • Update EvoScore                                │    │
│      │    • currentStep++                                  │    │
│      │    • BREAK loop (go to next step)                   │    │
│      │                                                     │    │
│      │  IF status == FAIL:                                 │    │
│      │    • Save error details                             │    │
│      │    • iteration++                                    │    │
│      │    • Feedback = error details                       │    │
│      │    • CONTINUE loop (retry with feedback)            │    │
│      │                                                     │    │
│      │  IF status == REGRESSION:                           │    │
│      │    • Save regression details                        │    │
│      │    • Rollback to last known good state              │    │
│      │    • iteration++                                    │    │
│      │    • Feedback = regression details                  │    │
│      │    • CONTINUE loop                                  │    │
│      └─────────────────────────────────────────────────────┘    │
│                                                                 │
│    END WHILE                                                    │
│                                                                 │
│    IF maxIterations reached without PASS:                       │
│      • ESCALATE to human                                        │
│      • STOP workflow                                            │
│                                                                 │
│  END FOR                                                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: WORKFLOW COMPLETION                                    │
│                                                                 │
│  • Generate HTML report                                         │
│  • Print summary to console                                     │
│  • Save workflow-state.json                                     │
│  • Close browser                                                │
│  • Return control to human                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Agent Roles & Responsibilities

### Responsibility Matrix

| Task | Architect | Programmer | CI Loop | Orchestrator |
|------|-----------|------------|---------|--------------|
| **Analyze failures** | ✅ | ❌ | ❌ | ❌ |
| **Write requirements** | ✅ | ❌ | ❌ | ❌ |
| **Generate code** | ❌ | ✅ | ❌ | ❌ |
| **Execute code** | ❌ | ❌ | ✅ | ❌ |
| **Validate results** | ❌ | ❌ | ✅ | ❌ |
| **Track metrics** | ❌ | ❌ | ❌ | ✅ |
| **Coordinate agents** | ❌ | ❌ | ❌ | ✅ |
| **Handle escalation** | ❌ | ❌ | ❌ | ✅ |
| **Know about frames** | ❌ (abstract) | ✅ (concrete) | ✅ (runtime) | ❌ |
| **Know about selectors** | ❌ | ✅ | ✅ | ❌ |

### Communication Rules

**Architect → Programmer:**
```
Architect: "Navigate to Address Book using Fast Path"
(NOT: "Click #drop_mainmenu, type P01012...")

Programmer receives: requirements.yaml
Programmer looks up: ui-map.json
Programmer generates: implementation.ts
```

**Programmer → CI Loop:**
```
Programmer: generates TypeScript code
CI Loop receives: code
CI Loop executes: in Playwright browser
CI Loop reports: PASS/FAIL/REGRESSION
```

**CI Loop → Orchestrator:**
```
CI Loop: "Step create_customer: PASS"
Orchestrator: Updates state, moves to next step

CI Loop: "Step create_customer: FAIL - element not found"
Orchestrator: Increments iteration, feedback to Architect

CI Loop: "Step create_customer: REGRESSION - login broken"
Orchestrator: Rollback, retry with adjusted approach
```

---

## Data Flow

### Information Passing Between Agents

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Human       │────▶│ Orchestrator │────▶│   Architect  │
│  (Goal)      │     │ (Workflow    │     │ (Analysis &  │
│              │     │  State)      │     │  Design)     │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                                                  │ YAML
                                                  │ Requirements
                                                  ▼
                                          ┌──────────────┐
                                          │   ui-map.json │
                                          │  (Abstraction) │
                                          └──────┬───────┘
                                                 │
                                                 │ Selectors
                                                 ▼
                                         ┌──────────────┐
                                         │  Programmer  │
                                         │ (Code Gen)   │
                                         └──────┬───────┘
                                                │
                                                │ TypeScript
                                                │ Code
                                                ▼
                                        ┌──────────────┐
                                        │   CI Loop    │
                                        │ (Execution & │
                                        │  Validation) │
                                        └──────┬───────┘
                                               │
                                               │ Result
                                               │ (PASS/FAIL/REG)
                                               ▼
                                       ┌──────────────┐
                                       │ Orchestrator │
                                       │ (State Mgmt) │
                                       └──────┬───────┘
                                              │
                                              │ Summary
                                              ▼
                                      ┌──────────────┐
                                      │    Human     │
                                      │  (Results)   │
                                      └──────────────┘
```

### Data Structures

**WorkflowState (Maintained by Orchestrator):**
```typescript
{
  currentStep: 3,
  stepResults: [
    {
      stepName: "create_customer",
      iteration: 2,
      status: "PASS",
      durationMs: 8543,
      screenshot: "screenshots/create_customer-iter2-12345.png",
      capturedValues: { customer_number: "DEMO-850079" }
    }
  ],
  capturedValues: {
    customer_number: "DEMO-850079",
    order_number: "12345"
  },
  evoScore: 0.923,
  regressionCount: 0,
  iterationsPerStep: {
    login: 1,
    create_customer: 2,
    create_sales_order: 1
  },
  startTime: 1709900000000
}
```

**ArchitectOutput (Generated by Architect):**
```typescript
{
  iteration: 2,
  analysis: "Previous attempt failed because Add button selector was stale",
  requirements: [
    {
      description: "Refresh frame context after navigation",
      success_criteria: "Frame points to correct URL",
      abstract_elements: ["app_frame"]
    },
    {
      description: "Click Add button with fallback selectors",
      success_criteria: "Form appears within 10 seconds",
      abstract_elements: ["add_button", "form_container"]
    }
  ],
  success_criteria: [
    "Frame refreshed",
    "Form visible",
    "Fields accessible"
  ],
  estimated_complexity: "MEDIUM"
}
```

**ProgrammerOutput (Generated by Programmer):**
```typescript
{
  code: "export async function createCustomer(page: Page)...",
  imports: [
    "import { Page } from '@playwright/test';",
    "import { uiMap } from '../ui-map';"
  ],
  helper_functions: [
    "findElementWithFallback",
    "waitForForm"
  ],
  test_assertions: []
}
```

---

## Error Handling & Recovery

### Failure Types & Responses

| Failure Type | Cause | Response |
|--------------|-------|----------|
| **Selector Not Found** | UI changed, wrong frame | Architect adds frame refresh requirement, Programmer uses different selector |
| **Timeout** | Slow loading, network | Architect increases wait time, Programmer adds polling |
| **Regression** | Previous step broke | Rollback state, Architect analyzes dependency |
| **Element Not Visible** | Hidden by modal, timing | Programmer adds visibility checks |
| **Navigation Failed** | Wrong URL, auth expired | Retry login, check session |

### Recovery Strategies

**1. Retry with Same Approach:**
```
Attempt 1: FAIL (network timeout)
Attempt 2: Same code, different timing
```

**2. Retry with Adjusted Approach:**
```
Attempt 1: FAIL (stale frame)
Architect: "Add frame refresh before interaction"
Attempt 2: New code with frame refresh
```

**3. Rollback and Retry:**
```
Step 4: PASS
Step 5: REGRESSION (Step 4 broken)
Rollback to Step 4 state
Architect: "Adjust approach to not break Step 4"
Attempt 2: New approach
```

**4. Human Escalation:**
```
After 5 attempts: Still failing
Action: Pause, notify human, provide logs
Human: Debugs manually, provides fix
Resume: With human guidance
```

---

## Metrics & Observability

### EvoScore (Evolution Score)

**Purpose:** Measure maintainability over time.

**Formula:**
```
EvoScore = Σ(γ^i × step_score) / Σ(γ^i)

Where:
- γ (gamma) = 1.5 (weights future steps higher)
- step_score = 1 (PASS), 0 (FAIL), -1 (REGRESSION)
- i = step index (0-based)
```

**Interpretation:**
- **> 0.8:** Excellent maintainability
- **0.5 - 0.8:** Good, some fragility
- **< 0.5:** Poor, needs refactoring

**Example:**
```
Step 1: PASS (score=1), weight=1.5^1 = 1.5
Step 2: PASS (score=1), weight=1.5^2 = 2.25
Step 3: FAIL (score=0), weight=1.5^3 = 3.375

EvoScore = (1.5×1 + 2.25×1 + 3.375×0) / (1.5 + 2.25 + 3.375)
         = 3.75 / 7.125
         = 0.53 (concerning - late failure)
```

### Other Metrics

| Metric | Calculation | Target |
|--------|-------------|--------|
| **Zero Regression Rate** | (steps without regression) / total steps | > 75% |
| **Pass Rate** | passed steps / total steps | > 90% |
| **Avg Iterations/Step** | total iterations / total steps | < 3 |
| **Mean Time to Success** | sum of durations / passed steps | < 30s |

### Observability

**Logs:** `logs/{workflow}/workflow-state.json`
- Complete execution history
- All attempts and failures
- Captured business values

**Screenshots:** `screenshots/{workflow}/`
- Visual proof of each step
- Error screenshots on failure
- Can be reviewed by humans

**HTML Reports:** `reports/{workflow}-report-{timestamp}.html`
- Executive summary
- Step-by-step breakdown
- Metrics dashboard
- Captured values

---

## Configuration

### Environment Variables

```bash
# LLM Configuration
export KIMI_API_KEY="your-moonshot-api-key"
export KIMI_BASE_URL="https://api.moonshot.cn/v1"
export OLLAMA_BASE_URL="http://localhost:11434"

# Workflow Configuration
export MAX_ITERATIONS=5
export DEFAULT_TIMEOUT=30000
export HEADLESS=true

# Paths
export SCREENSHOTS_DIR="./screenshots"
export LOGS_DIR="./logs"
export REPORTS_DIR="./reports"
```

### Agent Configuration (`agent.yaml`)

```yaml
name: architect
model:
  name: kimi-k2.5
  reasoning: true
  temperature: 0.3
constraints:
  max_requirements_per_iteration: 5
  never_write_implementation: true
  always_use_abstract_selectors: true
```

### UI Map (`ui-map.json`)

```json
{
  "selectors": {
    "element_name": [
      "primary_selector",
      "fallback_1",
      "fallback_2"
    ]
  }
}
```

---

## Usage Examples

### Example 1: Run Complete Workflow

```typescript
import { EvolutionOrchestrator } from './agents/orchestrator/evolution-orchestrator';

const orchestrator = new EvolutionOrchestrator(
  'order-to-cash',
  [
    'login',
    'create_customer',
    'create_sales_order',
    'inventory_inquiry',
    'shipment_confirmation',
    'generate_invoice'
  ]
);

await orchestrator.initialize();
await orchestrator.runWorkflow();
```

### Example 2: Custom Step Definition

```typescript
const steps = [
  {
    name: 'my_custom_step',
    func: async (page: Page) => {
      // Custom implementation
      await page.locator('#button').click();
      return true;
    },
    maxIterations: 3
  }
];
```

### Example 3: Manual Agent Call

```typescript
import { llmClient } from './agents/llm-client';

// Get requirements from Architect
const architectOutput = await llmClient.callArchitect(
  'create_supplier',
  workflowState,
  null,  // no previous failure
  1      // iteration 1
);

// Generate code from Programmer
const programmerOutput = await llmClient.callProgrammer(
  architectOutput,
  uiMap
);

// programmerOutput.code now contains TypeScript
```

---

## Best Practices

### 1. Keep Steps Small

**Bad:**
```typescript
// One giant step
createCustomerAndOrderAndInvoice()  // Too complex
```

**Good:**
```typescript
// Separate steps
createCustomer()      // Independent
createSalesOrder()    // Can retry separately
generateInvoice()     // Clear boundaries
```

### 2. Capture Business Values

Always capture generated IDs:
```typescript
// After creating customer
const customerNumber = await page.locator('#customer_id').inputValue();
this.state.capturedValues['customer_number'] = customerNumber;

// Use in next step
await page.locator('#ship_to').fill(this.state.capturedValues['customer_number']);
```

### 3. Abstract Selectors

**Bad:**
```typescript
// Hardcoded in code
await page.locator('#C0_28').fill('name');  // Breaks if JDE changes
```

**Good:**
```typescript
// In ui-map.json
"customer_name_field": ["#C0_28", "input[name*='Alpha']", "input[aria-label*='Name']"]

// In code
const selectors = uiMap.resolve('customer_name_field');
await fillWithFallback(page, selectors, 'name');
```

### 4. Design for Retries

Architect should consider failure modes:
```yaml
requirements:
  - description: "Navigate to application"
    success_criteria: "Frame loaded within 10 seconds"
    abstract_elements: ["menu_button", "fast_path_input", "app_frame"]
  
  - description: "Refresh frame if stale"
    success_criteria: "Frame URL matches expected pattern"
    abstract_elements: ["frame_refresh_indicator"]
```

### 5. Monitor Metrics

Watch EvoScore trends:
```
Run 1: EvoScore = 0.95 (great)
Run 2: EvoScore = 0.87 (good)
Run 3: EvoScore = 0.62 (concerning - investigate)
```

---

## Summary

### Key Takeaways

1. **Separation of Concerns:** Architect (WHAT) vs Programmer (HOW) vs CI Loop (VALIDATION)

2. **Evolution-Based:** Retry with adaptation, not just repetition

3. **Model Optimization:** 
   - Expensive reasoning for Architect (complex analysis)
   - Cheap local model for Programmer (code generation)

4. **Abstraction Layer:** ui-map.json separates requirements from implementation

5. **Observability:** Screenshots, logs, metrics, HTML reports for full visibility

### When to Use This Architecture

✅ **Good fit:**
- Complex multi-step workflows
- UI that changes frequently
- Need for maintainability over time
- Iterative improvement required

❌ **Not needed:**
- Simple one-off scripts
- Stable UIs that never change
- Tight time constraints (manual coding faster)

### Next Steps

1. **Integrate real LLM APIs** (currently simulated)
2. **Build agent harness** (automated agent calling)
3. **Create workflow library** (reusable templates)
4. **Add CI/CD integration** (scheduled runs, alerts)

---

**End of Document**

*For questions or issues, refer to the codebase or contact the architecture team.*
