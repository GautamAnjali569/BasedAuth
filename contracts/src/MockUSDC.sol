// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockUSDC
/// @author Yudhishthra Sugumaran @ Luca3
/// @notice A mock USDC contract that is ERC20 compliant with 6 decimals
/// @dev This contract allows only the treasury to mint and burn tokens
contract MockUSDC is ERC20 {
    address public treasury;

    //Errors
    error OnlyTreasury(address sender);

    /// @notice Ensures that only the treasury can call the function
    modifier onlyTreasury() {
        if (msg.sender != treasury) revert OnlyTreasury(msg.sender);
        _;
    }

    /// @notice Constructs the MockUSDC contract
    /// @param _treasury The address of the treasury
    constructor(address _treasury) ERC20("USDC", "USDC") {
        treasury = _treasury;
    }

    /// @notice Returns the number of decimals used to get its user representation
    /// @return The number of decimals (6 for USDC)
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Mints new tokens to the treasury
    /// @dev Only the treasury can call this function
    /// @param amount The amount of tokens to mint
    function mint(uint256 amount) public onlyTreasury {
        _mint(treasury, amount);
    }

    /// @notice Burns tokens from the treasury
    /// @dev Only the treasury can call this function
    /// @param amount The amount of tokens to burn
    function burn(uint256 amount) public onlyTreasury {
        _burn(treasury, amount);
    }
}