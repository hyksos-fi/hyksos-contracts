// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import './DepositQueue.sol';
import './IHyksos.sol';

abstract contract HyksosBase is IHyksos, DepositQueue {

    struct DepositedNft {
        uint256 timeDeposited;
        address owner;
        uint16 rateModifier;
        Deposit[] shareholders;
    }

    IAutoCompound immutable autoCompound;
    uint256 immutable public roiPctg;
    uint256 immutable public depositLength;

    mapping(address => uint256) erc20BalanceMap;
    mapping(uint256 => DepositedNft) depositedNfts;
    uint256 totalErc20Balance;

    constructor(address _autoCompound, uint256 _depositLength, uint256 _roiPctg) {
        autoCompound = IAutoCompound(_autoCompound);
        roiPctg = _roiPctg;
        depositLength = _depositLength;
    }

    function payErc20(address _receiver, uint256 _amount) internal virtual;

    function distributeRewards(uint256 _id, uint256 _reward, uint256 _nftWorkValue) internal {
        // Most probable scenario, so we check it first
        if (msg.sender == depositedNfts[_id].owner) {
            withdrawNftAndRewardOwner(_id, _reward, _nftWorkValue);
        } else {
            // Check if the caller is one of the shareholders
            for (uint i = 0; i < depositedNfts[_id].shareholders.length; i++) {
                if (msg.sender == depositedNfts[_id].shareholders[i].sender) {
                    withdrawNftAndRewardClaimant(_id, _reward, i, _nftWorkValue);
                    return;
                }
            }
            // Method called from account not involved in this lend. Share rewards equally.
            withdrawNftAndShareRewardEqually(_id, _reward, _nftWorkValue * roiPctg / 100);
        }
    }

    function withdrawNftAndShareRewardEqually(uint256 _id, uint256 _reward, uint256 _loanAmount) internal {
        for (uint i = 0; i < depositedNfts[_id].shareholders.length; i++) {
            Deposit memory d = depositedNfts[_id].shareholders[i];
            uint256 payback = d.amount * _reward / _loanAmount;
            payRewardAccordingToStrategy(d.sender, payback);
        }
    }

    function withdrawNftAndRewardClaimant(uint256 _id, uint256 _reward, uint256 _claimantId, uint256 _nftWorkValue) internal {
        for (uint i = 0; i < depositedNfts[_id].shareholders.length; i++) {
            Deposit memory d = depositedNfts[_id].shareholders[i];
            uint256 payback = d.amount * 100 / roiPctg;
            if (i == _claimantId) {
                payback += _reward - _nftWorkValue;
            }
            payRewardAccordingToStrategy(d.sender, payback);
        }
    }

    function withdrawNftAndRewardOwner(uint256 _id, uint256 _reward, uint256 _nftWorkValue) internal {
        for (uint i = 0; i < depositedNfts[_id].shareholders.length; i++) {
            Deposit memory d = depositedNfts[_id].shareholders[i];
            uint256 payback = d.amount * 100 / roiPctg;
            payRewardAccordingToStrategy(d.sender, payback);
        }
        payErc20(depositedNfts[_id].owner, _reward - _nftWorkValue);
    }

    function selectShareholders(uint256 _id, uint256 _loanAmount) internal {
        require(totalErc20Balance >= _loanAmount, "Not enough erc-20 tokens in pool to fund a loan.");
        uint256 selectedAmount = 0;
        while (!isDepositQueueEmpty()) {
            Deposit memory d = getTopDeposit();
            if (erc20BalanceMap[d.sender] == 0) {
                popDeposit();
                continue;
            }
            uint256 depositAmount;
            if (erc20BalanceMap[d.sender] < d.amount) {
                depositAmount = erc20BalanceMap[d.sender];
            } else {
                depositAmount = d.amount;
            }
            uint256 resultingAmount = selectedAmount + depositAmount;
            if (resultingAmount > _loanAmount) {
                uint256 usedAmount = _loanAmount - selectedAmount;
                uint256 leftAmount = depositAmount - usedAmount;
                setTopDepositAmount(leftAmount);
                depositedNfts[_id].shareholders.push(Deposit(usedAmount, d.sender));
                erc20BalanceMap[d.sender] -= usedAmount;

                return;
            } else {
                depositedNfts[_id].shareholders.push(Deposit(depositAmount, d.sender));
                selectedAmount = resultingAmount;
                erc20BalanceMap[d.sender] -= depositAmount;
                popDeposit();
                if (resultingAmount == _loanAmount) {
                    return;
                }
            }
        }
        // if while loop does not return early, we don't have enough bananas.
        revert("Not enough deposits.");
    }

    function payRewardAccordingToStrategy(address _receiver, uint256 _amount) internal {
        if (autoCompound.getStrategy(_receiver)) {
            erc20BalanceMap[_receiver] += _amount;
            pushDeposit(_amount, _receiver);
            totalErc20Balance += _amount;
        } else {
            payErc20(_receiver, _amount);
        }
    }

    function erc20Balance(address _addr) external view override returns(uint256) {
        return erc20BalanceMap[_addr];
    }

    function totalErc20() external view override returns(uint256) {
        return totalErc20Balance;
    }

    function depositedNft(uint256 _id) external view returns(DepositedNft memory) {
        return depositedNfts[_id];
    }
}
