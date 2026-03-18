require('dotenv').config();

const express = require('express');
const path = require('path');
const XLSX = require('xlsx');

const { createDatasetService } = require('./src/dataService');
const { createChatService } = require('./src/chatService');

const app = express();
const port = Number(process.env.PORT || 3000);
const workbookPath = path.join(__dirname, 'Base Spotifinder.xlsx');
const datasetService = createDatasetService({ workbookPath });
const chatService = createChatService({ datasetService });

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    workbook: path.basename(workbookPath),
    records: datasetService.getRowCount(),
    mode: 'local',
  });
});

app.get('/api/schema', (_req, res) => {
  res.json(datasetService.getSchema());
});

app.get('/api/options', (_req, res) => {
  try {
    res.json({
      estados: datasetService.listDistinctValues({ column: 'estado', limit: 100 }).values,
      cidades: datasetService.listDistinctValues({ column: 'cidade', limit: 300 }).values,
      exibidores: datasetService.listDistinctValues({ column: 'exibidor', limit: 200 }).values,
      tipos: datasetService.listDistinctValues({ column: 'tipo', limit: 20 }).values,
      tiposMidia: datasetService.listDistinctValues({ column: 'tipo_de_midia', limit: 150 }).values,
      verticais: datasetService.listDistinctValues({ column: 'vertical', limit: 30 }).values,
      exposicoes: datasetService.listDistinctValues({ column: 'tipo_de_exposicao', limit: 10 }).values,
    });
  } catch (error) {
    res.status(500).json({ error: 'Falha ao carregar as opcoes.' });
  }
});

app.post('/api/query', (req, res) => {
  try {
    const result = datasetService.query(req.body || {});
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Falha ao executar a consulta.' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Envie um array de messages.' });
    }
    const result = await chatService.answer(messages);
    res.json(result);
  } catch (error) {
    console.error('[chat error]', error);
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

app.post('/api/export-xlsx', (req, res) => {
  try {
    const queryParams = req.body?.query;
    if (!queryParams) {
      return res.status(400).json({ error: 'Parametros de query ausentes.' });
    }

    // Exporta linhas brutas com todos os campos, sem limite
    const result = datasetService.query({ filters: queryParams.filters || [], limit: 100000, _bypassLimit: true });
    const table = result.presentation.table;

    if (!table?.columns?.length) {
      return res.status(400).json({ error: 'Nenhum dado para exportar.' });
    }

    const header = table.columns.map((column) => String(column.label ?? column.key));
    const matrix = [header];

    for (const row of table.rows) {
      matrix.push(
        table.columns.map((column) => {
          const value = row?.[column.key];
          return value === null || value === undefined ? '' : value;
        }),
      );
    }

    const worksheet = XLSX.utils.aoa_to_sheet(matrix);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Resultado');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="resultado-clone-mia.xlsx"');
    return res.send(buffer);
  } catch (error) {
    console.error('[export-xlsx error]', error);
    return res.status(500).json({ error: 'Falha ao exportar o resultado.' });
  }
});

app.post('/api/export', (req, res) => {
  try {
    const table = req.body?.table;
    if (!table || !Array.isArray(table.columns) || !Array.isArray(table.rows)) {
      return res.status(400).json({ error: 'Resultado invalido para exportacao.' });
    }

    const header = table.columns.map((column) => String(column.label ?? column.key));
    const matrix = [header];

    for (const row of table.rows) {
      matrix.push(
        table.columns.map((column) => {
          const value = row?.[column.key];
          return value === null || value === undefined ? '' : String(value);
        }),
      );
    }

    const worksheet = XLSX.utils.aoa_to_sheet(matrix);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=\"resultado-base-spotifinder.csv\"');
    return res.send(`\uFEFF${csv}`);
  } catch (_error) {
    return res.status(500).json({ error: 'Falha ao exportar o resultado.' });
  }
});

app.listen(port, () => {
  console.log(`Servidor ativo em http://localhost:${port}`);
});
