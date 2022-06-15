async function main() {
    const kongzAddress = "0x57a204aa1042f6e66dd7730813f4024114d74f37"; 
    const bananasAddress = "0x86cc33dbe3d2fb95bc6734e1e5920d287695215f";
    const autoCompoundAddress = "0xcF46D7482C75129C4CE4C2ddF25BcA842DEE3F97"

    const depositLengthDaysShort = 30;
    const depositLengthDaysMed = 60;
    const depositLengthDaysLong = 90;

    const roiPctgShort = 80;
    const roiPctgMed = 60;
    const roiPctgLong = 50;
  
    const Hyksos = await ethers.getContractFactory("HyksosCyberkongz");
  
    const hyksosShort = await Hyksos.deploy(bananasAddress, kongzAddress, autoCompoundAddress, depositLengthDaysShort * 86400, roiPctgShort);
    const hyksosMed = await Hyksos.deploy(bananasAddress, kongzAddress, autoCompoundAddress, depositLengthDaysMed * 86400, roiPctgMed);
    const hyksosLong = await Hyksos.deploy(bananasAddress, kongzAddress, autoCompoundAddress, depositLengthDaysLong * 86400, roiPctgLong);  
    console.log("HyksosShort: %s \nHyksosMed: %s \nHyksosLong: %s", hyksosShort.address, hyksosMed.address, hyksosLong.address);
    
    await hre.run("verify:verify", {
        address: hyksosShort.address,
        constructorArguments: [
          bananasAddress,
          kongzAddress,
          autoCompoundAddress,
          depositLengthDaysShort * 86400,
          roiPctgShort
        ],
    });

    await hre.run("verify:verify", {
        address: hyksosMed.address,
        constructorArguments: [
          bananasAddress,
          kongzAddress,
          autoCompoundAddress,
          depositLengthDaysMed * 86400,
          roiPctgMed
        ],
    });

    await hre.run("verify:verify", {
        address: hyksosLong.address,
        constructorArguments: [
          bananasAddress,
          kongzAddress,
          autoCompoundAddress,
          depositLengthDaysLong * 86400,
          roiPctgLong
        ],
    });
  }
      
  main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
      });
      