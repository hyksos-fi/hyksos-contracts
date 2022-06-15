async function main() {
  const kongzAddress = "0x0D293c104457675933feB107cdA873a7E0DD7c48"; 
  const bananasAddress = "0x5D604AbDaDCe2B0E12970D8089C5Ac4BcADD1800";
  const autoCompoundAddress = "0xD2A1Ba81a88E2987b0fe5614adc94BE3782Ef9d0"

  const Hyksos = await ethers.getContractFactory("HyksosCyberkongz");

  const hyksosShort = await Hyksos.deploy(bananasAddress, kongzAddress, autoCompoundAddress, 60, 80);
  const hyksosMed = await Hyksos.deploy(bananasAddress, kongzAddress, autoCompoundAddress, 5 * 60, 60);
  const hyksosLong = await Hyksos.deploy(bananasAddress, kongzAddress, autoCompoundAddress, 10 * 60, 50);  
  console.log("HyksosShort: %s \nHyksosMed: %s \nHyksosLong: %s", hyksosShort.address, hyksosMed.address, hyksosLong.address);
}
  
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
  