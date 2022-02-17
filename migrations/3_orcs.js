const Orcs = artifacts.require("EtherOrcs");
const Zug = artifacts.require("Zug");
const Hyksos = artifacts.require("HyksosEtherorcs");

module.exports = async function (deployer) {
  await deployer.deploy(Orcs, {from: arguments[2][0]});
  await deployer.deploy(Zug, {from: arguments[2][0]});
  await deployer.deploy(Hyksos, Zug.address, Orcs.address, {from: arguments[2][0]});

  
  ZugDep = await Zug.deployed();
  await ZugDep.setMinter(Orcs.address, true, {from: arguments[2][0]});

  OrcsDep = await Orcs.deployed();
  await OrcsDep.setZug(Zug.address, {from: arguments[2][0]});
  await OrcsDep.setAdmin();
  await OrcsDep.setAuth(Hyksos.address, true);
  await OrcsDep.initMint(arguments[2][0], 0, 10);

  console.log("Orcs: %s \nZug: %s \nHyksos: %s \n", Orcs.address, Zug.address, Hyksos.address);
};

