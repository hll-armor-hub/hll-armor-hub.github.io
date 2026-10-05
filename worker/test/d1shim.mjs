// Minimal Cloudflare D1 stand-in on node:sqlite (Node 22.5+) for unit tests: prepare/bind/first/all/run/batch.
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

class Stmt {
  constructor(db, sql, params = []) {
    this.db = db;
    this.sql = sql;
    this.params = params;
  }
  bind(...params) {
    for (const p of params) if (p === undefined || typeof p === 'boolean') throw new TypeError(`D1 cannot bind ${typeof p}`);
    return new Stmt(this.db, this.sql, params);
  }
  exec() {
    this.db.queries++;
    const results = this.db.sqlite.prepare(this.sql).all(...this.params);
    const { c } = this.db.sqlite.prepare('SELECT changes() AS c').get();
    const isWrite = /^\s*(INSERT|UPDATE|DELETE|REPLACE)/i.test(this.sql);
    return { results: results.map((r) => ({ ...r })), meta: { changes: isWrite ? c : 0 }, success: true };
  }
  async first() {
    return this.exec().results[0] ?? null;
  }
  async all() {
    return this.exec();
  }
  async run() {
    return this.exec();
  }
}

export class D1 {
  constructor() {
    this.sqlite = new DatabaseSync(':memory:');
    this.queries = 0;
  }
  static withSchema(path) {
    const d = new D1();
    d.sqlite.exec(readFileSync(path, 'utf8'));
    return d;
  }
  prepare(sql) {
    return new Stmt(this, sql);
  }
  async batch(stmts) {
    this.sqlite.exec('BEGIN');
    try {
      const out = stmts.map((s) => s.exec());
      this.sqlite.exec('COMMIT');
      return out;
    } catch (err) {
      this.sqlite.exec('ROLLBACK');
      throw err;
    }
  }
  rows(sql, ...params) {
    return this.sqlite.prepare(sql).all(...params).map((r) => ({ ...r }));
  }
}
