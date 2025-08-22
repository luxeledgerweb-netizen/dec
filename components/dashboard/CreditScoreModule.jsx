
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";
import AddCreditScoreModal from "./AddCreditScoreModal";
import { useTileStyle } from '../utils/useTileStyle';

export default React.memo(function CreditScoreModule({ creditScores, onScoreAdded }) {
  const [isAddScoreModalOpen, setIsAddScoreModalOpen] = useState(false);
  const latestScore = creditScores.length > 0 ? creditScores[0] : null;
  const tileStyle = useTileStyle();

// --- Credit score gradient helpers ---
const CUTS = [300, 580, 670, 740, 800, 850]; // true FICO-ish cut points
const COLORS = ['#ef4444', '#f59e0b', '#8b5cf6', '#3b82f6', '#10b981']; // poor→excellent colors
const scoreToPct = (s) => ((s - 300) / (850 - 300)) * 100;

// Builds a smooth gradient (blends around the cut points)
function buildSmoothGradient(pad = 2) {
  // pad is the softness (in %) around each cut; increase to 2–3 for softer blends
  const stops = [];
  stops.push(`${COLORS[0]} 0%`);
  for (let i = 1; i < CUTS.length - 1; i++) {
    const p = scoreToPct(CUTS[i]);
    const prev = COLORS[i - 1];
    const next = COLORS[i];
    stops.push(`${prev} ${Math.max(0, p - pad)}%`);
    stops.push(`${next} ${Math.min(100, p + pad)}%`);
  }
  stops.push(`${COLORS[COLORS.length - 1]} 100%`);
  return `linear-gradient(to right, ${stops.join(', ')})`;
}


  const handleScoreAddedAndCloseModal = () => {
    onScoreAdded();
    setIsAddScoreModalOpen(false);
  }

  const getScoreColor = (score) => {
    if (!score) return { color: "#64748b", label: "N/A", bg: "bg-gray-50 dark:bg-gray-900/20" };
    if (score >= 800) return { color: "#10b981", label: "Excellent", bg: "bg-green-50 dark:bg-green-900/20" };
    if (score >= 740) return { color: "#3b82f6", label: "Very Good", bg: "bg-blue-50 dark:bg-blue-900/20" };
    if (score >= 670) return { color: "#8b5cf6", label: "Good", bg: "bg-purple-50 dark:bg-purple-900/20" };
    if (score >= 580) return { color: "#f59e0b", label: "Fair", bg: "bg-yellow-50 dark:bg-yellow-900/20" };
    return { color: "#ef4444", label: "Poor", bg: "bg-red-50 dark:bg-red-900/20" };
  };


  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString.replace(/-/g, '/'));
    return date.toLocaleDateString();
  };

  return (
    <>
      <Card style={tileStyle} className="h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-purple-500 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-violet-600 opacity-0 group-hover:opacity-10 dark:group-hover:opacity-30 transition-opacity duration-500"></div>
        <div className="relative z-10">
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-purple-600 hidden sm:block" />
                <div>
                  <CardTitle className="text-xl font-bold text-purple-600">Credit Score</CardTitle>
                  <CardDescription>Your latest credit score and history</CardDescription>
                </div>
            </div>
            <Button onClick={() => setIsAddScoreModalOpen(true)} className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white">Update Score</Button>
          </CardHeader>
          <CardContent>
            {latestScore ? (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2" style={{ color: getScoreColor(latestScore.score).color }}>
                    {latestScore.score}
                  </div>
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getScoreColor(latestScore.score).bg}`} style={{ color: getScoreColor(latestScore.score).color }}>
                    {getScoreColor(latestScore.score).label}
                  </div>
                </div>

                <div className="space-y-2">
                  {/* BAR (gradient) */}
<div
  className="relative h-3 rounded-full overflow-hidden"
  style={{ background: buildSmoothGradient() }}
>
  {/* optional shade to the right of your score (visual focus) */}
  {latestScore && (
    <div
      className="absolute top-0 bottom-0 right-0"
      style={{
        left: `calc(${scoreToPct(latestScore.score)}%)`,
        background: 'rgba(0,0,0,0.06)'
      }}
    />
  )}

  {/* tick marks at the real cut points */}
  {CUTS.slice(1, -1).map((c) => (
    <div
      key={c}
      className="absolute top-0 h-full w-[2px] opacity-40"
      style={{
        left: `calc(${scoreToPct(c)}% - 1px)`,
        background: 'rgba(255,255,255,0.85)'
      }}
    />
  ))}

  {/* centered marker dot for current score (INSIDE the bar) */}
  {latestScore && (
    <div
      className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
      style={{ left: `calc(${scoreToPct(latestScore.score)}%)` }}
      aria-hidden="true"
    >
      <div
        style={{
          width: 8,   // <= was 10
          height: 8,  // <= was 10
          borderWidth: 2,
          borderStyle: 'solid',
          borderColor: '#fff',
          borderRadius: '9999px',
          backgroundColor: getScoreColor(latestScore.score).color,
          boxShadow: '0 0 0 1px rgba(0,0,0,.08)',
        }}
        title={`${latestScore.score}`}
      />
    </div>
  )}
</div>  {/* end bar */}

{/* COMPACT legend for phones (just endpoints) */}
<div className="mt-1 text-[10px] text-[var(--text-secondary)] flex justify-between sm:hidden">
  <span>300</span>
  <span>850</span>
</div>

{/* FULL legend for ≥sm screens */}
<div className="relative h-5 text-[10px] sm:text-xs text-[var(--text-secondary)] mt-1 hidden sm:block">
  {[
    { pos: 300, text: '300', anchor: 'start' },
    { pos: (300 + 580) / 2, text: 'Poor' },
    { pos: (580 + 670) / 2, text: 'Fair' },
    { pos: (670 + 740) / 2, text: 'Good' },
    { pos: (740 + 800) / 2, text: 'Very Good' },
    { pos: (800 + 850) / 2, text: 'Excellent' },
    { pos: 850, text: '850', anchor: 'end' },
  ].map(({ pos, text, anchor = 'center' }) => (
    <span
      key={text}
      className="absolute whitespace-nowrap"
      style={{
        left: `calc(${scoreToPct(pos)}%)`,
        transform:
          anchor === 'start'
            ? 'translateX(0)'
            : anchor === 'end'
            ? 'translateX(-100%)'
            : 'translateX(-50%)',
      }}
    >
      {text}
    </span>
  ))}
</div>

                  <div className="text-center text-xs text-[var(--text-secondary)]">
                    Last updated: {formatDate(latestScore.date_recorded)}
                  </div>
                </div>
                
                {creditScores.length > 1 && (
                  <div className="pt-4 border-t border-[var(--border-subtle)]">
                    <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">
                      Recent Updates
                    </h4>
                    <div className="space-y-2">
                      {creditScores.slice(0, 3).map((score, index) => (
                        <div key={score.id} className="flex items-center justify-between text-sm">
                          <span className="text-[var(--text-secondary)]">
                            {formatDate(score.date_recorded)}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium" style={{ color: getScoreColor(score.score).color }}>
                              {score.score}
                            </span>
                            {index === 0 && creditScores.length > 1 && (
                              <span className={`text-xs ${
                                score.score > creditScores[1].score ? 'text-green-600' : 
                                score.score < creditScores[1].score ? 'text-red-600' : 'text-gray-500'
                              }`}>
                                {score.score > creditScores[1].score ? '▲' : 
                                score.score < creditScores[1].score ? '▼' : '–'}
                                {Math.abs(score.score - creditScores[1].score)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Credit Score Yet</h3>
                <p className="text-[var(--text-secondary)] mb-4">
                  Add your first credit score to start tracking your credit health
                </p>
              </div>
            )}
          </CardContent>
        </div>
      </Card>
      <AddCreditScoreModal 
        isOpen={isAddScoreModalOpen}
        onClose={() => setIsAddScoreModalOpen(false)}
        onScoreAdded={handleScoreAddedAndCloseModal}
      />
    </>
  );
});
