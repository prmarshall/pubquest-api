import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: parseInt(process.env.DB_PORT || "5432"),
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

// Helper to test connection
export const testDbConnection = async () => {
  try {
    const client = await pool.connect();
    // Check PostGIS version to ensure extensions are loaded
    const res = await client.query("SELECT PostGIS_Full_Version()");
    console.log("✅ Connected to PostGIS:", res.rows[0].postgis_full_version);
    client.release();
  } catch (err) {
    console.error("❌ Database connection failed:", err);
  }
};

export default pool;
