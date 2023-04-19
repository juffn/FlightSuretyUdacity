var HDWalletProvider = require("@truffle/hdwallet-provider");
var mnemonic = "cabbage okay embrace major fortune ripple jeans impose east crew breeze crush";

module.exports = {
  networks: {
    development: {
      provider: function() {
        return new HDWalletProvider(mnemonic, "http://127.0.0.1:8545/", 0, 50);
      },
      network_id: '*',
      gas: 6721975
    }
  },
  compilers: {
    solc: {
      version: "^0.4.24"
    }
  }
};