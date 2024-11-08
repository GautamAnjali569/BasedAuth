// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./interfaces/IERC6551Registry.sol";
import "./RrpRequesterV0.sol";
import "./ERC6551Account.sol";

/// @title BasedAuth
/// @author Yudhishthra Sugumaran @ Luca3
/// @notice This contract manages student registrations and certifications using ERC721 tokens and ERC6551 token-bound accounts
/// @dev Inherits from ERC721 and RrpRequesterV0 for NFT functionality and Airnode integration
contract BasedAuth is ERC721, RrpRequesterV0 {
    using Strings for uint256;

    /// @notice Struct to store student information
    struct Student {
        uint256 studentId;
        string metadata;
        address tbaAddress;
        bool isRegistered;
        address passkeyAddress;
    }

    /// @notice Struct to store certification information
    struct Certification {
        string metadata;
        bool isRegistered;
        mapping(address => bool) hasClaimed;
        address[] eligibleAddresses;
    }

    /// @notice Address of the ERC6551 registry contract
    address public erc6551RegistryAddress_;
    /// @notice Address of the ERC6551 implementation contract
    address public erc6551ImplementationAddress_;

    /// @notice Address of the admin
    address public admin_;
    /// @notice Address of the BasedTreasury contract
    address public basedTreasury_;

    /// @notice Mapping of card UIDs to student information
    mapping(string => Student) public students_;
    /// @notice Mapping of certification IDs to certification information
    mapping(uint256 => Certification) public certifications_;
    /// @notice Mapping to track unique metadata hashes
    mapping(bytes32 => bool) public metadataHashes_;
    /// @notice Mapping of request IDs to card UIDs
    mapping(bytes32 => string) public requestIdToCardUID;
    /// @notice Mapping to track expected request fulfillments
    mapping(bytes32 => bool) public expectingRequestWithIdToBeFulfilled;
    /// @notice Counter for certification IDs
    uint256 private currentCertificationId = 0;

    // QRNG variables
    /// @notice The address of the Airnode for QRNG requests
    address constant AIRNODE = 0x6238772544f029ecaBfDED4300f13A3c4FE84E1D;
    /// @notice The endpoint ID for uint256 QRNG requests
    bytes32 constant ENDPOINT_ID_UINT256 =
        0x94555f83f1addda23fdaa7c74f27ce2b764ed5cc430c66f5ff1bcf39d583da36;
    /// @notice The address of the sponsor wallet for QRNG requests
    address public sponsorWallet;

    // Custom errors
    error StudentAlreadyRegistered(uint256 studentId);
    error StudentDoesNotExist(uint256 studentId);
    error CertificationAlreadyRegistered(uint256 certificationId);
    error CertificationDoesNotExist(uint256 certificationId);
    error MetadataIsNotUnique(string metadata);
    error AlreadyClaimed(uint256 certificationId, address studentTBA);
    error NotTokenBoundAccountError(address _walletAddress);
    error SignatureValidationFailed();
    error NotAdmin();
    error NotEligible(uint256 certificationId, address studentTBA);
    error RequestIdNotKnown();

    // Events
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

    /// @notice Ensures the caller is the token-bound account for the given card UID
    modifier onlyTBA(string memory cardUID) {
        if (msg.sender != students_[cardUID].tbaAddress)
            revert NotTokenBoundAccountError(students_[cardUID].tbaAddress);
        _;
    }

    /// @notice Ensures the caller is the admin
    modifier onlyAdmin() {
        if (msg.sender != admin_) revert NotAdmin();
        _;
    }

    /// @notice Constructor to initialize the contract
    /// @param _name Name of the ERC721 token
    /// @param _symbol Symbol of the ERC721 token
    /// @param _erc6551RegistryAddress Address of the ERC6551 registry contract
    /// @param _erc6551ImplementationAddress Address of the ERC6551 implementation contract
    /// @param _basedTreasury Address of the BasedTreasury contract
    /// @param _admin Address of the admin
    /// @param _airnodeRrp Address of the Airnode RRP contract
    constructor(
        string memory _name,
        string memory _symbol,
        address _erc6551RegistryAddress,
        address _erc6551ImplementationAddress,
        address _basedTreasury,
        address _admin,
        address _airnodeRrp
    ) ERC721(_name, _symbol) RrpRequesterV0(_airnodeRrp) {
        erc6551RegistryAddress_ = _erc6551RegistryAddress;
        erc6551ImplementationAddress_ = _erc6551ImplementationAddress;
        basedTreasury_ = _basedTreasury;
        admin_ = _admin;
    }

    /// @notice Sets the sponsor wallet address for Airnode requests
    /// @param _sponsorWallet Address of the sponsor wallet
    function setSponsorWallet(address _sponsorWallet) public onlyAdmin {
        sponsorWallet = _sponsorWallet;
    }

    /// @notice Initiates a student registration request
    /// @param cardUID Unique identifier for the student's card
    /// @param studentId Unique identifier for the student
    /// @param metadata Metadata associated with the student
    /// @return Address of the created token-bound account
    function registerStudentRequest(
        string memory cardUID,
        uint256 studentId,
        string memory metadata
    ) public returns (bytes32) {
        if (students_[cardUID].isRegistered) {
            revert StudentAlreadyRegistered(students_[cardUID].studentId);
        }

        bytes32 metadataHash = keccak256(abi.encodePacked(metadata));
        if (metadataHashes_[metadataHash]) {
            revert MetadataIsNotUnique(metadata);
        }

        students_[cardUID] = Student({
            studentId: studentId,
            metadata: metadata,
            passkeyAddress: msg.sender,
            tbaAddress: address(0),
            isRegistered: false
        });

        metadataHashes_[metadataHash] = true;

        bytes32 requestId = airnodeRrp.makeFullRequest(
            AIRNODE,
            ENDPOINT_ID_UINT256,
            address(this),
            sponsorWallet,
            address(this),
            this.fulfillStudentRegistration.selector,
            ""
        );
        expectingRequestWithIdToBeFulfilled[requestId] = true;
        requestIdToCardUID[requestId] = cardUID;

        emit StudentRegistrationRequested(requestId, cardUID);

        return requestId;
    }

    /// @notice Fulfills a student registration request with QRNG data
    /// @param requestId Unique identifier for the Airnode request
    /// @param data Encoded QRNG data from Airnode
    function fulfillStudentRegistration(
        bytes32 requestId,
        bytes calldata data
    ) external onlyAirnodeRrp {
        if (!expectingRequestWithIdToBeFulfilled[requestId])
            revert RequestIdNotKnown();
        expectingRequestWithIdToBeFulfilled[requestId] = false;

        uint256 qrngUint256 = abi.decode(data, (uint256));
        string memory cardUID = requestIdToCardUID[requestId];
        emit StudentRegistrationFulfilled(requestId, cardUID);

        uint256 tokenId = uint256(
            keccak256(abi.encodePacked(cardUID, qrngUint256))
        );

        _safeMint(students_[cardUID].passkeyAddress, tokenId);

        IERC6551Registry registry = IERC6551Registry(erc6551RegistryAddress_);
        address tbaAddress = registry.createAccount(
            erc6551ImplementationAddress_,
            bytes32(qrngUint256),
            block.chainid,
            address(this),
            tokenId
        );

        ERC6551Account account = ERC6551Account(payable(tbaAddress));
        account.setAccountParameters(
            address(this),
            address(basedTreasury_),
            cardUID
        );

        students_[cardUID].tbaAddress = tbaAddress;
        students_[cardUID].isRegistered = true;

        emit StudentRegistered(
            students_[cardUID].studentId,
            students_[cardUID].metadata,
            tbaAddress
        );
    }

    /// @notice Creates a new certification
    /// @param metadata Metadata associated with the certification
    /// @param eligibleAddresses Array of addresses eligible for the certification
    /// @return The ID of the newly created certification
    function createCertification(
        string memory metadata,
        address[] memory eligibleAddresses
    ) public onlyAdmin returns (uint256) {
        bytes32 metadataHash = keccak256(abi.encodePacked(metadata));

        if (metadataHashes_[metadataHash]) {
            revert MetadataIsNotUnique(metadata);
        }

        uint256 newCertificationId = ++currentCertificationId;
        certifications_[newCertificationId].metadata = metadata;
        certifications_[newCertificationId].isRegistered = true;
        certifications_[newCertificationId]
            .eligibleAddresses = eligibleAddresses;
        metadataHashes_[metadataHash] = true;

        emit CertificationCreated(
            newCertificationId,
            metadata,
            eligibleAddresses
        );

        return newCertificationId;
    }

    /// @notice Checks if a certification has been claimed by a student
    /// @param certificationId ID of the certification
    /// @param studentTBA Address of the student's token-bound account
    /// @return Boolean indicating if the certification has been claimed
    function isCertificationClaimed(
        uint256 certificationId,
        address studentTBA
    ) public view returns (bool) {
        if (!certifications_[certificationId].isRegistered) {
            revert CertificationDoesNotExist(certificationId);
        }

        return certifications_[certificationId].hasClaimed[studentTBA];
    }

    /// @notice Marks a certification as claimed by a student
    /// @param certificationId ID of the certification
    /// @param cardUID Unique identifier for the student's card
    /// @param studentTBA Address of the student's token-bound account
    function markCertificationClaimed(
        uint256 certificationId,
        string memory cardUID,
        address studentTBA
    ) external onlyTBA(cardUID) {
        if (!certifications_[certificationId].isRegistered) {
            revert CertificationDoesNotExist(certificationId);
        }
        if (certifications_[certificationId].hasClaimed[studentTBA]) {
            revert AlreadyClaimed(certificationId, studentTBA);
        }

        bool isEligible = false;
        for (
            uint i = 0;
            i < certifications_[certificationId].eligibleAddresses.length;
            i++
        ) {
            if (
                certifications_[certificationId].eligibleAddresses[i] ==
                studentTBA
            ) {
                isEligible = true;
                break;
            }
        }
        if (!isEligible) {
            revert NotEligible(certificationId, studentTBA);
        }

        certifications_[certificationId].hasClaimed[studentTBA] = true;
        emit CertificationClaimed(certificationId, cardUID, studentTBA);
    }

    /// @notice Returns the metadata URI for a given card UID
    /// @param cardUID Unique identifier for the student's card
    /// @return The metadata URI for the student
    function tokenURI(
        string memory cardUID
    ) public view returns (string memory) {
        if (!students_[cardUID].isRegistered) {
            revert StudentDoesNotExist(students_[cardUID].studentId);
        }

        return students_[cardUID].metadata;
    }

    /// @notice Updates the address of the ERC6551 registry contract
    /// @param _erc6551RegistryAddress New address of the ERC6551 registry contract
    function updateERC6551RegistryAddress(
        address _erc6551RegistryAddress
    ) public {
        erc6551RegistryAddress_ = _erc6551RegistryAddress;
    }

    /// @notice Updates the address of the ERC6551 implementation contract
    /// @param _erc6551ImplementationAddress New address of the ERC6551 implementation contract
    function updateERC6551ImplementationAddress(
        address _erc6551ImplementationAddress
    ) public {
        erc6551ImplementationAddress_ = _erc6551ImplementationAddress;
    }

    /// @notice Checks if a given address is the token-bound account for a card UID
    /// @param cardUID Unique identifier for the student's card
    /// @param walletAddress Address to check
    /// @return Boolean indicating if the address is the token-bound account for the card UID
    function isTBA(
        string memory cardUID,
        address walletAddress
    ) public view returns (bool) {
        return students_[cardUID].tbaAddress == walletAddress;
    }

    /// @notice Returns the student data for a given card UID
    /// @param cardUID Unique identifier for the student's card
    /// @return The student data for the given card UID
    function getStudentData(
        string memory cardUID
    ) public view returns (Student memory) {
        return students_[cardUID];
    }

    /// @notice Returns the certification data for a given certification ID
    /// @param certificationId ID of the certification
    /// @return metadata The metadata for the given certification ID
    /// @return isRegistered The registration status for the given certification ID
    /// @return eligibleAddresses The eligible addresses for the given certification ID
    function getCertificationData(
        uint256 certificationId
    )
        public
        view
        returns (
            string memory metadata,
            bool isRegistered,
            address[] memory eligibleAddresses
        )
    {
        Certification storage cert = certifications_[certificationId];
        return (cert.metadata, cert.isRegistered, cert.eligibleAddresses);
    }

    /// @notice Returns the admin address
    /// @return The admin address
    function getAdminAddress() public view returns (address) {
        return admin_;
    }
}
