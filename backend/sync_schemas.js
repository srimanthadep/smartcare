import { dbService } from './src/services/db.service.js';

async function syncSchemas() {
  try {
    console.log("Fetching tables from smartcare_dev...");
    const devTablesRes = await dbService.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'smartcare_dev'
    `);
    const devTables = devTablesRes.rows.map(r => r.table_name);

    console.log("Fetching tables from smartcare_prod...");
    const prodTablesRes = await dbService.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'smartcare_prod'
    `);
    const prodTables = prodTablesRes.rows.map(r => r.table_name);

    // 1. Find missing tables in prod
    const missingTables = devTables.filter(t => !prodTables.includes(t));
    console.log("Missing tables in prod:", missingTables);

    for (const table of missingTables) {
      console.log(`Creating table ${table} in smartcare_prod...`);
      // Get table definition from dev (roughly, for simple tables)
      // For precision, we'd need a more complex query, but let's try to clone structure
      await dbService.query(`CREATE TABLE smartcare_prod."${table}" (LIKE smartcare_dev."${table}" INCLUDING ALL)`);
      console.log(`Table ${table} created.`);
    }

    // 2. Find missing columns in existing prod tables
    const existingTables = devTables.filter(t => prodTables.includes(t));
    for (const table of existingTables) {
      const devColsRes = await dbService.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'smartcare_dev' AND table_name = $1
      `, [table]);
      
      const prodColsRes = await dbService.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'smartcare_prod' AND table_name = $1
      `, [table]);

      const devCols = devColsRes.rows;
      const prodColNames = prodColsRes.rows.map(r => r.column_name);

      const missingCols = devCols.filter(c => !prodColNames.includes(c.column_name));
      
      if (missingCols.length > 0) {
        console.log(`Found missing columns in ${table}:`, missingCols.map(c => c.column_name));
        for (const col of missingCols) {
          console.log(`Adding column ${col.column_name} to smartcare_prod."${table}"...`);
          let alterQuery = `ALTER TABLE smartcare_prod."${table}" ADD COLUMN "${col.column_name}" ${col.data_type}`;
          if (col.is_nullable === 'NO') alterQuery += ' NOT NULL';
          if (col.column_default) alterQuery += ` DEFAULT ${col.column_default}`;
          
          await dbService.query(alterQuery);
          console.log(`Column ${col.column_name} added.`);
        }
      }
    }

    console.log("Schema synchronization complete.");
    process.exit(0);
  } catch (e) {
    console.error("Sync failed:", e);
    process.exit(1);
  }
}

syncSchemas();
