// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

interface IHyksos {
    
    function depositErc20(uint256 _amount, bool _isAutoCompoundOn) external;
    function withdrawErc20(uint256 _amount) external;
    function depositNft(uint256 _id) external;
    function withdrawNft(uint256 _id) external;
    function setAutoCompoundStrategy(bool _isAutoCompoundOn) external;
    function erc20Balance(address _addr) external view returns(uint256);
    function totalErc20() external view returns(uint256);
    function autoCompoundStrategy(address _addr) external view returns(bool);

    event Erc20Deposit(address indexed addr, uint256 value);
    event Erc20Withdrawal(address indexed addr, uint256 value);
    event NftDeposit(address indexed addr, uint256 id);
    event NftWithdrawal(address indexed addr, uint256 id);
}