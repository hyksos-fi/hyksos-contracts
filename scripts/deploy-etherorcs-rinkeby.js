async function main() {  
  const Orcs = await ethers.getContractFactory("EtherOrcs");
  const Zug = await ethers.getContractFactory("Zug");

  const orcs = await Orcs.deploy();
  const zug = await Zug.deploy();

  await orcs.setAdmin();
  await orcs.setZug(zug.address);
  await zug.setMinter(orcs.address, true);
      
  console.log("Orcs: %s \nZug: %s \n", orcs.address, zug.address);
}
    
main()
  .then(() => process.exit(0))
  .catch((error) => {
      console.error(error);
      process.exit(1);
});
    