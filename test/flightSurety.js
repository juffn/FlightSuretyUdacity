var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');
const truffleAssert = require('truffle-assertions');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");
  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");           
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");   
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try 
      {
          await config.flightSurety.setTestingMode(true);
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);
  });

  it('Can register an Airline using registerAirline() if it is funded and there are less than 4 airlines', async () => {
        let newAirline = accounts[3];

        try {
            await config.flightSuretyData.registerAirline(newArline, "New Airline", { from: config.firstAirline });
        } catch (e) {
            console.log(e);
        }
 
        let result = await config.flightSuretyData.isAirline.call(newAirline);
        assert.equal(result, true, "Airline eligible to register another airline if funding is provided");
    });

  it('Cannot register an Airline using registerAirline() if it is funded and there are more than 4 airlines', async () => {
        let newAirline = config.testAddresses[4];
        let newAirline2 = config.testAddresses[5];
        let newAirline3 = config.testAddresses[6];
        let newAirline4 = config.testAddresses[7];
        let newAirline5 = config.testAddresses[8];

        try {
            await config.flightSuretyData.registerAirline(newAirline, "New Airline Name A", { from: config.firstAirline });
            await config.flightSuretyData.registerAirline(newAirline2, "New Airline Name B", { from: config.firstAirline });
            await config.flightSuretyData.registerAirline(newAirline3, "New Airline Name C", { from: config.firstAirline });
            await config.flightSuretyData.registerAirline(newAirline4, "New Airline Name D", { from: config.firstAirline });
        } catch (e) {
            console.log(e);
        }
        try {
            await config.flightSuretyData.registerAirline(newAirline5, "New Airline Name E", { from: config.firstAirline });
        } catch (e) {
            console.log(e);
        }

        let result = await config.flightSuretyData.isAirline.call(newAirline5);
        assert.equal(result, false, "Airline not eligible to register another airline if funding is provided and there are more than 4 airlines");
    });


  it('Register an Airline using registerAirline() if it receives enough votes', async () => {
        let newAirline = accounts[4];
        let fundingAmount = web3.utils.toWei("10", "ether");

        // Register and fund account[2] and account[3]
        await config.flightSuretyData.fund({ from: accounts[2], value: fundingAmount });

        await config.flightSuretyData.fund({ from: accounts[3], value: fundingAmount });

        // First vote for the new airline
        try {
            await config.flightSuretyData.registerAirline(newAirline, "New Airline Name", { from: accounts[2] });
        } catch (e) {
            console.log(e);
        }

        let result = await config.flightSuretyData.isAirline.call(newAirline);
        assert.equal(result, false, "Airline not eligible to be registered until it receives enough votes");

        // Second vote, reaching the required threshold for registration
        try {
            await config.flightSuretyData.registerAirline(newAirline, "New Airline Name", { from: accounts[3] });
        } catch (e) {
            console.log(e);
        }

        result = await config.flightSuretyData.isAirline.call(newAirline);
        assert.equal(result, true, "Airline eligible to be registered once it receives enough votes");
    });

  it('Buy insurance for a flight', async () => {
        let passenger = accounts[5];
        let flight = "NJ2016";
        let timestamp = Math.floor(Date.now() / 1000);
        let newAirline = accounts[3];

        // Register the flight
        await config.flightSuretyData.registerFlight(newAirline, flight, timestamp, { from: newAirline });

        let tx = await config.flightSuretyData.buyInsurance(newAirline, flight, timestamp, { from: passenger, value: web3.utils.toWei("1", "ether") });

        truffleAssert.eventEmitted(tx, 'InsurancePurchased', (ev) => {
            return ev.passenger === passenger;
        }, 'InsurancePurchased event should be emitted with correct parameters');
    });

  it('Accounts credited and withdraw insurance payout', async () => {
        let passenger = accounts[5];
        let flight = "NJ2016";
        let timestamp = Math.floor(Date.now() / 1000);
        let newAirline = accounts[3];

        // Register the flight
        await config.flightSuretyData.registerFlight(newAirline, flight, timestamp, { from: newAirline });

        // Buy insurance
        await config.flightSuretyData.buyInsurance(newAirline, flight, timestamp, { from: passenger, value: web3.utils.toWei("1", "ether") });

        //getFlightkey
        let flightKey = await config.flightSuretyApp.getFlightKey(newAirline, flight, timestamp);

        //setFlightStatus to 20
        await config.flightSuretyData.setFlightStatus(flightKey, 20, { from: config.firstAirline });

        //getInsuredPassengers
        let insuredpassengers = await config.flightSuretyApp.getInsuredPassengers(flightKey, { from: config.firstAirline });
        //creditInsurees
        await config.flightSuretyData.creditInsurees(insuredpassengers, newAirline, flight, timestamp, { from: config.firstAirline });

        let tx = await config.flightSuretyData.withdraw({ from: passenger });

        truffleAssert.eventEmitted(tx, 'PaymentWithdrawn!', (ev) => {
            return ev.passenger === passenger && ev.amount !== '0';
        }, 'PaymentWithdrawn event emitted with correct parameters');
    });
});

