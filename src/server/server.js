import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';

let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));

const app = express();
app.get('/api', (req, res) => {
  res.send({
    message: 'An API for use with your Dapp!'
  });
});

async function main() {
  const accounts = await web3.eth.getAccounts();
  web3.eth.defaultAccount = accounts[0];

  let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

  // Number of oracles to simulate
  const ORACLES_COUNT = 20;
  const STATUS_CODES = [0, 10, 20, 30, 40, 50];

  // Register oracles
  async function registerOracles() {
    let accounts = await web3.eth.getAccounts();
    let fee = await flightSuretyApp.methods.REGISTRATION_FEE().call();

    for (let i = 1; i <= ORACLES_COUNT; i++) {
      let account = accounts[i];
      await flightSuretyApp.methods.registerOracle().send({ from: account, value: fee, gas: 900000 });

      let indexes = await flightSuretyApp.methods.getMyIndexes().call({ from: account });
      console.log(`Oracle ${account} registered with indexes ${indexes}`);
    }

  }

  // Listen for OracleRequest event
  flightSuretyApp.events.OracleRequest({
    fromBlock: 0
  }, async function (error, event) {
    if (error) console.log(error);

    console.log("OracleRequest event detected:", event);

    let requestData = event.returnValues;
    let index = requestData.index;
    let airline = requestData.airline;
    let flight = requestData.flight;
    let timestamp = requestData.timestamp;

    // Have oracles submit their responses
    let accounts = await web3.eth.getAccounts();

    for (let i = 1; i <= ORACLES_COUNT; i++) {
      let account = accounts[i];
      let oracleIndexes = await flightSuretyApp.methods.getMyIndexes().call({ from: account });

      if (oracleIndexes.includes(index)) {
        let statusCode = STATUS_CODES[Math.floor(Math.random() * STATUS_CODES.length)]; // Choose a random status code

        try {
          await flightSuretyApp.methods.submitOracleResponse(index, airline, flight, timestamp, statusCode)
            .send({ from: account, gas: 900000 });

          console.log(`Oracle ${account} submitted status code ${statusCode}`);
        } catch (error) {
          console.log(`Oracle ${account} failed to submit status code ${statusCode}`);
        }
      }
    }
  });

  // Register oracles when the server starts
  await registerOracles();
}

main().catch((error) => {
  console.error('Error:', error);
});


