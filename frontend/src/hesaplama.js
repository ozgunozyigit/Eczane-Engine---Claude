// hesaplama.js — Python main.py'nin birebir JavaScript karşılığı
// Tarayıcıda çalışır, backend gerekmez

// ── Sabitler ──────────────────────────────────────────────────────────────
const TURKCE_AYLAR = ["","Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"]

const LISTE_DISI_BASLANGICLAR_RAW = [
  "BIODERMA","CUBITAN","DIASIP","ENSURE","FORTIMEL","FORTINI",
  "GLUCERNA","IMPACT","LAROCHE","NUTRISON","NUTRIVIGOR","PEDIASURE",
  "PEPTAMEN","PHYSIONEAL","RESOURCE","ENJEKTOR","MAJISTRAL","SENTE",
  "SARIINTRAKET","INFATRINI","VITAL","SANITAYARA","OCEAN","NUXE","NBTLIFE","NUTRAXIN",
  "SOLGAR","VELAVIT","BIOXCIN","CERAVE","DERMOSKIN","DINAMIS","DYNAVIT","EASYFISH","MEDICAGO",
  "MOLLERS","MUSTELA","NATURESBOUNTY","REDEXON","ROLL","SENSODYNE","SIHHAT","TOPICREM","TTO","VICHY",
  "ZADEVITAL","WELLCARE","AYSET",
  "NEWLIFE","STREPSILS","CURAPROX","INTRAKET","ACTIVE PLUS","ARGIVIT","BEPANTHOL",
  "CAN PED","CAPICADE","CAUDALIE","DAY 2","DUCRAY","ENTEROGERMINA","GOODDAY",
  "GRIPIN","IMUNEKS","IMUNOL","NBL","NIVEA","NTB","NOW","NYXON","OKEY",
  "PARADONTAX","REDOXON","SKINCEUT","SMARTUP","SORVAGEN","STERIMAR","SUPRADYN",
  "PHARMATON","TABIA","TABVITAMIN","TURKFLEKS","UMCA","VEDEXA","VENATURA",
  "VERISCA","WEE","MAVIINTRAKET"
]

const TABLET_KISALT = {
  "FILMTABIET":"TB","FILMTABLET":"TB",
  "KONTROLLUSALIMLITABLET":"KONTSALFTB","KONTROLLUSALIMLITB":"KONTSALFTB",
  "YAVASSALIMLITABLET":"YAVASSALFTB","YAVASSALIMLITB":"YAVASSALFTB",
  "KONTSALIMLITABLET":"KONTSALFTB","KONTSALIMLITB":"KONTSALFTB",
  "SALIMLITABLET":"SALFTB","SALIMLITB":"SALFTB",
  "TABIET":"TB","TABLET":"TB",
  "KAPSUL":"KAPS","KAPSEL":"KAPS"
}

const DINI_TATILLER = {
  2025:["2025-03-30","2025-03-31","2025-04-01","2025-06-06","2025-06-07","2025-06-08","2025-06-09"],
  2026:["2026-03-20","2026-03-21","2026-03-22","2026-05-27","2026-05-28","2026-05-29","2026-05-30"],
  2027:["2027-03-09","2027-03-10","2027-03-11","2027-05-16","2027-05-17","2027-05-18","2027-05-19"],
  2028:["2028-02-26","2028-02-27","2028-02-28","2028-05-04","2028-05-05","2028-05-06","2028-05-07"],
  2029:["2029-02-14","2029-02-15","2029-02-16","2029-04-23","2029-04-24","2029-04-25","2029-04-26"],
  2030:["2030-02-04","2030-02-05","2030-02-06","2030-04-13","2030-04-14","2030-04-15","2030-04-16"]
}

const MILLI_BAYRAMLAR = ["01-01","04-23","05-01","05-19","07-15","08-30","10-29"]

// ── Tarih Yardımcıları ────────────────────────────────────────────────────
function bugunTurkiye() {
  const now = new Date()
  // UTC+3
  const tr = new Date(now.getTime() + 3 * 60 * 60 * 1000)
  return new Date(tr.getUTCFullYear(), tr.getUTCMonth(), tr.getUTCDate())
}

function tarihStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function isGunuMu(d) {
  const gun = d.getDay() // 0=Pazar, 6=Cumartesi
  if (gun === 0 || gun === 6) return false
  const yil = d.getFullYear()
  const ayGun = `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  if (MILLI_BAYRAMLAR.includes(ayGun)) return false
  const diniListe = DINI_TATILLER[yil] || []
  if (diniListe.includes(tarihStr(d))) return false
  return true
}

function ayIsGunuBilgisi(bugun) {
  const yil = bugun.getFullYear()
  const ay = bugun.getMonth()
  const ayIlkGun = new Date(yil, ay, 1)
  const aysonGun = new Date(yil, ay + 1, 0)
  let toplamIsGunu = 0
  let kalanIsGunu = 0
  const d = new Date(ayIlkGun)
  while (d <= aysonGun) {
    if (isGunuMu(d)) {
      toplamIsGunu++
      if (d >= bugun) kalanIsGunu++
    }
    d.setDate(d.getDate() + 1)
  }
  return {
    toplamIsGunu: Math.max(toplamIsGunu, 1),
    kalanIsGunu: Math.max(kalanIsGunu, 1),
    aysonGun
  }
}

function onerilen_rapor_araligi(bugun) {
  const ilkGun = new Date(bugun.getFullYear(), bugun.getMonth(), 1)
  const baslangic = new Date(ilkGun)
  baslangic.setMonth(baslangic.getMonth() - 3)
  const bitis = new Date(ilkGun)
  bitis.setDate(bitis.getDate() - 1)
  return { baslangic, bitis }
}

function turkceTarihYaz(d) {
  return `${String(d.getDate()).padStart(2,'0')} ${TURKCE_AYLAR[d.getMonth()+1]} ${d.getFullYear()}`
}

// ── Normalize ─────────────────────────────────────────────────────────────
function normalizeUrunAdi(text) {
  if (!text || text === null || text === undefined) return ""
  text = String(text)
  text = text.replace(/l/g, "I")
  text = text.toUpperCase()
  const tr = {"İ":"I","ı":"I","Ğ":"G","Ü":"U","Ş":"S","Ö":"O","Ç":"C"}
  for (const [k,v] of Object.entries(tr)) text = text.split(k).join(v)
  for (const ch of [".",",",";",":","/","\\","-","_","(",")","{","}","[","]","*"]) {
    text = text.split(ch).join("")
  }
  text = text.replace(/\s+/g, "")
  text = text.replace(/%O/g, "%0")
  for (let i = 0; i < 5; i++) text = text.replace(/(\d)O/g, "$10")
  return text
}

function normalize2(normKey) {
  let k = normKey
  // Uzundan kısaya sırala
  const kisaltmalar = Object.entries(TABLET_KISALT).sort((a,b) => b[0].length - a[0].length)
  for (const [uzun, kisa] of kisaltmalar) k = k.split(uzun).join(kisa)
  return k
}

// ── Liste Dışı ────────────────────────────────────────────────────────────
const LISTE_DISI_NORM = LISTE_DISI_BASLANGICLAR_RAW.map(normalizeUrunAdi)

function listeDisiBaslangicBul(normKey) {
  normKey = String(normKey)
  for (let i = 0; i < LISTE_DISI_NORM.length; i++) {
    if (normKey.startsWith(LISTE_DISI_NORM[i])) {
      return { listeDisi: true, sebep: LISTE_DISI_BASLANGICLAR_RAW[i] }
    }
  }
  return { listeDisi: false, sebep: "" }
}

// ── Görünen Ürün Adı ──────────────────────────────────────────────────────
function gorunenUrunAdiOlustur(normKey) {
  let text = String(normKey)
  if (!text || text === "NAN") return ""
  text = text.replace(/%0(\d{2})(?=[A-Z])/g, " %0.$1 ")
  text = text.replace(/%(\d+(?:\.\d+)?)(?=[A-Z])/g, " %$1 ")
  const birimler = ["MCG","MG","ML","CM","MM","CC","IU","GR"]
  birimler.sort((a,b) => b.length - a.length)
  const birimRegex = new RegExp(`(\\d+)(${birimler.join("|")})(?=[A-Z]|$)`, "g")
  text = text.replace(birimRegex, "$1 $2 ")
  text = text.replace(/([A-Z])(?=\d)/g, "$1 ")
  text = text.replace(/(\d)(?=[A-Z])/g, "$1 ")
  const kelimeler = [
    "TABLET","KAPSUL","KAPSEL","KAPLET","FILM","FLAKON","AMPUL","SASE","SASET","DAMLA",
    "SURUP","SUSPANSIYON","SUSP","SOLUSYON","KREM","MERHEM","JEL","SPREY","PASTIL","PED",
    "SAFT","KASE","ADET","ORAL","NAZAL","GOZ","KULAK","BURUN","DERI","CILT","UZATILMIS",
    "SALIMLI","ENTERIK","KAPLI","RETARD","FORT","FORTE","PLUS","PEDIATRIK","YETISKIN",
    "COCUK","BEBEK","AROMALI","MUZ","CILEK","PORTAKAL","ORMAN","MEYVE","ENJEKTOR","INSULIN",
    "SUPER","KOMPRES","GAZ","STERIL","ENERJI","ENERGY","COZELTI"
  ].sort((a,b) => b.length - a.length)
  for (const kelime of kelimeler) {
    const re = new RegExp(`(?<!^)(?<! )(${kelime})`, "g")
    text = text.replace(re, " $1")
  }
  text = text.replace(/\s+/g, " ").trim()
  return text
}

// ── Sayıya Çevir ──────────────────────────────────────────────────────────
function toNumber(val) {
  if (val === null || val === undefined || val === "") return 0
  if (typeof val === "number") return isNaN(val) ? 0 : val
  const s = String(val).trim().replace(",", ".")
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

// ── Sipariş Durumu ────────────────────────────────────────────────────────
function dusukDevirliHedefStok(toplam3ay) {
  if (toplam3ay >= 4 && toplam3ay <= 8) return 2
  if (toplam3ay >= 9 && toplam3ay <= 15) return 3
  if (toplam3ay >= 16 && toplam3ay <= 30) return 4
  return 0
}

function siparisDurumuBelirle(row) {
  const { ortalama_satis, ham_siparis_miktari, hesap_stok, toplam_3ay_satis } = row

  if (ortalama_satis > 4 && ham_siparis_miktari > 0 &&
      hesap_stok < (ortalama_satis / 30) * 7 && hesap_stok <= 30) {
    return "ACİL"
  }
  if (toplam_3ay_satis >= 4 && toplam_3ay_satis <= 30 && hesap_stok <= 1) {
    const hedef = dusukDevirliHedefStok(toplam_3ay_satis)
    if (hedef - hesap_stok > 0) return "DÜŞÜK DEVİRLİ SİPARİŞ"
  }
  if (ham_siparis_miktari > 0) return "SİPARİŞ"
  return "GEREK YOK"
}

// ── Barkod Eşleştirme ─────────────────────────────────────────────────────
// Barkod lookup — startup'ta yüklenir
let _normDict = {}   // norm_ad -> barkod
let _norm2Dict = {}  // norm2_ad -> barkod  
let _keys = []

export function barkodListesiniYukle(urunler) {
  _normDict = {}
  _norm2Dict = {}
  for (const u of urunler) {
    if (!u.barkod || !u.ad) continue
    const norm = normalizeUrunAdi(u.ad)
    if (!norm) continue
    _normDict[norm] = String(u.barkod)
    _norm2Dict[normalize2(norm)] = String(u.barkod)
  }
  _keys = Object.keys(_normDict)
}

function barkodBul(normKey) {
  if (!_keys.length) return null
  // 1. Tam eşleşme
  if (_normDict[normKey]) return _normDict[normKey]
  const n2 = normalize2(normKey)
  if (_norm2Dict[n2]) return _norm2Dict[n2]
  // 2. Prefix + ratio + partial_ratio
  const prefix = normKey.substring(0, 6)
  const adaylar = _keys.filter(k => k.startsWith(prefix))
  if (!adaylar.length) return null
  let enIyi = null, enIyiSkor = 0
  for (const aday of adaylar) {
    const a2 = normalize2(aday)
    const s1 = levenshteinRatio(n2, a2)
    const s2 = partialRatio(n2, a2) * 0.90
    const skor = Math.max(s1, s2)
    if (skor > enIyiSkor) { enIyiSkor = skor; enIyi = aday }
  }
  return (enIyiSkor >= 68 && enIyi) ? _normDict[enIyi] : null
}

// Senkron barkod eşleştirme (siparisHesapla içinden çağrılır)
export function barkodlariniEslestir(urunAdlari) {
  const result = {}
  for (const ad of urunAdlari) {
    const norm = normalizeUrunAdi(ad)
    result[ad] = barkodBul(norm)
  }
  return result
}

function levenshteinRatio(a, b) {
  const m = a.length, n = b.length
  if (m === 0 && n === 0) return 100
  if (m === 0 || n === 0) return 0
  // Uzunluk farkı çok fazlaysa hızlı ret
  if (Math.abs(m - n) / Math.max(m, n) > 0.5) return 0
  const dp = new Uint16Array((m + 1) * (n + 1))
  for (let i = 0; i <= m; i++) dp[i * (n + 1)] = i
  for (let j = 0; j <= n; j++) dp[j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i-1] === b[j-1] ? 0 : 1
      dp[i*(n+1)+j] = Math.min(
        dp[(i-1)*(n+1)+j] + 1,
        dp[i*(n+1)+(j-1)] + 1,
        dp[(i-1)*(n+1)+(j-1)] + cost
      )
    }
  }
  const dist = dp[m*(n+1)+n]
  return Math.round((1 - (2 * dist) / (m + n)) * 100)
}

// ── ANA HESAPLAMA FONKSİYONU ──────────────────────────────────────────────
export function siparisHesapla(satirlar) {
  // satirlar: [{urun_adi, toplam_3ay_satis, stok}, ...]
  // SheetJS'den gelen ham satırlar

  const bugun = bugunTurkiye()
  const { toplamIsGunu, kalanIsGunu, aysonGun } = ayIsGunuBilgisi(bugun)
  const yazAyiMi = [6, 7, 8].includes(bugun.getMonth() + 1)
  const STOK_CAP = 50
  const YAZ_INDIRIMI = 0.20

  // Normalize et ve grupla
  const grupMap = new Map()
  for (const satir of satirlar) {
    const normAd = normalizeUrunAdi(satir.urun_adi)
    if (!normAd || normAd === "NAN") continue
    if (!grupMap.has(normAd)) {
      grupMap.set(normAd, {
        normalize_ad: normAd,
        toplam_3ay_satis: 0,
        stok: toNumber(satir.stok),
        ornek_adi: satir.urun_adi
      })
    }
    grupMap.get(normAd).toplam_3ay_satis += toNumber(satir.toplam_3ay_satis)
  }

  const urunler = []
  const haric = []

  for (const [normAd, g] of grupMap) {
    const { listeDisi, sebep } = listeDisiBaslangicBul(normAd)
    if (listeDisi) {
      haric.push({
        urun_adi: gorunenUrunAdiOlustur(normAd),
        satis_3ay: g.toplam_3ay_satis,
        stok: g.stok,
        sebep: `Başlangıç: ${sebep}`
      })
      continue
    }

    const ortSatis = Math.round((g.toplam_3ay_satis / 3) * 100) / 100
    const hesapStok = Math.max(g.stok, 0)
    const ortGunlukSatis = Math.round((ortSatis / 22) * 10000) / 10000
    const stokGun = ortGunlukSatis > 0 ? Math.round(hesapStok / ortGunlukSatis * 10) / 10 : null
    const kalanAyIhtiyaci = Math.round(ortGunlukSatis * kalanIsGunu * 100) / 100
    let hamSiparis = Math.max(0, Math.ceil(kalanAyIhtiyaci - hesapStok))

    if (yazAyiMi && hamSiparis > 0) {
      hamSiparis = Math.max(0, Math.ceil(hamSiparis * (1 - YAZ_INDIRIMI)))
    }

    const row = {
      normalize_ad: normAd,
      toplam_3ay_satis: g.toplam_3ay_satis,
      stok: g.stok,
      hesap_stok: hesapStok,
      ortalama_satis: ortSatis,
      ortalama_gunluk_satis: ortGunlukSatis,
      stok_gun: stokGun,
      ham_siparis_miktari: hamSiparis,
      planlanan_siparis_miktari: Math.min(STOK_CAP, hamSiparis)
    }

    row.siparis_durumu = siparisDurumuBelirle(row)

    // Düşük devirli miktar düzeltmesi
    if (row.siparis_durumu === "DÜŞÜK DEVİRLİ SİPARİŞ") {
      const hedef = dusukDevirliHedefStok(row.toplam_3ay_satis)
      row.planlanan_siparis_miktari = Math.max(0, hedef - Math.floor(hesapStok))
    }

    const oncelik = {"ACİL":1,"SİPARİŞ":2,"DÜŞÜK DEVİRLİ SİPARİŞ":3,"GEREK YOK":4}
    row.siparis_onceligi = oncelik[row.siparis_durumu] || 99
    row.gorunen_urun_adi = gorunenUrunAdiOlustur(normAd)
    row.barkod = barkodBul(normAd)

    urunler.push(row)
  }

  // Sırala
  urunler.sort((a, b) => {
    if (a.siparis_onceligi !== b.siparis_onceligi) return a.siparis_onceligi - b.siparis_onceligi
    const ba = parseInt(a.barkod) || 999999999
    const bb = parseInt(b.barkod) || 999999999
    if (ba !== bb) return ba - bb
    return b.ortalama_satis - a.ortalama_satis
  })

  return {
    urunler: urunler.map(r => ({
      urun_adi: r.gorunen_urun_adi,
      parti_siparis: r.planlanan_siparis_miktari,
      toplam_siparis: r.ham_siparis_miktari,
      satis_3ay: r.toplam_3ay_satis,
      ort_aylik: r.ortalama_satis,
      stok: r.stok,
      stok_gun: r.stok_gun,
      durum: r.siparis_durumu,
      barkod: r.barkod
    })),
    haric_tutulanlar: haric,
    ozet: {
      acil: urunler.filter(r => r.siparis_durumu === "ACİL").length,
      siparis: urunler.filter(r => r.siparis_durumu === "SİPARİŞ").length,
      dusuk_devirli: urunler.filter(r => r.siparis_durumu === "DÜŞÜK DEVİRLİ SİPARİŞ").length,
      gerek_yok: urunler.filter(r => r.siparis_durumu === "GEREK YOK").length,
      liste_disi: haric.length,
      kalan_is_gunu: kalanIsGunu,
      yaz_ayi_indirimi: yazAyiMi
    },
    bilgi: {
      bugun: bugun,
      bugun_str: turkceTarihYaz(bugun),
      aktif_ay: TURKCE_AYLAR[bugun.getMonth()+1],
      toplam_is_gunu: toplamIsGunu,
      kalan_is_gunu: kalanIsGunu,
      rapor_araligi_str: (() => {
        const { baslangic, bitis } = onerilen_rapor_araligi(bugun)
        return `${turkceTarihYaz(baslangic)} - ${turkceTarihYaz(bitis)}`
      })()
    }
  }
}
