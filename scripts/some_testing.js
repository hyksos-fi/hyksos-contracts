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
const bananas_address = "0x234815bBF640A6Bc9E8C4595cA2D7393f2609B84"
const kongz_address = "0x0C9c8c3Da20194C29541fcd36Cd141d66826F892"
w3.eth.Contract.defaultAccount = "0xf09795acDbd858f5DBab49e386BA93D510c46c29"
const kongz_contract = new w3.eth.Contract(kongz_contract_json.abi, kongz_address, {from: "0xf09795acDbd858f5DBab49e386BA93D510c46c29"});

const res = kongz_contract.methods.setYieldToken(bananas_address).send().then(function(result){console.log(result)})
const res2 = kongz_contract.methods.tokenNameByIndex(0).call().then(function(result){console.log(result)});