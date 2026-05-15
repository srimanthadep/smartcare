import { dbService } from '../services/db.service.js';
import fs from 'fs';
import path from 'path';

// Load templates from the file provided by the user
const DATA_PATH = 'c:\\Users\\srima\\Desktop\\Projects\\SmartCare\\final_prescription_templates.json';

async function seed() {
  try {
    console.log('🌱 Starting template re-seeding...');
    
    const rawData = fs.readFileSync(DATA_PATH, 'utf8');
    let templates = JSON.parse(rawData);

    // Sort templates by name alphabetically
    templates.sort((a, b) => a.name.localeCompare(b.name));

    // 1. Delete all existing templates
    console.log('🗑️ Clearing existing templates...');
    await dbService.query('DELETE FROM prescription_templates');
    console.log('✅ Existing templates cleared.');

    // 2. Insert new templates
    for (const tpl of templates) {
      const id = await dbService.generateId('TPL', 'prescription_templates');
      console.log(`Inserting template: ${tpl.name} (${id})`);
      
      // Map 'note' to 'instructions' in medicines for database compatibility
      const medicines = (tpl.medicines || []).map(m => ({
        name: m.name || "",
        dosage: m.dosage || "",
        frequency: m.frequency || m.dosage || "", // fallback frequency if dosage is used or vice versa
        duration: m.duration || "",
        instructions: m.note || ""
      }));

      // Join instructions array into a single notes string
      const notes = Array.isArray(tpl.instructions) ? tpl.instructions.join("\n") : (tpl.instructions || "");

      await dbService.query(
        'INSERT INTO prescription_templates (id, name, medicines, notes) VALUES ($1, $2, $3, $4)',
        [id, tpl.name, JSON.stringify(medicines), notes]
      );
    }

    console.log('✅ Re-seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Re-seeding failed:', error);
    process.exit(1);
  }
}

seed();
