async function main() {  
    const Kongz = await ethers.getContractFactory("Kongz");
    const Bananas = await ethers.getContractFactory("contracts/kongz/YieldToken.sol:YieldToken");
  
    const kongz = await Kongz.deploy("kongz", "KGZ", ["A", "B", "C"], [0, 1, 2]);
    const bananas = await Bananas.deploy(kongz.address);
  
    await kongz.setYieldToken(bananas.address);
        
    console.log("Kongz: %s \nBananas: %s \n", kongz.address, bananas.address);
  }
      
  main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
  });
      