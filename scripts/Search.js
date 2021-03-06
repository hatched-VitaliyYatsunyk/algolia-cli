const fs = require('fs');
const path = require('path');
const algolia = require('algoliasearch');
const HttpsAgent = require('agentkeepalive').HttpsAgent;
const keepaliveAgent = new HttpsAgent({
  maxSockets: 1,
  maxKeepAliveRequests: 0, // no limit on max requests per keepalive socket
  maxKeepAliveTime: 30000, // keepalive for 30 seconds
});
const Base = require('./Base.js');

class SearchScript extends Base {
  constructor() {
    super();
    // Bind class methods
    this.start = this.start.bind(this);
    this.parseSearchOptions = this.parseSearchOptions.bind(this);
    this.writeOutput = this.writeOutput.bind(this);
    // Define validation constants
    this.message =
      '\nExample: $ algolia getsettings -a algoliaappid -k algoliaapikey -n algoliaindexname -q query -p searchparams -o outputpath\n\n';
    this.params = ['algoliaappid', 'algoliaapikey', 'algoliaindexname'];
  }

  parseSearchOptions(params) {
    return params === null ? {} : JSON.parse(params);
  }

  async writeOutput(outputFilepath, content) {
    const defaultFilepath = path.resolve(process.cwd(), 'search-results.json');
    const filepath = this.normalizePath(outputFilepath);
    const dir = path.dirname(filepath);
    if (!fs.lstatSync(dir).isDirectory()) {
      throw new Error(
        `Output path must target valid directory. Eg. ${defaultFilepath}`
      );
    } else {
      await fs.writeFileSync(filepath, content);
    }
  }

  async start(program) {
    try {
      // Validate command; if invalid display help text and exit
      this.validate(program, this.message, this.params);

      // Config params
      const appId = program.algoliaappid;
      const apiKey = program.algoliaapikey;
      const indexName = program.algoliaindexname;
      const query = program.query || '';
      const params = program.params || null;
      const outputPath = program.outputpath || null;

      // Get options
      const options = this.parseSearchOptions(params);

      // Instantiate Algolia index
      const client = algolia(appId, apiKey, keepaliveAgent);
      const index = client.initIndex(indexName);
      // Get index settings
      const result = await index.search(query, options);
      const output = JSON.stringify(result);
      return outputPath === null
        ? console.log(output)
        : await this.writeOutput(outputPath, output);
    } catch (e) {
      throw e;
    }
  }
}

const searchScript = new SearchScript();
module.exports = searchScript;
