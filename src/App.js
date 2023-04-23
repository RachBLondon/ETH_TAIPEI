import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import contractABI from './ABI';
import erc20TokenABI from './TokenABI'
import Leaderboard from './Leaderboard';


const CONTRACT_ADDRESS = '0xbf29ac4db0449e823015b8a9cd30ff1fcb27d9c3';
const ERC20_TOKEN_ADDRESS = '0x1aB315FC90004190De709068F6D1B99b18f559AE';

function App() {
  const [web3, setWeb3] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [lockupPeriod, setLockupPeriod] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    const initWeb3 = async () => {
      if (window.ethereum) {
        const web3Instance = new Web3(window.ethereum);
        setWeb3(web3Instance);

        try {
          await window.ethereum.enable();
          const accounts = await web3Instance.eth.getAccounts();
          setAccount(accounts[0]);
          const contractInstance = new web3Instance.eth.Contract(contractABI, CONTRACT_ADDRESS);
          setContract(contractInstance);
        } catch (err) {
          console.error(err);
        }
      }
    };
    initWeb3();
  }, []);

  async function fetchLeaderboard() {
    if (!web3 || !contract) return;
  
    try {
      const totalPlayers = await contract.methods.totalActivePlayers().call();
      const leaderboardData = [];
  
      for (let i = 0; i < totalPlayers; i++) {
        const playerAddress = await contract.methods.activePlayers(i).call();
        const playerData = await contract.methods.players(playerAddress).call();
        const depositedAmount = web3.utils.fromWei(playerData.depositedAmount, 'ether');
        const lockupTimestamp = new Date(playerData.lockupTimestamp * 1000);
        const pendingRewards = web3.utils.fromWei(playerData.pendingRewards, 'ether');
  
        leaderboardData.push({
          address: playerAddress,
          depositedAmount,
          lockupTimestamp,
          pendingRewards,
        });
      }
  
      // Sort the leaderboard data based on pending rewards and lockupTimestamp
      leaderboardData.sort((a, b) => {
        if (a.pendingRewards === b.pendingRewards) {
          return a.lockupTimestamp - b.lockupTimestamp;
        }
        return b.pendingRewards - a.pendingRewards;
      });
  
      setLeaderboard(leaderboardData);
    } catch (err) {
      console.error(err);
    }
  }
  

  const handleDeposit = async () => {
    if (!contract || !web3) return;
    const lockupDate = new Date(lockupPeriod);
    const lockupTimestamp = Math.floor(lockupDate.getTime() / 1000);

    try {
      await contract.methods.deposit(lockupTimestamp).send({ from: account });
    } catch (err) {
      console.error(err);
    }
  };
  
  async function depositTokens(lockupDate) {
    if (!web3 || !contract) return;
    
    try {
      const accounts = await web3.eth.getAccounts();
      const sender = accounts[0];
      const tokenAmount = web3.utils.toWei('10', 'ether'); // Assuming you want to deposit 10 tokens
      const lockupTimestamp = Math.floor(new Date(lockupDate).getTime() / 1000);
  
      // Approve the contract to spend tokens on behalf of the sender
      const tokenContract = new web3.eth.Contract(erc20TokenABI, ERC20_TOKEN_ADDRESS);
      await tokenContract.methods
        .approve(CONTRACT_ADDRESS, tokenAmount)
        .send({ from: sender });
  
      // Deposit tokens and set the lockup date
      await contract.methods
        .deposit(lockupTimestamp)
        .send({ from: sender, value: tokenAmount });
  
      // Refresh the leaderboard after depositing tokens
      fetchLeaderboard();
    } catch (err) {
      console.error(err);
    }
  }
  


  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!contract) return;

      try {
        const totalPlayers = await contract.methods.totalActivePlayers().call();
        const playersData = [];

        for (let i = 0; i < totalPlayers; i++) {
          const playerAddress = await contract.methods.activePlayers(i).call();
          const playerData = await contract.methods.players(playerAddress).call();
          playersData.push({
            address: playerAddress,
            lockedUntil: new Date(playerData.lockedUntil * 1000),
            effectiveLockup: playerData.effectiveLockup,
          });
        }

        const sortedPlayers = playersData.sort((a, b) => b.effectiveLockup - a.effectiveLockup);
        setLeaderboard(sortedPlayers);
      } catch (err) {
        console.error(err);
      }
    };
    fetchLeaderboard();
  }, [contract]);

  return (
    <div>
      <h1>Holderboard</h1>
      <div>
        <label>Lockup Period (Date Format: YYYY-MM-DD):</label>
        <input
          type="date"
          value={lockupPeriod}
          onChange={(e) => setLockupPeriod(e.target.value)}
        />
      </div>
      <button onClick={depositTokens}>Deposit</button>
      <Leaderboard players={leaderboard} />
    </div>
  );
}

export default App;
