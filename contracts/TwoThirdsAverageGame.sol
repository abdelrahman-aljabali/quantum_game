// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title TwoThirdsAverageGame
 * @dev Dieser Vertrag implementiert das Spiel, in dem die Spieler Zahlen einreichen, und der Gewinner
 * ist derjenige, dessen Zahl am nächsten an 2/3 des Durchschnitts liegt. Bei Gleichstand wird mittels
 * Tie-Breaker ein Gewinner ermittelt. Der Vertrag verwendet ein Withdrawal Pattern und fest kodierte 5%
 * Servicegebühr.
 */
contract TwoThirdsAverageGame is Ownable, ReentrancyGuard {
    // Spielparameter
    uint256 public minPlayers;
    uint256 public maxPlayers;
    uint256 public submissionDuration;
    uint256 public entryFee;
    uint256 public constant SERVICE_FEE_PERCENT = 5; // Feste Servicegebühr von 5%
    uint256 public autoStartDelay; // Verzögerung in Sekunden, nachdem die Mindestspielerzahl erreicht wurde

    // Spielphasen
    enum GamePhase { WAITING_FOR_PLAYERS, GAME_STARTING, SUBMISSIONS_OPEN, EVALUATING_RESULTS, GAME_ENDED }
    GamePhase public currentPhase;

    uint256 public gameStartTime;
    uint256 public submissionEndTime;
    uint256 public minPlayersReachedTime; // Zeitpunkt, zu dem Mindestspieler erreicht wurden

    // Spielerdaten
    struct Player {
        address playerAddress;
        uint256 submittedNumber;
        bool hasSubmitted;
        bool hasJoined;
    }
    mapping(address => Player) public players;
    address[] public playerAddresses;

    // Spiel-Ergebnisse
    uint256 public average;
    uint256 public twoThirdsAverage;
    address public winner;
    uint256 public prizePool;

    // Withdrawal Pattern – gesicherte Verwaltung der auszuzahlenden Gelder
    mapping(address => uint256) public pendingWithdrawals;

    // Events zur besseren Transparenz und für das Frontend
    event PlayerJoined(address player, uint256 entryFee);
    event NumberSubmitted(address player, uint256 number);
    event GameStarting(uint256 startTime, uint256 autoStartTime);
    event GameStarted(uint256 startTime, uint256 endTime);
    event GameEnded(uint256 average, uint256 twoThirdsAverage, address winner, uint256 prize);
    event PrizeAwarded(address winner, uint256 amount);
    event ServiceFeePending(address owner, uint256 amount);
    event Withdrawal(address recipient, uint256 amount);
    event MinPlayersReached(uint256 timestamp, uint256 autoStartTime);

    /**
     * @dev Konstruktor setzt die Spielparameter.
     * @param _minPlayers Mindestanzahl der Spieler.
     * @param _maxPlayers Maximale Anzahl der Spieler.
     * @param _submissionDuration Dauer der Abgabefrist in Sekunden.
     * @param _entryFee Teilnahmegebühr in Wei.
     * @param _autoStartDelay Verzögerung (in Sekunden) nach Erreichen der Mindestspielerzahl, bevor das Spiel startet.
     */
    constructor(
        uint256 _minPlayers,
        uint256 _maxPlayers,
        uint256 _submissionDuration,
        uint256 _entryFee,
        uint256 _autoStartDelay
    ) {
        require(_minPlayers >= 3, "Mindestanzahl: mind. 3 Spieler");
        require(_maxPlayers > _minPlayers, "Max. Spieler > Mindestanzahl");
        require(_submissionDuration > 0, "Dauer muss > 0 sein");
        require(_autoStartDelay > 0, "Auto-Start Delay muss > 0 sein");
        
        minPlayers = _minPlayers;
        maxPlayers = _maxPlayers;
        submissionDuration = _submissionDuration;
        entryFee = _entryFee;
        autoStartDelay = _autoStartDelay;
        currentPhase = GamePhase.WAITING_FOR_PLAYERS;
        prizePool = 0;
    }
    
    /**
     * @dev Spieler können dem Spiel beitreten.
     */
    function joinGame() external payable nonReentrant {
        require(
            currentPhase == GamePhase.WAITING_FOR_PLAYERS || currentPhase == GamePhase.GAME_STARTING,
            "Spiel nimmt nicht mehr an neuen Spielern teil"
        );
        require(playerAddresses.length < maxPlayers, "Spiel ist voll");
        require(!players[msg.sender].hasJoined, "Spieler hat bereits beigetreten");
        require(msg.value == entryFee, "Falsche Teilnahmegebühr");
        
        players[msg.sender] = Player({
            playerAddress: msg.sender,
            submittedNumber: 0,
            hasSubmitted: false,
            hasJoined: true
        });
        
        playerAddresses.push(msg.sender);
        prizePool += msg.value;
        
        emit PlayerJoined(msg.sender, msg.value);
        
        // Wenn Mindestanzahl erreicht ist, den Start initiieren.
        if (playerAddresses.length >= minPlayers && minPlayersReachedTime == 0) {
            minPlayersReachedTime = block.timestamp;
            emit MinPlayersReached(minPlayersReachedTime, minPlayersReachedTime + autoStartDelay);
            currentPhase = GamePhase.GAME_STARTING;
        }
        
        // Auto-Start, falls Verzögerung abgelaufen ist.
        if (currentPhase == GamePhase.GAME_STARTING && block.timestamp >= minPlayersReachedTime + autoStartDelay) {
            startGame();
        }
    }
    
    /**
     * @dev Jeder kann die Auto-Start-Prüfung auslösen.
     */
    function checkAutoStart() external nonReentrant {
        require(currentPhase == GamePhase.GAME_STARTING, "Spiel ist nicht im Startmodus");
        require(block.timestamp >= minPlayersReachedTime + autoStartDelay, "Auto-Start Verzögerung noch nicht abgelaufen");
        startGame();
    }
    
    /**
     * @dev Interne Funktion, um das Spiel zu starten.
     */
    function startGame() internal {
        require(currentPhase == GamePhase.GAME_STARTING, "Spiel ist nicht im Startmodus");
        require(playerAddresses.length >= minPlayers, "Nicht genug Spieler");
        
        currentPhase = GamePhase.SUBMISSIONS_OPEN;
        gameStartTime = block.timestamp;
        submissionEndTime = gameStartTime + submissionDuration;
        
        emit GameStarted(gameStartTime, submissionEndTime);
    }
    
    /**
     * @dev Spieler reichen ihre Zahl (zwischen 0 und 1000) ein.
     */
    function submitNumber(uint256 _number) external nonReentrant {
        require(currentPhase == GamePhase.SUBMISSIONS_OPEN, "Keine Einreichung moeglich");
        require(block.timestamp < submissionEndTime, "Einreichungszeitraum beendet");
        require(players[msg.sender].hasJoined, "Spieler hat sich nicht angemeldet");
        require(!players[msg.sender].hasSubmitted, "Spieler hat bereits eingereicht");
        require(_number <= 1000, "Zahl muss zwischen 0 und 1000 liegen");
        
        players[msg.sender].submittedNumber = _number;
        players[msg.sender].hasSubmitted = true;
        
        emit NumberSubmitted(msg.sender, _number);
        
        // Prüfe, ob alle Spieler eingereicht haben oder die Zeit abgelaufen ist.
        checkSubmissionComplete();
    }
    
    /**
     * @dev Prueft, ob der Einreichungsmodus beendet ist, und ruft ggf. die Ergebnisberechnung auf.
     */
    function checkSubmissionComplete() public nonReentrant {
        if (currentPhase != GamePhase.SUBMISSIONS_OPEN) {
            return;
        }
        
        uint256 submittedCount = 0;
        uint256 totalPlayers = playerAddresses.length;
        for (uint256 i = 0; i < totalPlayers; ) {
            if (players[playerAddresses[i]].hasSubmitted) {
                submittedCount++;
            }
            unchecked { i++; }
        }
        
        if (
            submittedCount == totalPlayers || 
            (block.timestamp >= submissionEndTime && submittedCount >= minPlayers)
        ) {
            calculateResults();
        }
    }
    
    /**
     * @dev Berechnet die Ergebnisse des Spiels einschließlich eines Tie-Breakers bei Mehrfachgewinn.
     */
    function calculateResults() public nonReentrant {
        require(
            currentPhase == GamePhase.SUBMISSIONS_OPEN &&
            (block.timestamp >= submissionEndTime || allPlayersSubmitted()),
            "Ergebnisberechnung noch nicht moeglich"
        );
        
        currentPhase = GamePhase.EVALUATING_RESULTS;
        
        uint256 sum = 0;
        uint256 count = 0;
        uint256 totalPlayers = playerAddresses.length;
        
        // Summe aller eingereichten Werte.
        for (uint256 i = 0; i < totalPlayers; ) {
            if (players[playerAddresses[i]].hasSubmitted) {
                sum += players[playerAddresses[i]].submittedNumber;
                count++;
            }
            unchecked { i++; }
        }
        
        require(count > 0, "Keine Einreichungen");
        
        average = sum / count;
        twoThirdsAverage = (average * 2) / 3;
        
        // Bestimme, welche Einreichungen am naechsten an 2/3 des Durchschnitts liegen.
        uint256 closestDistance = 1001;
        address[] memory candidateWinners = new address[](totalPlayers);
        uint256 candidateCount = 0;
        
        for (uint256 i = 0; i < totalPlayers; ) {
            if (players[playerAddresses[i]].hasSubmitted) {
                uint256 submitted = players[playerAddresses[i]].submittedNumber;
                uint256 distance = submitted > twoThirdsAverage
                    ? submitted - twoThirdsAverage
                    : twoThirdsAverage - submitted;
                
                if (distance < closestDistance) {
                    closestDistance = distance;
                    candidateCount = 0;
                    candidateWinners[candidateCount] = playerAddresses[i];
                    candidateCount = 1;
                } else if (distance == closestDistance) {
                    candidateWinners[candidateCount] = playerAddresses[i];
                    candidateCount++;
                }
            }
            unchecked { i++; }
        }
        
        if (candidateCount == 0) {
            revert("Keine gueltigen Einreichungen gefunden");
        } else if (candidateCount == 1) {
            winner = candidateWinners[0];
        } else {
            // Pseudo-zufällige Auswahl. Für Produktion sollte ein sichererer Zufallsmechanismus (etwa Chainlink VRF) genutzt werden.
            uint256 randomIndex = uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty, candidateCount))) % candidateCount;
            winner = candidateWinners[randomIndex];
        }
        
        currentPhase = GamePhase.GAME_ENDED;
        
        // Berechne Servicegebühr und Gewinnerprämie.
        uint256 serviceFee = (prizePool * SERVICE_FEE_PERCENT) / 100;
        uint256 winnerPrize = prizePool - serviceFee;
        
        emit GameEnded(average, twoThirdsAverage, winner, winnerPrize);
        
        pendingWithdrawals[owner()] += serviceFee;
        pendingWithdrawals[winner] += winnerPrize;
        
        emit ServiceFeePending(owner(), serviceFee);
        emit PrizeAwarded(winner, winnerPrize);
    }
    
    /**
     * @dev Ermöglicht es den Spielern und dem Owner, ihre angefallenen Gelder abzuheben.
     */
    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "Keine Gelder zum Abheben");
        
        pendingWithdrawals[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Auszahlung fehlgeschlagen");
        
        emit Withdrawal(msg.sender, amount);
    }
    
    /**
     * @dev Liefert true zurück, wenn alle beigetretenen Spieler eine Zahl eingereicht haben.
     */
    function allPlayersSubmitted() public view returns (bool) {
        uint256 totalPlayers = playerAddresses.length;
        for (uint256 i = 0; i < totalPlayers; ) {
            if (!players[playerAddresses[i]].hasSubmitted) {
                return false;
            }
            unchecked { i++; }
        }
        return true;
    }
    
    /**
     * @dev Gibt die Anzahl der beigetretenen Spieler zurück.
     */
    function getPlayerCount() external view returns (uint256) {
        return playerAddresses.length;
    }
    
    /**
     * @dev Gibt die verbleibende Zeit (in Sekunden) der aktiven Phase zurück.
     */
    function getTimeRemaining() external view returns (uint256) {
        if (currentPhase == GamePhase.WAITING_FOR_PLAYERS) {
            return 0;
        } else if (currentPhase == GamePhase.GAME_STARTING) {
            if (block.timestamp >= minPlayersReachedTime + autoStartDelay) {
                return 0;
            }
            return (minPlayersReachedTime + autoStartDelay) - block.timestamp;
        } else if (currentPhase == GamePhase.SUBMISSIONS_OPEN) {
            if (block.timestamp >= submissionEndTime) {
                return 0;
            }
            return submissionEndTime - block.timestamp;
        }
        return 0;
    }
    
    /**
     * @dev Gibt alle eingereichten Zahlen zurück (nur nach Spielende abrufbar).
     */
    function getAllSubmissions() external view returns (uint256[] memory) {
        require(currentPhase == GamePhase.GAME_ENDED, "Spiel ist noch nicht beendet");
        
        uint256 totalPlayers = playerAddresses.length;
        uint256[] memory submissionsTemp = new uint256[](totalPlayers);
        uint256 count = 0;
        
        for (uint256 i = 0; i < totalPlayers; ) {
            if (players[playerAddresses[i]].hasSubmitted) {
                submissionsTemp[count] = players[playerAddresses[i]].submittedNumber;
                count++;
            }
            unchecked { i++; }
        }
        
        uint256[] memory submissions = new uint256[](count);
        for (uint256 i = 0; i < count; ) {
            submissions[i] = submissionsTemp[i];
            unchecked { i++; }
        }
        
        return submissions;
    }
    
    /**
     * @dev Gibt den aktuellen Gesamtpreis-Pool (in Wei) zurück.
     */
    function getPrizePool() external view returns (uint256) {
        return prizePool;
    }
    
    /**
     * @dev Prüft, ob eine Adresse als Spieler beigetreten ist.
     */
    function hasPlayerJoined(address _player) external view returns (bool) {
        return players[_player].hasJoined;
    }
    
    /**
     * @dev Prüft, ob eine Adresse bereits eine Zahl eingereicht hat.
     */
    function hasPlayerSubmitted(address _player) external view returns (bool) {
        return players[_player].hasSubmitted;
    }
}
