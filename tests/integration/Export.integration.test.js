const exportScript = require(`${__dirname}/../../scripts/Export.js`);
const fs = require('fs');
const algolia = require('algoliasearch');
const HttpsAgent = require('agentkeepalive').HttpsAgent;
const keepaliveAgent = new HttpsAgent({
  maxSockets: 1,
  maxKeepAliveRequests: 0, // no limit on max requests per keepalive socket
  maxKeepAliveTime: 30000, // keepalive for 30 seconds
});

const dataPath = `${__dirname}/../mocks/users.json`;
const tempDir = `${__dirname}/../temp`;
const hitsPath = `${tempDir}/algolia-index-algolia-cli-test-1.json`;
const hitsBaselinePath = `${tempDir}/algolia-cli-test-hits-baseline.js`;

const appId = process.env.ALGOLIA_TEST_APP_ID;
const apiKey = process.env.ALGOLIA_TEST_API_KEY;
const indexName = process.env.ALGOLIA_TEST_INDEX_NAME;

const client = algolia(appId, apiKey, keepaliveAgent);
const index = client.initIndex(indexName);

const program = {
  algoliaappid: appId,
  algoliaapikey: apiKey,
  algoliaindexname: indexName,
  outputpath: tempDir,
};

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

describe('Export command OK', () => {
  beforeAll(async done => {
    // Make temp dir for test output
    if (fs.existsSync(tempDir)) {
      if (fs.existsSync(hitsPath)) fs.unlinkSync(hitsPath);
      if (fs.existsSync(hitsBaselinePath)) fs.unlinkSync(hitsBaselinePath);
      fs.rmdirSync(tempDir);
    }
    fs.mkdirSync(tempDir);

    // Clear Algolia index, then add users objects
    const data = fs.readFileSync(dataPath, 'utf-8');
    await index.clearIndex();
    const content = await index.addObjects(JSON.parse(data));
    await index.waitTask(content.taskID);
    done();
  }, 60000);

  test(
    'export retrieves correct records',
    done => {
      const doneMsg = 'Done exporting index.';
      // Mock globabl console.log() function
      // Each time it's called check if import is logging "Done" message
      // If it is done, read newly written files to test data integrity
      global.console.log = jest.fn(async msg => {
        if (msg.match(doneMsg)) {
          await wait(10000);
          const hits = JSON.parse(fs.readFileSync(hitsPath, 'utf-8'));
          const hitsBaseline = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
          const found = hits.find(hit => hit.email === hitsBaseline[0].email);
          // Expectations
          expect(found).not.toBe(undefined);
          done();
        }
      });

      // Execute export
      exportScript.start(program);
    },
    60000
  );

  afterAll(async done => {
    // Remove temp dir for test output
    if (fs.existsSync(tempDir)) {
      if (fs.existsSync(hitsPath)) fs.unlinkSync(hitsPath);
      if (fs.existsSync(hitsBaselinePath)) fs.unlinkSync(hitsBaselinePath);
      fs.rmdirSync(tempDir);
    }

    // Clear Algolia index
    await index.clearIndex(done);
  }, 60000);
});
