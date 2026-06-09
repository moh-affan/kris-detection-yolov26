# Stage 1: Build the React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Setup the Python runtime environment
FROM python:3.10-slim

# Install system dependencies required for OpenCV, YOLO, and PyTorch
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    libsm6 \
    libxext6 \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Upgrade pip
RUN pip install --no-cache-dir --upgrade pip

# Copy python project definition and install dependencies
COPY pyproject.toml ./
RUN pip install --no-cache-dir .

# Copy pre-downloaded YOLO and MobileSAM models
COPY yolo26n.pt ./
COPY mobile_sam.pt ./

# Copy backend files
COPY backend/ ./backend/

# Copy built frontend assets from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose port 8000 (FastAPI port)
EXPOSE 8000

# Run the backend FastAPI app
CMD ["python", "backend/app.py"]
