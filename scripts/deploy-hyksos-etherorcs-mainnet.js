async function main() {
    const zugAddress = "0xfEE5F54e1070e7eD31Be341e0A5b1E847f6a84Ab"; 
    const orcsAddress = "0x3aBEDBA3052845CE3f57818032BFA747CDED3fca";
    const autoCompoundAddress = "0xcF46D7482C75129C4CE4C2ddF25BcA842DEE3F97"

    const depositLengthDaysShort = 30;
    const depositLengthDaysMed = 60;
    const depositLengthDaysLong = 90;

    const roiPctgShort = 80;
    const roiPctgMed = 60;
    const roiPctgLong = 50;
  
    const Hyksos = await ethers.getContractFactory("HyksosEtherorcs");
  
    const hyksosShort = await Hyksos.deploy(zugAddress, orcsAddress, autoCompoundAddress, depositLengthDaysShort * 86400, roiPctgShort);
    const hyksosMed = await Hyksos.deploy(zugAddress, orcsAddress, autoCompoundAddress, depositLengthDaysMed * 86400, roiPctgMed);
    const hyksosLong = await Hyksos.deploy(zugAddress, orcsAddress, autoCompoundAddress, depositLengthDaysLong * 86400, roiPctgLong);  
    console.log("HyksosShort: %s \nHyksosMed: %s \nHyksosLong: %s", hyksosShort.address, hyksosMed.address, hyksosLong.address);

    await hre.run("verify:verify", {
      address: hyksosShort.address,
      constructorArguments: [
        zugAddress,
        orcsAddress,
        autoCompoundAddress,
        depositLengthDaysShort * 86400,
        roiPctgShort
      ],
    });

    await hre.run("verify:verify", {
      address: hyksosMed.address,
      constructorArguments: [
        zugAddress,
        orcsAddress,
        autoCompoundAddress,
        depositLengthDaysMed * 86400,
        roiPctgMed
      ],
    });

    await hre.run("verify:verify", {
      address: hyksosLong.address,
      constructorArguments: [
        zugAddress,
        orcsAddress,
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
      