import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

const DEV_SCHEMA = 'smartcare_dev';
const PROD_SCHEMA = 'smartcare_prod';

async function run() {
  const applyChanges = process.argv.includes('--apply');
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL is not set in environment.');
    process.exit(1);
  }

  console.log(`🔍 Schema Synchronization Utility`);
  console.log(`   Source (Dev):  ${DEV_SCHEMA}`);
  console.log(`   Target (Prod): ${PROD_SCHEMA}`);
  console.log(`   Mode:          ${applyChanges ? '🚀 LIVE APPLY' : '📝 DRY RUN (use --apply to execute)'}\n`);

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('🔌 Connected to database successfully.');

    // 1. Fetch tables
    const devTables = (await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = $1 AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `, [DEV_SCHEMA])).rows.map(r => r.table_name);

    const prodTables = (await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = $1 AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `, [PROD_SCHEMA])).rows.map(r => r.table_name);

    // 2. Fetch all columns info
    const devCols = (await client.query(`
      SELECT table_name, column_name, data_type, is_nullable, column_default, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = $1
      ORDER BY table_name, ordinal_position;
    `, [DEV_SCHEMA])).rows;

    const prodCols = (await client.query(`
      SELECT table_name, column_name, data_type, is_nullable, column_default, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = $1
      ORDER BY table_name, ordinal_position;
    `, [PROD_SCHEMA])).rows;

    const devColMap = {};
    devCols.forEach(c => {
      if (!devColMap[c.table_name]) devColMap[c.table_name] = [];
      devColMap[c.table_name].push(c);
    });

    const prodColMap = {};
    prodCols.forEach(c => {
      if (!prodColMap[c.table_name]) prodColMap[c.table_name] = [];
      prodColMap[c.table_name].push(c.column_name);
    });

    // 3. Fetch primary keys info
    const pkeys = (await client.query(`
      SELECT kcu.table_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = $1;
    `, [DEV_SCHEMA])).rows;

    const devPkeyMap = {};
    pkeys.forEach(pk => {
      if (!devPkeyMap[pk.table_name]) devPkeyMap[pk.table_name] = [];
      devPkeyMap[pk.table_name].push(pk.column_name);
    });

    // 4. Fetch index definitions
    const devIndexes = (await client.query(`
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = $1
      ORDER BY tablename, indexname;
    `, [DEV_SCHEMA])).rows;

    const prodIndexes = (await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = $1;
    `, [PROD_SCHEMA])).rows;

    const prodIdxMap = {};
    prodIndexes.forEach(idx => {
      prodIdxMap[idx.indexname] = idx.indexdef;
    });

    const ddlStatements = [];

    // --- A. Identify Missing Tables ---
    const missingTables = devTables.filter(t => !prodTables.includes(t));
    if (missingTables.length > 0) {
      console.log(`📋 Found ${missingTables.length} missing tables in ${PROD_SCHEMA}:`, missingTables);
      
      for (const table of missingTables) {
        const columns = devColMap[table] || [];
        const pkeysList = devPkeyMap[table] || [];
        
        const colDefinitions = columns.map(c => {
          let def = `"${c.column_name}" ${c.data_type}`;
          if (c.character_maximum_length) {
            def += `(${c.character_maximum_length})`;
          }
          if (c.is_nullable === 'NO') {
            def += ' NOT NULL';
          }
          if (c.column_default !== null) {
            def += ` DEFAULT ${c.column_default}`;
          }
          return def;
        });

        if (pkeysList.length > 0) {
          colDefinitions.push(`PRIMARY KEY (${pkeysList.map(pk => `"${pk}"`).join(', ')})`);
        }

        const createTableSql = `CREATE TABLE ${PROD_SCHEMA}."${table}" (\n  ${colDefinitions.join(',\n  ')}\n);`;
        ddlStatements.push({
          type: 'CREATE TABLE',
          description: `Create table ${PROD_SCHEMA}.${table}`,
          sql: createTableSql
        });
      }
    } else {
      console.log('✅ No missing tables detected.');
    }

    // --- B. Identify Missing Columns on Existing Tables ---
    let missingColumnsCount = 0;
    for (const table of devTables) {
      if (!prodTables.includes(table)) continue; // Handled in create table

      const devColumns = devColMap[table] || [];
      const prodColNames = prodColMap[table] || [];

      for (const c of devColumns) {
        if (!prodColNames.includes(c.column_name)) {
          missingColumnsCount++;
          let alterSql = `ALTER TABLE ${PROD_SCHEMA}."${table}" ADD COLUMN "${c.column_name}" ${c.data_type}`;
          if (c.character_maximum_length) {
            alterSql += `(${c.character_maximum_length})`;
          }
          if (c.is_nullable === 'NO') {
            alterSql += ' NOT NULL';
          }
          if (c.column_default !== null) {
            alterSql += ` DEFAULT ${c.column_default}`;
          }
          
          ddlStatements.push({
            type: 'ADD COLUMN',
            description: `Add column ${c.column_name} to ${PROD_SCHEMA}.${table}`,
            sql: alterSql
          });
        }
      }
    }

    if (missingColumnsCount > 0) {
      console.log(`📋 Found ${missingColumnsCount} missing columns across existing tables.`);
    } else {
      console.log('✅ No missing columns detected on existing tables.');
    }

    // --- C. Identify Missing Indexes ---
    let missingIndexesCount = 0;
    for (const idx of devIndexes) {
      // If table is missing, skip as index is created with table or afterwards
      if (missingTables.includes(idx.tablename)) continue;

      const prodIdxDef = prodIdxMap[idx.indexname];
      if (!prodIdxDef) {
        missingIndexesCount++;
        // Replace dev schema with prod schema in index definition
        const indexSql = idx.indexdef
          .replace(new RegExp(`INDEX ${idx.indexname} ON ${DEV_SCHEMA}\\.`, 'g'), `INDEX ${idx.indexname} ON ${PROD_SCHEMA}.`)
          .replace(new RegExp(`ON ${DEV_SCHEMA}\\.`, 'g'), `ON ${PROD_SCHEMA}.`)
          .replace(new RegExp(`\\b${DEV_SCHEMA}\\.`, 'g'), `${PROD_SCHEMA}.`);

        ddlStatements.push({
          type: 'CREATE INDEX',
          description: `Create index ${idx.indexname} on ${PROD_SCHEMA}.${idx.tablename}`,
          sql: indexSql
        });
      }
    }

    if (missingIndexesCount > 0) {
      console.log(`📋 Found ${missingIndexesCount} missing indexes.`);
    } else {
      console.log('✅ No missing indexes detected.');
    }

    // --- D. Execute / Report ---
    if (ddlStatements.length === 0) {
      console.log('\n🎉 Production schema is 100% structurally identical and synchronized with development schema!');
      process.exit(0);
    }

    console.log(`\n📋 Proposed Changes (${ddlStatements.length} statements):`);
    ddlStatements.forEach((stmt, i) => {
      console.log(`\n[${i + 1}] ${stmt.description}`);
      console.log(`   SQL: ${stmt.sql.replace(/\n/g, '\n   ')}`);
    });

    if (applyChanges) {
      console.log('\n🚀 Starting execution of SQL DDL statements...');
      for (const stmt of ddlStatements) {
        console.log(`⏳ Executing: ${stmt.description}...`);
        await client.query(stmt.sql);
        console.log(`✅ Success.`);
      }
      console.log('\n🎉 All changes successfully applied to production schema.');
    } else {
      console.log('\n💡 Dry Run completed. Run with `--apply` to synchronize the production schema.');
    }

  } catch (err) {
    console.error('\n❌ An error occurred during schema sync:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
