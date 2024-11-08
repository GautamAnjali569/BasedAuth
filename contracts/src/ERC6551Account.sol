// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC1271.sol";
import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./BasedAuth.sol";
import "./BasedTreasury.sol";

interface IERC6551Account {
    receive() external payable;
    function token()
        external
        view
        returns (uint256 chainId, address tokenContract, uint256 tokenId);
    function state() external view returns (uint256);
    function isValidSigner(
        address signer,
        bytes calldata context
    ) external view returns (bytes4 magicValue);
}

interface IERC6551Executable {
    function execute(
        address to,
        uint256 value,
        bytes calldata data,
        uint8 operation
    ) external payable returns (bytes memory);
}

/// @title ERC6551 Account Implementation
/// @author Yudhishthra Sugumaran @ Luca3
/// @notice This contract implements the ERC6551 Account standard
/// @dev This contract allows NFTs to own assets and execute transactions
contract ERC6551Account is
    IERC165,
    IERC1271,
    IERC6551Account,
    IERC6551Executable
{
    /// @notice Event emitted when the account parameters are set
    /// @param _BasedAuthAddress The address of the BasedAuth contract
    /// @param _luca3TreasuryAddress The address of the Luca3Treasury contract
    /// @param _cardUID The Card UID of the account
    event AccountParametersSet(
        address _BasedAuthAddress,
        address _luca3TreasuryAddress,
        string _cardUID
    );

    //Custom errors
    error InvalidSigner(address signer, address owner);
    error OnlyCallOperations(
        address caller,
        address to,
        uint256 value,
        bytes data,
        uint8 operation
    );
    error BasedAuthAddressNotSet(address BasedAuthAddress);
    error AmountMustBeGreaterThanZero(uint256 amount);
    error InsufficientETHBalance(uint256 balance, uint256 amount);

    /// @notice The current state of the account
    /// @dev This value is incremented each time the account's state changes
    uint256 public state;

    /// @notice The address of the BasedAuth contract
    address public BasedAuthAddress_;

    /// @notice The Card UID of the account
    string public cardUID_;

    /// @notice The address of the Luca3Treasury contract
    address public luca3TreasuryAddress_;

    /// @notice Allows the account to receive Ether
    /// @dev This function is called when the account receives Ether
    receive() external payable {}

    /// @notice Executes a call on behalf of the account
    /// @dev Only callable by a valid signer
    /// @param to The target address for the call
    /// @param value The amount of Ether to send with the call
    /// @param data The call data
    /// @param operation The type of operation to perform (only call operations are supported)
    /// @return result The result of the call
    function execute(
        address to,
        uint256 value,
        bytes calldata data,
        uint8 operation
    ) external payable virtual returns (bytes memory result) {
        if (!_isValidSigner(msg.sender))
            revert InvalidSigner(msg.sender, owner());
        if (operation != 0)
            revert OnlyCallOperations(msg.sender, to, value, data, operation);

        ++state;

        bool success;
        (success, result) = to.call{value: value}(data);

        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }

    /// @notice Checks if a given address is a valid signer for this account
    /// @param signer The address to check
    /// @return The magic value if the signer is valid, or 0 otherwise
    function isValidSigner(
        address signer,
        bytes calldata
    ) external view virtual returns (bytes4) {
        if (_isValidSigner(signer)) {
            return IERC6551Account.isValidSigner.selector;
        }
        return bytes4(0);
    }

    /// @notice Validates a signature for ERC1271 compatibility
    /// @param hash The hash of the data that was signed
    /// @param signature The signature to validate
    /// @return magicValue The magic value if the signature is valid, or 0 otherwise
    function isValidSignature(
        bytes32 hash,
        bytes memory signature
    ) external view virtual returns (bytes4 magicValue) {
        bool isValid;

        isValid = SignatureChecker.isValidSignatureNow(
            owner(),
            hash,
            signature
        );

        if (isValid) {
            return IERC1271.isValidSignature.selector;
        }
        return bytes4(0);
    }

    /// @notice Checks if the contract supports a given interface
    /// @param interfaceId The interface identifier to check
    /// @return True if the contract supports the interface, false otherwise
    function supportsInterface(
        bytes4 interfaceId
    ) external pure virtual returns (bool) {
        return
            interfaceId == type(IERC165).interfaceId ||
            interfaceId == type(IERC6551Account).interfaceId ||
            interfaceId == type(IERC6551Executable).interfaceId;
    }

    /// @notice Returns the token associated with this account
    /// @return chainId The chain ID of the token
    /// @return tokenContract The address of the token contract
    /// @return tokenId The ID of the token
    function token() public view virtual returns (uint256, address, uint256) {
        bytes memory footer = new bytes(0x60);

        assembly {
            extcodecopy(address(), add(footer, 0x20), 0x4d, 0x60)
        }

        return abi.decode(footer, (uint256, address, uint256));
    }

    /// @notice Returns the owner of the account
    /// @return The address of the owner
    function owner() public view virtual returns (address) {
        (uint256 chainId, address tokenContract, uint256 tokenId) = token();
        if (chainId != block.chainid) return address(0);

        return IERC721(tokenContract).ownerOf(tokenId);
    }

    /// @notice Internal function to check if a signer is valid
    /// @param signer The address to check
    /// @return True if the signer is valid, false otherwise
    function _isValidSigner(
        address signer
    ) internal view virtual returns (bool) {
        return signer == owner();
    }

    /// @notice Claims a certification
    /// @param certificationId The ID of the certification to claim
    function claimCertification(uint256 certificationId) external {
        if (!_isValidSigner(msg.sender))
            revert InvalidSigner(msg.sender, owner());
        if (BasedAuthAddress_ == address(0))
            revert BasedAuthAddressNotSet(BasedAuthAddress_);

        // Mark the certification as claimed
        BasedAuth basedAuth = BasedAuth(BasedAuthAddress_);
        basedAuth.markCertificationClaimed(
            certificationId,
            cardUID_,
            address(this)
        );

        // Increment the state
        ++state;
    }

    /// @notice Swaps ETH in the account for USDC using the Luca3Treasury contract
    /// @param amount The amount of ETH to swap
    function swapEthForUsdc(uint256 amount) external {
        if (amount == 0) revert AmountMustBeGreaterThanZero(amount);
        if (address(this).balance < amount)
            revert InsufficientETHBalance(address(this).balance, amount);
        if (!_isValidSigner(msg.sender))
            revert InvalidSigner(msg.sender, owner());

        BasedTreasury basedTreasury = BasedTreasury(
            payable(luca3TreasuryAddress_)
        );
        basedTreasury.swapEthForUsdc{value: amount}(cardUID_);

        // Increment the state
        ++state;
    }

    /// @notice Transfers USDC from this account to another address
    /// @param _usdcAddress The address of the USDC token contract
    /// @param _recipient The address to receive the USDC
    /// @param _amount The amount of USDC to transfer
    function transferUsdcToAddress(
        address _usdcAddress,
        address _recipient,
        uint256 _amount
    ) external {
        if (!_isValidSigner(msg.sender))
            revert InvalidSigner(msg.sender, owner());

        // Transfer USDC from this account to the recipient
        IERC20(_usdcAddress).transfer(_recipient, _amount);

        // Increment the state
        ++state;
    }

    /// @notice Sets the account parameters
    /// @param _BasedAuthAddress The address of the BasedAuth contract
    /// @param _luca3TreasuryAddress The address of the Luca3Treasury contract
    /// @param _cardUID The Card UID of the account
    function setAccountParameters(
        address _BasedAuthAddress,
        address _luca3TreasuryAddress,
        string memory _cardUID
    ) external {
        BasedAuthAddress_ = _BasedAuthAddress;
        luca3TreasuryAddress_ = _luca3TreasuryAddress;
        cardUID_ = _cardUID;
        emit AccountParametersSet(
            _BasedAuthAddress,
            _luca3TreasuryAddress,
            _cardUID
        );
    }
}
