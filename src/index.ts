import {
  CompiledQuery,
  DatabaseConnection,
  DatabaseIntrospector,
  Dialect,
  Driver,
  Kysely,
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
  QueryCompiler,
  QueryResult,
} from "kysely"
import { Client } from "@neondatabase/serverless"

interface NeonDialectConfig {
  databaseUrl: string
}

export class NeonDialect implements Dialect {
  config: NeonDialectConfig

  constructor(config: NeonDialectConfig) {
    this.config = config
  }

  createAdapter() {
    return new SqliteAdapter()
  }

  createDriver(): Driver {
    return new NeonDriver(this.config)
  }

  createQueryCompiler(): QueryCompiler {
    return new SqliteQueryCompiler()
  }

  createIntrospector(db: Kysely<any>): DatabaseIntrospector {
    return new SqliteIntrospector(db)
  }
}

class NeonDriver implements Driver {
  config: NeonDialectConfig

  constructor(config: NeonDialectConfig) {
    this.config = config
  }

  async init(): Promise<void> {}

  async acquireConnection(): Promise<DatabaseConnection> {
    return new NeonConnection(this.config)
  }

  async beginTransaction(conn: NeonConnection): Promise<void> {
    return await conn.beginTransaction()
  }

  async commitTransaction(conn: NeonConnection): Promise<void> {
    return await conn.commitTransaction()
  }

  async rollbackTransaction(conn: NeonConnection): Promise<void> {
    return await conn.rollbackTransaction()
  }

  async releaseConnection(conn: NeonConnection): Promise<void> {
    return await conn.destroy()
  }

  async destroy(): Promise<void> {}
}

class NeonConnection implements DatabaseConnection {
  config: NeonDialectConfig
  client: Client

  constructor(config: NeonDialectConfig) {
    this.config = config
    this.client = new Client({
      connectionString: this.config.databaseUrl,
    })
  }

  async executeQuery<O>(compiledQuery: CompiledQuery): Promise<QueryResult<O>> {
    const result = await this.client.query(compiledQuery.sql, [
      ...compiledQuery.parameters,
    ])

    if (
      result.command === "INSERT" ||
      result.command === "UPDATE" ||
      result.command === "DELETE"
    ) {
      const numAffectedRows = BigInt(result.rowCount)

      return {
        // TODO: remove.
        numUpdatedOrDeletedRows: numAffectedRows,
        numAffectedRows,
        rows: result.rows ?? [],
      }
    }

    return {
      rows: result.rows ?? [],
    }
  }

  async beginTransaction() {
    throw new Error("Transactions are not supported yet.")
  }

  async commitTransaction() {
    throw new Error("Transactions are not supported yet.")
  }

  async rollbackTransaction() {
    throw new Error("Transactions are not supported yet.")
  }

  async destroy() {
    this.client.end()
  }

  async *streamQuery<O>(
    _compiledQuery: CompiledQuery,
    _chunkSize: number
  ): AsyncIterableIterator<QueryResult<O>> {
    throw new Error("Neon Driver does not support streaming")
  }
}
