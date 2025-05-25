# 2/3 Average Game - Blockchain DApp

> **Quantum Consensus**: Eine Blockchain-basierte Implementierung des 2/3 Average Game als dezentrale Anwendung (DApp)

## 📝 Projektübersicht

Das **2/3 Average Game** ist ein strategisches Spiel aus der Spieltheorie, bei dem Spieler eine Zahl zwischen 0-1000 wählen. Gewinner ist der Spieler, dessen Zahl am nächsten zu **2/3 des Durchschnitts aller Zahlen** liegt. Diese Implementierung nutzt Smart Contracts auf der Ethereum-Blockchain für faire, transparente und automatisierte Spielabwicklung.

### 🎯 Spielregeln
- **Mindestens 3 Spieler** müssen teilnehmen
- Jeder Spieler wählt eine **Zahl zwischen 0-1000**
- **Gewinner**: Spieler mit der Zahl am nächsten zu 2/3 des Durchschnitts
- Bei **Gleichstand**: Zufallsmechanismus wählt den Gewinner
- **Eintrittsgebühr**: Alle Spieler zahlen eine Teilnahmegebühr
- **Preisgeld**: Gewinner erhält den Hauptteil, Spielleiter eine Servicegebühr

## 🏗️ Technologie-Stack

### Smart Contracts
- **Solidity ^0.8.x** - Smart Contract Entwicklung
- **Hardhat** - Ethereum Entwicklungsumgebung
- **OpenZeppelin** - Sichere Contract-Bibliotheken
- **Factory Pattern** - Skalierbare Contract-Architektur

### Frontend
- **React 18** + **TypeScript** - Moderne UI-Entwicklung
- **Tailwind CSS** - Responsive Design-System
- **Framer Motion** - Animationen und Übergänge
- **ethers.js** - Blockchain-Integration
- **Radix UI** - Barrierefreie UI-Komponenten

### Entwicklungstools
- **Vite** - Schneller Build-Tool
- **ESLint** + **Prettier** - Code-Qualität
- **Git** - Versionskontrolle

## 🔒 Sicherheitsfeatures

### Commit-Reveal Pattern
```solidity
// Phase 1: Spieler committen verschlüsselte Zahlen
function commitNumber(bytes32 hashedNumber) external payable;

// Phase 2: Spieler enthüllen ihre ursprünglichen Zahlen
function revealNumber(uint256 number, uint256 salt) external;
```

### Weitere Sicherheitsmaßnahmen
- **ReentrancyGuard** - Schutz vor Reentrancy-Attacken
- **Timer-System** - Automatische Phasenübergänge bei Inaktivität
- **Input-Validierung** - Überprüfung aller Benutzereingaben
- **Access Control** - Rollenbasierte Berechtigungen

## ⛽ Gas-Optimierungen

1. **Batch-Operations** - Mehrere Aktionen in einer Transaktion
2. **Packed Structs** - Optimierte Datenstrukturen
3. **Event-basierte Logging** - Reduzierte On-Chain-Speicherung
4. **Lazy Evaluation** - Berechnungen nur bei Bedarf
5. **Factory Pattern** - Wiederverwendbare Contract-Templates

## 📦 Installation & Setup

### Voraussetzungen
- **Node.js** (v18 oder höher)
- **npm** oder **yarn**
- **Git**
- **MetaMask** Browser-Extension

### 1. Repository klonen
```bash
git clone https://github.com/adrianjustdoit58/quantum_game_DApp.git
cd quantum_game_DApp
```

### 2. Backend Setup (Smart Contracts)
```bash
# Dependencies installieren
npm install

# Lokale Blockchain starten (neues Terminal)
npx hardhat node

# Contracts deployen (neues Terminal)
npx hardhat run scripts/deploy.ts --network localhost

# ABIs für Frontend exportieren
npm run export-abi
```

### 3. Frontend Setup
```bash
# In Frontend-Verzeichnis wechseln
cd Frontend

# Frontend Dependencies installieren
npm install

# Development Server starten
npm run dev
```

### 4. MetaMask konfigurieren
1. **Netzwerk hinzufügen**:
   - **Name**: Hardhat Local
   - **RPC URL**: `http://127.0.0.1:8545`
   - **Chain ID**: `31337`
   - **Currency**: `ETH`

2. **Test-Account importieren**:
   ```
   Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   ```

## 🚀 Anwendung starten

### Schnellstart (3 Terminals)
```bash
# Terminal 1: Blockchain
npx hardhat node

# Terminal 2: Contracts deployen
npx hardhat run scripts/deploy.ts --network localhost

# Terminal 3: Frontend
cd Frontend && npm run dev
```

**Anwendung öffnen**: [http://localhost:5173](http://localhost:5173)

## 🏛️ Architektur

### Smart Contract Architektur
```
GameFactory.sol
├── createGame() - Neue Spielinstanz erstellen
├── currentGame - Aktives Spiel verwalten
└── owner permissions - Admin-Funktionen

TwoThirdsAverageGame.sol
├── Phase Management (6 Phasen)
│   ├── WAITING_FOR_PLAYERS
│   ├── GAME_STARTING  
│   ├── COMMIT_PHASE
│   ├── REVEAL_PHASE
│   ├── EVALUATING_RESULTS
│   └── GAME_ENDED
├── Player Management
├── Commit-Reveal System
├── Winner Calculation
└── Prize Distribution
```

### Frontend Architektur
```
src/
├── components/
│   ├── GameInterface.tsx - Hauptspiel-UI
│   ├── PlayerPortal.tsx - Spieler-Dashboard
│   ├── NumberSelector.tsx - Zahlenauswahl
│   ├── ResultsVisualizer.tsx - Ergebnis-Anzeige
│   └── GameInstructions.tsx - Spielregeln
├── contexts/
│   └── EthereumContext.tsx - Blockchain-Integration
├── hooks/
│   └── useCommitReveal.ts - Commit-Reveal Logic
└── utils/
    └── gamePhase.ts - Phasen-Mapping
```

## 📍 Contract-Adressen

### Lokales Netzwerk (Hardhat)
```
GameFactory: 0x5FbDB2315678afecb367f032d93F642f64180aa3
TwoThirdsAverageGame: [Dynamisch erstellt via Factory]
```

### Testnet (Sepolia) - Optional
```
GameFactory: [Nach Testnet-Deployment]
TwoThirdsAverageGame: [Nach Testnet-Deployment]
```

## 🎮 Spielablauf

### 1. Wartephase
- Spieler treten dem Spiel bei (min. 3 Spieler)
- Zahlung der Eintrittsgebühr
- Automatischer Start bei ausreichender Teilnehmerzahl

### 2. Commit-Phase
- Spieler wählen geheime Zahl (0-1000)
- Eingabe eines Salt-Wertes für Verschlüsselung
- Commitment der verschlüsselten Zahl an Blockchain

### 3. Reveal-Phase  
- Spieler enthüllen ihre ursprünglichen Zahlen
- Verifikation gegen gespeicherte Commits
- Automatische Disqualifikation bei falschen Reveals

### 4. Auswertungsphase
- Berechnung des Durchschnitts aller Zahlen
- Ermittlung von 2/3 des Durchschnitts
- Bestimmung des Gewinners (nächste Zahl)

### 5. Ergebnisphase
- Anzeige aller Ergebnisse und Gewinner
- Automatische Preisverteilung
- Option für neues Spiel

## 🧪 Tests ausführen

```bash
# Smart Contract Tests
npx hardhat test

# Frontend Tests (falls implementiert)
cd Frontend && npm run test
```

## 📊 Beispiel-Spielverlauf

```
Spieler A: 500  |  Spieler B: 300  |  Spieler C: 600
Durchschnitt: (500 + 300 + 600) / 3 = 466.67
2/3 des Durchschnitts: 466.67 * 2/3 = 311.11

Distanzen zum Zielwert (311):
- Spieler A: |500 - 311| = 189
- Spieler B: |300 - 311| = 11  ← GEWINNER
- Spieler C: |600 - 311| = 289

🏆 Spieler B gewinnt!
```

## 🤝 Entwicklung & Beitrag

### Git-Workflow
```bash
# Änderungen holen
git pull

# Neuen Branch erstellen
git checkout -b feature/neue-funktion

# Änderungen committen
git add .
git commit -m "Add: Neue Funktion implementiert"

# Push und Pull Request
git push origin feature/neue-funktion
```

### Code-Standards
- **TypeScript** für alle neuen Dateien
- **ESLint** Regeln befolgen
- **Commit-Messages** im Format: `Type: Beschreibung`
- **Tests** für neue Funktionen schreiben

## 📄 Lizenz

Dieses Projekt wurde für den Blockchain-Kurs entwickelt und steht unter MIT-Lizenz.

## 🔗 Links & Ressourcen

- **Repository**: https://github.com/adrianjustdoit58/quantum_game_DApp
- **Hardhat Dokumentation**: https://hardhat.org/docs
- **Solidity Style Guide**: https://docs.soliditylang.org/en/latest/style-guide.html
- **OpenZeppelin**: https://docs.openzeppelin.com/
- **ethers.js**: https://docs.ethers.io/

## 👥 Team

**Entwickler**: Abdelrahman Aljabali & Adrian Tobisch  
**Kurs**: Blockchain Development  
**Jahr**: 2025

---

> 💡 **Hinweis**: Diese DApp ist zu Bildungszwecken entwickelt. Für Produktionsumgebungen sind zusätzliche Sicherheitsaudits empfohlen.
