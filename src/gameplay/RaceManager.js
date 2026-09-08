// ==========================================================
// ANTI-GRAVITY: RACE RULES, RANKING & PROGRESSION MANAGER
// ==========================================================
import { sound } from '../audio/SoundManager.js';
import { storage } from '../core/Storage.js';
import { gameState, STATES } from '../core/GameState.js';

export class RaceManager {
  constructor(trackBuilder, player, aiRacers, options = {}) {
    this.track = trackBuilder;
    this.player = player;
    this.aiRacers = aiRacers;
    this.totalLaps = options.laps || 3;
    this.trackIndex = options.trackIndex || 0;

    this.allRacers = [this.player, ...this.aiRacers];

    // Countdown state
    this.countdownState = 3;
    this.countdownTimer = 1.0;
    this.isCountingDown = true;
    this.raceActive = false;
    this.raceStartTime = 0;

    // Callbacks
    this.onCountdownTick = null;
    this.onLapComplete = null;
    this.onRaceFinish = null;

    // Leaderboard results
    this.finalStandings = [];
  }

  startCountdown() {
    this.countdownState = 3;
    this.countdownTimer = 1.0;
    this.isCountingDown = true;
    this.raceActive = false;

    sound.playCountdown(3);
    if (this.onCountdownTick) this.onCountdownTick(3, 'GET READY');

    gameState.setState(STATES.COUNTDOWN);
  }

  update(delta) {
    // 1. Handle Countdown
    if (this.isCountingDown) {
      this.countdownTimer -= delta;
      if (this.countdownTimer <= 0) {
        this.countdownTimer = 1.0;
        this.countdownState--;

        if (this.countdownState > 0) {
          sound.playCountdown(this.countdownState);
          if (this.onCountdownTick) this.onCountdownTick(this.countdownState, 'GET READY');
        } else if (this.countdownState === 0) {
          // GO!
          sound.playCountdown(0);
          if (this.onCountdownTick) this.onCountdownTick(0, 'GO!');
          this.raceActive = true;
          this.raceStartTime = performance.now() * 0.001;
          this.player.lapStartTime = this.raceStartTime;
          gameState.setState(STATES.RACING);
          sound.startMusic();
        } else {
          // Hide alert
          this.isCountingDown = false;
          if (this.onCountdownTick) this.onCountdownTick(-1, '');
        }
      }
      return;
    }

    if (!this.raceActive && this.player.isFinished) return;

    const now = performance.now() * 0.001;
    const totalElapsed = now - this.raceStartTime;
    this.player.totalRaceTime = totalElapsed;
    this.player.currentLapTime = now - this.player.lapStartTime;

    // 2. Track checkpoints and laps for each vehicle
    for (const racer of this.allRacers) {
      if (racer.isFinished) continue;

      this.updateRacerCheckpoints(racer, now);
    }

    // 3. Compute real-time standings (1st to 6th)
    this.updateStandings();

    // 4. Boost pads and Obstacle collision checks
    this.checkTrackInteractions();
  }

  updateRacerCheckpoints(racer, now) {
    const checkpoints = this.track.checkpoints;
    const cpCount = checkpoints.length;
    const nextCpIndex = (racer.lastCheckpointIndex + 1) % cpCount;
    const nextCp = checkpoints[nextCpIndex];

    const distToNext = racer.position.distanceTo(nextCp.position);
    if (distToNext < nextCp.radius) {
      racer.lastCheckpointIndex = nextCpIndex;

      // Completed a full lap!
      if (nextCpIndex === 0) {
        const lapTime = now - racer.lapStartTime;
        if (!racer.bestLapTime || lapTime < racer.bestLapTime) {
          racer.bestLapTime = lapTime;
        }

        racer.lapStartTime = now;
        racer.currentLap++;

        if (racer === this.player) {
          sound.playLapPass();
          if (this.onLapComplete) {
            this.onLapComplete(racer.currentLap, this.totalLaps);
          }
        }

        // Check race finish
        if (racer.currentLap > this.totalLaps) {
          racer.isFinished = true;
          racer.finishTime = racer.totalRaceTime || (now - this.raceStartTime);

          if (racer === this.player) {
            this.handlePlayerFinish();
          }
        }
      }
    }

    // Normalized progress along entire race
    const progressInLap = (racer.trackU !== undefined ? racer.trackU : (racer.lastCheckpointIndex / cpCount));
    racer.raceProgress = (racer.currentLap - 1) + progressInLap;
  }

  updateStandings() {
    // Sort racers by raceProgress descending
    const sorted = [...this.allRacers].sort((a, b) => {
      if (a.isFinished && !b.isFinished) return -1;
      if (!a.isFinished && b.isFinished) return 1;
      return b.raceProgress - a.raceProgress;
    });

    sorted.forEach((racer, index) => {
      racer.positionRank = index + 1;
    });

    this.player.rank = this.player.positionRank;
  }

  checkTrackInteractions() {
    // 1. Boost pads
    for (const pad of this.track.boostPads) {
      for (const racer of this.allRacers) {
        if (racer.position.distanceTo(pad.position) < (pad.width * 0.7)) {
          if (!racer.lastBoostPadTime || (performance.now() - racer.lastBoostPadTime > 1200)) {
            racer.lastBoostPadTime = performance.now();
            racer.onBoostPadHit();
          }
        }
      }
    }

    // 2. Obstacles
    for (const obs of this.track.obstacles) {
      const dist = this.player.position.distanceTo(obs.position);
      if (dist < obs.radius + 1.2) {
        if (!this.player.lastObstacleHit || (performance.now() - this.player.lastObstacleHit > 1000)) {
          this.player.lastObstacleHit = performance.now();
          this.player.onCollision('OBSTACLE', 0.8);
        }
      }
    }

    // 3. Racer-to-racer collisions
    const playerPos = this.player.position;
    for (const ai of this.aiRacers) {
      const dist = playerPos.distanceTo(ai.position);
      if (dist < 3.2) {
        // Push apart
        const pushDir = new THREE.Vector3().subVectors(playerPos, ai.position).normalize();
        this.player.position.addScaledVector(pushDir, 0.5);
        ai.position.addScaledVector(pushDir, -0.5);

        this.player.onCollision('VEHICLE', 0.45);
        ai.onCollision('VEHICLE', 0.45);
      }
    }
  }

  handlePlayerFinish() {
    this.raceActive = false;
    sound.stopMusic();

    const isWinner = this.player.positionRank === 1;
    sound.playRaceFinish(isWinner);

    // Record save progression
    const rewards = storage.recordRace(
      this.trackIndex,
      this.player.totalRaceTime,
      this.player.bestLapTime,
      this.player.positionRank
    );

    // Build final standings table
    this.finalStandings = [...this.allRacers].map(r => ({
      name: r.name || (r === this.player ? 'PILOT (YOU)' : 'AI RACER'),
      isPlayer: r === this.player,
      rank: r.positionRank,
      time: r.finishTime || (this.player.totalRaceTime + (r.positionRank - 1) * 2.8),
      vehicle: r.vehicleModel ? r.vehicleModel.racerName : 'CRAFT'
    })).sort((a, b) => a.rank - b.rank);

    gameState.setState(STATES.FINISHED, {
      rank: this.player.positionRank,
      totalTime: this.player.totalRaceTime,
      bestLap: this.player.bestLapTime,
      rewards,
      standings: this.finalStandings
    });

    if (this.onRaceFinish) {
      this.onRaceFinish(this.player.positionRank, this.finalStandings, rewards);
    }
  }
}
