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

contract DepositQueue {
    struct Deposit {
        uint256 amount;
        address sender;
    }

    Deposit[] depositQueue;
    uint256 topIndex;

    constructor() {
        topIndex = 0;
    }

    function pushDeposit(uint256 _amount, address _sender) internal {
        depositQueue.push(Deposit(_amount, _sender));
    }

    function popDeposit() internal returns(Deposit memory) {
        require(!isDepositQueueEmpty());
        Deposit memory d = depositQueue[topIndex];
        delete depositQueue[topIndex];
        topIndex++;
        return d;
    }

    function getTopDeposit() internal view returns(Deposit memory) {
        require(!isDepositQueueEmpty());
        return depositQueue[topIndex];
    }

    function isDepositQueueEmpty() internal view returns(bool) {
        return depositQueue.length > topIndex;
    }
}

// remember IERC721Receiver
contract BananaPool is DepositQueue {
    using SafeMath for uint256;
    event BananaDeposit(address indexed addr, uint256 value);
    event BananaWithdrawal(address indexed addr, uint256 value);
    event KongDeposit(address indexed addr, uint256 id);
    
    IKongz kongz;
    IERC20 bananas;

    struct Kong {
        uint256 timeDeposited;
        address owner;
    }

    mapping(address => uint256) bananaBalance;
    mapping(uint256 => Kong) depositedKongs;

    uint constant depositLength = 60 * 60 * 24 * 1;
    uint256 constant public BASE_RATE = 10 ether; 

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
        bananaBalance[msg.sender] = bananaBalance[msg.sender].add(_amount);
        pushDeposit(_amount, msg.sender);
        emit BananaDeposit(msg.sender, _amount);
    }

    function withdrawBananas(uint256 _amount) external {
        require(bananaBalance[msg.sender] > 0, "No bananas to withdraw");
        require(bananaBalance[msg.sender] >= _amount, "Requested more bananas than owned");
        bananaBalance[msg.sender] = bananaBalance[msg.sender].sub(_amount);
        bananas.transfer(msg.sender, _amount);
        emit BananaWithdrawal(msg.sender, _amount);
    }

    function getBananaBalance() external view returns(uint256) {
        return bananaBalance[msg.sender];
    }

    function lendKong(uint256 _id) external {
        require(kongz.ownerOf(_id) == msg.sender, "Not the Kong owner");
        require(kongz.getApproved(_id) == address(this));
        // add safetransfer
        kongz.transferFrom(msg.sender, address(this), _id);
        depositedKongs[_id] = Kong(block.timestamp, msg.sender);
        // add bananas transfer algo here
        emit KongDeposit(msg.sender, _id);
    }

    function withdrawKong(uint256 _id) external {
        require(depositedKongs[_id].owner == msg.sender, "Not the kong owner");
        require(depositedKongs[_id].timeDeposited.add(depositLength) < block.timestamp, "Too early to withdraw");
        kongz.getReward();
        uint256 reward = calcReward(depositLength);
        // add bananas requirements & transfer here
        kongz.transferFrom(address(this), msg.sender, _id);

    }

    function calcReward(uint256 time) internal pure returns(uint256) {
        return BASE_RATE.mul(time).div(86400);
    }
}