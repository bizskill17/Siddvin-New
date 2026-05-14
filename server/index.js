import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { getPool } from './db.js';
import { SCHEMA_SQL } from './schema.js';
import { resolveEntity } from './entityMap.js';

const port = process.env.PORT ? Number(process.env.PORT) : 4000;

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: true, credentials: false }));
app.use(express.json({ limit: '2mb' }));

const pool = getPool();

const ensureSchema = async () => {
  for (const sql of SCHEMA_SQL) {
    // eslint-disable-next-line no-await-in-loop
    await pool.query(sql);
  }
};

const nowIso = () => new Date().toISOString();

const unpackGenericRow = (row) => {
  const data = row?.data ? JSON.parse(row.data) : {};
  return {
    ...data,
    id: data.id || row.id,
    serialNo: data.serialNo ?? row.serial_no ?? undefined,
    createdAt: data.createdAt || row.created_at ? new Date(row.created_at).toISOString() : undefined,
    updatedAt: data.updatedAt || row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
    updatedBy: data.updatedBy || row.updated_by || undefined,
  };
};

const packGenericData = (data, overrides) => {
  const merged = { ...(data || {}), ...(overrides || {}) };
  return JSON.stringify(merged);
};

const ok = (res, data) => res.json({ ok: true, data });
const fail = (res, status, error) => res.status(status).json({ ok: false, error: String(error?.message || error) });

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/api', async (req, res) => {
  try {
    const action = String(req.query.action || '').trim();
    const entity = resolveEntity(req.query.entity);
    if (!action) return fail(res, 400, 'Missing action');
    if (!entity) return fail(res, 400, 'Unknown entity');

    if (entity.kind === 'term') {
      if (action === 'list') {
        const [rows] = await pool.query(`SELECT proposal_id, data, created_at, updated_at, updated_by FROM ${entity.table} ORDER BY updated_at DESC`);
        const out = (rows || []).map((r) => {
          const data = r?.data ? JSON.parse(r.data) : {};
          return {
            ...data,
            proposalId: data.proposalId || r.proposal_id,
            createdAt: data.createdAt || new Date(r.created_at).toISOString(),
            updatedAt: data.updatedAt || new Date(r.updated_at).toISOString(),
            updatedBy: data.updatedBy || r.updated_by || undefined,
          };
        });
        return ok(res, out);
      }
      if (action === 'getByProposalId') {
        const proposalId = String(req.query.proposalId || '').trim();
        if (!proposalId) return fail(res, 400, 'Missing proposalId');
        const [rows] = await pool.query(`SELECT proposal_id, data, created_at, updated_at, updated_by FROM ${entity.table} WHERE proposal_id = ? LIMIT 1`, [proposalId]);
        const row = Array.isArray(rows) && rows.length ? rows[0] : null;
        if (!row) return ok(res, []);
        const data = row?.data ? JSON.parse(row.data) : {};
        return ok(res, [{
          ...data,
          proposalId: data.proposalId || row.proposal_id,
          createdAt: data.createdAt || new Date(row.created_at).toISOString(),
          updatedAt: data.updatedAt || new Date(row.updated_at).toISOString(),
          updatedBy: data.updatedBy || row.updated_by || undefined,
        }]);
      }
      return fail(res, 400, `Unsupported action for TermSheets: ${action}`);
    }

    // Generic entity actions
    if (action === 'list') {
      const [rows] = await pool.query(`SELECT id, serial_no, data, created_at, updated_at, updated_by FROM ${entity.table} ORDER BY updated_at DESC`);
      return ok(res, (rows || []).map(unpackGenericRow));
    }

    if (action === 'getById') {
      const id = String(req.query.id || '').trim();
      if (!id) return fail(res, 400, 'Missing id');
      const [rows] = await pool.query(`SELECT id, serial_no, data, created_at, updated_at, updated_by FROM ${entity.table} WHERE id = ? LIMIT 1`, [id]);
      const row = Array.isArray(rows) && rows.length ? rows[0] : null;
      return ok(res, row ? unpackGenericRow(row) : null);
    }

    if (action === 'getByProposalId') {
      const proposalId = String(req.query.proposalId || '').trim();
      if (!proposalId) return fail(res, 400, 'Missing proposalId');
      const [rows] = await pool.query(
        `SELECT id, serial_no, data, created_at, updated_at, updated_by FROM ${entity.table}
         WHERE JSON_UNQUOTE(JSON_EXTRACT(data, '$.proposalId')) = ?
         ORDER BY updated_at DESC`,
        [proposalId],
      );
      return ok(res, (rows || []).map(unpackGenericRow));
    }

    return fail(res, 400, `Unsupported action: ${action}`);
  } catch (err) {
    return fail(res, 500, err);
  }
});

app.post('/api', async (req, res) => {
  try {
    const body = req.body || {};
    const action = String(body.action || '').trim();
    const entity = resolveEntity(body.entity);
    const updatedBy = body.updatedBy ? String(body.updatedBy) : null;
    if (!action) return fail(res, 400, 'Missing action');
    if (!entity) return fail(res, 400, 'Unknown entity');

    if (entity.kind === 'term') {
      if (action !== 'upsertByProposalId') return fail(res, 400, `Unsupported action for TermSheets: ${action}`);
      const proposalId = String(body.proposalId || '').trim();
      const data = body.data || {};
      if (!proposalId) return fail(res, 400, 'Missing proposalId');

      const packed = JSON.stringify({ ...(data || {}), proposalId, updatedBy: updatedBy || undefined, updatedAt: nowIso() });
      await pool.query(
        `INSERT INTO ${entity.table} (proposal_id, data, updated_by) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE data = VALUES(data), updated_by = VALUES(updated_by), updated_at = CURRENT_TIMESTAMP`,
        [proposalId, packed, updatedBy],
      );

      const [rows] = await pool.query(`SELECT proposal_id, data, created_at, updated_at, updated_by FROM ${entity.table} WHERE proposal_id = ? LIMIT 1`, [proposalId]);
      const row = Array.isArray(rows) && rows.length ? rows[0] : null;
      const out = row?.data ? JSON.parse(row.data) : {};
      return ok(res, {
        ...out,
        proposalId,
        createdAt: row ? new Date(row.created_at).toISOString() : undefined,
        updatedAt: row ? new Date(row.updated_at).toISOString() : undefined,
        updatedBy: row?.updated_by || undefined,
      });
    }

    if (action === 'create') {
      const id = randomUUID();
      const payload = body.data || {};
      const packed = packGenericData(payload, { id, updatedBy: updatedBy || undefined, updatedAt: nowIso() });
      await pool.query(`INSERT INTO ${entity.table} (id, data, updated_by) VALUES (?, ?, ?)`, [id, packed, updatedBy]);

      const [rows] = await pool.query(`SELECT id, serial_no, data, created_at, updated_at, updated_by FROM ${entity.table} WHERE id = ? LIMIT 1`, [id]);
      const row = Array.isArray(rows) && rows.length ? rows[0] : null;
      if (!row) return fail(res, 500, 'Failed to read created record');

      // Ensure serialNo is reflected in JSON for clients that rely on it.
      const serialNo = row.serial_no;
      const withSerial = JSON.stringify({ ...(JSON.parse(row.data) || {}), serialNo });
      await pool.query(`UPDATE ${entity.table} SET data = ? WHERE id = ?`, [withSerial, id]);
      row.data = withSerial;

      return ok(res, unpackGenericRow(row));
    }

    if (action === 'update') {
      const id = String(body.id || '').trim();
      if (!id) return fail(res, 400, 'Missing id');
      const patch = body.data || {};

      const [rows] = await pool.query(`SELECT id, serial_no, data, created_at, updated_at, updated_by FROM ${entity.table} WHERE id = ? LIMIT 1`, [id]);
      const row = Array.isArray(rows) && rows.length ? rows[0] : null;
      if (!row) return fail(res, 404, 'Not found');

      const existing = row?.data ? JSON.parse(row.data) : {};
      const merged = { ...existing, ...patch, id, serialNo: existing.serialNo ?? row.serial_no, updatedBy: updatedBy || existing.updatedBy, updatedAt: nowIso() };
      const packed = JSON.stringify(merged);
      await pool.query(`UPDATE ${entity.table} SET data = ?, updated_by = ? WHERE id = ?`, [packed, updatedBy, id]);

      row.data = packed;
      row.updated_by = updatedBy;
      return ok(res, unpackGenericRow(row));
    }

    if (action === 'delete') {
      const id = String(body.id || '').trim();
      if (!id) return fail(res, 400, 'Missing id');
      const [result] = await pool.query(`DELETE FROM ${entity.table} WHERE id = ?`, [id]);
      const affected = result && typeof result.affectedRows === 'number' ? result.affectedRows : 0;
      return res.json({ ok: affected > 0 });
    }

    return fail(res, 400, `Unsupported action: ${action}`);
  } catch (err) {
    return fail(res, 500, err);
  }
});

await ensureSchema();
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}`);
});

