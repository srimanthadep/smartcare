import { dbService } from './db.service.js';
import { config } from '../config/env.js';

export const runMigrations = async () => {
  console.log('🚀 Checking for database migrations...');
  
  const SCHEMA = config.NODE_ENV === 'production' ? 'smartcare_prod' : 'smartcare_dev';
  
  const sql = `
    -- Migration for ${SCHEMA}
    SET search_path TO ${SCHEMA};
    
    CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        amount NUMERIC NOT NULL DEFAULT 0,
        category TEXT,
        date DATE DEFAULT CURRENT_DATE,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE patients ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
    ALTER TABLE patients ADD COLUMN IF NOT EXISTS chief_complaint TEXT;
    ALTER TABLE patients ADD COLUMN IF NOT EXISTS dental_history JSONB;
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
    ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
    ALTER TABLE prescription_templates ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
    ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
    ALTER TABLE treatment_plan_templates ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
    ALTER TABLE clinical_procedures ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
    
    -- Ensure other tables also have is_deleted if not present
    DO $$ 
    BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dental_charts' AND column_name='is_deleted' AND table_schema='${SCHEMA}') THEN
            ALTER TABLE dental_charts ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='avatar_url' AND table_schema='${SCHEMA}') THEN
            ALTER TABLE users ADD COLUMN avatar_url TEXT;
        END IF;
    END $$;
  `;

  try {
    await dbService.query(sql);
    console.log(`✅ Migrations applied successfully to ${SCHEMA}.`);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    // We don't exit(1) here to allow the server to potentially start anyway if the error is minor
  }
};
