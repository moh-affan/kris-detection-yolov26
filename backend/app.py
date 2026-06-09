import os
import json
import csv
import shutil
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Optional
from bs4 import BeautifulSoup

import crawler
import detector

app = FastAPI(title="YOLOv26 Kris Detection & Classification API")

# Allow CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Workspace directories
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(BASE_DIR, "dataset_keris")
IMAGES_DIR = os.path.join(OUTPUT_DIR, "images")
METADATA_DIR = os.path.join(OUTPUT_DIR, "metadata")
LABELS_DIR = os.path.join(OUTPUT_DIR, "labels")

# Ensure folders exist
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(IMAGES_DIR, exist_ok=True)
os.makedirs(METADATA_DIR, exist_ok=True)
os.makedirs(LABELS_DIR, exist_ok=True)

# Helper function to get annotations file
def get_annotations_file_path():
    return os.path.join(METADATA_DIR, "annotations_db.json")

def load_annotations_db():
    path = get_annotations_file_path()
    if os.path.exists(path):
        try:
            with open(path, "r") as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_annotations_db(db):
    path = get_annotations_file_path()
    with open(path, "w") as f:
        json.dump(db, f, indent=2)

class BBoxItem(BaseModel):
    id: float
    x: float  # Normalized 0-1
    y: float
    w: float
    h: float
    label: str
    dhapur: Optional[str] = ""
    pamor: Optional[str] = ""
    tangguh: Optional[str] = ""
    luk: Optional[int] = None
    confirmed: bool
    polygon: Optional[List[List[float]]] = None

class SaveAnnotationRequest(BaseModel):
    filename: str
    class_folder: str  # YOLO category class subfolder
    boxes: List[BBoxItem]

@app.get("/api/crawler/status")
def get_crawler_status():
    return crawler.crawler_state

@app.post("/api/crawler/start")
def start_crawler_endpoint(max_pages: int = Form(5)):
    success = crawler.start_crawler(max_pages, OUTPUT_DIR)
    if success:
        return {"status": "started", "message": f"Crawler started scanning {max_pages} pages."}
    else:
        return {"status": "ignored", "message": "Crawler is already running."}

def load_crawler_metadata_map():
    metadata_map = {}
    checkpoint_path = os.path.join(METADATA_DIR, 'checkpoint.json')
    final_json_path = os.path.join(METADATA_DIR, 'dataset_keris_metadata.json')
    
    for path in [checkpoint_path, final_json_path]:
        if os.path.exists(path):
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for item in data:
                        imgs = item.get("gambar_disimpan", [])
                        # Fallback for dataset_keris_metadata.json which might not have gambar_disimpan list directly
                        if not imgs and item.get("gambar_utama"):
                            # Match using image basename from image URL or title slug
                            pass
                        for img in imgs:
                            metadata_map[img] = {
                                "url": item.get("url", ""),
                                "judul": item.get("judul", ""),
                                "dhapur": item.get("dhapur", ""),
                                "pamor": item.get("pamor", ""),
                                "tangguh": item.get("tangguh", ""),
                                "luk": item.get("luk", None),
                                "harga": item.get("harga", ""),
                                "kode_produk": item.get("kode_produk", ""),
                                "status": item.get("status", ""),
                                "deskripsi": item.get("deskripsi", ""),
                                "kategori": item.get("kategori", [])
                            }
            except Exception as e:
                print(f"Error reading metadata from {path}: {e}")
    return metadata_map

@app.get("/api/images")
def list_images():
    """List all crawled images with annotation status from db."""
    db = load_annotations_db()
    images_list = []
    
    if not os.path.exists(IMAGES_DIR):
        return []
        
    meta_map = load_crawler_metadata_map()
        
    for root, dirs, files in os.walk(IMAGES_DIR):
        for file in files:
            if file.lower().endswith(('.jpg', '.jpeg', '.png')):
                # Get category from parent folder name
                class_folder = os.path.basename(root)
                rel_path = os.path.relpath(os.path.join(root, file), IMAGES_DIR).replace('\\', '/')
                
                # Check annotation db
                status = db.get(rel_path, {}).get("status", "pending")
                boxes = db.get(rel_path, {}).get("boxes", [])
                
                # Parse filename clues using crawler parser
                meta = crawler.parse_product_page(
                    file, 
                    BeautifulSoup(f"<h1>{file}</h1>", 'html.parser')
                )
                
                # Retrieve crawled metadata reference
                crawled_info = meta_map.get(file, None)
                
                images_list.append({
                    "filename": file,
                    "rel_path": rel_path,
                    "class_folder": class_folder,
                    "status": status,
                    "boxes": boxes,
                    "dhapur_clue": meta.get("dhapur", ""),
                    "pamor_clue": meta.get("pamor", ""),
                    "tangguh_clue": meta.get("tangguh", ""),
                    "luk_clue": meta.get("luk", None),
                    "crawled_meta": crawled_info
                })
    return images_list

@app.get("/api/images/serve")
def serve_image(path: str = Query(...)):
    """Serve local images directly."""
    full_path = os.path.abspath(os.path.join(IMAGES_DIR, path))
    if not str(full_path).lower().startswith(str(os.path.abspath(IMAGES_DIR)).lower()):
         raise HTTPException(status_code=403, detail="Access denied")
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(full_path)

@app.post("/api/annotations/save")
def save_annotation(req: SaveAnnotationRequest):
    db = load_annotations_db()
    
    # Target image paths
    rel_path = f"{req.class_folder}/{req.filename}".replace('\\', '/')
    full_img_path = os.path.join(IMAGES_DIR, req.class_folder, req.filename)
    
    if not os.path.exists(full_img_path):
        raise HTTPException(status_code=404, detail=f"Image {rel_path} not found")

    # Update state
    db[rel_path] = {
      "status": "done" if len(req.boxes) > 0 else "skip",
      "boxes": [box.model_dump() for box in req.boxes]
    }
    save_annotations_db(db)

    # 1. Save YOLO txt label files next to labels/class_folder/filename.txt
    label_sub_dir = os.path.join(LABELS_DIR, req.class_folder)
    os.makedirs(label_sub_dir, exist_ok=True)
    
    txt_filename = os.path.splitext(req.filename)[0] + ".txt"
    txt_filepath = os.path.join(label_sub_dir, txt_filename)
    
    # We must construct class mapping dynamically or statically
    # For now, map class names to IDs statically or sequentially
    # Let's map label_yolo categories:
    labels_mapping = ["keris_lurus", "keris_luk_3", "keris_luk_5", "keris_luk_7", "keris_luk_9", "keris_luk_11", "keris_luk_13", "keris_madura", "keris_majapahit", "keris_mataram", "keris_unknown"]
    
    with open(txt_filepath, "w") as f:
        for box in req.boxes:
            if not box.confirmed:
                continue
            # Get class ID
            try:
                class_id = labels_mapping.index(box.label)
            except ValueError:
                class_id = len(labels_mapping) - 1 # default to keris_unknown
                
            # YOLO Format: class_id center_x center_y width height
            cx = box.x + box.w / 2
            cy = box.y + box.h / 2
            f.write(f"{class_id} {cx:.6f} {cy:.6f} {box.w:.6f} {box.h:.6f}\n")

    # 2. Re-export centralized CSV file
    csv_path = os.path.join(METADATA_DIR, "dataset_keris_metadata.csv")
    with open(csv_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(["filename", "class_folder", "box_id", "x_center", "y_center", "width", "height", "label", "dhapur", "pamor", "tangguh", "luk", "confirmed"])
        for img_rel_path, data in db.items():
            folder, name = os.path.split(img_rel_path)
            for idx, box in enumerate(data.get("boxes", [])):
                cx = box["x"] + box["w"] / 2
                cy = box["y"] + box["h"] / 2
                writer.writerow([
                    name, folder, idx, 
                    f"{cx:.4f}", f"{cy:.4f}", f"{box['w']:.4f}", f"{box['h']:.4f}",
                    box["label"], box.get("dhapur", ""), box.get("pamor", ""), box.get("tangguh", ""), box.get("luk", ""), "yes" if box["confirmed"] else "no"
                ])

    return {"status": "success", "message": "Annotation saved successfully."}

@app.post("/api/images/delete")
def delete_image_endpoint(filename: str = Form(...), class_folder: str = Form(...)):
    # 1. Target image paths
    rel_path = f"{class_folder}/{filename}".replace('\\', '/')
    full_img_path = os.path.join(IMAGES_DIR, class_folder, filename)
    txt_filename = os.path.splitext(filename)[0] + ".txt"
    full_txt_path = os.path.join(LABELS_DIR, class_folder, txt_filename)
    
    # Path traversal validation
    if not os.path.abspath(full_img_path).lower().startswith(os.path.abspath(IMAGES_DIR).lower()):
        raise HTTPException(status_code=403, detail="Access denied")
        
    # Delete image file
    if os.path.exists(full_img_path):
        os.remove(full_img_path)
    else:
        raise HTTPException(status_code=404, detail="Image not found")
        
    # Delete txt label file if exists
    if os.path.exists(full_txt_path):
        os.remove(full_txt_path)
        
    # Remove from annotations db
    db = load_annotations_db()
    if rel_path in db:
        del db[rel_path]
        save_annotations_db(db)
        
    # Re-export CSV
    csv_path = os.path.join(METADATA_DIR, "dataset_keris_metadata.csv")
    with open(csv_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(["filename", "class_folder", "box_id", "x_center", "y_center", "width", "height", "label", "dhapur", "pamor", "tangguh", "luk", "confirmed"])
        for img_rel_path, data in db.items():
            folder, name = os.path.split(img_rel_path)
            for idx, box in enumerate(data.get("boxes", [])):
                cx = box["x"] + box["w"] / 2
                cy = box["y"] + box["h"] / 2
                writer.writerow([
                    name, folder, idx, 
                    f"{cx:.4f}", f"{cy:.4f}", f"{box['w']:.4f}", f"{box['h']:.4f}",
                    box["label"], box.get("dhapur", ""), box.get("pamor", ""), box.get("tangguh", ""), box.get("luk", ""), "yes" if box["confirmed"] else "no"
                ])
                
    return {"status": "success", "message": f"Image {filename} deleted successfully."}

@app.post("/api/ai-suggest")
def ai_suggest(filename: str = Form(...), class_folder: str = Form(...)):
    """Local offline suggestion: check filename clues, and run YOLO26 detector on the file."""
    # 1. Parse clues from filename
    meta = crawler.parse_product_page(
        filename, 
        BeautifulSoup(f"<h1>{filename}</h1>", 'html.parser')
    )
    
    # 2. Run local detector to see if we can find exact coordinates
    full_path = os.path.join(IMAGES_DIR, class_folder, filename)
    boxes = []
    
    if os.path.exists(full_path):
        detections = detector.run_detection(full_path)
        for idx, det in enumerate(detections):
            # Map detection results back to box list
            c_meta = det["cultural_meta"]
            
            # Map COCO labels (like knife, person, tie) to the custom keris label parsed from filename/folder
            assigned_label = det["label"] if det["label"].startswith("keris_") else (meta["label_yolo"] or "keris_unknown")
            
            # Combine coordinates from detector with filename clues (which are highly accurate for dapur/pamor/luk)
            boxes.append({
                "id": float(1000 + idx),
                "x": det["bbox"]["x"],
                "y": det["bbox"]["y"],
                "w": det["bbox"]["w"],
                "h": det["bbox"]["h"],
                "label": assigned_label,
                "dhapur": meta["dhapur"] or c_meta.get("dapur", {}).get("nama", "") or "",
                "pamor": meta["pamor"] or c_meta.get("pamor", {}).get("nama", "") or "",
                "tangguh": meta["tangguh"] or c_meta.get("tangguh", {}).get("nama", "") or "",
                "luk": meta["luk"] if meta["luk"] is not None else c_meta.get("luk_count", None),
                "confirmed": False
            })

    # If YOLO didn't find boxes, create a default candidate box covering most of the image
    if not boxes:
        boxes.append({
            "id": float(1000),
            "x": 0.2,
            "y": 0.1,
            "w": 0.6,
            "h": 0.8,
            "label": meta["label_yolo"] or "keris_unknown",
            "dhapur": meta["dhapur"] or "",
            "pamor": meta["pamor"] or "",
            "tangguh": meta["tangguh"] or "",
            "luk": meta["luk"],
            "confirmed": False
        })
        
    return {
        "filename": filename,
        "meta": meta,
        "boxes": boxes
    }

@app.post("/api/segment-click")
def segment_click(
    filename: str = Form(...),
    class_folder: str = Form(...),
    x: float = Form(...),
    y: float = Form(...)
):
    import cv2
    import numpy as np
    
    full_path = os.path.join(IMAGES_DIR, class_folder, filename)
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="Image not found")
        
    img = cv2.imread(full_path)
    if img is None:
        raise HTTPException(status_code=400, detail="Cannot read image")
        
    h, w, _ = img.shape
    px = int(x * w)
    py = int(y * h)
    
    # 1. Grayscale and Gaussian blur
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    target_contour = None
    min_area = 200
    
    # LEVEL A: Otsu's Global Thresholding (excellent for high contrast solid shapes on uniform backgrounds)
    _, thresh_otsu = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    kernel_otsu = cv2.getStructuringElement(cv2.MORPH_RECT, (9, 9))
    closed_otsu = cv2.morphologyEx(thresh_otsu, cv2.MORPH_CLOSE, kernel_otsu)
    contours, _ = cv2.findContours(closed_otsu, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < min_area:
            continue
        dist = cv2.pointPolygonTest(cnt, (float(px), float(py)), False)
        if dist >= 0:
            target_contour = cnt
            break
            
    # LEVEL B: Large-Block Adaptive Thresholding (if global threshold failed)
    if target_contour is None:
        thresh_adapt = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY_INV, 101, 2
        )
        kernel_adapt = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
        closed_adapt = cv2.morphologyEx(thresh_adapt, cv2.MORPH_CLOSE, kernel_adapt)
        contours, _ = cv2.findContours(closed_adapt, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < min_area:
                continue
            dist = cv2.pointPolygonTest(cnt, (float(px), float(py)), False)
            if dist >= 0:
                target_contour = cnt
                break
                
    # LEVEL C: Canny Edges with Large Morphological Closing (to connect long curves like luk wave contours)
    if target_contour is None:
        edges = cv2.Canny(blurred, 20, 100)
        kernel_canny = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 25))
        closed_canny = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel_canny)
        contours, _ = cv2.findContours(closed_canny, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < min_area:
                continue
            dist = cv2.pointPolygonTest(cnt, (float(px), float(py)), False)
            if dist >= 0:
                target_contour = cnt
                break

    # LEVEL D: Flood Fill with generous tolerance as final fallback
    polygon = None
    if target_contour is None:
        mask = np.zeros((h + 2, w + 2), np.uint8)
        img_temp = img.copy()
        try:
            # Increased tolerance from 15 to 35 to span gradients/reflections on metallic blade
            cv2.floodFill(img_temp, mask, (px, py), (255, 0, 0), (35, 35, 35), (35, 35, 35), 4 | (255 << 8) | cv2.FLOODFILL_MASK_ONLY)
            
            # Find coordinates from mask
            pts = np.argwhere(mask == 255)
            if len(pts) > 0:
                min_y, min_x = pts.min(axis=0)
                max_y, max_x = pts.max(axis=0)
                
                rx = int(min_x - 1)
                ry = int(min_y - 1)
                rw = int(max_x - min_x)
                rh = int(max_y - min_y)
                
                if rw > 10 and rh > 10:
                    # Find contour from mask to draw overlay polygon
                    sub_contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                    if len(sub_contours) > 0:
                        cnt = max(sub_contours, key=cv2.contourArea)
                        epsilon = 0.002 * cv2.arcLength(cnt, True)
                        approx = cv2.approxPolyDP(cnt, epsilon, True)
                        # Offset by -1 because mask is padded
                        polygon = [[float((pt[0][0] - 1) / w), float((pt[0][1] - 1) / h)] for pt in approx]
                        
                    box = {
                        "x": float(rx / w),
                        "y": float(ry / h),
                        "w": float(rw / w),
                        "h": float(rh / h)
                    }
                    return {"status": "success", "box": box, "polygon": polygon}
        except:
            pass

    if target_contour is not None:
        rx, ry, rw, rh = cv2.boundingRect(target_contour)
        
        # Simplify contour to reduce network payload
        epsilon = 0.002 * cv2.arcLength(target_contour, True)
        approx = cv2.approxPolyDP(target_contour, epsilon, True)
        polygon = [[float(pt[0][0] / w), float(pt[0][1] / h)] for pt in approx]
        
        box = {
            "x": float(rx / w),
            "y": float(ry / h),
            "w": float(rw / w),
            "h": float(rh / h)
        }
        return {"status": "success", "box": box, "polygon": polygon}
        
    # Final fallback default box (no polygon)
    box = {
        "x": float(max(0.0, x - 0.1)),
        "y": float(max(0.0, y - 0.2)),
        "w": float(min(0.2, 1.0 - x)),
        "h": float(min(0.4, 1.0 - y))
    }
    return {"status": "success", "box": box, "polygon": None}


@app.post("/api/detect")
async def detect_object(file: UploadFile = File(...)):
    """Run real-time YOLO26 inference and cultural mapping on uploaded image."""
    try:
        contents = await file.read()
        detections = detector.run_detection(contents)
        return {"detections": detections}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
