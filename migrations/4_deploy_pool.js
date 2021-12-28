const Pool = artifacts.require("BananaPool");
module.exports = function (deployer) {
  deployer.deploy(Pool, addrbananas, addrkongz);
};
