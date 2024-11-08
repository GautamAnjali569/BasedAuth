// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/BasedAuth.sol";
import "../src/ERC6551Registry.sol";
import "../src/ERC6551Account.sol";
import "../src/BasedTreasury.sol";
import "../src/MockUSDC.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "forge-std/console.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20Mock} from "@openzeppelin/contracts/mocks/token/ERC20Mock.sol";

contract BasedAuthTest is Test {
    using Strings for address;

    string public name = "BasedAuth";
    string public symbol = "L3A";
    ERC6551Registry public registry;
    ERC6551Account public implementation;
    address public admin;
    address public tester;
    address public airnodeRrp;
    BasedAuth public basedAuth;
    IERC20 public usdcToken;
    BasedTreasury public basedTreasury;

    //Events from BasedAuth
    event StudentRegistered(
        uint256 studentId,
        string metadata,
        address tbaAddress
    );
    event CertificationCreated(
        uint256 certificationId,
        string metadata,
        address[] eligibleAddresses
    );
    event CertificationClaimed(
        uint256 certificationId,
        string cardUID,
        address studentTBA
    );
    event StudentRegistrationRequested(bytes32 requestId, string cardUID);
    event StudentRegistrationFulfilled(bytes32 requestId, string cardUID);

    /**
     * Helper function to deploy raw EVM bytecode.
     */
    function _deployBytecode(
        bytes memory code
    ) internal returns (address deployedAddress) {
        assembly {
            deployedAddress := create(0, add(code, 0x20), mload(code))
        }
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

    function setUp() public {
        admin = makeAddr("admin");
        tester = 0x5413c994F7Db44a98fEA53deFAB3A16BFfe3b7eB;
        airnodeRrp = 0xa0AD79D995DdeeB18a14eAef56A549A04e3Aa1Bd;
        usdcToken = IERC20(0x036CbD53842c5426634e7929541eC2318f3dCF7e);

        vm.startPrank(admin);
        implementation = new ERC6551Account();

        console.log("Deployed ERC6551Account @", address(implementation));

        registry = new ERC6551Registry();

        console.log("Deployed ERC6551Registry @", address(registry));

        // Deploy BasedTreasury
        basedTreasury = new BasedTreasury();
        console.log("Deployed BasedTreasury @", address(basedTreasury));

        // Deploy MockUSDC
        MockUSDC mockUSDC = new MockUSDC(address(basedTreasury));
        console.log("Deployed MockUSDC @", address(mockUSDC));

        // Set the USDC token contract address
        basedTreasury.setUSDC(address(mockUSDC));

        basedAuth = new BasedAuth(
            name,
            symbol,
            address(registry),
            address(implementation),
            address(basedTreasury),
            admin,
            airnodeRrp
        );

        console.log("Deployed BasedAuth @", address(basedAuth));

        // Set the sponsor wallet
        basedTreasury.updateBasedAuth(address(basedAuth));

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

        //Send 1 ETH to the derived address marked as resultString
        vm.deal(address(admin), 1 ether);
        address payable recipient = payable(
            convertStringToAddress(sponsorWalletAddress)
        );

        console.log("Recipient address:", recipient);

        //transfer 1 ETH to the derived address
        (bool success, ) = recipient.call{value: 1 ether}("");
        require(success, "Transfer failed");

        console.log("Sent 1 ETH to", recipient);

        console.log("Balance of", recipient, "is", recipient.balance);

        //Set the sponsor wallet
        basedAuth.setSponsorWallet(recipient);

        vm.stopPrank();
    }

    function testConstructor() public view {
        assertEq(basedAuth.name(), "BasedAuth");
        assertEq(basedAuth.symbol(), "L3A");
        assertEq(basedAuth.erc6551RegistryAddress_(), address(registry));
        assertEq(
            basedAuth.erc6551ImplementationAddress_(),
            address(implementation)
        );
        assertEq(basedAuth.admin_(), admin);
    }

    function testSetSponsorWallet() public {
        address newSponsorWallet = address(0xdead);
        vm.prank(admin);
        basedAuth.setSponsorWallet(newSponsorWallet);
        assertEq(basedAuth.sponsorWallet(), newSponsorWallet);
        vm.stopPrank();
    }

    function testSetSponsorWalletNonAdmin() public {
        address newSponsorWallet = address(0xdead);
        vm.expectRevert(BasedAuth.NotAdmin.selector);
        basedAuth.setSponsorWallet(newSponsorWallet);
    }

    function testRegisterStudent() public {
        string memory cardUID = "123456";
        uint256 studentId = 1;
        string memory metadata = "ipfs://QmExample";

        //make a fake passkey address
        address passkeyAddressGen = address(0x123456);

        vm.prank(passkeyAddressGen);

        basedAuth.registerStudentRequest(cardUID, studentId, metadata);

        (
            uint256 registeredStudentId,
            string memory registeredMetadata,
            ,
            bool isRegistered,
            address passkeyAddress
        ) = basedAuth.students_(cardUID);
        assertEq(registeredStudentId, studentId);
        assertEq(registeredMetadata, metadata);
        assertFalse(isRegistered); // Not yet registered until fulfillment
        assertEq(passkeyAddress, passkeyAddressGen);
    }

    function testFulfillStudentRegistration() public {
        string memory cardUID = "123456";
        uint256 studentId = 1;
        string memory metadata = "ipfs://QmExample";
        address passkeyAddressGen = address(0x123456);

        vm.prank(passkeyAddressGen);

        bytes32 requestId = basedAuth.registerStudentRequest(
            cardUID,
            studentId,
            metadata
        );

        vm.stopPrank();

        uint256 qrngUint256 = 12345;
        vm.prank(airnodeRrp);

        basedAuth.fulfillStudentRegistration(
            requestId,
            abi.encode(qrngUint256)
        );
        (
            uint256 registeredStudentId,
            string memory registeredMetadata,
            address tbaAddress,
            bool isRegistered,
            address passkeyAddress
        ) = basedAuth.students_(cardUID);

        vm.stopPrank();

        assertEq(registeredStudentId, studentId);
        assertEq(registeredMetadata, metadata);
        assertTrue(isRegistered);
        assertTrue(tbaAddress != address(0));
        assertEq(passkeyAddress, passkeyAddressGen);
        assertEq(basedAuth.balanceOf(passkeyAddressGen), 1);
    }

    function testCreateCertification() public {
        string memory metadata = "ipfs://QmCertExample";
        address[] memory eligibleAddresses = new address[](2);
        eligibleAddresses[0] = address(0x1111);
        eligibleAddresses[1] = address(0x2222);

        vm.expectEmit(true, true, false, true);
        emit CertificationCreated(1, metadata, eligibleAddresses);

        vm.prank(admin);

        uint256 certificationId = basedAuth.createCertification(
            metadata,
            eligibleAddresses
        );

        vm.stopPrank();

        (string memory storedMetadata, bool isRegistered) = basedAuth
            .certifications_(certificationId);
        assertEq(storedMetadata, metadata);
        assertTrue(isRegistered);
    }

    function testIsCertificationClaimed() public {
        vm.prank(admin);

        string memory cardUID = "123456";
        uint256 studentId = 1;
        string memory studentMetadata = "ipfs://QmStudentExample";

        vm.stopPrank();

        vm.prank(makeAddr("0x1111"));

        bytes32 requestId = basedAuth.registerStudentRequest(
            cardUID,
            studentId,
            studentMetadata
        );
        uint256 qrngUint256 = 12345;

        vm.stopPrank();

        vm.prank(address(airnodeRrp));
        basedAuth.fulfillStudentRegistration(
            requestId,
            abi.encode(qrngUint256)
        );

        (, , address tbaAddress, , ) = basedAuth.students_(cardUID);

        vm.stopPrank();

        vm.prank(admin);
        // First, create a certification and register a student
        string memory metadata = "ipfs://QmCertExample";
        address[] memory eligibleAddresses = new address[](1);
        eligibleAddresses[0] = tbaAddress;
        uint256 certificationId = basedAuth.createCertification(
            metadata,
            eligibleAddresses
        );

        // Now test isCertificationClaimed
        assertFalse(
            basedAuth.isCertificationClaimed(certificationId, tbaAddress)
        );

        // Mark as claimed
        vm.prank(tbaAddress);
        basedAuth.markCertificationClaimed(
            certificationId,
            cardUID,
            tbaAddress
        );

        assertTrue(
            basedAuth.isCertificationClaimed(certificationId, tbaAddress)
        );
    }

    function testMarkCertificationClaimed() public {
        // First, create a certification and register a student
        string memory metadata = "ipfs://QmCertExample";
        address[] memory eligibleAddresses = new address[](1);
        eligibleAddresses[0] = address(0x1111);

        vm.prank(admin);

        uint256 certificationId = basedAuth.createCertification(
            metadata,
            eligibleAddresses
        );

        vm.stopPrank();

        string memory cardUID = "123456";
        uint256 studentId = 1;
        string memory studentMetadata = "ipfs://QmStudentExample";

        vm.prank(makeAddr("0x1111"));

        bytes32 requestId = basedAuth.registerStudentRequest(
            cardUID,
            studentId,
            studentMetadata
        );
        uint256 qrngUint256 = 12345;

        vm.stopPrank();

        vm.prank(address(airnodeRrp));
        basedAuth.fulfillStudentRegistration(
            requestId,
            abi.encode(qrngUint256)
        );

        (, , address tbaAddress, , ) = basedAuth.students_(cardUID);

        // Update eligible addresses to include the student's TBA
        eligibleAddresses[0] = tbaAddress;
        vm.prank(admin);
        string memory metadata2 = "ipfs://QmCertExample2";

        uint256 certId2 = basedAuth.createCertification(
            metadata2,
            eligibleAddresses
        );

        vm.stopPrank();

        vm.prank(tbaAddress);
        basedAuth.markCertificationClaimed(certId2, cardUID, tbaAddress);

        assertTrue(basedAuth.isCertificationClaimed(certId2, tbaAddress));
    }

    function testTokenURI() public {
        string memory cardUID = "123456";
        uint256 studentId = 1;
        string memory metadata = "ipfs://QmExample";
        address passkeyAddress = address(0x1111);

        vm.prank(passkeyAddress);

        bytes32 requestId = basedAuth.registerStudentRequest(
            cardUID,
            studentId,
            metadata
        );
        uint256 qrngUint256 = 12345;
        vm.prank(address(airnodeRrp));
        basedAuth.fulfillStudentRegistration(
            requestId,
            abi.encode(qrngUint256)
        );

        assertEq(basedAuth.tokenURI(cardUID), metadata);
        vm.stopPrank();
    }

    function testUpdateERC6551RegistryAddress() public {
        address newRegistryAddress = address(0x5678);
        basedAuth.updateERC6551RegistryAddress(newRegistryAddress);
        assertEq(basedAuth.erc6551RegistryAddress_(), newRegistryAddress);
    }

    function testUpdateERC6551ImplementationAddress() public {
        address newImplementationAddress = address(0x9ABC);
        basedAuth.updateERC6551ImplementationAddress(newImplementationAddress);
        assertEq(
            basedAuth.erc6551ImplementationAddress_(),
            newImplementationAddress
        );
    }

    function testIsTBA() public {
        string memory cardUID = "123456";
        uint256 studentId = 1;
        string memory metadata = "ipfs://QmExample";
        address passkeyAddress = address(0x1111);

        vm.prank(passkeyAddress);

        bytes32 requestId = basedAuth.registerStudentRequest(
            cardUID,
            studentId,
            metadata
        );
        vm.stopPrank();
        uint256 qrngUint256 = 12345;
        vm.prank(address(airnodeRrp));
        basedAuth.fulfillStudentRegistration(
            requestId,
            abi.encode(qrngUint256)
        );

        (, , address tbaAddress, , ) = basedAuth.students_(cardUID);

        assertTrue(basedAuth.isTBA(cardUID, tbaAddress));
        assertFalse(basedAuth.isTBA(cardUID, address(0x1111)));
        vm.stopPrank();
    }

    function testUpdateBasedAuth() public {
        address newBasedAuthAddress = address(0x123);
        basedTreasury.updateBasedAuth(newBasedAuthAddress);
        assertEq(address(basedTreasury.basedAuth()), newBasedAuthAddress);
    }
}
