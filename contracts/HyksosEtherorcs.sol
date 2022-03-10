// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;
import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import '@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import './DepositQueue.sol';
import './IHyksos.sol';

interface IOrcs is IERC721 {
    struct Orc { uint8 body; uint8 helm; uint8 mainhand; uint8 offhand; uint16 level; uint16 zugModifier; uint32 lvlProgress; }
    enum   Actions { UNSTAKED, FARMING, TRAINING }
    struct Action  { address owner; uint88 timestamp; Actions action; }
    function orcs(uint256 _id) external returns(Orc memory);
    function activities(uint256 _id) external returns(Action memory);
    function claimable(uint256 id) external view returns (uint256);
    function claim(uint256[] calldata ids) external;
    function doAction(uint256 id, Actions action_) external;
}

contract HyksosEtherorcs is IHyksos, DepositQueue {
    
    IOrcs nft;
    IERC20 erc20;

    struct DepositedNft {
        uint88 timeDeposited;
        uint16 rateModifier; // check gas cost with various configs
        address owner;
        Deposit[] shareholders; 
    }

    mapping(address => uint256) erc20BalanceMap;
    mapping(uint256 => DepositedNft) depositedNfts;
    mapping(address => bool) isAutoCompoundOff; // interpret 0 as ON, to use default values more efficiently. Use normal mapping true=>ON everywhere outside this map.
    uint256 totalErc20Balance;

    uint256 constant DEPOSIT_LENGTH = 10 days;
    uint256 constant MIN_DEPOSIT = 10 ether; // TBD
    uint256 constant ROI_PCTG = 80; // TBD


    constructor(address _zug, address _orcs) {
        nft = IOrcs(_orcs);
        erc20 = IERC20(_zug);
    }

    function depositErc20(uint256 _amount, bool _isAutoCompoundOn) external override {
        erc20BalanceMap[msg.sender] += _amount;
        pushDeposit(_amount, msg.sender);
        totalErc20Balance += _amount;
        _setAutoCompoundStrategy(_isAutoCompoundOn);
        erc20.transferFrom(msg.sender, address(this), _amount);
        emit Erc20Deposit(msg.sender, _amount);
    }

    function withdrawErc20(uint256 _amount) external override {
        require(_amount <= erc20BalanceMap[msg.sender], "Withdrawal amount too big.");
        totalErc20Balance -= _amount;
        erc20BalanceMap[msg.sender] -= _amount;
        erc20.transfer(msg.sender, _amount);
        emit Erc20Withdrawal(msg.sender, _amount);
    }

    function depositNft(uint256 _id) external override {
        depositedNfts[_id].timeDeposited = uint88(block.timestamp);
        depositedNfts[_id].owner = msg.sender;
        depositedNfts[_id].rateModifier = nft.orcs(_id).zugModifier;
        uint256 loanAmount = calcReward(DEPOSIT_LENGTH, depositedNfts[_id].rateModifier) * ROI_PCTG / 100;
        selectShareholders(_id, loanAmount);
        nft.transferFrom(msg.sender, address(this), _id);
        nft.doAction(_id, IOrcs.Actions.FARMING);
        erc20.transfer(msg.sender, loanAmount);
        emit NftDeposit(msg.sender, _id);
    }

    function withdrawNft(uint256 _id) external override {
        require(depositedNfts[_id].timeDeposited + DEPOSIT_LENGTH < block.timestamp, "Too early to withdraw.");
        uint256 reward = nft.claimable(_id);
        nft.doAction(_id, IOrcs.Actions.UNSTAKED);
        distributeRewards(_id, reward);
        nft.transferFrom(address(this), depositedNfts[_id].owner, _id);
        emit NftWithdrawal(depositedNfts[_id].owner, _id);
        delete depositedNfts[_id];
    }

    function setAutoCompoundStrategy(bool _isAutoCompoundOn) external override {
        _setAutoCompoundStrategy(_isAutoCompoundOn);
    }

    function _setAutoCompoundStrategy(bool _isAutoCompoundOn) internal {
        if (isAutoCompoundOff[msg.sender] == _isAutoCompoundOn) {
            isAutoCompoundOff[msg.sender] = !_isAutoCompoundOn;
        }
    }

    function distributeRewards(uint256 _id, uint256 _reward) internal {
        // Most probable scenario, so we check it first
        if (msg.sender == depositedNfts[_id].owner) {
            withdrawNftAndShareRewardEqually(_id, _reward);
        } else {
            // Check if the caller is one of the shareholders
            for (uint i = 0; i < depositedNfts[_id].shareholders.length; i++) {
                if (msg.sender == depositedNfts[_id].shareholders[i].sender) {
                    withdrawNftAndRewardClaimant(_id, _reward, i);
                    return;
                }
            }
            // Method called from account not involved in this lend. Share rewards equally.
            withdrawNftAndShareRewardEqually(_id, _reward);
        }
    }

    function withdrawNftAndShareRewardEqually(uint256 _id, uint256 _reward) internal {
        uint256 loanAmount = calcReward(DEPOSIT_LENGTH, depositedNfts[_id].rateModifier) * ROI_PCTG / 100;
        for (uint i = 0; i < depositedNfts[_id].shareholders.length; i++) {
            Deposit memory d = depositedNfts[_id].shareholders[i];
            uint256 payback = d.amount * _reward / loanAmount;
            payRewardAccordingToStrategy(d.sender, payback);
        }
    }

    function withdrawNftAndRewardClaimant(uint256 _id, uint256 _reward, uint256 _claimantId) internal {
        uint256 nftWorkValue = calcReward(DEPOSIT_LENGTH, depositedNfts[_id].rateModifier);
        for (uint i = 0; i < depositedNfts[_id].shareholders.length; i++) {
            Deposit memory d = depositedNfts[_id].shareholders[i];
            uint256 payback = d.amount * 100 / ROI_PCTG;
            if (i == _claimantId) {
                payback += _reward - nftWorkValue;
            }
            payRewardAccordingToStrategy(d.sender, payback);
        }
    }

    function selectShareholders(uint256 _id, uint256 _loanAmount) internal {
        require(totalErc20Balance >= _loanAmount, "Not enough erc20 to fund a loan.");
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
                totalErc20Balance -= usedAmount;
                return;
            } else {
                depositedNfts[_id].shareholders.push(Deposit(depositAmount, d.sender));
                selectedAmount = resultingAmount;
                erc20BalanceMap[d.sender] -= depositAmount;
                totalErc20Balance -= depositAmount;
                popDeposit();
                if (resultingAmount == _loanAmount) {
                    return;
                }
            }
        }
        // if while loop does not return early, we don't have enough erc20.
        revert("Not enough deposits.");
    }

    function payRewardAccordingToStrategy(address _receiver, uint256 _amount) internal {
        if (isAutoCompoundOff[_receiver]) {
            erc20.transfer(_receiver, _amount);
        } else {
            erc20BalanceMap[_receiver] += _amount;
            pushDeposit(_amount, _receiver);
            totalErc20Balance += _amount;
        }
    }

    function calcReward(uint256 timeDiff, uint16 zugModifier) internal pure returns (uint256) {
        return timeDiff * (4 + zugModifier) * 1 ether / 1 days;
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

    function autoCompoundStrategy(address _addr) external view override returns(bool) {
        return !isAutoCompoundOff[_addr];
    }

}