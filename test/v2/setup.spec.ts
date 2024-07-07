import { before, after } from "mocha";
import { LocalTableland } from "@tableland/local";

// Setup to start local tableland only once for all tests
const localTableland = new LocalTableland({ silent: false, verbose: false });

before(async function () {
  this.timeout(15000);
  await localTableland.start();
  console.log("started");
  await localTableland.isReady();
});

after(async function () {
  await localTableland.shutdown();
});
