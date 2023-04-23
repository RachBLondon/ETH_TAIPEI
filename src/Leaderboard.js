 function Leaderboard({ players }) {
    return (
      <div>
        <h2>Leaderboard</h2>
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Address</th>
              <th>Effective Lockup</th>
              <th>Locked Until</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player, index) => (
              <tr key={player.address}>
                <td>{index + 1}</td>
                <td>{player.address}</td>
                <td>{player.effectiveLockup}</td>
                <td>{player.lockedUntil.toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  export default Leaderboard;