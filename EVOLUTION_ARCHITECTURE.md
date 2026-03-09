# Evolution-Based Agent Architecture

Based on SWE-CI paper insights. Shifts from snapshot-based (one-shot) to evolution-based (iterative, regression-aware).

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ORCHESTRATOR (Max)                          │
│                    Model: kimi-k2.5 (default)                       │
│  • Decides which micro-task to tackle                               │
│  • Maintains workflow state across iterations                       │
│  • Handles human interaction and escalation                         │
│  • Tracks EvoScore metrics                                          │
└─────────────────────────────────────────────────────────────────────┘
                              ↓ assigns task
┌─────────────────────────────────────────────────────────────────────┐
│                      ARCHITECT AGENT                                │
│                 Model: kimi-k2.5 (reasoning: on)                    │
│  • Analyzes current state vs goal                                   │
│  • Writes high-level requirements (max 5 per iteration)             │
│  • NEVER writes implementation details                              │
│  • Process: Summarize → Locate → Design                             │
│  • Output: Structured requirement document (YAML/JSON)              │
└─────────────────────────────────────────────────────────────────────┘
                              ↓ requirements
┌─────────────────────────────────────────────────────────────────────┐
│                     PROGRAMMER AGENT                                │
│              Model: qwen3:8b (local, fast execution)                │
│  • Implements to Architect's specification                          │
│  • Uses ui-map.json for concrete selectors                          │
│  • Writes/updates code files                                        │
│  • Process: Comprehend → Plan → Code                                │
└─────────────────────────────────────────────────────────────────────┘
                              ↓ implementation
┌─────────────────────────────────────────────────────────────────────┐
│                         CI LOOP                                     │
│  • Execute generated code (Playwright tests)                        │
│  • Capture screenshots at each step                                 │
│  • Detect regressions (verify previous steps still work)            │
│  • Report pass/fail with evidence back to Architect                 │
└─────────────────────────────────────────────────────────────────────┘
                              ↓ results
                    ┌──────────────────┐
                    │     PASS?        │
                    └────────┬─────────┘
                             │
            ┌────────────────┼────────────────┐
            │ YES            │ NO             │
            ↓                ↓                ↓
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │ Mark Done    │  │ Regression?  │  │ Max rounds?  │
    │ Update Score │  │ Roll back +  │  │ Escalate to  │
    │ Next Task    │  │ retry        │  │ human        │
    └──────────────┘  └──────────────┘  └──────────────┘
```

## Model Assignment Rationale

| Agent | Model | Reasoning | Why |
|-------|-------|-----------|-----|
| **Orchestrator (Max)** | kimi-k2.5 | Off | High-level coordination, context management, human interaction. Doesn't need deep reasoning per decision. |
| **Architect Agent** | kimi-k2.5 | **ON** | Complex analysis, requirement decomposition, system design. Needs reasoning for "what should we do?" |
| **Programmer Agent** | qwen3:8b (local) | Off | Code implementation, selector mapping, fast iteration. Local = fast + cheap. Well-defined task. |
| **CI Loop** | N/A (code) | N/A | Automated execution, screenshot capture, test verification. No LLM needed. |

## Key Principles

### 1. Separation of Concerns
- **Architect** decides WHAT (never HOW)
- **Programmer** decides HOW (never WHAT)
- **Orchestrator** manages flow (never implements)

### 2. Incremental Evolution
- Max 5 requirements per iteration
- Each iteration: Architect → Programmer → CI Loop
- Only proceed when "green" (no regressions)

### 3. Regression Detection
Before each new step:
1. Quick health check of all previous steps
2. If regression: roll back, analyze, fix
3. Only proceed when "green"

### 4. Abstraction Layer
```json
// ui-map.json - separates WHAT from HOW
{
  "workflows": {
    "order_to_cash": {
      "steps": ["login", "address_book", "create_customer", "sales_order", "create_order"]
    }
  },
  "steps": {
    "login": {
      "description": "Authenticate with JDE",
      "actions": [
        {"type": "navigate", "target": "${JDE_URL}"},
        {"type": "fill", "field": "username", "value": "${JDE_USER}"},
        {"type": "fill", "field": "password", "value": "${JDE_PASS}"},
        {"type": "click", "element": "submit_button"}
      ]
    }
  },
  "selectors": {
    "username": ["input[name='User']", "#User"],
    "password": ["input[name='Password']", "#Password"],
    "submit_button": ["input[type='submit']", "button[type='submit']"]
  }
}
```

## EvoScore Tracking

```yaml
metrics:
  evoscore:
    formula: "weighted_average(step_scores, gamma=1.5)"
    # Later steps matter more (gamma > 1)
  
  zero_regression_rate:
    definition: "% of runs where step N doesn't break step N-1"
    target: > 0.75
  
  normalized_change:
    formula: "(current_passing - baseline) / (target - baseline)"
    range: [-1, 1]
  
  iteration_count:
    definition: "Rounds needed to complete task"
    target: < 5
```

## Workflow Example (JDE Order-to-Cash)

### Iteration 1: Login
```yaml
# Architect Output
iteration: 1
requirements:
  - description: "Navigate to JDE login page"
    success_criteria: "Page loads with username/password fields visible"
  
  - description: "Authenticate with demo credentials"
    success_criteria: "Login successful, main menu accessible"

# Programmer Output
code: |
  await page.goto('https://demo.steltix.com/jde/E1Menu.maf');
  await page.locator('input[name="User"]').fill('demo');
  await page.locator('input[name="Password"]').fill('demo');
  await page.locator('input[type="submit"]').click();

# CI Loop Result
status: PASS
screenshot: login-success.png
regression_check: N/A (first step)
```

### Iteration 2: Fast Path Navigation
```yaml
# Architect Output
iteration: 2
requirements:
  - description: "Open Fast Path menu"
    success_criteria: "Menu opens, Fast Path input visible"
  
  - description: "Enter P01012 and navigate"
    success_criteria: "Address Book application loads"

# Programmer Output
code: |
  await page.locator('#drop_mainmenu').click();
  await page.waitForTimeout(1000);
  await page.locator('#TE_FAST_PATH_BOX').fill('P01012', { force: true });
  await page.locator('#TE_FAST_PATH_BOX').press('Enter');

# CI Loop Result
status: PASS
screenshot: p01012-loaded.png
regression_check: Login still works ✓
```

### Iteration 3: Create Customer (fails first, then succeeds)
```yaml
# Architect Output - Attempt 1
iteration: 3
requirements:
  - description: "Click Add button to open customer form"
  - description: "Fill customer name, address, city"
  - description: "Save customer and capture number"

# Programmer Output - Attempt 1
code: |
  await frame.locator('#hc_Add').click();  # Fails - wrong frame

# CI Loop Result - Attempt 1
status: FAIL
error: "Element not found in frame"
screenshot: error-add-button.png

# --- FEEDBACK LOOP ---

# Architect Output - Attempt 2 (revised)
iteration: 3.2
analysis: "Frame context lost after navigation. Need to refresh frame reference."
requirements:
  - description: "Refresh app frame reference after P01012 loads"
  - description: "Click Add button in correct frame context"
  - description: "Poll for form appearance with timeout"

# Programmer Output - Attempt 2 (revised)
code: |
  await helper.findAppFrame();  # Refresh frame
  await helper.clickButton('Add');
  await helper.waitForForm(['#C0_28', 'input[name*="Alpha"]']);

# CI Loop Result - Attempt 2
status: PASS
screenshot: customer-form-filled.png
customer_number: "DEMO-850079"
regression_check: Login ✓, Fast Path ✓
iterations_to_pass: 2
```

## File Structure

```
agents/
├── orchestrator/          # Max (you are here)
│   └── workflow-state.json
│
├── architect/             # Requirement generation
│   ├── agent.yaml         # Agent config (model: kimi-k2.5, thinking: on)
│   ├── prompts/
│   │   ├── system.md      # System prompt
│   │   └── summarize.md   # Step 1: Summarize test gaps
│   │   ├── locate.md      # Step 2: Locate deficiencies
│   │   └── design.md      # Step 3: Design requirements
│   └── output-schema.yaml # Structured requirement format
│
├── programmer/            # Implementation
│   ├── agent.yaml         # Agent config (model: qwen3:8b)
│   ├── prompts/
│   │   ├── system.md
│   │   ├── comprehend.md  # Step 1: Understand requirements
│   │   ├── plan.md        # Step 2: Plan implementation
│   │   └── code.md        # Step 3: Generate code
│   └── templates/         # Code generation templates
│
├── ci-loop/               # Testing & validation
│   ├── executor.ts        # Run generated code
│   ├── regression-check.ts # Verify previous steps
│   └── screenshot-diff.ts # Visual regression detection
│
├── ui-map.json            # Abstraction layer
└── metrics/
    ├── evoscore.ts        # EvoScore calculation
    └── dashboard.json     # Real-time metrics
```

## Benefits vs Current Architecture

| Aspect | Current | Evolution-Based |
|--------|---------|-----------------|
| **Task Size** | Full workflow (10 steps) | Micro-tasks (1-2 steps) |
| **On Failure** | Debug manually, start over | Iterate, learn, retry |
| **Regression** | Not detected | Checked every iteration |
| **Separation** | Coordinator does everything | Architect/Programmer split |
| **Speed** | Slow (timeouts) | Fast (local model for coding) |
| **Cost** | High (all kimi-k2.5) | Optimized (kim for arch, qwen for code) |
| **Maintainability** | Brittle (hardcoded selectors) | Robust (ui-map abstraction) |

## Next Steps to Implement

1. **Create agent configs** (`architect/agent.yaml`, `programmer/agent.yaml`)
2. **Build ui-map.json** with abstracted selectors for JDE
3. **Implement CI loop** (executor + regression checker)
4. **Create orchestrator logic** (iteration management, metrics tracking)
5. **Test with Step 1 (Login)** to validate architecture

**Ready to implement? Which component first?**
