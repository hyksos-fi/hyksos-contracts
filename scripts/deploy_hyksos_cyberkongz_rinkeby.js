async function main() {
  const kongzAddress = "0x1703FD04cBBadA787703C26446A99b062cE3e193"; 
  const bananasAddress = "0x0D293c104457675933feB107cdA873a7E0DD7c48";

  const AutoCompound = await ethers.getContractFactory("AutoCompound");
  const Hyksos = await ethers.getContractFactory("HyksosCyberkongz");

  const autoCompound = await AutoCompound.deploy();
  const hyksos = await Hyksos.deploy(bananasAddress, kongzAddress, autoCompound.address, 60, 80);
    
  console.log("AutoCompound: %s \nHyksosCK: %s \n", autoCompound.address, hyksos.address);
}
  
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
  