require("dotenv").config();
const { Pool } = require("pg");

async function testConnection() {
  const connectionString = "postgresql://postgres.cmtzmxxqoiyryeznxmxw:Spbs_11721232003@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
  
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const res = await pool.query("SELECT current_database(), current_user, version();");
    console.log("Connected to Supabase Pooler Port 6543 successfully!");
    console.log(res.rows[0]);
  } catch (err) {
    console.error("Connection error:", err);
  } finally {
    await pool.end();
  }
}

testConnection();
