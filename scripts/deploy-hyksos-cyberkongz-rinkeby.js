async function main() {
  const kongzAddress = "0xb1002D3dA512F82F8020C1aed1eC9B5a1Fb35296"; 
  const bananasAddress = "0xA70768852B80599E501249087c04b1e8BA9A608d";
  const autoCompoundAddress = "0xf22179b3fb95fDAb47f4DE2b055db70740889a9C"

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
  