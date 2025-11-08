import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Round, DEFAULT_PLAYERS, DEFAULT_BETTING_LEVELS } from './types';
import { Trash2, Plus, RefreshCcw, Eraser, Trophy, AlertCircle, X } from 'lucide-react';

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 9);

const App: React.FC = () => {
  // Check if setup is complete
  const [showSetup, setShowSetup] = useState<boolean>(() => {
    const saved = localStorage.getItem('tls_setup_complete');
    return saved !== 'true';
  });

  // Load state from localStorage or use defaults
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

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('tls_players', JSON.stringify(players));
    localStorage.setItem('tls_rounds', JSON.stringify(rounds));
    localStorage.setItem('tls_betting_levels', JSON.stringify(bettingLevels));
  }, [players, rounds, bettingLevels]);

  // Scroll to bottom when a new round is added
  useEffect(() => {
    roundsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [rounds.length]);

  const handlePlayerNameChange = (index: number, name: string) => {
    const newPlayers = [...players];
    newPlayers[index] = name;
    setPlayers(newPlayers);
  };

  const addRound = useCallback(() => {
    setRounds(prev => [...prev, { id: generateId(), scores: ['', '', '', ''] }]);
  }, []);

  const updateScore = (roundIndex: number, playerIndex: number, value: string) => {
    // Allow empty string, minus sign, or valid numbers
    if (value !== '' && value !== '-' && isNaN(Number(value))) {
        return;
    }

    setRounds(prev => {
      const newRounds = [...prev];
      const newScores = [...newRounds[roundIndex].scores];
      newScores[playerIndex] = value === '' ? '' : (value === '-' ? '-' : Number(value));
      newRounds[roundIndex] = { ...newRounds[roundIndex], scores: newScores };
      return newRounds;
    });
  };

  const deleteRound = (id: string) => {
    setRounds(prev => prev.filter(r => r.id !== id));
  };

  const resetGame = useCallback(() => {
    if (window.confirm('Bạn có chắc muốn xóa hết điểm và bắt đầu lại không?')) {
      setRounds([]);
    }
  }, []);

  const resetAll = useCallback(() => {
      if (window.confirm('Hành động này sẽ xóa tên người chơi và tất cả điểm số. Tiếp tục?')) {
          setPlayers(DEFAULT_PLAYERS);
          setBettingLevels(DEFAULT_BETTING_LEVELS);
          setRounds([]);
          setShowSetup(true);
      }
  }, []);

  const handleSetupComplete = () => {
    // Validate that all players have names
    if (players.some(p => !p.trim())) {
      alert('Vui lòng nhập đầy đủ tên 4 người chơi!');
      return;
    }
    // Validate betting levels
    if (bettingLevels.some(b => !b || b <= 0)) {
      alert('Vui lòng nhập mức cược hợp lệ (số dương)!');
      return;
    }
    localStorage.setItem('tls_setup_complete', 'true');
    setShowSetup(false);
  };

  const handleBettingClick = (amount: number) => {
    if (!focusedInput) {
      // Nếu không có input nào được chọn, tìm ván cuối cùng và người chơi đầu tiên
      if (rounds.length === 0) {
        return;
      }
      const lastRoundIndex = rounds.length - 1;
      applyBettingToInput(lastRoundIndex, 0, amount);
      setFocusedInput({ roundIndex: lastRoundIndex, playerIndex: 0 });
      return;
    }
    applyBettingToInput(focusedInput.roundIndex, focusedInput.playerIndex, amount);
  };

  const applyBettingToInput = (roundIndex: number, playerIndex: number, amount: number) => {
    setRounds(prev => {
      const newRounds = [...prev];
      if (roundIndex >= newRounds.length) return prev;
      const newScores = [...newRounds[roundIndex].scores];
      const currentScore = newScores[playerIndex];
      const currentValue = typeof currentScore === 'number' ? currentScore : 0;
      newScores[playerIndex] = currentValue + amount;
      newRounds[roundIndex] = { ...newRounds[roundIndex], scores: newScores };
      return newRounds;
    });
  };

  // Calculate totals
  const totals = players.map((_, playerIndex) => {
    return rounds.reduce((sum, round) => {
      const score = round.scores[playerIndex];
      return sum + (typeof score === 'number' ? score : 0);
    }, 0);
  });

  const maxScore = Math.max(...totals);
  const minScore = Math.min(...totals);
  const hasScores = totals.some(t => t !== 0);

  return (
    <div className="flex flex-col h-full max-w-md mx-auto bg-slate-950 text-slate-200 shadow-2xl overflow-x-hidden md:border-x md:border-slate-800">
      {/* Setup Modal */}
      {showSetup && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-3xl shadow-2xl w-full max-w-md border border-slate-800/50 p-6 max-h-[90vh] overflow-y-auto animate-scaleIn">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500/10 p-2 rounded-xl">
                  <Trophy size={20} className="text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-100 tracking-tight">Thiết lập trò chơi</h2>
              </div>
              <button
                onClick={() => {
                  if (players.every(p => p.trim()) && bettingLevels.every(b => b > 0)) {
                    handleSetupComplete();
                  }
                }}
                className="text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 p-1.5 rounded-lg transition-all"
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>

            {/* Player Names Input */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-300 mb-3 tracking-wide">Tên 4 người chơi</label>
              <div className="space-y-3">
                {players.map((player, index) => (
                  <input
                    key={index}
                    type="text"
                    value={player}
                    onChange={(e) => {
                      const newPlayers = [...players];
                      newPlayers[index] = e.target.value;
                      setPlayers(newPlayers);
                    }}
                    className="w-full bg-slate-800/60 text-slate-100 rounded-xl px-4 py-3.5 border border-slate-700/50 focus:outline-none focus:border-emerald-500/50 focus:bg-slate-800 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-slate-500 font-medium"
                    placeholder={`Người chơi ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Betting Levels Input */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-300 mb-3 tracking-wide">Mức cược</label>
              <div className="grid grid-cols-2 gap-3">
                {bettingLevels.map((level, index) => (
                  <div key={index}>
                    <label className="block text-xs font-medium text-slate-400 mb-2 ml-1">Mức {index + 1}</label>
                    <input
                      type="number"
                      min="1"
                      value={level}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        const newLevels = [...bettingLevels];
                        newLevels[index] = value;
                        setBettingLevels(newLevels);
                      }}
                      className="w-full bg-slate-800/60 text-slate-100 rounded-xl px-4 py-3.5 border border-slate-700/50 focus:outline-none focus:border-emerald-500/50 focus:bg-slate-800 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-slate-500 font-semibold text-center"
                      placeholder={`Mức ${index + 1}`}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-3 p-3 bg-slate-800/30 rounded-xl border border-slate-700/30">
                <p className="text-xs text-slate-400 text-center">
                  Các nút cược: <span className="text-emerald-400 font-semibold">+{bettingLevels[0]}</span>, <span className="text-emerald-400 font-semibold">+{bettingLevels[1]}</span>, <span className="text-rose-400 font-semibold">-{bettingLevels[0]}</span>, <span className="text-rose-400 font-semibold">-{bettingLevels[1]}</span>
                </p>
              </div>
            </div>

            {/* Complete Button */}
            <button
              onClick={handleSetupComplete}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white py-4 rounded-xl font-bold text-base shadow-lg shadow-emerald-950/50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Trophy size={18} />
              Bắt đầu chơi
            </button>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900/95 to-slate-900/95 backdrop-blur-xl p-4 flex items-center justify-between border-b border-slate-800/60 shrink-0 sticky top-0 z-20 shadow-lg shadow-black/10">
        <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 p-2 rounded-xl shadow-lg shadow-emerald-950/20">
                <Trophy size={20} className="text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">Tiến Lên</h1>
        </div>
        <div className="flex gap-1.5 bg-slate-800/40 backdrop-blur-sm p-1 rounded-xl border border-slate-700/30">
            <button
                onClick={resetGame}
                className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all active:scale-95"
                title="Ván mới (Giữ tên)"
                aria-label="Ván mới"
            >
                <Eraser size={18} strokeWidth={2.5} />
            </button>
             <button
                onClick={resetAll}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all active:scale-95"
                title="Reset toàn bộ"
                aria-label="Reset toàn bộ"
            >
                <RefreshCcw size={18} strokeWidth={2.5} />
            </button>
        </div>
      </header>

      {/* Player Names Header - Sticky below main header */}
      <div className="bg-slate-900/95 backdrop-blur-xl py-3 px-2 grid grid-cols-[32px_1fr_1fr_1fr_1fr_32px] gap-2 sticky top-[65px] z-10 border-b border-slate-800/60 text-sm font-medium shrink-0 shadow-md shadow-black/5">
        <div className="flex items-center justify-center text-slate-500 text-[10px] font-bold uppercase tracking-wider">#</div>
        {players.map((player, i) => (
          <div key={i} className="min-w-0">
              <input
                type="text"
                value={player}
                onChange={(e) => handlePlayerNameChange(i, e.target.value)}
                className="w-full bg-slate-800/30 text-center text-emerald-100 placeholder-slate-500 focus:outline-none focus:bg-slate-800/60 focus:ring-2 focus:ring-emerald-500/30 rounded-lg py-2 transition-all truncate px-2 font-semibold text-sm border border-slate-700/30"
                placeholder={`P${i + 1}`}
              />
          </div>
        ))}
        <div></div>
      </div>

      {/* Scrollable Score Area */}
      <main className="flex-1 overflow-y-auto px-2 py-3 no-scrollbar">
        <div className="space-y-2.5">
          {rounds.map((round, roundIdx) => {
            // Calculate round sum to check for balance (should be 0)
            const roundSum = round.scores.reduce((sum: number, score) => sum + (typeof score === 'number' ? score : 0), 0);
            const hasEntries = round.scores.some(s => s !== '');
            const isBalanced = roundSum === 0;
            const showWarning = hasEntries && !isBalanced;

            return (
              <div key={round.id} className="animate-fadeIn">
                <div className="grid grid-cols-[32px_1fr_1fr_1fr_1fr_32px] gap-2 items-center bg-slate-900/30 rounded-xl p-2 border border-slate-800/30 hover:border-slate-700/50 transition-all">
                  <div className="flex items-center justify-center">
                      {showWarning ? (
                          <div className="text-rose-500 tooltip-container relative animate-pulse" title={`Tổng điểm chưa bằng 0 (Hiện tại: ${roundSum > 0 ? '+' : ''}${roundSum})`}>
                               <AlertCircle size={18} strokeWidth={2.5} />
                          </div>
                      ) : (
                          <span className="text-slate-500 text-xs font-bold font-mono bg-slate-800/50 px-2 py-1 rounded-lg">{roundIdx + 1}</span>
                      )}
                  </div>
                  {round.scores.map((score, playerIdx) => {
                    const isFocused = focusedInput?.roundIndex === roundIdx && focusedInput?.playerIndex === playerIdx;
                    return (
                      <div key={playerIdx} className="min-w-0">
                          <input
                            type="text"
                            inputMode="text"
                            value={score}
                            placeholder="-"
                            onChange={(e) => updateScore(roundIdx, playerIdx, e.target.value)}
                            onFocus={() => setFocusedInput({ roundIndex: roundIdx, playerIndex: playerIdx })}
                            className={`w-full bg-slate-800/50 text-center rounded-xl py-3 md:py-3.5 border-2 transition-all font-mono text-base md:text-lg font-semibold shadow-sm
                             ${typeof score === 'number' && score < 0 ? 'text-rose-400' : (score && Number(score) > 0 ? 'text-emerald-400' : 'text-slate-400')}
                             ${showWarning ? 'border-rose-500/30 focus:border-rose-500/60 focus:ring-2 focus:ring-rose-500/20' : 'border-slate-700/30 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20'}
                             ${isFocused ? 'ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-950/20' : ''}
                             focus:bg-slate-800/70 focus:outline-none hover:border-slate-600/50
                          `}
                          />
                      </div>
                    );
                  })}
                  <button
                    onClick={() => deleteRound(round.id)}
                    className="flex items-center justify-center text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg p-1.5 transition-all active:scale-90"
                    aria-label="Xóa ván"
                  >
                    <Trash2 size={16} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            );
          })}
           <div ref={roundsEndRef} className="h-px" />
        </div>

        {rounds.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-slate-500 gap-4">
                <div className="p-5 bg-gradient-to-br from-slate-900/50 to-slate-800/50 rounded-2xl border border-slate-800/50 shadow-lg">
                     <Trophy size={36} className="text-slate-600" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-medium text-slate-400">Chưa có ván nào. Bắt đầu thôi!</p>
            </div>
        )}
      </main>

      {/* Footer Totals & Actions */}
      <footer className="bg-gradient-to-t from-slate-950 to-slate-950 border-t border-slate-800/60 shrink-0 pb-safe shadow-2xl shadow-black/20">
          {/* Totals Row */}
         <div className="bg-slate-900/70 backdrop-blur-sm py-4 px-2 grid grid-cols-[32px_1fr_1fr_1fr_1fr_32px] gap-2 text-sm border-b border-slate-800/50">
            <div className="flex items-center justify-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase rotate-[-90deg] tracking-widest">Tổng</span>
            </div>
            {totals.map((total, i) => {
                 const isHighest = hasScores && total === maxScore;
                 const isLowest = hasScores && total === minScore;

                 return (
                  <div key={i} className={`min-w-0 flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-500 border-2
                    ${isHighest ? 'bg-emerald-500/15 border-emerald-500/30 shadow-lg shadow-emerald-950/30' : ''}
                    ${isLowest ? 'bg-rose-500/10 border-rose-500/20 shadow-lg shadow-rose-950/20' : ''}
                    ${!isHighest && !isLowest ? 'bg-slate-800/30 border-slate-700/30' : ''}
                  `}>
                      <span className={`font-mono text-lg md:text-xl font-bold
                        ${isHighest ? 'text-emerald-300' : ''}
                        ${isLowest ? 'text-rose-300' : ''}
                        ${!isHighest && !isLowest ? 'text-slate-200' : ''}
                      `}>
                          {total > 0 ? `+${total}` : total}
                      </span>
                  </div>
                );
            })}
             <div></div>
        </div>

        {/* Add Button */}
        <div className="p-4">
            <button
                onClick={addRound}
                className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white py-4 rounded-2xl font-bold text-base shadow-xl shadow-emerald-950/50 active:scale-[0.98] transition-all"
            >
                <Plus size={22} strokeWidth={3} />
                <span>Thêm ván mới</span>
            </button>
        </div>

        {/* Quick Betting Buttons */}
        <div className="px-4 pb-4">
          <div className="grid grid-cols-4 gap-2.5">
            <button
              onClick={() => handleBettingClick(bettingLevels[0])}
              className="bg-gradient-to-br from-emerald-600/20 to-emerald-600/10 hover:from-emerald-600/30 hover:to-emerald-600/20 text-emerald-300 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 border border-emerald-500/30 shadow-md shadow-emerald-950/20"
            >
              +{bettingLevels[0]}
            </button>
            <button
              onClick={() => handleBettingClick(bettingLevels[1])}
              className="bg-gradient-to-br from-emerald-600/20 to-emerald-600/10 hover:from-emerald-600/30 hover:to-emerald-600/20 text-emerald-300 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 border border-emerald-500/30 shadow-md shadow-emerald-950/20"
            >
              +{bettingLevels[1]}
            </button>
            <button
              onClick={() => handleBettingClick(-bettingLevels[0])}
              className="bg-gradient-to-br from-rose-600/20 to-rose-600/10 hover:from-rose-600/30 hover:to-rose-600/20 text-rose-300 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 border border-rose-500/30 shadow-md shadow-rose-950/20"
            >
              -{bettingLevels[0]}
            </button>
            <button
              onClick={() => handleBettingClick(-bettingLevels[1])}
              className="bg-gradient-to-br from-rose-600/20 to-rose-600/10 hover:from-rose-600/30 hover:to-rose-600/20 text-rose-300 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 border border-rose-500/30 shadow-md shadow-rose-950/20"
            >
              -{bettingLevels[1]}
            </button>
          </div>
          {focusedInput && (
            <div className="mt-3 p-2.5 bg-slate-800/40 rounded-xl border border-slate-700/30">
              <p className="text-xs text-slate-400 text-center font-medium">
                Đang chọn: <span className="text-emerald-400 font-semibold">Ván {focusedInput.roundIndex + 1}</span> - <span className="text-emerald-300">{players[focusedInput.playerIndex]}</span>
              </p>
            </div>
          )}
        </div>
      </footer>

      <style>{`
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
            animation: fadeIn 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        .animate-scaleIn {
            animation: scaleIn 0.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        /* Safe area padding for modern phones without home button */
        .pb-safe {
            padding-bottom: env(safe-area-inset-bottom, 16px);
        }
        /* Smooth scrollbar */
        .no-scrollbar::-webkit-scrollbar {
            width: 6px;
        }
        .no-scrollbar::-webkit-scrollbar-track {
            background: transparent;
        }
        .no-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.3);
            border-radius: 3px;
        }
        .no-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(148, 163, 184, 0.5);
        }
      `}</style>
    </div>
  );
};

export default App;
