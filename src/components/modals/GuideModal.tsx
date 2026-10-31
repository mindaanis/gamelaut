import React from 'react';

interface GuideModalProps {
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-[#000c1a]/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 md:p-8 rounded-3xl bg-[#041d3e] border-2 border-[#39CCCC]/40 shadow-2xl flex flex-col gap-4 text-white my-auto">
        
        <div className="flex items-center justify-between border-b border-white/15 pb-3">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span>❓</span> Petunjuk Cara Bermain & Navigasi
          </h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-red-500 flex items-center justify-center text-lg transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3.5 text-xs md:text-sm text-[#e0f0ff] leading-relaxed">
          <div className="bg-[#0074D9]/25 border border-[#39CCCC]/50 rounded-2xl p-4">
            <h4 className="text-sm font-bold text-[#FFDC00] mb-1">🎮 Kontrol Pergerakan:</h4>
            <p>• <strong>Desktop:</strong> Gunakan tombol panah keyboard (Arrow Keys) atau tombol <strong>W, A, S, D</strong> untuk berenang bebas menjelajahi samudra 3000x2000 piksel.</p>
            <p className="mt-1">• <strong>Mobile:</strong> Sentuh D-Pad di sudut bawah layar untuk berenang ke segala arah.</p>
          </div>

          <div className="bg-[#00142e]/80 border border-[#39CCCC]/35 rounded-2xl p-4">
            <h4 className="text-sm font-bold text-[#FFDC00] mb-1">🫧 Gelembung Soal & Radar:</h4>
            <p>• Gelembung soal berada pada posisi tetap (stasioner) di tempat-tempat penting setiap zona.</p>
            <p className="mt-1">• Perhatikan <strong>Radar Samudra (Mini-map)</strong> di pojok kanan atas untuk memandu arah ke gelembung soal terdekat.</p>
            <p className="mt-1">• Sentuh gelembung dengan ikanmu untuk membuka soal pecahan dan pilih jawaban yang tepat.</p>
          </div>

          <div className="bg-[#00142e]/80 border border-[#39CCCC]/35 rounded-2xl p-4">
            <h4 className="text-sm font-bold text-[#FFDC00] mb-1">🦪 Mutiara & Ubur-Ubur:</h4>
            <p>• <strong>🦪 Mutiara:</strong> Ambil kerang mutiara untuk mendapatkan bonus +10 poin!</p>
            <p className="mt-1">• <strong>🪼 Ubur-ubur Bergerak:</strong> Ubur-ubur berenang berpatroli di perairan. Jika tertabrak, ikanmu akan kesetrum dan kecepatannya berkurang 60% selama 5 detik!</p>
          </div>

          <div className="bg-[#00142e]/80 border border-[#39CCCC]/35 rounded-2xl p-4">
            <h4 className="text-sm font-bold text-[#FFDC00] mb-1">⚔️ Single vs Multiplayer Antar-Device:</h4>
            <p>• <strong>Single Player:</strong> Menyelesaikan 5 soal per level secara mandiri.</p>
            <p className="mt-1">• <strong>Multiplayer:</strong> 2 pemain di perangkat berbeda bergabung via kode Room, berlomba menjawab 15 soal secara bersamaan. Pemain dengan jawaban benar terbanyak dan waktu tercepat keluar sebagai pemenang!</p>
          </div>
        </div>

      </div>
    </div>
  );
};
