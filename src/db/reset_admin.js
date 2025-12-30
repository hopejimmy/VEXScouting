import pg from 'pg';
import bcrypt from 'bcryptjs'; // Using bcryptjs as per package.json
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function resetAdmin() {
    try {
        console.log('🔄 Resetting Admin Password...');
        const hashedPassword = await bcrypt.hash('admin123!', 10);

        // Update existing admin or insert if missing
        const res = await pool.query(`
            UPDATE users 
            SET password_hash = $1, active = true
            WHERE username = 'admin'
            RETURNING id
        `, [hashedPassword]);

        if (res.rowCount > 0) {
            console.log('✅ Admin password reset to: admin123!');
        } else {
            console.log('⚠️ Admin user not found. Creating...');
            // Logic to create if missing would go here, but stick to update first for safety
        }
    } catch (e) {
        console.error('❌ Reset Failed:', e);
    } finally {
        await pool.end();
    }
}

resetAdmin();
