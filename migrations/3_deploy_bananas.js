const Bananas = artifacts.require("YieldToken");
const Kongz = artifacts.require("Kongz");
module.exports = function (deployer) {
  deployer.deploy(Bananas, Kongz.address);
};

