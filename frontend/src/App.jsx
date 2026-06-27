import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import * as XLSX from "xlsx";
import { siparisHesapla, barkodListesiniYukle, barkodlariniEslestir } from "./hesaplama.js";

const GEK_STORAGE_KEY  = "gek_siparis_listesi";   // GEK (mevcut)
const SELCUK_KEY       = "selcuk_siparis_listesi";
const ALLIANCE_KEY     = "alliance_siparis_listesi";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAQXbjWiXAy8roTqrIGfrHQUZLp-eNMV28",
  authDomain: "eksik-listesi-537ae.firebaseapp.com",
  projectId: "eksik-listesi-537ae",
  storageBucket: "eksik-listesi-537ae.firebasestorage.app",
  messagingSenderId: "1061786067280",
  appId: "1:1061786067280:web:e40672a53053bb4eea8c55"
};
const ECZANE_KODU = "ÖZGÜN";

const STATUS_CONFIG = {
  "ACİL":                   { bg: "#FFF0EC", text: "#C0392B", border: "#E74C3C", badge: "#E74C3C", label: "ACİL" },
  "SİPARİŞ":                { bg: "#EEF6FF", text: "#1A5DB5", border: "#2980B9", badge: "#2980B9", label: "SİPARİŞ" },
  "DÜŞÜK DEVİRLİ SİPARİŞ": { bg: "#F5F3FF", text: "#6D28D9", border: "#7C3AED", badge: "#7C3AED", label: "D. DEVİRLİ" },
  "GEREK YOK":              { bg: "#F4F4F4", text: "#555",    border: "#CCC",    badge: "#999",    label: "GEREK YOK" },
};

function fmt(v) {
  if (v === null || v === undefined) return "–";
  const n = parseFloat(v);
  if (isNaN(n)) return String(v);
  if (Number.isInteger(n) || n === Math.round(n)) return String(Math.round(n));
  return n.toFixed(2).replace(/\.?0+$/, "");
}

function Badge({ durum }) {
  const cfg = STATUS_CONFIG[durum] || STATUS_CONFIG["GEREK YOK"];
  return (
    <span style={{
      background: cfg.badge, color: "#fff",
      borderRadius: 4, padding: "2px 8px",
      fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", whiteSpace: "nowrap"
    }}>{cfg.label}</span>
  );
}

function EksikRozet({ eksikBilgi }) {
  const [popup, setPopup] = useState(false);
  if (!eksikBilgi) return null;
  const tarih = eksikBilgi.sonGirisTarihi?.toDate?.()?.toLocaleString("tr-TR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
  }) || "—";
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <span onClick={() => setPopup(!popup)} style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "2px 8px", background: "#fef3c7", color: "#92400e",
        border: "1px solid #fcd34d", borderRadius: 12,
        fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap"
      }}>⚠ EKSİK</span>
      {popup && (
        <>
          <div onClick={() => setPopup(false)} style={{ position: "fixed", inset: 0, zIndex: 998 }} />
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0,
            background: "#fff", border: "1.5px solid #fcd34d",
            borderRadius: 10, padding: "12px 16px", zIndex: 999,
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)", minWidth: 220
          }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#92400e", marginBottom: 8 }}>⚠ Eksik Listesinde</div>
            <div style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}><strong>Ekleyen:</strong> {(eksikBilgi.kullanicilar || []).join(", ")}</div>
            <div style={{ fontSize: 12, color: "#374151" }}><strong>Son giriş:</strong> {tarih}</div>
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value, color }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 12, padding: "20px 28px", flex: 1, minWidth: 120,
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)", borderTop: `4px solid ${color}`,
    }}>
      <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: "'DM Mono', monospace" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#777", marginTop: 4, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

function DropZone({ onFile, loading }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();
  const handleDrop = (e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); };
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !loading && inputRef.current.click()}
      style={{
        border: `2px dashed ${dragging ? "#2563EB" : "#CBD5E1"}`,
        borderRadius: 14, padding: "40px 24px", textAlign: "center",
        cursor: loading ? "not-allowed" : "pointer",
        background: dragging ? "#EFF6FF" : "#FAFBFC",
        transition: "all 0.2s", opacity: loading ? 0.6 : 1,
      }}
    >
      <input ref={inputRef} type="file" accept=".xls,.xlsx" style={{ display: "none" }}
        onChange={(e) => { if (e.target.files[0]) onFile(e.target.files[0]); }} />
      <div style={{ fontSize: 36, marginBottom: 10 }}>📊</div>
      <div style={{ fontWeight: 700, color: "#1E293B", fontSize: 15 }}>Excel dosyasını sürükle bırak veya tıkla</div>
      <div style={{ color: "#94A3B8", fontSize: 13, marginTop: 6 }}>.xls veya .xlsx formatı • Ürün Bazında Toplamlar raporu</div>
    </div>
  );
}

// ── Aktar Butonları ──────────────────────────────────────────────────────
function AktarButonlari({ rows, secilenBarkodlar, eksikMap }) {
  const [mesaj, setMesaj] = useState("");
  const [gonderilen, setGonderilen] = useState({});

  const toastGoster = (m) => { setMesaj(m); setTimeout(() => setMesaj(""), 3500); };

  const secilenListeOlustur = () => {
    const siparisMap = new Map(rows.map(r => [r.barkod, r]));
    return [...secilenBarkodlar].filter(Boolean).map(barkod => {
      const row = siparisMap.get(barkod);
      const eksikBilgi = eksikMap[barkod];
      return {
        barkod,
        urunAdi: row ? row.urun_adi : (eksikBilgi?.urunAdi || barkod),
        miktar: row && row.parti_siparis > 0 ? Math.round(row.parti_siparis) : 1,
        tamamlandi: false,
      };
    });
  };

  const aktar = (key, label) => {
    if (secilenBarkodlar.size === 0) { toastGoster("Hiç ürün seçilmedi"); return; }
    const liste = secilenListeOlustur();
    localStorage.setItem(key, JSON.stringify(liste));
    setGonderilen(g => ({ ...g, [key]: true }));
    setTimeout(() => setGonderilen(g => ({ ...g, [key]: false })), 3000);
    toastGoster(liste.length + " ürün " + label + " eklentisine aktarıldı");
  };

  const temizle = (key, label) => {
    localStorage.removeItem(key);
    toastGoster(label + " listesi temizlendi");
  };

  const sayac = secilenBarkodlar.size;
  const butonlar = [
    { key: GEK_STORAGE_KEY, label: "GEK",      renk: "#d97706", icon: "🚛" },
    { key: SELCUK_KEY,      label: "Selçuk",   renk: "#0369a1", icon: "📦" },
    { key: ALLIANCE_KEY,    label: "Alliance", renk: "#7c3aed", icon: "🏭" },
  ];

  return (
    <div>
      {mesaj && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: "#0F172A", color: "#fff", padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>{mesaj}</div>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {sayac > 0 && (
          <div style={{ padding: "10px 14px", background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#166534" }}>
            ✓ {sayac} ürün seçili
          </div>
        )}
        {butonlar.map(({ key, label, renk, icon }) => (
          <div key={key} style={{ display: "flex", gap: 4 }}>
            <button onClick={() => aktar(key, label)} disabled={sayac === 0} style={{ padding: "10px 16px", background: sayac === 0 ? "#CBD5E1" : (gonderilen[key] ? "#059669" : renk), color: "#fff", border: "none", borderRadius: "8px 0 0 8px", fontWeight: 700, fontSize: 13, cursor: sayac === 0 ? "not-allowed" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              {gonderilen[key] ? "✅ " + label + " Aktarıldı!" : icon + " " + label + "'a Aktar"}
            </button>
            <button onClick={() => temizle(key, label)} title={label + " listesini temizle"} style={{ padding: "10px 10px", background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1.5px solid #fca5a5", borderRadius: "0 8px 8px 0", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>🗑</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function KilavuzPanel({ info }) {
  const [acik, setAcik] = useState(false);
  const [aktifBolum, setAktifBolum] = useState(null);

  const tarihAraligi = info ? info.rapor_araligi_str : "son 3 tamamlanmis ay";

  const bolumler = [
    {
      id: "rapor",
      baslik: "📊 Rapor Hazırlama",
      renk: "#2563EB",
      adimlar: [
        "Eczanem programını açın.",
        "Üst menüden Raporlar → Satış Raporları seçin.",
        "Sol sekmeden Ürün Bazında Toplamlar'ı seçin.",
        "Tarih aralığını seçin: " + tarihAraligi,
        "Raporu Excel olarak kaydedin (.xls veya .xlsx).",
      ]
    },
    {
      id: "siparis",
      baslik: "🚀 Sipariş Listesi Oluşturma",
      renk: "#7C3AED",
      adimlar: [
        "Sağ panelden Excel dosyasını yükleyin.",
        "Sipariş Listesini Oluştur butonuna tıklayın.",
        "Sonuçlar ACİL, SİPARİŞ, DÜŞÜK DEVİRLİ ve GEREK YOK olarak sıralanır.",
        "Miktarlar, ay sonuna kalan iş günü ihtiyacına göre otomatik hesaplanır.",
        "Excel veya PDF olarak indirip yazdırabilirsiniz.",
      ]
    },
    {
      id: "eksik",
      baslik: "⚠ Eksik Listesi Takibi",
      renk: "#D97706",
      adimlar: [
        "Personel Eksik Listesi uygulamasından rafta biten ürünleri ekler.",
        "Eksik listedeki ürünler tabloda sarı EKSİK rozetiyle işaretlenir.",
        "Rozete tıklayarak kimin eklediğini ve ne zaman eklendiğini görebilirsiniz.",
        "Üst başlıkta toplam eksik ürün sayısı görüntülenir ve 60 saniyede bir güncellenir.",
      ]
    },
    {
      id: "gek",
      baslik: "🚛 GEK'e Otomatik Sipariş",
      renk: "#059669",
      adimlar: [
        "Sipariş listesi oluşturduktan sonra satırlardaki kutucukları işaretleyin.",
        "Eksik Listedekilerini Seç butonuyla eksik ürünleri otomatik seçebilirsiniz.",
        "İstediğiniz ürünleri manuel olarak da ekleyip çıkarabilirsiniz.",
        "GEK'e Aktar butonuna tıklayın — seçilen ürünler ve parti miktarları kaydedilir.",
        "GEK sitesine (esube.gek.org.tr) gidin ve giriş yapın.",
        "Sağ üstteki GEK Sipariş Asistanı panelinde sıradaki ürün görünür.",
        "Barkodu Ara butonuna tıklayın — eklenti otomatik arama yapar.",
        "Ürün sayfasında kampanyayı seçin, miktarı kontrol edin, Siparişe Ekle tıklayın.",
        "Eklenti otomatik olarak sıradaki ürünü arar. Tüm liste bitince sepeti onaylayın.",
      ]
    },
    {
      id: "ipuclari",
      baslik: "💡 İpuçları",
      renk: "#64748B",
      adimlar: [
        "Seçimi Temizle butonu ile yapılan seçimi sıfırlayabilirsiniz.",
        "GEK Listesini Temizle butonu ile aktarılan listeyi sıfırlayabilirsiniz.",
        "Tablo başlığındaki checkbox ile tüm listeyi bir anda seçebilirsiniz.",
        "Ürün adı arama kutusuyla tablo filtrelenebilir.",
        "Düşük Devirli sekmesindeki ürünler de GEK'e aktarılabilir.",
        "GEK eklentisinde Atla butonu ile ürünü geçebilirsiniz.",
      ]
    }
  ];

  return (
    <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 12 }}>
      <button
        onClick={() => setAcik(!acik)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "none", border: "none", cursor: "pointer", padding: "4px 0",
          fontFamily: "inherit"
        }}
      >
        <span style={{ fontWeight: 800, fontSize: 15, color: "#0F172A" }}>📋 Kullanım Kılavuzu</span>
        <span style={{ fontSize: 18, color: "#64748B" }}>{acik ? "▲" : "▼"}</span>
      </button>

      {acik && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          {bolumler.map(b => (
            <div key={b.id} style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
              <button
                onClick={() => setAktifBolum(aktifBolum === b.id ? null : b.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: aktifBolum === b.id ? "#f8faff" : "#fff",
                  border: "none", cursor: "pointer", padding: "10px 14px",
                  fontFamily: "inherit"
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 13, color: "#0F172A" }}>{b.baslik}</span>
                <span style={{ fontSize: 12, color: "#94A3B8" }}>{aktifBolum === b.id ? "▲" : "▼"}</span>
              </button>

              {aktifBolum === b.id && (
                <div style={{ padding: "10px 14px", background: "#f8faff", borderTop: "1px solid #e5e7eb", display: "flex", flexDirection: "column", gap: 8 }}>
                  {b.adimlar.map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "#374151" }}>
                      <span style={{
                        minWidth: 22, height: 22, borderRadius: "50%",
                        background: b.renk, color: "#fff",
                        fontSize: 11, fontWeight: 800,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        marginTop: 1, flexShrink: 0
                      }}>{i + 1}</span>
                      <span style={{ lineHeight: 1.6 }}>{s}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Table({ rows, search, eksikMap, secilenBarkodlar, onSecimDegis }) {
  const filtered = search
    ? rows.filter(r => r.urun_adi?.toLowerCase().includes(search.toLowerCase()))
    : rows;

  const filteredBarkodlar = filtered.map(r => r.barkod).filter(Boolean);
  const tumSecili = filteredBarkodlar.length > 0 && filteredBarkodlar.every(b => secilenBarkodlar.has(b));

  const handleTumSecim = () => {
    const yeni = new Set(secilenBarkodlar);
    if (tumSecili) filteredBarkodlar.forEach(b => yeni.delete(b));
    else filteredBarkodlar.forEach(b => yeni.add(b));
    onSecimDegis(yeni);
  };

  const handleSatirSecim = (barkod) => {
    if (!barkod) return;
    const yeni = new Set(secilenBarkodlar);
    if (yeni.has(barkod)) yeni.delete(barkod);
    else yeni.add(barkod);
    onSecimDegis(yeni);
  };

  const cols = [
    { key: "secim",         label: "",             align: "center", w: 40 },
    { key: "barkod",        label: "Barkod",       align: "center", w: 118 },
    { key: "urun_adi",      label: "Ürün Adı",     align: "left",   w: "auto" },
    { key: "eksik",         label: "Eksik",        align: "center", w: 90 },
    { key: "durum",         label: "Durum",        align: "center", w: 110 },
    { key: "parti_siparis", label: "Parti Sip.",   align: "center", w: 100 },
    { key: "toplam_siparis",label: "Top. Sip.",    align: "center", w: 100 },
    { key: "satis_3ay",     label: "3 Ay Satış",   align: "center", w: 95 },
    { key: "ort_aylik",     label: "Ort. Aylık",   align: "center", w: 90 },
    { key: "stok",          label: "Stok",         align: "center", w: 70 },
    { key: "stok_gun",      label: "Stok Gün",     align: "center", w: 80 },
  ];

  return (
    <div style={{ overflowX: "auto", borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 700 }}>
        <thead>
          <tr style={{ background: "#1E293B" }}>
            {cols.map(c => (
              <th key={c.key} style={{
                padding: "10px 12px",
                color: c.key === "eksik" ? "#fcd34d" : "#E2E8F0",
                fontWeight: 700, fontSize: 11, letterSpacing: "0.07em",
                textTransform: "uppercase", textAlign: c.align,
                width: c.w !== "auto" ? c.w : undefined,
              }}>
                {c.key === "secim"
                  ? <input type="checkbox" checked={tumSecili} onChange={handleTumSecim}
                      style={{ cursor: "pointer", width: 16, height: 16, accentColor: "#2563EB" }} />
                  : c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr><td colSpan={cols.length} style={{ textAlign: "center", padding: 32, color: "#94A3B8" }}>Sonuç bulunamadı</td></tr>
          )}
          {filtered.map((row, i) => {
            const cfg = STATUS_CONFIG[row.durum] || {};
            const eksikBilgi = eksikMap[row.barkod] || null;
            const secili = row.barkod && secilenBarkodlar.has(row.barkod);
            return (
              <tr key={i}
                onClick={() => handleSatirSecim(row.barkod)}
                style={{
                  background: secili ? "#dbeafe"
                    : eksikBilgi
                      ? (i % 2 === 0 ? "#fffbeb" : "#fef9c3")
                      : (i % 2 === 0 ? (cfg.bg || "#fff") : (cfg.bg ? cfg.bg + "aa" : "#FAFAFA")),
                  borderBottom: "1px solid #E2E8F0",
                  cursor: row.barkod ? "pointer" : "default",
                  outline: secili ? "2px solid #93c5fd" : "none",
                  outlineOffset: -2,
                }}>
                {cols.map(c => (
                  <td key={c.key}
                    onClick={c.key === "secim" ? (e) => e.stopPropagation() : undefined}
                    style={{
                      padding: "9px 12px", textAlign: c.align,
                      color: c.key === "urun_adi" ? "#0F172A" : "#374151",
                      fontWeight: c.key === "urun_adi" ? 600 : 400,
                      fontFamily: c.key === "urun_adi" ? "inherit" : "'DM Mono', monospace",
                      fontSize: c.key === "urun_adi" ? 13 : 12,
                    }}>
                    {c.key === "secim"
                      ? <input type="checkbox" checked={!!secili}
                          onChange={() => handleSatirSecim(row.barkod)}
                          disabled={!row.barkod}
                          style={{ cursor: row.barkod ? "pointer" : "default", width: 16, height: 16, accentColor: "#2563EB" }} />
                      : c.key === "durum" ? <Badge durum={row.durum} />
                      : c.key === "eksik" ? <EksikRozet eksikBilgi={eksikBilgi} />
                      : c.key === "barkod" ? (row.barkod ?? "—")
                      : fmt(row[c.key])
                    }
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Firestore REST API — SDK yok, sadece fetch
async function eksikListesiniCek() {
  try {
    const proje = FIREBASE_CONFIG.projectId;
    const url = "https://firestore.googleapis.com/v1/projects/" + proje + "/databases/(default)/documents/eczaneler/" + ECZANE_KODU + "/eksikler?pageSize=200";
    const res = await fetch(url);
    if (!res.ok) return {};
    const data = await res.json();
    const map = {};
    (data.documents || []).forEach(doc => {
      const f = doc.fields || {};
      if (f.durum?.stringValue !== "aktif") return;
      const barkod = f.barkod?.stringValue;
      if (!barkod) return;
      map[barkod] = {
        barkod,
        urunAdi: f.urunAdi?.stringValue || "",
        kullanicilar: (f.kullanicilar?.arrayValue?.values || []).map(v => v.stringValue || ""),
        sonGirisTarihi: f.sonGirisTarihi?.timestampValue
          ? { toDate: () => new Date(f.sonGirisTarihi.timestampValue) }
          : null
      };
    });
    return map;
  } catch (e) {
    console.warn("Eksik listesi çekilemedi:", e.message);
    return {};
  }
}

export default function App() {
  const [info, setInfo] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("siparis");
  const [dlLoading, setDlLoading] = useState({ excel: false, pdf: false });
  const [eksikMap, setEksikMap] = useState({});
  const [secilenBarkodlar, setSecilenBarkodlar] = useState(new Set());
  const resultsRef = useRef();

  useEffect(() => {
    // Barkod listesini yükle + info hesapla
    fetch("/data/urun_listesi.json")
      .then(r => r.json())
      .then(urunler => {
        barkodListesiniYukle(urunler);
        const data = siparisHesapla([]);
        setInfo({
          bugun_str: data.bilgi.bugun_str,
          aktif_ay: data.bilgi.aktif_ay,
          toplam_is_gunu: data.bilgi.toplam_is_gunu,
          kalan_is_gunu: data.bilgi.kalan_is_gunu,
          rapor_araligi_str: data.bilgi.rapor_araligi_str,
          barkod_aktif: true,
          barkod_kayit_sayisi: urunler.length
        });
      })
      .catch(() => setInfo(null));

    eksikListesiniCek().then(setEksikMap);
    const interval = setInterval(() => eksikListesiniCek().then(setEksikMap), 60000);
    return () => clearInterval(interval);
  }, []);

  const handleFile = useCallback((f) => {
    setResult(null); setError(null);
    const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
    if (![".xls", ".xlsx"].includes(ext)) {
      setError("Geçersiz dosya formatı. Sadece Excel (.xls / .xlsx) yüklenebilir.");
      setFile(null); return;
    }
    setFile(f);
  }, []);

  const formatError = (msg) => {
    if (!msg) return "Bilinmeyen bir hata oluştu.";
    if (msg.includes("Dosya okunamadı") || msg.includes("Excel"))
      return "Dosya okunamadı. Eczanem → Raporlar → Ürün Bazında Toplamlar raporunu Excel olarak kaydedin.";
    if (msg.includes("sütun") || msg.includes("column"))
      return "Dosya yapısı uyumsuz. Bu rapor Ürün Bazında Toplamlar formatında değil.";
    return "Hata: " + msg;
  };

  const handleHesapla = async () => {
    if (!file) return;
    setLoading(true); setError(null); setResult(null);
    try {
        // Excel'i tarayıcıda oku
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

      // Başlık satırını atla, A (0), B (1), F (5) kolonlarını al
      const satirlar = rows.slice(1)
        .filter(r => r && r[0])
        .map(r => ({
          urun_adi: r[0],
          toplam_3ay_satis: r[1],
          stok: r[5]
        }));

      if (satirlar.length === 0) throw new Error("Dosyada veri bulunamadı");

      // Hesapla — tamamen tarayıcıda, barkod eşleştirme dahil
      const data = siparisHesapla(satirlar);
      setResult(data);
      eksikListesiniCek().then(setEksikMap);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) {
      setError(formatError(e.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (type) => {
    if (!result) return;
    setDlLoading(d => ({ ...d, [type]: true }));
    try {
      if (type === "excel") {
        // Excel oluştur
        const wb = XLSX.utils.book_new();
        const siparisData = result.urunler.map(r => ({
          "Ürün Adı": r.urun_adi,
          "Parti Sipariş Mik.": r.parti_siparis,
          "Top. Sipariş Mik.": r.toplam_siparis,
          "3 Aylık Satış": r.satis_3ay,
          "Ort. Aylık Satış": r.ort_aylik,
          "Stok": r.stok,
          "Durum": r.durum
        }));
        const ws = XLSX.utils.json_to_sheet(siparisData);
        XLSX.utils.book_append_sheet(wb, ws, "Sipariş Sonuç");
        if (result.haric_tutulanlar.length > 0) {
          const haricData = result.haric_tutulanlar.map(r => ({
            "Ürün Adı": r.urun_adi,
            "3 Aylık Satış": r.satis_3ay,
            "Stok": r.stok,
            "Sebep": r.sebep
          }));
          const ws2 = XLSX.utils.json_to_sheet(haricData);
          XLSX.utils.book_append_sheet(wb, ws2, "Liste Dışı");
        }
        XLSX.writeFile(wb, "siparis_sonuc.xlsx");
      } else {
        // PDF için backend'e gönder — sadece PDF için Render kullanılıyor
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("https://eczane-engine-claude.onrender.com/api/pdf-indir", { method: "POST", body: fd });
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "acil_siparis_listesi.pdf";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error("İndirme hatası:", e.message);
    } finally {
      setDlLoading(d => ({ ...d, [type]: false }));
    }
  };

  const eksikSayisi = Object.keys(eksikMap).length;
  const aktifRows = useMemo(
    () => result ? result.urunler.filter(u => u.durum !== "DÜŞÜK DEVİRLİ SİPARİŞ") : [],
    [result]
  );
  const dusukRows = useMemo(
    () => result ? result.urunler.filter(u => u.durum === "DÜŞÜK DEVİRLİ SİPARİŞ") : [],
    [result]
  );
  const tumRows = useMemo(() => result ? result.urunler : [], [result]);

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "'Sora', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        button:hover { opacity: 0.88; }
      `}</style>

      <header style={{
        background: "#0F172A", color: "#fff", padding: "18px 32px",
        display: "flex", alignItems: "center", gap: 16,
        boxShadow: "0 2px 16px rgba(0,0,0,0.18)",
      }}>
        <span style={{ fontSize: 26 }}>💊</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: "-0.01em" }}>Eczane Sipariş ENGINe</div>
          <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 1 }}>Düşük Stok Sipariş Listesi</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
          {eksikSayisi > 0 && (
            <div style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 700 }}>
              ⚠ {eksikSayisi} eksik ürün
            </div>
          )}
          {secilenBarkodlar.size > 0 && (
            <div style={{ background: "#dbeafe", color: "#1e40af", border: "1px solid #93c5fd", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 700 }}>
              ✓ {secilenBarkodlar.size} seçili
            </div>
          )}
          {info && (
            <div style={{ textAlign: "right", fontSize: 12, color: "#94A3B8", lineHeight: 1.8 }}>
              <div>📅 {info.bugun_str}</div>
              <div>⏳ {info.aktif_ay} ayı kalan iş günü: <strong style={{ color: "#38BDF8" }}>{info.kalan_is_gunu}</strong></div>
              {info.barkod_aktif
                ? <div>🔖 Barkod: <strong style={{ color: "#34D399" }}>{info.barkod_kayit_sayisi?.toLocaleString("tr-TR")} ürün</strong></div>
                : <div style={{ color: "#64748B" }}>🔖 Barkod listesi yüklü değil</div>
              }
            </div>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 2px 10px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#0F172A", marginBottom: 10 }}>📌 Satış Raporu Bilgileri</div>
              {info ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 14px", border: "1px solid #BFDBFE" }}>
                    <div style={{ fontSize: 11, color: "#3B82F6", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Seçilmesi Gereken Tarih Aralığı</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#1E40AF" }}>{info.rapor_araligi_str}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1, background: "#F8FAFC", borderRadius: 8, padding: "8px 12px", border: "1px solid #E2E8F0", textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600 }}>TOPLAM İŞ GÜNÜ</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", fontFamily: "'DM Mono', monospace" }}>{info.toplam_is_gunu}</div>
                    </div>
                    <div style={{ flex: 1, background: "#F0FDF4", borderRadius: 8, padding: "8px 12px", border: "1px solid #BBF7D0", textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: "#16A34A", fontWeight: 600 }}>KALAN İŞ GÜNÜ</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#15803D", fontFamily: "'DM Mono', monospace" }}>{info.kalan_is_gunu}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ color: "#94A3B8", fontSize: 13 }}>Bağlanılıyor...</div>
              )}
            </div>
            <KilavuzPanel info={info} />
          </div>

          <div style={{ background: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#0F172A", marginBottom: 14 }}>📂 Dosya Yükle</div>
            <DropZone onFile={handleFile} loading={loading} />
            {file && (
              <div style={{ marginTop: 12, fontSize: 13, color: "#374151", display: "flex", alignItems: "center", gap: 8 }}>
                <span>✅</span>
                <span style={{ fontWeight: 600 }}>{file.name}</span>
                <span style={{ color: "#94A3B8" }}>({(file.size / 1024).toFixed(0)} KB)</span>
              </div>
            )}
            <button onClick={handleHesapla} disabled={!file || loading} style={{
              marginTop: 14, width: "100%", padding: "12px 0",
              background: (!file || loading) ? "#CBD5E1" : "#2563EB",
              color: "#fff", border: "none", borderRadius: 8,
              fontWeight: 700, fontSize: 14, cursor: (!file || loading) ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}>
              {loading ? "⏳ Hesaplanıyor..." : "🚀 Sipariş Listesini Oluştur"}
            </button>
            {error && (
              <div style={{ marginTop: 12, padding: "12px 14px", background: "#FEF2F2", borderRadius: 8, color: "#B91C1C", fontSize: 13, border: "1px solid #FECACA", lineHeight: 1.8 }}>
                {error}
              </div>
            )}
          </div>
        </div>

        {result && (
          <div ref={resultsRef}>
            <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
              <KpiCard label="ACİL"        value={result.ozet.acil}          color="#E74C3C" />
              <KpiCard label="SİPARİŞ"    value={result.ozet.siparis}       color="#2980B9" />
              <KpiCard label="D. DEVİRLİ" value={result.ozet.dusuk_devirli} color="#7C3AED" />
              <KpiCard label="GEREK YOK"  value={result.ozet.gerek_yok}     color="#94A3B8" />
              {eksikSayisi > 0 && <KpiCard label="EKSİK LİSTESİ" value={eksikSayisi} color="#D97706" />}
            </div>

            <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "12px 16px", color: "#1E40AF", fontSize: 13, marginBottom: 12, fontWeight: 500 }}>
              ⏳ Sipariş önerileri, ay sonuna kadar kalan <strong>{result.ozet.kalan_is_gunu} resmi iş günü</strong> ihtiyacına göre hesaplanmıştır.
            </div>

            <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
              <DlButton onClick={() => handleDownload("excel")} loading={dlLoading.excel} color="#16A34A" icon="📥" label="Excel İndir" />
              <DlButton onClick={() => handleDownload("pdf")} loading={dlLoading.pdf} color="#DC2626" icon="📄" label="Acil Sipariş PDF" />
              <AktarButonlari rows={tumRows} secilenBarkodlar={secilenBarkodlar} eksikMap={eksikMap} />
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                <button onClick={() => setSecilenBarkodlar(new Set(Object.keys(eksikMap)))} style={{ padding: "6px 14px", background: "#fef3c7", color: "#92400e", border: "1.5px solid #fcd34d", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>⚠ Eksikleri Seç ({eksikSayisi})</button>
                <button onClick={() => setSecilenBarkodlar(new Set(tumRows.map(r => r.barkod).filter(Boolean)))} style={{ padding: "6px 14px", background: "#f0fdf4", color: "#166534", border: "1.5px solid #86efac", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>☑ Tümünü Seç</button>
                <button onClick={() => setSecilenBarkodlar(new Set())} style={{ padding: "6px 14px", background: "#f1f5f9", color: "#475569", border: "1.5px solid #cbd5e1", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>✕ Seçimi Temizle</button>
              </div>
            </div>

            <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "2px solid #E2E8F0" }}>
              {[
                { key: "siparis", label: "Sipariş Listesi (" + aktifRows.length + ")" },
                { key: "dusuk",   label: "Düşük Devirli (" + result.ozet.dusuk_devirli + ")" },
                { key: "haric",   label: "Liste Dışı (" + result.haric_tutulanlar.length + ")" },
              ].map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} style={{
                  padding: "8px 18px", border: "none", background: "none", cursor: "pointer",
                  fontWeight: 700, fontSize: 13, fontFamily: "inherit",
                  color: tab === t.key ? "#2563EB" : "#64748B",
                  borderBottom: tab === t.key ? "2px solid #2563EB" : "2px solid transparent",
                  marginBottom: -2,
                }}>{t.label}</button>
              ))}
            </div>

            {tab === "siparis" && (
              <>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="🔍 Ürün adı ara..."
                  style={{ width: "100%", padding: "10px 14px", fontSize: 14, border: "1.5px solid #CBD5E1", borderRadius: 8, outline: "none", marginBottom: 14, fontFamily: "inherit", background: "#fff" }}
                />
                <Table rows={aktifRows} search={search} eksikMap={eksikMap} secilenBarkodlar={secilenBarkodlar} onSecimDegis={setSecilenBarkodlar} />
              </>
            )}

            {tab === "dusuk" && (
              result.ozet.dusuk_devirli === 0
                ? <div style={{ color: "#94A3B8", textAlign: "center", padding: 32 }}>Düşük devirli sipariş gereken ürün yok.</div>
                : <Table rows={dusukRows} search="" eksikMap={eksikMap} secilenBarkodlar={secilenBarkodlar} onSecimDegis={setSecilenBarkodlar} />
            )}

            {tab === "haric" && (
              result.haric_tutulanlar.length === 0
                ? <div style={{ color: "#94A3B8", textAlign: "center", padding: 32 }}>Liste dışı tutulan ürün yok.</div>
                : (
                  <div style={{ overflowX: "auto", borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "#1E293B" }}>
                          {["Ürün Adı", "3 Ay Satış", "Stok", "Sebep"].map(h => (
                            <th key={h} style={{ padding: "10px 12px", color: "#E2E8F0", fontWeight: 700, fontSize: 11, textTransform: "uppercase", textAlign: h === "Ürün Adı" ? "left" : "center" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.haric_tutulanlar.map((r, i) => (
                          <tr key={i} style={{ background: i % 2 === 0 ? "#FFFBEB" : "#FEF9C3", borderBottom: "1px solid #E2E8F0" }}>
                            <td style={{ padding: "9px 12px", fontWeight: 600 }}>{r.urun_adi}</td>
                            <td style={{ padding: "9px 12px", textAlign: "center", fontFamily: "'DM Mono', monospace", fontSize: 12 }}>{fmt(r.satis_3ay)}</td>
                            <td style={{ padding: "9px 12px", textAlign: "center", fontFamily: "'DM Mono', monospace", fontSize: 12 }}>{fmt(r.stok)}</td>
                            <td style={{ padding: "9px 12px", textAlign: "center", fontSize: 12, color: "#92400E" }}>{r.sebep}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
            )}
          </div>
        )}

        {!result && !loading && (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#94A3B8" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💊</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Sipariş hazırlamak için Excel dosyasını yükleyin</div>
          </div>
        )}
      </main>
    </div>
  );
}

function DlButton({ onClick, loading, color, icon, label }) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      padding: "10px 20px", background: loading ? "#CBD5E1" : color,
      color: "#fff", border: "none", borderRadius: 8,
      fontWeight: 700, fontSize: 13, cursor: loading ? "not-allowed" : "pointer",
      fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
    }}>
      {icon} {loading ? "İndiriliyor..." : label}
    </button>
  );
}
