const fs = require("fs");
const path = require("path");

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
