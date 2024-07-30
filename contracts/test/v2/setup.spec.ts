import { before, after } from "mocha";
import { LocalTableland } from "@tableland/local";

// Setup to start local tableland only once for all tests
const localTableland = new LocalTableland({ silent: true, verbose: false });

before(async function () {
  this.timeout(15000);
  await localTableland.start();
  console.log("Starting local tableland...");
  await localTableland.isReady();
});

after(async function () {
  console.log("Shutting down local tableland...");
  await localTableland.shutdown();
});
