//pool connection
import mysql from "mysql2/promise";
let pool: mysql.Pool | undefined;

export function createPool() {
  if (!pool) {
    pool = mysql.createPool({
      // host: process.env.MYSQL_HOST,
      // port: Number(process.env.MYSQL_PORT),
      // user: process.env.MYSQL_USER,
      // password: process.env.MYSQL_PASSWORD,
      // database: process.env.MYSQL_NAME,
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  if (!pool) {
    throw new Error("Failed to establish database connection.");
  }
  return pool;
}

export function connect() {
  throw new Error('Function not implemented.');
}

export function execute(arg0: string, arg1: string[]): [any] | PromiseLike<[any]> {
  throw new Error('Function not implemented.');
}
