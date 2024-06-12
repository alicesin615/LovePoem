import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { create } from "@web3-storage/w3up-client";
import {
  AnyLink,
  Client,
  FileLike,
  UnknownLink,
  UploadListSuccess,
} from "@web3-storage/w3up-client/types";
import { filesFromPaths } from "files-from-path";
import { Metadata } from "../../models/common.model";
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
async function uploadToIpfs(
  client: Client,
  images: FileLike[],
): Promise<AnyLink> {
  let directoryCid: UnknownLink;
  try {
    directoryCid = await client.uploadDirectory(images);
  } catch (error) {
    console.error("Error uploading images: ", error.message);
  }

  return directoryCid;
}

/**
 * Verifies if an image with the given CID has been successfully uploaded to IPFS using the provided js client.
 *
 * @param {Client} client - The js client instance to interact with the w3up platform
 * @param {string} cid - The CID (Content Identifier) of the image to verify against {UploadListSuccess}.
 * @return {Promise<boolean>} A boolean indicating whether the image has been successfully uploaded or not.
 */
async function verifyImageOnIpfs(
  client: Client,
  cid: string,
): Promise<boolean> {
  let verified = false;
  let uploadedList: UploadListSuccess | undefined = undefined;

  try {
    uploadedList = await client.capability.upload.list();
  } catch (error) {
    console.error("Error verifying image on IPFS: ", error.message);
  }

  if (uploadedList?.size) {
    verified = uploadedList?.before === cid;
  }

  return verified;
}

/**
 * Sets up the client by creating a new client, logging in with the web3 account,
 * and setting the current space to the specified Space DID {WEB3_SPACE_KEY}.
 *
 * @return {Promise<Client>} The client that has been set up locally with the web3 storage account.
 */
async function setUpClient(): Promise<Client> {
  const client = await create();
  try {
    await client.login(WEB3_ACCOUNT);
  } catch (error) {
    console.error("Error loging in: ", error.message);
  }

  try {
    await client.setCurrentSpace(`did:key:${WEB3_SPACE_KEY}`);
  } catch (error) {
    console.error(
      "Error setting up web3 storage client in local space: ",
      error.message,
    );
  }

  return client;
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
): Promise<Metadata> {
  const client = await setUpClient();
  const imagesPath = path.join(imagesDirPath, `${id}.jpeg`);
  const imageFiles = await getFilesFromPath(imagesPath);

  let metadataFile: Buffer = Buffer.from("");
  const metadataFilePath = path.join(metadataDirPath, `${id}`);
  try {
    metadataFile = await fs.promises.readFile(metadataFilePath);
  } catch (error) {
    console.error(`Error reading file in metadata directory: ${error.message}`);
  }

  const metadataJson = JSON.parse(metadataFile.toString());

  let verified = false;
  if (metadataJson.image) {
    const cid: string = metadataJson.image.match(
      /https:\/\/([a-zA-Z0-9]+)\.ipfs\.w3s\.link/,
    )?.[1];
    try {
      verified = await verifyImageOnIpfs(client, cid);
      console.log(`Verified image ${id} already uploaded on IPFS: ${verified}`);
    } catch (error) {
      console.error(`Error verifying image ${id} on IPFS:`, error.message);
    }
  }

  if (!verified) {
    const imageCID = await uploadToIpfs(client, imageFiles);
    metadataJson.image = `https://${imageCID}.ipfs.w3s.link/`;
  }

  const metadataFileBuffer = Buffer.from(JSON.stringify(metadataJson));
  try {
    await fs.promises.writeFile(metadataFilePath, metadataFileBuffer);
  } catch (error) {
    console.error(`Error writing file in metadata directory: ${error.message}`);
  }
  return metadataJson;
}

/**
 * Prepares the metadata by parsing each metadata file in the specified directory,
 * updating the image field with the IPFS CID, and adding a new field called `id` to each metadata object.
 * @example metadata/0 (omit the extension) | images/0.jpeg
 * @return {Promise<Metadata[]>} An array of parsed metadata objects with the `id` field added.
 */
export async function prepareMetadata(): Promise<Metadata[]> {
  const finalMetadata: Metadata[] = [];
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
