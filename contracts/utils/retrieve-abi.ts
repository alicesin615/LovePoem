import fs from "fs";
import path from "path";

export function retrieveAbi(contractName: string) {
  try {
    const dir = path.resolve(
      __dirname,
      `../artifacts/contracts/${contractName}.sol/${contractName}.json`,
    );
    const file = fs.readFileSync(dir, "utf8");
    const json = JSON.parse(file);
    const abi = json.abi;
    return abi;
  } catch (e) {
    console.log(`e`, e);
  }
}

export function retrieveMetadata(tokenId: string) {
  const dir = path.join(__dirname, "../metadata", `${tokenId}`);
  try {
    const file = fs.readFileSync(dir, "utf8");
    return file;
  } catch (e) {
    console.log(`e`, e);
  }
}
