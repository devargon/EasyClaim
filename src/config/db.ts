import mariadb from 'mariadb';
import * as dotenv from 'dotenv';
dotenv.config();

if (!process.env.MARIADB_DATABASE) {
    console.error("MARIADB_DATABASE environment variable missing");
    process.exit(1);
}

const pool = mariadb.createPool({
    host: process.env.MARIADB_HOST || 'localhost',
    user: process.env.MARIADB_USER || 'root',
    password: process.env.MARIADB_PASSWORD || 'password',
    database: process.env.MARIADB_DATABASE,
});

const oldQuery = pool.query;
pool.query = function (...args) {
    const [sql, params] = args;
    console.log(`EXECUTING QUERY`, sql, params)
    return oldQuery.apply(pool, args);
}

export default pool;

