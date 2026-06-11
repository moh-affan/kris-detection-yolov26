import os
import json
import cv2
import numpy as np
from ultralytics import YOLO

# ── Global singletons ─────────────────────────────────────────────────────────
_model_instance   = None
_model_path_used  = None
_knowledge_base   = None
_dynamic_class_map = None  # {class_name: kb_meta} dibaca dari annotations_db

# ── COCO class ID → keris proxy mapping ───────────────────────────────────────
# Objek COCO yang secara visual mirip bilah/benda panjang ramping
COCO_KERIS_PROXY = {
    43: "keris_unknown",   # knife
    44: "keris_unknown",   # spoon
    76: "keris_unknown",   # scissors
    39: "keris_unknown",   # bottle (silinder panjang)
    84: "keris_unknown",   # book  (benda persegi panjang)
    77: "keris_unknown",   # teddy bear (fallback)
}

# Nama class COCO yang dikenali sebagai "mungkin keris"
COCO_PROXY_NAMES = {v for v in COCO_KERIS_PROXY.values()}
COCO_KERIS_CLASS_NAMES = {"knife", "scissors", "spoon", "bottle", "fork"}

# ── Knowledge base ────────────────────────────────────────────────────────────
def get_kb(kb_path=None):
    global _knowledge_base
    if _knowledge_base is None:
        if kb_path is None:
            kb_path = os.path.join(os.path.dirname(__file__), "knowledge_base.json")
        try:
            with open(kb_path, "r", encoding="utf-8") as f:
                _knowledge_base = json.load(f)
        except Exception as e:
            print(f"[detector] Warning: cannot load knowledge base: {e}")
            _knowledge_base = {}
    return _knowledge_base


def _build_dynamic_class_map(kb):
    """Baca label dari annotations_db.json dan buat CLASS_METADATA_MAP dinamis."""
    global _dynamic_class_map
    if _dynamic_class_map is not None:
        return _dynamic_class_map

    db_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        "dataset_keris", "metadata", "annotations_db.json"
    )

    confirmed_labels = set()
    if os.path.exists(db_path):
        try:
            with open(db_path, "r", encoding="utf-8") as f:
                db = json.load(f)
            for data in db.values():
                for box in data.get("boxes", []):
                    if box.get("confirmed") and box.get("label"):
                        confirmed_labels.add(box["label"])
        except Exception as e:
            print(f"[detector] Warning: cannot read annotations_db: {e}")

    # Default fallback jika annotations_db kosong
    if not confirmed_labels:
        confirmed_labels = {"keris_lurus", "keris_luk_3", "keris_luk_5",
                            "keris_luk_7", "keris_luk_9", "keris_luk_11",
                            "keris_luk_13", "keris_unknown"}

    def _meta_for_label(label: str) -> dict:
        """Buat metadata budaya berdasarkan label name secara dinamis."""
        luk_count = None
        luk_str   = "0"
        if "lurus" in label:
            luk_count = 0
            luk_str   = "0"
        elif "luk_" in label:
            try:
                luk_count = int(label.split("luk_")[-1].rstrip("_"))
                luk_str   = str(luk_count)
            except Exception:
                luk_count = None

        # Pilih dapur berdasarkan luk
        dapur_by_luk = {
            0:  "tilam_upih", 3: "carita", 5: "carita",
            7:  "jalak",      9: "sabuk_inten", 13: "sengkelat"
        }
        dapur_key = dapur_by_luk.get(luk_count, "jalak")

        dapur    = kb.get("dapur",   {}).get(dapur_key, {})
        pamor    = kb.get("pamor",   {}).get("beras_wutah", {})
        tangguh  = kb.get("tangguh", {}).get("madura", {})
        luk_info = kb.get("luk",     {}).get(luk_str, {})
        empu     = kb.get("empu",    {}).get("empu_aeng_tongtong", {})
        warangka = kb.get("warangka",{}).get("sandang_walikat", {})

        # Sesuaikan warangka
        if luk_count == 0:
            warangka = kb.get("warangka", {}).get("gayaman", warangka)
        elif luk_count and luk_count >= 9:
            warangka = kb.get("warangka", {}).get("ladrang", warangka)

        return {
            "dapur":    dapur,
            "pamor":    pamor,
            "tangguh":  tangguh,
            "luk_info": luk_info,
            "empu":     empu,
            "warangka": warangka,
            "luk_count": luk_count if luk_count is not None else "?",
        }

    _dynamic_class_map = {label: _meta_for_label(label) for label in confirmed_labels}
    # Selalu sertakan keris_unknown sebagai fallback
    if "keris_unknown" not in _dynamic_class_map:
        _dynamic_class_map["keris_unknown"] = _meta_for_label("keris_unknown")

    print(f"[detector] Class map built: {len(_dynamic_class_map)} classes from annotations_db.")
    return _dynamic_class_map


# ── Model loading ─────────────────────────────────────────────────────────────
def _candidate_model_paths():
    """Kembalikan daftar path model yang akan dicoba, dari yang paling diutamakan."""
    base = os.path.dirname(os.path.dirname(__file__))
    return [
        # 1. Model fine-tuned hasil training Google Colab (prioritas utama)
        os.path.join(base, "runs", "keris", "yolov26_madura_kris", "weights", "best.pt"),
        os.path.join(base, "runs", "keris", "weights", "best.pt"),
        os.path.join(base, "best.pt"),
        # 2. Pretrained YOLOv26
        os.path.join(base, "yolo26n.pt"),
        os.path.join(os.path.dirname(__file__), "yolo26n.pt"),
        # 3. Fallback YOLOv8 nano
        "yolov8n.pt",
    ]


def load_yolo_model():
    global _model_instance, _model_path_used
    if _model_instance is not None:
        return _model_instance, _model_path_used

    for path in _candidate_model_paths():
        try:
            if not os.path.exists(path) and "/" not in path and "\\" not in path:
                # Model nama saja (yolov8n.pt) → biarkan ultralytics download
                m = YOLO(path)
            elif os.path.exists(path):
                m = YOLO(path)
            else:
                continue
            _model_instance  = m
            _model_path_used = path
            print(f"[detector] Model loaded: {path}")
            return _model_instance, _model_path_used
        except Exception as e:
            print(f"[detector] Failed to load {path}: {e}")

    print("[detector] ERROR: No YOLO model could be loaded.")
    return None, None


def reload_model():
    """Paksa reload model (berguna setelah upload best.pt baru)."""
    global _model_instance, _model_path_used
    _model_instance  = None
    _model_path_used = None
    return load_yolo_model()


# ── Model info ────────────────────────────────────────────────────────────────
def get_model_info():
    """Kembalikan informasi model yang aktif untuk ditampilkan di frontend."""
    model, path = load_yolo_model()
    if model is None:
        return {
            "status":        "not_loaded",
            "model_file":    None,
            "is_finetuned":  False,
            "num_classes":   0,
            "class_names":   [],
            "message":       "Tidak ada model YOLO yang berhasil dimuat.",
        }

    # Cek apakah model sudah fine-tuned untuk keris
    class_names = list(model.names.values()) if hasattr(model, "names") else []
    is_finetuned = any("keris" in n.lower() for n in class_names)

    # Tentukan status
    if is_finetuned:
        status  = "finetuned_keris"
        message = f"Model fine-tuned keris aktif — {len(class_names)} kelas dikenali."
    elif "best.pt" in (path or ""):
        status  = "finetuned_keris"
        message = f"Model fine-tuned aktif ({os.path.basename(path)})."
        is_finetuned = True
    else:
        status  = "pretrained_coco"
        message = (
            "Model masih pretrained COCO (belum fine-tuned untuk keris). "
            "Deteksi menggunakan proxy COCO — akurasi rendah. "
            "Lakukan fine-tuning via Google Colab untuk hasil optimal."
        )

    return {
        "status":       status,
        "model_file":   os.path.basename(path) if path else None,
        "model_path":   path,
        "is_finetuned": is_finetuned,
        "num_classes":  len(class_names),
        "class_names":  class_names,
        "message":      message,
    }


# ── Cultural metadata ─────────────────────────────────────────────────────────
def get_keris_cultural_metadata(detected_class: str, confidence: float, kb_path=None):
    kb       = get_kb(kb_path)
    cls_map  = _build_dynamic_class_map(kb)

    label = detected_class.lower().strip()

    # Cari exact match dulu
    meta = cls_map.get(label)

    # Partial match
    if meta is None:
        for key, val in cls_map.items():
            if key in label or label in key:
                meta = val
                break

    # Fallback ke keris_unknown
    if meta is None:
        meta = cls_map.get("keris_unknown", {
            "dapur":    kb.get("dapur",   {}).get("jalak", {}),
            "pamor":    kb.get("pamor",   {}).get("beras_wutah", {}),
            "tangguh":  kb.get("tangguh", {}).get("madura", {}),
            "luk_info": kb.get("luk",     {}).get("0", {}),
            "empu":     kb.get("empu",    {}).get("empu_aeng_tongtong", {}),
            "warangka": kb.get("warangka",{}).get("gayaman", {}),
            "luk_count": "?",
        })

    return {
        "kelas_terdeteksi": detected_class,
        "confidence":       float(confidence),
        "status_budaya":    kb.get("status_budaya", {}),
        **meta,
    }


# ── Main detection ────────────────────────────────────────────────────────────
def run_detection(image_path_or_bytes, conf_threshold: float = 0.15, kb_path=None):
    """
    Jalankan deteksi YOLO pada gambar.

    Args:
        image_path_or_bytes: path string atau bytes gambar
        conf_threshold: minimum confidence (default 0.15 — lebih rendah dari default
                        YOLO 0.25 agar proxy COCO tetap bisa terdeteksi)
        kb_path: path opsional ke knowledge_base.json

    Returns:
        list of detection dicts
    """
    model, model_path = load_yolo_model()
    if model is None:
        return []

    # Baca gambar
    if isinstance(image_path_or_bytes, (str, bytes)) and isinstance(image_path_or_bytes, str):
        img_bgr = cv2.imread(image_path_or_bytes)
    else:
        nparr   = np.frombuffer(image_path_or_bytes, np.uint8)
        img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img_bgr is None:
        return []

    h, w, _ = img_bgr.shape
    info     = get_model_info()
    is_finetuned = info["is_finetuned"]

    # Turunkan threshold lebih lagi untuk pretrained COCO (agar proxy tetap muncul)
    effective_conf = conf_threshold if is_finetuned else min(conf_threshold, 0.10)

    results    = model.predict(img_bgr, conf=effective_conf, iou=0.45, verbose=False)
    detections = []

    for r in results:
        boxes = r.boxes or []
        for box in boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            xn = x1 / w;  yn = y1 / h
            wn = (x2 - x1) / w;  hn = (y2 - y1) / h

            conf      = float(box.conf[0].item())
            class_id  = int(box.cls[0].item())
            raw_name  = r.names.get(class_id, "unknown")

            # ── Tentukan label & apakah ini proxy ───────────────────────────
            if is_finetuned:
                # Model fine-tuned → gunakan class name langsung
                label    = raw_name
                is_proxy = False
            else:
                # Model COCO → cek apakah objek terdeteksi mirip keris
                if raw_name.lower() in COCO_KERIS_CLASS_NAMES or class_id in COCO_KERIS_PROXY:
                    label    = COCO_KERIS_PROXY.get(class_id, "keris_unknown")
                    is_proxy = True
                else:
                    # Objek COCO lain yang tidak relevan → lewati
                    continue

            cultural_meta = get_keris_cultural_metadata(label, conf, kb_path)

            detections.append({
                "bbox": {"x": xn, "y": yn, "w": wn, "h": hn},
                "confidence":    conf,
                "label":         label,
                "raw_coco_name": raw_name if is_proxy else label,
                "is_proxy":      is_proxy,
                "cultural_meta": cultural_meta,
            })

    # Jika model COCO dan 0 proxy terdeteksi, coba deteksi seluruh objek sebagai fallback
    # lalu ambil yang confidence tertinggi sebagai kandidat keris
    if not detections and not is_finetuned:
        results_any = model.predict(img_bgr, conf=0.05, iou=0.45, verbose=False)
        best_conf   = 0.0
        best_box    = None
        best_name   = "unknown"

        for r in results_any:
            for box in (r.boxes or []):
                c = float(box.conf[0].item())
                if c > best_conf:
                    best_conf = c
                    best_box  = box
                    best_name = r.names.get(int(box.cls[0].item()), "unknown")

        if best_box is not None:
            x1, y1, x2, y2 = best_box.xyxy[0].tolist()
            detections.append({
                "bbox": {
                    "x": x1/w, "y": y1/h,
                    "w": (x2-x1)/w, "h": (y2-y1)/h
                },
                "confidence":    best_conf,
                "label":         "keris_unknown",
                "raw_coco_name": best_name,
                "is_proxy":      True,
                "cultural_meta": get_keris_cultural_metadata("keris_unknown", best_conf, kb_path),
            })

    return detections
