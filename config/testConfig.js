
var FlightSuretyApp = artifacts.require("FlightSuretyApp");
var FlightSuretyData = artifacts.require("FlightSuretyData");
var BigNumber = require('bignumber.js');

var Config = async function(accounts) {
    
    // These test addresses are useful when you need to add
    // multiple users in test scripts
    let testAddresses = [
        "0x69e1CB5cFcA8A311586e3406ed0301C06fb839a2",
        "0xF014343BDFFbED8660A9d8721deC985126f189F3",
        "0x0E79EDbD6A727CfeE09A2b1d0A59F7752d5bf7C9",
        "0x9bC1169Ca09555bf2721A5C9eC6D69c8073bfeB4",
        "0xa23eAEf02F9E0338EEcDa8Fdd0A73aDD781b2A86",
        "0x6b85cc8f612d5457d49775439335f83e12b8cfde",
        "0xcbd22ff1ded1423fbc24a7af2148745878800024",
        "0xc257274276a4e539741ca11b590b9447b26a8051",
        "0x2f2899d6d35b1a48a4fbdc93a37a72f264a9fca7",
        "0x4E7F8C77B81b9aA850e51C4Cf3A6DEdDE6FB3d04",
        "0xECCA1B627d7baB0BF79a7748Dc1EF5F12aCEaeD5",
        "0xe522a920b38933A2a19412303041A654bD7DFA9E",
        "0x3eeB1109236A122b1Dd2ba175D2b02Dde6f55A75",
        "0x19B4b0e7B310725584E8a3EC59921d95Ab6A9f44",
        "0x471C59F4c55231C1BBd79ae08294F2592837EbfC",
        "0x1336C3d7512E5d788Ba34BB3a985B937996695FE",
        "0x07E3703cA1c8bD1D0c515d2eFE1eF7B9c3860244",
        "0x3777213A93ec7548bA9ac78b3fCe73112673bfB4",
        "0x89E352aDDB2C7170FdF2BCC5c811b853660A27d2",
        "0x33546076557bd31F591829cbBdc64Bc61b3C0FbD"
    ];


    let owner = accounts[0];
    let firstAirline = accounts[1];

    let flightSuretyData = await FlightSuretyData.new();
    let flightSuretyApp = await FlightSuretyApp.new(flightSuretyData.address);

    
    return {
        owner: owner,
        firstAirline: firstAirline,
        weiMultiple: (new BigNumber(10)).pow(18),
        testAddresses: testAddresses,
        flightSuretyData: flightSuretyData,
        flightSuretyApp: flightSuretyApp
    }
}

module.exports = {
    Config: Config
};