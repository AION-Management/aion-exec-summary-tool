const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
app.use(cors());

const dbConfig = {
  user: 'sdragone',
  password: '98ls2WkChNhA',
  server: 'sql.aionmgmt.com',
  database: 'reports',
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

app.get('/api/data', async (req, res) => {
  try {
    await sql.connect(dbConfig);
    const result = await sql.query`SELECT * FROM execSummaryTool`;
    res.json(result.recordset);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    await sql.close();
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));