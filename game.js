// Contract details
const contractAddress = "0x5f68b1A7Bf6e117c7F1da77B9ADC6F1BB2f1dd41";
const contractABI = [
    // Add your contract ABI here (export from Remix after compilation)
    // Example:
    "function startGame(bytes memory signature) external",
    "function completeMission(uint256 missionId, uint256 score, string memory tokenURI) external",
    "function getScore(address player, uint256 missionId) external view returns (uint256)",
    "function tokenURI(uint256 tokenId) public view returns (string)"
];

// Initialize ethers
let provider, signer, contract;
let currentAccount;
let currentLevel = 1;
let currentScore = 0;

// DOM elements
const connectWalletButton = document.getElementById("connectWalletButton");
const walletAddressSpan = document.getElementById("walletAddress");
const signGMONADButton = document.getElementById("signGMONADButton");
const gmonadStatus = document.getElementById("gmonadStatus");
const startButton = document.getElementById("startButton");
const gameContainer = document.getElementById("gameContainer");
const startScreen = document.getElementById("startScreen");
const scoreDisplay = document.getElementById("score");
const onChainScoreDisplay = document.getElementById("onChainScore");
const levelDisplay = document.getElementById("levelDisplay");
const pauseButton = document.getElementById("pauseButton");
const pauseScreen = document.getElementById("pauseScreen");
const resumeButton = document.getElementById("resumeButton");
const gameOverScreen = document.getElementById("gameOverScreen");
const finalScoreDisplay = document.getElementById("finalScore");
const restartButton = document.getElementById("restartButton");
const levelCompleteModal = document.getElementById("levelCompleteModal");
const levelCompleteTitle = document.getElementById("levelCompleteTitle");
const mintNFTButton = document.getElementById("mintNFTButton");
const nextLevelButton = document.getElementById("nextLevelButton");
const transactionModal = document.getElementById("transactionModal");
const transactionHashDisplay = document.getElementById("transactionHashDisplay");
const nftDetails = document.getElementById("nftDetails");
const closeTransactionModal = document.getElementById("closeTransactionModal");
const leaderboard = document.getElementById("leaderboard");
const leaderboardList = document.getElementById("leaderboardList");

// Monad Testnet configuration
const monadTestnet = {
    chainId: "0x27c7", // 10143 in hex
    chainName: "Monad Testnet",
    nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
    rpcUrls: ["https://testnet-rpc.monad.xyz"],
    blockExplorerUrls: ["https://testnet.monadexplorer.com"]
};

// Connect wallet
connectWalletButton.addEventListener("click", async () => {
    if (window.ethereum) {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        try {
            await provider.send("eth_requestAccounts", []);
            signer = provider.getSigner();
            currentAccount = await signer.getAddress();
            walletAddressSpan.textContent = `Connected: ${currentAccount.slice(0, 6)}...${currentAccount.slice(-4)}`;
            walletAddressSpan.style.display = "inline";
            connectWalletButton.style.display = "none";

            // Switch to Monad Testnet
            try {
                await window.ethereum.request({
                    method: "wallet_switchEthereumChain",
                    params: [{ chainId: monadTestnet.chainId }]
                });
            } catch (switchError) {
                if (switchError.code === 4902) {
                    await window.ethereum.request({
                        method: "wallet_addEthereumChain",
                        params: [monadTestnet]
                    });
                } else {
                    throw switchError;
                }
            }

            // Initialize contract
            contract = new ethers.Contract(contractAddress, contractABI, signer);
            signGMONADButton.style.display = "inline";
            signGMONADButton.disabled = false;
        } catch (error) {
            console.error("Wallet connection failed:", error);
            alert("Failed to connect wallet!");
        }
    } else {
        alert("Please install MetaMask!");
    }
});

// Sign GMONAD = GM
signGMONADButton.addEventListener("click", async () => {
    try {
        const message = "GMONAD = GM";
        const signature = await signer.signMessage(message);
        gmonadStatus.textContent = "Signature verified! Ready to start.";
        gmonadStatus.style.display = "inline";
        signGMONADButton.disabled = true;

        // Call startGame on contract
        const tx = await contract.startGame(signature);
        await tx.wait();
        startButton.style.display = "inline";
    } catch (error) {
        console.error("Signature failed:", error);
        gmonadStatus.textContent = "Signature failed. Try again.";
        gmonadStatus.style.display = "inline";
    }
});

// Start game
startButton.addEventListener("click", () => {
    startScreen.style.display = "none";
    gameContainer.style.display = "block";
    leaderboard.style.display = "none";
    initPhaserGame();
    updateOnChainScore();
});

// Pause game
pauseButton.addEventListener("click", () => {
    gameContainer.style.display = "none";
    pauseScreen.style.display = "block";
    // Pause Phaser game (implement in Phaser logic)
});

// Resume game
resumeButton.addEventListener("click", () => {
    pauseScreen.style.display = "none";
    gameContainer.style.display = "block";
    // Resume Phaser game
});

// Level complete
function showLevelComplete() {
    levelCompleteTitle.textContent = `Level ${currentLevel} Completed!`;
    levelCompleteModal.style.display = "flex";
    gameContainer.style.display = "none";
}

// Mint NFT
mintNFTButton.addEventListener("click", async () => {
    try {
        const tokenURI = `ipfs://<your-ipfs-hash>/${currentLevel}.json`; // Replace with your IPFS URI
        const tx = await contract.completeMission(currentLevel, currentScore, tokenURI);
        const receipt = await tx.wait();
        const tokenId = receipt.events.find(e => e.event === "MissionCompleted").args.tokenId;
        const uri = await contract.tokenURI(tokenId);
        transactionHashDisplay.textContent = `Tx Hash: ${tx.hash}`;
        nftDetails.textContent = `NFT Minted! Token ID: ${tokenId}, URI: ${uri}`;
        nftDetails.style.display = "block";
        transactionModal.style.display = "flex";
        updateOnChainScore();
    } catch (error) {
        console.error("NFT minting failed:", error);
        alert("Failed to mint NFT!");
    }
});

// Next level
nextLevelButton.addEventListener("click", () => {
    currentLevel++;
    levelDisplay.textContent = `Level: ${currentLevel}`;
    levelCompleteModal.style.display = "none";
    gameContainer.style.display = "block";
    // Reset Phaser game for next level
});

// Close transaction modal
closeTransactionModal.addEventListener("click", () => {
    transactionModal.style.display = "none";
});

// Restart game
restartButton.addEventListener("click", () => {
    gameOverScreen.style.display = "none";
    gameContainer.style.display = "block";
    currentLevel = 1;
    currentScore = 0;
    scoreDisplay.textContent = `Score: ${currentScore}`;
    levelDisplay.textContent = `Level: ${currentLevel}`;
    // Reset Phaser game
});

// Update on-chain score
async function updateOnChainScore() {
    try {
        const score = await contract.getScore(currentAccount, currentLevel);
        onChainScoreDisplay.textContent = `On-Chain Score: ${score}`;
    } catch (error) {
        console.error("Failed to fetch on-chain score:", error);
    }
}

// Fetch leaderboard (from MissionCompleted events)
async function updateLeaderboard() {
    try {
        const filter = contract.filters.MissionCompleted();
        const events = await contract.queryFilter(filter);
        const scores = events.map(event => ({
            player: event.args.player,
            missionId: event.args.missionId.toNumber(),
            score: event.args.score.toNumber()
        }));
        scores.sort((a, b) => b.score - a.score);
        leaderboardList.innerHTML = scores.slice(0, 5).map(s => 
            `<li>${s.player.slice(0, 6)}...${s.player.slice(-4)} - Mission ${s.missionId}: ${s.score}</li>`
        ).join("");
        leaderboard.style.display = "block";
    } catch (error) {
        console.error("Failed to fetch leaderboard:", error);
    }
}

// Placeholder Phaser game
function initPhaserGame() {
    const config = {
        type: Phaser.AUTO,
        width: 800,
        height: 400,
        parent: "gameCanvas",
        scene: {
            preload: preload,
            create: create,
            update: update
        }
    };
    const game = new Phaser.Game(config);

    function preload() {
        // Load your assets from assets/images
        this.load.image("mario", "assets/images/mario.png");
        // Add other assets
    }

    function create() {
        // Set up game objects
        this.add.image(400, 200, "mario");
        // Add your Super Mario logic
    }

    function update() {
        // Game loop
        // Call showLevelComplete() when level is done
    }
}

// Initialize leaderboard on page load
window.addEventListener("load", () => {
    if (contract) updateLeaderboard();
});