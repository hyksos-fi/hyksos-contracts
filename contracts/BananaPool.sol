// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;
import '../openzeppelin/token/ERC721/IERC721.sol';
import '../openzeppelin/token/ERC721/IERC721Receiver.sol';
import '../openzeppelin/token/ERC20/IERC20.sol';
import '../openzeppelin/utils/math/SafeMath.sol';

interface IKongz is IERC721 {
    function balanceOG(address _user) external view returns(uint256);
    function getReward() external;
}


// wyjebać w osobny kontrakt, jeśli jeden będzie za duży
contract DepositQueue {
    struct Deposit {
        uint256 amount;
        address sender;
    }

    Deposit[] depositQueue;
    uint256 topIndex;

    function isDepositQueueEmpty() internal view returns(bool) {
        return depositQueue.length <= topIndex;
    }

    modifier nonEmpty() {
        require(!isDepositQueueEmpty());
        _;
    }

    function pushDeposit(uint256 _amount, address _sender) internal {
        depositQueue.push(Deposit(_amount, _sender));
    }

    function popDeposit() internal nonEmpty returns(Deposit memory) {
        delete depositQueue[topIndex];
        topIndex++;
    }

    function getTopDeposit() internal nonEmpty view returns(Deposit memory) {
        return depositQueue[topIndex];
    }

    function setTopDepositAmount(uint256 _amount) internal nonEmpty {
        depositQueue[topIndex].amount = _amount;
    }
}

// remember IERC721Receiver
contract BananaPool is DepositQueue {
    using SafeMath for uint256;

    event BananaDeposit(address indexed addr, uint256 value);
    event BananaWithdrawal(address indexed addr, uint256 value);
    event KongDeposit(address indexed addr, uint256 id);
    event KongWithdrawal(address indexed addr, uint256 id);
    
    IKongz kongz;
    IERC20 bananas;

    struct Kong {
        uint256 timeDeposited;
        address owner;
        Deposit[] lenders;
    }

    mapping(address => uint256) bananaBalance;
    mapping(uint256 => Kong) depositedKongs;
    uint256 totalBananasBalance;

    uint256 constant DEPOSIT_LENGTH_DAYS = 10;
    uint256 constant DEPOSIT_LENGTH_SECONDS = DEPOSIT_LENGTH_DAYS * 86400;
    uint256 constant BASE_RATE = 10 ether;
    uint256 constant MIN_DEPOSIT = 1 * BASE_RATE; // do ustalenia
    uint256 constant ROI_PCTG = 80;
    uint256 constant KONG_WORK_VALUE = BASE_RATE * DEPOSIT_LENGTH_DAYS;
    uint256 constant LOAN_AMOUNT = KONG_WORK_VALUE * ROI_PCTG / 100;


    constructor(address _bananas, address _kongz) {
        kongz = IKongz(_kongz);
        bananas = IERC20(_bananas);
    }

    function depositBananas(uint256 _amount) external {
        require(_amount > 0, "Amount must be positive");
        require(bananas.balanceOf(msg.sender) >= _amount, "Not enough bananas to deposit");
        // possibly add allowance for the whole amount
        uint256 allowance = bananas.allowance(msg.sender, address(this));
        require(allowance >= _amount, "Not enough allowance");
        bananas.transferFrom(msg.sender, address(this), _amount);
        bananaBalance[msg.sender] += _amount;
        pushDeposit(_amount, msg.sender);
        totalBananasBalance += _amount;
        emit BananaDeposit(msg.sender, _amount);
    }

    function withdrawBananas() external {
        require(bananaBalance[msg.sender] > 0, "No bananas to withdraw");
        uint256 amount = bananaBalance[msg.sender];
        bananas.transfer(msg.sender, amount);
        totalBananasBalance -= amount;
        bananaBalance[msg.sender] = 0;
        emit BananaWithdrawal(msg.sender, amount);
    }

    function lendKong(uint256 _id) external {
        require(kongz.ownerOf(_id) == msg.sender, "Not the Kong owner");
        require(kongz.getApproved(_id) == address(this));
        // add safetransfer
        kongz.transferFrom(msg.sender, address(this), _id);
        bananas.transfer(msg.sender, LOAN_AMOUNT);
        depositedKongs[_id].timeDeposited = block.timestamp;
        depositedKongs[_id].owner = msg.sender;
        selectLenders(_id);
        emit KongDeposit(msg.sender, _id);
    }

    function withdrawKong(uint256 _id) external {
        require(depositedKongs[_id].owner == msg.sender, "Not the kong owner");
        require(depositedKongs[_id].timeDeposited.add(DEPOSIT_LENGTH_SECONDS) < block.timestamp, "Too early to withdraw");
        uint256 reward = calcReward(block.timestamp.sub(depositedKongs[_id].timeDeposited));
        kongz.getReward();
        for (uint i = 0; i < depositedKongs[_id].lenders.length; i++) {
            Deposit memory d = depositedKongs[_id].lenders[i];
            uint256 payback = d.amount.mul(100).div(ROI_PCTG).mul(reward).div(KONG_WORK_VALUE);
            bananas.transfer(d.sender, payback);
        }
        kongz.transferFrom(address(this), depositedKongs[_id].owner, _id);
        delete depositedKongs[_id];
        emit KongWithdrawal(msg.sender, _id);
    }

    function selectLenders(uint256 _id) internal {
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
                depositedKongs[_id].lenders.push(Deposit(usedAmount, d.sender));
                bananaBalance[d.sender] -= usedAmount;
                totalBananasBalance -= usedAmount;
                return;
            } else {
                depositedKongs[_id].lenders.push(Deposit(depositAmount, d.sender));
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
        revert("Not enough deposits");
    }

    function calcReward(uint256 time) internal pure returns(uint256) {
        return BASE_RATE.mul(time).div(86400);
    }

    function getBananaBalance(address _addr) external view returns(uint256) {
        return bananaBalance[_addr];
    }

    function getTotalBananas() external view returns(uint256) {
        return totalBananasBalance;
    }

    function getDepositedKong(uint256 _id) external view returns(Kong memory) {
        return depositedKongs[_id];
    }


}