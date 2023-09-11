// utils/fetchPlayerData.js
export const fetchPlayerData = async (setPlayerData) => {
    try {
      const playerResponse = await fetch('https://api.sleeper.app/v1/players/nfl'); 
      const playerObject = await playerResponse.json();
  
      const formattedPlayerDataMap = new Map();
      Object.values(playerObject).forEach(player => {
        const playerId = player.player_id;
        const playerName = `${player.first_name} ${player.last_name}`;
        const playerTeam = player.team;
        const playerPosition = player.position;
  
        formattedPlayerDataMap.set(playerId, {
          name: playerName,
          team: playerTeam,
          position: playerPosition,
        });
      });
  
      setPlayerData(formattedPlayerDataMap);
    } catch (error) {
      console.error('Error fetching player data:', error);
    }
  };
  