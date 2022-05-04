async function main() {
  const zugAddress = "0xED350B20a213a14A99adC1F4173943cA2ed6fd9F"; 
  const orcsAddress = "0x0CEc2D691315BF182F47f7092755dAe149bDf1b9";
  const autoCompoundAddress = "0x50f8629dc1f7d8820c26b45908eF7Bc4fd6D7E9a"

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
    