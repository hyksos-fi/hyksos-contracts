// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;
import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import '@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import './DepositQueue.sol';
import './IHyksos.sol';

interface IKongz is IERC721 {
    function balanceOG(address _user) external view returns(uint256);
    function getReward() external;
}

contract HyksosCyberkongz is IHyksos, DepositQueue {
    
    IKongz kongz;
    IERC20 bananas;

    struct DepositedNft {
        uint256 timeDeposited;
        address owner;
        Deposit[] shareholders;
    }

    mapping(address => uint256) bananaBalance;
    mapping(uint256 => DepositedNft) depositedKongs;
    mapping(address => bool) isAutoCompoundOff; // interpret 0 as ON, to use default values more efficiently. Use normal mapping true=>ON everywhere outside this map.
    uint256 totalBananasBalance;

    uint256 constant DEPOSIT_LENGTH_SECONDS = 1 minutes;
    uint256 constant BASE_RATE = 10 ether;
    uint256 constant MIN_DEPOSIT = 1 * BASE_RATE; // TBD
    uint256 constant ROI_PCTG = 80; // TBD
    uint256 constant KONG_WORK_VALUE = BASE_RATE * DEPOSIT_LENGTH_SECONDS / 86400;
    uint256 constant LOAN_AMOUNT = KONG_WORK_VALUE * ROI_PCTG / 100;


    constructor(address _bananas, address _kongz) {
        kongz = IKongz(_kongz);
        bananas = IERC20(_bananas);
    }

    function depositErc20(uint256 _amount, bool _isAutoCompoundOn) external override {
        bananaBalance[msg.sender] += _amount;
        pushDeposit(_amount, msg.sender);
        totalBananasBalance += _amount;
        _setAutoCompoundStrategy(_isAutoCompoundOn);
        bananas.transferFrom(msg.sender, address(this), _amount);
        emit Erc20Deposit(msg.sender, _amount);
    }

    function withdrawErc20(uint256 _amount) external override {
        require(_amount <= bananaBalance[msg.sender], "Withdrawal amount too big.");
        totalBananasBalance -= _amount;
        bananaBalance[msg.sender] -= _amount;
        bananas.transfer(msg.sender, _amount);
        emit Erc20Withdrawal(msg.sender, _amount);
    }

    function depositNft(uint256 _id) external override {
        require(isValidKong(_id), "Can't deposit this Kong.");
        depositedKongs[_id].timeDeposited = block.timestamp;
        depositedKongs[_id].owner = msg.sender;
        selectShareholders(_id);
        kongz.transferFrom(msg.sender, address(this), _id);
        bananas.transfer(msg.sender, LOAN_AMOUNT);
        emit NftDeposit(msg.sender, _id);
    }

    function withdrawNft(uint256 _id) external override {
        require(depositedKongs[_id].timeDeposited + DEPOSIT_LENGTH_SECONDS < block.timestamp, "Too early to withdraw.");
        uint256 reward = calcReward(block.timestamp - depositedKongs[_id].timeDeposited);
        kongz.getReward();
        distributeRewards(reward, _id);
        kongz.transferFrom(address(this), depositedKongs[_id].owner, _id);
        emit NftWithdrawal(depositedKongs[_id].owner, _id);
        delete depositedKongs[_id];
    }

    function setAutoCompoundStrategy(bool _isAutoCompoundOn) external override {
        _setAutoCompoundStrategy(_isAutoCompoundOn);
    }

    function _setAutoCompoundStrategy(bool _isAutoCompoundOn) internal {
        if (isAutoCompoundOff[msg.sender] == _isAutoCompoundOn) {
            isAutoCompoundOff[msg.sender] = !_isAutoCompoundOn;
        }
    }

    function distributeRewards(uint256 _reward, uint256 _id) internal {
        // Most probable scenario, so we check it first
        if (msg.sender == depositedKongs[_id].owner) {
            withdrawNftAndShareRewardEqually(_id, _reward);
        } else {
            // Check if the caller is one of the shareholders
            for (uint i = 0; i < depositedKongs[_id].shareholders.length; i++) {
                if (msg.sender == depositedKongs[_id].shareholders[i].sender) {
                    withdrawNftAndRewardClaimant(_id, _reward, i);
                    return;
                }
            }
            // Method called from account not involved in this lend. Share rewards equally.
            withdrawNftAndShareRewardEqually(_id, _reward);
        }
    }

    function withdrawNftAndShareRewardEqually(uint256 _id, uint256 _reward) internal {
        for (uint i = 0; i < depositedKongs[_id].shareholders.length; i++) {
            Deposit memory d = depositedKongs[_id].shareholders[i];
            uint256 payback = d.amount * _reward / LOAN_AMOUNT;
            payRewardAccordingToStrategy(d.sender, payback);
        }
    }

    function withdrawNftAndRewardClaimant(uint256 _id, uint256 _reward, uint256 _claimantId) internal {
        for (uint i = 0; i < depositedKongs[_id].shareholders.length; i++) {
            Deposit memory d = depositedKongs[_id].shareholders[i];
            uint256 payback = d.amount * 100 / ROI_PCTG;
            if (i == _claimantId) {
                payback += _reward - KONG_WORK_VALUE;
            }
            payRewardAccordingToStrategy(d.sender, payback);
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
            uint256 resultingAmount = selectedAmount + depositAmount;
            if (resultingAmount > LOAN_AMOUNT) {
                uint256 usedAmount = LOAN_AMOUNT - selectedAmount;
                uint256 leftAmount = depositAmount - usedAmount;
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

    function payRewardAccordingToStrategy(address _receiver, uint256 _amount) internal {
        if (isAutoCompoundOff[_receiver]) {
            bananas.transfer(_receiver, _amount);
        } else {
            bananaBalance[_receiver] += _amount;
            pushDeposit(_amount, _receiver);
            totalBananasBalance += _amount;
        }
    }

    function isValidKong(uint256 _id) internal pure returns(bool) {
        return _id < 1001;
    }

    function calcReward(uint256 _time) internal pure returns(uint256) {
        return BASE_RATE * _time / 86400;
    }

    function erc20Balance(address _addr) external view override returns(uint256) {
        return bananaBalance[_addr];
    }

    function totalErc20() external view override returns(uint256) {
        return totalBananasBalance;
    }

    function depositedNft(uint256 _id) external view returns(DepositedNft memory) {
        return depositedKongs[_id];
    }

    function autoCompoundStrategy(address _addr) external view override returns(bool) {
        return !isAutoCompoundOff[_addr];
    }

}