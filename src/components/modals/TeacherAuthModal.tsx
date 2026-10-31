import React, { useState } from 'react';
import { seaAudio } from '../../game/audio.ts';

interface TeacherAuthModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

export const TeacherAuthModal: React.FC<TeacherAuthModalProps> = ({ onSuccess, onClose }) => {
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = password.trim();
    const customPwd = localStorage.getItem('pa_teacher_pwd');

    // Valid passwords: custom or standard presets for PGRI & Wonogiri teachers
    const validPasswords = [
      'GURUPGRI2026',
      'guru2026',
      'PGRI81',
      'pgri81',
      'JATIROTO2026',
      'jatiroto2026',
      'WONOGIRI',
      'wonogiri'
    ];

    if (customPwd) {
      validPasswords.push(customPwd);
    }

    if (validPasswords.includes(clean) || (customPwd && clean === customPwd)) {
      seaAudio.levelUp();
      onSuccess();
    } else {
      seaAudio.salahkan();
      setErrorMsg('Kata sandi salah! Khusus akses Bapak/Ibu Guru. Cek petunjuk di bawah.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-[#000c1a]/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto p-4 sm:p-6 md:p-8 rounded-3xl bg-[#041d3e] border-2 border-[#FFDC00] shadow-[0_20px_60px_rgba(0,0,0,0.85)] flex flex-col gap-3.5 sm:gap-4 text-white text-center my-auto">
        
        <div className="flex justify-center -mt-2">
          <div className="w-16 h-16 rounded-2xl bg-[#FFDC00]/20 border-2 border-[#FFDC00] flex items-center justify-center text-3xl shadow-lg">
            🔐
          </div>
        </div>

        <div>
          <h3 className="text-xl font-black text-white">
            Akses Khusus Guru & Pembina
          </h3>
          <p className="text-xs text-[#b8d4f0] mt-1">
            Pengelolaan Bank Soal, penambahan butir soal, dan Import/Export CSV dilindungi kata sandi guru.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-600/30 border border-rose-500 text-xs text-rose-200 font-bold flex items-center justify-center gap-1.5 animate-bounce">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 mt-1">
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrorMsg(null);
              }}
              placeholder="Masukkan Kata Sandi Guru..."
              autoFocus
              className="w-full px-4 py-3.5 pr-11 rounded-xl bg-[#000f21] border border-[#39CCCC]/50 text-white font-mono text-center tracking-wider text-sm outline-none focus:border-[#FFDC00] transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-sm cursor-pointer"
              title="Lihat / Sembunyikan"
            >
              {showPwd ? '👁️' : '🙈'}
            </button>
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-[11px] text-[#99ccff] text-left leading-relaxed">
            <strong className="text-[#FFDC00] block mb-0.5">💡 Petunjuk Akses Guru:</strong>
            Password default lomba/sekolah: <code className="text-white font-mono bg-white/10 px-1 py-0.5 rounded">GURUPGRI2026</code> atau <code className="text-white font-mono bg-white/10 px-1 py-0.5 rounded">PGRI81</code>.
          </div>

          <div className="flex gap-2.5 mt-1">
            <button
              type="submit"
              className="flex-1 py-3 px-4 rounded-xl font-black text-xs md:text-sm bg-gradient-to-r from-[#FFDC00] to-[#ff9800] text-[#00172e] shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              🔓 Masuk Bank Soal
            </button>
            <button
              type="button"
              onClick={() => {
                seaAudio.klik();
                onClose();
              }}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-xs md:text-sm bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all cursor-pointer"
            >
              Batal
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
