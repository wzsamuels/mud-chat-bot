import Database from 'better-sqlite3';
import path from 'path';

// Open the database strictly in read-only mode
const db = new Database(path.join(process.cwd(), 'markov.db'), { readonly: true });

export default db;