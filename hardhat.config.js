/**
 * @type import('hardhat/config').HardhatUserConfig
 */

 require("@nomiclabs/hardhat-truffle5");


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
   }
 };
 