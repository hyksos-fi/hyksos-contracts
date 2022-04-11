async function main() {  
    const AutoCompound = await ethers.getContractFactory("AutoCompound");
    const autoCompound = await AutoCompound.deploy();
        
    console.log("AutoCompound: %s", autoCompound.address);
  }
      
  main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
      });
      