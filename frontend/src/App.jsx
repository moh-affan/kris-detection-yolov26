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
  "Lintang Kemukus","Wahyu Tumurun","Sekar Susun","Manggar"
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
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectIntervalRef = useRef(null);

  // Stop camera stream on unmount or tab change
  useEffect(() => {
    if (activeTab !== "detect") {
      stopCamera();
    }
  }, [activeTab]);

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
      alert("Gagal mengakses kamera: " + e.message);
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

      try {
        const r = await fetch("/api/detect", { method: "POST", body: formData });
        if (!r.ok) return;
        const d = await r.json();
        if (d.detections && d.detections.length > 0) {
          setDetections(d.detections);
          // Auto-select first kris detected for immediate cultural display
          setSelectedDetectIdx(0);
        }
      } catch (err) {
        console.error("Live detection failed:", err);
      }
    }, "image/jpeg", 0.85);
  };


  // --- Initialize & Polling Crawler ---
  useEffect(() => {
    fetchCrawlerStatus();
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

  const startCrawler = async () => {
    try {
      const formData = new FormData();
      formData.append("max_pages", pagesInput);
      const r = await fetch("/api/crawler/start", { method: "POST", body: formData });
      const d = await r.json();
      fetchCrawlerStatus();
    } catch (e) {
      alert("Gagal memulai crawler: " + e.message);
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

  useEffect(() => {
    if (!currentImg) return;
    setBoxes(currentImg.boxes || []);
    setSelectedBox(null);
    setEditingMeta({});
  }, [currentIdx, images]);

  const saveBoxesToStateAndServer = async (newBoxes, markStatus = null) => {
    if (!currentImg) return;
    setBoxes(newBoxes);
    
    // Save to local state
    setImages(prev => prev.map((img, i) => 
      i === currentIdx ? { ...img, boxes: newBoxes, status: markStatus || img.status } : img
    ));

    // Post to FastAPI server
    try {
      const body = {
        filename: currentImg.filename,
        class_folder: currentImg.class_folder,
        boxes: newBoxes
      };
      await fetch("/api/annotations/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
    } catch (e) {
      console.error("Failed saving annotation to backend:", e);
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

  const onMouseDown = (e) => {
    if (tool !== "draw") return;
    const pt = getCanvasCoord(e);
    setDrawing(true);
    setStartPt(pt);
    setTempBox(null);
    setSelectedBox(null);
  };

  const onMouseMove = (e) => {
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
      dhapur: "",
      pamor: "",
      tangguh: "",
      luk: guessedLuk !== "" ? parseInt(guessedLuk) : "",
      confirmed: false,
    };

    const updated = [...boxes, newBox];
    saveBoxesToStateAndServer(updated);
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
        saveBoxesToStateAndServer(parsedBoxes);
        
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
      alert("Gagal memanggil modul AI offline: " + e.message);
    }
    setAiLoading(false);
  };

  // --- Real-time Detection Logic ---
  const handleDetectUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setDetectFile(file);
    setDetectPreview(URL.createObjectURL(file));
    setDetections([]);
  };

  const runRealTimeDetection = async () => {
    if (!detectFile) return;
    setDetectLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", detectFile);
      const r = await fetch("/api/detect", { method: "POST", body: formData });
      const d = await r.json();
      setDetections(d.detections || []);
      setSelectedDetectIdx(0);
    } catch (e) {
      alert("Inference failed: " + e.message);
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
      minHeight: "100vh", background: DARK, color: CREAM,
      fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column",
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
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24, maxWidth: 1200, margin: "0 auto", width: "100%" }}>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              
              {/* Crawler Controls */}
              <div style={{
                background: DARK2, border: `1px solid ${GOLD}33`,
                borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 16
              }}>
                <h3 style={{ fontFamily: "'Cinzel', serif", color: GOLD, margin: "0 0 10px", fontSize: 16 }}>
                  Penyiapan Dataset (PusakaKeris Crawler)
                </h3>
                <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, margin: 0 }}>
                  Fitur ini melakukan crawling katalog online secara terstruktur untuk mengumpulkan gambar bilah keris, deskripsi, harga, pamor, dan luk awal.
                </p>

                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 11, color: MUTED }}>BATASAN HALAMAN KATALOG</label>
                    <input 
                      type="number" 
                      min="1" max="54" 
                      value={pagesInput} 
                      onChange={e => setPagesInput(parseInt(e.target.value))}
                      style={{
                        background: DARK3, border: `1px solid ${GOLD}44`,
                        borderRadius: 6, padding: "8px 12px", color: CREAM,
                        fontSize: 14, outline: "none", width: 140
                      }}
                    />
                  </div>
                  
                  <button
                    onClick={startCrawler}
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
                        onClick={() => setCurrentIdx(originalIdx)}
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
                  <div style={{ position: "relative", display: "inline-block", boxShadow: "0 0 32px #000000dd" }}>
                    
                    <img
                      ref={imgRef}
                      src={`/api/images/serve?path=${encodeURIComponent(currentImg.rel_path)}`}
                      onLoad={e => setImgNaturalSize({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
                      style={{ display: "block", maxWidth: "65vw", maxHeight: "65vh", userSelect: "none", pointerEvents: "none" }}
                    />
                    
                    <svg
                      ref={canvasRef}
                      style={{
                        position: "absolute", inset: 0, width: "100%", height: "100%",
                        cursor: tool === "draw" ? "crosshair" : "default"
                      }}
                      onMouseDown={onMouseDown}
                      onMouseMove={onMouseMove}
                      onMouseUp={onMouseUp}
                      onClick={tool === "select" ? () => setSelectedBox(null) : undefined}
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
                padding: 16, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto"
              }}>
                <h3 style={{ fontFamily: "'Cinzel', serif", color: GOLD, fontSize: 14, margin: "0 0 4px" }}>
                  MODUL VERIFIKASI METADATA
                </h3>
                <div style={{ fontSize: 11, color: MUTED, wordBreak: "break-all" }}>
                  File: {currentImg.filename}
                </div>

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
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24, maxWidth: 1100, margin: "0 auto", width: "100%" }}>
            
            {/* Mode selection header */}
            <div style={{
              background: DARK2, border: `1px solid ${GOLD}33`, borderRadius: 10,
              padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between"
            }}>
              <div>
                <h4 style={{ margin: 0, color: GOLD, fontSize: 14 }}>Metode Input Pengenalan</h4>
                <p style={{ margin: 0, fontSize: 11, color: MUTED }}>Pilih antara unggah foto statis atau kamera real-time</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => {
                    stopCamera();
                    setDetectMode("upload");
                  }}
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
                  onClick={() => {
                    setDetectMode("camera");
                    startCamera();
                  }}
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

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24 }}>
              
              {/* Left Viewport Upload & Results */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                
                {detectMode === "upload" ? (
                  <>
                    {/* Upload dragzone */}
                    <div style={{
                      background: DARK2, border: `2px dashed ${GOLD}44`,
                      borderRadius: 12, padding: 24, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12
                    }}>
                      <Upload size={32} color={GOLD} />
                      <div>
                        <h4 style={{ margin: "0 0 4px", fontSize: 14 }}>Unggah Foto Keris untuk Identifikasi</h4>
                        <span style={{ fontSize: 11, color: MUTED }}>Mendukung format JPG, JPEG, PNG</span>
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
                            fontWeight: 700, fontSize: 12
                          }}
                        >
                          {detectLoading ? "Sedang Menganalisis..." : "Jalankan Deteksi YOLO26"}
                        </button>
                      </div>
                    </div>

                    {/* Upload preview image with bbox drawn */}
                    {detectPreview && (
                      <div style={{
                        background: DARK2, border: `1px solid ${GOLD}33`,
                        borderRadius: 12, padding: 16, display: "flex", justifyContent: "center", alignItems: "center"
                      }}>
                        <div style={{ position: "relative", display: "inline-block" }}>
                          <img 
                            src={detectPreview} 
                            style={{ display: "block", maxWidth: "100%", maxHeight: "50vh", borderRadius: 6 }} 
                          />
                          
                          {/* Detection boxes overlay */}
                          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
                            {detections.map((det, idx) => {
                              const isSel = idx === selectedDetectIdx;
                              const color = isSel ? GOLD : TEAL;
                              const { x, y, w, h } = det.bbox;
                              return (
                                <g 
                                  key={idx} 
                                  onClick={() => setSelectedDetectIdx(idx)}
                                  style={{ cursor: "pointer" }}
                                >
                                  <rect
                                    x={`${x * 100}%`}
                                    y={`${y * 100}%`}
                                    width={`${w * 100}%`}
                                    height={`${h * 100}%`}
                                    fill={`${color}15`}
                                    stroke={color}
                                    strokeWidth={isSel ? 3 : 1.5}
                                  />
                                  <foreignObject
                                    x={`${x * 100}%`}
                                    y={`${y * 100 - 20}%`}
                                    width="120"
                                    height="20"
                                  >
                                    <div style={{
                                      background: color, color: DARK, padding: "2px 6px",
                                      fontSize: 9, fontWeight: 700, borderRadius: "4px 4px 0 0",
                                      display: "inline-block"
                                    }}>
                                      #{idx + 1} {det.label} ({Math.round(det.confidence * 100)}%)
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
                  /* Camera Mode Viewport */
                  <div style={{
                    background: DARK2, border: `1px solid ${GOLD}33`,
                    borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 12
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: GOLD, fontWeight: 700 }}>LIVE FEED INFRASTRUKTUR KAMERA</span>
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

                    <div style={{ position: "relative", width: "100%", background: "#000", borderRadius: 8, overflow: "hidden", minHeight: 320 }}>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{ display: "block", width: "100%", height: "auto", minHeight: 320 }}
                      />

                      {/* Bounding box SVG overlays */}
                      {cameraActive && (
                        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
                          {detections.map((det, idx) => {
                            const isSel = idx === selectedDetectIdx;
                            const color = isSel ? GOLD : TEAL;
                            const { x, y, w, h } = det.bbox;
                            return (
                              <g 
                                key={idx}
                                onClick={() => setSelectedDetectIdx(idx)}
                                style={{ cursor: "pointer" }}
                              >
                                <rect
                                  x={`${x * 100}%`}
                                  y={`${y * 100}%`}
                                  width={`${w * 100}%`}
                                  height={`${h * 100}%`}
                                  fill={`${color}10`}
                                  stroke={color}
                                  strokeWidth={isSel ? 3 : 1.5}
                                />
                                <foreignObject
                                  x={`${x * 100}%`}
                                  y={`${y * 100 - 20}%`}
                                  width="120"
                                  height="20"
                                >
                                  <div style={{
                                    background: color, color: DARK, padding: "2px 5px",
                                    fontSize: 8, fontWeight: 700, borderRadius: "4px 4px 0 0",
                                    display: "inline-block"
                                  }}>
                                    #{idx + 1} {det.label} ({Math.round(det.confidence * 100)}%)
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
                  </div>
                )}
              </div>

              {/* Right Viewport Cultural Metadata Card */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                {detections.length > 0 ? (
                  (() => {
                    const activeDet = detections[selectedDetectIdx];
                    if (!activeDet) return null;
                    const meta = activeDet.cultural_meta;
                    const d = meta.dapur;
                    const p = meta.pamor;
                    const e = meta.empu;
                    const t = meta.tangguh;
                    const w = meta.warangka;
                    const l = meta.luk_info;
                    const lk = meta.luk_count;
                    const sb = meta.status_budaya;
                    
                    const lukStr = lk === 0 ? "Lurus (0 Luk)" : `Luk ${lk}`;
                    
                    return (
                      <div style={{
                        background: "linear-gradient(135deg, #1a0e00 0%, #2d1a00 50%, #1a0e00 100%)",
                        border: `2px solid ${GOLD}`, borderRadius: 12, padding: 24,
                        color: CREAM, display: "flex", flexDirection: "column", gap: 16,
                        boxShadow: "0 8px 32px rgba(201,168,76,0.15)"
                      }}>
                        <div style={{
                          fontFamily: "'Cinzel', serif", fontSize: 18, color: GOLD,
                          borderBottom: `1px solid ${GOLD}44`, paddingBottom: 10,
                          display: "flex", alignItems: "center", justifyContent: "space-between"
                        }}>
                          <span>🗡️ DETAIL BUDAYA KERIS #{selectedDetectIdx + 1}</span>
                          <span style={{
                            background: GOLD, color: DARK, fontSize: 11,
                            fontWeight: 700, padding: "2px 8px", borderRadius: 12
                          }}>
                            Akurasi: {Math.round(activeDet.confidence * 100)}%
                          </span>
                        </div>

                        {/* Grid info */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          
                          <div style={{ background: "rgba(201,168,76,0.05)", border: `1px solid ${GOLD}22`, borderRadius: 8, padding: 10 }}>
                            <div style={{ fontSize: 9, color: GOLD, fontWeight: 700, letterSpacing: 1 }}>⚔️ DAPUR (BILAH)</div>
                            <div style={{ fontSize: 14, fontWeight: 700 }}>{d.nama || "Jalak"}</div>
                            <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{d.deskripsi || "Bilah lurus khas Madura"}</div>
                          </div>

                          <div style={{ background: "rgba(201,168,76,0.05)", border: `1px solid ${GOLD}22`, borderRadius: 8, padding: 10 }}>
                            <div style={{ fontSize: 9, color: GOLD, fontWeight: 700, letterSpacing: 1 }}>✨ PAMOR (MOTIF)</div>
                            <div style={{ fontSize: 14, fontWeight: 700 }}>{p.nama || "Beras Wutah"}</div>
                            <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{p.makna || "Rezeki yang melimpah"}</div>
                          </div>

                          <div style={{ background: "rgba(201,168,76,0.05)", border: `1px solid ${GOLD}22`, borderRadius: 8, padding: 10 }}>
                            <div style={{ fontSize: 9, color: GOLD, fontWeight: 700, letterSpacing: 1 }}>🏛️ EMPU / PENGRAJIN</div>
                            <div style={{ fontSize: 14, fontWeight: 700 }}>{e.nama || "Para Empu Aeng Tongtong"}</div>
                            <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{e.era || "Desa Pengrajin Sumenep"}</div>
                          </div>

                          <div style={{ background: "rgba(201,168,76,0.05)", border: `1px solid ${GOLD}22`, borderRadius: 8, padding: 10 }}>
                            <div style={{ fontSize: 9, color: GOLD, fontWeight: 700, letterSpacing: 1 }}>📅 TANGGUH (ERA)</div>
                            <div style={{ fontSize: 14, fontWeight: 700 }}>{t.nama || "Tangguh Madura"}</div>
                            <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{t.periode || "Abad ke-17 - Sekarang"}</div>
                          </div>

                        </div>

                        {/* Luk Meaning */}
                        <div style={{ background: "rgba(201,168,76,0.03)", borderLeft: `3px solid ${GOLD}`, padding: 12, borderRadius: "0 8px 8px 0" }}>
                          <div style={{ fontSize: 10, color: GOLD, fontWeight: 700, marginBottom: 4 }}>🌀 KONDISI BILAH & FILOSOFI LUK ({lukStr})</div>
                          <div style={{ fontSize: 12, color: CREAM, fontStyle: "italic" }}>{l.makna || "Bilah lurus mencerminkan kejujuran dan kemantapan jiwa."}</div>
                        </div>

                        {/* Cultural description notes */}
                        <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
                          <b>Filosofi Dapur:</b> {d.filosofi || "Karakteristik bilah keris Madura yang melambangkan kejujuran dan ketegasan sikap."}<br/>
                          <b>Metode Pamor:</b> {p.proses || "Proses tempa lipatan baja nikel meteorit khas Madura Timur."}
                        </div>

                        {/* UNESCO warisan banner */}
                        <div style={{
                          background: "rgba(0,100,200,0.1)", border: "1px solid rgba(0,150,255,0.25)",
                          borderRadius: 6, padding: "8px 12px", fontSize: 10, color: "#90caf9", lineHeight: 1.4
                        }}>
                          🏛️ <b>Warisan Budaya Dunia UNESCO:</b> {sb.unesco || "Keris Indonesia diakui UNESCO sejak 2008."}<br/>
                          📍 <b>Desa Mitra:</b> {sb.desa_pengrajin || "Desa Aeng Tongtong, Saronggi, Sumenep"}
                        </div>

                      </div>
                    );
                  })()
                ) : (
                  <div style={{
                    background: DARK2, border: `1px solid ${GOLD}22`, borderRadius: 12, padding: 48,
                    textAlign: "center", color: MUTED, display: "flex", flexDirection: "column", alignItems: "center", gap: 12
                  }}>
                    <Info size={36} color={GOLD} />
                    <div>
                      <h4 style={{ margin: "0 0 4px", color: CREAM }}>Hasil Deteksi Budaya</h4>
                      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6 }}>
                        Silakan unggah gambar di sebelah kiri atau aktifkan kamera live untuk mendeteksi keris dan memunculkan metadata nilai filosofinya.
                      </p>
                    </div>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

      </main>
    </div>
  );
}
