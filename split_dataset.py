import os
import random
import shutil
from glob import glob

def main():
    base_path = "./dataset_keris"
    images_dir = os.path.join(base_path, "images")
    labels_dir = os.path.join(base_path, "labels")

    if not os.path.exists(images_dir):
        print(f"Error: Folder {images_dir} tidak ditemukan!")
        return

    # Find all class folders (excluding 'train' and 'val' if already split)
    img_dirs = [d for d in glob(f"{images_dir}/*") if os.path.isdir(d) and not os.path.basename(d) in ['train', 'val']]
    
    if not img_dirs:
        print("Tidak ditemukan folder kelas raw (atau dataset sudah terbagi).")
        return

    print(f"Ditemukan {len(img_dirs)} folder kelas untuk diproses.")
    
    # Create target split folders
    for split in ['train', 'val']:
        os.makedirs(os.path.join(images_dir, split), exist_ok=True)
        os.makedirs(os.path.join(labels_dir, split), exist_ok=True)

    for class_dir in img_dirs:
        class_name = os.path.basename(class_dir)
        # Find all images in this class folder
        files = []
        for ext in ['*.jpg', '*.jpeg', '*.png']:
            files.extend(glob(os.path.join(class_dir, ext)))
            
        if not files:
            continue
            
        # Shuffle files for random splitting
        random.seed(42)
        random.shuffle(files)
        
        # Split index (80% train, 20% validation)
        split_idx = int(len(files) * 0.8)
        train_files = files[:split_idx]
        val_files = files[split_idx:]
        
        print(f"Memproses kelas '{class_name}': {len(train_files)} train, {len(val_files)} val")
        
        # Copy train files
        for f in train_files:
            fname = os.path.basename(f)
            # Copy image
            shutil.copy(f, os.path.join(images_dir, "train", fname))
            # Find and copy corresponding label
            label_src = f.replace("images", "labels").rsplit('.', 1)[0] + ".txt"
            if os.path.exists(label_src):
                shutil.copy(label_src, os.path.join(labels_dir, "train", fname.rsplit('.', 1)[0] + ".txt"))

        # Copy val files
        for f in val_files:
            fname = os.path.basename(f)
            # Copy image
            shutil.copy(f, os.path.join(images_dir, "val", fname))
            # Find and copy corresponding label
            label_src = f.replace("images", "labels").rsplit('.', 1)[0] + ".txt"
            if os.path.exists(label_src):
                shutil.copy(label_src, os.path.join(labels_dir, "val", fname.rsplit('.', 1)[0] + ".txt"))

    print("\nDataset split berhasil dibuat!")
    print(f"Lokasi Train: {os.path.join(images_dir, 'train')}")
    print(f"Lokasi Val: {os.path.join(images_dir, 'val')}")

if __name__ == "__main__":
    main()
