# barkod_api.py — Minimal barkod eşleştirme API'si
# Sadece rapidfuzz kullanır, başka hiçbir şey yok

import re
import os
import json
import urllib.request
import tempfile
from typing import List
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from rapidfuzz import fuzz, process as fuzz_process

# ── Normalize ─────────────────────────────────────────
TABLET_KISALT = {
    "FILMTABIET": "TB", "FILMTABLET": "TB",
    "KONTROLLUSALIMLITABLET": "KONTSALFTB", "KONTROLLUSALIMLITB": "KONTSALFTB",
    "YAVASSALIMLITABLET": "YAVASSALFTB", "YAVASSALIMLITB": "YAVASSALFTB",
    "KONTSALIMLITABLET": "KONTSALFTB", "KONTSALIMLITB": "KONTSALFTB",
    "SALIMLITABLET": "SALFTB", "SALIMLITB": "SALFTB",
    "TABIET": "TB", "TABLET": "TB",
    "KAPSUL": "KAPS", "KAPSEL": "KAPS",
}

def normalize(text: str) -> str:
    if not text:
        return ""
    text = str(text).replace("l", "I").upper()
    for old, new in {"İ":"I","ı":"I","Ğ":"G","Ü":"U","Ş":"S","Ö":"O","Ç":"C"}.items():
        text = text.replace(old, new)
    for ch in [".",",",";",":","/","\\","-","_","(",")","{","}","[","]","*"]:
        text = text.replace(ch, "")
    text = re.sub(r"\s+", "", text)
    text = text.replace("%O", "%0")
    for _ in range(5):
        text = re.sub(r"(\d)O", r"\g<1>0", text)
    return text

def normalize2(k: str) -> str:
    for uzun in sorted(TABLET_KISALT, key=len, reverse=True):
        k = k.replace(uzun, TABLET_KISALT[uzun])
    return k

# ── Barkod Lookup ─────────────────────────────────────
class BarkodLookup:
    def __init__(self):
        self._dict: dict = {}
        self._dict2: dict = {}
        self._keys: list = []
        self.loaded = False

    def yukle(self, urunler: list) -> int:
        for u in urunler:
            barkod = u.get("barkod", "")
            ad = u.get("ad", "")
            if not barkod or not ad:
                continue
            norm = normalize(str(ad))
            if not norm:
                continue
            b = str(barkod).strip()
            self._dict[norm] = b
            self._dict2[normalize2(norm)] = b
        self._keys = list(self._dict.keys())
        self.loaded = True
        return len(self._dict)

    def bul(self, norm_key: str) -> str | None:
        if not self.loaded:
            return None
        # 1. Tam eşleşme
        b = self._dict.get(norm_key)
        if b:
            return b
        # 2. Kısaltma sonrası tam eşleşme
        b = self._dict2.get(normalize2(norm_key))
        if b:
            return b
        # 3. Prefix + rapidfuzz
        prefix = norm_key[:6]
        candidates = [k for k in self._keys if k[:6] == prefix]
        if not candidates:
            return None
        n2 = normalize2(norm_key)
        cand2 = [normalize2(c) for c in candidates]
        result = fuzz_process.extractOne(n2, cand2, scorer=fuzz.ratio, score_cutoff=80)
        if result:
            idx = cand2.index(result[0])
            return self._dict[candidates[idx]]
        return None

_lookup = BarkodLookup()

URUN_LISTESI_URL = "https://raw.githubusercontent.com/ozgunozyigit/eksiklistesi/main/public/data/urun_listesi.json"

@asynccontextmanager
async def lifespan(app):
    print("[BarkodAPI] Ürün listesi yükleniyor...")
    try:
        with urllib.request.urlopen(URUN_LISTESI_URL, timeout=30) as r:
            urunler = json.loads(r.read())
        n = _lookup.yukle(urunler)
        print(f"[BarkodAPI] {n} ürün yüklendi.")
    except Exception as e:
        print(f"[BarkodAPI] Yükleme hatası: {e}")
    yield

# ── FastAPI ───────────────────────────────────────────
app = FastAPI(title="Barkod Eşleştirme API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class EslestirmeIstek(BaseModel):
    urun_adlari: List[str]

@app.get("/")
def root():
    return {"durum": "aktif", "yuklenen": len(_lookup._dict)}

@app.post("/api/barkod-eslestir")
async def barkod_eslestir(istek: EslestirmeIstek):
    if not _lookup.loaded:
        raise HTTPException(status_code=503, detail="Barkod listesi henüz yüklenmedi")
    sonuclar = {}
    for ad in istek.urun_adlari:
        norm = normalize(str(ad))
        sonuclar[ad] = _lookup.bul(norm)
    return {"eslesmeler": sonuclar}
