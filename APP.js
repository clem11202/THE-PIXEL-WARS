import React from 'react';
import ReactDOM from 'react-dom/client';

const App = () => {
  const badWords = ['badword1', 'badword2', 'fuck', 'shit', 'ass']; // Add more bad words as needed
  const [selectedColor, setSelectedColor] = React.useState(null);
  const [squareColors, setSquareColors] = React.useState(() => {
    const savedSquares = localStorage.getItem('whiteboardSquares');
    return savedSquares ? JSON.parse(savedSquares) : Array(10000).fill(null);
  });
  const [timeLeft, setTimeLeft] = React.useState(5);
  const [availableSquares, setAvailableSquares] = React.useState(1);
  const [whiteboardPosition, setWhiteboardPosition] = React.useState(0);
  const [activePlayers, setActivePlayers] = React.useState(0);
  const [playerName, setPlayerName] = React.useState('');
  const [confirmedName, setConfirmedName] = React.useState(() => {
    const savedName = localStorage.getItem('playerName');
    return savedName || '';
  });
  const [currentScore, setCurrentScore] = React.useState(0);
  const [topPlayers, setTopPlayers] = React.useState(() => {
    const savedPlayers = localStorage.getItem('topPlayers');
    return savedPlayers ? JSON.parse(savedPlayers) : [];
  });
  React.useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setAvailableSquares((squares) => squares + 1);
          return 5;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'ArrowUp') {
        setWhiteboardPosition(prev => Math.max(prev - 10, -500));
      } else if (event.key === 'ArrowDown') {
        setWhiteboardPosition(prev => Math.min(prev + 10, 500));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  // Colors for the palette
  const colors = [
    '#800080', // purple
    '#0000FF', // blue
    '#FF0000', // red
    '#008000', // green
    '#FFFF00', // yellow
    '#000000', // black
    '#FFA500', // orange
    '#FFC0CB', // pink
    '#FFFFFF', // white
    '#808080'  // grey
  ];

  // Create 10,000 small squares (100x100 grid)
  const smallSquares = Array(10000).fill(null);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: '40px',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      gap: '40px',
      '@keyframes slideIn': {
        from: { transform: 'translateX(-20px)', opacity: 0 },
        to: { transform: 'translateX(0)', opacity: 1 }
      },
      '@keyframes pulse': {
        '0%': { transform: 'scale(1)' },
        '50%': { transform: 'scale(1.05)' },
        '100%': { transform: 'scale(1)' }
      },
      '@keyframes fadeIn': {
        from: { opacity: 0 },
        to: { opacity: 1 }
      }
    }}>
      <div style={{
        padding: '30px',
        backgroundColor: 'white',
        borderRadius: '15px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        minWidth: '150px',
        animation: 'slideIn 0.5s ease-out',
        fontSize: '12px'
      }}>
        <h3 style={{ margin: '0 0 10px 0' }}>Timer</h3>
        <div style={{
          fontSize: '24px',
          fontWeight: 'bold',
          marginBottom: '10px',
          color: '#2196F3',
          textAlign: 'center',
          animation: `pulse ${timeLeft === 1 ? '0.5s' : '1s'} infinite`
        }}>
          {timeLeft}s
        </div>
        <div>
          Available Squares: {availableSquares}
        </div>
        <div style={{ marginTop: '10px' }}>
          Your Score: {currentScore}
        </div>
        <div style={{ 
          marginTop: '20px',
          borderTop: '1px solid #eee',
          paddingTop: '20px'
        }}>
          <h4 style={{ margin: '0 0 10px 0' }}>Top Players</h4>
          {topPlayers.map((player, index) => (
            <div key={index} style={{
              marginBottom: '5px',
              fontSize: '14px'
            }}>
              {player.name}: {player.score}
            </div>
          ))}
        </div>
        <div style={{
          marginTop: '20px',
          borderTop: '1px solid #eee',
          paddingTop: '20px'
        }}>
          {!confirmedName ? (
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value.slice(0, 15))}
                placeholder="Enter your name (1-15 characters) and press Enter"
                maxLength={15}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && playerName.trim()) {
                    e.preventDefault();
                    const trimmedName = playerName.trim();
                    if (trimmedName.length >= 1 && trimmedName.length <= 15) {
                      const containsBadWord = badWords.some(word => 
                        trimmedName.toLowerCase().includes(word.toLowerCase())
                      );
                      
                      const finalName = containsBadWord ? '*****' : trimmedName;
                      localStorage.setItem('playerName', finalName);
                      setConfirmedName(finalName);
                      setPlayerName('');
                      
                      const activePlayersList = JSON.parse(localStorage.getItem('activePlayers') || '[]');
                      if (!activePlayersList.includes(trimmedName)) {
                        activePlayersList.push(trimmedName);
                        localStorage.setItem('activePlayers', JSON.stringify(activePlayersList));
                        setActivePlayers(activePlayersList.length);
                      }
                    }
                  }
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '2px solid #e0e0e0',
                  fontSize: '14px',
                  transition: 'all 0.3s ease',
                  outline: 'none'
                }}
              />
              <div style={{
                padding: '12px',
                backgroundColor: '#f5f5f5',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#666'
              }}>
                Press Enter to start
              </div>
            </div>
          ) : (
            <div>
              <div style={{
                padding: '12px',
                backgroundColor: '#f5f5f5',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '8px'
              }}>
                Playing as: {confirmedName}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#666',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <span>Current Players Online: {activePlayers}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
      {/* Color palette */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px'
      }}>
        {colors.map((color, index) => (
          <div
            key={index}
            onClick={() => setSelectedColor(color)}
            style={{
              width: '50px',
              height: '50px',
              backgroundColor: color,
              border: selectedColor === color ? '4px solid #fff' : '2px solid #333',
              borderRadius: '5px',
              cursor: 'pointer',
              boxShadow: selectedColor === color ? '0 0 10px rgba(0,0,0,0.5)' : 'none'
            }}
          />
        ))}
      </div>

      {/* Whiteboard Container */}
      <div style={{
        width: '1000px',
        height: '1000px',
        position: 'relative',
        border: 'none',
        borderRadius: '15px',
        boxShadow: '0 15px 35px rgba(0,0,0,0.2)',
        animation: 'fadeIn 0.8s ease-out',
        backgroundColor: 'white'
      }}>
        {/* Whiteboard */}
        <div style={{
          width: '1000px',
          height: '1000px',
          backgroundColor: 'white',
          display: 'flex',
          flexWrap: 'wrap',
          position: 'relative',
          transform: `translateY(${whiteboardPosition}px)`,
          transition: 'transform 0.3s ease'
        }}>
        {squareColors.map((squareColor, index) => (
          <div
            key={index}
            onClick={() => {
              if (selectedColor && availableSquares > 0 && confirmedName) {
                const newSquareColors = [...squareColors];
                newSquareColors[index] = selectedColor;
                setSquareColors(newSquareColors);
                localStorage.setItem('whiteboardSquares', JSON.stringify(newSquareColors));
                setAvailableSquares(prev => prev - 1);
                
                // Update current player's score
                const newScore = currentScore + 1;
                setCurrentScore(newScore);
                
                // Update top players
                setTopPlayers(prev => {
                  const playerIndex = prev.findIndex(p => p.name === playerName);
                  let newTopPlayers = [...prev];
                  
                  if (playerIndex !== -1) {
                    // Update existing player's score
                    newTopPlayers[playerIndex].score = newScore;
                  } else {
                    // Add new player
                    newTopPlayers.push({ name: playerName, score: newScore });
                  }
                  
                  // Sort by score and keep top 5
                  const updatedTopPlayers = newTopPlayers
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 3);
                  
                  // Save to localStorage
                  localStorage.setItem('topPlayers', JSON.stringify(updatedTopPlayers));
                  
                  return updatedTopPlayers;
                });
              }
            }}
            style={{
              width: '10px',
              height: '10px',
              border: '1px solid #eee',
              backgroundColor: squareColor || 'white',
              boxSizing: 'border-box',
              cursor: selectedColor ? 'pointer' : 'default'
            }}
          />
        ))}
        </div>
      </div>
      </div>
    </div>
  );
};

const container = document.getElementById('renderDiv');
const root = ReactDOM.createRoot(container);
root.render(<App />);
