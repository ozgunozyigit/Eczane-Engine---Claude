import { useState, useEffect, useRef, useCallback } from "react";

const API = "https://eczane-engine-claude.onrender.com";

const STATUS_CONFIG = {
  "ACİL":      { bg: "#FFF0EC", text: "#C0392B", border: "#E74C3C", badge: "#E74C3C", label: "ACİL" },
  "SİPARİŞ":   { bg: "#EEF6FF", text: "#1A5DB5", border: "#2980B9", badge: "#2980B9", label: "SİPARİŞ" },
  "GEREK YOK": { bg: "#F4F4F4", text: "#555",    border: "#CCC",    badge: "#999",    label: "GEREK YOK" },
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
      fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
      whiteSpace: "nowrap"
    }}>{cfg.label}</span>
  );
}

function KpiCard({ label, value, color }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 12,
      padding: "20px 28px", flex: 1, minWidth: 120,
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      borderTop: `4px solid ${color}`,
    }}>
      <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: "'DM Mono', monospace" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#777", marginTop: 4, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

function DropZone({ onFile, loading }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !loading && inputRef.current.click()}
      style={{
        border: `2px dashed ${dragging ? "#2563EB" : "#CBD5E1"}`,
        borderRadius: 14,
        padding: "40px 24px",
        textAlign: "center",
        cursor: loading ? "not-allowed" : "pointer",
        background: dragging ? "#EFF6FF" : "#FAFBFC",
        transition: "all 0.2s",
        opacity: loading ? 0.6 : 1,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xls,.xlsx"
        style={{ display: "none" }}
        onChange={(e) => { if (e.target.files[0]) onFile(e.target.files[0]); }}
      />
      <div style={{ fontSize: 36, marginBottom: 10 }}>📊</div>
      <div style={{ fontWeight: 700, color: "#1E293B", fontSize: 15 }}>Excel dosyasını sürükle bırak veya tıkla</div>
      <div style={{ color: "#94A3B8", fontSize: 13, marginTop: 6 }}>.xls veya .xlsx formatı • Ürün Bazında Toplamlar raporu</div>
    </div>
  );
}

function Table({ rows, search }) {
  const cols = [
    { key: "urun_adi",     label: "Ürün Adı",         align: "left",   w: "auto" },
    { key: "durum",        label: "Durum",             align: "center", w: 110 },
    { key: "parti_siparis",label: "Parti Sip.",        align: "center", w: 100 },
    { key: "toplam_siparis",label:"Top. Sip.",         align: "center", w: 100 },
    { key: "satis_3ay",    label: "3 Ay Satış",        align: "center", w: 95 },
    { key: "ort_aylik",    label: "Ort. Aylık",        align: "center", w: 90 },
    { key: "stok",         label: "Stok",              align: "center", w: 70 },
  ];

  const filtered = search
    ? rows.filter(r => r.urun_adi?.toLowerCase().includes(search.toLowerCase()))
    : rows;

  return (
    <div style={{ overflowX: "auto", borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 700 }}>
        <thead>
          <tr style={{ background: "#1E293B" }}>
            {cols.map(c => (
              <th key={c.key} style={{
                padding: "10px 12px", color: "#E2E8F0",
                fontWeight: 700, fontSize: 11, letterSpacing: "0.07em",
                textTransform: "uppercase", textAlign: c.align,
                width: c.w !== "auto" ? c.w : undefined,
              }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr><td colSpan={cols.length} style={{ textAlign: "center", padding: 32, color: "#94A3B8" }}>Sonuç bulunamadı</td></tr>
          )}
          {filtered.map((row, i) => {
            const cfg = STATUS_CONFIG[row.durum] || {};
            return (
              <tr key={i} style={{
                background: i % 2 === 0 ? (cfg.bg || "#fff") : (cfg.bg ? cfg.bg + "aa" : "#FAFAFA"),
                borderBottom: "1px solid #E2E8F0",
                transition: "background 0.1s",
              }}>
                {cols.map(c => (
                  <td key={c.key} style={{
                    padding: "9px 12px", textAlign: c.align,
                    color: c.key === "urun_adi" ? "#0F172A" : "#374151",
                    fontWeight: c.key === "urun_adi" ? 600 : 400,
                    fontFamily: c.key === "urun_adi" ? "inherit" : "'DM Mono', monospace",
                    fontSize: c.key === "urun_adi" ? 13 : 12,
                  }}>
                    {c.key === "durum" ? <Badge durum={row.durum} /> : fmt(row[c.key])}
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

export default function App() {
  const [info, setInfo] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("siparis"); // "siparis" | "haric" | "debug"
  const [dlLoading, setDlLoading] = useState({ excel: false, pdf: false });
  const resultsRef = useRef();

  useEffect(() => {
    fetch(`${API}/api/info`)
      .then(r => r.json())
      .then(setInfo)
      .catch(() => setInfo(null));
  }, []);

  const handleFile = useCallback((f) => {
    setResult(null);
    setError(null);
    const allowedExt = [".xls", ".xlsx"];
    const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
    if (!allowedExt.includes(ext)) {
      setError(`❌ Geçersiz dosya formatı: "${f.name}"\n\nSadece Excel dosyası (.xls veya .xlsx) yüklenebilir. Eczanem'den raporu Excel formatında indirdiğinizden emin olun.`);
      setFile(null);
      return;
    }
    setFile(f);
  }, []);

  const formatError = (msg) => {
    if (!msg) return "Bilinmeyen bir hata oluştu.";
    if (msg.includes("Dosya okunamadı") || msg.includes("Excel"))
      return "❌ Dosya okunamadı.\n\nLütfen şunları kontrol edin:\n• Eczanem → Raporlar → Ürün Bazında Toplamlar raporunu seçtiniz mi?\n• Dosya Excel formatında (.xls / .xlsx) mı kaydedildi?\n• Dosya başka bir program tarafından açık değil mi?";
    if (msg.includes("sütun") || msg.includes("column") || msg.includes("A,B,F"))
      return "❌ Dosya yapısı uyumsuz.\n\nBu rapor 'Ürün Bazında Toplamlar' formatında değil. A sütunu Ürün Adı, B sütunu 3 aylık satış, F sütunu Stok Miktarı olmalıdır.";
    if (msg.includes("tarih") || msg.includes("3 ay"))
      return "❌ Tarih aralığı hatalı.\n\nLütfen son 3 tamamlanmış ayı seçin." + (info ? ` Doğru aralık: ${info.rapor_araligi_str}` : "");
    return `❌ Hata: ${msg}`;
  };

  const handleHesapla = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`${API}/api/hesapla`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Bilinmeyen hata");
      setResult(data);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) {
      setError(formatError(e.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (type) => {
    if (!file) return;
    setDlLoading(d => ({ ...d, [type]: true }));
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`${API}/api/${type === "excel" ? "excel-indir" : "pdf-indir"}`, {
        method: "POST", body: fd
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = type === "excel" ? "siparis_sonuc.xlsx" : "acil_siparis_listesi.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("İndirme hatası: " + e.message);
    } finally {
      setDlLoading(d => ({ ...d, [type]: false }));
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F1F5F9",
      fontFamily: "'Sora', sans-serif",
    }}>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        button:hover { opacity: 0.88; }
      `}</style>

      {/* Header */}
      <header style={{
        background: "#0F172A",
        color: "#fff",
        padding: "18px 32px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        boxShadow: "0 2px 16px rgba(0,0,0,0.18)",
      }}>
        <span style={{ fontSize: 26 }}>💊</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: "-0.01em" }}>Eczane Sipariş ENGINe</div>
          <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 1 }}>Düşük Stok Sipariş Listesi</div>
        </div>
        {info && (
          <div style={{ marginLeft: "auto", textAlign: "right", fontSize: 12, color: "#94A3B8", lineHeight: 1.8 }}>
            <div>📅 {info.bugun_str}</div>
            <div>⏳ {info.aktif_ay} ayı kalan iş günü: <strong style={{ color: "#38BDF8" }}>{info.kalan_is_gunu}</strong></div>
          </div>
        )}
      </header>

      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 20px" }}>

        {/* Info + Upload Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>

          {/* Info + Guide card */}
          <div style={{ background: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 2px 10px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Tarih bilgisi */}
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#0F172A", marginBottom: 10 }}>📌 Satış Raporu Bilgileri</div>
              {info ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "8px 14px", border: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>📅 Bugünün Tarihi</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#0F172A" }}>{info.bugun_str}</span>
                  </div>
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

            {/* Adım adım kılavuz */}
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#0F172A", marginBottom: 10 }}>📋 Nasıl Kullanılır?</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { n: 1, text: "Eczanem programını açın" },
                  { n: 2, text: "Üst menüden Raporlar → Satış Raporları seçin" },
                  { n: 3, text: <span>Tarih aralığını seçin: <strong style={{ color: "#2563EB" }}>{info ? info.rapor_araligi_str : "son 3 tamamlanmış ay"}</strong></span> },
                  { n: 4, text: "Sol sekmeden Ürün Bazında Toplamlar'ı seçin" },
                  { n: 5, text: "Excel olarak kaydedin (.xls veya .xlsx)" },
                  { n: 6, text: "Sağdaki alana yükleyin ve butona tıklayın" },
                ].map(s => (
                  <div key={s.n} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "#374151" }}>
                    <span style={{
                      minWidth: 22, height: 22, borderRadius: "50%",
                      background: "#2563EB", color: "#fff",
                      fontSize: 11, fontWeight: 800,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      marginTop: 1, flexShrink: 0,
                    }}>{s.n}</span>
                    <span style={{ lineHeight: 1.6 }}>{s.text}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Upload card */}
          <div style={{ background: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#0F172A", marginBottom: 14 }}>📂 Dosya Yükle</div>
            <div style={{
              background: "#FFF7ED",
              border: "1px solid #FED7AA",
              borderRadius: 8,
              padding: "12px 14px",
              marginBottom: 14,
              fontSize: 13,
              color: "#92400E",
              lineHeight: 1.8,
            }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>⚠️ Dosyayı yüklemeden önce kontrol edin:</div>
              <div>📅 <strong>Tarih aralığı:</strong> Son 3 tamamlanmış ay — örneğin <strong>{info ? info.rapor_araligi_str : "..."}</strong></div>
              <div>📊 <strong>Rapor türü:</strong> Eczanem → Raporlar → <strong>Ürün Bazında Toplamlar</strong></div>
              <div>📁 <strong>Format:</strong> Excel olarak indirin (.xls veya .xlsx)</div>
            </div>
            <DropZone onFile={handleFile} loading={loading} />
            {file && (
              <div style={{ marginTop: 12, fontSize: 13, color: "#374151", display: "flex", alignItems: "center", gap: 8 }}>
                <span>✅</span>
                <span style={{ fontWeight: 600 }}>{file.name}</span>
                <span style={{ color: "#94A3B8" }}>({(file.size / 1024).toFixed(0)} KB)</span>
              </div>
            )}
            <button
              onClick={handleHesapla}
              disabled={!file || loading}
              style={{
                marginTop: 14,
                width: "100%",
                padding: "12px 0",
                background: (!file || loading) ? "#CBD5E1" : "#2563EB",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 14,
                cursor: (!file || loading) ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                letterSpacing: "0.02em",
                transition: "background 0.2s",
              }}
            >
              {loading ? "⏳ Hesaplanıyor..." : "🚀 Sipariş Listesini Oluştur"}
            </button>
            {error && (
              <div style={{ marginTop: 12, padding: "12px 14px", background: "#FEF2F2", borderRadius: 8, color: "#B91C1C", fontSize: 13, border: "1px solid #FECACA", lineHeight: 1.8, whiteSpace: "pre-line" }}>
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        {result && (
          <div ref={resultsRef}>
            {/* KPI row */}
            <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
              <KpiCard label="ACİL"      value={result.ozet.acil}       color="#E74C3C" />
              <KpiCard label="SİPARİŞ"  value={result.ozet.siparis}    color="#2980B9" />
              <KpiCard label="GEREK YOK" value={result.ozet.gerek_yok}  color="#94A3B8" />
              <KpiCard label="LİSTE DIŞI" value={result.ozet.liste_disi} color="#F59E0B" />
            </div>

            {/* Info banner */}
            <div style={{
              background: "#EFF6FF", border: "1px solid #BFDBFE",
              borderRadius: 10, padding: "12px 16px",
              color: "#1E40AF", fontSize: 13, marginBottom: 12, fontWeight: 500,
            }}>
              ⏳ Sipariş önerileri, ay sonuna kadar kalan <strong>{result.ozet.kalan_is_gunu} resmi iş günü</strong> ihtiyacına göre hesaplanmıştır.
            </div>

            {result.ozet.yaz_ayi_indirimi && (
              <div style={{
                background: "#FFF7ED", border: "1px solid #FED7AA",
                borderRadius: 10, padding: "12px 16px",
                color: "#92400E", fontSize: 13, marginBottom: 12, fontWeight: 500,
              }}>
                ☀️ <strong>Yaz ayı modu aktif:</strong> Haziran-Temmuz-Ağustos döneminde satışlar azaldığından toplam sipariş miktarlarına <strong>%20 indirim</strong> uygulanmıştır.
              </div>
            )}

            {/* Download buttons */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              <DlButton onClick={() => handleDownload("excel")} loading={dlLoading.excel} color="#16A34A" icon="📥" label="Excel İndir" />
              <DlButton onClick={() => handleDownload("pdf")} loading={dlLoading.pdf} color="#DC2626" icon="📄" label="Acil Sipariş PDF" />
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "2px solid #E2E8F0" }}>
              {[
                { key: "siparis", label: `Sipariş Listesi (${result.urunler.length})` },
                { key: "haric", label: `Liste Dışı (${result.haric_tutulanlar.length})` },
              ].map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} style={{
                  padding: "8px 18px", border: "none", background: "none", cursor: "pointer",
                  fontWeight: 700, fontSize: 13, fontFamily: "inherit",
                  color: tab === t.key ? "#2563EB" : "#64748B",
                  borderBottom: tab === t.key ? "2px solid #2563EB" : "2px solid transparent",
                  marginBottom: -2, transition: "all 0.15s",
                }}>{t.label}</button>
              ))}
            </div>

            {tab === "siparis" && (
              <>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="🔍 Ürün adı ara..."
                  style={{
                    width: "100%", padding: "10px 14px", fontSize: 14,
                    border: "1.5px solid #CBD5E1", borderRadius: 8,
                    outline: "none", marginBottom: 14, fontFamily: "inherit",
                    background: "#fff",
                  }}
                />
                <Table rows={result.urunler} search={search} />
              </>
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
                            <th key={h} style={{ padding: "10px 12px", color: "#E2E8F0", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", textAlign: h === "Ürün Adı" ? "left" : "center" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.haric_tutulanlar.map((r, i) => (
                          <tr key={i} style={{ background: i % 2 === 0 ? "#FFFBEB" : "#FEF9C3", borderBottom: "1px solid #E2E8F0" }}>
                            <td style={{ padding: "9px 12px", fontWeight: 600, color: "#0F172A" }}>{r.urun_adi}</td>
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

function InfoRow({ label, value, highlight, accent }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #F1F5F9" }}>
      <span style={{ fontSize: 12, color: "#64748B" }}>{label}</span>
      <span style={{
        fontSize: 13, fontWeight: 700,
        color: accent ? "#16A34A" : highlight ? "#2563EB" : "#0F172A",
      }}>{value}</span>
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
