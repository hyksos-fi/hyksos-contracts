const Kongz = artifacts.require("Kongz");
const Bananas = artifacts.require("YieldToken");
const Pool = artifacts.require("BananaPool");

module.exports = async function (deployer) {
  await deployer.deploy(Kongz, "kongz", "KGZ", ["Eren", "Dziku", "Gurisza"], [0, 1, 2], {from: arguments[2][0]});
  await deployer.deploy(Bananas, Kongz.address, {from: arguments[2][0]});
  await deployer.deploy(Pool, Bananas.address, Kongz.address, {from: arguments[2][0]});
  
  KongzDep = await Kongz.deployed();

  KongzDep.setYieldToken(Bananas.address, {from: arguments[2][0]});

  console.log("Kongz: %s \nBananas: %s \nPool: %s \n", Kongz.address, Bananas.address, Pool.address);
};

