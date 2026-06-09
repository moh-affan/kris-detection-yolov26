import os
import json
import cv2
import numpy as np
from ultralytics import YOLO

# Global detector instance
_model_instance = None
_knowledge_base = None

def get_kb(kb_path=None):
    global _knowledge_base
    if _knowledge_base is None:
        if kb_path is None:
            # Fallback path inside backend directory
            kb_path = os.path.join(os.path.dirname(__file__), 'knowledge_base.json')
        try:
            with open(kb_path, 'r') as f:
                _knowledge_base = json.load(f)
        except Exception as e:
            print(f"Error loading knowledge base: {e}")
            _knowledge_base = {}
    return _knowledge_base

def load_yolo_model(model_name="yolo26n.pt"):
    global _model_instance
    if _model_instance is None:
        try:
            # Loads the YOLOv26 model (will auto-download if not present)
            _model_instance = YOLO(model_name)
        except Exception as e:
            print(f"Error loading YOLO model: {e}")
            # Try to fall back to YOLOv8 if YOLO26 requires internet or newer package version
            try:
                _model_instance = YOLO("yolov8n.pt")
            except:
                _model_instance = None
    return _model_instance

def get_keris_cultural_metadata(detected_class, confidence, kb_path=None):
    kb = get_kb(kb_path)
    
    # Mapping table from YOLO classification outputs to KB keys
    CLASS_METADATA_MAP = {
        'keris_lurus': {
            'dapur': kb.get('dapur', {}).get('tilam_upih', {}),
            'pamor': kb.get('pamor', {}).get('beras_wutah', {}),
            'tangguh': kb.get('tangguh', {}).get('madura', {}),
            'luk_info': kb.get('luk', {}).get('0', {}),
            'empu': kb.get('empu', {}).get('empu_aeng_tongtong', {}),
            'warangka': kb.get('warangka', {}).get('gayaman', {}),
            'luk_count': 0
        },
        'keris_luk': {
            'dapur': kb.get('dapur', {}).get('carita', {}),
            'pamor': kb.get('pamor', {}).get('ngulit_semangka', {}),
            'tangguh': kb.get('tangguh', {}).get('madura', {}),
            'luk_info': kb.get('luk', {}).get('5', {}),
            'empu': kb.get('empu', {}).get('empu_aeng_tongtong', {}),
            'warangka': kb.get('warangka', {}).get('sandang_walikat', {}),
            'luk_count': 5
        },
        'keris_luk_9': {
            'dapur': kb.get('dapur', {}).get('sabuk_inten', {}),
            'pamor': kb.get('pamor', {}).get('wos_wutah', {}),
            'tangguh': kb.get('tangguh', {}).get('madura', {}),
            'luk_info': kb.get('luk', {}).get('9', {}),
            'empu': kb.get('empu', {}).get('empu_aeng_tongtong', {}),
            'warangka': kb.get('warangka', {}).get('ladrang', {}),
            'luk_count': 9
        },
        'keris_luk_13': {
            'dapur': kb.get('dapur', {}).get('sengkelat', {}),
            'pamor': kb.get('pamor', {}).get('ron_genduru', {}),
            'tangguh': kb.get('tangguh', {}).get('majapahit', {}),
            'luk_info': kb.get('luk', {}).get('13', {}),
            'empu': kb.get('empu', {}).get('empu_supo_mandrangi', {}),
            'warangka': kb.get('warangka', {}).get('ladrang', {}),
            'luk_count': 13
        },
        'keris_madura': {
            'dapur': kb.get('dapur', {}).get('jalak', {}),
            'pamor': kb.get('pamor', {}).get('blarak_sineret', {}),
            'tangguh': kb.get('tangguh', {}).get('madura', {}),
            'luk_info': kb.get('luk', {}).get('0', {}),
            'empu': kb.get('empu', {}).get('empu_aeng_tongtong', {}),
            'warangka': kb.get('warangka', {}).get('sandang_walikat', {}),
            'luk_count': 0
        }
    }
    
    # Matching logic
    det = detected_class.lower().strip()
    meta = CLASS_METADATA_MAP.get(det)
    if meta is None:
        for key in CLASS_METADATA_MAP:
            if key in det or det in key:
                meta = CLASS_METADATA_MAP[key]
                break
    if meta is None:
        # fallback
        meta = CLASS_METADATA_MAP['keris_madura']
        
    return {
        'kelas_terdeteksi': detected_class,
        'confidence': float(confidence),
        'status_budaya': kb.get('status_budaya', {}),
        **meta
    }

def run_detection(image_path_or_bytes, model_name="yolo26n.pt", kb_path=None):
    model = load_yolo_model(model_name)
    if model is None:
        return []

    # Read image
    if isinstance(image_path_or_bytes, str):
        img_bgr = cv2.imread(image_path_or_bytes)
    else:
        nparr = np.frombuffer(image_path_or_bytes, np.uint8)
        img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img_bgr is None:
        return []

    h, w, _ = img_bgr.shape
    
    # Run YOLO detection
    results = model.predict(img_bgr, verbose=False)
    detections = []
    
    for r in results:
        boxes = r.boxes or []
        for box in boxes:
            # Coordinates
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            # Normalized
            xn = x1 / w
            yn = y1 / h
            wn = (x2 - x1) / w
            hn = (y2 - y1) / h
            
            conf = box.conf[0].item()
            class_id = int(box.cls[0].item())
            class_name = r.names.get(class_id, "keris_unknown")
            
            # Link with knowledge base metadata
            cultural_meta = get_keris_cultural_metadata(class_name, conf, kb_path)
            
            detections.append({
                "bbox": {
                    "x": xn,
                    "y": yn,
                    "w": wn,
                    "h": hn
                },
                "confidence": conf,
                "label": class_name,
                "cultural_meta": cultural_meta
            })
            
    return detections
