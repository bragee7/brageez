const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const CASES_FILE = path.join(__dirname, 'data', 'cases.json');
const AUDIT_FILE = path.join(__dirname, 'data', 'audit.json');
const CONTACTS_FILE = path.join(__dirname, 'data', 'contacts.json');

function readJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const key = path.basename(filePath).replace('.json', '');
    return data[key] || [];
  } catch (e) {
    return [];
  }
}

function writeJSON(filePath, data) {
  const key = path.basename(filePath).replace('.json', '');
  const obj = {};
  obj[key] = data;
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2));
}

function now() {
  return new Date().toISOString().replace('T', ' ').split('.')[0];
}

function matchColNames(sql) {
  const match = sql.match(/\(([^)]+)\)\s*VALUES/i);
  if (!match) return [];
  return match[1].split(',').map(c => c.trim().replace(/`/g, ''));
}

function evalNOW(val) {
  if (typeof val === 'string' && val.toUpperCase && val.toUpperCase() === 'NOW()') return now();
  return val;
}

const pool = {
  getConnection: async () => {
    return { release: () => {} };
  }
};

const query = async (sql, params = []) => {
  sql = sql.trim();

  if (sql.toUpperCase().startsWith('SELECT')) {
    return handleSelect(sql, params);
  } else if (sql.toUpperCase().startsWith('INSERT')) {
    return handleInsert(sql, params);
  } else if (sql.toUpperCase().startsWith('UPDATE')) {
    return handleUpdate(sql, params);
  }
  return [];
};

function getTable(sql) {
  const m = sql.match(/`([^`]+)`/);
  return m ? m[1].trim() : null;
}

function getWhere(sql, params) {
  const m = sql.match(/WHERE\s+(.+?)(?:\s+ORDER\s+|$)/i);
  if (!m) return {};
  const conditions = m[1].trim();
  const parts = conditions.split(/\s+AND\s+/i);
  let paramIdx = 0;
  const result = {};
  for (const part of parts) {
    const cm = part.match(/`?(\w+)`?\s*(=|!=|<>|>|<|>=|<=)\s*\?/);
    if (cm) {
      result[cm[1]] = { op: cm[2], val: params[paramIdx] };
      paramIdx++;
    } else if (part.match(/`?\w+`?\s*IS\s+NULL/i)) {
      const nm = part.match(/`?(\w+)`?\s*IS\s+NULL/i);
      if (nm) result[nm[1]] = { op: 'IS NULL', val: null };
    } else if (part.match(/`?\w+`?\s*IS\s+NOT\s+NULL/i)) {
      const nm = part.match(/`?(\w+)`?\s*IS\s+NOT\s+NULL/i);
      if (nm) result[nm[1]] = { op: 'IS NOT NULL', val: null };
    }
  }
  return result;
}

function getOrder(sql) {
  const m = sql.match(/ORDER\s+BY\s+`?(\w+)`?\s*(ASC|DESC)?/i);
  if (m) return { col: m[1], dir: (m[2] || 'ASC').toUpperCase() };
  return null;
}

function matchRow(conditions, row) {
  for (const [col, cond] of Object.entries(conditions)) {
    const rowVal = row[col];
    if (cond.op === '=') {
      if (String(rowVal) !== String(cond.val)) return false;
    } else if (cond.op === 'IS NULL') {
      if (rowVal !== null && rowVal !== undefined) return false;
    } else if (cond.op === 'IS NOT NULL') {
      if (rowVal === null || rowVal === undefined) return false;
    } else {
      return false;
    }
  }
  return true;
}

function handleSelect(sql, params) {
  const table = getTable(sql);
  const conditions = getWhere(sql, params);
  const order = getOrder(sql);

  let rows;
  if (table === 'users table') {
    rows = readJSON(USERS_FILE);
  } else if (table === 'sos cases table') {
    rows = readJSON(CASES_FILE);
  } else if (table === 'audit log table') {
    rows = readJSON(AUDIT_FILE);
  } else if (table === 'contacts table') {
    rows = readJSON(CONTACTS_FILE);
  } else {
    rows = [];
  }

  rows = rows.filter(r => matchRow(conditions, r));

  if (order) {
    rows.sort((a, b) => {
      const av = a[order.col] || '';
      const bv = b[order.col] || '';
      const cmp = String(av).localeCompare(String(bv));
      return order.dir === 'DESC' ? -cmp : cmp;
    });
  }

  return rows;
}

function handleInsert(sql, params) {
  const table = getTable(sql);
  const colNames = matchColNames(sql);

  const row = { id: uuidv4() };
  colNames.forEach((col, i) => {
    let val = params[i];
    if (typeof val === 'string' && val.toUpperCase && val.toUpperCase() === 'NOW()') {
      val = now();
    }
    if (val === null || val === undefined) val = null;
    if (typeof val === 'boolean') val = val ? 1 : 0;
    row[col.trim()] = val;
  });

  if (table === 'users table') {
    const users = readJSON(USERS_FILE);
    users.push(row);
    writeJSON(USERS_FILE, users);
  } else if (table === 'sos cases table') {
    const cases = readJSON(CASES_FILE);
    cases.push(row);
    writeJSON(CASES_FILE, cases);
  } else if (table === 'audit log table') {
    const logs = readJSON(AUDIT_FILE);
    logs.push(row);
    writeJSON(AUDIT_FILE, logs);
  } else if (table === 'contacts table') {
    const contacts = readJSON(CONTACTS_FILE);
    contacts.push(row);
    writeJSON(CONTACTS_FILE, contacts);
  }

  return { insertId: row.id, affectedRows: 1 };
}

function handleUpdate(sql, params) {
  const table = getTable(sql);

  const setMatch = sql.match(/SET\s+(.+?)(?:\s+WHERE|$)/i);
  if (!setMatch) return { affectedRows: 0 };

  const setParts = setMatch[1].split(',').map(s => s.trim());
  let paramIdx = 0;
  const updates = {};
  for (const part of setParts) {
    const sm = part.match(/`?(\w+)`?\s*=\s*(.+)/);
    if (sm) {
      const col = sm[1];
      const valExpr = sm[2].trim();
      if (valExpr === '?') {
        updates[col] = params[paramIdx++];
      } else if (valExpr.toUpperCase && valExpr.toUpperCase() === 'NOW()') {
        updates[col] = now();
      } else if (valExpr.toUpperCase && valExpr.toUpperCase() === 'TRUE') {
        updates[col] = 1;
      } else if (valExpr.toUpperCase && valExpr.toUpperCase() === 'FALSE') {
        updates[col] = 0;
      } else if (valExpr.toUpperCase && valExpr.toUpperCase() === 'NULL') {
        updates[col] = null;
      }
    }
  }

  const remainingParams = params.slice(paramIdx);
  const conditions = getWhere(sql + ' ', remainingParams);

  let rows;
  if (table === 'users table') {
    rows = readJSON(USERS_FILE);
  } else if (table === 'sos cases table') {
    rows = readJSON(CASES_FILE);
  } else {
    return { affectedRows: 0 };
  }

  let count = 0;
  rows = rows.map(r => {
    if (matchRow(conditions, r)) {
      count++;
      Object.assign(r, updates);
    }
    return r;
  });

  if (table === 'users table') writeJSON(USERS_FILE, rows);
  else if (table === 'sos cases table') writeJSON(CASES_FILE, rows);
  else if (table === 'contacts table') writeJSON(CONTACTS_FILE, rows);

  return { affectedRows: count };
}

const auditLog = async (userId, caseId, action, details) => {
  try {
    const logs = readJSON(AUDIT_FILE);
    logs.push({
      id: uuidv4(),
      user_id: userId || null,
      case_id: caseId || null,
      Action: action,
      details: details || '',
      created_at: now()
    });
    writeJSON(AUDIT_FILE, logs);
  } catch (error) {
    console.error('Audit log error:', error);
  }
};

module.exports = { pool, query, auditLog };
