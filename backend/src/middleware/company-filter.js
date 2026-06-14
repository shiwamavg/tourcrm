// src/middleware/company-filter.js
// Helper utilities for adding company_id to SQL queries

/**
 * Append company_id WHERE clause to an SQL string.
 * If the query already has WHERE, adds AND. Otherwise adds WHERE.
 */
function addCompanyFilter(sql, params, companyId) {
    if (!companyId) return { sql, params };

    const trimmed = sql.trim();
    // Check if there's already a WHERE clause (case-insensitive)
    const hasWhere = /\bWHERE\b/i.test(trimmed);

    // Find position to insert: before ORDER BY, GROUP BY, LIMIT, HAVING
    const insertBeforeRegex = /\b(ORDER\s+BY|GROUP\s+BY|LIMIT|HAVING)\b/gi;
    const match = insertBeforeRegex.exec(trimmed);

    let newSql;
    if (hasWhere) {
        if (match) {
            const pos = match.index;
            newSql = trimmed.slice(0, pos) + `AND company_id = ? ` + trimmed.slice(pos);
        } else {
            newSql = trimmed + ' AND company_id = ?';
        }
    } else {
        if (match) {
            const pos = match.index;
            newSql = trimmed.slice(0, pos) + `WHERE company_id = ? ` + trimmed.slice(pos);
        } else {
            newSql = trimmed + ' WHERE company_id = ?';
        }
    }

    return { sql: newSql, params: [...params, companyId] };
}

/**
 * Add company_id to INSERT values.
 * sql should be like: INSERT INTO table (col1, col2) VALUES (?, ?)
 * Returns modified SQL and params with company_id appended.
 */
function addCompanyToInsert(sql, params, companyId) {
    if (!companyId) return { sql, params };

    // Replace "VALUES (" with "VALUES (?, " and add company_id to columns
    // First find the columns part
    const colsMatch = sql.match(/INSERT\s+INTO\s+\w+\s*\(([^)]+)\)/i);
    if (!colsMatch) return { sql, params };

    const cols = colsMatch[1];
    const newCols = cols + ', company_id';
    let newSql = sql.replace(cols, newCols);

    // Replace the first VALUES (?) pattern
    const valuesMatch = newSql.match(/VALUES\s*\(([^)]+)\)/i);
    if (valuesMatch) {
        const vals = valuesMatch[1];
        const newVals = vals + ', ?';
        newSql = newSql.replace(vals, newVals);
    }

    return { sql: newSql, params: [...params, companyId] };
}

module.exports = { addCompanyFilter, addCompanyToInsert };
