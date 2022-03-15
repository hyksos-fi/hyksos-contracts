const AutoCompound = artifacts.require("AutoCompound");
const Orcs = artifacts.require("EtherOrcs");
const Zug = artifacts.require("Zug");
const Hyksos = artifacts.require("HyksosEtherorcs");


web3.extend({
  property: 'evm',
  methods: [{
      name: 'increaseTime',
      call: 'evm_increaseTime',
      params: 1
  },{
    name: 'mine',
    call: 'evm_mine',
    params: 0
  }]
});

const EXCEPTION = "VM Exception while processing transaction:";
const assertException = async promise => {
  try {
    await promise
    throw null;
  } catch (error) {
    assert(error, "Expected an error but did not get one");
    assert(error.message.startsWith(EXCEPTION), "Expected VM revert error, but got: " + error.message)
  }
}


contract("HyksosEtherorcs test", async () => {
  let orcs, zug, hyksos, accounts;
  
  before(async function () {
    accounts = await web3.eth.getAccounts();
    orcs = await Orcs.new();
    Orcs.setAsDeployed(orcs, {from: accounts[0]});
    zug = await Zug.new({from: accounts[0]});
    Zug.setAsDeployed(zug);
    autoCompound = await AutoCompound.new({from: accounts[0]});
    AutoCompound.setAsDeployed(autoCompound);
    hyksos = await Hyksos.new(zug.address, orcs.address, autoCompound.address, 10 * 86400, 80, {from: accounts[0]});
    Hyksos.setAsDeployed(hyksos);

    await orcs.setAdmin({from: accounts[0]});
    await orcs.setZug(zug.address, {from: accounts[0]});
    await orcs.initMint(accounts[0], 0, 3, {from: accounts[0]});
    await zug.setMinter(orcs.address, true);
    
    console.log("Orcs: %s \nZug: %s \nHyksos: %s \n", orcs.address, zug.address, hyksos.address);
  });

  it("Sanity", async () => {

    assert.equal(await orcs.ownerOf(0), accounts[0])
    assert.equal(await orcs.ownerOf(1), accounts[0])
    assert.equal(await orcs.ownerOf(2), accounts[0])
    await orcs.transferFrom(accounts[0], accounts[1], 0, {from: accounts[0], gas: 1000000})
    await orcs.transferFrom(accounts[0], accounts[1], 1, {from: accounts[0], gas: 1000000})
    await orcs.transferFrom(accounts[0], accounts[1], 2, {from: accounts[0], gas: 1000000})
    assert.equal(await orcs.ownerOf(0), accounts[1])
    assert.equal(await orcs.ownerOf(1), accounts[1])
    assert.equal(await orcs.ownerOf(2), accounts[1])

    await orcs.updateOrc(0, 0, 0, 0, 0, 0, 0, 0, {from: accounts[1]});
    await orcs.updateOrc(1, 0, 0, 0, 0, 0, 1, 0, {from: accounts[1]});
    await orcs.updateOrc(2, 0, 0, 0, 0, 0, 2, 0, {from: accounts[1]});

    await orcs.doAction(0, 1, {from: accounts[1]});
    await orcs.doAction(1, 1, {from: accounts[1]});
    await orcs.doAction(2, 1, {from: accounts[1]});
    
    web3.evm.increaseTime(100 * 86400);
    web3.evm.mine();
    const claimable0 = await orcs.claimable(0);
    const claimable1 = await orcs.claimable(1);
    const claimable2 = await orcs.claimable(2);
    assert(claimable0.gte(web3.utils.toBN(web3.utils.toWei('400', 'ether'))), "Incorrect claimable amount");
    assert(claimable1.gte(web3.utils.toBN(web3.utils.toWei('500', 'ether'))), "Incorrect claimable amount");
    assert(claimable2.gte(web3.utils.toBN(web3.utils.toWei('600', 'ether'))), "Incorrect claimable amount");
    await orcs.claim([0, 1, 2], {from: accounts[1], gas: 1e6});
    assert((await zug.balanceOf(accounts[1])).gte(web3.utils.toBN(web3.utils.toWei('1500', 'ether'))));

  });

  it("Disable autocompounding", async () => {
    for (let i = 0; i < 20; i++) {
      assert(await autoCompound.getStrategy(accounts[i]));
      await autoCompound.setStrategy(false, {from: accounts[i]})
      assert(!(await autoCompound.getStrategy(accounts[i])));
    }

  });

  it("Deposit and withdraw zug from Hyksos", async () => {
    const initialBalance = await zug.balanceOf(accounts[1]);
    await zug.approve(hyksos.address, web3.utils.toWei('500', 'ether'), {from: accounts[1]})
    await assertException(hyksos.depositErc20(web3.utils.toWei('1000', 'ether'), { from: accounts[1]}))
    await hyksos.depositErc20(web3.utils.toWei('500', 'ether'), { from: accounts[1]});
    assert.equal((await hyksos.erc20Balance(accounts[1])).toString(10), web3.utils.toWei('500', 'ether'));
    assert.equal((await zug.balanceOf(accounts[1])).toString(10), initialBalance.sub(web3.utils.toBN(web3.utils.toWei('500', 'ether'))).toString(10));
    await hyksos.withdrawErc20(await hyksos.erc20Balance(accounts[1]), { from: accounts[1]});
    assert.equal((await hyksos.erc20Balance(accounts[1])).toString(10), "0");
    assert.equal((await zug.balanceOf(accounts[1])).toString(10), initialBalance.toString(10));
  });

  it("Simple Orc deposit", async () => {

    console.log("transfer Orc to account 2, to avoid confusion")
    await orcs.doAction(0, 0, {from: accounts[1]});
    await orcs.transferFrom(accounts[1], accounts[2], 0, {from: accounts[1], gas: 1e6})
    assert.equal(await orcs.ownerOf(0), accounts[2])
    
    console.log("verify that deposit is not possible with empty deposit queue")
    const orcApprovalSummary = await orcs.approve(hyksos.address, 0,  {from: accounts[2]});
    await assertException(hyksos.depositNft(0, {from: accounts[2], gas: 1e6}))
    
    console.log("deposit 1000 zug into Hyksos from account 2 and verify amount")
    assert.equal((await zug.balanceOf(accounts[2])).toString(10), "0");
    const zugApprovalSummary = await zug.approve(hyksos.address, web3.utils.toWei('1008', 'ether'), {from: accounts[1]})
    const zugDepositSummary = await hyksos.depositErc20(web3.utils.toWei('1008', 'ether'), { from: accounts[1]});
    assert.equal((await hyksos.erc20Balance(accounts[1])).toString(10), web3.utils.toWei('1008', 'ether'));
    
    console.log("deposit an Orc into Hyksos from account 2")
    const orcLendSummary = await hyksos.depositNft(0, {from: accounts[2], gas: 1e6})
    
    console.log("verify that the Orc lender has received his reward")
    assert.equal((await zug.balanceOf(accounts[2])).toString(10), web3.utils.toWei('32', 'ether'));
    
    console.log("verify that it's impossible to withdraw an Orc before the due date")
    web3.evm.increaseTime(5 * 86400);
    await assertException(hyksos.withdrawNft(0, {from: accounts[2], gas: 1e6}))
    console.log("withdraw an Orc after the due date")
    web3.evm.increaseTime(5 * 86400 + 1);
    const orcWithdrawalSummary = await hyksos.withdrawNft(0, {from: accounts[2], gas: 1e6})
    console.log("verify that the zug donor has received their reward.")
    assert((await zug.balanceOf(accounts[1])).gte(web3.utils.toBN(web3.utils.toWei((1500 - 1008 + 40).toString(), 'ether'))), "Zug donor has not received their reward: " + await zug.balanceOf(accounts[1]));

    console.log("verify there's a correct amount of zug left in Hyksos")
    assert((await hyksos.erc20Balance(accounts[1])).toString(10) == web3.utils.toWei('976', 'ether'));

    console.log("Gas summary:\nOrc deposit: %d\nOrc withdrawal: %d\nZug deposit: %d", 
                orcApprovalSummary['receipt']['cumulativeGasUsed'] + orcLendSummary['receipt']['cumulativeGasUsed'],
                orcWithdrawalSummary['receipt']['cumulativeGasUsed'], 
                zugApprovalSummary['receipt']['cumulativeGasUsed'] + zugDepositSummary['receipt']['cumulativeGasUsed'] )


    /* Deposit queue state after the test:
    [0] accounts[1] 974
    */
  });
  it("Complex Orc deposits", async () => {

    assert.equal((await hyksos.totalErc20()).toString(10), web3.utils.toWei('976', 'ether'));
    console.log("976 / 32 = 30 more Orc deposits should be possible")

    for (let i = 0; i < 30; i++) {
      await orcs.approve(hyksos.address, 0,  {from: accounts[2]});
      await hyksos.depositNft(0, {from: accounts[2], gas: 1e6})
      web3.evm.increaseTime(10 * 86400 + 1);
      await hyksos.withdrawNft(0, {from: accounts[2], gas: 1e6})
    }
    console.log("31st deposit shouldn't be possible, (16 zug left in Hyksos)")
    assert.equal((await hyksos.totalErc20()).toString(10), web3.utils.toWei('16', 'ether'));
    await assertException(hyksos.depositNft(0, {from: accounts[2], gas: 1e6}))

    console.log("share account 1 funds across multiple accounts to build a bigger deposit queue. Deposit the funds into Hyksos")
    for (let i = 3; i < 20; i++) {
      await zug.transfer(accounts[i], web3.utils.toWei('4', 'ether'), {from: accounts[1], gas: 1e6})
      await zug.approve(hyksos.address, web3.utils.toWei('4', 'ether'), {from: accounts[i]})
      await hyksos.depositErc20(web3.utils.toWei('4', 'ether'), { from: accounts[i]});
      assert.equal((await hyksos.erc20Balance(accounts[i])).toString(10), web3.utils.toWei('4', 'ether'));
      assert.equal((await zug.balanceOf(accounts[i])).toString(10), "0");
    }
    
    console.log("Orc deposit should now be possible")
    await orcs.approve(hyksos.address, 0,  {from: accounts[2]});
    await hyksos.depositNft(0, {from: accounts[2], gas: 1e6})
    
    console.log("withdraw Orc and verify that only accounts 3, 4, 5, 6 have received at least 5 zug in rewards")
    web3.evm.increaseTime(10 * 86400 + 1);
    await hyksos.withdrawNft(0, {from: accounts[2], gas: 1e6})
    for (let i = 3; i < 7; i++) {
      assert((await zug.balanceOf(accounts[i])).gte(web3.utils.toBN(web3.utils.toWei('5', 'ether'))), "Not enough reward on account " + i + ": " + (await zug.balanceOf(accounts[i])).toString(10));
    }
    for (let i = 7; i < 20; i++) {
      assert((await zug.balanceOf(accounts[i])).toString(10) == "0", "Unexpected reward on account " + i + ": " + (await zug.balanceOf(accounts[i])).toString(10)); // refactor
    }

    console.log("Withdraw zug of account 9 to make a gap in deposit queue. Send them to account 1")
    const zugWithdrawalSummary = await hyksos.withdrawErc20(await hyksos.erc20Balance(accounts[9]), { from: accounts[9]});
    await zug.transfer(accounts[1], web3.utils.toWei("4", "ether"), {from: accounts[9]});
    assert.equal((await zug.balanceOf(accounts[9])).toString(10), "0");
    
    console.log("Deposit Orc once again and verify that addresses 7, 8, 10, 11, 12, 13, 14, 15 received rewards (31st deposit)")
    const orcApprovalSummary = await orcs.approve(hyksos.address, 0,  {from: accounts[2]});
    const orcLendSummary = await hyksos.depositNft(0, {from: accounts[2], gas: 1e6})
    web3.evm.increaseTime(10 * 86400 + 1);
    const orcWithdrawalSummary = await hyksos.withdrawNft(0, {from: accounts[2], gas: 1e6})
    for (const i of [7, 8, 10, 11, 12, 13, 14, 15]) {
      assert((await zug.balanceOf(accounts[i])).gte(web3.utils.toBN(web3.utils.toWei('5', 'ether'))), "No reward on account " + i);
    }
    assert((await zug.balanceOf(accounts[9])).toString(10) == "0", "Unexpected reward on account 9" + ": " + (await zug.balanceOf(accounts[9])).toString(10)); // refactor
    for (let i = 16; i < 20; i++) {
      assert((await zug.balanceOf(accounts[i])).toString(10) == "0", "Unexpected reward on account " + i + ": " + (await zug.balanceOf(accounts[i])).toString(10)); // refactor);
    }

    console.log("verify that no account has received a reward too big")
    for (let i = 3; i < 20; i++) {
      assert((await zug.balanceOf(accounts[i])).lte(web3.utils.toBN(web3.utils.toWei('5.1', 'ether'))), "More than single reward on account " + i + ": " + (await zug.balanceOf(accounts[i])).toString(10)); // refactor);
    }

    console.log("verify that account 2 has received 32 * 14 zug in total")
    assert((await zug.balanceOf(accounts[2])).gte(web3.utils.toBN(web3.utils.toWei((32 * 14).toString(), 'ether'))), "Wrong reward");

    console.log("Gas summary:\nOrc deposit: %d\nOrc withdrawal: %d\nZug withdrawal: %d", 
                orcApprovalSummary['receipt']['cumulativeGasUsed'] + orcLendSummary['receipt']['cumulativeGasUsed'],
                orcWithdrawalSummary['receipt']['cumulativeGasUsed'], 
                zugWithdrawalSummary['receipt']['cumulativeGasUsed'] )
  });

    /* Deposit queue state after the test:
    [0] accounts[16] 4
    [1] accounts[17] 4
    [2] accounts[18] 4
    [3] accounts[19] 4
    */

  it("Late Orc withdrawal", async () => {

    console.log("Transfer 16 more zug from account 1 to 19, then deposit them into the pool.")
    await zug.transfer(accounts[19], web3.utils.toWei('16', 'ether'), {from: accounts[1], gas: 1e6})
    await zug.approve(hyksos.address, web3.utils.toWei('16', 'ether'), {from: accounts[19]})
    await hyksos.depositErc20(web3.utils.toWei('16', 'ether'), { from: accounts[19]});
    assert.equal((await hyksos.erc20Balance(accounts[19])).toString(10), web3.utils.toWei('20', 'ether'));
    assert.equal((await hyksos.totalErc20()).toString(10), web3.utils.toWei('32', 'ether'));
    
    console.log("Deposit Orc")
    const orcApprovalSummary = await orcs.approve(hyksos.address, 0,  {from: accounts[2]});
    const orcLendSummary = await hyksos.depositNft(0, {from: accounts[2], gas: 1e6})

    console.log("Increase time by twice the deposit length.")
    web3.evm.increaseTime(20 * 86400 + 1);

    console.log("Withdraw NFT from one of the shareholder accounts and verify rewards.")
    const orcWithdrawalSummary = await hyksos.withdrawNft(0, {from: accounts[16], gas: 1e6})
    assert((await zug.balanceOf(accounts[16])).gte(web3.utils.toBN(web3.utils.toWei('45', 'ether'))), "Reward too small on account 16: " + (await zug.balanceOf(accounts[16])).toString(10)); // refactor
    assert((await zug.balanceOf(accounts[16])).lte(web3.utils.toBN(web3.utils.toWei('45.1', 'ether'))), "Reward too big on account 16: " + (await zug.balanceOf(accounts[16])).toString(10)); // refactor
    assert((await zug.balanceOf(accounts[17])).gte(web3.utils.toBN(web3.utils.toWei('5', 'ether'))), "Reward too small on account 17: " + (await zug.balanceOf(accounts[17])).toString(10)); // refactor
    assert((await zug.balanceOf(accounts[17])).lte(web3.utils.toBN(web3.utils.toWei('5.1', 'ether'))), "Reward too big on account 17: " + (await zug.balanceOf(accounts[17])).toString(10)); // refactor
    assert((await zug.balanceOf(accounts[18])).gte(web3.utils.toBN(web3.utils.toWei('5', 'ether'))), "Reward too small on account 18: " + (await zug.balanceOf(accounts[18])).toString(10)); // refactor
    assert((await zug.balanceOf(accounts[18])).lte(web3.utils.toBN(web3.utils.toWei('5.1', 'ether'))), "Reward too big on account 18: " + (await zug.balanceOf(accounts[18])).toString(10)); // refactor
    assert((await zug.balanceOf(accounts[19])).gte(web3.utils.toBN(web3.utils.toWei('25', 'ether'))), "Reward too small on account 19: " + (await zug.balanceOf(accounts[19])).toString(10)); // refactor
    assert((await zug.balanceOf(accounts[19])).lte(web3.utils.toBN(web3.utils.toWei('25', 'ether'))), "Reward too big on account 19" + ": " + (await zug.balanceOf(accounts[19])).toString(10)); // refactor

    console.log("Verify that the orc returned to the original owner")
    assert.equal(await orcs.ownerOf(0), accounts[2])

    console.log("Gas summary:\nOrc deposit: %d\nOrc withdrawal: %d", 
                orcApprovalSummary['receipt']['cumulativeGasUsed'] + orcLendSummary['receipt']['cumulativeGasUsed'],
                orcWithdrawalSummary['receipt']['cumulativeGasUsed'] )
  });

  it("Auto compounding", async () => {

    console.log("Deposit 32 zug from account 1 to pool.")
    await zug.approve(hyksos.address, web3.utils.toWei('32', 'ether'), {from: accounts[1]})
    await hyksos.depositErc20(web3.utils.toWei('32', 'ether'), { from: accounts[1]});
    await autoCompound.setStrategy(true, {from: accounts[1], gas: 1e6});
    assert.equal((await hyksos.erc20Balance(accounts[1])).toString(10), web3.utils.toWei('32', 'ether'));
    assert.equal((await hyksos.totalErc20()).toString(10), web3.utils.toWei('32', 'ether'));

    console.log("Deposit and withdraw Orc 8 times in a row.")
    for (let i = 1; i <= 8; i++) {
      await orcs.approve(hyksos.address, 0,  {from: accounts[2]});
      await hyksos.depositNft(0, {from: accounts[2], gas: 1e6});
      web3.evm.increaseTime(10 * 86400 + 1);
      await hyksos.withdrawNft(0, {from: accounts[2], gas: 1e6})
      assert((await hyksos.erc20Balance(accounts[1])).gte(web3.utils.toBN(web3.utils.toWei((32 + 8 * i).toString(), 'ether'))), "Reward too small: " + i + ": " + (await hyksos.erc20Balance(accounts[1])).toString(10));
      assert((await hyksos.erc20Balance(accounts[1])).lte(web3.utils.toBN(web3.utils.toWei((32 + 8 * i + 1).toString(), 'ether'))), "Reward too big: " + i + ": " + (await hyksos.erc20Balance(accounts[1])).toString(10));
    }
    console.log("Disable autocompounding")
    await autoCompound.setStrategy(false, {from: accounts[1], gas: 1e6});
    console.log("The remaining amount should be enough for 3 more deposits.")
    for (let i = 1; i <= 3; i++) {
      await orcs.approve(hyksos.address, 0,  {from: accounts[2]});
      await hyksos.depositNft(0, {from: accounts[2], gas: 1e6});
      web3.evm.increaseTime(10 * 86400 + 1);
      await hyksos.withdrawNft(0, {from: accounts[2], gas: 1e6});
    }
    console.log("4th deposit should fail.")
    await assertException(hyksos.depositNft(0, {from: accounts[2], gas: 1e6}));


    assert((await hyksos.erc20Balance(accounts[1])).lte(web3.utils.toBN(web3.utils.toWei('1.0', 'ether'))), "Balance too big: " + (await hyksos.erc20Balance(accounts[1])).toString(10));
    assert((await hyksos.totalErc20()).lte(web3.utils.toBN(web3.utils.toWei('1.0', 'ether'))), "Total balance too big: " + (await hyksos.totalErc20()).toString(10));
  })
});