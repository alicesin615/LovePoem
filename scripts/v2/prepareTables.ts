import { LovePoemV2Database } from "../../models";

export async function createLovePoemTables(
  tablePrefix: string,
  tableSchema: string,
  db: LovePoemV2Database,
) {
  const createTableStmt = `CREATE TABLE ${tablePrefix} (${tableSchema});`;
  const { meta: createTable } = await db.prepare(createTableStmt).all();

  let tableName = "";

  try {
    await createTable.txn?.wait();
    tableName = createTable?.txn?.name || "";
  } catch (error) {
    throw new Error(`Failed to create table: ${error}`);
  }

  return tableName;
}
