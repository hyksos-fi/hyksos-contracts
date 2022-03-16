async function main() {
  const zugAddress = "0x24f1D5449E96eD23bFaC217B53C5a4D73f537c8C"; 
  const orcsAddress = "0x71457Ed3B0cb7B73F1D8D03EA242FbFAE688CC35";

  const AutoCompound = await ethers.getContractFactory("AutoCompound");
  const Hyksos = await ethers.getContractFactory("HyksosEtherorcs");
  
  const autoCompound = await AutoCompound.deploy();
  const hyksos = await Hyksos.deploy(zugAddress, orcsAddress, autoCompound.address, 60, 80);
      
  console.log("AutoCompound: %s \nHyksosCK: %s \n", autoCompound.address, hyksos.address);
}
    
main()
  .then(() => process.exit(0))
  .catch((error) => {
      console.error(error);
      process.exit(1);
    });
    