const sql = require('mssql');

const dbConfig = {
  user: 'mwilke',
  password: 'Jac77415!',
  server: 'sql.aionmgmt.com',
  database: 'reports',
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

export default async function handler(req, res) {
  try {
    await sql.connect(dbConfig);
    const result = await sql.query`SELECT * FROM execSummaryTool`;
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await sql.close();
  }
}