import dotenv from "dotenv";
import { prepareMetadata } from "./prepareMetadata";
import { Statements } from "../../models/common.model";
dotenv.config();

/**
 * Generates SQL insert statements for two tables based on the prepared metadata.
 *
 * @param {string} mainTable - The name of the main table.
 * @param {string} attributesTable - The name of the attributes table.
 * @return {Promise<Statements>} An array of SQL insert statements.
 */
export async function prepareSqlForTables(
  mainTable: string,
  attributesTable: string,
): Promise<Statements> {
  const metadata = await prepareMetadata();

  const sqlInsertStatements: Statements = [];

  for await (let obj of metadata) {
    const { id, name, description, image, attributes } = obj || {};
    // INSERT statement for a 'main' table that includes some shared data across any NFT: id int, name text, description text, image text
    let mainTableStatement = `INSERT INTO ${mainTable} (id, name, description, image) VALUES (${id}, '${name}', '${description}', '${image}');`;
    const attributesTableStatements: string[] = [];
    for await (let attribute of attributes) {
      const { trait_type, value } = attribute || {};
      // INSERT statement for a separate 'attributes' table that holds attribute data, keyed by the NFT tokenId: id int, trait_type text, value text
      const attributesStatement = `INSERT INTO ${attributesTable} (main_id, trait_type, value) VALUES (${id}, '${trait_type}', '${value}');`;
      attributesTableStatements.push(attributesStatement);
    }
    const statement = {
      main: mainTableStatement,
      attributes: attributesTableStatements,
    } as { main: string; attributes: string[] };
    sqlInsertStatements.push(statement);
  }
  return sqlInsertStatements;
}
