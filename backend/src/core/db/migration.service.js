import { dbService } from './db.service.js';
import { config } from '../../core/config/env.js';

export const runMigrations = async () => {
  console.log('🚀 Checking for database migrations...');
  
  // L5: Validate schema name against explicit allowlist
  const SCHEMA = config.NODE_ENV === 'production' ? 'smartcare_prod' : 'smartcare_dev';
  const ALLOWED_SCHEMAS = ['smartcare_dev', 'smartcare_prod'];
  if (!ALLOWED_SCHEMAS.includes(SCHEMA)) {
    console.error(`❌ Invalid schema: ${SCHEMA}. Aborting migrations.`);
    return;
  }
  
  const sql = `
    -- Migration for ${SCHEMA}
    CREATE SCHEMA IF NOT EXISTS ${SCHEMA};
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

    CREATE TABLE IF NOT EXISTS recalls (
        id TEXT PRIMARY KEY,
        patient_id TEXT,
        patient_name TEXT,
        last_visit DATE,
        recall_date DATE,
        status TEXT DEFAULT 'Scheduled',
        type TEXT DEFAULT 'Follow-up',
        notes TEXT,
        source_prescription_id TEXT,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS doctors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        specialization TEXT,
        department TEXT,
        phone TEXT,
        email TEXT,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS treatment_plan_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        notes TEXT,
        phases JSONB DEFAULT '[]'::jsonb,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payments JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE treatment_plan_templates ADD COLUMN IF NOT EXISTS notes TEXT;
    ALTER TABLE treatment_plan_templates ADD COLUMN IF NOT EXISTS phases JSONB DEFAULT '[]'::jsonb;

    ALTER TABLE doctors ADD COLUMN IF NOT EXISTS specialization TEXT;
    ALTER TABLE doctors ADD COLUMN IF NOT EXISTS department TEXT;
    ALTER TABLE doctors ADD COLUMN IF NOT EXISTS phone TEXT;
    ALTER TABLE doctors ADD COLUMN IF NOT EXISTS email TEXT;
    ALTER TABLE doctors ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

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
    ALTER TABLE diagnoses ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
    ALTER TABLE reports ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
    
    -- L6: Add source_prescription_id column for reliable recall-prescription linking
    ALTER TABLE recalls ADD COLUMN IF NOT EXISTS source_prescription_id TEXT;

    -- Ensure other tables also have is_deleted if not present
    DO $$ 
    BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dental_charts' AND column_name='is_deleted' AND table_schema='${SCHEMA}') THEN
            ALTER TABLE dental_charts ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='avatar_url' AND table_schema='${SCHEMA}') THEN
            ALTER TABLE users ADD COLUMN avatar_url TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whatsapp_sessions' AND column_name='created_at' AND table_schema='${SCHEMA}') THEN
            ALTER TABLE whatsapp_sessions ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
            ALTER TABLE whatsapp_sessions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        END IF;
    END $$;

    -- X-Ray Management Module
    CREATE TABLE IF NOT EXISTS xrays (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        file_url TEXT NOT NULL,
        thumbnail_url TEXT,
        cloudinary_public_id TEXT,
        type TEXT NOT NULL DEFAULT 'IOPA',
        tooth_numbers JSONB DEFAULT '[]'::jsonb,
        notes TEXT DEFAULT '',
        diagnosis TEXT DEFAULT '',
        tags JSONB DEFAULT '[]'::jsonb,
        annotations JSONB DEFAULT '[]'::jsonb,
        reviewed BOOLEAN DEFAULT FALSE,
        reviewed_by TEXT,
        reviewed_at TIMESTAMP WITH TIME ZONE,
        uploaded_by TEXT,
        taken_date DATE DEFAULT CURRENT_DATE,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_xrays_patient_id ON xrays(patient_id);
    CREATE INDEX IF NOT EXISTS idx_xrays_created_at ON xrays(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_xrays_type ON xrays(type);
    CREATE INDEX IF NOT EXISTS idx_xrays_reviewed ON xrays(reviewed);

    CREATE INDEX IF NOT EXISTS idx_patients_name_lower ON patients (LOWER(name));
    CREATE INDEX IF NOT EXISTS idx_patients_status ON patients (status) WHERE is_deleted = FALSE;
    CREATE INDEX IF NOT EXISTS idx_patients_registered ON patients (registered_on DESC);
    CREATE INDEX IF NOT EXISTS idx_diagnoses_patient ON diagnoses (patient_id);
    CREATE INDEX IF NOT EXISTS idx_reports_patient ON reports (patient_id);
    CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions (patient_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices (patient_id);
    CREATE INDEX IF NOT EXISTS idx_xrays_patient ON xrays (patient_id);

    ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS xray_ids JSONB DEFAULT '[]'::jsonb;

    -- ══════════════════════════════════════════════════════════════════════════
    -- Admin Panel Tables (Phase: Enterprise Admin)
    -- ══════════════════════════════════════════════════════════════════════════

    -- Advanced audit logs (replaces simple activity_logs for admin features)
    CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        actor_id TEXT,
        actor_name TEXT,
        actor_role TEXT,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id TEXT,
        patient_id TEXT,
        patient_name TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        old_data JSONB,
        new_data JSONB,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- User sessions tracking
    CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_hash TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        device_info JSONB DEFAULT '{}'::jsonb,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        expired_at TIMESTAMP WITH TIME ZONE
    );

    -- Login history
    CREATE TABLE IF NOT EXISTS login_history (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        username TEXT,
        success BOOLEAN DEFAULT TRUE,
        ip_address TEXT,
        user_agent TEXT,
        device_info JSONB DEFAULT '{}'::jsonb,
        failure_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Admin notifications
    CREATE TABLE IF NOT EXISTS admin_notifications (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        severity TEXT DEFAULT 'info',
        title TEXT NOT NULL,
        message TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Backup history
    CREATE TABLE IF NOT EXISTS backup_history (
        id TEXT PRIMARY KEY,
        status TEXT DEFAULT 'pending',
        file_name TEXT,
        file_size BIGINT,
        triggered_by TEXT,
        error_message TEXT,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP WITH TIME ZONE
    );

    -- AI usage tracking
    CREATE TABLE IF NOT EXISTS ai_usage_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        user_name TEXT,
        tool TEXT NOT NULL,
        tokens_used INTEGER DEFAULT 0,
        estimated_cost NUMERIC(10,6) DEFAULT 0,
        response_time_ms INTEGER DEFAULT 0,
        success BOOLEAN DEFAULT TRUE,
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Soft-delete tracking columns on entity tables
    ALTER TABLE patients ADD COLUMN IF NOT EXISTS deleted_by TEXT;
    ALTER TABLE patients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE patients ADD COLUMN IF NOT EXISTS delete_reason TEXT;

    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS deleted_by TEXT;
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS delete_reason TEXT;

    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS deleted_by TEXT;
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS delete_reason TEXT;

    ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS deleted_by TEXT;
    ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS delete_reason TEXT;

    ALTER TABLE expenses ADD COLUMN IF NOT EXISTS deleted_by TEXT;
    ALTER TABLE expenses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE expenses ADD COLUMN IF NOT EXISTS delete_reason TEXT;

    ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_by TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS delete_reason TEXT;

    -- User status and login tracking
    ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

    -- Admin indexes
    CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active) WHERE is_active = TRUE;
    CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(user_id);
    CREATE INDEX IF NOT EXISTS idx_login_history_created ON login_history(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON admin_notifications(is_read);
    CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON admin_notifications(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_backup_history_created ON backup_history(started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON ai_usage_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_users_status ON users(status) WHERE is_deleted = FALSE;
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role) WHERE is_deleted = FALSE;
  `;

  try {
    await dbService.query(sql);
    console.log(`✅ Migrations applied successfully to ${SCHEMA}.`);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    // We don't exit(1) here to allow the server to potentially start anyway if the error is minor
  }
};
