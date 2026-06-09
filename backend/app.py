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

@app.get("/api/images")
def list_images():
    """List all crawled images with annotation status from db."""
    db = load_annotations_db()
    images_list = []
    
    if not os.path.exists(IMAGES_DIR):
        return []
        
    for root, dirs, files in os.walk(IMAGES_DIR):
        for file in files:
            if file.lower().endswith(('.jpg', '.jpeg', '.png')):
                # Get category from parent folder name
                class_folder = os.path.basename(root)
                rel_path = os.path.relpath(os.path.join(root, file), IMAGES_DIR).replace('\\', '/')
                
                # Check annotation db
                status = db.get(rel_path, {}).get("status", "pending")
                boxes = db.get(rel_path, {}).get("boxes", [])
                
                images_list.append({
                    "filename": file,
                    "rel_path": rel_path,
                    "class_folder": class_folder,
                    "status": status,
                    "boxes": boxes
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
            boxes.append({
                "id": float(1000 + idx),
                "x": det["bbox"]["x"],
                "y": det["bbox"]["y"],
                "w": det["bbox"]["w"],
                "h": det["bbox"]["h"],
                "label": det["label"],
                "dhapur": c_meta.get("dapur", {}).get("nama", ""),
                "pamor": c_meta.get("pamor", {}).get("nama", ""),
                "tangguh": c_meta.get("tangguh", {}).get("nama", ""),
                "luk": c_meta.get("luk_count", None),
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
