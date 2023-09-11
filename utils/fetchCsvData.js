// utils/fetchCsvData.js
import Papa from 'papaparse';

export const fetchCsvData = async (csvUrl, position, setFantasyPointsMap) => {
  try {
    const response = await fetch(csvUrl);
    const csvText = await response.text();

    Papa.parse(csvText, {
      header: true,
      complete: (result) => {
        const playerFantasyPointsMap = {};
        result.data.forEach(player => {
          const playerName = player.Player;
          const playerFantasyPoints = parseFloat(player.FPTS);

          if (!playerFantasyPointsMap[playerName]) {
            playerFantasyPointsMap[playerName] = {};
          }
          playerFantasyPointsMap[playerName] = playerFantasyPoints;
        });

        setFantasyPointsMap(prevFantasyPointsMap => ({
          ...prevFantasyPointsMap,
          ...playerFantasyPointsMap
        }));
      },
      error: (error) => {
        console.error('CSV Parse Error: ', error);
      }
    });
  } catch (error) {
    console.error('Error fetching CSV data:', error);
  }
};
