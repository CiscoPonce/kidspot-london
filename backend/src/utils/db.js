const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://kidspot_admin:password@localhost:5432/kidspot'
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
