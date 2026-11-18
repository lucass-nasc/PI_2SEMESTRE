const path = require("node:path");

// Lê o .env que está na mesma pasta deste arquivo.
require("dotenv").config({
    path: path.join(__dirname, ".env"),
});

const mysql = require("mysql2/promise");

// O pool reaproveita conexões: não preciso abrir uma conexão nova para cada consulta.
const banco = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 5,
    // Datas permanecem como texto para não mudar o dia de nascimento por fuso horário.
    dateStrings: true,
});

module.exports = banco;
