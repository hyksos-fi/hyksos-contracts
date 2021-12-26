const Kongz = artifacts.require("Kongz");

module.exports = function (deployer) {
  deployer.deploy(Kongz, "kongz", "KGZ", ["Eren", "Dziku", "Gurisza"], [0, 1, 2]);
};

