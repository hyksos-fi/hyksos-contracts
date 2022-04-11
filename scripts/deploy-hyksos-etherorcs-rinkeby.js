async function main() {
  const zugAddress = "0x24f1D5449E96eD23bFaC217B53C5a4D73f537c8C"; 
  const orcsAddress = "0x71457Ed3B0cb7B73F1D8D03EA242FbFAE688CC35";
  const autoCompoundAddress = "0xf22179b3fb95fDAb47f4DE2b055db70740889a9C"

  const Hyksos = await ethers.getContractFactory("HyksosEtherorcs");

  const hyksosShort = await Hyksos.deploy(zugAddress, orcsAddress, autoCompoundAddress, 60, 80);
  const hyksosMed = await Hyksos.deploy(zugAddress, orcsAddress, autoCompoundAddress, 5 * 60, 60);
  const hyksosLong = await Hyksos.deploy(zugAddress, orcsAddress, autoCompoundAddress, 10 * 60, 50);  
  console.log("HyksosShort: %s \nHyksosMed: %s \nHyksosLong: %s", hyksosShort.address, hyksosMed.address, hyksosLong.address);
}
    
main()
  .then(() => process.exit(0))
  .catch((error) => {
      console.error(error);
      process.exit(1);
    });
    