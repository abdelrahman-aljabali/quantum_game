# 2/3 Average Game DApp

A blockchain-based multiplayer game implemented in Solidity where players submit numbers between 0-1000, and the winner is the player whose number is closest to 2/3 of the average of all submitted numbers. Built as a university blockchain course assignment with modern web technologies.

**Status:** ✅ **Production-Ready Implementation** - Core functionality complete, testing and testnet deployment pending.

## Project Overview

### Game Rules
- Minimum 3 players required to start a game
- Each player submits a number between 0-1000 (inclusive)
- Winner is determined by whose number is closest to **2/3 of the average** of all submitted numbers
- Players pay an entry fee to participate
- Winner receives the prize pool, game operator receives service fee
- Commit-reveal pattern ensures fair play despite blockchain transparency

### Academic Assignment
This project fulfills the requirements for a blockchain development course, demonstrating:
- Factory pattern implementation
- Secure smart contract development
- Gas optimization techniques  
- Modern frontend development
- Web3 integration best practices

Detailed requirements and architecture documentation: [`PLANNING.md`](PLANNING.md)  
Task tracking and development progress: [`TASK.md`](TASK.md)

## 🏗️ Project Structure

```
quantum_game_DApp-main/
├── contracts/                 # Solidity smart contracts
│   ├── GameFactory.sol       # ✅ Factory for creating game instances
│   └── TwoThirdsAverageGame.sol # ✅ Main game logic contract
├── Frontend/                  # React + TypeScript frontend
│   ├── src/
│   │   ├── components/       # ✅ Game UI components
│   │   ├── contexts/         # ✅ Web3 integration
│   │   └── hooks/            # ✅ Custom React hooks
│   └── package.json
├── scripts/                   # Deployment and utility scripts
│   ├── deploy.ts             # ✅ Contract deployment
│   └── exportABIs.ts         # ✅ ABI generation
├── test/                      # ❌ Unit tests (pending)
├── hardhat.config.ts         # ✅ Hardhat configuration
└── package.json              # ✅ Project dependencies
```

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v16 or higher)
- **MetaMask** browser extension
- **Git** for version control

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd quantum_game_DApp-main
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd Frontend
   npm install
   cd ..
   ```

### Running the Application

1. **Start Hardhat local blockchain**
   ```bash
   npx hardhat node
   ```
   Keep this terminal running. Note the displayed accounts and private keys.

2. **Deploy contracts (in new terminal)**
   ```bash
   npx hardhat run scripts/deploy.ts --network localhost
   ```
   This will deploy contracts and export ABIs to the frontend.

3. **Start the frontend (in new terminal)**
   ```bash
   cd Frontend
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

4. **Configure MetaMask**
   - Add Hardhat Network: RPC `http://127.0.0.1:8545`, Chain ID `31337`
   - Import test accounts using private keys from step 1
   - Switch to the Hardhat network

## ✨ Implemented Features

### Smart Contract Features
- ✅ **Factory Pattern**: `GameFactory.sol` manages multiple game instances
- ✅ **Complete Game Lifecycle**: 6-phase system (Waiting → Starting → Commit → Reveal → Evaluating → Ended)
- ✅ **Commit-Reveal Security**: Prevents front-running attacks
- ✅ **Prize Distribution**: Winner gets prize pool minus service fee
- ✅ **Early Exit Handling**: Players can leave before game starts
- ✅ **Gas Optimization**: Efficient storage, batch operations, pull-over-push pattern
- ✅ **Security Measures**: ReentrancyGuard, input validation, access controls

### Frontend Features  
- ✅ **Modern React UI**: TypeScript + Tailwind CSS + Radix UI components
- ✅ **Real-time Game Visualization**: Dynamic phase indicators and countdowns
- ✅ **MetaMask Integration**: Seamless wallet connection and transaction signing
- ✅ **Responsive Design**: Works on desktop and mobile devices
- ✅ **Transaction Feedback**: Loading states, confirmations, error handling
- ✅ **Game Management**: Create games, join, commit numbers, reveal, withdraw prizes

### Technical Implementation
- ✅ **Solidity ^0.8.20**: Latest language features and built-in overflow protection
- ✅ **OpenZeppelin Libraries**: Battle-tested security patterns
- ✅ **ethers.js v6**: Modern Web3 integration
- ✅ **Event-Driven Architecture**: Real-time UI updates via contract events
- ✅ **Type Safety**: Full TypeScript implementation

## 🎮 How to Play

1. **Connect Wallet**: Click "Connect Wallet" and approve MetaMask connection
2. **Join Game**: Pay the entry fee to join an existing game
3. **Commit Phase**: Submit your guess (0-1000) with a secret salt
4. **Reveal Phase**: Reveal your original number and salt to prove your commitment
5. **Results**: System calculates 2/3 of average and determines winner
6. **Withdraw**: Winner can withdraw their prize from the contract

## 🔧 Configuration

### Contract Parameters (Configurable via GameFactory)
- **Entry Fee**: Default 0.01 ETH
- **Min Players**: Default 3 players
- **Max Players**: Default 60 players  
- **Commit Duration**: Default 120 seconds
- **Reveal Duration**: Default 100 seconds
- **Service Fee**: Default 5% to contract owner

### Local Development
- **Hardhat Network**: Chain ID 31337
- **GameFactory Address**: Set in `Frontend/src/addresses.json` after deployment
- **Gas Limit**: Optimized for local development

## 🔐 Security Features

- **Commit-Reveal Pattern**: Hides player choices until reveal phase
- **Reentrancy Protection**: All state-changing functions protected
- **Access Controls**: Owner-only administrative functions
- **Input Validation**: Comprehensive parameter checking
- **Pull Withdrawals**: Prevents DoS attacks through failed transfers
- **Time Constraints**: Deadline enforcement prevents timing attacks

## 📊 Gas Optimization

- **Packed Structs**: Minimize storage slots
- **Batch Operations**: Single `catchUp()` for phase transitions
- **Event-Based UI**: Reduce view function calls
- **Limited Loops**: Bounded iterations to prevent gas limit issues
- **OpenZeppelin Patterns**: Proven gas-efficient implementations

## ⚠️ Known Limitations

- **Tests Missing**: Unit test suite not yet implemented
- **Testnet Deployment**: Currently only supports local Hardhat network
- **Documentation**: Academic documentation pending
- **Gas Reporting**: Formal gas analysis not completed

## 🚧 Remaining Work (~2 hours)

1. **Unit Tests** (60 min): Comprehensive test suite for both contracts
2. **Testnet Deployment** (30 min): Deploy to Sepolia with verification
3. **Documentation** (30 min): Complete academic documentation

## 🎓 Academic Compliance

This project satisfies all core requirements:
- ✅ Solidity smart contract with game logic and user management
- ✅ Factory pattern implementation  
- ✅ Local Ethereum blockchain deployment
- ✅ Entry fee and prize distribution system
- ✅ Protection against blockchain data exploitation
- ✅ Early exit handling for non-responsive players
- ✅ Gas-efficient implementation
- ✅ Web-based user interface without game logic

## 🤝 Contributing

This is an academic assignment project. For educational purposes, you can:
1. Review the code structure and patterns
2. Test the game mechanics locally
3. Suggest improvements for gas optimization
4. Report bugs or edge cases

## 📄 License

This project is created for educational purposes as part of a university blockchain course.

---

**Built with modern blockchain development best practices** 🚀
