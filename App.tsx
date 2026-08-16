import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Round, DEFAULT_PLAYERS, DEFAULT_BETTING_LEVELS } from './types';
import {
  AlertCircle,
  Crown,
  Eraser,
  RefreshCcw,
  RotateCcw,
  Settings2,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';

const generateId = () => Math.random().toString(36).substring(2, 9);
const createEmptyRound = (): Round => ({ id: generateId(), scores: ['', '', '', ''] });

const formatScore = (value: number) => (value > 0 ? `+${value}` : `${value}`);

const App: React.FC = () => {
  const [showSetup, setShowSetup] = useState<boolean>(() => {
    const saved = localStorage.getItem('tls_setup_complete');
    return saved !== 'true';
  });

  const [players, setPlayers] = useState<string[]>(() => {
    const saved = localStorage.getItem('tls_players');
    return saved ? JSON.parse(saved) : DEFAULT_PLAYERS;
  });

  const [bettingLevels, setBettingLevels] = useState<number[]>(() => {
    const saved = localStorage.getItem('tls_betting_levels');
    return saved ? JSON.parse(saved) : DEFAULT_BETTING_LEVELS;
  });

  const [rounds, setRounds] = useState<Round[]>(() => {
    const saved = localStorage.getItem('tls_rounds');
    return saved ? JSON.parse(saved) : [];
  });

  const [focusedInput, setFocusedInput] = useState<{ roundIndex: number; playerIndex: number } | null>(null);
  const roundsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('tls_players', JSON.stringify(players));
    localStorage.setItem('tls_rounds', JSON.stringify(rounds));
    localStorage.setItem('tls_betting_levels', JSON.stringify(bettingLevels));
  }, [players, rounds, bettingLevels]);

  useEffect(() => {
    roundsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [rounds.length]);

  useEffect(() => {
    if (!showSetup && rounds.length === 0) {
      setRounds([createEmptyRound()]);
      setFocusedInput({ roundIndex: 0, playerIndex: 0 });
    }
  }, [showSetup, rounds.length]);

  const completedRounds = useMemo(
    () => rounds.filter(round => round.scores.some(score => typeof score === 'number')).length,
    [rounds]
  );

  const totals = useMemo(
    () =>
      players.map((_, playerIndex) =>
        rounds.reduce((sum, round) => {
          const score = round.scores[playerIndex];
          return sum + (typeof score === 'number' ? score : 0);
        }, 0)
      ),
    [players, rounds]
  );

  const maxScore = Math.max(...totals);
  const minScore = Math.min(...totals);
  const hasScores = totals.some(total => total !== 0);
  const leaderIndex = hasScores ? totals.indexOf(maxScore) : -1;
  const focusedPlayer = focusedInput ? players[focusedInput.playerIndex] : 'Chọn ô điểm';

  const handlePlayerNameChange = (index: number, name: string) => {
    const newPlayers = [...players];
    newPlayers[index] = name;
    setPlayers(newPlayers);
  };

  const autoFillFinalScore = (scores: (number | string)[]) => {
    const emptyIndexes = scores
      .map((score, index) => (typeof score === 'number' ? -1 : index))
      .filter(index => index !== -1);

    if (emptyIndexes.length !== 1) {
      return scores;
    }

    const enteredTotal = scores.reduce(
      (sum: number, score) => sum + (typeof score === 'number' ? score : 0),
      0
    );
    const completedScores = [...scores];
    completedScores[emptyIndexes[0]] = -enteredTotal;
    return completedScores;
  };

  const isCompleteBalancedRound = (scores: (number | string)[]) =>
    scores.every(score => typeof score === 'number') &&
    scores.reduce((sum: number, score) => sum + (score as number), 0) === 0;

  const deleteRound = (id: string) => {
    setRounds(prev => prev.filter(round => round.id !== id));
  };

  const resetGame = useCallback(() => {
    if (window.confirm('Xóa toàn bộ điểm và bắt đầu lại?')) {
      setRounds([]);
      setFocusedInput(null);
    }
  }, []);

  const resetAll = useCallback(() => {
    if (window.confirm('Xóa tên người chơi, mức cược và toàn bộ điểm?')) {
      setPlayers(DEFAULT_PLAYERS);
      setBettingLevels(DEFAULT_BETTING_LEVELS);
      setRounds([]);
      setFocusedInput(null);
      setShowSetup(true);
      localStorage.removeItem('tls_setup_complete');
    }
  }, []);

  const handleSetupComplete = () => {
    if (players.some(player => !player.trim())) {
      alert('Vui lòng nhập đủ tên 4 người chơi.');
      return;
    }

    if (bettingLevels.some(level => !level || level <= 0)) {
      alert('Vui lòng nhập mức cược hợp lệ.');
      return;
    }

    localStorage.setItem('tls_setup_complete', 'true');
    setShowSetup(false);
  };

  const applyBettingToInput = (roundIndex: number, playerIndex: number, amount: number) => {
    let nextFocus: { roundIndex: number; playerIndex: number } | null = null;

    setRounds(prev => {
      const newRounds = [...prev];
      if (roundIndex >= newRounds.length) return prev;

      const newScores = [...newRounds[roundIndex].scores];
      const currentScore = newScores[playerIndex];
      const currentValue = typeof currentScore === 'number' ? currentScore : 0;
      newScores[playerIndex] = amount === 0 ? 0 : currentValue + amount;

      const completedScores = autoFillFinalScore(newScores);
      newRounds[roundIndex] = { ...newRounds[roundIndex], scores: completedScores };

      if (roundIndex === newRounds.length - 1 && isCompleteBalancedRound(completedScores)) {
        newRounds.push(createEmptyRound());
        nextFocus = { roundIndex: newRounds.length - 1, playerIndex: 0 };
      }

      return newRounds;
    });

    if (nextFocus) {
      setFocusedInput(nextFocus);
    }
  };

  const handleBettingClick = (amount: number) => {
    if (!focusedInput) {
      if (rounds.length === 0) return;
      const lastRoundIndex = rounds.length - 1;
      applyBettingToInput(lastRoundIndex, 0, amount);
      setFocusedInput({ roundIndex: lastRoundIndex, playerIndex: 0 });
      return;
    }

    applyBettingToInput(focusedInput.roundIndex, focusedInput.playerIndex, amount);
  };

  const undoFocusedScore = () => {
    if (!focusedInput) return;

    setRounds(prev => {
      const newRounds = [...prev];
      const round = newRounds[focusedInput.roundIndex];
      if (!round) return prev;

      const newScores = [...round.scores];
      newScores[focusedInput.playerIndex] = '';
      newRounds[focusedInput.roundIndex] = { ...round, scores: newScores };
      return newRounds;
    });
  };

  return (
    <div className="min-h-full bg-[#111318] text-zinc-100">
      <div className="mx-auto flex h-full max-w-md flex-col bg-[#17191f] shadow-2xl md:border-x md:border-zinc-800">
        {showSetup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-md animate-fadeIn">
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-700 bg-[#1d2028] shadow-2xl animate-scaleIn">
              <div className="flex items-center justify-between border-b border-zinc-700/70 px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-amber-300">Thiết lập</p>
                  <h2 className="text-xl font-bold text-white">Ghi điểm Tiến Lên</h2>
                </div>
                <button
                  onClick={() => {
                    if (players.every(player => player.trim()) && bettingLevels.every(level => level > 0)) {
                      handleSetupComplete();
                    }
                  }}
                  className="rounded-full p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
                  aria-label="Đóng"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="max-h-[76vh] overflow-y-auto p-5">
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-zinc-300">Tên người chơi</label>
                  {players.map((player, index) => (
                    <input
                      key={index}
                      type="text"
                      value={player}
                      onChange={event => handlePlayerNameChange(index, event.target.value)}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-4 py-3 text-base font-semibold text-white outline-none transition placeholder:text-zinc-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                      placeholder={`Người chơi ${index + 1}`}
                    />
                  ))}
                </div>

                <div className="mt-6">
                  <label className="text-sm font-semibold text-zinc-300">Mức điểm nhanh</label>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {bettingLevels.map((level, index) => (
                      <input
                        key={index}
                        type="number"
                        min="1"
                        value={level}
                        onChange={event => {
                          const newLevels = [...bettingLevels];
                          newLevels[index] = parseInt(event.target.value) || 0;
                          setBettingLevels(newLevels);
                        }}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-4 py-3 text-center text-lg font-bold text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                        placeholder={`Mức ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSetupComplete}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-4 font-bold text-zinc-950 transition active:scale-[0.98]"
                >
                  <Trophy size={18} />
                  Bắt đầu
                </button>
              </div>
            </div>
          </div>
        )}

        <header className="shrink-0 border-b border-zinc-800 bg-[#17191f]/95 px-4 pb-3 pt-4 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-amber-300">Tiến Lên</p>
              <h1 className="text-2xl font-black tracking-tight text-white">Bảng điểm</h1>
            </div>
            <div className="flex rounded-full border border-zinc-700 bg-zinc-900/70 p-1">
              <button
                onClick={() => setShowSetup(true)}
                className="rounded-full p-2 text-zinc-300 transition hover:bg-zinc-800 hover:text-amber-300"
                title="Thiết lập"
                aria-label="Thiết lập"
              >
                <Settings2 size={18} />
              </button>
              <button
                onClick={resetGame}
                className="rounded-full p-2 text-zinc-300 transition hover:bg-zinc-800 hover:text-emerald-300"
                title="Xóa điểm"
                aria-label="Xóa điểm"
              >
                <Eraser size={18} />
              </button>
              <button
                onClick={resetAll}
                className="rounded-full p-2 text-zinc-300 transition hover:bg-zinc-800 hover:text-rose-300"
                title="Reset toàn bộ"
                aria-label="Reset toàn bộ"
              >
                <RefreshCcw size={18} />
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase text-zinc-500">Ván</p>
              <p className="text-lg font-black text-white">{completedRounds}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase text-zinc-500">Đang chọn</p>
              <p className="truncate text-sm font-bold text-amber-200">{focusedPlayer}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase text-zinc-500">Dẫn đầu</p>
              <p className="truncate text-sm font-bold text-emerald-300">
                {leaderIndex >= 0 ? players[leaderIndex] : '-'}
              </p>
            </div>
          </div>
        </header>

        <section className="shrink-0 border-b border-zinc-800 bg-[#17191f] px-3 py-3">
          <div className="grid grid-cols-[34px_repeat(4,minmax(0,1fr))_28px] gap-2">
            <div className="flex items-center justify-center text-[11px] font-black text-zinc-500">#</div>
            {players.map((player, index) => (
              <input
                key={index}
                type="text"
                value={player}
                onChange={event => handlePlayerNameChange(index, event.target.value)}
                className="min-w-0 rounded-lg border border-zinc-800 bg-zinc-900/70 px-2 py-2 text-center text-sm font-bold text-zinc-100 outline-none transition focus:border-amber-400"
                placeholder={`P${index + 1}`}
              />
            ))}
            <div />
          </div>
        </section>

        <main className="min-h-0 flex-1 overflow-y-auto px-3 py-3 no-scrollbar">
          <div className="space-y-2">
            {rounds.map((round, roundIdx) => {
              const roundSum = round.scores.reduce(
                (sum: number, score) => sum + (typeof score === 'number' ? score : 0),
                0
              );
              const hasEntries = round.scores.some(score => score !== '');
              const showWarning = hasEntries && roundSum !== 0;

              return (
                <div
                  key={round.id}
                  className={`grid grid-cols-[34px_repeat(4,minmax(0,1fr))_28px] gap-2 rounded-xl border p-2 transition animate-fadeIn ${
                    showWarning ? 'border-rose-500/50 bg-rose-950/20' : 'border-zinc-800 bg-[#1d2028]'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    {showWarning ? (
                      <AlertCircle className="text-rose-300" size={18} />
                    ) : (
                      <span className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-black text-zinc-400">
                        {roundIdx + 1}
                      </span>
                    )}
                  </div>

                  {round.scores.map((score, playerIdx) => {
                    const isFocused =
                      focusedInput?.roundIndex === roundIdx && focusedInput?.playerIndex === playerIdx;
                    const numericScore = typeof score === 'number' ? score : null;

                    return (
                      <button
                        key={playerIdx}
                        type="button"
                        onClick={() => setFocusedInput({ roundIndex: roundIdx, playerIndex: playerIdx })}
                        className={`min-h-[48px] min-w-0 rounded-lg border px-1 text-center font-mono text-base font-black transition active:scale-95 ${
                          isFocused
                            ? 'border-amber-300 bg-amber-300 text-zinc-950 shadow-lg shadow-amber-950/30'
                            : 'border-zinc-700 bg-zinc-900/70 text-zinc-400'
                        } ${
                          !isFocused && numericScore !== null && numericScore > 0 ? 'text-emerald-300' : ''
                        } ${
                          !isFocused && numericScore !== null && numericScore < 0 ? 'text-rose-300' : ''
                        }`}
                      >
                        {numericScore === null ? '-' : formatScore(numericScore)}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => deleteRound(round.id)}
                    className="flex items-center justify-center rounded-lg text-zinc-500 transition hover:bg-rose-500/10 hover:text-rose-300 active:scale-95"
                    aria-label="Xóa ván"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
            <div ref={roundsEndRef} className="h-px" />
          </div>
        </main>

        <footer className="shrink-0 border-t border-zinc-800 bg-[#17191f] pb-safe shadow-2xl">
          <div className="grid grid-cols-[34px_repeat(4,minmax(0,1fr))_28px] gap-2 border-b border-zinc-800 px-3 py-3">
            <div className="flex items-center justify-center">
              <Crown size={17} className="text-amber-300" />
            </div>
            {totals.map((total, index) => {
              const isHighest = hasScores && total === maxScore;
              const isLowest = hasScores && total === minScore;

              return (
                <div
                  key={index}
                  className={`min-w-0 rounded-xl border px-1 py-2 text-center font-mono text-lg font-black ${
                    isHighest
                      ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200'
                      : isLowest
                        ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                        : 'border-zinc-800 bg-zinc-900/70 text-zinc-200'
                  }`}
                >
                  {formatScore(total)}
                </div>
              );
            })}
            <div />
          </div>

          <div className="p-3">
            <div className="mb-3 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase text-zinc-500">Ghi cho</p>
                <p className="truncate text-sm font-bold text-white">
                  {focusedInput ? `Ván ${focusedInput.roundIndex + 1} - ${players[focusedInput.playerIndex]}` : 'Chọn ô điểm'}
                </p>
              </div>
              <button
                type="button"
                onClick={undoFocusedScore}
                className="rounded-lg border border-zinc-700 p-2 text-zinc-300 transition hover:bg-zinc-800 hover:text-white active:scale-95"
                aria-label="Xóa điểm đang chọn"
                title="Xóa điểm đang chọn"
              >
                <RotateCcw size={16} />
              </button>
            </div>

            <div className="grid grid-cols-5 gap-2">
              <button type="button" onClick={() => handleBettingClick(bettingLevels[0])} className="score-key score-key-win">
                +{bettingLevels[0]}
              </button>
              <button type="button" onClick={() => handleBettingClick(bettingLevels[1])} className="score-key score-key-win">
                +{bettingLevels[1]}
              </button>
              <button type="button" onClick={() => handleBettingClick(0)} className="score-key score-key-zero">
                0
              </button>
              <button type="button" onClick={() => handleBettingClick(-bettingLevels[0])} className="score-key score-key-lose">
                -{bettingLevels[0]}
              </button>
              <button type="button" onClick={() => handleBettingClick(-bettingLevels[1])} className="score-key score-key-lose">
                -{bettingLevels[1]}
              </button>
            </div>
          </div>
        </footer>

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.96); }
            to { opacity: 1; transform: scale(1); }
          }
          .animate-fadeIn {
            animation: fadeIn 0.2s ease-out forwards;
          }
          .animate-scaleIn {
            animation: scaleIn 0.2s ease-out forwards;
          }
          .pb-safe {
            padding-bottom: env(safe-area-inset-bottom, 12px);
          }
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .score-key {
            min-height: 48px;
            border-radius: 12px;
            border: 1px solid;
            font-weight: 900;
            font-size: 14px;
            transition: transform 120ms ease, background 120ms ease, border-color 120ms ease;
          }
          .score-key:active {
            transform: scale(0.96);
          }
          .score-key-win {
            border-color: rgba(52, 211, 153, 0.45);
            background: rgba(16, 185, 129, 0.16);
            color: rgb(167, 243, 208);
          }
          .score-key-zero {
            border-color: rgba(251, 191, 36, 0.45);
            background: rgba(251, 191, 36, 0.14);
            color: rgb(253, 230, 138);
          }
          .score-key-lose {
            border-color: rgba(251, 113, 133, 0.45);
            background: rgba(244, 63, 94, 0.14);
            color: rgb(254, 205, 211);
          }
        `}</style>
      </div>
    </div>
  );
};

export default App;
