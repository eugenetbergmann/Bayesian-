
import { db } from './db';
import { eq } from 'drizzle-orm';
import { transactions } from '@shared/schema';
import chalk from 'chalk';

async function debugDatabase() {
  console.log(chalk.blue('🔍 Starting database debug process...'));

  // 1. Verify database connection
  try {
    const testQuery = await db.select().from(transactions).limit(1);
    console.log(chalk.green('✓ Database connection successful'));
  } catch (error) {
    console.error(chalk.red('✗ Database connection failed:'), error);
    return;
  }

  // 2. Query Housecall transactions
  try {
    const housecallTransactions = await db
      .select()
      .from(transactions)
      .where(eq(transactions.source, 'housecall'));

    console.log(chalk.blue('\n📊 Housecall Transactions Stats:'));
    console.log(`Total count: ${housecallTransactions.length}`);

    if (housecallTransactions.length > 0) {
      console.log(chalk.green('\nLast 3 transactions:'));
      housecallTransactions.slice(-3).forEach(tx => {
        console.log(`\nID: ${tx.id}`);
        console.log(`Amount: $${tx.amount}`);
        console.log(`Date: ${tx.date}`);
        console.log(`Status: ${tx.status}`);
        console.log(`Memo: ${tx.memo}`);
        console.log(`Metadata: ${JSON.stringify(tx.metadata, null, 2)}`);
      });
    } else {
      console.log(chalk.yellow('\nNo Housecall transactions found'));
      
      // 3. Debug normalization process
      console.log(chalk.blue('\n🔍 Checking normalization process:'));
      
      // Add debug logging to storage.ts
      console.log('Adding debug logging to normalizeHousecallTransaction...');
      
      console.log(chalk.yellow('\nPossible issues to check:'));
      console.log('1. Verify HOUSECALL_API_KEY is set correctly');
      console.log('2. Check if getInvoices() is being called');
      console.log('3. Verify createHousecallTransaction is executing');
      console.log('4. Check for any errors in the server logs');
    }
  } catch (error) {
    console.error(chalk.red('Error querying transactions:'), error);
  }
}

debugDatabase().catch(console.error);
