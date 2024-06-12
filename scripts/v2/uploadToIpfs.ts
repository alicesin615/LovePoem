import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { create } from "@web3-storage/w3up-client";
import { AnyLink, FileLike } from "@web3-storage/w3up-client/types";
import { filesFromPaths } from "files-from-path";
import { Account } from "@web3-storage/w3up-client/account";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEB3_SPACE_KEY = process.env.WEB3_SPACE_KEY || "";
const WEB3_ACCOUNT = process.env.WEB3_ACCOUNT as `${string}@${string}`;

async function getFilesFromPath(path: string) {
  const files = await filesFromPaths([path]);
  console.log(`read ${files.length} file(s) from ${path}`);
  return files;
}

/**
 * Uploads images to IPFS using the provided client.
 *
 * @param {FileLike[]} images - Array of images to upload
 * @return {AnyLink} The CID of the uploaded directory
 */
async function uploadToIpfs(images: FileLike[]) {
  const client = await create();
  let account: Account | undefined = undefined;
  try {
    account = await client.login(WEB3_ACCOUNT);
  } catch (error) {
    console.error("Error loging in: ", error.message);
  }

  await client.setCurrentSpace(`did:key:${WEB3_SPACE_KEY}`);

  let directoryCid: AnyLink | undefined = undefined;
  try {
    directoryCid = await client.uploadDirectory(images);
  } catch (error) {
    console.error("Error uploading images: ", error.message);
  }

  console.log("directoryCid: ", directoryCid);
  return directoryCid;
}

/**
 * Parses a metadata file for a given ID, updates the image field with the IPFS CID, and writes the updated metadata file.
 *
 * @param {number} id - The ID of the metadata file to parse.
 * @param {string} metadataDirPath - The path to the directory containing metadata files.
 * @param {string} imagesDirPath - The path to the directory containing images.
 * @return {Object} The parsed metadata object with the image field updated to include the IPFS CID.
 */
async function parseMetadataFile(
  id: number,
  metadataDirPath: string,
  imagesDirPath: string,
): Promise<object> {
  const imagesPath = path.join(imagesDirPath, `${id}.jpeg`);
  const imageFiles = await getFilesFromPath(imagesPath);
  const imageCID = await uploadToIpfs(imageFiles);
  console.log("imageCID: ", imageCID);

  let metadataFile: Buffer = Buffer.from("");
  const metadataFilePath = path.join(metadataDirPath, `${id}`);
  try {
    metadataFile = await fs.promises.readFile(metadataFilePath);
  } catch (error) {
    console.error(`Error reading file in metadata directory: ${error.message}`);
  }
  const metadataJson = JSON.parse(metadataFile.toString());
  metadataJson.image = `https://${imageCID}.ipfs.w3s.link/`;

  const metadataFileBuffer = Buffer.from(JSON.stringify(metadataJson));
  try {
    await fs.promises.writeFile(metadataFilePath, metadataFileBuffer);
  } catch (error) {
    console.error(`Error writing file in metadata directory: ${error.message}`);
  }
  console.log("metadataJson: ", metadataJson);
  return metadataJson;
}

/**
 * Prepares the metadata by parsing each metadata file in the specified directory,
 * updating the image field with the IPFS CID, and adding a new field called `id` to each metadata object.
 * @example metadata/0 (omit the extension) | images/0.jpeg
 * @return {Promise<object[]>} An array of parsed metadata objects with the `id` field added.
 */
async function prepareMetadata() {
  const finalMetadata: object[] = [];
  const metadataDirPath = path.join(__dirname, "../../", "metadata");
  const imagesDirPath = path.join(__dirname, "../../", "images");

  const metadataFiles = await getFilesFromPath(metadataDirPath);
  for await (const file of metadataFiles) {
    let id = Number(file.name.replace(/^\//, ""));
    try {
      let metadataObj = await parseMetadataFile(
        id,
        metadataDirPath,
        imagesDirPath,
      );
      // Add a new field called `id`, which will be used during INSERTs as a unique row `id`
      metadataObj["id"] = Number(id);
      finalMetadata.push(metadataObj);
    } catch (error) {
      console.error(`Error parsing metadata file: ${error.message}`);
    }
  }
  console.log("finalMetadata: ", finalMetadata);
  return finalMetadata;
}
prepareMetadata()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
