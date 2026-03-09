import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';

interface TestResult {
  status: 'PASS' | 'FAIL';
  customerNumber?: string;
  salesOrderNumber?: string;
  invoiceNumber?: string;
  startTime: string;
  endTime: string;
  duration: number;
  steps: {
    step: number;
    name: string;
    status: 'PASS' | 'FAIL' | 'SKIPPED';
    timestamp: string;
    error?: string;
    screenshot?: string;
  }[];
  screenshots: string[];
  error?: string;
}

interface ReportData {
  title: string;
  executionDate: string;
  environment: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    duration: number;
  };
  results: TestResult[];
  screenshots: string[];
}

export class ReportGenerator {
  private reportData: ReportData;

  constructor() {
    this.reportData = {
      title: 'JD Edwards Order-to-Cash Automation Report',
      executionDate: new Date().toISOString(),
      environment: 'https://demo.steltix.com/jde/E1Menu.maf',
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        duration: 0
      },
      results: [],
      screenshots: []
    };
  }

  addResult(result: TestResult): void {
    this.reportData.results.push(result);
    this.reportData.summary.total++;
    
    if (result.status === 'PASS') {
      this.reportData.summary.passed++;
    } else {
      this.reportData.summary.failed++;
    }
    
    this.reportData.summary.duration += result.duration;
    this.reportData.screenshots.push(...result.screenshots);
  }

  generateHTML(): string {
    const duration = this.formatDuration(this.reportData.summary.duration);
    const passRate = this.reportData.summary.total > 0
      ? ((this.reportData.summary.passed / this.reportData.summary.total) * 100).toFixed(1)
      : '0';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.reportData.title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }
        
        .header .subtitle {
            font-size: 1.1em;
            opacity: 0.9;
        }
        
        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8f9fa;
        }
        
        .card {
            background: white;
            border-radius: 12px;
            padding: 25px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }
        
        .card:hover {
            transform: translateY(-5px);
        }
        
        .card-icon {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .card-value {
            font-size: 2.5em;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .card-label {
            color: #666;
            font-size: 0.95em;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .card.pass { border-top: 4px solid #28a745; }
        .card.fail { border-top: 4px solid #dc3545; }
        .card.total { border-top: 4px solid #007bff; }
        .card.duration { border-top: 4px solid #ffc107; }
        
        .card.pass .card-value { color: #28a745; }
        .card.fail .card-value { color: #dc3545; }
        .card.total .card-value { color: #007bff; }
        .card.duration .card-value { color: #ffc107; }
        
        .business-data {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            color: white;
            padding: 30px;
            margin: 0 30px 30px;
            border-radius: 12px;
        }
        
        .business-data h2 {
            margin-bottom: 20px;
            font-size: 1.5em;
        }
        
        .data-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
        }
        
        .data-item {
            background: rgba(255,255,255,0.2);
            padding: 20px;
            border-radius: 8px;
            backdrop-filter: blur(10px);
        }
        
        .data-label {
            font-size: 0.85em;
            opacity: 0.9;
            margin-bottom: 5px;
        }
        
        .data-value {
            font-size: 1.5em;
            font-weight: bold;
            font-family: 'Courier New', monospace;
        }
        
        .execution-details {
            padding: 30px;
        }
        
        .execution-details h2 {
            color: #333;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #eee;
        }
        
        .step-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .step-table th {
            background: #1e3c72;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
        }
        
        .step-table td {
            padding: 15px;
            border-bottom: 1px solid #eee;
        }
        
        .step-table tr:hover {
            background: #f8f9fa;
        }
        
        .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .status-badge.pass {
            background: #d4edda;
            color: #155724;
        }
        
        .status-badge.fail {
            background: #f8d7da;
            color: #721c24;
        }
        
        .error-message {
            background: #f8d7da;
            color: #721c24;
            padding: 10px;
            border-radius: 6px;
            margin-top: 10px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
        }
        
        .screenshots {
            padding: 30px;
            background: #f8f9fa;
        }
        
        .screenshots h2 {
            color: #333;
            margin-bottom: 20px;
        }
        
        .screenshot-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }
        
        .screenshot-item {
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .screenshot-item img {
            width: 100%;
            height: 200px;
            object-fit: cover;
        }
        
        .screenshot-caption {
            padding: 15px;
            font-size: 0.9em;
            color: #666;
        }
        
        .footer {
            background: #1e3c72;
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 0.9em;
        }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e9ecef;
            border-radius: 4px;
            overflow: hidden;
            margin-top: 10px;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #28a745 0%, #20c997 100%);
            transition: width 0.5s ease;
        }
        
        .environment-info {
            background: #e9ecef;
            padding: 20px;
            margin: 0 30px 30px;
            border-radius: 8px;
        }
        
        .environment-info h3 {
            margin-bottom: 10px;
            color: #495057;
        }
        
        .environment-info p {
            color: #6c757d;
            font-family: 'Courier New', monospace;
            word-break: break-all;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏢 JD Edwards Order-to-Cash Automation Report</h1>
            <p class="subtitle">EnterpriseOne Automation Suite - Playwright + TypeScript</p>
            <p class="subtitle">Generated: ${new Date(this.reportData.executionDate).toLocaleString()}</p>
        </div>
        
        <div class="summary-cards">
            <div class="card total">
                <div class="card-icon">📊</div>
                <div class="card-value">${this.reportData.summary.total}</div>
                <div class="card-label">Total Tests</div>
            </div>
            <div class="card pass">
                <div class="card-icon">✅</div>
                <div class="card-value">${this.reportData.summary.passed}</div>
                <div class="card-label">Passed</div>
            </div>
            <div class="card fail">
                <div class="card-icon">❌</div>
                <div class="card-value">${this.reportData.summary.failed}</div>
                <div class="card-label">Failed</div>
            </div>
            <div class="card duration">
                <div class="card-icon">⏱️</div>
                <div class="card-value">${duration}</div>
                <div class="card-label">Duration</div>
            </div>
        </div>
        
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${passRate}%"></div>
        </div>
        <div style="text-align: center; padding: 10px; color: #666;">
            Pass Rate: ${passRate}%
        </div>
        
        <div class="environment-info">
            <h3>🌐 Environment</h3>
            <p>${this.reportData.environment}</p>
        </div>
        
        ${this.generateBusinessDataSection()}
        
        <div class="execution-details">
            <h2>📋 Execution Details</h2>
            ${this.generateStepTables()}
        </div>
        
        ${this.generateScreenshotsSection()}
        
        <div class="footer">
            <p>JD Edwards EnterpriseOne Automation Lab | Generated by Playwright</p>
            <p>${new Date().getFullYear()} - All rights reserved</p>
        </div>
    </div>
</body>
</html>`;
  }

  private generateBusinessDataSection(): string {
    const result = this.reportData.results[0];
    if (!result) return '';

    return `
        <div class="business-data">
            <h2>💼 Business Data Generated</h2>
            <div class="data-grid">
                <div class="data-item">
                    <div class="data-label">Customer Number</div>
                    <div class="data-value">${result.customerNumber || 'N/A'}</div>
                </div>
                <div class="data-item">
                    <div class="data-label">Sales Order Number</div>
                    <div class="data-value">${result.salesOrderNumber || 'N/A'}</div>
                </div>
                <div class="data-item">
                    <div class="data-label">Invoice Number</div>
                    <div class="data-value">${result.invoiceNumber || 'N/A'}</div>
                </div>
            </div>
        </div>
    `;
  }

  private generateStepTables(): string {
    if (this.reportData.results.length === 0) {
      return '<p>No test results available.</p>';
    }

    return this.reportData.results.map((result, index) => `
        <div style="margin-bottom: 40px;">
            <h3 style="color: ${result.status === 'PASS' ? '#28a745' : '#dc3545'};">
                Test Run #${index + 1}: ${result.status === 'PASS' ? '✅ PASSED' : '❌ FAILED'}
            </h3>
            <p style="color: #666; margin-bottom: 15px;">
                Duration: ${this.formatDuration(result.duration)} | 
                Steps: ${result.steps.length}
            </p>
            
            <table class="step-table">
                <thead>
                    <tr>
                        <th>Step</th>
                        <th>Action</th>
                        <th>Status</th>
                        <th>Timestamp</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody>
                    ${result.steps.map(step => `
                        <tr>
                            <td>${step.step}</td>
                            <td>${step.name}</td>
                            <td>
                                <span class="status-badge ${step.status.toLowerCase()}">
                                    ${step.status}
                                </span>
                            </td>
                            <td>${new Date(step.timestamp).toLocaleTimeString()}</td>
                            <td>
                                ${step.error ? `<div class="error-message">${step.error}</div>` : '-'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `).join('');
  }

  private generateScreenshotsSection(): string {
    if (this.reportData.screenshots.length === 0) {
      return '';
    }

    // Filter to only existing screenshots in the screenshots folder
    const screenshotDir = path.join(__dirname, '../screenshots');
    const validScreenshots = this.reportData.screenshots.filter(screenshot => {
      const basename = path.basename(screenshot);
      return fs.existsSync(path.join(screenshotDir, basename));
    });

    if (validScreenshots.length === 0) {
      return `
        <div class="screenshots">
            <h2>📸 Screenshots</h2>
            <p style="color: #666;">Screenshots were captured but are not available in the expected location.</p>
        </div>
      `;
    }

    return `
        <div class="screenshots">
            <h2>📸 Execution Screenshots</h2>
            <div class="screenshot-grid">
                ${validScreenshots.slice(0, 20).map(screenshot => {
                  const basename = path.basename(screenshot);
                  return `
                    <div class="screenshot-item">
                        <img src="../screenshots/${basename}" 
                             alt="${basename}" 
                             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22200%22><rect fill=%22%23f0f0f0%22 width=%22300%22 height=%22200%22/><text fill=%22%23999%22 x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22>Screenshot Not Available</text></svg>'">
                        <div class="screenshot-caption">${basename}</div>
                    </div>
                  `;
                }).join('')}
            </div>
        </div>
    `;
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  saveReport(outputPath?: string): string {
    const html = this.generateHTML();
    const reportPath = outputPath || path.join(__dirname, '../reports/jde-order-to-cash-report.html');
    
    fs.writeFileSync(reportPath, html);
    logger.info(`Report saved to: ${reportPath}`);
    
    return reportPath;
  }
}

// Generate report from result file if called directly
if (require.main === module) {
  const generator = new ReportGenerator();
  
  // Try to load result file
  const resultPath = path.join(__dirname, '../logs/order-to-cash-result.json');
  if (fs.existsSync(resultPath)) {
    const result = JSON.parse(fs.readFileSync(resultPath, 'utf-8'));
    generator.addResult(result);
    const reportPath = generator.saveReport();
    console.log(`Report generated: ${reportPath}`);
  } else {
    // Generate demo report
    generator.addResult({
      status: 'PASS',
      customerNumber: 'DEMO-123456',
      salesOrderNumber: 'SO-789012',
      invoiceNumber: 'INV-345678',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      duration: 125000,
      steps: [
        { step: 1, name: 'Login to JDE', status: 'PASS', timestamp: new Date().toISOString() },
        { step: 2, name: 'Navigate to Address Book', status: 'PASS', timestamp: new Date().toISOString() },
        { step: 3, name: 'Create new customer', status: 'PASS', timestamp: new Date().toISOString() }
      ],
      screenshots: []
    });
    const reportPath = generator.saveReport();
    console.log(`Demo report generated: ${reportPath}`);
  }
}

export default ReportGenerator;
