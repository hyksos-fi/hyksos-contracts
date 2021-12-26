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
const bananas_address = "0x8e5ca1e05674c8071e8D269883ebb20C4354C4A9"
const kongz_address = "0x4AB7BAA26CC0146c9604F2137821213E13FEb31A"
account = "0xfD2D7E5d02AC9C6e334F8B11f530E0a4ef69f5F3"
zero_address = "0x0000000000000000000000000000000000000000";
const kongz_contract = new w3.eth.Contract(kongz_contract_json.abi, kongz_address, {from: account, gas: 1000000});
const bananas_contract = new w3.eth.Contract(bananas_contract_json.abi, bananas_address, {from: account});

//kongz_contract.methods.setYieldToken(bananas_address).send().then(function(result){console.log(result)})
// kongz_contract.methods.tokenNameByIndex(1).call().then(function(result){console.log(result)});

//kongz_contract.methods.getReward().send().then((result) => {console.log(result)});
 bananas_contract.methods.balanceOf(account).call().then(function(result){console.log(result)});
//bananas_contract.methods.getTotalClaimable(account).call().then(function(result){console.log(result)});
 //bananas_contract.methods.updateReward(account, zero_address, 0).send().then((result) => {console.log(result);});
  //bananas_contract.methods.getReward(account).send().then(function(result){console.log(result)});