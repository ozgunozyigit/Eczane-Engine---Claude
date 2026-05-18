# Eczane Sipariş ENGINe — Web Uygulaması

Streamlit uygulamasından dönüştürülmüş **FastAPI backend + React frontend** projesi.

---

## 📁 Klasör Yapısı

```
eczane-engine/
├── backend/
│   ├── main.py              ← FastAPI uygulaması (tüm iş mantığı burada)
│   ├── requirements.txt     ← Python bağımlılıkları
│   └── urun_master.xlsx     ← (İsteğe bağlı) Master ürün listesi
│
└── frontend/
    ├── src/
    │   └── App.jsx          ← React uygulaması (tek dosya)
    ├── package.json
    └── vite.config.js
```

---

## 🚀 Kurulum ve Çalıştırma

### 1. Backend (FastAPI)

```bash
cd backend

# Sanal ortam oluştur (tavsiye edilir)
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac

# Bağımlılıkları kur
pip install -r requirements.txt

# Sunucuyu başlat
uvicorn main:app --reload --port 8000
```

API çalıştıktan sonra:
- Swagger dokümantasyonu: http://localhost:8000/docs
- Otomatik API şeması: http://localhost:8000/redoc

### 2. Frontend (React + Vite)

```bash
cd frontend

# Bağımlılıkları kur
npm install

# Geliştirme sunucusunu başlat
npm run dev
```

Tarayıcıda açılacak adres: http://localhost:5173

---

## 🔌 API Endpoints

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/info` | Bugünün tarihi, iş günü bilgisi, önerilen rapor aralığı |
| POST | `/api/hesapla` | Excel yükle → JSON sipariş listesi döner |
| POST | `/api/excel-indir` | Excel yükle → Formatlanmış Excel indir |
| POST | `/api/pdf-indir` | Excel yükle → Acil sipariş PDF indir |

---

## 📊 Kullanım

1. Eczanem programından **Ürün Bazında Toplamlar** raporunu alın
   - Tarih aralığı: Son 3 tamamlanmış ay
   - Format: Excel (.xls veya .xlsx)

2. Web arayüzünde dosyayı yükleyin

3. **Sipariş Listesini Oluştur** butonuna tıklayın

4. Sonuçları inceleyin ve Excel/PDF olarak indirin

---

## 🗒️ Notlar

- `urun_master.xlsx` dosyası `backend/` klasörüne kopyalanırsa ürün adları standartlaştırılır
- Backend ve frontend farklı portlarda çalışır; CORS otomatik ayarlanmıştır
- Tüm iş mantığı `backend/main.py` içindedir — Streamlit bağımlılığı tamamen kaldırılmıştır
