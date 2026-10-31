import React, { useState } from 'react';
import { Question, DEFAULT_QUESTIONS, exportQuestionsToCSV, parseQuestionsCSV } from '../../game/logic.ts';
import { seaAudio } from '../../game/audio.ts';

interface CrudModalProps {
  questions: Question[];
  onSaveQuestions: (questions: Question[]) => void;
  onClose: () => void;
}

export const CrudModal: React.FC<CrudModalProps> = ({
  questions,
  onSaveQuestions,
  onClose
}) => {
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // Form State
  const [formLevel, setFormLevel] = useState<number>(1);
  const [formText, setFormText] = useState('');
  const [formOptA, setFormOptA] = useState('');
  const [formOptB, setFormOptB] = useState('');
  const [formOptC, setFormOptC] = useState('');
  const [formOptD, setFormOptD] = useState('');
  const [formAnswer, setFormAnswer] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [formExplanation, setFormExplanation] = useState('');

  const showFeedback = (text: string, isError = false) => {
    setFeedbackMsg({ text, isError });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const openAddForm = () => {
    seaAudio.klik();
    setEditingId(null);
    setFormLevel(1);
    setFormText('');
    setFormOptA('');
    setFormOptB('');
    setFormOptC('');
    setFormOptD('');
    setFormAnswer('A');
    setFormExplanation('');
    setFormOpen(true);
  };

  const openEditForm = (q: Question) => {
    seaAudio.klik();
    setEditingId(q.id);
    setFormLevel(q.level);
    setFormText(q.question);
    setFormOptA(q.optionA);
    setFormOptB(q.optionB);
    setFormOptC(q.optionC);
    setFormOptD(q.optionD);
    setFormAnswer(q.answer);
    setFormExplanation(q.explanation || '');
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    seaAudio.klik();
    const updated = questions.filter(q => q.id !== id);
    onSaveQuestions(updated);
    showFeedback(`Soal ${id} berhasil dihapus.`);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formText.trim() || !formOptA.trim() || !formOptB.trim() || !formOptC.trim() || !formOptD.trim()) {
      showFeedback('Semua kolom pertanyaan dan opsi jawaban wajib diisi!', true);
      seaAudio.salahkan();
      return;
    }

    const qId = editingId || `Q-${Date.now()}`;
    const newQ: Question = {
      id: qId,
      level: formLevel,
      question: formText.trim(),
      optionA: formOptA.trim(),
      optionB: formOptB.trim(),
      optionC: formOptC.trim(),
      optionD: formOptD.trim(),
      answer: formAnswer,
      explanation: formExplanation.trim()
    };

    let updated: Question[];
    if (editingId) {
      updated = questions.map(q => q.id === editingId ? newQ : q);
      showFeedback(`Soal ${editingId} berhasil diperbarui.`);
    } else {
      updated = [newQ, ...questions];
      showFeedback(`Soal baru berhasil ditambahkan ke Level ${formLevel}.`);
    }

    onSaveQuestions(updated);
    setFormOpen(false);
    seaAudio.benarkan();
  };

  // CSV Export
  const handleExportCSV = () => {
    seaAudio.klik();
    const csv = exportQuestionsToCSV(questions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bank_soal_pecahan_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showFeedback('Berhasil mengekspor bank soal ke file CSV!');
  };

  // CSV Import
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const res = parseQuestionsCSV(text);
      if (res.error) {
        showFeedback(res.error, true);
        seaAudio.salahkan();
      } else {
        onSaveQuestions(res.questions);
        showFeedback(`Berhasil mengimpor ${res.questions.length} butir soal pecahan!`);
        seaAudio.levelUp();
      }
    };
    reader.readAsText(file);
  };

  // Reset to default 45 questions
  const handleResetDefault = () => {
    seaAudio.klik();
    onSaveQuestions([...DEFAULT_QUESTIONS]);
    setConfirmReset(false);
    showFeedback('Bank soal berhasil dikembalikan ke 45 soal kurikulum bawaan.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-[#000c1a]/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 md:p-8 rounded-3xl bg-[#041d3e] border-2 border-[#39CCCC]/40 shadow-2xl flex flex-col gap-4 text-white my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/15 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">📚</span>
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                <span>Kelola Bank Soal Pecahan</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-[#FFDC00] border border-amber-400/40">
                  Akses Guru
                </span>
              </h3>
              <p className="text-xs text-[#b8d4f0]">
                Total {questions.length} butir soal matematika SD (Fase B/C) tersimpan
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              seaAudio.klik();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-red-500 flex items-center justify-center text-lg transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Feedback message banner */}
        {feedbackMsg && (
          <div
            className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
              feedbackMsg.isError
                ? 'bg-rose-600/30 border border-rose-500 text-rose-200'
                : 'bg-emerald-600/30 border border-emerald-500 text-emerald-200'
            }`}
          >
            <span>{feedbackMsg.isError ? '⚠️' : '✅'}</span>
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openAddForm}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FFDC00] to-[#ff9800] text-[#00172e] text-xs font-black shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>➕</span>
              <span>Tambah Soal Baru</span>
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-4 py-2 rounded-xl bg-[#39CCCC] text-[#00172e] text-xs font-bold shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>📥</span>
              <span>Export CSV</span>
            </button>
            <label className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5">
              <span>📤</span>
              <span>Import CSV</span>
              <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
            </label>
          </div>

          <div>
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white/80 text-xs font-bold transition-all cursor-pointer"
              >
                🔄 Reset Default (45 Soal)
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-red-950/80 p-1 px-2 rounded-xl border border-red-500">
                <span className="text-[11px] text-red-200">Yakin reset ke 45 soal awal?</span>
                <button
                  type="button"
                  onClick={handleResetDefault}
                  className="px-2 py-1 rounded bg-red-600 text-white text-[11px] font-bold cursor-pointer"
                >
                  Ya, Reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="px-2 py-1 rounded bg-white/10 text-white text-[11px] font-bold cursor-pointer"
                >
                  Batal
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Table of questions */}
        <div className="w-full overflow-x-auto max-h-[420px] rounded-2xl border border-[#39CCCC]/30 bg-[#001024]/85">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#002b5e] text-[#FFDC00] sticky top-0 font-bold border-b border-[#39CCCC]/40 z-10">
              <tr>
                <th className="p-3 w-16">ID</th>
                <th className="p-3 w-24">Level</th>
                <th className="p-3">Pertanyaan Pecahan</th>
                <th className="p-3 w-16 text-center">Kunci</th>
                <th className="p-3 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {questions.map((q) => (
                <tr key={q.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-3 font-mono text-[#b8d4f0]">{q.id}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFDC00]/20 text-[#FFDC00] border border-[#FFDC00]/40">
                      Zona {q.level}
                    </span>
                  </td>
                  <td className="p-3 max-w-sm truncate text-white">{q.question}</td>
                  <td className="p-3 text-center font-extrabold text-[#2ECC40]">{q.answer}</td>
                  <td className="p-3 text-center">
                    <div className="flex gap-1.5 justify-center">
                      <button
                        type="button"
                        onClick={() => openEditForm(q)}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-[#39CCCC] hover:text-[#00172e] text-[11px] font-bold cursor-pointer transition-colors"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(q.id)}
                        className="px-2.5 py-1 rounded-lg bg-rose-600/70 hover:bg-rose-600 text-white text-[11px] font-bold cursor-pointer transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal Sub-Form for Add / Edit */}
        {formOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
            <form onSubmit={handleSaveForm} className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-3xl bg-[#041d3e] border-2 border-[#FFDC00] shadow-2xl flex flex-col gap-3 sm:gap-3.5 text-white my-auto">
              <h4 className="text-base font-bold text-[#FFDC00]">
                {editingId ? `✏️ Edit Soal (${editingId})` : '➕ Tambah Soal Pecahan Baru'}
              </h4>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#7FDBFF]">Level / Zona Pembelajaran:</label>
                <select
                  value={formLevel}
                  onChange={(e) => setFormLevel(Number(e.target.value))}
                  className="px-3 py-2.5 rounded-xl bg-[#000f21] border border-white/20 text-xs text-white"
                >
                  <option value={1}>Zona 1: Terumbu Karang Dangkal (TP 1: Membandingkan & Mengurutkan Pecahan)</option>
                  <option value={2}>Zona 2: Kapal Karam Misterius (TP 2: Pecahan Senilai Gambar & Simbol)</option>
                  <option value={3}>Zona 3: Palung Mariana (TP 3: Desimal & Persen)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#7FDBFF]">Teks Pertanyaan:</label>
                <textarea
                  value={formText}
                  rows={2}
                  onChange={(e) => setFormText(e.target.value)}
                  placeholder="Ketik soal pecahan di sini..."
                  className="px-3 py-2.5 rounded-xl bg-[#000f21] border border-white/20 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={formOptA}
                  onChange={(e) => setFormOptA(e.target.value)}
                  placeholder="Opsi Jawaban A"
                  className="px-3 py-2 rounded-xl bg-[#000f21] border border-white/20 text-xs text-white"
                />
                <input
                  type="text"
                  value={formOptB}
                  onChange={(e) => setFormOptB(e.target.value)}
                  placeholder="Opsi Jawaban B"
                  className="px-3 py-2 rounded-xl bg-[#000f21] border border-white/20 text-xs text-white"
                />
                <input
                  type="text"
                  value={formOptC}
                  onChange={(e) => setFormOptC(e.target.value)}
                  placeholder="Opsi Jawaban C"
                  className="px-3 py-2 rounded-xl bg-[#000f21] border border-white/20 text-xs text-white"
                />
                <input
                  type="text"
                  value={formOptD}
                  onChange={(e) => setFormOptD(e.target.value)}
                  placeholder="Opsi Jawaban D"
                  className="px-3 py-2 rounded-xl bg-[#000f21] border border-white/20 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#7FDBFF]">Kunci Jawaban Benar:</label>
                  <select
                    value={formAnswer}
                    onChange={(e) => setFormAnswer(e.target.value as 'A' | 'B' | 'C' | 'D')}
                    className="px-3 py-2 rounded-xl bg-[#000f21] border border-white/20 text-xs text-white font-bold"
                  >
                    <option value="A">Kunci: Opsi A</option>
                    <option value="B">Kunci: Opsi B</option>
                    <option value="C">Kunci: Opsi C</option>
                    <option value="D">Kunci: Opsi D</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#7FDBFF]">Pembahasan Singkat:</label>
                  <input
                    type="text"
                    value={formExplanation}
                    onChange={(e) => setFormExplanation(e.target.value)}
                    placeholder="Cara kerja / penjelasan..."
                    className="px-3 py-2 rounded-xl bg-[#000f21] border border-white/20 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 mt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl font-bold text-xs bg-[#FFDC00] text-[#00172e] shadow hover:brightness-110 cursor-pointer"
                >
                  💾 Simpan Butir Soal
                </button>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/20 border border-white/20 text-white cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
