import { WaitableTransactionReceipt } from "@tableland/sdk";
import { LovePoemV2Database } from "../../models";

export async function createTables(
  tablePrefix: string,
  tableSchema: string,
  db: LovePoemV2Database,
) {
  const createTableStmt = `CREATE TABLE ${tablePrefix} (${tableSchema});`;
  const { meta: createTable } = await db.prepare(createTableStmt).all();

  let tableName = "";
  let tableId = "";

  try {
    await createTable.txn?.wait();
    tableName = createTable?.txn?.name || "";
    tableId = createTable?.txn?.tableId || "";
  } catch (error) {
    throw new Error(`Failed to create table: ${error}`);
  }

  return { tableName, tableId };
}

export async function getJoinedTable(
  db: LovePoemV2Database,
  mainTableName: string,
  attributesTableName: string,
) {
  const getTableStmt = `SELECT json_object('id', id, 'name', name, 'description', description, 'image', image, 'attributes', json_group_array(json_object('trait_type', trait_type, 'value', value))) as metadata from ${mainTableName} JOIN ${attributesTableName} ON ${mainTableName}.id = ${attributesTableName}.main_id;`;
  const { results, meta: getTable } = await db.prepare(getTableStmt).all();

  try {
    await getTable?.txn?.wait();
  } catch (error) {
    throw new Error(`Failed to get joined table: ${error}`);
  }

  return results;
}
export async function selectFromJoinedTable(
  db: LovePoemV2Database,
  mainTableName: string,
  attributesTableName: string,
  selectStmt: string,
) {
  const selectFromTableStmt = `SELECT ${selectStmt} from ${mainTableName} JOIN ${attributesTableName} ON ${mainTableName}.id = ${attributesTableName}.main_id;`;
  const { results, meta: selectFromTable } = await db
    .prepare(selectFromTableStmt)
    .all();
  try {
    await selectFromTable?.txn?.wait();
  } catch (error) {
    throw new Error(`Failed to select from joined table: ${error}`);
  }
  return results;
}

export async function insertAttributes(
  db: LovePoemV2Database,
  tokenId: string,
  attributeTableName: string,
  trait_type: string,
  value: string | number,
) {
  const insertAttributesStmt = `INSERT INTO ${attributeTableName} (main_id, trait_type, value) VALUES (?, ?, ?)`;
  const { meta: insertNewAttributes } = await db
    .prepare(insertAttributesStmt)
    .bind(`${tokenId}`, `${trait_type}`, `${value}`)
    .run();

  try {
    await insertNewAttributes?.txn?.wait();
  } catch (error) {
    throw new Error(`Failed to insert attributes: ${error}`);
  }

  return insertNewAttributes;
}

export async function updateAttributes(
  db: LovePoemV2Database,
  attributeTableName: string,
  trait_type: string,
  value: string | number,
) {
  const updateAttributesStmt = `UPDATE ${attributeTableName} SET value = ? WHERE trait_type = ?`;
  const { meta: updateAttributes } = await db
    .prepare(updateAttributesStmt)
    .bind(`${value}`, `${trait_type}`)
    .run();
  let updateTxn: WaitableTransactionReceipt | undefined;
  try {
    await updateAttributes?.txn?.wait();
    updateTxn = updateAttributes?.txn;
  } catch (error) {
    throw new Error(`Failed to update attributes: ${error}`);
  }
  return updateTxn;
}
