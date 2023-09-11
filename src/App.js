import './App.css';
import QB from './FantasyPros_Fantasy_Football_Projections_QB.csv'
import RB from './FantasyPros_Fantasy_Football_Projections_RB.csv'
import WR from './FantasyPros_Fantasy_Football_Projections_WR.csv'
import TE from './FantasyPros_Fantasy_Football_Projections_TE.csv'
import K from './FantasyPros_Fantasy_Football_Projections_K.csv'
import DEF from './FantasyPros_Fantasy_Football_Projections_DST.csv'

import Papa from 'papaparse'
import { useState, useEffect } from 'react'

function App() {

  const [userData, setUserData] = useState(new Map())
  const [playerData, setPlayerData] = useState(new Map())
  const [fantasyPointsMap, setFantasyPointsMap] = useState(new Map()); 
  const [rosterSettings, setRosterSettings] = useState(new Map())

  const [teamRecords, setTeamRecords] = useState(new Map());
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [seasonResultsDisplayed, setSeasonResultsDisplayed] = useState(false); 
  const [showMatchupData, setShowMatchupData] = useState(new Array());
  const [showMatchup, setShowMatchup] = useState(false);

  const [leagueId, setLeagueId] = useState('');
  const [seasonData, setSeasonData] = useState(new Map())

  const byeWeekMap = new Map([
    ["CLE", 5], ["LAC", 5], ["SEA", 5], ["TB", 5],
    ["GB", 6], ["PIT", 6], ["CAR", 7], ["CIN", 7],
    ["DAL", 7], ["HOU", 7], ["NYJ", 7], ["TEN", 7],
    ["DEN", 9], ["DET", 9], ["JAX", 9], ["SF", 9],
    ["KC", 10], ["LAR", 10],
    ["MIA", 10], ["PHI", 10], ["ATL", 11], ["IND", 11],
    ["NE", 11], ["NO", 11], ["BAL", 13], ["BUF", 13],["CHI", 13],
    ["LV", 13], ["MIN", 13], ["NYG", 13], ["ARI", 14], ["WAS", 14]
  ]);
  


  const fetchUserData = async (leagueId) => {
    try {
      const usersResponse = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/users`);
      const usersData = await usersResponse.json();
  
      const rostersResponse = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`);
      const rostersData = await rostersResponse.json();
  
      // Create a map of merged user and roster data
      const formattedUserDataMap = new Map();
      rostersData.forEach(roster => {
        const user = usersData.find(user => user.user_id === roster.owner_id);
        if (user) {
          formattedUserDataMap.set(roster.roster_id, {
            user_id: user.user_id,
            team_name: user.metadata.team_name || user.display_name,
            avatar: user.metadata.avatar,
          });
        }
      });
  
      setUserData(formattedUserDataMap); 
      // console.log(userData) 
    } catch (error) {
      console.error('Error: ', error);
    }
  };

  

  const fetchPlayerData = async () => {
    try {
      const playerResponse = await fetch('https://api.sleeper.app/v1/players/nfl');  
      const playerObject = await playerResponse.json();

      // Convert the player object into a map
      const formattedPlayerDataMap = new Map();
      Object.values(playerObject).forEach(player => {
        if(player.position === 'QB' ||
          player.position === 'RB' ||
          player.position === 'WR' ||
          player.position === 'TE' ||
          player.position === 'K' ||
          player.position === 'DEF') {
            const playerId = player.player_id;
            const playerName = `${player.first_name} ${player.last_name}`;
            // const playerTeam = player.team;
            const byeWeek = byeWeekMap.get(player.team)
            const playerPosition = player.position;

            formattedPlayerDataMap.set(playerId, {
              name: playerName,
              bye: byeWeek,
              position: playerPosition,
            });
          }
      });

      setPlayerData(formattedPlayerDataMap);
      // console.log(playerData) 
    } catch (error) {
      console.error('Error: ', error);
    }
  }

  const fetchCsvData = async () => {
    try {
      let positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
      const playerFantasyPointsMap = {};
  
      for (const position of positions) {
        let response;
  
        switch (position) {
          case 'QB':
            response = await fetch(QB);
            break;
          case 'RB':
            response = await fetch(RB);
            break;
          case 'WR':
            response = await fetch(WR);
            break;
          case 'TE':
            response = await fetch(TE);
            break;
          case 'K':
            response = await fetch(K);
            break;
          default:
            response = await fetch(DEF);
            break;
        }
  
        const csvText = await response.text();
  
        // Parse the CSV data
        Papa.parse(csvText, {
          header: true,
          complete: (result) => {
            result.data.forEach((player) => {
              const playerName = player.Player;
              const playerFantasyPoints = parseFloat((player.FPTS / 17).toFixed(2));
  
              if (!playerFantasyPointsMap[playerName]) {
                playerFantasyPointsMap[playerName] = {};
              }
              playerFantasyPointsMap[playerName] = playerFantasyPoints;
            });
          },
          error: (error) => {
            console.error('CSV Parse Error: ', error);
          },
        });
      }
  
      // Set fantasyPointsMap once with the merged playerFantasyPointsMap
      setFantasyPointsMap(playerFantasyPointsMap);
    } catch (error) {
      console.error('Error: ', error);
    }
  };

  const fetchRosterSettings = async (leagueId) => {
    try {
      const response = await fetch(`https://api.sleeper.app/v1/league/${leagueId}`);
      const leagueInfo = await response.json();
      
      const rosterPositions = leagueInfo.roster_positions;
      const countMap = {};

      rosterPositions.forEach(position => {
        if (countMap[position]) {
          countMap[position] += 1;
        } else {
          countMap[position] = 1;
        }
      });

      setRosterSettings(countMap);
      // console.log(rosterSettings)
    } catch (error) {
      console.error('Error fetching league info: ', error);
    }
  };

  function calcMaxPointsWithPlayers(roster, week) {
    const positionCounts = {};
    let maxPoints = 0;
    const contributingPlayers = [];
  
    const sortedRoster = roster
      .map(playerId => {
        const playerInfo = playerData.get(playerId);
        if (playerInfo && fantasyPointsMap[playerInfo.name] !== undefined) {
          return {
            playerId,
            playerName: playerInfo.name,
            playerPosition: playerInfo.position,
            playerBye: playerInfo.bye,
            playerFantasyPoints: fantasyPointsMap[playerInfo.name]
          };
        }
        return null;
      })
      .filter(player => player !== null)
      .sort((a, b) => b.playerFantasyPoints - a.playerFantasyPoints);
  
    let SFLEXcount = rosterSettings['SUPER_FLEX'] || 0;
    let FLEXcount = rosterSettings['FLEX'] || 0;
    positionCounts['QB'] = 0
    positionCounts['RB'] = 0
    positionCounts['WR'] = 0
    positionCounts['TE'] = 0
    positionCounts['TE'] = 0
    positionCounts['K'] = 0
    positionCounts['DEF'] = 0
  
    sortedRoster.forEach(player => {
      const playerPosition = player.playerPosition;
      const bye = player.playerBye;
  
      if (
        bye !== week &&
        positionCounts[playerPosition] < rosterSettings[playerPosition] 
      ) {
        positionCounts[playerPosition]++;
        maxPoints += player.playerFantasyPoints;
        contributingPlayers.push({
          name: player.playerName,
          fpts: player.playerFantasyPoints,
          pos: player.playerPosition,
        })
      } else if (
        bye !== week &&
        SFLEXcount > 0 &&
        playerPosition === 'QB'
      ) {
        SFLEXcount--;
        maxPoints += player.playerFantasyPoints;
        contributingPlayers.push({
          name: player.playerName,
          fpts: player.playerFantasyPoints,
          pos: 'SUPER_FLEX'
        })
      } else if (
        bye !== week &&
        FLEXcount > 0 &&
        (playerPosition === 'WR' || playerPosition === 'RB' || playerPosition === 'TE')
      ) {
        FLEXcount--;
        maxPoints += player.playerFantasyPoints;
        contributingPlayers.push({
          name: player.playerName,
          fpts: player.playerFantasyPoints,
          pos: 'FLEX'
        })
      } else {
        maxPoints += 0;
      }
    });
    maxPoints = maxPoints.toFixed(2)
    return { maxPoints, contributingPlayers };
  } 

  const createSeasonData = async (leagueId) => {
    try {
      const formattedSeasonData = new Map();
  
      for (let week = 1; week <= 14; week++) {
        const formattedWeeklyData = new Map();
  
        // Fetch matchup data for the given week
        const matchupResponse = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/matchups/${week}`);
        const matchupList = await matchupResponse.json();
  
        matchupList.forEach((matchup) => {
          const matchupId = matchup.matchup_id;
          const teamName = userData.get(matchup.roster_id)?.team_name || 'Unknown Team';
          const players = matchup.players;
          const result = calcMaxPointsWithPlayers(players, week);
          const maxPoints = result.maxPoints;
          const optimalRoster = result.contributingPlayers;
          const outcome = 'N';
  
          if (!formattedWeeklyData.has(matchupId)) {
            formattedWeeklyData.set(matchupId, []);
          }
  
          formattedWeeklyData.get(matchupId).push({
            teamName: teamName,
            maxPoints: maxPoints,
            optimalRoster: optimalRoster,
            outcome: outcome
          });
        });
  
        formattedWeeklyData.forEach((matchup, matchupId) => {
          const [team1, team2] = matchup; // Assuming there are always two teams in a matchup
  
          if (team1.maxPoints > team2.maxPoints) {
            team1.outcome = 'W';
            team2.outcome = 'L';
          } else if(team1.maxPoints < team2.maxPoints) {
            team1.outcome = 'L';
            team2.outcome = 'W';
          }
          else {
            team1.outcome = 'T'
            team2.outcome = 'T'
          }
        });
  
        formattedSeasonData.set(week, formattedWeeklyData);
      }
  
      // Set the entire weeklyData state once after processing all weeks
      setSeasonData(formattedSeasonData);
    } catch (error) {
      console.error('Error: ', error);
    }
  };

  const calculateSeasonRecords = () => {
    const teamRecords = new Map();
  
    // Convert the weeklyData Map to an array of key-value pairs
    const weeklyDataArray = Array.from(seasonData);
  
    // Iterate through each week's data
    weeklyDataArray.forEach(([weekNumber, weekData]) => {
      // Iterate through each matchup in the current week
      weekData.forEach((matchup) => {
        // Iterate through each team in the matchup
        matchup.forEach((team) => {
          const { teamName, outcome } = team;
  
          if (!teamRecords.has(teamName)) {
            teamRecords.set(teamName, { wins: 0, losses: 0, ties: 0 });
          }
  
          if (outcome === 'W') {
            teamRecords.get(teamName).wins += 1;
          } else if (outcome === 'L') {
            teamRecords.get(teamName).losses += 1;
          }
          else {
            teamRecords.get(teamName).ties += 1;
          }
        });
      });
    });
  
    setTeamRecords(teamRecords);
    setSeasonResultsDisplayed(true); // Set the flag to indicate season results are displayed
  };
  
  
  

  const handleWeekChange = (event) => {
    const week = parseInt(event.target.value, 10);
    if (week >= 1 && week <= 14) {
      setSelectedWeek(week);
    }
  };

  const handleShowMatchup = () => {
    const matchupDataForSelectedWeek = seasonData.get(selectedWeek);
  
    if (matchupDataForSelectedWeek) {
      const formattedMatchupData = [];
  
      matchupDataForSelectedWeek.forEach((matchup) => {
        const [team1, team2] = matchup; // Assuming there are always two teams in a matchup
  
        const formattedMatchup = [
          {
            teamName: team1.teamName,
            maxPoints: team1.maxPoints,
            optimalRoster: team1.optimalRoster,
            outcome: team1.outcome,
          },
          {
            teamName: team2.teamName,
            maxPoints: team2.maxPoints,
            optimalRoster: team2.optimalRoster,
            outcome: team2.outcome,
          },
        ];
  
        formattedMatchupData.push(formattedMatchup);
      });
  
      setShowMatchupData(formattedMatchupData); 
      setShowMatchup(true); 
    } else {
      console.log(`No matchup data found for week ${selectedWeek}`);
    }
  };
  
  
  const fetchData = async () => {
    try {
      await createSeasonData(leagueId)

    } catch (error) {
      console.error('Error:', error);
    }
  };

useEffect(() => {
  const prepareData = async (leagueId) => {
    try {
      await fetchUserData(leagueId)
      await fetchRosterSettings(leagueId)
    } catch(error) {
      console.log('Error: ', error)
    }
  }
  prepareData(leagueId)
}, [leagueId])

useEffect(() => {
  const initializeData = async () => {
    await fetchPlayerData();
      await fetchCsvData()
  }
  initializeData()
}, [])

  const handleFetchData = async () => {
    try {
      const response = await fetch(`https://api.sleeper.app/v1/league/${leagueId}`);
      if (response.ok) {
        await fetchData();
      } else {
        console.error('Invalid League ID');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  useEffect(() => {
  if(seasonData.size > 0) {
    calculateSeasonRecords()
  }
  }, [seasonData])


  return (
    <div className="App">
    <h1>Sleeper FFB Record Predictor</h1>
    <body>
      <div>
        <input
          type="text"
          placeholder="Enter League ID"
          value={leagueId}
          onChange={(e) => setLeagueId(e.target.value)}
          className = 'styled-league-input'
        />
        <button className ="styled-button" onClick={handleFetchData}>
          Submit
        </button>
      </div>

    {seasonResultsDisplayed && ( // Show only if season results are displayed
          <div>
          <h2 className="season-records-title">Regular Season Records</h2>
      <table className="season-records-table">
        <thead>
          <tr>
            <th className="team-name">Team Name</th>
            <th className="wins">Wins</th>
            <th className="losses">Losses</th>
            <th className='ties'>Ties</th>
          </tr>
        </thead>
        <tbody>
          {Array.from(teamRecords).map(([teamName, { wins, losses, ties }]) => (
            <tr key={teamName}>
              <td className="team-name">{teamName}</td>
              <td className="wins">{wins}</td>
              <td className="losses">{losses}</td>
              <td className='ties'>{ties}</td>
            </tr>
          ))}
        </tbody>
      </table>

            <input
              type="number"
              min="1"
              max="14"
              value={selectedWeek}
              onChange={handleWeekChange} 
              className = 'styled-week-input'
            />

            <button className='styled-button' onClick={handleShowMatchup}>Show Week</button>

          </div>
        )}

  {showMatchup && (
    <div>
      <h2>Week {selectedWeek} Matchups</h2>
      <div className="matchup-container"> 
        {showMatchupData.map((matchup, index) => (
          <div className="matchup" key={index}>
            {matchup.map((team, teamIndex) => (
              <div className="team" key={teamIndex}>
                <p><strong>{team.teamName} </strong> - {team.outcome}</p>
                <p><strong>Max Points:</strong> {team.maxPoints}</p>
                <p><strong>Optimal Roster:</strong></p>
              <ul>
                {team.optimalRoster.map((player, playerIndex) => (
                  <li key={playerIndex}>
                    <strong>{player.pos}:</strong> {player.name} - {player.fpts} FPTS
                  </li>
                ))}
              </ul>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )}


</body>
    </div> 
  );
}

export default App;
