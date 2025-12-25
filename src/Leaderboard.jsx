import { useState, useEffect } from 'react';
import { getTopScores } from './supabase';

const Leaderboard = ({ localScores }) => {
  const [globalScores, setGlobalScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGlobalScores = async () => {
      const scores = await getTopScores();
      setGlobalScores(scores);
      setLoading(false);
    };
    fetchGlobalScores();
  }, []);

  const formatScore = (score) => score?.toLocaleString() || '0';
  const formatAccuracy = (accuracy) => `${(accuracy || 0).toFixed(1)}%`;

  return (
    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
      <div className="leaderboard">
        <h3>🏆 Local Best</h3>
        {localScores.length > 0 ? (
          localScores.slice(0, 5).map((entry, index) => (
            <div key={index} className="leaderboard-entry">
              <span>#{index + 1}</span>
              <span>{formatScore(entry.score)}</span>
              <span>{formatAccuracy(entry.accuracy)}</span>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', opacity: 0.6 }}>No scores yet</div>
        )}
      </div>

      <div className="leaderboard">
        <h3>🌍 Global Top</h3>
        {loading ? (
          <div style={{ textAlign: 'center', opacity: 0.6 }}>Loading...</div>
        ) : globalScores.length > 0 ? (
          globalScores.slice(0, 5).map((entry, index) => (
            <div key={index} className="leaderboard-entry">
              <span>#{index + 1}</span>
              <span>{formatScore(entry.score)}</span>
              <span>{formatAccuracy(entry.accuracy)}</span>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', opacity: 0.6 }}>No global scores</div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;