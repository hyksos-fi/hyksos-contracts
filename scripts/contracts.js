const fs = require('fs');
const Web3 = require("web3")
const path = require("path");
let w3 = new Web3("http://localhost:8545");

if (w3.isConnected) {
    console.log("Not connected!");
} else {
    console.log("Connected");
}
const kongz_contract_json = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'build/contracts/Kongz.json'), 'utf8'));
const bananas_contract_json = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'build/contracts/YieldToken.json'), 'utf8'));
const pool_contract_json = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'build/contracts/BananaPool.json'), 'utf8'));


const bananas_address = "0x469c19Bed28745258875c6442c7780a74Ab7B0C1"
const kongz_address = "0x3f07f7187aA0E4bE06fffCb1f7f4c0fD78C4096B"
const pool_address = "0xa037547bCee40db9Bc896B921E0D7D9f3B09BA1d"
account = "0xAC233f2cbd598ebE808726FB28264BF4a4fe68DD"

zero_address = "0x0000000000000000000000000000000000000000";

const kongz_contract = new w3.eth.Contract(kongz_contract_json.abi, kongz_address, {from: account, gas: 1000000});
const bananas_contract = new w3.eth.Contract(bananas_contract_json.abi, bananas_address, {from: account});
const pool_contract = new w3.eth.Contract(pool_contract_json.abi, pool_address, {from: account, gas: 1000000});

module.exports = {
    kongz_contract: kongz_contract,
    bananas_contract: bananas_contract,
    pool_contract: pool_contract,
    account: account,
    zero_address: zero_address,
    bananas_address: bananas_address,
    pool_address: pool_address
}