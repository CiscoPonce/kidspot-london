import { claimService } from '../src/services/claimService.js';
import { db } from '../src/clients/db.js';

async function listPendingClaims() {
  const result = await db.query(
    `SELECT c.id, c.email, c.full_name, v.name as venue_name, c.verified_at
     FROM venue_claims c
     JOIN venues v ON c.venue_id = v.id
     WHERE c.admin_approved_at IS NULL AND c.admin_rejected_at IS NULL`
  );
  
  if (result.rows.length === 0) {
    console.log('No pending claims.');
    return;
  }

  console.log('\n--- PENDING CLAIMS ---');
  result.rows.forEach(row => {
    console.log(`ID: ${row.id} | Venue: ${row.venue_name} | Name: ${row.full_name} | Email: ${row.email} | Verified: ${row.verified_at ? 'Yes' : 'No'}`);
  });
  console.log('----------------------\n');
}

async function approveClaim(id: number) {
  try {
    await claimService.approveClaim(id);
    console.log(`Claim ${id} approved successfully.`);
  } catch (error: any) {
    console.error(`Failed to approve claim: ${error.message}`);
  }
}

const args = process.argv.slice(2);
const command = args[0];

if (command === 'list') {
  listPendingClaims().then(() => process.exit(0));
} else if (command === 'approve' && args[1]) {
  approveClaim(parseInt(args[1])).then(() => process.exit(0));
} else {
  console.log('Usage:');
  console.log('  npm run claim:admin list');
  console.log('  npm run claim:admin approve <id>');
  process.exit(0);
}
