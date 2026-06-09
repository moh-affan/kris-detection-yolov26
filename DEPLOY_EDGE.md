# 🌐 Panduan Deployment di Edge Device (Armbian / Raspberry Pi)

Dokumen ini menjelaskan langkah-langkah mengoptimalkan dan menjalankan sistem **Deteksi Keris YOLOv26** pada perangkat dengan spesifikasi terbatas (*edge device*) seperti **Armbian HG680P/B860H (RAM 2GB, CPU Quad-Core ARM)** atau Raspberry Pi.

---

## 📌 Rekomendasi Arsitektur untuk Edge Device

Untuk menjaga kestabilan perangkat dengan RAM ≤ 2GB, kita membagi arsitektur jalannya sistem menjadi dua bagian:
1.  **Frontend (React/Vite)**: Di-compile di PC pengembang menjadi file statis HTML/CSS/JS, kemudian disajikan di Edge Device menggunakan **Nginx** (Sangat ringan, memakan RAM < 15MB).
2.  **Backend (FastAPI)**: Dijalankan dengan model YOLO yang diekspor ke format **ONNX** dan dijalankan menggunakan **ONNX Runtime** (menurunkan penggunaan RAM dari ~1.2GB menjadi ~150MB dan mempercepat inferensi pada CPU ARM).

---

## 🛠️ Langkah 1: Persiapan Environment di Armbian

### 1.1. Mengaktifkan Swap Space (Wajib untuk RAM 2GB)
Tanpa Swap, prosesor akan mengalami *crash* saat instalasi paket Python atau saat pertama kali memuat model (Out of Memory).
Jalankan perintah ini di terminal Armbian Anda:

```bash
# Buat berkas swap sebesar 2GB
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Simpan agar otomatis aktif saat reboot
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 1.2. Pasang Kebutuhan Sistem
```bash
sudo apt update && sudo apt install -y \
    python3-pip \
    python3-venv \
    nginx \
    libgl1-mesa-glx \
    libglib2.0-0
```

---

## 🧠 Langkah 2: Optimasi Model YOLO ke ONNX

Jangan memuat file `.pt` asli di Armbian menggunakan PyTorch penuh karena terlalu berat. Ekspor terlebih dahulu ke ONNX.

1.  **Di PC Anda (atau Google Colab)** yang memiliki library `ultralytics`, jalankan script python berikut:
    ```python
    from ultralytics import YOLO

    # Load model hasil training Anda
    model = YOLO("yolo26n.pt") 

    # Ekspor ke format ONNX
    model.export(format="onnx", imgsz=640, half=False)
    ```
2.  Proses ini akan menghasilkan berkas **`yolo26n.onnx`**.
3.  Pindahkan file `yolo26n.onnx` ke folder `backend/` di perangkat Armbian Anda.

---

## 🔌 Langkah 3: Setup Backend dengan ONNX Runtime

Di perangkat Armbian, buat virtual environment Python dan pasang dependensi yang telah disesuaikan agar tidak menginstal PyTorch / Ultralytics penuh.

### 3.1. Buat Virtual Environment
```bash
cd /path/to/kris-detection-yolov26/backend
python3 -m venv venv
source venv/bin/activate
```

### 3.2. Instal Python Packages Pendukung
Gunakan `onnxruntime` dan `opencv-python-headless` (versi tanpa GUI untuk menghemat space):
```bash
pip install --upgrade pip
pip install fastapi uvicorn numpy opencv-python-headless pillow requests python-multipart onnxruntime
```

### 3.3. Penyesuaian Kode Inferensi (Contoh Implementasi ONNX di Backend)
Buat atau sesuaikan kode deteksi di backend agar memuat ONNX runtime. Berikut adalah snippet contoh pembacaan model ONNX untuk deteksi gambar:

```python
import cv2
import numpy as np
import onnxruntime as ort

class ONNXDetector:
    def __init__(self, model_path="backend/yolo26n.onnx"):
        # Load ONNX session dengan CPU execution provider
        self.session = ort.InferenceSession(model_path, providers=['CPUExecutionProvider'])
        self.input_name = self.session.get_inputs()[0].name
        self.output_names = [x.name for x in self.session.get_outputs()]

    def detect(self, img_bgr):
        # 1. Preprocess Gambar (Resize ke 640x640, BGR ke RGB, Normalisasi /255)
        h, w, _ = img_bgr.shape
        img = cv2.resize(img_bgr, (640, 640))
        img = img[:, :, ::-1].transpose(2, 0, 1)  # HWC to CHW & BGR to RGB
        img = np.ascontiguousarray(img, dtype=np.float32) / 255.0
        img = np.expand_dims(img, axis=0) # Add batch dimension

        # 2. Jalankan Inferensi
        outputs = self.session.run(self.output_names, {self.input_name: img})
        
        # 3. Postprocess output YOLO
        # Olah koordinat bounding box, confidence score, dan class ID di sini...
        return outputs
```

---

## 🎨 Langkah 4: Build & Deploy Frontend (React)

### 4.1. Lakukan Build di Laptop/PC Anda
JANGAN jalankan `npm run build` di dalam Armbian karena RAM 2GB tidak akan kuat melakukan *bundling* JavaScript.

```bash
# Jalankan perintah ini di laptop Anda pada direktori /frontend
cd frontend
npm install
npm run build
```
Hasil build akan berada di direktori `frontend/dist/`.

### 4.2. Transfer File ke Armbian
Kompres folder `dist` tersebut dan kirim ke Armbian (misal menggunakan `scp` atau SFTP):
```bash
tar -czvf dist.tar.gz dist/
scp dist.tar.gz user@alamat_ip_armbian:/var/www/deteksi-keris/
```

### 4.3. Konfigurasi Nginx di Armbian
Ekstrak file frontend di Armbian:
```bash
cd /var/www/deteksi-keris/
sudo tar -xzvf dist.tar.gz
```

Buat konfigurasi server Nginx baru di `/etc/nginx/sites-available/deteksi-keris`:
```nginx
server {
    listen 80;
    server_name _; # Ganti dengan IP HG680P Anda jika ada

    root /var/www/deteksi-keris/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Teruskan request API ke backend FastAPI
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Aktifkan konfigurasi dan restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/deteksi-keris /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🚀 Langkah 5: Konfigurasi Service Otomatis (Systemd)

Agar backend FastAPI berjalan otomatis setiap kali STB HG680P dinyalakan, buatlah *systemd service*.

Buat file `/etc/systemd/system/kris-backend.service`:
```ini
[Unit]
Description=FastAPI Backend Deteksi Keris
After=network.target

[Service]
User=root
WorkingDirectory=/path/to/kris-detection-yolov26/backend
ExecStart=/path/to/kris-detection-yolov26/backend/venv/bin/uvicorn app:app --host 127.0.0.1 --port 8000 --workers 1
Restart=always

[Install]
WantedBy=multi-user.target
```

Nyalakan dan aktifkan service:
```bash
sudo systemctl daemon-reload
sudo systemctl start kris-backend
sudo systemctl enable kris-backend
```

Sekarang, sistem deteksi keris Anda telah berjalan di Armbian HG680P dan dapat diakses melalui browser di alamat IP perangkat Anda (`http://<ip-armbian-anda>`).
