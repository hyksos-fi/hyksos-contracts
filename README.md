# Hyksos
Smart contracts for Hyksos ecosystem. Hyksos is a first self-repaying platform to lend and borrow in the non-fungible tokens (NFT) space. It's a next-gen scalable NFT financial P2P agreement protocol. Check out the documentation at [gitbook](https://app.gitbook.com/o/vtU0b8FUHl8ujmJcOVK2/s/ll2GVRaa5jdkYVfBqA4A/hyksos-overview).

## Architecture

Hyksos ecosystem is scalable in two ways. It can support multiple yield-bearing NFT projects, and multiple lending vaults can be used within one project. The smallest working Hyksos unit consists of two components:
- autoCompound contract - holds the information whether the given account uses autocompounding
- project-specific lending vault contract - lending/borrowing logic. Paired with a given yield-bearing NFT immutably on deployment.


## Deployment instructions
The project is built using hardhat framework. The repository contains two external contract suites (cyberkongz and etherorcs) used in testnet deployments. The following commands are used to build and deploy the project:
```
npm install
npx hardhat compile

# to run the tests:
npx hardhat test

# to run rinkeby deployment (create a secret.json file with `key` and `url` fields:
npx hardhat run scripts/deploy-autocompound.js --network rinkeby # remember to copy the deployment address into the scripts below
npx hardhat run scripts/deploy-hyksos-etherorcs-rinkeby.js --network rinkeby
npx hardhat run scripts/deploy-hyksos-cyberkongz-rinkeby.js --network rinkeby
```
