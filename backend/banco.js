const path = require("node:path");

// Lê o .env que está na mesma pasta deste arquivo.
require("dotenv").config({
    path: path.join(__dirname, ".env")
});

const mysql = require("mysql2/promise");

const banco = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 5
});

module.exports = banco;