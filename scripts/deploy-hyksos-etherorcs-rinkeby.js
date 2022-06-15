async function main() {
  const zugAddress = "0x71457Ed3B0cb7B73F1D8D03EA242FbFAE688CC35"; 
  const orcsAddress = "0xb60c71aB4A966f32491D6341D6184d4A5e6270B6";
  const autoCompoundAddress = "0x557E6C7Cfb0D33eb00ABdc827D9E85438Da72AcA"

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
    