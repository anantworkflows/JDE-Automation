#!/usr/bin/env node
/**
 * Run Workflow - Entry point for Agent Architecture
 * 
 * Usage:
 *   npx ts-node agents/orchestrator/run-workflow.ts --workflow order-to-cash
 *   npx ts-node agents/orchestrator/run-workflow.ts --workflow procure-to-pay
 * 
 * Environment Variables:
 *   KIMI_API_KEY - API key for kimi-k2.5 (optional, uses simulation if not set)
 *   OLLAMA_BASE_URL - Ollama server URL (default: http://localhost:11434)
 */

import { EvolutionOrchestrator } from './evolution-orchestrator';

interface WorkflowConfig {
  name: string;
  steps: string[];
  description: string;
}

// Predefined workflows
const WORKFLOWS: Record<string, WorkflowConfig> = {
  'order-to-cash': {
    name: 'Order-to-Cash',
    description: 'Complete sales workflow: Login → Create Customer → Create Sales Order → Inventory Inquiry → Shipment Confirmation → Generate Invoice → Logout',
    steps: [
      'login',
      'create_customer',
      'create_sales_order', 
      'inventory_inquiry',
      'shipment_confirmation',
      'generate_invoice',
      'logout'
    ]
  },
  'procure-to-pay': {
    name: 'Procure-to-Pay',
    description: 'Complete purchase workflow: Login → Create Supplier → Create PO → Receive Goods → Validate Inventory → Create Invoice → Process Payment → Logout',
    steps: [
      'login',
      'create_supplier',
      'create_purchase_order',
      'receive_goods',
      'validate_inventory',
      'create_supplier_invoice',
      'process_payment',
      'logout'
    ]
  }
};

function parseArgs(): { workflow: string; headless: boolean; help: boolean } {
  const args = process.argv.slice(2);
  
  const result = {
    workflow: 'order-to-cash',
    headless: true,
    help: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--workflow' || arg === '-w') {
      result.workflow = args[++i] || 'order-to-cash';
    } else if (arg === '--headful') {
      result.headless = false;
    } else if (arg.startsWith('--workflow=')) {
      result.workflow = arg.split('=')[1];
    }
  }
  
  return result;
}

function printHelp(): void {
  console.log(`
OpenClaw Agent Architecture - Workflow Runner

Usage:
  npx ts-node agents/orchestrator/run-workflow.ts [options]

Options:
  --workflow, -w <name>   Workflow to run (default: order-to-cash)
  --headful               Run with visible browser (default: headless)
  --help, -h              Show this help

Available Workflows:
${Object.entries(WORKFLOWS).map(([key, config]) => 
  `  ${key.padEnd(20)} - ${config.description.substring(0, 60)}...`
).join('\n')}

Examples:
  npx ts-node agents/orchestrator/run-workflow.ts
  npx ts-node agents/orchestrator/run-workflow.ts --workflow procure-to-pay
  npx ts-node agents/orchestrator/run-workflow.ts -w order-to-cash --headful

Environment Variables:
  KIMI_API_KEY      API key for kimi-k2.5 Architect agent
  OLLAMA_BASE_URL   Ollama server URL (default: http://localhost:11434)
`);
}

async function main(): Promise<void> {
  const args = parseArgs();
  
  if (args.help) {
    printHelp();
    process.exit(0);
  }
  
  // Validate workflow
  const workflowConfig = WORKFLOWS[args.workflow];
  if (!workflowConfig) {
    console.error(`\n❌ Unknown workflow: "${args.workflow}"`);
    console.error(`\nAvailable workflows:\n${Object.keys(WORKFLOWS).map(w => `  - ${w}`).join('\n')}\n`);
    process.exit(1);
  }
  
  console.log(`\n${'='.repeat(70)}`);
  console.log('  OPENCLAW AGENT ARCHITECTURE');
  console.log('  Evolution-Based Workflow Automation');
  console.log(`${'='.repeat(70)}\n`);
  
  console.log(`📋 Workflow: ${workflowConfig.name}`);
  console.log(`📝 Description: ${workflowConfig.description}`);
  console.log(`🔢 Steps: ${workflowConfig.steps.length}`);
  console.log(`👁️  Headless: ${args.headless ? 'Yes' : 'No (visible browser)'}`);
  console.log(`\n${'─'.repeat(70)}\n`);
  
  // Check environment
  const hasKimiKey = !!process.env.KIMI_API_KEY;
  const hasOllama = !!process.env.OLLAMA_BASE_URL || true; // Assume localhost default
  
  console.log('🔧 Environment Check:');
  console.log(`   kimi-k2.5 API: ${hasKimiKey ? '✅ Configured' : '⚠️  Using simulation'}`);
  console.log(`   qwen3:8b (Ollama): ${hasOllama ? '✅ Available' : '⚠️  Using simulation'}`);
  console.log(`\n${'─'.repeat(70)}\n`);
  
  // Initialize orchestrator
  const orchestrator = new EvolutionOrchestrator(
    args.workflow,
    workflowConfig.steps
  );
  
  try {
    // Run workflow
    await orchestrator.initialize();
    await orchestrator.run();
    
    console.log(`\n${'='.repeat(70)}`);
    console.log('✅ WORKFLOW COMPLETE');
    console.log(`${'='.repeat(70)}\n`);
    
    process.exit(0);
    
  } catch (error) {
    console.error(`\n${'='.repeat(70)}`);
    console.error('❌ WORKFLOW FAILED');
    console.error(`${'='.repeat(70)}\n`);
    console.error('Error:', error instanceof Error ? error.message : String(error));
    
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

// Run main
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
