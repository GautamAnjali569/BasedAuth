// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/BasedAuth.sol";
import "../src/ERC6551Registry.sol";
import "../src/ERC6551Account.sol";
import "../src/BasedTreasury.sol";
import "../src/MockUSDC.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract Deploy is Script {
    using Strings for address;

    function substring(
        string memory str,
        uint startIndex,
        uint endIndex
    ) internal pure returns (string memory) {
        bytes memory strBytes = bytes(str);
        bytes memory result = new bytes(endIndex - startIndex);
        for (uint i = startIndex; i < endIndex; i++) {
            result[i - startIndex] = strBytes[i];
        }
        return string(result);
    }

    function indexOf(
        string memory _base,
        string memory _value
    ) internal pure returns (int) {
        bytes memory _baseBytes = bytes(_base);
        bytes memory _valueBytes = bytes(_value);

        for (uint i = 0; i < _baseBytes.length - _valueBytes.length + 1; i++) {
            bool found = true;
            for (uint j = 0; j < _valueBytes.length; j++) {
                if (_baseBytes[i + j] != _valueBytes[j]) {
                    found = false;
                    break;
                }
            }
            if (found) return int(i);
        }
        return -1;
    }

    function convertStringToAddress(
        string memory _addressString
    ) public pure returns (address) {
        bytes memory stringBytes = bytes(_addressString);
        require(stringBytes.length == 42, "Invalid address length"); // 0x + 40 hex characters

        bytes20 addressBytes;
        for (uint i = 2; i < 42; i++) {
            uint8 digit = uint8(stringBytes[i]);
            if (digit >= 48 && digit <= 57) {
                digit -= 48;
            } else if (digit >= 65 && digit <= 70) {
                digit -= 55;
            } else if (digit >= 97 && digit <= 102) {
                digit -= 87;
            } else {
                revert("Invalid character in address string");
            }
            addressBytes |= bytes20(
                uint160(uint160(digit) << (4 * uint160(41 - i)))
            );
        }

        return address(uint160(addressBytes));
    }

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIV_KEY");
        uint256 testerPrivateKey = vm.envUint("TESTER_PRIV_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address tester = vm.addr(testerPrivateKey);

        console.log("Deployer: ", deployer);
        console.log("Deployer Nonce: ", vm.getNonce(deployer));
        console.log("Tester: ", tester);
        console.log("Tester Nonce: ", vm.getNonce(tester));

        vm.startBroadcast(deployerPrivateKey);

        // Deploy ERC6551Account implementation
        ERC6551Account implementation = new ERC6551Account();
        console.log("Deployed ERC6551Account @", address(implementation));

        // Deploy ERC6551Registry
        ERC6551Registry registry = new ERC6551Registry();
        console.log("Deployed ERC6551Registry @", address(registry));

        // Set up BasedAuth parameters
        string memory name = "BasedAuth";

        string memory symbol = "L3A";
        address airnodeRrp = 0xa0AD79D995DdeeB18a14eAef56A549A04e3Aa1Bd;

        // Deploy BasedTreasury
        BasedTreasury basedTreasury = new BasedTreasury();
        console.log("Deployed BasedTreasury @", address(basedTreasury));

        // Deploy MockUSDC
        MockUSDC mockUSDC = new MockUSDC(address(basedTreasury));
        console.log("Deployed MockUSDC @", address(mockUSDC));

        // Set the USDC token contract address
        basedTreasury.setUSDC(address(mockUSDC));

        // Deploy BasedAuth
        BasedAuth basedAuth = new BasedAuth(
            name,
            symbol,
            address(registry),
            address(implementation),
            address(basedTreasury),
            deployer,
            airnodeRrp
        );
        console.log("Deployed BasedAuth @", address(basedAuth));

        // Set the sponsor wallet
        basedTreasury.updateBasedAuth(address(basedAuth));

        // Mint 1_000_000 USDC to the treasury, 6 decimals
        basedTreasury.mintUSDC(1000000 * 10 ** 6);

        string[] memory inputs = new string[](9);
        inputs[0] = "npx";
        inputs[1] = "@api3/airnode-admin";
        inputs[2] = "derive-sponsor-wallet-address";
        inputs[3] = "--airnode-xpub";
        inputs[
            4
        ] = "xpub6CuDdF9zdWTRuGybJPuZUGnU4suZowMmgu15bjFZT2o6PUtk4Lo78KGJUGBobz3pPKRaN9sLxzj21CMe6StP3zUsd8tWEJPgZBesYBMY7Wo";
        inputs[5] = "--airnode-address";
        inputs[6] = "0x6238772544f029ecaBfDED4300f13A3c4FE84E1D";
        inputs[7] = "--sponsor-address";
        inputs[8] = address(basedAuth).toHexString();

        bytes memory result = vm.ffi(inputs);

        // Process the result as needed
        string memory resultString = string(result);

        int index = indexOf(resultString, "0x");

        string memory sponsorWalletAddress = substring(
            resultString,
            uint(index),
            bytes(resultString).length
        );

        console.log(
            "Sponsor wallet address in raw format:",
            sponsorWalletAddress
        );

        address payable recipient = payable(
            convertStringToAddress(sponsorWalletAddress)
        );

        console.log("Recipient address:", recipient);

        //transfer 1 ETH to the derived address from the deployer
        (bool success, ) = recipient.call{value: 0.001 ether}("");
        require(success, "Transfer failed");

        console.log("Sent 0.001 ETH to", recipient);

        console.log("Balance of", recipient, "is", recipient.balance);

        //Set the sponsor wallet
        basedAuth.setSponsorWallet(recipient);

        vm.stopBroadcast();

        vm.startBroadcast(testerPrivateKey);

        //Create a transaction to create student request
        basedAuth.registerStudentRequest("TEST", 0xF132, "TESTTEST");

        vm.stopBroadcast();
    }
}
