import hre, { network } from "hardhat";
import { expect } from "chai";
import { describe, it } from "mocha";
import { getAccounts, getDatabase } from "@tableland/local";
import { networkConfig } from "../../helper-hardhat-config";
import { LovePoemV2, LovePoemV2__factory } from "../../typechain-types";
import { LovePoemV2Database } from "../../models";
import {
  createTables,
  getJoinedTable,
  prepareSqlForTables,
} from "../../scripts/v2";
import { retrieveMetadata } from "../../utils/retrieve-abi";
import {
  selectFromJoinedTable,
  updateAttributes,
} from "../../scripts/v2/prepareTables";
describe("LovePoemV2 Unit Tests", async function () {
  // Set a timeout for spinning up the Local Tableland instance during setup
  this.timeout(20000);

  let LovePoemV2Factory: LovePoemV2__factory;
  let lovePoemV2: LovePoemV2;

  let db: LovePoemV2Database;
  let mainLovePoemTableName: string;
  let attributesLovePoemTableName: string;

  const chainId = network.config.chainId!!;
  const accounts = getAccounts();
  const tablelandBaseURI = networkConfig?.[chainId]?.tablelandBaseURI!!;
  const mainTablePrefix: string = networkConfig?.[chainId]?.mainTablePrefix!!;
  const attributesTablePrefix: string =
    networkConfig?.[chainId]?.attributesTablePrefix!!;
  const mainTableSchema = `id int primary key, name text, description text, image text`;
  const attributesTableSchema = `main_id int not null, trait_type text not null, value text`;
  // const tablelandBaseURI = helpers.getBaseUrl(chainId);
  // const provider = getDefaultProvider(tablelandBaseURI);
  db = getDatabase(accounts?.[1]);

  before(async () => {
    LovePoemV2Factory = (await hre.ethers.getContractFactory(
      "LovePoemV2",
    )) as LovePoemV2__factory;
    console.log("Deploying LovePoemV2...");
    lovePoemV2 = await LovePoemV2Factory.deploy(
      tablelandBaseURI,
      mainTablePrefix,
      attributesTablePrefix,
    );
    await lovePoemV2.deployed();
    console.log(
      "LovePoemV2 deployed to: ",
      lovePoemV2.address,
      "by ",
      await lovePoemV2.owner(),
    );
  });

  it("Should create LovePoemV2 main table", async function () {
    mainLovePoemTableName = await createTables(
      mainTablePrefix,
      mainTableSchema,
      db,
    );

    expect(mainLovePoemTableName).to.equal(`${mainTablePrefix}_${chainId}_2`);
  });
  it("Should create LovePoemV2 attributes table", async function () {
    attributesLovePoemTableName = await createTables(
      attributesTablePrefix,
      attributesTableSchema,
      db,
    );
    expect(attributesLovePoemTableName).to.equal(
      `${attributesTablePrefix}_${chainId}_3`,
    );
  });
  it("Should join LovePoemV2 tables and insert original metadata", async function () {
    // Prep sql statements to join two tables & insert metadata
    const sqlInsertStatements = await prepareSqlForTables(
      mainLovePoemTableName,
      attributesLovePoemTableName,
    );

    for await (let statement of sqlInsertStatements) {
      const { main, attributes } = statement || {};
      const { meta: insertIntoMain } = await db.prepare(main).all();
      const insertIntoMainResult = await insertIntoMain.txn?.wait();
      if (insertIntoMain) {
        console.log("Inserted into main table: ", insertIntoMainResult);
      } else {
        console.log(
          "Failed to insert into main table: ",
          insertIntoMainResult?.error,
        );
      }
      // Insert attributes to attributes table corresponding to each main table row (id = main.id)
      for await (let attribute of attributes) {
        const { meta: insertIntoAttributes } = await db
          .prepare(attribute)
          .all();
        const insertIntoAttributesResult =
          await insertIntoAttributes.txn?.wait();
        if (insertIntoAttributes) {
          console.log(
            "Inserted into attributes table: ",
            insertIntoAttributesResult,
          );
        } else {
          console.log(
            "Failed to insert into attributes table: ",
            insertIntoAttributesResult,
          );
        }
        expect(insertIntoAttributesResult?.tableId).to.equal("3");
      }
      expect(insertIntoMainResult?.tableId).to.equal("2");
    }
  });
  it("Should get initial baseURI of LovePoemV2 same as tableland baseURI of given network", async function () {
    const lovePoemV2BaseURI = await lovePoemV2.getBaseURIString();
    expect(lovePoemV2BaseURI).to.equal(tablelandBaseURI);
  });
  it("Should mint a LovePoemV2 with tokenId", async function () {
    const mintLovePoemV2Token = await lovePoemV2.mint();
    const mintTxn = await mintLovePoemV2Token.wait();
    console.log("LovePoemV2 mint txn event args: ", mintTxn?.events?.[0]?.args);
    const mintReceipient = mintTxn?.events?.[0]?.args?.[1];
    const tokenId = mintTxn?.events?.[0]?.args?.[2];
    console.log(
      `\nLovePoemV2Token minted: tokenId '${tokenId.toNumber()}' to owner '${mintReceipient}'`,
    );
    const tokenURI = await lovePoemV2.tokenURI(tokenId);
    console.log(`'tokenURI' using token '${tokenId}' here:\n${tokenURI}`);
    expect(tokenId.toNumber()).to.equal(0);
  });
  it("Should return the joined LovePoemV2 table in JSON format equal to the original metaddata", async function () {
    const [joinedTable] = await getJoinedTable(
      db,
      mainLovePoemTableName,
      attributesLovePoemTableName,
    );
    const metadata = JSON.parse(JSON.stringify(joinedTable?.metadata));
    const retrievedOriginalMetadata = JSON.parse(retrieveMetadata("0")!!);

    expect(metadata).to.deep.equal(retrievedOriginalMetadata);
  });
  it("Should update the status attribute of LovePoemV2 to GATE_OPEN", async function () {
    await updateAttributes(
      db,
      attributesLovePoemTableName,
      "Status",
      "GATE_OPEN",
    );

    const selectAttributeStmt = `json_group_array(json_object('trait_type',trait_type,'value', value)) as attributes `;
    const [updatedAttributesObj] = await selectFromJoinedTable(
      db,
      mainLovePoemTableName,
      attributesLovePoemTableName,
      selectAttributeStmt,
    );
    const updatedAttribute = (
      updatedAttributesObj?.attributes as unknown as {
        trait_type: string;
        value: string;
      }[]
    )?.find(({ trait_type }) => trait_type === "Status");
    expect(updatedAttribute?.value).to.equal("GATE_OPEN");
  });
});
