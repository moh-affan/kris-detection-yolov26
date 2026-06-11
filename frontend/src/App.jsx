import { useState, useRef, useEffect } from "react";
import { 
  Database, 
  Edit3, 
  Eye, 
  Play, 
  Terminal, 
  Check, 
  Trash, 
  Upload, 
  ChevronRight, 
  RefreshCw, 
  FileText, 
  Sliders, 
  Info,
  Maximize2,
  ListFilter
} from "lucide-react";

// Colors (Gold-Teal cultural aesthetic)
const GOLD   = "#C9A84C";
const DARK   = "#0f0800";
const DARK2  = "#1a0e00";
const DARK3  = "#2a1c00";
const CREAM  = "#f5e6c8";
const MUTED  = "#9a8060";
const TEAL   = "#4ECDC4";
const RED    = "#e74c3c";
const GREEN  = "#2ecc71";

const DHAPUR_LIST = [
  "Brojol","Tilam Upih","Tilam Sari","Sengkelat","Sabuk Inten",
  "Jalak","Jalak Ngore","Jalak Dinding","Jalak Budha","Jalak Sangu Tumpeng",
  "Sempaner","Sempana","Carita","Carang Soka","Condong Campur",
  "Pandawa","Pulanggeni","Parungsari","Naga Siluman","Naga Sapta",
  "Pasopati","Damar Murub","Semar","Karno Tinanding","Mundarang",
  "Singo Barong","Sinom","Pleret","Tumenggung","Klika Benda",
  "Kebo Lajer","Kidang Mas","Panimbal","Mangkurat"
];
const PAMOR_LIST = [
  "Beras Wutah","Blarak Sineret","Ngulit Semangka","Wos Wutah",
  "Ron Genduru","Pedaringan Kebak","Bonang Rinenteng","Bendo Segodo",
  "Brahma Watu","Jung Isi Dunyo","Putri Kinurung","Tejo Kinurung",
  "Junjung Derajat","Sumsum Buron","Rojo Gundolo","Lar Gangsir",
  "Tunggak Semi","Udan Mas","Tirta Teja","Wengkon","Kendit",
  "Mrutu Sewu","Kupu Tarung","Tambal","Kelengan","Untu Walang",
  "Lintang Kemukus","Wahyu Tumurun","Sekar Susun","Manggar",
  "Sodo Lanang","Kulit Semangka"
];
const TANGGUH_LIST = [
  "Madura","Majapahit","Mataram Sultan Agung","Mataram Senopaten",
  "Mataram Amangkurat","Mataram HB","Mataram PB","Pajajaran",
  "Pajang","Demak","Cirebon","Tuban","Singosari","Blambangan",
  "Bali","Bugis","Madiun","Kahuripan","Mangkunegaran","Kamardikan"
];
const LUK_LIST = [0,3,5,7,9,11,13,15,17,19];
const LUK_MAKNA = {
  0:  "Lurus — Kejujuran, kepolosan, kesederhanaan",
  3:  "Luk 3 — Trimurti: Keseimbangan penciptaan, pemeliharaan & peleburan",
  5:  "Luk 5 — Pancaindra, lambang kesempurnaan manusia",
  7:  "Luk 7 — Derajat kewibawaan dan peningkatan spiritual",
  9:  "Luk 9 — Kepemimpinan spiritual / Wali Songo",
  11: "Luk 11 — Kesempurnaan kekuatan batin dan perlindungan",
  13: "Luk 13 — Kesakralan tertinggi, kekuatan magis raja/panglima",
};

// Autocomplete Component
function Autocomplete({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(value || "");
  const ref = useRef(null);

  useEffect(() => { setQ(value || ""); }, [value]);
  useEffect(() => {
    const clickOutside = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);

  const filtered = options.filter(o => o.toLowerCase().includes(q.toLowerCase())).slice(0, 8);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <input
        value={q}
        placeholder={placeholder}
        onChange={e => { setQ(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        style={{
          width: "100%", background: DARK3, border: `1px solid ${GOLD}44`,
          borderRadius: 6, padding: "6px 10px", color: CREAM,
          fontSize: 13, outline: "none", boxSizing: "border-box",
        }}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
          background: DARK2, border: `1px solid ${GOLD}44`, borderRadius: 6,
          maxHeight: 180, overflowY: "auto", boxShadow: "0 4px 16px #000000aa",
        }}>
          {filtered.map(opt => (
            <div
              key={opt}
              onClick={() => { setQ(opt); onChange(opt); setOpen(false); }}
              style={{
                padding: "7px 12px", cursor: "pointer", fontSize: 13,
                color: CREAM, borderBottom: `1px solid ${GOLD}22`,
              }}
              onMouseEnter={e => e.currentTarget.style.background = DARK3}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("crawl"); // crawl, annotate, detect

  // --- Custom Modal/Alert/Confirm state ---
  const [modal, setModal] = useState({
    show: false,
    type: "alert",
    title: "",
    message: "",
    onConfirm: null,
    onCancel: null
  });

  const showAlert = (title, message) => {
    return new Promise((resolve) => {
      setModal({
        show: true,
        type: "alert",
        title,
        message,
        onConfirm: () => {
          setModal(m => ({ ...m, show: false }));
          resolve(true);
        },
        onCancel: null
      });
    });
  };

  const showConfirm = (title, message) => {
    return new Promise((resolve) => {
      setModal({
        show: true,
        type: "confirm",
        title,
        message,
        onConfirm: () => {
          setModal(m => ({ ...m, show: false }));
          resolve(true);
        },
        onCancel: () => {
          setModal(m => ({ ...m, show: false }));
          resolve(false);
        }
      });
    });
  };

  // --- Crawler States ---
  const [crawlerStatus, setCrawlerStatus] = useState({
    status: "idle",
    current_page: 0,
    total_pages: 54,
    items_found: 0,
    images_downloaded: 0,
    logs: [],
    error_message: ""
  });
  const [pagesInput, setPagesInput] = useState(5);
  const logEndRef = useRef(null);

  // --- Dataset Existence State ---
  const [datasetInfo, setDatasetInfo] = useState({
    total_images: 0,
    total_folders: 0,
    folder_names: [],
    has_metadata: false,
    has_dataset: false,
    loaded: false
  });

  // --- Annotator States ---
  const [images, setImages] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [boxes, setBoxes] = useState([]);
  const [selectedBox, setSelectedBox] = useState(null);
  const [editingMeta, setEditingMeta] = useState({});
  const [tool, setTool] = useState("draw"); // draw, select
  const [hoveredBox, setHoveredBox] = useState(null);
  const [drawing, setDrawing] = useState(false);
  const [startPt, setStartPt] = useState(null);
  const [tempBox, setTempBox] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [resizingBox, setResizingBox] = useState(null);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 1, h: 1 });
  const [filterStatus, setFilterStatus] = useState("all"); // all, pending, done

  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  // --- Real-time Detection States ---
  const [detectMode, setDetectMode] = useState("upload"); // upload, camera
  const [detectFile, setDetectFile] = useState(null);
  const [detectPreview, setDetectPreview] = useState(null);
  const [detectLoading, setDetectLoading] = useState(false);
  const [detections, setDetections] = useState([]);
  const [selectedDetectIdx, setSelectedDetectIdx] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [confThreshold, setConfThreshold] = useState(0.15);
  const [modelInfo, setModelInfo] = useState(null); // null = belum di-fetch
  const [modelInfoLoading, setModelInfoLoading] = useState(false);
  const [lastDetectHadResult, setLastDetectHadResult] = useState(null); // true/false/null
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectIntervalRef = useRef(null);

  const startCamera = async () => {
    setDetections([]);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      // Run capture check every 750ms to feed YOLOv26 backend
      detectIntervalRef.current = setInterval(captureFrameAndDetect, 750);
    } catch (e) {
      await showAlert("Akses Kamera Gagal", "Gagal mengakses kamera: " + e.message);
      setDetectMode("upload");
    }
  };

  const stopCamera = () => {
    if (detectIntervalRef.current) {
      clearInterval(detectIntervalRef.current);
      detectIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const captureFrameAndDetect = async () => {
    const video = videoRef.current;
    if (!video || video.paused || video.ended || !streamRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "live_frame.jpg", { type: "image/jpeg" });
      const formData = new FormData();
      formData.append("file", file);
      formData.append("conf_threshold", confThreshold);

      try {
        const r = await fetch("/api/detect", { method: "POST", body: formData });
        if (!r.ok) return;
        const d = await r.json();
        if (d.detections && d.detections.length > 0) {
          setDetections(d.detections);
          // Auto-select first kris detected for immediate cultural display
          setSelectedDetectIdx(0);
        }
        if (d.model_info) setModelInfo(d.model_info);
      } catch (err) {
        console.error("Live detection failed:", err);
      }
    }, "image/jpeg", 0.85);
  };

  // Stop camera stream on unmount or tab change
  useEffect(() => {
    if (activeTab !== "detect") {
      stopCamera();
    } else {
      // Fetch model info saat masuk ke tab detect
      fetchModelInfo();
    }
  }, [activeTab]);


  // --- Initialize & Polling Crawler ---
  useEffect(() => {
    fetchCrawlerStatus();
    fetchDatasetInfo();
    loadImagesList();
    
    // Poll crawler status every 3 seconds
    const interval = setInterval(() => {
      fetchCrawlerStatus();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [crawlerStatus.logs]);

  const fetchCrawlerStatus = async () => {
    try {
      const r = await fetch("/api/crawler/status");
      const d = await r.json();
      setCrawlerStatus(d);
    } catch (e) {
      console.error("Error fetching crawler status:", e);
    }
  };

  const fetchDatasetInfo = async () => {
    try {
      const r = await fetch("/api/dataset/info");
      const d = await r.json();
      setDatasetInfo({ ...d, loaded: true });
    } catch (e) {
      console.error("Error fetching dataset info:", e);
      setDatasetInfo(prev => ({ ...prev, loaded: true }));
    }
  };

  const startCrawler = async (force = false) => {
    try {
      const formData = new FormData();
      formData.append("max_pages", pagesInput);
      formData.append("force", force ? "true" : "false");
      const r = await fetch("/api/crawler/start", { method: "POST", body: formData });
      const d = await r.json();
      if (d.status === "dataset_exists") {
        // Dataset sudah ada, konfirmasi ke user
        const confirmed = await showConfirm(
          "⚠️ Dataset Sudah Ada",
          `Dataset dengan ${d.total_images} gambar sudah ada di sistem.\n\nMelanjutkan crawling akan MENAMBAH gambar baru ke dataset yang sudah ada. Gambar lama tidak akan dihapus, namun data metadata bisa bertambah.\n\nApakah Anda ingin melanjutkan?`
        );
        if (confirmed) {
          await startCrawler(true);
        }
        return;
      }
      fetchCrawlerStatus();
      fetchDatasetInfo();
    } catch (e) {
      await showAlert("Crawler Gagal", "Gagal memulai crawler: " + e.message);
    }
  };

  const loadImagesList = async () => {
    try {
      const r = await fetch("/api/images");
      const d = await r.json();
      setImages(d);
    } catch (e) {
      console.error("Error loading images list:", e);
    }
  };

  // --- Annotator Hooks ---
  const currentImg = images[currentIdx] || null;
  console.log("Annotator App state:", { currentIdx, imagesCount: images.length, currentImg });

  useEffect(() => {
    if (!currentImg) return;
    const imgBoxes = currentImg.boxes || [];
    setBoxes(imgBoxes);
    if (imgBoxes.length > 0) {
      const firstBox = imgBoxes[0];
      setSelectedBox(firstBox.id);
      setEditingMeta({
        dhapur: firstBox.dhapur || currentImg.dhapur_clue || "",
        pamor: firstBox.pamor || currentImg.pamor_clue || "",
        tangguh: firstBox.tangguh || currentImg.tangguh_clue || "",
        luk: firstBox.luk !== undefined && firstBox.luk !== null && firstBox.luk !== "" ? String(firstBox.luk) : 
             (currentImg.luk_clue !== undefined && currentImg.luk_clue !== null ? String(currentImg.luk_clue) : ""),
      });
    } else {
      setSelectedBox(null);
      // Even if there are no boxes, prefill the edit form with image clues so drawing a box instantly gets the correct data
      setEditingMeta({
        dhapur: currentImg.dhapur_clue || "",
        pamor: currentImg.pamor_clue || "",
        tangguh: currentImg.tangguh_clue || "",
        luk: currentImg.luk_clue !== undefined && currentImg.luk_clue !== null ? String(currentImg.luk_clue) : "",
      });
    }
  }, [currentIdx, images]);

  const updateBoxesLocal = (newBoxes, markStatus = null) => {
    if (!currentImg) return;
    setBoxes(newBoxes);
    setImages(prev => prev.map((img, i) => 
      i === currentIdx ? { ...img, boxes: newBoxes, status: markStatus || img.status } : img
    ));
  };

  const saveBoxesToStateAndServer = async (newBoxes, markStatus = null) => {
    if (!currentImg) return;
    
    // Clean up boxes to ensure types match Pydantic schema (e.g. coerce empty string luk to null)
    const cleanedBoxes = newBoxes.map(b => {
      let cleanLuk = b.luk;
      if (cleanLuk === "" || cleanLuk === undefined || cleanLuk === null) {
        cleanLuk = null;
      } else {
        const parsed = parseInt(cleanLuk);
        cleanLuk = isNaN(parsed) ? null : parsed;
      }
      return {
        ...b,
        luk: cleanLuk
      };
    });

    // Post to FastAPI server
    try {
      const body = {
        filename: currentImg.filename,
        class_folder: currentImg.class_folder,
        boxes: cleanedBoxes
      };
      const response = await fetch("/api/annotations/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        let errText = `HTTP error! status: ${response.status}`;
        try {
          const errData = await response.json();
          if (errData && errData.detail) {
            if (typeof errData.detail === "string") {
              errText = errData.detail;
            } else {
              errText = JSON.stringify(errData.detail);
            }
          }
        } catch (_) {}
        throw new Error(errText);
      }

      // Update state only on success
      setBoxes(newBoxes);
      setImages(prev => prev.map((img, i) => 
        i === currentIdx ? { ...img, boxes: newBoxes, status: markStatus || img.status } : img
      ));
    } catch (e) {
      console.error("Failed saving annotation to backend:", e);
      await showAlert("Gagal Menyimpan Anotasi", "Gagal menyimpan perubahan ke server backend. Detail: " + e.message);
    }
  };

  const deleteImage = async () => {
    if (!currentImg) return;
    const confirmed = await showConfirm(
      "Konfirmasi Hapus Gambar",
      `Apakah Anda yakin ingin menghapus gambar ini (${currentImg.filename}) dari dataset? Tindakan ini bersifat permanen dan akan menghapus file gambar serta anotasi.`
    );
    if (!confirmed) return;
    
    try {
      const formData = new FormData();
      formData.append("filename", currentImg.filename);
      formData.append("class_folder", currentImg.class_folder);
      
      const r = await fetch("/api/images/delete", { method: "POST", body: formData });
      const d = await r.json();
      
      if (d.status === "success") {
        const nextIdx = currentIdx >= images.length - 1 ? Math.max(0, images.length - 2) : currentIdx;
        await loadImagesList();
        setCurrentIdx(nextIdx);
      } else {
        await showAlert("Penghapusan Gagal", "Gagal menghapus gambar: " + d.message);
      }
    } catch (e) {
      await showAlert("Error Sistem", "Error menghapus gambar: " + e.message);
    }
  };

  // SVG drawing logic
  const getCanvasCoord = (e) => {
    const svg = canvasRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  const onSegmentClick = async (e) => {
    if (!currentImg) return;
    const pt = getCanvasCoord(e);
    
    try {
      const formData = new FormData();
      formData.append("filename", currentImg.filename);
      formData.append("class_folder", currentImg.class_folder);
      formData.append("x", pt.x);
      formData.append("y", pt.y);
      
      const r = await fetch("/api/segment-click", { method: "POST", body: formData });
      const d = await r.json();
      
      if (d.status === "success" && d.box) {
        const defaultLabel = currentImg.class_folder.startsWith("keris_") ? currentImg.class_folder : "keris_unknown";
        
        let guessedLuk = "";
        if (defaultLabel.includes("luk_")) {
          const match = defaultLabel.match(/luk_(\d+)/);
          if (match) guessedLuk = match[1];
        } else if (defaultLabel.includes("lurus")) {
          guessedLuk = "0";
        }
        
        const newBox = {
          id: Date.now(),
          x: d.box.x,
          y: d.box.y,
          w: d.box.w,
          h: d.box.h,
          label: defaultLabel,
          dhapur: currentImg.dhapur_clue || "",
          pamor: currentImg.pamor_clue || "",
          tangguh: currentImg.tangguh_clue || "",
          luk: currentImg.luk_clue !== undefined && currentImg.luk_clue !== null ? currentImg.luk_clue : 
               (guessedLuk !== "" ? parseInt(guessedLuk) : ""),
          confirmed: false,
          polygon: d.polygon || null,
        };
        
        const updated = [...boxes, newBox];
        updateBoxesLocal(updated);
        setSelectedBox(newBox.id);
        setEditingMeta({
          dhapur: "",
          pamor: "",
          tangguh: "",
          luk: String(newBox.luk),
        });
      }
    } catch (err) {
      console.error("Click segmentation failed:", err);
    }
  };

  const onMouseDown = (e) => {
    if (tool !== "draw") return;
    const pt = getCanvasCoord(e);
    setDrawing(true);
    setStartPt(pt);
    setTempBox(null);
    setSelectedBox(null);
  };

  const handleResizeStart = (e, boxId, handleType) => {
    e.stopPropagation();
    e.preventDefault();
    setResizingBox(boxId);
    setResizeHandle(handleType);
  };

  const onMouseMove = (e) => {
    if (resizingBox && resizeHandle) {
      const pt = getCanvasCoord(e);
      setBoxes(prev => prev.map(box => {
        if (box.id !== resizingBox) return box;
        
        let newX = box.x;
        let newY = box.y;
        let newW = box.w;
        let newH = box.h;
        
        const currentRight = box.x + box.w;
        const currentBottom = box.y + box.h;
        
        if (resizeHandle === "tl") {
          newX = Math.min(pt.x, currentRight - 0.005);
          newY = Math.min(pt.y, currentBottom - 0.005);
          newW = currentRight - newX;
          newH = currentBottom - newY;
        } else if (resizeHandle === "tr") {
          newW = Math.max(0.005, pt.x - box.x);
          newY = Math.min(pt.y, currentBottom - 0.005);
          newH = currentBottom - newY;
        } else if (resizeHandle === "bl") {
          newX = Math.min(pt.x, currentRight - 0.005);
          newW = currentRight - newX;
          newH = Math.max(0.005, pt.y - box.y);
        } else if (resizeHandle === "br") {
          newW = Math.max(0.005, pt.x - box.x);
          newH = Math.max(0.005, pt.y - box.y);
        }
        
        return {
          ...box,
          x: newX,
          y: newY,
          w: newW,
          h: newH
        };
      }));
      return;
    }
    if (!drawing || !startPt) return;
    const pt = getCanvasCoord(e);
    setTempBox({
      x: Math.min(startPt.x, pt.x),
      y: Math.min(startPt.y, pt.y),
      w: Math.abs(pt.x - startPt.x),
      h: Math.abs(pt.y - startPt.y),
    });
  };

  const onMouseUp = (e) => {
    if (resizingBox) {
      setBoxes(prev => {
        updateBoxesLocal(prev);
        return prev;
      });
      setResizingBox(null);
      setResizeHandle(null);
      return;
    }
    if (!drawing || !startPt) return;
    setDrawing(false);
    const pt = getCanvasCoord(e);
    const box = {
      x: Math.min(startPt.x, pt.x),
      y: Math.min(startPt.y, pt.y),
      w: Math.abs(pt.x - startPt.x),
      h: Math.abs(pt.y - startPt.y),
    };
    if (box.w < 0.01 || box.h < 0.01) { setTempBox(null); return; }

    const defaultLabel = currentImg.class_folder.startsWith("keris_") ? currentImg.class_folder : "keris_unknown";
    
    // Guess default values from class_folder name
    let guessedLuk = "";
    if (defaultLabel.includes("luk_")) {
      const match = defaultLabel.match(/luk_(\d+)/);
      if (match) guessedLuk = match[1];
    } else if (defaultLabel.includes("lurus")) {
      guessedLuk = "0";
    }

    const newBox = {
      id: Date.now(),
      ...box,
      label: defaultLabel,
      dhapur: currentImg.dhapur_clue || "",
      pamor: currentImg.pamor_clue || "",
      tangguh: currentImg.tangguh_clue || "",
      luk: currentImg.luk_clue !== undefined && currentImg.luk_clue !== null ? currentImg.luk_clue : 
           (guessedLuk !== "" ? parseInt(guessedLuk) : ""),
      confirmed: false,
    };

    const updated = [...boxes, newBox];
    updateBoxesLocal(updated);
    setSelectedBox(newBox.id);
    setEditingMeta({
      dhapur: "",
      pamor: "",
      tangguh: "",
      luk: String(newBox.luk),
    });
    setTempBox(null);
  };

  const deleteBox = (id) => {
    const updated = boxes.filter(b => b.id !== id);
    saveBoxesToStateAndServer(updated);
    if (selectedBox === id) setSelectedBox(null);
  };

  const confirmBox = (id) => {
    const lukVal = editingMeta.luk !== "" ? parseInt(editingMeta.luk) : null;
    
    // Auto yolo label logic
    let calculatedLabel = "keris_unknown";
    if (lukVal !== null) {
      calculatedLabel = lukVal === 0 ? "keris_lurus" : `keris_luk_${lukVal}`;
    } else if (editingMeta.dhapur) {
      calculatedLabel = `keris_${editingMeta.dhapur.toLowerCase().replace(/\s+/g, "_")}`;
    }

    const updated = boxes.map(b => b.id === id ? {
      ...b,
      dhapur: editingMeta.dhapur || "",
      pamor: editingMeta.pamor || "",
      tangguh: editingMeta.tangguh || "",
      luk: lukVal,
      label: calculatedLabel,
      confirmed: true
    } : b);

    saveBoxesToStateAndServer(updated, "done");
  };

  const getLabelYolo = (meta) => {
    const lukVal = meta.luk !== "" && meta.luk !== undefined ? parseInt(meta.luk) : null;
    if (lukVal !== null) {
      return lukVal === 0 ? "keris_lurus" : `keris_luk_${lukVal}`;
    }
    if (meta.dhapur) return `keris_${meta.dhapur.toLowerCase().replace(/\s+/g, "_")}`;
    return "keris_unknown";
  };

  // Local AI suggestions using rule parsing and YOLO26 inference offline
  const requestAISuggest = async () => {
    if (!currentImg) return;
    setAiLoading(true);
    try {
      const formData = new FormData();
      formData.append("filename", currentImg.filename);
      formData.append("class_folder", currentImg.class_folder);
      
      const r = await fetch("/api/ai-suggest", { method: "POST", body: formData });
      const d = await r.json();
      
      // Load candidate boxes returned from backend YOLO detector
      if (d.boxes && d.boxes.length > 0) {
        // map them
        const parsedBoxes = d.boxes.map(b => ({
          ...b,
          confirmed: false
        }));
        setBoxes(parsedBoxes);
        updateBoxesLocal(parsedBoxes);
        
        // select the first one
        setSelectedBox(parsedBoxes[0].id);
        setEditingMeta({
          dhapur: parsedBoxes[0].dhapur || "",
          pamor: parsedBoxes[0].pamor || "",
          tangguh: parsedBoxes[0].tangguh || "",
          luk: parsedBoxes[0].luk !== null ? String(parsedBoxes[0].luk) : "",
        });
      }
    } catch (e) {
      console.error(e);
      await showAlert("Asisten AI Gagal", "Gagal memanggil modul AI offline: " + e.message);
    }
    setAiLoading(false);
  };

  const handleGeminiAutofill = async () => {
    if (!currentImg?.crawled_meta) {
      await showAlert("Autofill Gemini Batal", "Tidak ada data deskripsi dari crawler untuk gambar ini.");
      return;
    }
    setGeminiLoading(true);
    try {
      const response = await fetch("/api/ai/extract-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: currentImg.crawled_meta.judul || currentImg.filename,
          description: currentImg.crawled_meta.deskripsi || ""
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Gagal mengambil data dari Gemini");
      }
      
      const data = await response.json();
      
      // Update form fields
      setEditingMeta(prev => ({
        ...prev,
        dhapur: data.dhapur || prev.dhapur || "",
        pamor: data.pamor || prev.pamor || "",
        tangguh: data.tangguh || prev.tangguh || "",
        luk: data.luk !== null && data.luk !== undefined ? String(data.luk) : (prev.luk || "")
      }));
      
      await showAlert("Autofill Berhasil", "Metadata berhasil diisi otomatis menggunakan Gemini!");
    } catch (err) {
      console.error("Gemini Autofill error:", err);
      await showAlert("Autofill Gagal", err.message);
    }
    setGeminiLoading(false);
  };

  // --- Real-time Detection Logic ---
  const handleDetectUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setDetectFile(file);
    setDetectPreview(URL.createObjectURL(file));
    setDetections([]);
    setLastDetectHadResult(null);
  };

  const fetchModelInfo = async () => {
    setModelInfoLoading(true);
    try {
      const r = await fetch("/api/model/info");
      const d = await r.json();
      setModelInfo(d);
    } catch (e) {
      console.error("Failed to fetch model info:", e);
    }
    setModelInfoLoading(false);
  };

  const runRealTimeDetection = async () => {
    if (!detectFile) return;
    setDetectLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", detectFile);
      formData.append("conf_threshold", confThreshold);
      const r = await fetch("/api/detect", { method: "POST", body: formData });
      const d = await r.json();
      const dets = d.detections || [];
      setDetections(dets);
      setSelectedDetectIdx(0);
      setLastDetectHadResult(dets.length > 0);
      // Update model info dari response terbaru
      if (d.model_info) setModelInfo(d.model_info);
    } catch (e) {
      await showAlert("Deteksi Gagal", "Inference failed: " + e.message);
      setLastDetectHadResult(false);
    }
    setDetectLoading(false);
  };

  // Image filtered list for queue
  const filteredImages = images.filter(img => {
    if (filterStatus === "all") return true;
    if (filterStatus === "pending") return img.status === "pending";
    if (filterStatus === "done") return img.status === "done" || img.status === "skip";
    return true;
  });

  const totalBoxesCount = images.reduce((sum, img) => sum + (img.boxes ? img.boxes.length : 0), 0);
  const doneImagesCount = images.filter(img => img.status === "done").length;

  return (
    <div style={{
      height: "100vh", background: DARK, color: CREAM,
      fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column",
      overflow: "hidden"
    }}>
      {/* --- Header --- */}
      <header style={{
        background: DARK2, borderBottom: `2px solid ${GOLD}44`,
        padding: "14px 24px", display: "flex", alignItems: "center",
        justifyContent: "space-between", flexWrap: "wrap", gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 28 }}>🗡️</span>
          <div>
            <h1 style={{ 
              fontFamily: "'Cinzel', serif", fontWeight: 700, 
              color: GOLD, margin: 0, fontSize: 18, letterSpacing: 1.5 
            }}>
              IDENTIFIKASI KERIS MADURA
            </h1>
            <p style={{ margin: 0, fontSize: 11, color: MUTED, letterSpacing: 0.5 }}>
              YOLOv26-Based Cultural Preservation Dashboard • Tesis Deep Learning
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { id: "crawl", label: "Dataset Crawler", icon: Database },
            { id: "annotate", label: "AI Annotator", icon: Edit3 },
            { id: "detect", label: "Deteksi YOLOv26", icon: Eye },
          ].map(tab => {
            const Icon = tab.icon;
            const isAct = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === "annotate") loadImagesList();
                }}
                style={{
                  background: isAct ? GOLD : DARK3,
                  color: isAct ? DARK : CREAM,
                  border: `1px solid ${GOLD}55`,
                  borderRadius: 6, padding: "8px 16px",
                  cursor: "pointer", fontSize: 12, fontWeight: 700,
                  display: "flex", alignItems: "center", gap: 6,
                  transition: "all 0.2s"
                }}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* --- Main Content Tab Panels --- */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        
        {/* --- TAB 1: CRAWLER & DATASET PREPARATION --- */}
        {activeTab === "crawl" && (
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24, maxWidth: 1200, margin: "0 auto", width: "100%", overflowY: "auto", flex: 1 }}>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              
              {/* Crawler Controls */}
              <div style={{
                background: DARK2, border: `1px solid ${datasetInfo.has_dataset ? "#c0392b" : GOLD}33`,
                borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 16
              }}>
                <h3 style={{ fontFamily: "'Cinzel', serif", color: GOLD, margin: "0 0 10px", fontSize: 16 }}>
                  Penyiapan Dataset (PusakaKeris Crawler)
                </h3>
                <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, margin: 0 }}>
                  Fitur ini melakukan crawling katalog online secara terstruktur untuk mengumpulkan gambar bilah keris, deskripsi, harga, pamor, dan luk awal.
                </p>

                {/* Dataset Exists Warning Banner */}
                {datasetInfo.loaded && datasetInfo.has_dataset && (
                  <div style={{
                    background: "rgba(192,57,43,0.12)",
                    border: "1px solid rgba(192,57,43,0.5)",
                    borderRadius: 8, padding: "12px 16px",
                    display: "flex", alignItems: "flex-start", gap: 10
                  }}>
                    <span style={{ fontSize: 18, lineHeight: 1 }}>⚠️</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#e74c3c", marginBottom: 4 }}>
                        DATASET SUDAH ADA — CRAWLING DINONAKTIFKAN
                      </div>
                      <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
                        Ditemukan <strong style={{ color: CREAM }}>{datasetInfo.total_images} gambar</strong> dalam{" "}
                        <strong style={{ color: CREAM }}>{datasetInfo.total_folders} folder</strong> pada dataset yang ada.
                        Tombol crawling dinonaktifkan untuk melindungi data yang sudah dikumpulkan.
                        Klik <em style={{ color: GOLD }}>Crawl Tambahan</em> jika ingin menambah gambar baru.
                      </div>
                      {datasetInfo.folder_names.length > 0 && (
                        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {datasetInfo.folder_names.slice(0, 6).map(f => (
                            <span key={f} style={{
                              background: DARK3, border: `1px solid ${GOLD}33`,
                              borderRadius: 4, padding: "2px 6px", fontSize: 10, color: GOLD
                            }}>{f}</span>
                          ))}
                          {datasetInfo.folder_names.length > 6 && (
                            <span style={{ fontSize: 10, color: MUTED }}>+{datasetInfo.folder_names.length - 6} lainnya</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 11, color: datasetInfo.has_dataset ? "#c0392b" : MUTED }}>BATASAN HALAMAN KATALOG</label>
                    <input 
                      type="number" 
                      min="1" max="54" 
                      value={pagesInput} 
                      onChange={e => setPagesInput(parseInt(e.target.value))}
                      disabled={datasetInfo.has_dataset && crawlerStatus.status !== "running"}
                      style={{
                        background: datasetInfo.has_dataset ? "#1a0000" : DARK3,
                        border: `1px solid ${datasetInfo.has_dataset ? "rgba(192,57,43,0.4)" : GOLD + "44"}`,
                        borderRadius: 6, padding: "8px 12px",
                        color: datasetInfo.has_dataset ? MUTED : CREAM,
                        fontSize: 14, outline: "none", width: 140,
                        cursor: datasetInfo.has_dataset ? "not-allowed" : "text"
                      }}
                    />
                  </div>
                  
                  {/* Tombol utama: DISABLED jika dataset ada */}
                  {!datasetInfo.has_dataset ? (
                    <button
                      onClick={() => startCrawler(false)}
                      disabled={crawlerStatus.status === "running"}
                      style={{
                        background: crawlerStatus.status === "running" ? "#333" : GOLD,
                        color: crawlerStatus.status === "running" ? MUTED : DARK,
                        border: "none", borderRadius: 6, padding: "10px 20px",
                        cursor: crawlerStatus.status === "running" ? "default" : "pointer",
                        fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 8,
                        alignSelf: "flex-end", height: 38
                      }}
                    >
                      <Play size={14} fill={crawlerStatus.status === "running" ? "none" : DARK} />
                      Mulai Crawling
                    </button>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignSelf: "flex-end" }}>
                      <button
                        disabled
                        title="Dataset sudah ada. Gunakan tombol Crawl Tambahan untuk menambah data."
                        style={{
                          background: "#1a0000", color: "rgba(192,57,43,0.5)",
                          border: "1px solid rgba(192,57,43,0.25)", borderRadius: 6,
                          padding: "10px 20px", cursor: "not-allowed",
                          fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 8,
                          height: 38
                        }}
                      >
                        <Play size={14} fill="none" />
                        Mulai Crawling
                      </button>
                      <button
                        onClick={() => startCrawler(false)}
                        disabled={crawlerStatus.status === "running"}
                        title="Tambah gambar baru ke dataset yang sudah ada (memerlukan konfirmasi)"
                        style={{
                          background: crawlerStatus.status === "running" ? "#333" : "rgba(192,57,43,0.2)",
                          color: crawlerStatus.status === "running" ? MUTED : "#e74c3c",
                          border: "1px solid rgba(192,57,43,0.5)", borderRadius: 6,
                          padding: "6px 12px", cursor: crawlerStatus.status === "running" ? "default" : "pointer",
                          fontWeight: 700, fontSize: 11, display: "flex", alignItems: "center", gap: 6
                        }}
                      >
                        ⚠️ Crawl Tambahan
                      </button>
                    </div>
                  )}
                </div>

                {/* Status Bar */}
                <div style={{
                  background: DARK3, border: `1px solid ${GOLD}11`,
                  borderRadius: 8, padding: 16, marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16
                }}>
                  <div>
                    <div style={{ fontSize: 10, color: MUTED }}>STATUS KONTROL</div>
                    <span style={{ 
                      fontSize: 13, fontWeight: 700, 
                      color: crawlerStatus.status === "running" ? TEAL : 
                             crawlerStatus.status === "completed" ? GREEN : 
                             crawlerStatus.status === "error" ? RED : GOLD 
                    }}>
                      {crawlerStatus.status.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: MUTED }}>PROSES HALAMAN</div>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>
                      {crawlerStatus.current_page} / {crawlerStatus.total_pages}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: MUTED }}>GAMBAR DIDOWNLOAD</div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: GOLD }}>
                      {crawlerStatus.images_downloaded} pcs
                    </span>
                  </div>
                </div>
              </div>

              {/* Logs terminal */}
              <div style={{
                background: DARK2, border: `1px solid ${GOLD}33`,
                borderRadius: 12, display: "flex", flexDirection: "column", height: 320, overflow: "hidden"
              }}>
                <div style={{
                  background: "#150c02", borderBottom: `1px solid ${GOLD}22`,
                  padding: "8px 16px", display: "flex", alignItems: "center", gap: 8
                }}>
                  <Terminal size={14} color={GOLD} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: 1 }}>CRAWLER CONSOLE LOGS</span>
                  <div style={{ flex: 1 }} />
                  <button 
                    onClick={fetchCrawlerStatus}
                    style={{ background: "none", border: "none", color: MUTED, cursor: "pointer" }}
                  >
                    <RefreshCw size={12} className={crawlerStatus.status === "running" ? "spin" : ""} />
                  </button>
                </div>
                
                <div style={{
                  flex: 1, padding: 16, overflowY: "auto",
                  fontFamily: "monospace", fontSize: 12, color: "#a5d6a7",
                  background: "#080400", display: "flex", flexDirection: "column", gap: 4
                }}>
                  {crawlerStatus.logs.length === 0 ? (
                    <div style={{ color: MUTED, fontStyle: "italic" }}>Menunggu log aktif dari sistem crawler...</div>
                  ) : (
                    crawlerStatus.logs.map((log, i) => (
                      <div key={i}>{log}</div>
                    ))
                  )}
                  <div ref={logEndRef} />
                </div>
              </div>

            </div>

            {/* Dataset Statistics */}
            <div style={{
              background: DARK2, border: `1px solid ${GOLD}33`,
              borderRadius: 12, padding: 24
            }}>
              <h3 style={{ fontFamily: "'Cinzel', serif", color: GOLD, margin: "0 0 16px", fontSize: 16 }}>
                Statistik & Rincian Koleksi Data
              </h3>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
                {[
                  { title: "Total Gambar Tersimpan", value: images.length, desc: "File gambar terdaftar" },
                  { title: "Anotasi Bounding Box", value: totalBoxesCount, desc: "Total box diidentifikasi" },
                  { title: "Sudah Teranotasi (Done)", value: doneImagesCount, desc: "Lolos verifikasi manusia" },
                  { title: "Sisa Queue Anotasi", value: images.length - doneImagesCount, desc: "Perlu pemeriksaan" },
                ].map((stat, i) => (
                  <div key={i} style={{
                    background: DARK3, border: `1px solid ${GOLD}11`,
                    borderRadius: 8, padding: 16, textAlign: "center"
                  }}>
                    <div style={{ fontSize: 12, color: MUTED }}>{stat.title}</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: GOLD, margin: "6px 0" }}>{stat.value}</div>
                    <div style={{ fontSize: 10, color: MUTED }}>{stat.desc}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* --- TAB 2: AI-ASSISTED CANVAS ANNOTATOR --- */}
        {activeTab === "annotate" && (
          <div style={{ display: "flex", flex: 1, overflow: "hidden", height: "calc(100vh - 71px)" }}>
            
            {/* Left Queue Sidebar */}
            <div style={{
              width: 250, background: DARK2, borderRight: `1px solid ${GOLD}22`,
              display: "flex", flexDirection: "column", flexShrink: 0
            }}>
              
              {/* Sidebar header filter */}
              <div style={{
                padding: "10px 14px", borderBottom: `1px solid ${GOLD}22`,
                display: "flex", alignItems: "center", justifyContent: "space-between"
              }}>
                <span style={{ fontSize: 11, color: GOLD, fontWeight: 700, letterSpacing: 1 }}>
                  DAFTAR GAMBAR
                </span>
                <div style={{ display: "flex", gap: 4 }}>
                  {["all", "pending", "done"].map(st => (
                    <button
                      key={st}
                      onClick={() => setFilterStatus(st)}
                      style={{
                        background: filterStatus === st ? GOLD : DARK3,
                        color: filterStatus === st ? DARK : MUTED,
                        border: "none", borderRadius: 4, padding: "2px 6px",
                        fontSize: 9, cursor: "pointer", fontWeight: 700
                      }}
                    >
                      {st.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Queue Items */}
              <div style={{ flex: 1, overflowY: "auto" }}>
                {filteredImages.length === 0 ? (
                  <div style={{ padding: 20, textAlign: "center", color: MUTED, fontSize: 12 }}>
                    Tidak ada antrian gambar. Silakan download dataset terlebih dahulu di Tab 1.
                  </div>
                ) : (
                  filteredImages.map((img) => {
                    const originalIdx = images.findIndex(i => i.rel_path === img.rel_path);
                    const isSelected = originalIdx === currentIdx;
                    return (
                      <div
                        key={img.rel_path}
                        onClick={() => {
                          console.log("Left panel click - img:", img, "originalIdx:", originalIdx);
                          if (originalIdx === -1) {
                            console.error("Mismatched image in left panel!", img);
                          }
                          setCurrentIdx(originalIdx);
                        }}
                        style={{
                          padding: "10px 14px",
                          background: isSelected ? DARK3 : "transparent",
                          borderLeft: isSelected ? `4px solid ${GOLD}` : "4px solid transparent",
                          borderBottom: `1px solid ${GOLD}11`,
                          cursor: "pointer"
                        }}
                      >
                        <div style={{
                          width: "100%", height: 80, overflow: "hidden",
                          borderRadius: 6, marginBottom: 6, background: "#000",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          border: `1px solid ${isSelected ? GOLD : "transparent"}`
                        }}>
                          <img 
                            src={`/api/images/serve?path=${encodeURIComponent(img.rel_path)}`} 
                            style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                          />
                        </div>
                        <div style={{ fontSize: 11, color: CREAM, wordBreak: "break-all", lineHeight: 1.3 }}>
                          {img.filename}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10 }}>
                          <span style={{ color: TEAL }}>{img.boxes ? img.boxes.length : 0} bbox</span>
                          <span style={{
                            fontWeight: 700, 
                            color: img.status === "done" ? GREEN : 
                                   img.status === "skip" ? MUTED : GOLD
                          }}>
                            {img.status === "done" ? "✔ DONE" : 
                             img.status === "skip" ? "⏭ SKIP" : "● PENDING"}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Central Canvas Board */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#060300" }}>
              
              {/* Annotator toolbar */}
              {currentImg && (
                <div style={{
                  background: DARK2, padding: "8px 16px",
                  borderBottom: `1px solid ${GOLD}22`,
                  display: "flex", alignItems: "center", gap: 12
                }}>
                  {/* Tool choice */}
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      onClick={() => setTool("draw")}
                      style={{
                        background: tool === "draw" ? GOLD : DARK3,
                        color: tool === "draw" ? DARK : CREAM,
                        border: `1px solid ${GOLD}44`, borderRadius: 6,
                        padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700
                      }}
                    >
                      ✏️ BBox Draw
                    </button>
                    <button
                      onClick={() => setTool("select")}
                      style={{
                        background: tool === "select" ? GOLD : DARK3,
                        color: tool === "select" ? DARK : CREAM,
                        border: `1px solid ${GOLD}44`, borderRadius: 6,
                        padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700
                      }}
                    >
                      👆 BBox Select
                    </button>
                    <button
                      onClick={() => setTool("segment")}
                      style={{
                        background: tool === "segment" ? GOLD : DARK3,
                        color: tool === "segment" ? DARK : CREAM,
                        border: `1px solid ${GOLD}44`, borderRadius: 6,
                        padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700
                      }}
                    >
                      🎯 Click Segment
                    </button>
                  </div>

                  <div style={{ width: 1, height: 20, background: `${GOLD}33` }} />

                  {/* Offline AI suggestion click */}
                  <button
                    onClick={requestAISuggest}
                    disabled={aiLoading}
                    style={{
                      background: "#311b92", color: "#d1c4e9",
                      border: "1px solid #5e35b1", borderRadius: 6,
                      padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700,
                      display: "flex", alignItems: "center", gap: 6
                    }}
                  >
                    <RefreshCw size={12} className={aiLoading ? "spin" : ""} />
                    {aiLoading ? "AI Deteksi..." : "✨ AI Pre-Anote"}
                  </button>

                  <div style={{ flex: 1 }} />

                  <span style={{ fontSize: 12, color: MUTED }}>
                    Folder: <code style={{ color: GOLD }}>{currentImg.class_folder}</code>
                  </span>

                  <button
                    onClick={deleteImage}
                    style={{
                      background: "rgba(231,76,60,0.15)", border: `1px solid ${RED}33`, color: RED,
                      borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 12,
                      fontWeight: 700
                    }}
                  >
                    🗑️ Hapus Gambar
                  </button>

                  <button
                    onClick={() => {
                      setImages(prev => prev.map((img, i) => i === currentIdx ? { ...img, status: "skip" } : img));
                      if (currentIdx < images.length - 1) setCurrentIdx(currentIdx + 1);
                    }}
                    style={{
                      background: DARK3, border: `1px solid ${MUTED}`, color: MUTED,
                      borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 12
                    }}
                  >
                    Skip
                  </button>
                  
                  <button
                    onClick={() => { if (currentIdx < images.length - 1) setCurrentIdx(currentIdx + 1); }}
                    disabled={currentIdx >= images.length - 1}
                    style={{
                      background: DARK3, border: `1px solid ${GOLD}55`, color: GOLD,
                      borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 12
                    }}
                  >
                    Lanjut ›
                  </button>
                </div>
              )}

              {/* Canvas viewport */}
              {currentImg ? (
                <div style={{
                  flex: 1, display: "flex", justifyContent: "center", alignItems: "center",
                  padding: 24, overflow: "auto"
                }}>
                  <div style={{
                    position: "relative",
                    display: "inline-block",
                    boxShadow: "0 0 32px #000000dd",
                    maxWidth: "65vw",
                    maxHeight: "65vh"
                  }}>
                    
                    <img
                      ref={imgRef}
                      src={`/api/images/serve?path=${encodeURIComponent(currentImg.rel_path)}`}
                      onLoad={e => {
                        console.log("Image loaded successfully in canvas:", currentImg.rel_path, e.target.naturalWidth, e.target.naturalHeight);
                        setImgNaturalSize({ w: e.target.naturalWidth, h: e.target.naturalHeight });
                      }}
                      onError={e => {
                        console.error("Image failed to load in canvas:", currentImg.rel_path);
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        height: "100%",
                        maxWidth: "65vw",
                        maxHeight: "65vh",
                        objectFit: "contain",
                        userSelect: "none",
                        pointerEvents: "none"
                      }}
                    />
                    
                    <svg
                      ref={canvasRef}
                      style={{
                        position: "absolute", inset: 0, width: "100%", height: "100%",
                        cursor: tool === "draw" ? "crosshair" : (tool === "segment" ? "pointer" : "default")
                      }}
                      onMouseDown={onMouseDown}
                      onMouseMove={onMouseMove}
                      onMouseUp={onMouseUp}
                      onClick={tool === "select" ? () => setSelectedBox(null) : (tool === "segment" ? onSegmentClick : undefined)}
                    >
                      {/* Bounding boxes */}
                      {boxes.map(b => {
                        const isSel = b.id === selectedBox;
                        const isHov = b.id === hoveredBox;
                        const color = b.confirmed ? GREEN : (isSel ? GOLD : TEAL);
                        return (
                          <g key={b.id}
                            onMouseEnter={() => setHoveredBox(b.id)}
                            onMouseLeave={() => setHoveredBox(null)}
                            onClick={e => {
                              if (tool === "select") {
                                e.stopPropagation();
                                setSelectedBox(b.id);
                                setEditingMeta({
                                  dhapur: b.dhapur || "",
                                  pamor: b.pamor || "",
                                  tangguh: b.tangguh || "",
                                  luk: b.luk !== undefined && b.luk !== "" ? String(b.luk) : "",
                                });
                              }
                            }}
                            style={{ cursor: tool === "select" ? "pointer" : "default" }}
                          >
                            {/* Semi-transparent segmentation overlay mask */}
                            {b.polygon && (
                              <svg
                                viewBox="0 0 1 1"
                                preserveAspectRatio="none"
                                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
                              >
                                <polygon
                                  points={b.polygon.map(p => `${p[0]},${p[1]}`).join(" ")}
                                  fill={color + "44"}
                                  stroke={color}
                                  strokeWidth="0.003"
                                />
                              </svg>
                            )}

                            <rect
                              x={`${b.x * 100}%`} y={`${b.y * 100}%`}
                              width={`${b.w * 100}%`} height={`${b.h * 100}%`}
                              fill={color + "1e"}
                              stroke={color}
                              strokeWidth={isSel || isHov ? 2.5 : 1.5}
                              strokeDasharray={b.confirmed ? "none" : "5 3"}
                            />
                            {/* Class badge top-left corner */}
                            <foreignObject
                              x={`${b.x * 100}%`}
                              y={`${b.y * 100 - 20}%`}
                              width="120"
                              height="20"
                              style={{ overflow: "visible" }}
                            >
                              <div style={{
                                background: color, color: DARK, padding: "2px 6px",
                                fontSize: 9, fontWeight: 700, borderRadius: "4px 4px 0 0",
                                display: "inline-block", fontFamily: "monospace", whiteSpace: "nowrap"
                              }}>
                                {b.label} {b.confirmed ? "✓" : "?"}
                              </div>
                            </foreignObject>

                            {/* Resize handles - only visible when selected and in select tool mode */}
                            {isSel && tool === "select" && (
                              <>
                                {/* Top-Left */}
                                <circle
                                  cx={`${b.x * 100}%`}
                                  cy={`${b.y * 100}%`}
                                  r="5"
                                  fill={GOLD}
                                  stroke="#000"
                                  strokeWidth="1.5"
                                  style={{ cursor: "nwse-resize" }}
                                  onMouseDown={e => handleResizeStart(e, b.id, "tl")}
                                />
                                {/* Top-Right */}
                                <circle
                                  cx={`${(b.x + b.w) * 100}%`}
                                  cy={`${b.y * 100}%`}
                                  r="5"
                                  fill={GOLD}
                                  stroke="#000"
                                  strokeWidth="1.5"
                                  style={{ cursor: "nesw-resize" }}
                                  onMouseDown={e => handleResizeStart(e, b.id, "tr")}
                                />
                                {/* Bottom-Left */}
                                <circle
                                  cx={`${b.x * 100}%`}
                                  cy={`${(b.y + b.h) * 100}%`}
                                  r="5"
                                  fill={GOLD}
                                  stroke="#000"
                                  strokeWidth="1.5"
                                  style={{ cursor: "nesw-resize" }}
                                  onMouseDown={e => handleResizeStart(e, b.id, "bl")}
                                />
                                {/* Bottom-Right */}
                                <circle
                                  cx={`${(b.x + b.w) * 100}%`}
                                  cy={`${(b.y + b.h) * 100}%`}
                                  r="5"
                                  fill={GOLD}
                                  stroke="#000"
                                  strokeWidth="1.5"
                                  style={{ cursor: "nwse-resize" }}
                                  onMouseDown={e => handleResizeStart(e, b.id, "br")}
                                />
                              </>
                            )}
                          </g>
                        );
                      })}

                      {/* Box currently drawing */}
                      {tempBox && (
                        <rect
                          x={`${tempBox.x * 100}%`} y={`${tempBox.y * 100}%`}
                          width={`${tempBox.w * 100}%`} height={`${tempBox.h * 100}%`}
                          fill={`${GOLD}15`} stroke={GOLD} strokeWidth="1.5" strokeDasharray="5 3"
                        />
                      )}
                    </svg>

                  </div>
                </div>
              ) : (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: MUTED }}>
                  <Eye size={48} />
                  <p style={{ marginTop: 12, fontSize: 13 }}>Silakan pilih gambar dari daftar queue di sebelah kiri.</p>
                </div>
              )}
            </div>

            {/* Right Editor Sidebar */}
            {currentImg && (
              <div style={{
                width: 300, background: DARK2, borderLeft: `1px solid ${GOLD}22`,
                padding: 16, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto",
                flexShrink: 0
              }}>
                <h3 style={{ fontFamily: "'Cinzel', serif", color: GOLD, fontSize: 14, margin: "0 0 4px" }}>
                  MODUL VERIFIKASI METADATA
                </h3>
                <div style={{ fontSize: 11, color: MUTED, wordBreak: "break-all" }}>
                  File: {currentImg.filename}
                </div>

                {/* Crawler Reference Card */}
                {currentImg.crawled_meta ? (
                  <div style={{
                    background: "rgba(201, 168, 76, 0.05)",
                    border: `1px solid ${GOLD}44`,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8
                  }}>
                    <div style={{ color: GOLD, fontWeight: 700, fontSize: 10, letterSpacing: 0.5 }}>
                      🔍 REFERENSI CRAWLER
                    </div>
                    <div>
                      <span style={{ color: MUTED, fontSize: 10 }}>Judul Produk:</span>
                      <div style={{ color: CREAM, fontWeight: 600, marginTop: 2 }}>{currentImg.crawled_meta.judul}</div>
                    </div>
                    {currentImg.crawled_meta.kode_produk && (
                      <div>
                        <span style={{ color: MUTED, fontSize: 10 }}>Kode Produk:</span>
                        <span style={{ color: CREAM, marginLeft: 6 }}>{currentImg.crawled_meta.kode_produk}</span>
                      </div>
                    )}
                    {currentImg.crawled_meta.harga && (
                      <div>
                        <span style={{ color: MUTED, fontSize: 10 }}>Harga:</span>
                        <span style={{ color: GOLD, marginLeft: 6, fontWeight: 600 }}>{currentImg.crawled_meta.harga}</span>
                      </div>
                    )}
                    {currentImg.crawled_meta.url && (
                      <div>
                        <span style={{ color: MUTED, fontSize: 10 }}>URL Asli:</span>
                        <a 
                          href={currentImg.crawled_meta.url} 
                          target="_blank" 
                          rel="noreferrer"
                          style={{ color: TEAL, textDecoration: "none", marginLeft: 6, wordBreak: "break-all" }}
                        >
                          Buka Link 🔗
                        </a>
                      </div>
                    )}
                    {currentImg.crawled_meta.deskripsi && (
                      <div>
                        <span style={{ color: MUTED, fontSize: 10 }}>Deskripsi:</span>
                        <div style={{
                          color: CREAM, fontSize: 11, background: "rgba(0,0,0,0.2)",
                          padding: 6, borderRadius: 4, marginTop: 4, maxHeight: 80,
                          overflowY: "auto", whiteSpace: "pre-wrap"
                        }}>
                          {currentImg.crawled_meta.deskripsi}
                        </div>
                      </div>
                    )}
                    <div style={{ width: "100%", height: 1, background: `${GOLD}22`, margin: "4px 0" }} />
                    <div style={{ fontSize: 10, color: MUTED }}>
                      <b>Nilai Ekstraksi Web:</b>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                        <span style={{ background: DARK3, padding: "2px 6px", borderRadius: 4 }}>Dhapur: {currentImg.crawled_meta.dhapur || "-"}</span>
                        <span style={{ background: DARK3, padding: "2px 6px", borderRadius: 4 }}>Pamor: {currentImg.crawled_meta.pamor || "-"}</span>
                        <span style={{ background: DARK3, padding: "2px 6px", borderRadius: 4 }}>Tangguh: {currentImg.crawled_meta.tangguh || "-"}</span>
                        <span style={{ background: DARK3, padding: "2px 6px", borderRadius: 4 }}>Luk: {currentImg.crawled_meta.luk !== null ? currentImg.crawled_meta.luk : "-"}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    background: "rgba(201, 168, 76, 0.02)",
                    border: `1px dashed ${GOLD}22`,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 11,
                    color: MUTED,
                    textAlign: "center"
                  }}>
                    Tidak ada metadata crawler langsung untuk file ini.
                  </div>
                )}

                <div style={{ width: "100%", height: 1, background: `${GOLD}22` }} />

                {selectedBox ? (
                  (() => {
                    const selB = boxes.find(b => b.id === selectedBox);
                    if (!selB) return null;
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <div style={{ fontSize: 12, color: GOLD, fontWeight: 700, display: "flex", justifyContent: "space-between" }}>
                          <span>BOX ANOTASI TERPILIH</span>
                          {selB.confirmed && <span style={{ color: GREEN }}>Confirmed ✓</span>}
                        </div>

                        {/* Gemini Auto-fill Trigger */}
                        {currentImg.crawled_meta && (
                          <button
                            onClick={handleGeminiAutofill}
                            disabled={geminiLoading}
                            style={{
                              background: geminiLoading ? DARK3 : "linear-gradient(135deg, #6200ea 0%, #3700b3 100%)",
                              color: CREAM,
                              border: `1px solid ${GOLD}44`,
                              borderRadius: 6,
                              padding: "8px 12px",
                              cursor: geminiLoading ? "default" : "pointer",
                              fontSize: 11,
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6,
                              transition: "all 0.2s ease-in-out"
                            }}
                          >
                            <span>{geminiLoading ? "⏳ Mengekstrak..." : "✨ Auto-fill dengan Gemini"}</span>
                          </button>
                        )}

                        {/* Dhapur */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <label style={{ fontSize: 11, color: MUTED }}>⚔️ DHAPUR (Bilah)</label>
                          <Autocomplete
                            value={editingMeta.dhapur || ""}
                            onChange={v => setEditingMeta(prev => ({ ...prev, dhapur: v }))}
                            options={DHAPUR_LIST}
                            placeholder="cth: Sengkelat, Brojol"
                          />
                        </div>

                        {/* Pamor */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <label style={{ fontSize: 11, color: MUTED }}>✨ PAMOR (Motif Logam)</label>
                          <Autocomplete
                            value={editingMeta.pamor || ""}
                            onChange={v => setEditingMeta(prev => ({ ...prev, pamor: v }))}
                            options={PAMOR_LIST}
                            placeholder="cth: Beras Wutah, Ngulit Semangka"
                          />
                        </div>

                        {/* Tangguh */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <label style={{ fontSize: 11, color: MUTED }}>🏛️ TANGGUH (Era Estetika)</label>
                          <Autocomplete
                            value={editingMeta.tangguh || ""}
                            onChange={v => setEditingMeta(prev => ({ ...prev, tangguh: v }))}
                            options={TANGGUH_LIST}
                            placeholder="cth: Madura, Majapahit"
                          />
                        </div>

                        {/* Luk */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <label style={{ fontSize: 11, color: MUTED }}>🌊 LUK (Bilah Lekuk)</label>
                          <select
                            value={editingMeta.luk !== undefined ? editingMeta.luk : ""}
                            onChange={e => setEditingMeta(prev => ({ ...prev, luk: e.target.value }))}
                            style={{
                              background: DARK3, border: `1px solid ${GOLD}44`,
                              borderRadius: 6, padding: "6px 10px", color: CREAM, fontSize: 13
                            }}
                          >
                            <option value="">-- Pilih Jumlah Luk --</option>
                            {LUK_LIST.map(l => (
                              <option key={l} value={l}>{l === 0 ? "Lurus (0 Luk)" : `Luk ${l}`}</option>
                            ))}
                          </select>
                          {editingMeta.luk !== "" && editingMeta.luk !== undefined && (
                            <div style={{ fontSize: 10, color: TEAL, marginTop: 4, lineHeight: 1.4 }}>
                              {LUK_MAKNA[parseInt(editingMeta.luk)]}
                            </div>
                          )}
                        </div>

                        {/* Auto-YOLO output preview */}
                        <div style={{
                          background: DARK3, border: `1px solid ${TEAL}22`,
                          borderRadius: 6, padding: 10, fontSize: 11
                        }}>
                          <div style={{ color: MUTED, marginBottom: 4 }}>Auto YOLO Class Label:</div>
                          <code style={{ color: TEAL, fontWeight: 700 }}>{getLabelYolo(editingMeta)}</code>
                        </div>

                        {/* BBox Save / Delete Action buttons */}
                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                          <button
                            onClick={() => confirmBox(selectedBox)}
                            style={{
                              flex: 1, background: GREEN, color: DARK, border: "none",
                              borderRadius: 6, padding: "10px", cursor: "pointer",
                              fontWeight: 700, fontSize: 12
                            }}
                          >
                            Konfirmasi Box
                          </button>
                          <button
                            onClick={() => deleteBox(selectedBox)}
                            style={{
                              background: "rgba(231,76,60,0.15)", color: RED, border: `1px solid ${RED}33`,
                              borderRadius: 6, padding: "10px 14px", cursor: "pointer"
                            }}
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div style={{
                    flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                    justifyContent: "center", textAlign: "center", color: MUTED, padding: 20,
                    background: DARK3, borderRadius: 8, border: `1px dashed ${GOLD}22`
                  }}>
                    <Sliders size={28} style={{ marginBottom: 10 }} />
                    <span style={{ fontSize: 12, lineHeight: 1.5 }}>
                      Gunakan tool <b>BBox Select</b> lalu klik box untuk memverifikasi metadata budaya.
                    </span>
                  </div>
                )}

                {/* Annotation guidelines card */}
                <div style={{
                  background: DARK3, border: `1px solid ${GOLD}11`,
                  borderRadius: 6, padding: 12, fontSize: 11, color: MUTED, lineHeight: 1.6
                }}>
                  <div style={{ color: GOLD, fontWeight: 700, marginBottom: 4 }}>PANDUAN ANOTASI:</div>
                  <div>1. Seret kursor di layar untuk menggambar box.</div>
                  <div>2. Klik Bbox Select lalu ketuk box untuk modifikasi data.</div>
                  <div>3. Gunakan tombol AI Suggest untuk pre-annotator otomatis.</div>
                  <div>4. Klik Konfirmasi untuk menyimpan koordinat ke YOLO.</div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* --- TAB 3: REAL-TIME DETECTION (INFERENCE) --- */}
        {activeTab === "detect" && (
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20, maxWidth: 1100, margin: "0 auto", width: "100%", overflowY: "auto", flex: 1 }}>

            {/* ── Banner Status Model ──────────────────────────────────────── */}
            {modelInfo && (
              <div style={{
                background: modelInfo.is_finetuned
                  ? "rgba(46,204,113,0.08)" : "rgba(192,57,43,0.10)",
                border: `1px solid ${modelInfo.is_finetuned ? "rgba(46,204,113,0.4)" : "rgba(192,57,43,0.45)"}`,
                borderRadius: 10, padding: "12px 18px",
                display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap"
              }}>
                <div style={{ fontSize: 22, lineHeight: 1 }}>
                  {modelInfo.is_finetuned ? "✅" : "⚠️"}
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 3,
                    color: modelInfo.is_finetuned ? GREEN : "#e74c3c" }}>
                    {modelInfo.is_finetuned
                      ? `MODEL FINE-TUNED AKTIF — ${modelInfo.model_file}`
                      : "MODEL PRETRAINED COCO — BELUM DI-FINETUNE UNTUK KERIS"}
                  </div>
                  <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.6 }}>
                    {modelInfo.message}
                  </div>
                  {!modelInfo.is_finetuned && (
                    <div style={{ marginTop: 6, fontSize: 11, color: GOLD }}>
                      💡 Selesaikan fine-tuning di Google Colab → hasilkan <code style={{color: TEAL}}>best.pt</code> → letakkan di folder <code style={{color: TEAL}}>runs/keris/yolov26_madura_kris/weights/</code> → klik <b>Reload Model</b>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, alignSelf: "center" }}>
                  <button
                    onClick={async () => {
                      setModelInfoLoading(true);
                      try {
                        const r = await fetch("/api/model/reload", { method: "POST" });
                        const d = await r.json();
                        if (d.model_info) setModelInfo(d.model_info);
                      } catch(e) { console.error(e); }
                      setModelInfoLoading(false);
                    }}
                    disabled={modelInfoLoading}
                    style={{
                      background: DARK3, border: `1px solid ${GOLD}44`, color: GOLD,
                      borderRadius: 6, padding: "5px 12px", cursor: modelInfoLoading ? "default" : "pointer",
                      fontSize: 11, fontWeight: 700, whiteSpace: "nowrap"
                    }}
                  >
                    {modelInfoLoading ? "..." : "🔄 Reload Model"}
                  </button>
                  <div style={{ fontSize: 10, color: MUTED, textAlign: "center" }}>
                    {modelInfo.num_classes} kelas dikenali
                  </div>
                </div>
              </div>
            )}

            {/* ── Mode & Threshold Controls ────────────────────────────────── */}
            <div style={{
              background: DARK2, border: `1px solid ${GOLD}33`, borderRadius: 10,
              padding: "14px 20px", display: "flex", alignItems: "center",
              justifyContent: "space-between", gap: 16, flexWrap: "wrap"
            }}>
              {/* Mode buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <h4 style={{ margin: 0, color: GOLD, fontSize: 13 }}>Metode Input</h4>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => { stopCamera(); setDetectMode("upload"); }}
                    style={{
                      background: detectMode === "upload" ? GOLD : DARK3,
                      color: detectMode === "upload" ? DARK : CREAM,
                      border: `1px solid ${GOLD}44`, borderRadius: 6,
                      padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700
                    }}
                  >
                    📁 File Upload
                  </button>
                  <button
                    onClick={() => { setDetectMode("camera"); startCamera(); }}
                    style={{
                      background: detectMode === "camera" ? GOLD : DARK3,
                      color: detectMode === "camera" ? DARK : CREAM,
                      border: `1px solid ${GOLD}44`, borderRadius: 6,
                      padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700
                    }}
                  >
                    📷 Kamera Live
                  </button>
                </div>
              </div>

              {/* Confidence Threshold Slider */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 260 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontSize: 11, color: GOLD, fontWeight: 700 }}>
                    THRESHOLD KEPERCAYAAN
                  </label>
                  <span style={{
                    background: DARK3, border: `1px solid ${GOLD}44`,
                    borderRadius: 4, padding: "2px 8px",
                    fontSize: 12, fontWeight: 700, color: confThreshold >= 0.5 ? GREEN : confThreshold >= 0.25 ? GOLD : TEAL
                  }}>
                    {Math.round(confThreshold * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="5" max="90" step="5"
                  value={Math.round(confThreshold * 100)}
                  onChange={e => setConfThreshold(parseInt(e.target.value) / 100)}
                  style={{ width: "100%", accentColor: GOLD, cursor: "pointer" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: MUTED }}>
                  <span>5% — Sangat Sensitif</span>
                  <span style={{ color: confThreshold < 0.25 ? TEAL : MUTED }}>
                    {confThreshold < 0.25 ? "⬅ Direkomendasikan sebelum fine-tuning" : ""}
                  </span>
                  <span>90% — Ketat</span>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: 24 }}>

              {/* ── Left: Viewport ──────────────────────────────────────────── */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {detectMode === "upload" ? (
                  <>
                    {/* Upload drag-zone */}
                    <div style={{
                      background: DARK2, border: `2px dashed ${GOLD}44`,
                      borderRadius: 12, padding: "20px 24px", textAlign: "center",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 12
                    }}>
                      <Upload size={28} color={GOLD} />
                      <div>
                        <h4 style={{ margin: "0 0 4px", fontSize: 14 }}>Unggah Foto Keris untuk Identifikasi</h4>
                        <span style={{ fontSize: 11, color: MUTED }}>Mendukung format JPG, JPEG, PNG — pastikan bilah keris terlihat jelas</span>
                      </div>
                      <input
                        type="file"
                        id="detect-file-input"
                        accept="image/*"
                        onChange={handleDetectUpload}
                        style={{ display: "none" }}
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => document.getElementById("detect-file-input").click()}
                          style={{
                            background: DARK3, border: `1px solid ${GOLD}44`, color: CREAM,
                            borderRadius: 6, padding: "8px 16px", cursor: "pointer", fontSize: 12
                          }}
                        >
                          Pilih File Gambar
                        </button>
                        <button
                          onClick={runRealTimeDetection}
                          disabled={!detectFile || detectLoading}
                          style={{
                            background: (!detectFile || detectLoading) ? "#333" : GOLD,
                            color: (!detectFile || detectLoading) ? MUTED : DARK,
                            border: "none", borderRadius: 6, padding: "8px 20px",
                            cursor: (!detectFile || detectLoading) ? "default" : "pointer",
                            fontWeight: 700, fontSize: 12,
                            display: "flex", alignItems: "center", gap: 6
                          }}
                        >
                          <Eye size={13} />
                          {detectLoading ? "Menganalisis..." : "Jalankan Deteksi YOLOv26"}
                        </button>
                      </div>
                    </div>

                    {/* Preview + bbox overlay */}
                    {detectPreview && (
                      <div style={{
                        background: DARK2, border: `1px solid ${GOLD}33`,
                        borderRadius: 12, padding: 16, display: "flex",
                        justifyContent: "center", alignItems: "center"
                      }}>
                        <div style={{ position: "relative", display: "inline-block" }}>
                          <img
                            src={detectPreview}
                            style={{ display: "block", maxWidth: "100%", maxHeight: "48vh", borderRadius: 6 }}
                          />
                          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
                            {detections.map((det, idx) => {
                              const isSel = idx === selectedDetectIdx;
                              const color = det.is_proxy ? "#e67e22" : (isSel ? GOLD : TEAL);
                              const { x, y, w, h } = det.bbox;
                              return (
                                <g key={idx} onClick={() => setSelectedDetectIdx(idx)} style={{ cursor: "pointer" }}>
                                  <rect
                                    x={`${x * 100}%`} y={`${y * 100}%`}
                                    width={`${w * 100}%`} height={`${h * 100}%`}
                                    fill={`${color}15`} stroke={color}
                                    strokeWidth={isSel ? 3 : 1.5}
                                    strokeDasharray={det.is_proxy ? "6,3" : "none"}
                                  />
                                  <foreignObject
                                    x={`${x * 100}%`} y={`${Math.max(0, y * 100 - 7)}%`}
                                    width="160" height="22"
                                  >
                                    <div style={{
                                      background: color, color: DARK, padding: "2px 7px",
                                      fontSize: 9, fontWeight: 700, borderRadius: "4px 4px 0 0",
                                      display: "inline-block", maxWidth: "100%",
                                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                                    }}>
                                      {det.is_proxy ? "≈ " : ""}#{idx + 1} {det.label} ({Math.round(det.confidence * 100)}%)
                                    </div>
                                  </foreignObject>
                                </g>
                              );
                            })}
                          </svg>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* Camera Mode */
                  <div style={{
                    background: DARK2, border: `1px solid ${GOLD}33`,
                    borderRadius: 12, padding: 16, display: "flex", flexDirection: "column",
                    alignItems: "center", gap: 12
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: GOLD, fontWeight: 700 }}>LIVE FEED KAMERA</span>
                      <button
                        onClick={cameraActive ? stopCamera : startCamera}
                        style={{
                          background: cameraActive ? RED : GREEN,
                          color: cameraActive ? CREAM : DARK,
                          border: "none", borderRadius: 6, padding: "6px 12px",
                          fontSize: 11, fontWeight: 700, cursor: "pointer"
                        }}
                      >
                        {cameraActive ? "⏹ Matikan Kamera" : "▶ Aktifkan Kamera"}
                      </button>
                    </div>
                    <div style={{ position: "relative", width: "100%", background: "#000", borderRadius: 8, overflow: "hidden", minHeight: 300 }}>
                      <video ref={videoRef} autoPlay playsInline muted
                        style={{ display: "block", width: "100%", height: "auto", minHeight: 300 }} />
                      {cameraActive && (
                        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
                          {detections.map((det, idx) => {
                            const isSel = idx === selectedDetectIdx;
                            const color = det.is_proxy ? "#e67e22" : (isSel ? GOLD : TEAL);
                            const { x, y, w, h } = det.bbox;
                            return (
                              <g key={idx} onClick={() => setSelectedDetectIdx(idx)} style={{ cursor: "pointer" }}>
                                <rect
                                  x={`${x * 100}%`} y={`${y * 100}%`}
                                  width={`${w * 100}%`} height={`${h * 100}%`}
                                  fill={`${color}10`} stroke={color}
                                  strokeWidth={isSel ? 3 : 1.5}
                                  strokeDasharray={det.is_proxy ? "6,3" : "none"}
                                />
                                <foreignObject x={`${x * 100}%`} y={`${Math.max(0, y * 100 - 7)}%`} width="140" height="20">
                                  <div style={{
                                    background: color, color: DARK, padding: "2px 5px",
                                    fontSize: 8, fontWeight: 700, borderRadius: "4px 4px 0 0",
                                    display: "inline-block"
                                  }}>
                                    {det.is_proxy ? "≈ " : ""}#{idx+1} {det.label} ({Math.round(det.confidence * 100)}%)
                                  </div>
                                </foreignObject>
                              </g>
                            );
                          })}
                        </svg>
                      )}
                      {!cameraActive && (
                        <div style={{
                          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                          alignItems: "center", justifyContent: "center", color: MUTED, gap: 10
                        }}>
                          <Eye size={36} />
                          <span style={{ fontSize: 12 }}>Kamera tidak aktif. Klik "Aktifkan Kamera" di atas.</span>
                        </div>
                      )}
                    </div>
                    {cameraActive && (
                      <div style={{ fontSize: 10, color: MUTED, textAlign: "center" }}>
                        Deteksi otomatis setiap 750ms • Threshold: {Math.round(confThreshold * 100)}%
                        {modelInfo && !modelInfo.is_finetuned && (
                          <span style={{ color: "#e67e22" }}> • Mode proxy COCO (garis putus-putus)</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Right: Cultural Metadata / Empty State ───────────────── */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {detections.length > 0 ? (
                  (() => {
                    const activeDet = detections[selectedDetectIdx];
                    if (!activeDet) return null;
                    const meta = activeDet.cultural_meta || {};
                    const d  = meta.dapur    || {};
                    const p  = meta.pamor    || {};
                    const e  = meta.empu     || {};
                    const t  = meta.tangguh  || {};
                    const w  = meta.warangka || {};
                    const l  = meta.luk_info || {};
                    const lk = meta.luk_count;
                    const sb = meta.status_budaya || {};
                    const lukStr = lk === 0 ? "Lurus (0 Luk)" : (lk ? `Luk ${lk}` : "Tidak Diketahui");

                    return (
                      <div style={{
                        background: "linear-gradient(135deg, #1a0e00 0%, #2d1a00 50%, #1a0e00 100%)",
                        border: `2px solid ${activeDet.is_proxy ? "#e67e22" : GOLD}`,
                        borderRadius: 12, padding: 22, color: CREAM,
                        display: "flex", flexDirection: "column", gap: 14,
                        boxShadow: `0 8px 32px rgba(${activeDet.is_proxy ? "230,126,34" : "201,168,76"},0.15)`
                      }}>
                        {/* Header */}
                        <div style={{
                          fontFamily: "'Cinzel', serif", fontSize: 16, color: activeDet.is_proxy ? "#e67e22" : GOLD,
                          borderBottom: `1px solid ${activeDet.is_proxy ? "#e67e2244" : GOLD + "44"}`, paddingBottom: 10,
                          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8
                        }}>
                          <span>🗡️ DETAIL BUDAYA KERIS #{selectedDetectIdx + 1}</span>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {activeDet.is_proxy && (
                              <span style={{
                                background: "rgba(230,126,34,0.15)", color: "#e67e22",
                                border: "1px solid #e67e2255", fontSize: 9,
                                fontWeight: 700, padding: "2px 8px", borderRadius: 12
                              }}>
                                ≈ PROXY COCO: {activeDet.raw_coco_name}
                              </span>
                            )}
                            <span style={{
                              background: activeDet.is_proxy ? "#e67e22" : GOLD, color: DARK,
                              fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 12
                            }}>
                              Akurasi: {Math.round(activeDet.confidence * 100)}%
                            </span>
                          </div>
                        </div>

                        {/* Proxy warning */}
                        {activeDet.is_proxy && (
                          <div style={{
                            background: "rgba(230,126,34,0.08)", border: "1px solid rgba(230,126,34,0.3)",
                            borderRadius: 6, padding: "8px 12px", fontSize: 11, color: "#e67e22", lineHeight: 1.5
                          }}>
                            ⚠️ <b>Deteksi Proxy:</b> Model pretrained COCO mendeteksi objek mirip bilah (<i>{activeDet.raw_coco_name}</i>).
                            Metadata budaya di bawah adalah <b>estimasi</b> — akurasi rendah sebelum fine-tuning selesai.
                          </div>
                        )}

                        {/* Pilih deteksi jika lebih dari 1 */}
                        {detections.length > 1 && (
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {detections.map((_, i) => (
                              <button key={i}
                                onClick={() => setSelectedDetectIdx(i)}
                                style={{
                                  background: i === selectedDetectIdx ? GOLD : DARK3,
                                  color: i === selectedDetectIdx ? DARK : CREAM,
                                  border: `1px solid ${GOLD}44`, borderRadius: 4,
                                  padding: "3px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700
                                }}
                              >
                                #{i + 1}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Grid info utama */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          {[
                            { icon: "⚔️", key: "DAPUR (BILAH)",   val: d.nama || "—",  sub: d.deskripsi || "Bilah keris khas Madura" },
                            { icon: "✨", key: "PAMOR (MOTIF)",   val: p.nama || "—",  sub: p.makna     || "Simbol keberuntungan" },
                            { icon: "🏛️", key: "EMPU / PENGRAJIN", val: e.nama || "Para Empu Aeng Tongtong", sub: e.era || "Desa Sumenep" },
                            { icon: "📅", key: "TANGGUH (ERA)",   val: t.nama || "Tangguh Madura", sub: t.periode || "Abad ke-17 - Sekarang" },
                          ].map(({ icon, key, val, sub }) => (
                            <div key={key} style={{
                              background: "rgba(201,168,76,0.04)", border: `1px solid ${GOLD}22`,
                              borderRadius: 8, padding: 10
                            }}>
                              <div style={{ fontSize: 9, color: GOLD, fontWeight: 700, letterSpacing: 1 }}>{icon} {key}</div>
                              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{val}</div>
                              <div style={{ fontSize: 10, color: MUTED, marginTop: 2, lineHeight: 1.4 }}>{sub}</div>
                            </div>
                          ))}
                        </div>

                        {/* Luk filosofi */}
                        <div style={{ background: "rgba(201,168,76,0.03)", borderLeft: `3px solid ${GOLD}`, padding: 12, borderRadius: "0 8px 8px 0" }}>
                          <div style={{ fontSize: 10, color: GOLD, fontWeight: 700, marginBottom: 4 }}>
                            🌀 KONDISI BILAH & LUK — {lukStr}
                          </div>
                          <div style={{ fontSize: 12, color: CREAM, fontStyle: "italic", lineHeight: 1.5 }}>
                            {l.makna || "Bilah keris menyimpan filosofi mendalam tentang keseimbangan alam dan kehidupan."}
                          </div>
                        </div>

                        {/* Filosofi dapur + pamor */}
                        <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
                          <b>Filosofi Dapur:</b> {d.filosofi || "Karakteristik bilah keris Madura — simbol kejujuran dan ketegasan."}<br/>
                          <b>Metode Pamor:</b> {p.proses || "Proses tempa lipatan baja nikel meteorit khas Madura Timur."}
                        </div>

                        {/* UNESCO */}
                        <div style={{
                          background: "rgba(0,100,200,0.08)", border: "1px solid rgba(0,150,255,0.2)",
                          borderRadius: 6, padding: "8px 12px", fontSize: 10, color: "#90caf9", lineHeight: 1.5
                        }}>
                          🏛️ <b>Warisan Budaya UNESCO:</b> {sb.unesco || "Keris Indonesia diakui UNESCO sejak 2008."}<br/>
                          📍 <b>Desa Mitra:</b> {sb.desa_pengrajin || "Desa Aeng Tongtong, Saronggi, Sumenep, Jawa Timur"}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  /* ── Empty State Informatif ─────────────────────────────── */
                  <div style={{
                    background: DARK2, border: `1px solid ${GOLD}22`, borderRadius: 12,
                    padding: 28, display: "flex", flexDirection: "column", gap: 18
                  }}>

                    {/* Judul empty state — beda pesan jika sudah deteksi tapi 0 hasil */}
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>
                        {lastDetectHadResult === false ? "🔍" : "🗡️"}
                      </div>
                      <h4 style={{ margin: "0 0 6px", color: CREAM, fontSize: 15 }}>
                        {lastDetectHadResult === false
                          ? "Tidak Ada Objek Terdeteksi"
                          : "Siap Mengidentifikasi Keris"}
                      </h4>
                      <p style={{ margin: 0, fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
                        {lastDetectHadResult === false
                          ? `Tidak ada objek yang memenuhi threshold ${Math.round(confThreshold * 100)}%. Coba turunkan threshold atau gunakan foto yang lebih jelas.`
                          : "Unggah foto keris atau aktifkan kamera untuk memulai identifikasi dan menampilkan metadata budaya Madura."}
                      </p>
                    </div>

                    {/* Tips jika 0 hasil setelah deteksi */}
                    {lastDetectHadResult === false && (
                      <div style={{
                        background: "rgba(201,168,76,0.05)", border: `1px solid ${GOLD}22`,
                        borderRadius: 8, padding: 14
                      }}>
                        <div style={{ fontSize: 11, color: GOLD, fontWeight: 700, marginBottom: 8 }}>
                          💡 Saran Perbaikan
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: MUTED, lineHeight: 1.8 }}>
                          {!modelInfo?.is_finetuned && (
                            <li>Turunkan threshold ke <b style={{ color: TEAL }}>10–15%</b> — model belum di-finetune, proxy COCO butuh sensitivitas tinggi</li>
                          )}
                          <li>Pastikan bilah keris (bukan gagang) terlihat <b>penuh</b> di gambar</li>
                          <li>Gunakan foto dengan latar belakang <b>kontras</b> (putih/hitam polos)</li>
                          <li>Hindari foto buram, gelap, atau dari sudut ekstrem</li>
                          {modelInfo?.is_finetuned && (
                            <li>Jika model fine-tuned tetap gagal, coba <b>naikkan epoch training</b> di notebook</li>
                          )}
                        </ul>
                      </div>
                    )}

                    {/* Panduan foto ideal */}
                    <div style={{ borderTop: `1px solid ${GOLD}22`, paddingTop: 16 }}>
                      <div style={{ fontSize: 11, color: GOLD, fontWeight: 700, marginBottom: 10 }}>
                        📸 Panduan Foto untuk Hasil Terbaik
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {[
                          { icon: "✅", label: "Bilah tampak keseluruhan", desc: "Dari pucuk hingga gandik" },
                          { icon: "✅", label: "Latar belakang kontras", desc: "Kain hitam atau putih polos" },
                          { icon: "✅", label: "Pencahayaan merata", desc: "Hindari bayangan atau overexpose" },
                          { icon: "✅", label: "Resolusi cukup", desc: "Min. 480×640 piksel" },
                          { icon: "❌", label: "Foto dari sudut ekstrem", desc: "Perspektif distorsi bilah" },
                          { icon: "❌", label: "Foto bersama banyak benda", desc: "Bisa membingungkan model" },
                        ].map(({ icon, label, desc }) => (
                          <div key={label} style={{
                            background: DARK3, borderRadius: 6, padding: "8px 10px",
                            display: "flex", gap: 8, alignItems: "flex-start"
                          }}>
                            <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: CREAM }}>{label}</div>
                              <div style={{ fontSize: 10, color: MUTED }}>{desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Status model mini */}
                    {modelInfo && (
                      <div style={{
                        background: modelInfo.is_finetuned ? "rgba(46,204,113,0.05)" : "rgba(192,57,43,0.06)",
                        border: `1px solid ${modelInfo.is_finetuned ? "rgba(46,204,113,0.2)" : "rgba(192,57,43,0.2)"}`,
                        borderRadius: 6, padding: "8px 12px", fontSize: 10, color: MUTED
                      }}>
                        🤖 <b style={{ color: modelInfo.is_finetuned ? GREEN : "#e74c3c" }}>
                          {modelInfo.is_finetuned ? "Model Fine-tuned Aktif" : "Model Pretrained COCO"}
                        </b> — {modelInfo.model_file} — {modelInfo.num_classes} kelas
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

      {/* Style for Modal Transition */}
      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      {/* --- Aesthetic Custom Alert/Confirm Modal --- */}
      {modal.show && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0, 0, 0, 0.75)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 9999, transition: "all 0.3s ease"
        }}>
          <div style={{
            background: DARK2, border: `2px solid ${GOLD}`,
            borderRadius: 12, width: "90%", maxWidth: 450,
            boxShadow: `0 8px 32px rgba(0, 0, 0, 0.8), 0 0 20px rgba(201, 168, 76, 0.15)`,
            overflow: "hidden", display: "flex", flexDirection: "column",
            animation: "modalFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
          }}>
            {/* Modal Header */}
            <div style={{
              background: `linear-gradient(135deg, ${DARK3}, ${DARK2})`,
              padding: "16px 20px", borderBottom: `1px solid ${GOLD}44`,
              display: "flex", alignItems: "center", gap: 12
            }}>
              <span style={{ fontSize: 20 }}>{modal.type === "confirm" ? "❓" : "⚠️"}</span>
              <h3 style={{
                fontFamily: "'Cinzel', serif", color: GOLD, margin: 0,
                fontSize: 16, fontWeight: 700, letterSpacing: 1
              }}>
                {modal.title}
              </h3>
            </div>
            
            {/* Modal Body */}
            <div style={{ padding: "20px", fontSize: 13, color: CREAM, lineHeight: 1.6 }}>
              {modal.message}
            </div>
            
            {/* Modal Footer */}
            <div style={{
              background: DARK3, padding: "12px 20px",
              display: "flex", justifyContent: "flex-end", gap: 10,
              borderTop: `1px solid ${GOLD}22`
            }}>
              {modal.type === "confirm" ? (
                <>
                  <button
                    onClick={modal.onCancel}
                    style={{
                      background: "transparent", border: `1px solid ${GOLD}44`,
                      color: GOLD, borderRadius: 6, padding: "8px 16px",
                      fontSize: 12, fontWeight: 600, cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = `${GOLD}11`;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    Batal
                  </button>
                  <button
                    onClick={modal.onConfirm}
                    style={{
                      background: modal.title.toLowerCase().includes("hapus") || modal.message.toLowerCase().includes("hapus") ? RED : GOLD,
                      border: "none",
                      color: modal.title.toLowerCase().includes("hapus") || modal.message.toLowerCase().includes("hapus") ? "#fff" : DARK,
                      borderRadius: 6, padding: "8px 16px",
                      fontSize: 12, fontWeight: 600, cursor: "pointer",
                      boxShadow: modal.title.toLowerCase().includes("hapus") || modal.message.toLowerCase().includes("hapus")
                        ? "0 2px 8px rgba(231, 76, 60, 0.4)"
                        : `0 2px 8px rgba(201, 168, 76, 0.4)`,
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.filter = "brightness(1.1)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.filter = "none";
                    }}
                  >
                    {modal.title.toLowerCase().includes("hapus") || modal.message.toLowerCase().includes("hapus") ? "Hapus" : "Ya"}
                  </button>
                </>
              ) : (
                <button
                  onClick={modal.onConfirm}
                  style={{
                    background: GOLD, border: "none",
                    color: DARK, borderRadius: 6, padding: "8px 20px",
                    fontSize: 12, fontWeight: 700, cursor: "pointer",
                    transition: "all 0.2s"
                    // boxShadow: `0 2px 8px ${GOLD}66`
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.filter = "brightness(1.1)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.filter = "none";
                  }}
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      </main>

    </div>
  );
}
