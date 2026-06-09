import mysql from "mysql2/promise";

async function main() {
  const connection = await mysql.createConnection({
    host: "34.21.223.1",
    user: "hibi_admin",
    password: "Hibi_Dev_2024!",
  });

  console.log("Connected to Google Cloud SQL successfully!");
  
  await connection.query("CREATE DATABASE IF NOT EXISTS hibimatcha_db;");
  console.log("Database 'hibimatcha_db' created or already exists.");

  await connection.end();
}

main().catch(console.error);
