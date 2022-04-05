/**
 * @type import('hardhat/config').HardhatUserConfig
 */

const fs = require("fs");
require("@nomiclabs/hardhat-truffle5");
require("@nomiclabs/hardhat-waffle");
require("solidity-coverage");

let secret = {url: "", key: "0".repeat(64)};
if (fs.existsSync("./secret.json")) {
  secret = require("./secret.json")
}


 module.exports = {
   solidity: {
     compilers: [
       {
         version: "0.8.11",
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
    rinkeby: {
      url: secret.url,
      accounts: [secret.key]
     }
   }
 };
 