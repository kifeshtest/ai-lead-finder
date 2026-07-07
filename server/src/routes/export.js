import { Router } from 'express';
import ExcelJS from 'exceljs';
import { getStore } from '../db/store.js';
import { parseFilters } from './filters.js';

const router = Router();

const COLUMNS = [
  { header: 'Bedrijfsnaam', key: 'companyName', width: 32 },
  { header: 'Branche', key: 'branche', width: 22 },
  { header: 'Provincie', key: 'province', width: 16 },
  { header: 'Plaats', key: 'city', width: 16 },
  { header: 'Telefoon', key: 'phone', width: 16 },
  { header: 'E-mail', key: 'email', width: 26 },
  { header: 'Website', key: 'website', width: 30 },
  { header: 'Score', key: 'websiteScore', width: 8 },
  { header: 'Heeft website', key: 'hasWebsite', width: 14 },
  { header: 'Reden', key: 'reason', width: 36 },
  { header: 'Motivatie', key: 'motivation', width: 60 },
  { header: 'Laatste controle', key: 'lastChecked', width: 22 },
];

function csvCell(v) {
  if (v == null) return '';
  const s = String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// GET /api/export/csv
router.get('/csv', async (req, res) => {
  const store = await getStore();
  const leads = await store.listLeads({ ...parseFilters(req.query), limit: 10000 });
  const header = COLUMNS.map((c) => c.header).join(';');
  const rows = leads.map((l) =>
    COLUMNS.map((c) => csvCell(c.key === 'hasWebsite' ? (l.hasWebsite ? 'ja' : 'nee') : l[c.key])).join(';')
  );
  const csv = '﻿' + [header, ...rows].join('\n'); // BOM voor Excel/UTF-8
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
  res.send(csv);
});

// GET /api/export/xlsx
router.get('/xlsx', async (req, res) => {
  const store = await getStore();
  const leads = await store.listLeads({ ...parseFilters(req.query), limit: 10000 });
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Leads');
  ws.columns = COLUMNS;
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1C1C1C' } };
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  for (const l of leads) {
    ws.addRow({
      ...l,
      hasWebsite: l.hasWebsite ? 'ja' : 'nee',
      lastChecked: l.lastChecked ? new Date(l.lastChecked).toLocaleString('nl-NL') : '',
    });
  }
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="leads.xlsx"');
  await wb.xlsx.write(res);
  res.end();
});

export default router;
