const Kongz = artifacts.require("Kongz");
const Bananas = artifacts.require("YieldToken");
const Hyksos = artifacts.require("HyksosCyberkongz");


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

const EXCEPTION = "Returned error: VM Exception while processing transaction:";
const assertException = async promise => {
  try {
    await promise
    throw null;
  } catch (error) {
    assert(error, "Expected an error but did not get one");
    assert(error.message.startsWith(EXCEPTION), "Expected VM revert error, but got: " + error.message)
  }
}


contract("HyksosCyberkongz test", async accounts => {
  it("Sanity", async () => {
    const kongz = await Kongz.deployed();
    const bananas = await Bananas.deployed();
    const hyksos = await Hyksos.deployed();
    assert.equal(await kongz.ownerOf(1001), accounts[0])
    await kongz.transferFrom(accounts[0], accounts[1], 1001, {from: accounts[0], gas: 1000000})
    assert.equal(await kongz.ownerOf(1001), accounts[1])
    web3.evm.increaseTime(100 * 86400);
    web3.evm.mine();
    const claimable = await bananas.getTotalClaimable(accounts[1]);
    assert.equal(claimable.toString(10), web3.utils.toWei('1000', 'ether'), "Incorrect claimable amount");
    await kongz.getReward({from: accounts[1], gas: 1e6});
    assert.equal((await bananas.balanceOf(accounts[1])).toString(10), web3.utils.toWei('1000', 'ether'));
  });

  it("Deposit and withdraw bananas to hyksos", async () => {
    const kongz = await Kongz.deployed();
    const bananas = await Bananas.deployed();
    const hyksos = await Hyksos.deployed();
    assert.equal((await bananas.balanceOf(accounts[1])).toString(10), web3.utils.toWei('1000', 'ether'));
    await bananas.approve(hyksos.address, web3.utils.toWei('500', 'ether'), {from: accounts[1]})
    await assertException(hyksos.depositErc20(web3.utils.toWei('1000', 'ether'), false, { from: accounts[1]}))
    await hyksos.depositErc20(web3.utils.toWei('500', 'ether'), false, { from: accounts[1]});
    assert.equal((await hyksos.erc20Balance(accounts[1])).toString(10), web3.utils.toWei('500', 'ether'));
    assert.equal((await bananas.balanceOf(accounts[1])).toString(10), web3.utils.toWei('500', 'ether'));
    await hyksos.withdrawErc20(await hyksos.erc20Balance(accounts[1]), { from: accounts[1]});
    assert.equal((await hyksos.erc20Balance(accounts[1])).toString(10), "0");
    assert.equal((await bananas.balanceOf(accounts[1])).toString(10), web3.utils.toWei('1000', 'ether'));
  });

  it("Simple Kong deposit", async () => {
    const kongz = await Kongz.deployed();
    const bananas = await Bananas.deployed();
    const hyksos = await Hyksos.deployed();
    
    console.log("transfer Kong to account 2, to avoid confusion")
    await kongz.transferFrom(accounts[1], accounts[2], 1001, {from: accounts[1], gas: 1e6})
    assert.equal(await kongz.ownerOf(1001), accounts[2])
    
    console.log("verify that deposit is not possible with empty deposit queue")
    await assertException(hyksos.depositNft(1001, {from: accounts[2], gas: 1e6}))
    

    console.log("deposit 1000 bananas into the hyksos from account 2 and verify amount")
    assert.equal((await bananas.balanceOf(accounts[1])).toString(10), web3.utils.toWei('1000', 'ether'));
    assert.equal((await bananas.balanceOf(accounts[2])).toString(10), "0");
    const bananasApprovalSummary = await bananas.approve(hyksos.address, web3.utils.toWei('1000', 'ether'), {from: accounts[1]})
    const bananasDepositSummary = await hyksos.depositErc20(web3.utils.toWei('1000', 'ether'), false, { from: accounts[1]});
    assert.equal((await hyksos.erc20Balance(accounts[1])).toString(10), web3.utils.toWei('1000', 'ether'));
    assert.equal((await bananas.balanceOf(accounts[1])).toString(10), web3.utils.toWei('0', 'ether'));
    
    console.log("deposit a kong into the hyksos from account 1")
    const kongApprovalSummary = await kongz.approve(Hyksos.address, 1001,  {from: accounts[2]});
    const kongLendSummary = await hyksos.depositNft(1001, {from: accounts[2], gas: 1e6})
    
    console.log("verify that the Kong lender has received his reward")
    assert.equal((await bananas.balanceOf(accounts[2])).toString(10), web3.utils.toWei('80', 'ether'));
    
    console.log("verify that it's impossible to withdraw a kong before the due date")
    web3.evm.increaseTime(5 * 86400);
    await assertException(hyksos.withdrawNft(1001, {from: accounts[2], gas: 1e6}))
    
    console.log("withdraw a kong after the due date")
    web3.evm.increaseTime(5 * 86400 + 1);
    const kongWithdrawalSummary = await hyksos.withdrawNft(1001, {from: accounts[2], gas: 1e6})

    console.log("verify that the banana donor has received their reward.")
    assert((await bananas.balanceOf(accounts[1])).gte(web3.utils.toBN(web3.utils.toWei('100', 'ether'))));

    console.log("verify there's a correct amount of bananas left on the hyksos")
    assert((await hyksos.erc20Balance(accounts[1])).toString(10) == web3.utils.toWei('920', 'ether'));

    console.log("Gas summary:\nKong deposit: %d\nKong withdrawal: %d\nBananas deposit: %d", 
                kongApprovalSummary['receipt']['cumulativeGasUsed'] + kongLendSummary['receipt']['cumulativeGasUsed'],
                kongWithdrawalSummary['receipt']['cumulativeGasUsed'], 
                bananasApprovalSummary['receipt']['cumulativeGasUsed'] + bananasDepositSummary['receipt']['cumulativeGasUsed'] )


    /* Deposit queue state after the test:
    [0] accounts[1] 920
    */
  });

  it("Complex Kong deposits", async () => {
    const kongz = await Kongz.deployed();
    const bananas = await Bananas.deployed();
    const hyksos = await Hyksos.deployed();


    assert.equal((await hyksos.totalErc20()).toString(10), web3.utils.toWei('920', 'ether'));
    console.log("920 / 80 = 11 more Kong deposits should be possible")

    for (let i = 0; i < 11; i++) {
      await kongz.approve(Hyksos.address, 1001,  {from: accounts[2]});
      await hyksos.depositNft(1001, {from: accounts[2], gas: 1e6})
      web3.evm.increaseTime(10 * 86400 + 1);
      await hyksos.withdrawNft(1001, {from: accounts[2], gas: 1e6})
    }
    console.log("13th deposit shouldn't be possible, (40 bananas left in the hyksos)")
    assert.equal((await hyksos.totalErc20()).toString(10), web3.utils.toWei('40', 'ether'));
    await assertException(hyksos.depositNft(1001, {from: accounts[2], gas: 1e6}))

    console.log("share account 1 funds across multiple accounts to build a bigger deposit queue. Deposit the funds into the hyksos")
    for (let i = 3; i < 20; i++) {
      await bananas.transfer(accounts[i], web3.utils.toWei('10', 'ether'), {from: accounts[1], gas: 1e6})
      await bananas.approve(hyksos.address, web3.utils.toWei('10', 'ether'), {from: accounts[i]})
      await hyksos.depositErc20(web3.utils.toWei('10', 'ether'), false, { from: accounts[i]});
      assert.equal((await hyksos.erc20Balance(accounts[i])).toString(10), web3.utils.toWei('10', 'ether'));
      assert.equal((await bananas.balanceOf(accounts[i])).toString(10), "0");
    }
    
    console.log("Kong deposit should now be possible")
    await kongz.approve(Hyksos.address, 1001,  {from: accounts[2]});
    await hyksos.depositNft(1001, {from: accounts[2], gas: 1e6})
    
    console.log("withdraw Kong and verify that only accounts 3, 4, 5, 6 have received at least 12.5 bananas in rewards")
    web3.evm.increaseTime(10 * 86400 + 1);
    await hyksos.withdrawNft(1001, {from: accounts[2], gas: 1e6})
    for (let i = 3; i < 7; i++) {
      assert((await bananas.balanceOf(accounts[i])).gte(web3.utils.toBN(web3.utils.toWei('12.5', 'ether'))), "No reward on account " + i);
    }
    for (let i = 7; i < 20; i++) {
      assert((await bananas.balanceOf(accounts[i])).toString(10) == "0", "Unexpected reward on account " + i + ": " + (await bananas.balanceOf(accounts[i])).toString(10)); // refactor
    }

    console.log("Withdraw bananas of account 9 to make a gap in deposit queue. Send them to account 1")
    const bananasWithdrawalSummary = await hyksos.withdrawErc20(await hyksos.erc20Balance(accounts[9]), { from: accounts[9]});
    await bananas.transfer(accounts[1], web3.utils.toWei("10", "ether"), {from: accounts[9]});
    assert.equal((await bananas.balanceOf(accounts[9])).toString(10), "0");
    
    console.log("Deposit Kong once again and verify that addresses 7, 8, 10, 11, 12, 13, 14, 15 received rewards (14th deposit)")
    const kongApprovalSummary = await kongz.approve(Hyksos.address, 1001,  {from: accounts[2]});
    const kongLendSummary = await hyksos.depositNft(1001, {from: accounts[2], gas: 1e6})
    web3.evm.increaseTime(10 * 86400 + 1);
    const kongWithdrawalSummary = await hyksos.withdrawNft(1001, {from: accounts[2], gas: 1e6})
    for (const i of [7, 8, 10, 11, 12, 13, 14, 15]) {
      assert((await bananas.balanceOf(accounts[i])).gte(web3.utils.toBN(web3.utils.toWei('12.5', 'ether'))), "No reward on account " + i);
    }
    assert((await bananas.balanceOf(accounts[9])).toString(10) == "0", "Unexpected reward on account 9" + ": " + (await bananas.balanceOf(accounts[9])).toString(10)); // refactor
    for (let i = 16; i < 20; i++) {
      assert((await bananas.balanceOf(accounts[i])).toString(10) == "0", "Unexpected reward on account " + i + ": " + (await bananas.balanceOf(accounts[i])).toString(10)); // refactor);
    }

    console.log("verify that no account has received a reward too big")
    for (let i = 3; i < 20; i++) {
      assert((await bananas.balanceOf(accounts[i])).lte(web3.utils.toBN(web3.utils.toWei('12.6', 'ether'))), "More than single reward on account " + i + ": " + (await bananas.balanceOf(accounts[i])).toString(10)); // refactor);
    }

    console.log("verify that account 2 has received 80 * 14 bananas in total")
    assert((await bananas.balanceOf(accounts[2])).lte(web3.utils.toBN(web3.utils.toWei((80 * 14).toString(), 'ether'))), "Wrong reward");

    console.log("Gas summary:\nKong deposit: %d\nKong withdrawal: %d\nBananas withdrawal: %d", 
                kongApprovalSummary['receipt']['cumulativeGasUsed'] + kongLendSummary['receipt']['cumulativeGasUsed'],
                kongWithdrawalSummary['receipt']['cumulativeGasUsed'], 
                bananasWithdrawalSummary['receipt']['cumulativeGasUsed'] )
  });

    /* Deposit queue state after the test:
    [0] accounts[16] 10
    [1] accounts[17] 10
    [2] accounts[18] 10
    [3] accounts[19] 10
    */

  it("Late Kong withdrawal", async () => {
    const kongz = await Kongz.deployed();
    const bananas = await Bananas.deployed();
    const hyksos = await Hyksos.deployed();

    console.log("Transfer 40 more bananas from account 1 to 19, then deposit them into the pool.")
    await bananas.transfer(accounts[19], web3.utils.toWei('40', 'ether'), {from: accounts[1], gas: 1e6})
    await bananas.approve(hyksos.address, web3.utils.toWei('40', 'ether'), {from: accounts[19]})
    await hyksos.depositErc20(web3.utils.toWei('40', 'ether'), false, { from: accounts[19]});
    assert.equal((await hyksos.erc20Balance(accounts[19])).toString(10), web3.utils.toWei('50', 'ether'));
    assert.equal((await hyksos.totalErc20()).toString(10), web3.utils.toWei('80', 'ether'));
    
    console.log("Deposit Kong")
    const kongApprovalSummary = await kongz.approve(Hyksos.address, 1001,  {from: accounts[2]});
    const kongLendSummary = await hyksos.depositNft(1001, {from: accounts[2], gas: 1e6})

    console.log("Increase time by twice the deposit length.")
    web3.evm.increaseTime(20 * 86400 + 1);

    console.log("Withdraw NFT from one of the shareholder accounts and verify rewards.")
    const kongWithdrawalSummary = await hyksos.withdrawNft(1001, {from: accounts[16], gas: 1e6})
    assert((await bananas.balanceOf(accounts[16])).gte(web3.utils.toBN(web3.utils.toWei('112.5', 'ether'))), "Reward too small on account 16: " + (await bananas.balanceOf(accounts[16])).toString(10)); // refactor
    assert((await bananas.balanceOf(accounts[16])).lte(web3.utils.toBN(web3.utils.toWei('112.6', 'ether'))), "Reward too big on account 16: " + (await bananas.balanceOf(accounts[16])).toString(10)); // refactor
    assert((await bananas.balanceOf(accounts[17])).gte(web3.utils.toBN(web3.utils.toWei('12.5', 'ether'))), "Reward too small on account 17: " + (await bananas.balanceOf(accounts[17])).toString(10)); // refactor
    assert((await bananas.balanceOf(accounts[17])).lte(web3.utils.toBN(web3.utils.toWei('12.6', 'ether'))), "Reward too big on account 17: " + (await bananas.balanceOf(accounts[17])).toString(10)); // refactor
    assert((await bananas.balanceOf(accounts[18])).gte(web3.utils.toBN(web3.utils.toWei('12.5', 'ether'))), "Reward too small on account 18: " + (await bananas.balanceOf(accounts[18])).toString(10)); // refactor
    assert((await bananas.balanceOf(accounts[18])).lte(web3.utils.toBN(web3.utils.toWei('12.6', 'ether'))), "Reward too big on account 18: " + (await bananas.balanceOf(accounts[18])).toString(10)); // refactor
    assert((await bananas.balanceOf(accounts[19])).gte(web3.utils.toBN(web3.utils.toWei('62.5', 'ether'))), "Reward too small on account 19: " + (await bananas.balanceOf(accounts[19])).toString(10)); // refactor
    assert((await bananas.balanceOf(accounts[19])).lte(web3.utils.toBN(web3.utils.toWei('62.6', 'ether'))), "Reward too big on account 19" + ": " + (await bananas.balanceOf(accounts[19])).toString(10)); // refactor

    console.log("Verify that the kong returned to the original owner")
    assert.equal(await kongz.ownerOf(1001), accounts[2])

    console.log("Gas summary:\nKong deposit: %d\nKong withdrawal: %d", 
                kongApprovalSummary['receipt']['cumulativeGasUsed'] + kongLendSummary['receipt']['cumulativeGasUsed'],
                kongWithdrawalSummary['receipt']['cumulativeGasUsed'] )
  });

  it("Auto compounding", async () => {
    const kongz = await Kongz.deployed();
    const bananas = await Bananas.deployed();
    const hyksos = await Hyksos.deployed();

    console.log("Deposit 80 bananas from account 1 to pool.")
    await bananas.approve(hyksos.address, web3.utils.toWei('80', 'ether'), {from: accounts[1]})
    await hyksos.depositErc20(web3.utils.toWei('80', 'ether'), true, { from: accounts[1]});
    assert.equal((await hyksos.erc20Balance(accounts[1])).toString(10), web3.utils.toWei('80', 'ether'));
    assert.equal((await hyksos.totalErc20()).toString(10), web3.utils.toWei('80', 'ether'));

    console.log("Deposit and withdraw Kong 8 times in a row.")
    for (let i = 1; i <= 8; i++) {
      await kongz.approve(Hyksos.address, 1001,  {from: accounts[2]});
      await hyksos.depositNft(1001, {from: accounts[2], gas: 1e6});
      web3.evm.increaseTime(10 * 86400 + 1);
      await hyksos.withdrawNft(1001, {from: accounts[2], gas: 1e6})
      assert((await hyksos.erc20Balance(accounts[1])).gte(web3.utils.toBN(web3.utils.toWei((80 + 20 * i).toString(), 'ether'))), "Reward too small: " + i + ": " + (await hyksos.erc20Balance(accounts[1])).toString(10));
      assert((await hyksos.erc20Balance(accounts[1])).lte(web3.utils.toBN(web3.utils.toWei((80 + 20 * i + 1).toString(), 'ether'))), "Reward too big: " + i + ": " + (await hyksos.erc20Balance(accounts[1])).toString(10));
    }
    console.log("Disable autocompounding")
    await hyksos.setAutoCompoundStrategy(false, {from: accounts[1], gas: 1e6});
    console.log("The remaining amount should be enough for 3 more deposits.")
    for (let i = 1; i <= 3; i++) {
      await kongz.approve(Hyksos.address, 1001,  {from: accounts[2]});
      await hyksos.depositNft(1001, {from: accounts[2], gas: 1e6});
      web3.evm.increaseTime(10 * 86400 + 1);
      await hyksos.withdrawNft(1001, {from: accounts[2], gas: 1e6});
    }
    console.log("4th deposit should fail.")
    await assertException(hyksos.depositNft(1001, {from: accounts[2], gas: 1e6}));


    assert((await hyksos.erc20Balance(accounts[1])).lte(web3.utils.toBN(web3.utils.toWei('1.0', 'ether'))), "Balance too big: " + (await hyksos.erc20Balance(accounts[1])).toString(10));
    assert((await hyksos.totalErc20()).lte(web3.utils.toBN(web3.utils.toWei('1.0', 'ether'))), "Total balance too big: " + (await hyksos.totalErc20()).toString(10));
  })
});