"use client";

import React, { useState, useEffect } from 'react';
import { 
  RPMFormData, 
  PedagogicalPractice, 
  GraduateDimension, 
  RPMState, 
  SD_SUBJECTS 
} from './types';
import { 
  generateRPMContent, 
  generateRPMImage, 
  pregenerateCPandTP, 
  getAITopics 
} from './services/geminiService';
import { 
  Printer, 
  Loader2, 
  BookOpen, 
  Sparkles,
  FileText,
  Download,
  CheckCircle2,
  School,
  UserCircle,
  Layout,
  ClipboardCheck,
  Zap,
  FileDown
} from 'lucide-react';

const TEACHERS = [
  "Nasriwanto, S.Pd",
  "Raynaldi, S.Pd",
  "Randi Maikel, S.Or",
  "Nilam Melani Putri, S.Pd",
  "Lelis Mawati, S.Pd",
  "Raflinda Roza, S.Pd",
  "Sarwenda, S.PdI"
];

const SD_GRADES = [
  "Kelas 1",
  "Kelas 2",
  "Kelas 3",
  "Kelas 4",
  "Kelas 5",
  "Kelas 6"
];

const INITIAL_FORM: RPMFormData = {
  schoolName: "SDN 14 Andopan",
  teacherName: TEACHERS[0],
  teacherNip: "19XXXXXXXXXXXXX",
  principalName: "Drs. H. Ahmad",
  principalNip: "19XXXXXXXXXXXXX",
  grade: "Kelas 4",
  academicYear: "2025/2026",
  subject: "Bahasa Indonesia",
  cp: "",
  tp: "",
  material: "",
  meetingCount: 2,
  duration: "2 x 35 menit",
  pedagogy: [],
  dimensions: []
};

declare const html2pdf: any;

export default function App() {
  const [state, setState] = useState<RPMState>({
    formData: INITIAL_FORM,
    generatedContent: null,
    generatedImageUrl: null,
    isGenerating: false,
    isPrefilling: false,
    error: null
  });

  const [aiTopics, setAiTopics] = useState<string[]>([]);
  const [isFetchingTopics, setIsFetchingTopics] = useState(false);

  // Fetch topics only as background info
  useEffect(() => {
    const fetchTopics = async () => {
      setIsFetchingTopics(true);
      try {
        const topics = await getAITopics(state.formData.subject, state.formData.grade);
        setAiTopics(topics);
      } catch (err) {
        setAiTopics([]);
      } finally {
        setIsFetchingTopics(false);
      }
    };
    fetchTopics();
  }, [state.formData.subject, state.formData.grade]);

  // AI Assistant logic: Sugget CP/TP when material is typed
  useEffect(() => {
    const timer = setTimeout(() => {
      const triggerPrefill = async () => {
        // Only prefill CP/TP if the user has typed something and fields are empty
        if (state.formData.material && state.formData.material.length > 5 && state.formData.subject && (!state.formData.cp || !state.formData.tp)) {
          setState(prev => ({ ...prev, isPrefilling: true }));
          try {
            const result = await pregenerateCPandTP(state.formData.subject, state.formData.material, state.formData.grade);
            
            setState(prev => ({
              ...prev,
              formData: {
                ...prev.formData,
                // Only suggest CP and TP if currently empty, respect manual input
                cp: prev.formData.cp || result.cp,
                tp: prev.formData.tp || result.tp.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n"),
                // Dimensions and Pedagogy are now strictly manual as requested
                meetingCount: prev.formData.meetingCount === 2 ? result.suggestedMeetings || 2 : prev.formData.meetingCount
              },
              isPrefilling: false
            }));
          } catch (err) {
            setState(prev => ({ ...prev, isPrefilling: false }));
          }
        }
      };
      triggerPrefill();
    }, 1200);

    return () => clearTimeout(timer);
  }, [state.formData.material, state.formData.subject, state.formData.grade]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setState(prev => ({
      ...prev,
      formData: { ...prev.formData, [name]: (name === 'meetingCount' ? parseInt(value) || 1 : value) }
    }));
  };

  const handleMultiSelect = (name: 'pedagogy' | 'dimensions', value: any) => {
    setState(prev => {
      const current = prev.formData[name] as any[];
      const next = current.includes(value) 
        ? current.filter(item => item !== value)
        : [...current, value];
      return {
        ...prev,
        formData: { ...prev.formData, [name]: next }
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState(prev => ({ ...prev, isGenerating: true, error: null }));
    
    try {
      const [content, imageUrl] = await Promise.all([
        generateRPMContent(state.formData),
        generateRPMImage(state.formData.material)
      ]);
      
      setState(prev => ({
        ...prev,
        generatedContent: content,
        generatedImageUrl: imageUrl,
        isGenerating: false
      }));
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: "Gagal menghasilkan RPM. Silakan periksa koneksi atau API Key."
      }));
    }
  };

  const handleDownloadWord = () => {
    const content = document.getElementById('rpm-print-area')?.innerHTML;
    if (!content) return;
    
    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>RPM 2025 - ${state.formData.subject}</title>
        <style>
          @page { size: 210mm 330mm; margin: 10mm; }
          body { font-family: 'Times New Roman', serif; font-size: 10pt; line-height: 1.0; }
          table { border-collapse: collapse; width: 100%; border: 1pt solid black; margin-bottom: 10pt; }
          td, th { border: 1pt solid black; padding: 4pt; vertical-align: top; text-align: justify; font-size: 10pt; }
          .table-header-pink { background-color: #fce4ec; font-weight: bold; text-align: center; }
          .font-bold { font-weight: bold; }
          .underline { text-decoration: underline; }
          .uppercase { text-transform: uppercase; }
          .whitespace-pre-line { white-space: pre-line; }
          .page-break { page-break-before: always; }
        </style>
      </head>
      <body>${content}</body>
      </html>
    `;
    
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `RPM_2025_${state.formData.subject}_${state.formData.material.replace(/\s+/g, '_')}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById('rpm-print-area');
    if (!element) return;
    const opt = {
      margin: 10,
      filename: `RPM_2025_${state.formData.subject}_${state.formData.material.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: [210, 330], orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen pb-12 bg-slate-50">
      <header className="bg-indigo-900 text-white py-4 px-4 no-print shadow-2xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-white/10 p-2 rounded-lg">
              <Sparkles className="text-yellow-400" />
            </div>
            <div>
              <h1 className="text-xl font-black italic tracking-tighter leading-none">GENERATOR RPM</h1>
              <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mt-1">Kurikulum Merdeka Versi 2025</p>
            </div>
          </div>
          <div className="marquee-container flex-1 bg-black/30 rounded-full py-1.5 border border-white/10">
            <div className="animate-marquee inline-block">
              <span className="text-[18px] font-bold text-yellow-300 drop-shadow-sm px-6">
                Created NASRIWANTO, S.Pd • SDN 14 Andopan • TP 2025/2026 • Kurikulum Merdeka Terupdate 2025 • Pelatihan Pembelajaran Mendalam
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8 flex flex-col lg:flex-row gap-8">
        <section className="flex-1 no-print">
          <div className="mb-4 marquee-container bg-red-600 rounded-xl py-2 border-2 border-white shadow-lg overflow-hidden">
            <div className="animate-marquee inline-block">
              <span className="text-sm font-black text-white uppercase px-10 italic">
                okok sabatang, adm siap....nan ibuk-ibuk walid bulie isok okok lo sambie kojo
              </span>
            </div>
          </div>
          
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
            <div className="bg-emerald-700 px-8 py-6 shadow-inner">
              <h2 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
                <FileText className="text-emerald-200" size={24} />
                Perencanaan Pembelajaran Mendalam
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-10">
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-emerald-700 font-black uppercase text-xs tracking-widest border-l-4 border-emerald-600 pl-3">
                  <School size={16} />
                  <span>01. Identitas Pembelajaran</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">Satuan Pendidikan</label>
                    <input readOnly value={state.formData.schoolName} className="w-full px-5 py-3 border-2 border-slate-100 rounded-2xl bg-slate-50 font-bold text-slate-900" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">Mata Pelajaran *</label>
                    <select name="subject" value={state.formData.subject} onChange={handleInputChange} className="w-full px-5 py-3 border-2 border-emerald-50 rounded-2xl bg-white text-slate-900 font-bold focus:ring-4 focus:ring-emerald-100 outline-none transition-all">
                      {SD_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">Kelas (Semester 2)</label>
                    <select name="grade" value={state.formData.grade} onChange={handleInputChange} className="w-full px-5 py-3 border-2 border-emerald-50 rounded-2xl bg-white text-slate-900 font-bold focus:ring-4 focus:ring-emerald-100 outline-none transition-all">
                      {SD_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">Tahun Pelajaran</label>
                    <input readOnly value={state.formData.academicYear} className="w-full px-5 py-3 border-2 border-slate-100 rounded-2xl bg-slate-50 font-bold text-slate-900" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">Durasi Pertemuan</label>
                    <input name="duration" value={state.formData.duration} onChange={handleInputChange} className="w-full px-5 py-3 border-2 border-emerald-50 rounded-2xl bg-white text-slate-900 font-bold" />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-2 text-emerald-700 font-black uppercase text-xs tracking-widest border-l-4 border-emerald-600 pl-3">
                  <Layout size={16} />
                  <span>02. Kurikulum & Desain</span>
                </div>
                <div className="p-6 bg-slate-50/50 rounded-3xl border border-slate-200 space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-emerald-900 mb-2 uppercase tracking-wider flex items-center gap-2">
                      Topik Kurikulum (Tulis Manual) *
                      {(isFetchingTopics || state.isPrefilling) && <Loader2 size={14} className="animate-spin text-emerald-600" />}
                    </label>
                    <input 
                      type="text"
                      name="material" 
                      value={state.formData.material} 
                      onChange={handleInputChange} 
                      placeholder="Contoh: Perkembangbiakan Hewan, Unsur Intrinsik Puisi..."
                      autoComplete="off"
                      className="w-full px-5 py-3.5 border-2 border-emerald-100 rounded-2xl bg-white text-slate-900 font-black focus:border-emerald-500 outline-none shadow-sm transition-all"
                    />
                    <p className="mt-2 text-[9px] text-slate-500 italic">* Tuliskan topik atau bab yang ingin Anda ajarkan secara manual di atas.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">Capaian Pembelajaran (CP) - Tulis Manual</label>
                      <textarea 
                        name="cp"
                        value={state.formData.cp} 
                        onChange={handleInputChange}
                        rows={3} 
                        placeholder="Tuliskan atau tempelkan Capaian Pembelajaran (CP) di sini..."
                        className="w-full px-5 py-3 border-2 border-emerald-50 rounded-2xl bg-white text-slate-800 text-[11px] font-medium leading-relaxed focus:border-emerald-500 outline-none shadow-inner" 
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">Tujuan Pembelajaran (TP) - Tulis Manual</label>
                      <textarea 
                        name="tp" 
                        value={state.formData.tp} 
                        onChange={handleInputChange} 
                        rows={3} 
                        placeholder="Tuliskan Tujuan Pembelajaran di sini..."
                        className="w-full px-5 py-3 border-2 border-emerald-50 rounded-2xl bg-white text-slate-900 text-xs font-bold leading-relaxed" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-3 uppercase tracking-wider flex items-center gap-2">
                    Praktik Pedagogis (Pilih Manual) *
                    {state.isPrefilling && <Zap size={14} className="text-emerald-600 animate-pulse fill-emerald-100" />}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(PedagogicalPractice).map(p => (
                      <button type="button" key={p} onClick={() => handleMultiSelect('pedagogy', p)} className={`px-4 py-2.5 rounded-xl text-[10px] font-black border-2 transition-all duration-300 ${state.formData.pedagogy.includes(p) ? 'bg-emerald-700 text-white border-emerald-700 shadow-lg scale-105' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50'}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[9px] text-slate-400 italic">* Klik pada praktik pedagogis yang ingin Anda terapkan (Bisa pilih lebih dari satu).</p>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-wider flex items-center gap-2">
                    Dimensi Profil Lulusan (Pilih Manual) *
                    {state.isPrefilling && <Zap size={14} className="text-emerald-600 animate-pulse fill-emerald-100" />}
                  </label>
                  <p className="text-[9px] text-slate-400 mb-3 italic">Pilih minimal 3 dimensi yang akan dikembangkan dalam topik ini.</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(GraduateDimension).map(d => (
                      <button type="button" key={d} onClick={() => handleMultiSelect('dimensions', d)} className={`px-4 py-2.5 rounded-xl text-[10px] font-black border-2 transition-all duration-300 ${state.formData.dimensions.includes(d) ? 'bg-emerald-700 text-white border-emerald-700 shadow-lg scale-105' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50'}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-2 text-emerald-700 font-black uppercase text-xs tracking-widest border-l-4 border-emerald-600 pl-3">
                  <UserCircle size={16} />
                  <span>03. Data Penandatangan</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">Nama Guru Kelas *</label>
                    <select name="teacherName" value={state.formData.teacherName} onChange={handleInputChange} className="w-full px-5 py-3 border-2 border-emerald-50 rounded-2xl bg-white text-slate-900 font-bold">
                      {TEACHERS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">NIP Guru</label>
                    <input name="teacherNip" value={state.formData.teacherNip} onChange={handleInputChange} className="w-full px-5 py-3 border-2 border-slate-100 rounded-2xl bg-white text-slate-900" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">Nama Kepala Sekolah</label>
                    <input name="principalName" value={state.formData.principalName} onChange={handleInputChange} className="w-full px-5 py-3 border-2 border-slate-100 rounded-2xl bg-white text-slate-900" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">NIP Kepala Sekolah</label>
                    <input name="principalNip" value={state.formData.principalNip} onChange={handleInputChange} className="w-full px-5 py-3 border-2 border-slate-100 rounded-2xl bg-white text-slate-900" />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={state.isGenerating || !state.formData.material} className="w-full py-6 bg-emerald-700 text-white rounded-3xl font-black text-lg hover:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400 shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95">
                {state.isGenerating ? (
                  <><Loader2 className="animate-spin" size={24} /> MENYUSUN RPM 2025...</>
                ) : (
                  <><Sparkles size={24} className="text-yellow-400" /> HASILKAN RPM SEKARANG</>
                )}
              </button>
            </form>
          </div>
        </section>

        <section className="flex-1 min-w-0">
          {!state.generatedContent ? (
            <div className="bg-white rounded-3xl p-20 flex flex-col items-center justify-center text-slate-300 border-4 border-dashed border-slate-100 h-full min-h-[600px] text-center shadow-sm">
              <div className="p-10 bg-slate-50 rounded-full mb-8">
                <BookOpen size={100} strokeWidth={1} className="text-slate-200" />
              </div>
              <h3 className="text-3xl font-black text-slate-400 uppercase tracking-tighter">Preview Dokumen</h3>
              <p className="text-slate-400 mt-4 max-w-xs mx-auto leading-relaxed">Isi topik materi secara manual di samping untuk mulai menyusun RPM berstandar 2025.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-5 bg-white rounded-3xl shadow-xl no-print border border-slate-100">
                <span className="text-emerald-900 font-black flex items-center gap-3 text-sm">
                  <CheckCircle2 className="text-emerald-500" size={24} />
                  RPM BERHASIL DISUSUN
                </span>
                <div className="flex gap-2">
                  <button onClick={handleDownloadWord} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95 text-xs">
                    <Download size={16} /> Word
                  </button>
                  <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 transition-all shadow-md active:scale-95 text-xs">
                    <FileDown size={16} /> PDF
                  </button>
                  <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-md active:scale-95 text-xs">
                    <Printer size={16} /> Cetak
                  </button>
                </div>
              </div>

              <div id="rpm-print-area" className="f4-page shadow-2xl mx-auto overflow-hidden">
                <h2 className="text-center text-2xl font-bold mb-10 underline uppercase tracking-tight">RENCANA PEMBELAJARAN MENDALAM (RPM)</h2>

                <table className="table-spreadsheet">
                  <thead><tr><th colSpan={2} className="table-header-pink">1. IDENTITAS</th></tr></thead>
                  <tbody>
                    <tr><td className="w-1/3 font-bold bg-gray-50">Satuan Pendidikan</td><td className="w-2/3">{state.formData.schoolName}</td></tr>
                    <tr><td className="font-bold bg-gray-50">Mata Pelajaran</td><td>{state.formData.subject}</td></tr>
                    <tr><td className="font-bold bg-gray-50">Kelas / Semester</td><td>{state.formData.grade} / 2 (Genap)</td></tr>
                    <tr><td className="font-bold bg-gray-50">Tahun Pelajaran</td><td>{state.formData.academicYear}</td></tr>
                    <tr><td className="font-bold bg-gray-50">Alokasi Waktu</td><td>{state.formData.duration}</td></tr>
                    <tr><td className="font-bold bg-gray-50">Jumlah Pertemuan</td><td>{state.formData.meetingCount} Pertemuan</td></tr>
                  </tbody>
                </table>

                <table className="table-spreadsheet">
                  <thead><tr><th colSpan={2} className="table-header-pink">2. IDENTIFIKASI</th></tr></thead>
                  <tbody>
                    <tr><td className="w-1/3 font-bold bg-gray-50">Profil Siswa SD</td><td>{state.generatedContent.students}</td></tr>
                    <tr><td className="font-bold bg-gray-50">Materi Pokok (Kurmer 2025)</td><td>{state.formData.material}</td></tr>
                    <tr><td className="font-bold bg-gray-50">Profil Pelajar Pancasila</td><td>{state.formData.dimensions.join(", ")}</td></tr>
                  </tbody>
                </table>

                <table className="table-spreadsheet">
                  <thead><tr><th colSpan={2} className="table-header-pink">3. DESAIN PEMBELAJARAN</th></tr></thead>
                  <tbody>
                    <tr><td className="w-1/3 font-bold bg-gray-50">Capaian Pembelajaran (CP)</td><td className="text-[10pt] leading-normal">{state.formData.cp}</td></tr>
                    <tr><td className="font-bold bg-gray-50">Integrasi Antar Disiplin</td><td>{state.generatedContent.interdisciplinary}</td></tr>
                    <tr><td className="font-bold bg-gray-50">Tujuan Pembelajaran (TP)</td><td className="whitespace-pre-line font-bold leading-relaxed">{state.formData.tp}</td></tr>
                    <tr><td className="font-bold bg-gray-50">Praktik Pedagogis Terpilih</td><td>{state.formData.pedagogy.join(", ")}</td></tr>
                    <tr><td className="font-bold bg-gray-50">Kemitraan & Kolaborasi</td><td>{state.generatedContent.partnership}</td></tr>
                    <tr><td className="font-bold bg-gray-50">Kondisi Lingkungan Belajar</td><td>{state.generatedContent.environment}</td></tr>
                    <tr><td className="font-bold bg-gray-50">Integrasi Teknologi Digital</td><td>{state.generatedContent.digitalTools}</td></tr>
                  </tbody>
                </table>

                <table className="table-spreadsheet">
                  <thead><tr><th colSpan={2} className="table-header-pink">4. PENGALAMAN BELAJAR</th></tr></thead>
                  <tbody>
                    {state.generatedContent.meetings.map((meeting, index) => (
                      <React.Fragment key={index}>
                        <tr className="bg-gray-100"><td colSpan={2} className="text-center font-bold uppercase py-2 bg-slate-200">PERTEMUAN KE-{index + 1}</td></tr>
                        <tr>
                          <td className="w-1/3 font-bold bg-gray-50">Understand (Memahami)<br/><span className="italic font-normal text-[9pt]">({meeting.understand.type})</span></td>
                          <td>{meeting.understand.steps}</td>
                        </tr>
                        <tr>
                          <td className="font-bold bg-gray-50">Apply (Mengaplikasi)<br/><span className="italic font-normal text-[9pt]">({meeting.apply.type})</span></td>
                          <td>{meeting.apply.steps}</td>
                        </tr>
                        <tr>
                          <td className="font-bold bg-gray-50">Reflect (Refleksi)<br/><span className="italic font-normal text-[9pt]">({meeting.reflect.type})</span></td>
                          <td>{meeting.reflect.steps}</td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>

                <table className="table-spreadsheet">
                  <thead><tr><th colSpan={2} className="table-header-pink">5. ASESMEN PEMBELAJARAN (TEKNIK, INSTRUMEN & RUBRIK)</th></tr></thead>
                  <tbody>
                    <tr>
                      <td className="w-1/3 font-bold bg-gray-50">Asesmen Awal (Diagnostic)</td>
                      <td className="whitespace-pre-line text-[10pt] leading-normal">{state.generatedContent.assessments.initial}</td>
                    </tr>
                    <tr>
                      <td className="font-bold bg-gray-50">Asesmen Proses (Formative)</td>
                      <td className="whitespace-pre-line text-[10pt] leading-normal">{state.generatedContent.assessments.process}</td>
                    </tr>
                    <tr>
                      <td className="font-bold bg-gray-50">Asesmen Akhir (Summative)</td>
                      <td className="whitespace-pre-line text-[10pt] font-bold leading-normal">{state.generatedContent.assessments.final}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="mt-8 mb-10">
                  <h3 className="font-bold border-b-2 border-black mb-4 uppercase text-lg pb-1">RINGKASAN MATERI (ESSENTIAL CONTENT)</h3>
                  <table style={{ border: 'none', width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <tbody>
                      <tr>
                        <td style={{ border: 'none', padding: '0 12pt 0 0', width: '60%', verticalAlign: 'top', textAlign: 'justify' }}>
                          <div className="whitespace-pre-line leading-relaxed text-[10pt]">
                            {state.generatedContent.summary}
                          </div>
                        </td>
                        <td style={{ border: 'none', padding: 0, width: '40%', verticalAlign: 'top' }}>
                          {state.generatedImageUrl && (
                            <div className="border-1 border-black p-1.5 bg-white text-center shadow-sm">
                              <img src={state.generatedImageUrl} style={{ width: '100%', height: 'auto', display: 'block', margin: '0 auto' }} alt="Visualisasi Materi" />
                              <p className="text-[8pt] italic font-serif text-slate-600 mt-1.5" style={{ lineHeight: '1.2' }}>Media Visual Pembelajaran: {state.formData.material}</p>
                            </div>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-16">
                  <table style={{ border: 'none', width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ border: 'none', textAlign: 'center', width: '50%', verticalAlign: 'top' }}>
                          <p style={{ margin: 0 }}>Mengetahui,</p>
                          <p style={{ margin: 0 }}>Kepala Sekolah</p>
                          <div style={{ height: '60pt' }}></div>
                          <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase' }}>{state.formData.principalName}</p>
                          <p style={{ margin: 0 }}>NIP. {state.formData.principalNip}</p>
                        </td>
                        <td style={{ border: 'none', textAlign: 'center', width: '50%', verticalAlign: 'top' }}>
                          <p style={{ margin: 0 }}>Andopan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                          <p style={{ margin: 0 }}>Guru Kelas</p>
                          <div style={{ height: '60pt' }}></div>
                          <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase' }}>{state.formData.teacherName}</p>
                          <p style={{ margin: 0 }}>NIP. {state.formData.teacherNip}</p>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="page-break"></div>
                <div className="mt-16 lkpd-section">
                  <div className="border-b-4 border-double border-black pb-3 mb-8 text-center bg-slate-50 p-4">
                    <h2 className="text-2xl font-bold uppercase tracking-tight">LEMBAR KERJA PESERTA DIDIK (LKPD)</h2>
                    <p className="text-sm italic font-serif">{state.formData.subject} - {state.formData.material}</p>
                  </div>
                  <div className="whitespace-pre-line leading-relaxed text-[10pt] p-6 border-2 border-slate-200 rounded-2xl bg-white shadow-sm font-serif">
                    {state.generatedContent.lkpd}
                  </div>
                </div>

                <div className="page-break"></div>
                <div className="mt-16 questions-section">
                  <div className="border-b-4 border-double border-black pb-3 mb-8 text-center bg-slate-50 p-4">
                    <h2 className="text-2xl font-bold uppercase tracking-tight">SOAL FORMATIF PILIHAN GANDA</h2>
                    <p className="text-sm italic font-serif">Kelas: {state.formData.grade} | Topik: {state.formData.material}</p>
                  </div>
                  <div className="space-y-8">
                    {state.generatedContent.formativeQuestions.map((q, idx) => (
                      <div key={idx} className="text-[10pt] border-b border-slate-100 pb-6">
                        <p className="font-bold mb-3 leading-snug">{idx + 1}. {q.question}</p>
                        <div className="ml-6 space-y-1.5">
                          <div className="flex gap-3"><span className="font-bold min-w-[20px]">A.</span> <span>{q.options.a}</span></div>
                          <div className="flex gap-3"><span className="font-bold min-w-[20px]">B.</span> <span>{q.options.b}</span></div>
                          <div className="flex gap-3"><span className="font-bold min-w-[20px]">C.</span> <span>{q.options.c}</span></div>
                          <div className="flex gap-3"><span className="font-bold min-w-[20px]">D.</span> <span>{q.options.d}</span></div>
                        </div>
                      </div>
                    ))}
                    <div className="mt-10 p-6 bg-slate-100 border-2 border-slate-300 rounded-3xl">
                      <p className="font-bold underline mb-4 text-emerald-900 uppercase tracking-widest text-sm">Kunci Jawaban & Evaluasi:</p>
                      <div className="grid grid-cols-5 gap-4">
                        {state.generatedContent.formativeQuestions.map((q, idx) => (
                          <div key={idx} className="bg-white p-2 rounded-lg text-center border border-slate-200">
                            <span className="text-[10px] text-slate-400 block">{idx + 1}</span>
                            <span className="font-black text-emerald-700 uppercase">{q.answer}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
      
      <footer className="mt-20 py-10 text-center text-slate-400 text-[10px] no-print">
        <p className="uppercase tracking-[0.2em] font-black">Versi Produksi Kurikulum Merdeka 2025 • Stabil</p>
        <p className="mt-2">Dikembangkan untuk mendukung efisiensi perencanaan guru di Indonesia.</p>
      </footer>
    </div>
  );
}
