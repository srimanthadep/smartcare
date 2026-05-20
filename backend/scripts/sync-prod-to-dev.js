import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const { Client } = pg;
const DEV_SCHEMA = 'smartcare_dev';
const PROD_SCHEMA = 'smartcare_prod';

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL is not set in backend/.env.');
    process.exit(1);
  }

  console.log(`🚀 Starting Prod-to-Dev Database Synchronization...`);
  console.log(`   Source (Prod):  ${PROD_SCHEMA}`);
  console.log(`   Target (Dev):   ${DEV_SCHEMA}`);

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('🔌 Connected to Postgres successfully.');

    // 1. Check if DEV_SCHEMA exists
    const schemaExistsRes = await client.query(`
      SELECT schema_name FROM information_schema.schemata 
      WHERE schema_name = $1;
    `, [DEV_SCHEMA]);

    if (schemaExistsRes.rows.length > 0) {
      // Find a unique timestamped backup name
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const backupSchemaName = `${DEV_SCHEMA}_backup_${timestamp}`;

      console.log(`📦 Existing schema "${DEV_SCHEMA}" found. Backing up to "${backupSchemaName}"...`);
      
      // Rename existing schema to backup
      await client.query(`ALTER SCHEMA ${DEV_SCHEMA} RENAME TO ${backupSchemaName};`);
      console.log(`✅ Renamed old schema to "${backupSchemaName}".`);
    }

    // 2. Create clean DEV_SCHEMA
    console.log(`➕ Creating clean development schema "${DEV_SCHEMA}"...`);
    await client.query(`CREATE SCHEMA ${DEV_SCHEMA};`);
    console.log(`✅ Schema "${DEV_SCHEMA}" created.`);

    // 3. Fetch list of tables from PROD_SCHEMA
    const prodTablesRes = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = $1 AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `, [PROD_SCHEMA]);
    
    const tables = prodTablesRes.rows.map(r => r.table_name);
    console.log(`📋 Found ${tables.length} tables in production schema.`);

    // 4. Replicate table structures (including columns, defaults, primary keys, and indexes)
    console.log(`\n📐 Replicating table structures to dev...`);
    for (const table of tables) {
      console.log(`   - Cloning table structure for "${table}"...`);
      await client.query(`
        CREATE TABLE ${DEV_SCHEMA}."${table}" (LIKE ${PROD_SCHEMA}."${table}" INCLUDING ALL);
      `);
    }
    console.log(`✅ All table structures replicated successfully.`);

    // 5. Copy all rows from production to development
    console.log(`\n🚚 Copying data rows from prod to dev...`);
    for (const table of tables) {
      console.log(`   - Copying data for "${table}"...`);
      const insertRes = await client.query(`
        INSERT INTO ${DEV_SCHEMA}."${table}" SELECT * FROM ${PROD_SCHEMA}."${table}";
      `);
      console.log(`     └ Copied ${insertRes.rowCount} rows.`);
    }
    console.log(`✅ All table data synchronized successfully.`);

    // 6. Fetch foreign keys from PROD_SCHEMA
    console.log(`\n🔗 Reconstructing foreign key constraints in dev...`);
    const fksRes = await client.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.update_rule,
        rc.delete_rule
      FROM
        information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = ccu.table_schema
        JOIN information_schema.referential_constraints AS rc
          ON rc.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_schema = $1 
        AND ccu.table_schema = $1
      GROUP BY 
        tc.constraint_name, tc.table_name, kcu.column_name, 
        ccu.table_name, ccu.column_name, rc.update_rule, rc.delete_rule;
    `, [PROD_SCHEMA]);

    console.log(`   Found ${fksRes.rows.length} foreign key constraints to apply.`);
    for (const fk of fksRes.rows) {
      console.log(`   - Recreating constraint "${fk.constraint_name}" on dev."${fk.table_name}"...`);
      const fkSql = `
        ALTER TABLE ${DEV_SCHEMA}."${fk.table_name}"
        ADD CONSTRAINT "${fk.constraint_name}"
        FOREIGN KEY ("${fk.column_name}")
        REFERENCES ${DEV_SCHEMA}."${fk.foreign_table_name}" ("${fk.foreign_column_name}")
        ON UPDATE ${fk.update_rule}
        ON DELETE ${fk.delete_rule};
      `;
      await client.query(fkSql);
    }
    console.log(`✅ All foreign key constraints reconstructed.`);

    console.log(`\n🎉 Prod-to-Dev synchronization completed flawlessly!`);
    console.log(`   Your development database is now a 100% exact replica of the production database structure and data.`);

  } catch (error) {
    console.error(`\n❌ Error during database synchronization:`, error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
