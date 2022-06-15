/**
 * @type import('hardhat/config').HardhatUserConfig
 */

const fs = require("fs");
require("@nomiclabs/hardhat-truffle5");
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");

let secret = {urls: {goerli: "", polygon: "", ethereum: ""}, key: "0".repeat(64), apiKeys: {polygon: "", ethereum: ""}};
if (fs.existsSync("./secret.json")) {
  secret = require("./secret.json")
}


 module.exports = {
   solidity: {
     compilers: [
       {
         version: "0.8.10",
         settings: {
           optimizer: {
             enabled: true,
             runs: 200,
           }
         }
       },
       {
         version: "0.6.12",
         settings: {
           optimizer: {
             enabled: true,
             runs: 200,
           }
         }
       },
       {
         version: "0.7.0",
         settings: {
           optimizer: {
             enabled: true,
             runs: 200,
           }
         }
       },
       {
        version: "0.8.7",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          }
        }
      },
     ]
   },
   defaultNetwork: "hardhat",
   networks: {
    hardhat: {},
    goerli: {
      url: secret.urls.goerli,
      accounts: [secret.key],
      gas: 2000000,
      gasPrice: 30000000000,
     },
     polygon: {
      url: secret.urls.polygon,
      accounts: [secret.key]
     },
     ethereum: {
      url: secret.urls.ethereum,
      accounts: [secret.key]
     }
   },

   etherscan: {
    apiKey: {
      polygon: secret.apiKeys.polygon,
      ethereum: secret.apiKeys.ethereum,
    },
  }
 };
 