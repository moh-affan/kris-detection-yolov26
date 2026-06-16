import os
import json
import cv2
import numpy as np
from ultralytics import YOLO, SAM

# ── Global singletons ─────────────────────────────────────────────────────────
_model_instance   = None
_model_path_used  = None
_sam_model_instance = None    # cache SAM (mobile_sam.pt) untuk segment-everything & klik
_knowledge_base   = None
_dynamic_class_map = None  # {class_name: kb_meta} dibaca dari annotations_db

# ── Konfigurasi SAM segment-everything (pre-annotate) ─────────────────────────
# Filter mask: buang yang lebih kecil dari ambang ini (fraksi area gambar)
SAM_MIN_AREA_FRAC = 0.02
# NMS dedup: dua mask dengan IoU bbox > ambang ini dianggap duplikat → simpan yg lebih besar
SAM_NMS_IOU       = 0.70
# Eliminasi background: buang mask yang area-nya > ambang ini (fraksi area gambar)
SAM_BG_MAX_AREA_FRAC = 0.85
# Eliminasi background: buang mask yang menyentuh >= ambang ini dari 4 sisi gambar
SAM_BG_MIN_BORDER_TOUCH = 3
# Dedup nesting: mask yang >ambang ini terkandung dalam mask lain → buang (sisanya duplikat)
SAM_CONTAINMENT_FRAC = 0.90
# Path SAM model (mobile_sam.pt ringan ~40MB, cocok CPU)
_SAM_MODEL_PATH   = os.path.join(os.path.dirname(os.path.dirname(__file__)), "mobile_sam.pt")

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
        dapur_key = dapur_by_luk.get(luk_count, "jalak") # type: ignore

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

    try:
        import torch
        device = "cuda" if torch.cuda.is_available() else "cpu" # type: ignore
    except Exception:
        device = "cpu"

    for path in _candidate_model_paths():
        try:
            if not os.path.exists(path) and "/" not in path and "\\" not in path:
                # Model nama saja (yolov8n.pt) → biarkan ultralytics download
                m = YOLO(path)
            elif os.path.exists(path):
                m = YOLO(path)
            else:
                continue
            
            if device == "cuda":
                m.to(device)
                print(f"[detector] YOLO Model loaded and moved to GPU ({device}): {path}")
            else:
                print(f"[detector] YOLO Model loaded on CPU: {path}")

            _model_instance  = m
            _model_path_used = path
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


# ── SAM (Segment Anything Model) loading ──────────────────────────────────────
def load_sam_model():
    """
    Muat & cache singleton SAM (mobile_sam.pt). Dipakai bersama oleh pre-annotate
    (segment-everything) dan klik-segmentasi (/api/segment-click) agar tidak
    me-load model 40MB berulang-ulang.

    Returns: (model, path) atau (None, None) bila gagal.
    """
    global _sam_model_instance
    if _sam_model_instance is not None:
        return _sam_model_instance, _SAM_MODEL_PATH

    if not os.path.exists(_SAM_MODEL_PATH):
        print(f"[detector] SAM model tidak ditemukan: {_SAM_MODEL_PATH}")
        return None, None

    try:
        import torch
        device = "cuda" if torch.cuda.is_available() else "cpu" # type: ignore
    except Exception:
        device = "cpu"

    try:
        model = SAM(_SAM_MODEL_PATH)
        if device == "cuda":
            model.to(device)
            print(f"[detector] SAM loaded and moved to GPU ({device}): {_SAM_MODEL_PATH}")
        else:
            print(f"[detector] SAM loaded on CPU: {_SAM_MODEL_PATH}")
        _sam_model_instance = model
    except Exception as e:
        print(f"[detector] Gagal load SAM: {e}")
        _sam_model_instance = None
        return None, None

    return _sam_model_instance, _SAM_MODEL_PATH


def reload_sam_model():
    """Paksa reload SAM singleton."""
    global _sam_model_instance
    _sam_model_instance = None
    return load_sam_model()


def _bbox_iou(a, b):
    """IoU dua bbox (x,y,w,h)."""
    ax2, ay2 = a["x"] + a["w"], a["y"] + a["h"]
    bx2, by2 = b["x"] + b["w"], b["y"] + b["h"]
    ix1, iy1 = max(a["x"], b["x"]), max(a["y"], b["y"])
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    iw, ih = max(0.0, ix2 - ix1), max(0.0, iy2 - iy1)
    inter = iw * ih
    union = a["w"] * a["h"] + b["w"] * b["h"] - inter
    return inter / union if union > 0 else 0.0


def _mask_border_touches(mask_bool):
    """Hitung berapa dari 4 sisi gambar (atas/bawah/kiri/kanan) yang dilewati mask.

    Mask raster boolean (HxW). 'Dilewati' = ada pixel True di baris/kolom tepi.
    Objek foreground hampir tak pernah menyentuh banyak sisi; background hampir
    selalu menyentuh 2-4 sisi (lantai/dinding/kain menyebar ke pinggir foto).
    """
    top    = bool(mask_bool[0, :].any())
    bottom = bool(mask_bool[-1, :].any())
    left   = bool(mask_bool[:, 0].any())
    right  = bool(mask_bool[:, -1].any())
    return int(top) + int(bottom) + int(left) + int(right)


def _mask_containment(inner_bool, outer_bool):
    """Fraksi pixel inner yang juga termasuk outer (intersection / inner area).

    Dipakai untuk dedup mask bertingkat/bersarang khas SAM (mis. bilah utuh vs
    bagian daun/gagang yang sebagian besar tumpang-tindih).
    """
    inner_sum = int(inner_bool.sum())
    if inner_sum == 0:
        return 0.0
    return float(np.logical_and(inner_bool, outer_bool).sum()) / float(inner_sum)


def run_sam_segmentation(image_path):
    """
    Jalankan SAM "segment everything" (predict tanpa prompt) untuk menandai
    semua objek dalam gambar secara class-agnostic, dengan eliminasi background
    dan dedup mask bertingkat.

    Filter yang diterapkan (berurutan):
      1. area terlalu kecil        (< SAM_MIN_AREA_FRAC)
      2. background                (area > SAM_BG_MAX_AREA_FRAC ATAU
                                    menyentuh >= SAM_BG_MIN_BORDER_TOUCH sisi)
      3. NMS duplikat tumpang-tindih (IoU bbox > SAM_NMS_IOU)
      4. containment nesting       (> SAM_CONTAINMENT_FRAC pixel terkandung
                                    dalam mask lain → buang)

    Returns: list of dict, diurutkan area menurun:
        [{
            "bbox":      {"x","y","w","h"},   # normalized 0-1
            "polygon":   [[x,y], ...],         # normalized 0-1, sudah disimplify
            "area_frac": float                 # fraksi area gambar
        }, ...]
    """
    model, _ = load_sam_model()
    if model is None:
        return []

    img_bgr = cv2.imread(image_path) if isinstance(image_path, str) else None
    if isinstance(image_path, (bytes, bytearray)):
        img_bgr = cv2.imdecode(np.frombuffer(image_path, np.uint8), cv2.IMREAD_COLOR)
    if img_bgr is None:
        print("[detector] run_sam_segmentation: gambar tidak terbaca.")
        return []

    h, w = img_bgr.shape[:2]
    img_area = float(h * w)

    # 1 inference, tanpa prompt → segment everything
    try:
        import torch
        device = "cuda" if torch.cuda.is_available() else "cpu"  # type: ignore
    except Exception:
        device = "cpu"

    try:
        results = model.predict(source=img_bgr, device=device, verbose=False)
    except Exception as e:
        print(f"[detector] SAM predict gagal (no-prompt): {e}")
        return []

    res0 = results[0] if results else None
    if res0 is None or res0.masks is None or res0.masks.xy is None:
        return []

    # Raster mask untuk border-touch & containment. masks.data: torch tensor (N,H,W)
    masks_bool = None
    try:
        md = res0.masks.data
        # md bisa torch.Tensor → konversi ke numpy dulu sebelum astype
        if hasattr(md, "cpu"):
            md = md.cpu().numpy()
        md = np.asarray(md)
        masks_bool = md.astype(bool)
    except Exception as e:
        print(f"[detector] SAM masks.data tidak terbaca (border/containment skip): {e}")

    # Kumpulkan kandidat mask
    candidates = []
    for idx, mask_pts in enumerate(res0.masks.xy):
        if mask_pts is None or len(mask_pts) < 5:
            continue
        pts = mask_pts.astype(np.float32)

        # bbox dari ekstrem polygon
        xs, ys = pts[:, 0], pts[:, 1]
        min_x, max_x = float(np.min(xs)), float(np.max(xs))
        min_y, max_y = float(np.min(ys)), float(np.max(ys))
        bw = max_x - min_x
        bh = max_y - min_y
        area_frac = (bw * bh) / img_area if img_area > 0 else 0.0

        # (1) Filter area terlalu kecil
        if area_frac < SAM_MIN_AREA_FRAC:
            continue

        # Raster mask untuk kandidat ini (jika tersedia)
        cand_mask = None
        if masks_bool is not None and idx < masks_bool.shape[0]:
            cand_mask = masks_bool[idx]

        # (2) Filter background:
        #   (2a) area sangat besar (mendekati seluruh gambar)
        #   (2b) menyentuh banyak tepi gambar (border-touch)
        is_bg = False
        if area_frac > SAM_BG_MAX_AREA_FRAC:
            is_bg = True
        elif cand_mask is not None and _mask_border_touches(cand_mask) >= SAM_BG_MIN_BORDER_TOUCH:
            is_bg = True
        if is_bg:
            continue

        # Simplify polygon (kurangi payload jaringan)
        epsilon = 0.003 * cv2.arcLength(pts.astype(np.int32), True)
        approx = cv2.approxPolyDP(pts.astype(np.int32), epsilon, True)
        polygon = [[float(p[0][0] / w), float(p[0][1] / h)] for p in approx]
        if len(polygon) < 3:
            continue

        candidates.append({
            "bbox": {
                "x": min_x / w,
                "y": min_y / h,
                "w": bw / w,
                "h": bh / h,
            },
            "polygon":   polygon,
            "area_frac": area_frac,
            "_mask":     cand_mask,
        })

    # Sort menurun berdasar area: (3) NMS dedup + (4) containment dedup.
    # Iterasi dari terbesar → simpan jika tidak tumpang-tindih/terkandung dlm kept.
    candidates.sort(key=lambda c: c["area_frac"], reverse=True)
    kept = []
    for cand in candidates:
        dup = False
        for k in kept:
            # (3) NMS tumpang-tindih berdasar IoU bbox
            if _bbox_iou(cand["bbox"], k["bbox"]) > SAM_NMS_IOU:
                dup = True
                break
            # (4) Containment: cand terkandung dalam k (>90% pixel cand ada di k)
            if (cand["_mask"] is not None and k["_mask"] is not None
                    and _mask_containment(cand["_mask"], k["_mask"]) > SAM_CONTAINMENT_FRAC):
                dup = True
                break
        if not dup:
            kept.append(cand)

    # Bersihkan field internal sebelum return
    for c in kept:
        c.pop("_mask", None)
    return kept


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
        message = f"Model fine-tuned aktif ({os.path.basename(path)})." # type: ignore
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
        "confidence":       confidence,
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

    try:
        import torch
        device = "cuda" if torch.cuda.is_available() else "cpu"  # type: ignore
    except Exception:
        device = "cpu"

    results    = model.predict(img_bgr, conf=effective_conf, iou=0.45, device=device, verbose=False)
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
    # lalu masukkan semua objek tersebut sebagai kandidat keris_unknown
    if not detections and not is_finetuned:
        results_any = model.predict(img_bgr, conf=0.05, iou=0.45, device=device, verbose=False)
        for r in results_any:
            for box in (r.boxes or []):
                c = float(box.conf[0].item())
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                name = r.names.get(int(box.cls[0].item()), "unknown")
                detections.append({
                    "bbox": {
                        "x": x1/w, "y": y1/h,
                        "w": (x2-x1)/w, "h": (y2-y1)/h
                    },
                    "confidence":    c,
                    "label":         "keris_unknown",
                    "raw_coco_name": name,
                    "is_proxy":      True,
                    "cultural_meta": get_keris_cultural_metadata("keris_unknown", c, kb_path),
                })

    return detections
