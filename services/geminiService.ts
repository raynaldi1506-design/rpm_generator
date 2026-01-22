import { GoogleGenAI, Type } from "@google/genai";
import { RPMFormData, GeneratedRPMContent } from "../types";

export const getAITopics = async (subject: string, grade: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  const model = "gemini-3-flash-preview";
  const prompt = `Sebagai pakar pendidikan Indonesia, berikan daftar 10 topik materi pelajaran utama yang SANGAT SPESIFIK dan SESUAI dengan Capaian Pembelajaran (CP) Kurikulum Merdeka TERBARU tahun 2025 untuk Semester 2 (Genap):
    Mata Pelajaran: ${subject}
    Kelas: ${grade} SD
    Output harus berupa JSON array of strings yang berisi judul-judul bab atau materi pokok yang profesional.`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    return [];
  }
};

export const pregenerateCPandTP = async (subject: string, material: string, grade: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  const model = "gemini-3-flash-preview";
  const prompt = `Sebagai pakar Kurikulum Merdeka Indonesia versi 2025, buatkan detail berikut untuk:
    Mata Pelajaran: ${subject}
    Materi: ${material}
    Kelas: ${grade} SD (Semester 2)
    
    1. Capaian Pembelajaran (CP) sesuai regulasi Kemdikbudristek No. 12 Tahun 2024.
    2. Minimal 3 Tujuan Pembelajaran (TP) yang berurutan (sequence).
    3. Daftar Dimensi Profil Lulusan (Pilih yang paling relevan dari daftar ini saja: Keimanan & Ketakwaan, Kewargaan, Penalaran Kritis, Kreativitas, Kolaborasi, Kemandirian, Kesehatan, Komunikasi). Pilih minimal 3 dimensi.
    4. Saran jumlah pertemuan yang ideal.
    5. Saran Praktik Pedagogis (Inquiry, PjBL, PBL, Game Based, atau Station Learning).

    Output dalam format JSON.`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          cp: { type: Type.STRING },
          tp: { type: Type.ARRAY, items: { type: Type.STRING } },
          dimensions: { type: Type.ARRAY, items: { type: Type.STRING } },
          suggestedMeetings: { type: Type.INTEGER },
          suggestedPedagogy: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["cp", "tp", "dimensions", "suggestedMeetings", "suggestedPedagogy"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

export const generateRPMContent = async (formData: RPMFormData): Promise<GeneratedRPMContent> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  const model = "gemini-3-pro-preview";
  
  const prompt = `
    Buatkan konten otomatis untuk Rencana Pembelajaran Mendalam (RPM) Sekolah Dasar (SD) berstandar Kurikulum Merdeka 2025:
    - Mata Pelajaran: ${formData.subject}
    - Kelas/Semester: ${formData.grade} / Semester 2 (Tahun 2025/2026)
    - Materi Pokok: ${formData.material}
    - CP: ${formData.cp}
    - TP: ${formData.tp}
    - Praktik Pedagogis: ${formData.pedagogy.join(", ")}
    - Dimensi Lulusan: ${formData.dimensions.join(", ")}
    - Jumlah Pertemuan: ${formData.meetingCount}
    
    Persyaratan Output JSON:
    1. students: Deskripsi profil siswa SD yang relevan dengan materi ini.
    2. interdisciplinary: Bagaimana materi ini berhubungan dengan mata pelajaran lain (Lintas Disiplin).
    3. partnership: Ide kemitraan (misal: orang tua, komunitas, atau ahli).
    4. environment: Setting lingkungan belajar yang mendukung pembelajaran mendalam.
    5. digitalTools: Rekomendasi aplikasi atau alat digital yang spesifik.
    6. summary: Ringkasan Materi yang esensial dan mendalam.
    7. meetings: Langkah pembelajaran mendalam per pertemuan (minimal 2 pertemuan jika memungkinkan).
    8. assessments: Detail asesmen AWAL (Diagnostik), PROSES (Formatif), dan AKHIR (Sumatif) dengan format Teknik, Instrumen, dan Rubrik.
    9. lkpd: Struktur Lembar Kerja Peserta Didik (LKPD) yang menarik.
    10. formativeQuestions: 10 soal pilihan ganda yang HOTS (Higher Order Thinking Skills) lengkap dengan kunci jawaban.
    
    Gunakan Bahasa Indonesia yang inspiratif, profesional, dan mudah dipahami guru SD.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          students: { type: Type.STRING },
          interdisciplinary: { type: Type.STRING },
          partnership: { type: Type.STRING },
          environment: { type: Type.STRING },
          digitalTools: { type: Type.STRING },
          summary: { type: Type.STRING },
          meetings: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                understand: {
                  type: Type.OBJECT,
                  properties: { type: { type: Type.STRING }, steps: { type: Type.STRING } },
                  required: ["type", "steps"]
                },
                apply: {
                  type: Type.OBJECT,
                  properties: { type: { type: Type.STRING }, steps: { type: Type.STRING } },
                  required: ["type", "steps"]
                },
                reflect: {
                  type: Type.OBJECT,
                  properties: { type: { type: Type.STRING }, steps: { type: Type.STRING } },
                  required: ["type", "steps"]
                }
              },
              required: ["understand", "apply", "reflect"]
            }
          },
          assessments: {
            type: Type.OBJECT,
            properties: {
              initial: { type: Type.STRING },
              process: { type: Type.STRING },
              final: { type: Type.STRING }
            },
            required: ["initial", "process", "final"]
          },
          lkpd: { type: Type.STRING },
          formativeQuestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: {
                  type: Type.OBJECT,
                  properties: {
                    a: { type: Type.STRING },
                    b: { type: Type.STRING },
                    c: { type: Type.STRING },
                    d: { type: Type.STRING }
                  },
                  required: ["a", "b", "c", "d"]
                },
                answer: { type: Type.STRING }
              },
              required: ["question", "options", "answer"]
            }
          }
        },
        required: ["students", "interdisciplinary", "partnership", "environment", "digitalTools", "summary", "meetings", "assessments", "lkpd", "formativeQuestions"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

export const generateRPMImage = async (material: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  try {
    const model = "gemini-2.5-flash-image";
    const prompt = `Visual aids for elementary school students (SD) learning about: "${material}". 
    Art style: professional educational illustration, clean vector style, bright and friendly colors, clear educational subject, no text, no labels, 4k quality.`;
    
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: { aspectRatio: "16:9" }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    return `https://picsum.photos/seed/${encodeURIComponent(material)}/800/450`;
  }
};