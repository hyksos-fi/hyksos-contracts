// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;
import '../openzeppelin/token/ERC721/IERC721.sol';
import '../openzeppelin/token/ERC721/IERC721Receiver.sol';
import '../openzeppelin/token/ERC20/IERC20.sol';
import '../openzeppelin/utils/math/SafeMath.sol';

import './DepositQueue.sol';
import './IHyksos.sol';

interface IKongz is IERC721 {
    function balanceOG(address _user) external view returns(uint256);
    function getReward() external;
}

contract HyksosCyberkongz is IHyksos, DepositQueue {
    using SafeMath for uint256;
    
    IKongz kongz;
    IERC20 bananas;

    struct Kong {
        uint256 timeDeposited;
        address owner;
        Deposit[] shareholders;
    }

    mapping(address => uint256) bananaBalance;
    mapping(uint256 => Kong) depositedKongs;
    uint256 totalBananasBalance;

    uint256 constant DEPOSIT_LENGTH_DAYS = 10; // TBD
    uint256 constant DEPOSIT_LENGTH_SECONDS = DEPOSIT_LENGTH_DAYS * 86400;
    uint256 constant BASE_RATE = 10 ether;
    uint256 constant MIN_DEPOSIT = 1 * BASE_RATE; // TBD
    uint256 constant ROI_PCTG = 80; // TBD
    uint256 constant KONG_WORK_VALUE = BASE_RATE * DEPOSIT_LENGTH_DAYS;
    uint256 constant LOAN_AMOUNT = KONG_WORK_VALUE * ROI_PCTG / 100;


    constructor(address _bananas, address _kongz) {
        kongz = IKongz(_kongz);
        bananas = IERC20(_bananas);
    }

    function depositErc20(uint256 _amount) external override {
        require(_amount > 0, "Amount must be positive.");
        require(bananas.balanceOf(msg.sender) >= _amount, "Not enough bananas to deposit.");
        uint256 allowance = bananas.allowance(msg.sender, address(this));
        require(allowance >= _amount, "Not enough allowance");
        bananas.transferFrom(msg.sender, address(this), _amount);
        bananaBalance[msg.sender] += _amount;
        pushDeposit(_amount, msg.sender);
        totalBananasBalance += _amount;
        emit Erc20Deposit(msg.sender, _amount);
    }

    function withdrawErc20(uint256 _amount) external override {
        require(bananaBalance[msg.sender] > 0, "No bananas to withdraw.");
        require(_amount <= bananaBalance[msg.sender], "Withdrawal amount too big.");
        bananas.transfer(msg.sender, _amount);
        totalBananasBalance -= _amount;
        bananaBalance[msg.sender] = 0;
        emit Erc20Withdrawal(msg.sender, _amount);
    }

    function depositNft(uint256 _id) external override {
        require(kongz.ownerOf(_id) == msg.sender, "Not the Kong owner.");
        require(kongz.getApproved(_id) == address(this));
        kongz.transferFrom(msg.sender, address(this), _id);
        bananas.transfer(msg.sender, LOAN_AMOUNT);
        depositedKongs[_id].timeDeposited = block.timestamp;
        depositedKongs[_id].owner = msg.sender;
        selectShareholders(_id);
        emit NftDeposit(msg.sender, _id);
    }

    function withdrawNft(uint256 _id) external override {
        require(depositedKongs[_id].timeDeposited.add(DEPOSIT_LENGTH_SECONDS) < block.timestamp, "Too early to withdraw.");
        uint256 reward = calcReward(block.timestamp.sub(depositedKongs[_id].timeDeposited));
        kongz.getReward();
        // Most probable scenario, so we check it first
        if (msg.sender == depositedKongs[_id].owner) {
            withdrawNftAndShareRewardEqually(_id, reward);
        } else {
            bool payoutsDone = false;
            // Check if the caller is one of the shareholders
            for (uint i = 0; i < depositedKongs[_id].shareholders.length; i++) {
                if (msg.sender == depositedKongs[_id].shareholders[i].sender) {
                    withdrawNftAndRewardClaimant(_id, reward, i);
                    payoutsDone = true;
                    break;
                }
            }
            // Method called from account not involved in this lend. Share rewards equally.
            if (!payoutsDone) {
                withdrawNftAndShareRewardEqually(_id, reward);
            }
        }
        kongz.transferFrom(address(this), depositedKongs[_id].owner, _id);
        emit NftWithdrawal(depositedKongs[_id].owner, _id);
        delete depositedKongs[_id];
    }

    function withdrawNftAndShareRewardEqually(uint256 _id, uint256 _reward) internal {
        for (uint i = 0; i < depositedKongs[_id].shareholders.length; i++) {
            Deposit memory d = depositedKongs[_id].shareholders[i];
            uint256 payback = d.amount.mul(100).div(ROI_PCTG).mul(_reward).div(KONG_WORK_VALUE);
            bananas.transfer(d.sender, payback);
        }
    }

    function withdrawNftAndRewardClaimant(uint256 _id, uint256 _reward, uint256 _claimantId) internal {
        for (uint i = 0; i < depositedKongs[_id].shareholders.length; i++) {
            Deposit memory d = depositedKongs[_id].shareholders[i];
            uint256 payback = d.amount.mul(100).div(ROI_PCTG);
            if (i == _claimantId) {
                payback += _reward - KONG_WORK_VALUE;
            }
            bananas.transfer(d.sender, payback);
        }
    }

    function selectShareholders(uint256 _id) internal {
        require(totalBananasBalance >= LOAN_AMOUNT, "Not enough bananas to fund a loan.");
        uint256 selectedAmount = 0;
        while (!isDepositQueueEmpty()) {
            Deposit memory d = getTopDeposit();
            if (bananaBalance[d.sender] == 0) {
                popDeposit();
                continue;
            }
            uint256 depositAmount;
            if (bananaBalance[d.sender] < d.amount) {
                depositAmount = bananaBalance[d.sender];
            } else {
                depositAmount = d.amount;
            }
            uint256 resultingAmount = selectedAmount.add(depositAmount);
            if (resultingAmount > LOAN_AMOUNT) {
                uint256 usedAmount = LOAN_AMOUNT.sub(selectedAmount);
                uint256 leftAmount = depositAmount.sub(usedAmount);
                setTopDepositAmount(leftAmount);
                depositedKongs[_id].shareholders.push(Deposit(usedAmount, d.sender));
                bananaBalance[d.sender] -= usedAmount;
                totalBananasBalance -= usedAmount;
                return;
            } else {
                depositedKongs[_id].shareholders.push(Deposit(depositAmount, d.sender));
                selectedAmount = resultingAmount;
                bananaBalance[d.sender] -= depositAmount;
                totalBananasBalance -= depositAmount;
                popDeposit();
                if (resultingAmount == LOAN_AMOUNT) {
                    return;
                }
            }
        }
        // if while loop does not return early, we don't have enough bananas.
        revert("Not enough deposits.");
    }

    function calcReward(uint256 time) internal pure returns(uint256) {
        return BASE_RATE.mul(time).div(86400);
    }

    function erc20Balance(address _addr) external view override returns(uint256) {
        return bananaBalance[_addr];
    }

    function totalErc20() external view override returns(uint256) {
        return totalBananasBalance;
    }

    function depositedKong(uint256 _id) external view returns(Kong memory) {
        return depositedKongs[_id];
    }

}