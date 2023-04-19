var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Oracles', async (accounts) => {

  const TEST_ORACLES_COUNT = 20;
  var config;
  const truffleAssert = require('truffle-assertions');

    // Watch contract events
    const STATUS_CODE_UNKNOWN = 0;
    const STATUS_CODE_ON_TIME = 10;
    const STATUS_CODE_LATE_AIRLINE = 20;
    const STATUS_CODE_LATE_WEATHER = 30;
    const STATUS_CODE_LATE_TECHNICAL = 40;
    const STATUS_CODE_LATE_OTHER = 50;

    before('setup contract', async () => {
      config = await Test.Config(accounts);
  });


  it('can register oracles', async () => {
    let fee = await config.flightSuretyApp.REGISTRATION_FEE.call();

    for (let a = 1; a < TEST_ORACLES_COUNT; a++) {
      await config.flightSuretyApp.registerOracle({ from: accounts[a], value: fee });
      let result = await config.flightSuretyApp.getMyIndexes.call({ from: accounts[a] });
      console.log(`Oracle Registered: ${result[0]}, ${result[1]}, ${result[2]}`);
    }
  });

  it('can request flight status', async () => {
    let flight = 'ND1309';
    let timestamp = Math.floor(Date.now() / 1000);
    let STATUS_CODE_ON_TIME = 10;

    // Register the flight
    await config.flightSuretyData.registerFlight(config.firstAirline, flight, timestamp, { from: config.firstAirline });

    // Submit a request for oracles to get status information for a flight
    await config.flightSuretyApp.fetchFlightStatus(config.firstAirline, flight, timestamp);

    for (let a = 1; a < TEST_ORACLES_COUNT; a++) {
      let oracleIndexes = await config.flightSuretyApp.getMyIndexes.call({ from: accounts[a] });
      for (let idx = 0; idx < 3; idx++) {
        try {
          const tx = await config.flightSuretyApp.submitOracleResponse(oracleIndexes[idx], config.firstAirline, flight, timestamp, STATUS_CODE_ON_TIME, { from: accounts[a] });
          console.log(`Oracle ${a} submitted a response`)
          truffleAssert.eventEmitted(tx, 'FlightStatusInfo', (ev) => {
            console.log(`Oracle ${a} : FlightStatusInfo event emitted:`, {
              airline: ev.airline,
              flight: ev.flight,
              timestamp: ev.timestamp.toString(),
              status: ev.status.toString()
            });
          });
        } catch (e) {
        
        }
      }
    }
  });

  it('can request flight status and credits accounts when status is late', async () => {
    let flight = 'NJ2016';
    let timestamp = Math.floor(Date.now() / 1000);
    const STATUS_CODE_LATE_AIRLINE = 20;
    let passenger = accounts[5];

    // Register the flight
    await config.flightSuretyData.registerFlight(config.firstAirline, flight, timestamp, { from: config.firstAirline });

    // Submit a request for oracles to get status information for a flight
    await config.flightSuretyApp.fetchFlightStatus(config.firstAirline, flight, timestamp);

    // Buy insurance
    await config.flightSuretyData.buyInsurance(config.firstAirline, flight, timestamp, { from: passenger, value: web3.utils.toWei("1", "ether") });

    for (let a = 1; a < TEST_ORACLES_COUNT; a++) {
      let oracleIndexes = await config.flightSuretyApp.getMyIndexes.call({ from: accounts[a] });
      for (let idx = 0; idx < 3; idx++) {
        console.log(`Test Oracle ${a}`)
        try {
          const tx = await config.flightSuretyApp.submitOracleResponse(oracleIndexes[idx], config.firstAirline, flight, timestamp, STATUS_CODE_LATE_AIRLINE, { from: accounts[a] });
          console.log(`Oracle ${a} submitted a response`)
          truffleAssert.eventEmitted(tx, 'FlightStatusInfo', (ev) => {
            console.log(`Oracle ${a} : FlightStatusInfo event emitted:`, {
              airline: ev.airline,
              flight: ev.flight,
              timestamp: ev.timestamp.toString(),
              status: ev.status.toString()
            });
          });
        } catch (e) {
        }
      }
    }

    //getFlightkey
    let flightKey = await config.flightSuretyApp.getFlightKey(config.firstAirline, flight, timestamp);

    //getInsuredPassengers
    let insuredpassengers = await config.flightSuretyApp.getInsuredPassengers(flightKey, { from: config.firstAirline });

    //creditInsurees
    await config.flightSuretyData.creditInsurees(insuredpassengers, config.firstAirline, flight, timestamp, { from: config.firstAirline });
  });

});
