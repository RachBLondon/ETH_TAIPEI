// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TokenLockup is Ownable {
    struct Player {
        uint256 deposit;
        uint256 lockupUntil;
        uint256 tokenGains;
        bool hasWithdrawn;
    }

    IERC20 public token;
    uint256 public fixedDepositAmount;
    uint256 public penaltyPercentage;
    mapping(address => Player) public players;
    address[] public activePlayers;

    constructor(IERC20 _token, uint256 _fixedDepositAmount, uint256 _penaltyPercentage) {
        token = _token;
        fixedDepositAmount = _fixedDepositAmount;
        penaltyPercentage = _penaltyPercentage;
    }

    function deposit(uint256 lockupUntil) external {
        require(players[msg.sender].deposit == 0, "Player has already deposited");
        require(lockupUntil > block.timestamp, "Lockup time must be in the future");
        token.transferFrom(msg.sender, address(this), fixedDepositAmount);

        players[msg.sender] = Player(fixedDepositAmount, lockupUntil, 0, false);
        activePlayers.push(msg.sender);
    }

    function earlyWithdraw() external {
        Player storage player = players[msg.sender];
        require(!player.hasWithdrawn, "Player has already withdrawn");
        require(player.lockupUntil > block.timestamp, "Withdrawal is not early");

        uint256 penaltyAmount = (player.deposit * penaltyPercentage) / 100;
        uint256 remainingAmount = player.deposit - penaltyAmount;
        token.transfer(msg.sender, remainingAmount);

        distributePenalty(penaltyAmount);

        player.hasWithdrawn = true;
    }

    function distributePenalty(uint256 penaltyAmount) internal {
        uint256 totalRemainingLockupDays;
        for (uint256 i = 0; i < activePlayers.length; i++) {
            Player storage player = players[activePlayers[i]];
            if (!player.hasWithdrawn) {
                uint256 remainingLockupDays = (player.lockupUntil - block.timestamp) / 1 days;
                totalRemainingLockupDays += remainingLockupDays;
            }
        }

        for (uint256 i = 0; i < activePlayers.length; i++) {
            Player storage player = players[activePlayers[i]];
            if (!player.hasWithdrawn) {
                uint256 remainingLockupDays = (player.lockupUntil - block.timestamp) / 1 days;
                uint256 gain = (penaltyAmount * remainingLockupDays) / totalRemainingLockupDays;
                player.tokenGains += gain;
            }
        }
    }
}
