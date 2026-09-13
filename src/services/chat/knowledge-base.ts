// Curated grounding snippets -- the non-structured half of this chatbot's
// retrieval. The other half (live zone/district/reallocation data) comes
// from repositories/index.ts via retrieval.ts. Kept as a small in-code
// array and matched by keyword overlap rather than a vector store: the
// corpus is small and stable enough that embedding search would add
// infrastructure without improving relevance -- see the "RAG approach"
// decision this module implements.
//
// Every snippet here reflects a real, verified methodology fact from
// titiktemu-analytics (see that repo's CONTEXT.md / CLAUDE.md) -- this
// exists specifically so the chatbot doesn't invent or overstate what the
// model actually does.

interface KnowledgeSnippet {
  keywords: string[];
  text: string;
}

const SNIPPETS: KnowledgeSnippet[] = [
  {
    keywords: ["ews", "aman", "waspada", "bahaya", "status", "zona"],
    text:
      "Status EWS (Early Warning System) memiliki 3 tingkat: Aman (hijau, risiko gentrifikasi rendah), " +
      "Waspada (kuning, risiko sedang), dan Bahaya (merah, risiko tinggi -- UMKM di zona ini berhak " +
      "melihat rekomendasi realokasi). Status ini dihitung per grid cell (250m x 250m) dari model GWR " +
      "(Geographically Weighted Regression), bukan pengamatan langsung di lapangan.",
  },
  {
    keywords: ["matching score", "kesesuaian", "cocok", "match"],
    text:
      "Matching Score (0-100) mengukur seberapa cocok sebuah lokasi untuk penempatan tenant baru -- " +
      "kombinasi dari probabilitas zona aman dan intensitas komersial (jumlah POI) di sekitarnya. " +
      "Skor tinggi berarti lokasi tersebut relatif aman DAN ramai secara komersial.",
  },
  {
    keywords: ["akurasi", "accuracy", "confidence", "keyakinan", "validasi", "model"],
    text:
      "Angka akurasi model yang ditampilkan adalah hasil validasi silang (leave-one-out cross-validation) " +
      "terhadap data survei UMKM riil, bukan estimasi internal model. Tingkat keyakinan (confidence_level) " +
      "mengikuti jumlah data survei riil yang menjadi dasar validasi -- semakin sedikit data survei di " +
      "suatu kawasan, semakin rendah tingkat keyakinannya, walau skor akurasinya sendiri terlihat tinggi.",
  },
  {
    keywords: ["realokasi", "reallocation", "pindah", "rekomendasi alokasi"],
    text:
      "Rekomendasi realokasi dihitung sekali per siklus batch (bukan real-time) untuk setiap grid cell " +
      "berstatus Bahaya -- mencari hingga 3 zona Aman terdekat dengan radius pencarian yang membesar " +
      "bertahap jika tidak ada zona aman di sekitar. Pencarian dibatasi dalam satu region/kawasan yang " +
      "sama agar rekomendasi tetap masuk akal secara geografis.",
  },
  {
    keywords: ["gentrifikasi", "gentrification", "kerentanan", "vulnerability"],
    text:
      "Indeks kerentanan (vulnerability index) adalah rasio beban sewa tahunan terhadap omzet tahunan " +
      "sebuah usaha -- semakin tinggi rasio ini, semakin besar tekanan gentrifikasi yang dihadapi usaha " +
      "tersebut relatif terhadap pendapatannya.",
  },
  {
    keywords: ["esg", "kuota", "kepatuhan", "compliance"],
    text:
      "Dashboard ESG memantau kepatuhan kuota UMKM lokal terhadap target regulasi (mis. PP No. 7/2021), " +
      "jumlah UMKM yang terlindungi di zona subsidi, dan rata-rata indeks kerentanan seluruh usaha aktif " +
      "di suatu kawasan.",
  },
  {
    keywords: ["cakupan", "region", "kawasan", "wilayah", "populasi", "sampel", "generalisasi"],
    text:
      "Model saat ini dilatih dari data survei UMKM riil di sejumlah kawasan sekitar TOD Jabodetabek -- " +
      "cakupannya bertambah seiring data survei baru masuk. Untuk kawasan yang belum memiliki data survei " +
      "riil, sistem tidak akan memaksakan sebuah skor -- lebih baik menyatakan datanya belum tersedia.",
  },
];

/** Returns the text of every snippet whose keyword list overlaps the message -- small corpus, no vector store needed. */
export function retrieveKnowledge(message: string): string[] {
  const lower = message.toLowerCase();
  return SNIPPETS.filter((snippet) => snippet.keywords.some((keyword) => lower.includes(keyword))).map(
    (snippet) => snippet.text,
  );
}
