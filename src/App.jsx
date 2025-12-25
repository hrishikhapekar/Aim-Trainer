import { useState, useEffect, useCallback } from 'react';
import GameCanvas from './GameCanvas';
import Leaderboard from './Leaderboard';
import { saveScore } from './supabase';


const App = () => {
  const [gameState, setGameState] = useState('start'); // 'start', 'playing', 'gameOver'
  const [finalStats, setFinalStats] = useState(null);
  const [localScores, setLocalScores] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(false);


  // Load local scores from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('aimTrainerScores');
    if (saved) {
      try {
        setLocalScores(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading local scores:', error);
      }
    }
  }, []);

  // Save score to localStorage
  const saveLocalScore = useCallback((stats) => {
    const newScore = {
      score: stats.score,
      accuracy: stats.accuracy,
      maxCombo: stats.maxCombo,
      date: new Date().toLocaleDateString()
    };

    const updatedScores = [...localScores, newScore]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Keep top 10

    setLocalScores(updatedScores);
    localStorage.setItem('aimTrainerScores', JSON.stringify(updatedScores));
  }, [localScores]);

  // Handle game end
  const handleGameEnd = useCallback((stats) => {
    setFinalStats(stats);
    setGameState('gameOver');
    saveLocalScore(stats);
  }, [saveLocalScore]);

  // Start new game
  const startGame = useCallback(() => {
    setGameState('playing');
    setFinalStats(null);
  }, []);

  // Return to start screen
  const returnToStart = useCallback(() => {
    setGameState('start');
    setFinalStats(null);
  }, []);



  // Toggle sound
  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => !prev);
  }, []);

  // Save score to Supabase
  const handleSaveToGlobal = useCallback(async () => {
    if (!finalStats) return;

    const success = await saveScore({
      score: finalStats.score,
      accuracy: finalStats.accuracy,
      maxCombo: finalStats.maxCombo
    });

    if (success) {
      alert('Score saved to global leaderboard!');
    } else {
      alert('Failed to save score. Please try again.');
    }
  }, [finalStats]);

  return (
    <div className="app">
      {gameState === 'start' && (
        <div className="start-screen">
          <h1 className="title">🎯 AIM TRAINER</h1>
          <button className="button" onClick={startGame}>
            START GAME
          </button>
          <Leaderboard localScores={localScores} />
        </div>
      )}

      {gameState === 'playing' && (
        <div className="game-area">
          <GameCanvas 
            onGameEnd={handleGameEnd} 
            soundEnabled={soundEnabled}
          />
          <button 
            className="sound-toggle"
            onClick={toggleSound}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              zIndex: 20
            }}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      )}

      {gameState === 'gameOver' && finalStats && (
        <div className="game-over-screen">
          <h1 className="title">🎯 GAME OVER</h1>
          
          <div className="stats">
            <div className="stat-item">
              <div className="stat-value">{finalStats.score.toLocaleString()}</div>
              <div className="stat-label">Final Score</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{finalStats.accuracy.toFixed(1)}%</div>
              <div className="stat-label">Accuracy</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{finalStats.maxCombo}x</div>
              <div className="stat-label">Max Combo</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{finalStats.hits}/{finalStats.totalClicks}</div>
              <div className="stat-label">Hits/Clicks</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className="button" onClick={startGame}>
              PLAY AGAIN
            </button>
            <button className="button" onClick={handleSaveToGlobal}>
              SAVE TO GLOBAL
            </button>
            <button className="button" onClick={returnToStart}>
              MAIN MENU
            </button>
          </div>

          <Leaderboard localScores={localScores} />
        </div>
      )}
    </div>
  );
};

export default App;