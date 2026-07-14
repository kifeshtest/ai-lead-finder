import { Router } from 'express';
import ExcelJS from 'exceljs';
import { getStore } from '../db/store.js';
import { parseFilters } from './filters.js';

const router = Router();

const COLUMNS = [
  { header: 'Bedrijfsnaam', key: 'companyName', width: 30 },
  { header: 'Branche', key: 'branche', width: 18 },
  { header: 'Provincie', key: 'province', width: 14 },
  { header: 'Plaats', key: 'city', width: 16 },
  { header: 'Telefoon', key: 'phone', width: 16 },
  { header: 'E-mail', key: 'email', width: 24 },
  { header: 'Website', key: 'website', width: 28 },
  { header: 'Heeft website', key: 'hasWebsite', width: 12 },
  { header: 'Leadscore', key: 'leadScore', width: 10 },
  { header: 'Label', key: 'label', width: 20 },
  { header: 'Betrouwbaarheid', key: 'confidence', width: 14 },
  { header: 'PageSpeed mobiel', key: 'perf', width: 14 },
  { header: 'SEO', key: 'seo', width: 8 },
  { header: 'SSL', key: 'ssl', width: 8 },
  { header: 'Status', key: 'status', width: 16 },
  { header: 'Gesprekspunten', key: 'talkingPoints', width: 70 },
  { header: 'Openingszin', key: 'openingLine', width: 70 },
  { header: 'Notitie', key: 'note', width: 40 },
  { header: 'Opvolgdatum', key: 'followUpDate', width: 14 },
  { header: 'Laatste analyse', key: 'analyzedAt', width: 22 },
];

function flatten(l) {
  return {
    companyName: l.companyName, branche: l.branche, province: l.province, city: l.city,
    phone: l.phone, email: l.email, website: l.website,
    hasWebsite: l.hasWebsite ? 'ja' : 'nee',
    leadScore: l.leadScore ?? '', label: l.label ?? '', confidence: l.confidence ?? '',
    perf: l.pagespeed?.performance ?? '', seo: l.pagespeed?.seo ?? '',
    ssl: l.checks?.https === true ? 'ja' : l.checks?.https === false ? 'nee' : '',
    status: l.status || '',
    talkingPoints: (l.talkingPoints || []).join(' | '),
    openingLine: l.openingLine || '',
    note: l.note || '',
    followUpDate: l.followUpDate ? new Date(l.followUpDate).toLocaleDateString('nl-NL') : '',
    analyzedAt: l.analyzedAt ? new Date(l.analyzedAt).toLocaleString('nl-NL') : '',
  };
}

const csvCell = (v) => {
  if (v == null) return '';
  const s = String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

router.get('/csv', async (req, res) => {
  const store = await getStore();
  const leads = await store.listLeads({ ...parseFilters(req.query), limit: 10000 });
  const header = COLUMNS.map((c) => c.header).join(';');
  const rows = leads.map((l) => { const f = flatten(l); return COLUMNS.map((c) => csvCell(f[c.key])).join(';'); });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
  res.send('﻿' + [header, ...rows].join('\n'));
});

router.get('/xlsx', async (req, res) => {
  const store = await getStore();
  const leads = await store.listLeads({ ...parseFilters(req.query), limit: 10000 });
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Leads');
  ws.columns = COLUMNS;
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  for (const l of leads) ws.addRow(flatten(l));
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="leads.xlsx"');
  await wb.xlsx.write(res);
  res.end();
});

export default router;
