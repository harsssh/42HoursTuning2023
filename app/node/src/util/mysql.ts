import { createPool, Pool, PoolOptions } from "mysql2/promise";

const mysqlOption: PoolOptions = {
  host: "mysql",
  user: "mysql",
  password: "mysql",
  database: "app",
  waitForConnections: true,
  connectionLimit: 10000,
};

const pool: Pool = createPool(mysqlOption);

export default pool;
