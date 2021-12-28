const contracts = require("./contracts");

 // contracts.kongz_contract.methods.setYieldToken(contracts.bananas_address).send().then(function(result){console.log(result)})
// kongz_contract.methods.tokenNameByIndex(1).call().then(function(result){console.log(result)});

//contracts.kongz_contract.methods.getReward().send().then((result) => {console.log(result)});
 //contracts.bananas_contract.methods.balanceOf(account).call().then(function(result){console.log(result)});
// contracts.bananas_contract.methods.getTotalClaimable(contracts.pool_address).call().then(function(result){console.log(result)});
 // contracts.bananas_contract.methods.updateReward(account, zero_address, 0).send().then((result) => {console.log(result);});
// contracts.bananas_contract.methods.getReward(account).send().then(function(result){console.log(result)});


// contracts.kongz_contract.methods.approve(contracts.pool_address, 1001).send().then((result) => {console.log(result)});
// contracts.pool_contract.methods.lendKong(1001).send().then((result) => {console.log(result)});
 //contracts.bananas_contract.methods.balanceOf(account).call().then(function(result){console.log(result)});
// contracts.bananas_contract.methods.approve(contracts.pool_address, 3135000).send().then((result) => {console.log(result)});
// contracts.bananas_contract.methods.allowance(account, contracts.pool_contract).send().then((result) => {console.log(result)});
// contracts.pool_contract.methods.depositBananas(3135000).send().then((result) => {console.log(result)});

// contracts.pool_contract.methods.getBananaBalance().call().then((result) => {console.log(result)});
// contracts.pool_contract.methods.withdrawBananas().send().then((result) => {console.log(result)});
contracts.bananas_contract.methods.balanceOf(contracts.pool_address).call().then(function(result){console.log(result)});

// contracts.pool_contract.methods.withdrawKong(1001).send().then((result) => {console.log(result)});