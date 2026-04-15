-- Create database if not exists
SELECT 'CREATE DATABASE kidspot'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'kidspot')\gexec

-- Connect to kidspot database
\c kidspot

-- Import schema
\i schema.sql
