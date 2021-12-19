const Kongz = artifacts.require("Kongz");

module.exports = function (deployer) {
  deployer.deploy(Kongz, "kongz", "KGZ", ["Eren", "Dziku", "Gurisza"], [0, 1, 2]);
  const kongz_instance = await Kongz.deployed();
};

