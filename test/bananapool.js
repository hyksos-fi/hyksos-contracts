const Kongz = artifacts.require("Kongz");
const Bananas = artifacts.require("YieldToken");
const Pool = artifacts.require("BananaPool");


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

const REVERT = "Returned error: VM Exception while processing transaction: revert";
const assertRevert = async promise => {
  try {
    await promise
    throw null;
  } catch (error) {
    assert(error, "Expected an error but did not get one");
    assert(error.message.startsWith(REVERT), "Expected VM revert error, but got: " + error.message)
  }
}


contract("BananaPool test", async accounts => {
  it("Sanity", async () => {
    const kongz = await Kongz.deployed();
    const bananas = await Bananas.deployed();
    const pool = await Pool.deployed();
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

  it("Deposit and withdraw bananas to pool", async () => {
    const kongz = await Kongz.deployed();
    const bananas = await Bananas.deployed();
    const pool = await Pool.deployed();
    assert.equal((await bananas.balanceOf(accounts[1])).toString(10), web3.utils.toWei('1000', 'ether'));
    await bananas.approve(pool.address, web3.utils.toWei('500', 'ether'), {from: accounts[1]})
    await assertRevert(pool.depositBananas(web3.utils.toWei('1000', 'ether'), { from: accounts[1]}))
    await pool.depositBananas(web3.utils.toWei('500', 'ether'), { from: accounts[1]});
    assert.equal((await pool.getBananaBalance(accounts[1])).toString(10), web3.utils.toWei('500', 'ether'));
    assert.equal((await bananas.balanceOf(accounts[1])).toString(10), web3.utils.toWei('500', 'ether'));
    await pool.withdrawBananas({ from: accounts[1]});
    assert.equal((await pool.getBananaBalance(accounts[1])).toString(10), "0");
    assert.equal((await bananas.balanceOf(accounts[1])).toString(10), web3.utils.toWei('1000', 'ether'));
  });

  it("Simple Kong deposit", async () => {
    const kongz = await Kongz.deployed();
    const bananas = await Bananas.deployed();
    const pool = await Pool.deployed();
    
    console.log("transfer Kong to account 2, to avoid confusion")
    await kongz.transferFrom(accounts[1], accounts[2], 1001, {from: accounts[1], gas: 1e6})
    assert.equal(await kongz.ownerOf(1001), accounts[2])
    
    console.log("verify that deposit is not possible with empty deposit queue")
    await assertRevert(pool.lendKong(1001, {from: accounts[2], gas: 1e6}))
    

    console.log("deposit 1000 bananas into the pool from account 2 and verify amount")
    assert.equal((await bananas.balanceOf(accounts[1])).toString(10), web3.utils.toWei('1000', 'ether'));
    assert.equal((await bananas.balanceOf(accounts[2])).toString(10), "0");
    const bananasApprovalSummary = await bananas.approve(pool.address, web3.utils.toWei('1000', 'ether'), {from: accounts[1]})
    const bananasDepositSummary = await pool.depositBananas(web3.utils.toWei('1000', 'ether'), { from: accounts[1]});
    assert.equal((await pool.getBananaBalance(accounts[1])).toString(10), web3.utils.toWei('1000', 'ether'));
    assert.equal((await bananas.balanceOf(accounts[1])).toString(10), web3.utils.toWei('0', 'ether'));
    
    console.log("deposit a kong into the pool from account 1")
    const kongApprovalSummary = await kongz.approve(Pool.address, 1001,  {from: accounts[2]});
    const kongLendSummary = await pool.lendKong(1001, {from: accounts[2], gas: 1e6})
    
    console.log("verify that the Kong lender has received his reward")
    assert.equal((await bananas.balanceOf(accounts[2])).toString(10), web3.utils.toWei('80', 'ether'));
    
    console.log("verify that it's impossible to withdraw a kong before the due date")
    web3.evm.increaseTime(5 * 86400);
    await assertRevert(pool.withdrawKong(1001, {from: accounts[2], gas: 1e6}))
    
    console.log("withdraw a kong after the due date")
    web3.evm.increaseTime(5 * 86400 + 1);
    const kongWithdrawalSummary = await pool.withdrawKong(1001, {from: accounts[2], gas: 1e6})

    console.log("verify that the banana donor has received their reward.")
    assert((await bananas.balanceOf(accounts[1])) >= web3.utils.toBN(web3.utils.toWei('100', 'ether')));

    console.log("verify there's a correct amount of bananas left on the pool")
    assert((await pool.getBananaBalance(accounts[1])).toString(10) == web3.utils.toWei('920', 'ether'));

    console.log("Gas summary:\nKong deposit: %d\nKong withdrawal: %d\nBananas deposit: %d", 
                kongApprovalSummary['receipt']['cumulativeGasUsed'] + kongLendSummary['receipt']['cumulativeGasUsed'],
                kongWithdrawalSummary['receipt']['cumulativeGasUsed'], 
                bananasApprovalSummary['receipt']['cumulativeGasUsed'] + bananasDepositSummary['receipt']['cumulativeGasUsed'] )
  });

  it("Complex Kong deposits", async () => {
    const kongz = await Kongz.deployed();
    const bananas = await Bananas.deployed();
    const pool = await Pool.deployed();


    assert.equal((await pool.getTotalBananas()).toString(10), web3.utils.toWei('920', 'ether'));
    console.log("920 / 80 = 11 more Kong deposits should be possible")

    for (let i = 0; i < 11; i++) {
      await kongz.approve(Pool.address, 1001,  {from: accounts[2]});
      await pool.lendKong(1001, {from: accounts[2], gas: 1e6})
      web3.evm.increaseTime(10 * 86400 + 1);
      await pool.withdrawKong(1001, {from: accounts[2], gas: 1e6})
    }
    console.log("13th deposit shouldn't be possible, (40 bananas left in the pool)")
    assert.equal((await pool.getTotalBananas()).toString(10), web3.utils.toWei('40', 'ether'));
    await assertRevert(pool.lendKong(1001, {from: accounts[2], gas: 1e6}))

    console.log("share account 1 funds across multiple accounts to build a bigger deposit queue. Deposit the funds into the pool")
    for (let i = 3; i < 20; i++) {
      await bananas.transfer(accounts[i], web3.utils.toWei('10', 'ether'), {from: accounts[1], gas: 1e6})
      await bananas.approve(pool.address, web3.utils.toWei('10', 'ether'), {from: accounts[i]})
      await pool.depositBananas(web3.utils.toWei('10', 'ether'), { from: accounts[i]});
      assert.equal((await pool.getBananaBalance(accounts[i])).toString(10), web3.utils.toWei('10', 'ether'));
      assert.equal((await bananas.balanceOf(accounts[i])).toString(10), "0");
    }
    
    console.log("Kong deposit should now be possible")
    await kongz.approve(Pool.address, 1001,  {from: accounts[2]});
    await pool.lendKong(1001, {from: accounts[2], gas: 1e6})
    
    console.log("withdraw Kong and verify that only accounts 3, 4, 5, 6 have received at least 12.5 bananas in rewards")
    web3.evm.increaseTime(10 * 86400 + 1);
    await pool.withdrawKong(1001, {from: accounts[2], gas: 1e6})
    for (let i = 3; i < 7; i++) {
      assert(await bananas.balanceOf(accounts[i]) >= web3.utils.toBN(web3.utils.toWei('12.5', 'ether')), "No reward on account " + i);
    }
    for (let i = 7; i < 20; i++) {
      assert((await bananas.balanceOf(accounts[i])).toString(10) == "0", "Unexpected reward on account " + i + ": " + (await bananas.balanceOf(accounts[i])).toString(10)); // refactor
    }

    console.log("Withdraw bananas of account 9 to make a gap in deposit queue. Send them to account 1")
    const bananasWithdrawalSummary = await pool.withdrawBananas({ from: accounts[9]});
    await bananas.transfer(accounts[1], web3.utils.toWei("10", "ether"), {from: accounts[9]});
    assert.equal((await bananas.balanceOf(accounts[9])).toString(10), "0");
    
    console.log("Deposit Kong once again and verify that addresses 7, 8, 10, 11, 12, 13, 14, 15 received rewards (14th deposit)")
    const kongApprovalSummary = await kongz.approve(Pool.address, 1001,  {from: accounts[2]});
    const kongLendSummary = await pool.lendKong(1001, {from: accounts[2], gas: 1e6})
    web3.evm.increaseTime(10 * 86400 + 1);
    const kongWithdrawalSummary = await pool.withdrawKong(1001, {from: accounts[2], gas: 1e6})
    for (const i of [7, 8, 10, 11, 12, 13, 14, 15]) {
      assert(await bananas.balanceOf(accounts[i]) >= web3.utils.toBN(web3.utils.toWei('12.5', 'ether')), "No reward on account " + i);
    }
    assert((await bananas.balanceOf(accounts[9])).toString(10) == "0", "Unexpected reward on account 9" + ": " + (await bananas.balanceOf(accounts[9])).toString(10)); // refactor
    for (let i = 16; i < 20; i++) {
      assert((await bananas.balanceOf(accounts[i])).toString(10) == "0", "Unexpected reward on account " + i + ": " + (await bananas.balanceOf(accounts[i])).toString(10)); // refactor);
    }

    console.log("verify that no account has received a too big reward")
    for (let i = 3; i < 20; i++) {
      assert(await bananas.balanceOf(accounts[i]) <= web3.utils.toBN(web3.utils.toWei('12.6', 'ether')), "More than single reward on account " + i + ": " + (await bananas.balanceOf(accounts[i])).toString(10)); // refactor);
    }

    console.log("verify that account 2 has received 80 * 14 bananas in total")
    assert(await bananas.balanceOf(accounts[2]) <= web3.utils.toBN(web3.utils.toWei((80 * 14).toString(), 'ether')), "Wrong reward");

    console.log("Gas summary:\nKong deposit: %d\nKong withdrawal: %d\nBananas withdrawal: %d", 
                kongApprovalSummary['receipt']['cumulativeGasUsed'] + kongLendSummary['receipt']['cumulativeGasUsed'],
                kongWithdrawalSummary['receipt']['cumulativeGasUsed'], 
                bananasWithdrawalSummary['receipt']['cumulativeGasUsed'] )
  });

});