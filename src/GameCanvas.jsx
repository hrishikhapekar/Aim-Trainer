import { useRef, useEffect, useState, useCallback } from 'react';

const GameCanvas = ({ onGameEnd, soundEnabled }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const gameStateRef = useRef({
    targets: [],
    score: 0,
    hits: 0,
    totalClicks: 0,
    combo: 0,
    maxCombo: 0,
    timeLeft: 30,
    gameRunning: false,
    lastSpawn: 0,
    spawnRate: 1500, // Initial spawn rate in ms
    difficulty: 1
  });

  const [gameState, setGameState] = useState({
    score: 0,
    timeLeft: 30,
    accuracy: 0,
    combo: 0
  });

  // Audio context for sound effects
  const audioContextRef = useRef(null);
  const soundsRef = useRef({});

  // Initialize audio
  useEffect(() => {
    if (soundEnabled) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create simple sound effects using oscillators
        const createSound = (frequency, duration, type = 'sine') => {
          return () => {
            if (!audioContextRef.current) return;
            const oscillator = audioContextRef.current.createOscillator();
            const gainNode = audioContextRef.current.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContextRef.current.destination);
            
            oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);
            oscillator.type = type;
            
            gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration);
            
            oscillator.start(audioContextRef.current.currentTime);
            oscillator.stop(audioContextRef.current.currentTime + duration);
          };
        };

        soundsRef.current = {
          hit: createSound(800, 0.1, 'square'),
          miss: createSound(200, 0.2, 'sawtooth'),
          start: createSound(600, 0.3, 'sine'),
          end: createSound(400, 0.5, 'triangle')
        };
      } catch (error) {
        console.log('Audio not supported');
      }
    }
  }, [soundEnabled]);

  const playSound = useCallback((soundName) => {
    if (soundEnabled && soundsRef.current[soundName]) {
      try {
        soundsRef.current[soundName]();
      } catch (error) {
        console.log('Sound play failed');
      }
    }
  }, [soundEnabled]);

  // Target class
  class Target {
    constructor(x, y, canvas) {
      this.x = x;
      this.y = y;
      this.radius = 25;
      this.maxRadius = 25;
      this.animRadius = 0;
      this.lifespan = 2000; // 2 seconds
      this.created = Date.now();
      this.canvas = canvas;
    }

    update() {
      const age = Date.now() - this.created;
      const progress = Math.min(age / 200, 1); // Animation duration
      this.animRadius = this.maxRadius * progress;
      
      return age < this.lifespan;
    }

    draw(ctx) {
      // Outer glow
      const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.animRadius + 10);
      gradient.addColorStop(0, 'rgba(255, 68, 68, 0.8)');
      gradient.addColorStop(1, 'rgba(255, 68, 68, 0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.animRadius + 10, 0, Math.PI * 2);
      ctx.fill();

      // Main target
      ctx.fillStyle = '#ff4444';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.animRadius, 0, Math.PI * 2);
      ctx.fill();

      // Inner circle
      ctx.fillStyle = '#ff6666';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.animRadius * 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Center dot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.animRadius * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    isHit(x, y) {
      const distance = Math.sqrt((x - this.x) ** 2 + (y - this.y) ** 2);
      return distance <= this.animRadius;
    }
  }

  // AI Difficulty Scaling
  const updateDifficulty = useCallback(() => {
    const state = gameStateRef.current;
    const accuracy = state.totalClicks > 0 ? (state.hits / state.totalClicks) : 0;
    
    // Base difficulty on score, accuracy, and combo
    let difficultyMultiplier = 1;
    
    // Score factor (higher score = faster spawns)
    difficultyMultiplier += Math.min(state.score / 1000, 2);
    
    // Accuracy factor (higher accuracy = faster spawns)
    if (accuracy > 0.7) difficultyMultiplier += 1;
    if (accuracy > 0.8) difficultyMultiplier += 0.5;
    if (accuracy > 0.9) difficultyMultiplier += 0.5;
    
    // Combo factor
    difficultyMultiplier += Math.min(state.combo / 10, 1);
    
    // Update spawn rate (minimum 300ms between spawns)
    state.spawnRate = Math.max(300, 1500 / difficultyMultiplier);
    state.difficulty = difficultyMultiplier;
  }, []);

  // Spawn target
  const spawnTarget = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const padding = 50;
    
    const x = padding + Math.random() * (canvas.width - padding * 2);
    const y = padding + Math.random() * (canvas.height - padding * 2);
    
    const target = new Target(x, y, canvas);
    gameStateRef.current.targets.push(target);
  }, []);

  // Handle click/touch
  const handleCanvasClick = useCallback((event) => {
    const canvas = canvasRef.current;
    const state = gameStateRef.current;
    
    if (!canvas || !state.gameRunning) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    state.totalClicks++;
    let hit = false;

    // Check for hits
    for (let i = state.targets.length - 1; i >= 0; i--) {
      if (state.targets[i].isHit(x, y)) {
        // Hit!
        state.hits++;
        state.combo++;
        state.maxCombo = Math.max(state.maxCombo, state.combo);
        
        const comboMultiplier = 1 + (state.combo - 1) * 0.1;
        state.score += Math.floor(100 * comboMultiplier);
        
        state.targets.splice(i, 1);
        hit = true;
        playSound('hit');
        break;
      }
    }

    if (!hit) {
      state.combo = 0;
      playSound('miss');
    }

    updateDifficulty();
  }, [playSound, updateDifficulty]);

  // Handle touch events
  const handleTouchStart = useCallback((event) => {
    event.preventDefault();
    const touch = event.touches[0];
    handleCanvasClick(touch);
  }, [handleCanvasClick]);

  // Game loop
  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const state = gameStateRef.current;
    
    if (!canvas || !ctx || !state.gameRunning) return;

    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const now = Date.now();

    // Spawn targets based on difficulty
    if (now - state.lastSpawn > state.spawnRate) {
      spawnTarget();
      state.lastSpawn = now;
    }

    // Update and draw targets
    for (let i = state.targets.length - 1; i >= 0; i--) {
      const target = state.targets[i];
      if (!target.update()) {
        state.targets.splice(i, 1);
      } else {
        target.draw(ctx);
      }
    }

    // Update UI state
    const accuracy = state.totalClicks > 0 ? (state.hits / state.totalClicks) * 100 : 0;
    setGameState({
      score: state.score,
      timeLeft: state.timeLeft,
      accuracy: accuracy,
      combo: state.combo
    });

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [spawnTarget]);

  // Timer
  useEffect(() => {
    let timerInterval;
    
    if (gameStateRef.current.gameRunning) {
      timerInterval = setInterval(() => {
        gameStateRef.current.timeLeft--;
        
        if (gameStateRef.current.timeLeft <= 0) {
          gameStateRef.current.gameRunning = false;
          playSound('end');
          
          const finalStats = {
            score: gameStateRef.current.score,
            accuracy: gameStateRef.current.totalClicks > 0 ? 
              (gameStateRef.current.hits / gameStateRef.current.totalClicks) * 100 : 0,
            maxCombo: gameStateRef.current.maxCombo,
            hits: gameStateRef.current.hits,
            totalClicks: gameStateRef.current.totalClicks
          };
          
          onGameEnd(finalStats);
        }
      }, 1000);
    }

    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [onGameEnd, playSound]);

  // Start game
  const startGame = useCallback(() => {
    const state = gameStateRef.current;
    
    // Reset game state
    state.targets = [];
    state.score = 0;
    state.hits = 0;
    state.totalClicks = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.timeLeft = 30;
    state.gameRunning = true;
    state.lastSpawn = Date.now();
    state.spawnRate = 1500;
    state.difficulty = 1;

    playSound('start');
    gameLoop();
  }, [gameLoop, playSound]);

  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      const rect = container.getBoundingClientRect();
      
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Add event listeners
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('click', handleCanvasClick);
      canvas.removeEventListener('touchstart', handleTouchStart);
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [handleCanvasClick, handleTouchStart]);

  // Auto-start game
  useEffect(() => {
    startGame();
  }, [startGame]);

  return (
    <>
      <canvas ref={canvasRef} className="game-canvas" />
      
      <div className="hud">
        <div className="hud-left">
          <div className="hud-item score">Score: {gameState.score.toLocaleString()}</div>
          <div className="hud-item timer">Time: {gameState.timeLeft}s</div>
        </div>
        <div className="hud-right">
          <div className="hud-item accuracy">Accuracy: {gameState.accuracy.toFixed(1)}%</div>
          <div className="hud-item combo">Combo: {gameState.combo}x</div>
        </div>
      </div>
    </>
  );
};

export default GameCanvas;