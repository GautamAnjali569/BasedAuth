# BasedAuth

BasedAuth is a blockchain-based system integrating NFT wallets with RFID and barcode-enabled student ID cards, utilizing biometric authentication and zero-knowledge proofs to securely verify transactions.

## Features

- **NFT Wallet Integration**: Links student ID cards to blockchain-based NFT wallets for secure and transparent management.
- **Biometric Authentication**: Utilizes ZK Face ID for secure facial recognition to verify user identity.
- **Zero-Knowledge Proofs**: Ensures transaction authorization without revealing sensitive biometric data.
- **Smart Contracts**: Manages access rights and logs transactions on the blockchain.

## How It Works

1. **RFID Integration**: Student ID cards equipped with RFID are linked to their NFT wallets on the blockchain.
2. **Biometric Authentication**: The system captures the user's facial biometric data and generates a zero-knowledge proof (ZKP) that confirms the user's identity without revealing the actual biometric data.
3. **Transaction Verification**: The ZKP is used to sign transactions, ensuring that only the verified user can authorize them.
4. **Smart Contract Execution**: Access rights and transactions are managed through smart contracts, ensuring secure and transparent operations.

## Implementation Details

### Prerequisites

- **Blockchain Network**: Set up a Layer 2 blockchain network supporting smart contracts and NFTs.
- **RFID Readers**: Deploy RFID readers at key access points on campus.
- **Biometric Hardware**: Install biometric hardware capable of capturing facial recognition data.

### Steps

1. **System Architecture Design**:

   - Integrate existing RFID infrastructure with the blockchain network.
   - Map out how RFID data interacts with blockchain transactions to ensure data integrity and security.

2. **Smart Contract Development**:

   - Develop smart contracts on the Layer 2 blockchain to handle features of campus services and permission management for NFTs.

3. **Middleware Development**:

   - Create middleware to translate RFID scan outputs into blockchain-readable signals to query or initiate smart contracts.

4. **User Interface Development**:

   - Design interfaces for both administrators and students to manage access rights and view transaction histories.

5. **Testing and Optimization**:

   - Conduct thorough testing to ensure system reliability and optimize for performance.

6. **Documentation and Demo**:
   - Document the entire process from RFID integration to blockchain interactions and prepare a live demonstration.

## Usage

1. **Enroll Users**: Register students' biometric data and link their RFID-enabled ID cards to their NFT wallets.
2. **Access Services**: Students use their ID cards at RFID readers for secure and efficient access to campus services.
3. **Transaction Verification**: Biometric data is captured and verified using zero-knowledge proofs, ensuring secure transactions.

## Benefits

- **Enhanced Security**: Mitigates risks associated with traditional RFID technology through biometric verification.
- **Operational Efficiency**: Reduces administrative overhead with automated processes.
- **Improved Accessibility**: Ensures inclusive access to services for all students.

## Acknowledgements

Special thanks to Asia Pacific University of Technology and Innovation, Prof. Vinesh, Mr. Dhason, and the APU Blockchain & Cryptocurrency Club for their support and guidance.

## Deliverables

- [ ] RFID Integration
  - [ ] Manual User Input
  - [ ] RFID Reader
  - [ ] Barcode Scanner
- [ ] Biometric Authentication
  - [ ] TouchID Recognition
  - [ ] FaceID Recognition
- [ ] Zero-Knowledge Proofs
- [ ] Smart Contracts
  - [ ] Handle Account Contract for APCard
  - [ ] Handle Verification Contract for APCard
- [ ] Middleware
- [ ] User Interface
- [ ] Testing and Optimization
- [ ] Documentation and Demo

---

This project contributes to Sustainable Development Goal 16 by improving institutional integrity through technological integration, aiming to create a secure, efficient, and inclusive educational environment.
