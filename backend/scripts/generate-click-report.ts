import { db } from '../src/clients/db.js';
import { logger } from '../src/config/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function generateReport() {
  try {
    console.log('Generating Lead Generation Report...');
    
    const result = await db.query('SELECT * FROM sponsor_click_report;');
    const rows = result.rows;

    if (rows.length === 0) {
      console.log('No click data available yet.');
      process.exit(0);
    }

    // Generate CSV
    const headers = ['Venue ID', 'Venue Name', 'Sponsor Tier', 'Click Type', 'Total Clicks', 'Date'];
    const csvContent = [
      headers.join(','),
      ...rows.map(row => [
        row.venue_id,
        `"${row.name}"`,
        row.sponsor_tier || 'none',
        row.click_type,
        row.total_clicks,
        new Date(row.click_date).toISOString().split('T')[0]
      ].join(','))
    ].join('\n');

    const reportPath = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportPath)) {
      fs.mkdirSync(reportPath);
    }

    const filename = `click-report-${new Date().toISOString().split('T')[0]}.csv`;
    const filePath = path.join(reportPath, filename);
    
    fs.writeFileSync(filePath, csvContent);
    
    console.log(`Report generated: ${filePath}`);
    console.log(`Total rows: ${rows.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error generating report:', error);
    process.exit(1);
  }
}

generateReport();
