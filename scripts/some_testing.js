contracts = require("./contracts");

//kongz_contract.methods.setYieldToken(bananas_address).send().then(function(result){console.log(result)})
// kongz_contract.methods.tokenNameByIndex(1).call().then(function(result){console.log(result)});

//kongz_contract.methods.getReward().send().then((result) => {console.log(result)});
 contracts.bananas_contract.methods.balanceOf(account).call().then(function(result){console.log(result)});
//bananas_contract.methods.getTotalClaimable(account).call().then(function(result){console.log(result)});
 //bananas_contract.methods.updateReward(account, zero_address, 0).send().then((result) => {console.log(result);});
  //bananas_contract.methods.getReward(account).send().then(function(result){console.log(result)});