import os
import json
import re
import time
import random
import threading
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from PIL import Image
from io import BytesIO
import hashlib

# Configuration constants
BASE_URL = 'https://pusakakeris.com'
KATALOG_URL = 'https://pusakakeris.com/katalog/'
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Referer': 'https://pusakakeris.com/',
}

# Global crawler state
crawler_state = {
    "status": "idle",  # idle, running, completed, error
    "current_page": 0,
    "total_pages": 54,
    "items_found": 0,
    "images_downloaded": 0,
    "logs": [],
    "error_message": ""
}

# Keywords
DHAPUR_KEYWORDS = [
    'Brojol','Tilam Upih','Tilam Sari','Sengkelat','Sabuk Inten',
    'Jalak Ngore','Jalak Dinding','Jalak Budha','Jalak Sangu Tumpeng',
    'Jalak Sumelang Gandring','Jalak Tilam Sari','Jalak',
    'Sempaner','Sempana','Carita','Carubuk','Condong Campur',
    'Sengkelat','Mangkurat','Pandawa','Pulanggeni','Parungsari',
    'Naga Siluman','Naga Sapta','Naga Liman','Naga Sosro',
    'Pasopati','Damar Murub','Semar','Karno Tinanding','Mundarang',
    'Singo Barong','Sinom','Pleret','Putut','Jangkung','Carang Soka',
    'Kebo Lajer','Kebo Teki','Kidang Mas','Panimbal','Tumenggung',
    'Klika Benda','Sapu Tangan','Pandita Semedi'
]

PAMOR_KEYWORDS = [
    'Beras Wutah','Blarak Sineret','Ngulit Semangka','Wos Wutah',
    'Ron Genduru','Pedaringan Kebak','Bonang Rinenteng','Bendo Segodo',
    'Brahma Watu','Jung Isi Dunyo','Putri Kinurung','Tejo Kinurung',
    'Junjung Derajat','Sumsum Buron','Rojo Gundolo','Lar Gangsir',
    'Tunggak Semi','Udan Mas','Tirta Teja','Pulo Tirto','Sanak',
    'Adeg','Mrambut','Kendit','Wengkon Isen','Wengkon',
    'Mrutu Sewu','Kupu Tarung','Tambal','Kelengan','Lawe Saukel',
    'Untu Walang','Lintang Kemukus','Puser Bumi','Banyu Mili',
    'Wahyu Tumurun','Sekar Susun','Melati Sinebar','Manggar',
    'Blarak Sineret','Sodo Sakler','Satrio Pinayungan'
]

TANGGUH_KEYWORDS = [
    'Majapahit','Mataram Sultan Agung','Mataram Senopaten',
    'Mataram Amangkurat','Mataram HB','Mataram PB',
    'Mataram Hindu','Mataram','Pajajaran','Pajang','Demak',
    'Cirebon','Madura','Tuban','Singosari','Blambangan',
    'Bali','Bugis','Madiun','Kahuripan','Jenggala',
    'Mangkunegaran','Mangkubumen','Pakubuwana','Hamengkubuwono',
    "Kamardikan","Sedayu","Pengging","Segaluh","Luar Jawa"
]

def add_log(message):
    timestamp = time.strftime("%H:%M:%S")
    crawler_state["logs"].append(f"[{timestamp}] {message}")
    if len(crawler_state["logs"]) > 100:
        crawler_state["logs"].pop(0)

def parse_luk_from_title(title):
    title_lower = title.lower()
    if 'lurus' in title_lower or 'luk 0' in title_lower:
        return 0
    match = re.search(r'luk[\s-]*(\d+)', title_lower)
    if match:
        return int(match.group(1))
    luk_map = {
        'sengkelat': 13, 'sabuk inten': 9, 'carita': 5,
        'pandawa': 5, 'naga sapta': 7, 'naga siluman': 7,
        'sempaner': 0, 'tilam upih': 0, 'tilam sari': 0,
        'brojol': 0, 'jalak': 0, 'pulanggeni': 3,
    }
    for dhapur, luk in luk_map.items():
        if dhapur in title_lower:
            return luk
    return None

def parse_keyword_from_title(title, keywords):
    title_lower = str(title).lower()
    for kw in sorted(keywords, key=len, reverse=True):
        if str(kw).lower() in title_lower:
            return str(kw)
    return None

def parse_categories(soup):
    cats = []
    breadcrumb = soup.find('nav', class_='breadcrumb')
    if breadcrumb:
        for a in breadcrumb.find_all('a'):
            cats.append(a.text.strip())
    for a in soup.find_all('a', href=re.compile(r'/category/')):
        txt = a.text.strip()
        if txt and txt not in cats:
            cats.append(txt)
    return cats

def parse_product_page(url, soup):
    meta = {
        'url': url,
        'judul': '',
        'dhapur': None,
        'pamor': None,
        'tangguh': None,
        'luk': None,
        'harga': None,
        'kode_produk': None,
        'status': None,
        'deskripsi': '',
        'gambar_urls': [],
        'gambar_utama': None,
        'kategori': [],
        'label_yolo': None,
    }

    title_tag = soup.find('h1') or soup.find('meta', property='og:title')
    if title_tag:
        meta['judul'] = title_tag.text.strip() if title_tag.name == 'h1' else title_tag.get('content', '').strip()

    og_img = soup.find('meta', property='og:image')
    if og_img and og_img.get('content'):
        meta['gambar_utama'] = og_img['content']
        meta['gambar_urls'].append(og_img['content'])

    for img in soup.find_all('img'):
        src = img.get('src', '') or img.get('data-src', '')
        if 'uploads' in src and src not in meta['gambar_urls'] and not src.endswith('.gif') and 'thumb' not in src.lower():
            src_high = re.sub(r'-\d+x\d+(\.\w+)$', r'\1', src)
            if src_high not in meta['gambar_urls']:
                meta['gambar_urls'].append(src_high)

    harga_patterns = [r'Rp\s*([\d,.]+)', r'IDR\s*([\d,.]+)']
    page_text = soup.get_text()
    for pat in harga_patterns:
        m = re.search(pat, page_text)
        if m:
            meta['harga'] = 'Rp ' + m.group(1).replace('.', '').replace(',', '')
            break

    kode_match = re.search(r'(?:Tersedia|Habis|Kode)[\s/]*([A-Z]{1,4}\d{1,5})', page_text)
    if kode_match:
        meta['kode_produk'] = kode_match.group(1)

    if 'Maaf, stok habis' in page_text or 'Habis' in page_text:
        meta['status'] = 'habis'
    elif 'Tersedia' in page_text:
        meta['status'] = 'tersedia'

    desc_tag = soup.find('meta', property='og:description')
    if desc_tag:
        meta['deskripsi'] = desc_tag.get('content', '').strip()

    meta['kategori'] = parse_categories(soup)

    title_full = str(meta.get('judul', '')) + ' ' + ' '.join(str(k) for k in (meta.get('kategori', []) or []))
    meta['dhapur'] = parse_keyword_from_title(title_full, DHAPUR_KEYWORDS)
    meta['pamor'] = parse_keyword_from_title(title_full, PAMOR_KEYWORDS)
    meta['tangguh'] = parse_keyword_from_title(title_full, TANGGUH_KEYWORDS)
    meta['luk'] = parse_luk_from_title(title_full)

    if meta['luk'] is not None:
        meta['label_yolo'] = f"keris_luk_{meta['luk']}" if meta['luk'] > 0 else "keris_lurus"
    elif meta['dhapur']:
        meta['label_yolo'] = f"keris_{str(meta.get('dhapur', ''))} ".lower().replace(' ', '_')
    else:
        meta['label_yolo'] = "keris_unknown"

    return meta

def sanitize_filename(s, max_len=80):
    s = re.sub(r'[^\w\s-]', '', s)
    s = re.sub(r'[\s]+', '_', s.strip())
    return s[:max_len]

def get_product_urls(page_url):
    try:
        resp = requests.get(page_url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, 'html.parser')
        urls = set()
        for a in soup.find_all('a', href=True):
            href = str(a['href']) if 'href' in a else ""
            if href.startswith(BASE_URL + '/') and '/category/' not in href and '/katalog/' not in href and '/page/' not in href and href != BASE_URL + '/' and len(href) > len(BASE_URL) + 5:
                excluded = ['/cart', '/daftar', '/login', '/kontak', '/tosan-aji-group', '/filosofi', '/kawruh']
                if not any(ex in href for ex in excluded):
                    urls.add(href.rstrip('/'))
        return urls
    except Exception as e:
        add_log(f"Error scan katalog {page_url}: {e}")
        return set()

def download_image(img_url, save_path):
    try:
        resp = requests.get(img_url, headers=HEADERS, timeout=20)
        resp.raise_for_status()
        img = Image.open(BytesIO(resp.content))
        w, h = img.size
        if w < 200 or h < 200:
            return False, "Image too small"
        if img.mode not in ('RGB', 'L'):
            img = img.convert('RGB')
        img.save(save_path, 'JPEG', quality=92)
        return True, f"{w}x{h}"
    except Exception as e:
        return False, str(e)

def run_crawler_process(max_pages, output_dir):
    global crawler_state
    try:
        crawler_state["status"] = "running"
        crawler_state["current_page"] = 0
        crawler_state["items_found"] = 0
        crawler_state["images_downloaded"] = 0
        crawler_state["error_message"] = ""
        
        images_dir = os.path.join(output_dir, 'images')
        metadata_dir = os.path.join(output_dir, 'metadata')
        os.makedirs(images_dir, exist_ok=True)
        os.makedirs(metadata_dir, exist_ok=True)

        add_log("Memulai pengumpulan URL produk...")
        all_urls = set()
        
        # Scan page by page (up to max_pages)
        pages_to_scan = min(max_pages, 54)
        crawler_state["total_pages"] = pages_to_scan
        
        for p in range(1, pages_to_scan + 1):
            crawler_state["current_page"] = p
            url = KATALOG_URL if p == 1 else f"{KATALOG_URL}page/{p}/"
            add_log(f"Mencari katalog halaman {p}/{pages_to_scan}...")
            urls = get_product_urls(url)
            all_urls.update(urls)
            crawler_state["items_found"] = len(all_urls)
            time.sleep(random.uniform(0.5, 1.2))

        url_list = sorted(list(all_urls))
        add_log(f"Selesai mengumpulkan URL. Total {len(url_list)} URL produk unik ditemukan.")
        
        # Save URL list
        with open(os.path.join(metadata_dir, 'product_urls.json'), 'w') as f:
            json.dump(url_list, f, indent=2)

        # Scrape and Download Images
        add_log("Memulai scraping detail produk dan download gambar...")
        all_metadata = []
        
        for idx, url in enumerate(url_list):
            add_log(f"Scraping ({idx+1}/{len(url_list)}): {url.split('/')[-1]}...")
            try:
                resp = requests.get(url, headers=HEADERS, timeout=15)
                resp.raise_for_status()
                soup = BeautifulSoup(resp.text, 'html.parser')
                meta = parse_product_page(url, soup)
            except Exception as e:
                add_log(f"Gagal scrape {url}: {e}")
                continue

            saved_imgs = []
            if meta['gambar_urls']:
                label = meta['label_yolo'] or 'keris_unknown'
                label_dir = os.path.join(images_dir, label)
                os.makedirs(label_dir, exist_ok=True)

                for img_idx, img_url in enumerate(meta['gambar_urls'][:2]): # download max 2
                    slug = sanitize_filename(meta['judul'][:50])
                    hash_suffix = hashlib.md5(img_url.encode()).hexdigest()[:6]
                    filename = f"{idx:04d}_{slug}_{img_idx}_{hash_suffix}.jpg"
                    save_path = os.path.join(label_dir, filename)

                    if os.path.exists(save_path):
                        saved_imgs.append(filename)
                        continue
                    
                    ok, info = download_image(img_url, save_path)
                    if ok:
                        saved_imgs.append(filename)
                        crawler_state["images_downloaded"] += 1
                    time.sleep(0.2)

            meta['gambar_disimpan'] = saved_imgs
            meta['gambar_count'] = len(saved_imgs)
            all_metadata.append(meta)

            # Export intermediate checkpoint
            if (idx + 1) % 10 == 0 or (idx + 1) == len(url_list):
                with open(os.path.join(metadata_dir, 'checkpoint.json'), 'w', encoding='utf-8') as f:
                    json.dump(all_metadata, f, ensure_ascii=False, indent=2)
            
            time.sleep(random.uniform(0.5, 1.2))

        # Build final CSV
        rows = []
        for m in all_metadata:
            rows.append({
                'judul': m.get('judul', ''),
                'dhapur': m.get('dhapur', '') or '',
                'pamor': m.get('pamor', '') or '',
                'tangguh': m.get('tangguh', '') or '',
                'luk': m.get('luk', '') if m.get('luk') is not None else '',
                'label_yolo': m.get('label_yolo', ''),
                'harga': m.get('harga', '') or '',
                'kode_produk': m.get('kode_produk', '') or '',
                'status': m.get('status', '') or '',
                'gambar_count': m.get('gambar_count', 0),
                'gambar_utama': m.get('gambar_utama', '') or '',
                'url': m.get('url', ''),
                'deskripsi': m.get('deskripsi', '')[:200]
            })
        
        # Save as final metadata JSON & mock CSV
        with open(os.path.join(metadata_dir, 'dataset_keris_metadata.json'), 'w', encoding='utf-8') as f:
            json.dump(rows, f, ensure_ascii=False, indent=2)

        crawler_state["status"] = "completed"
        add_log("Crawler Selesai! Seluruh data dan gambar berhasil disimpan.")
    except Exception as e:
        crawler_state["status"] = "error"
        crawler_state["error_message"] = str(e)
        add_log(f"Sistem crawler berhenti dengan error: {e}")

def start_crawler(max_pages, output_dir):
    if crawler_state["status"] == "running":
        return False
    t = threading.Thread(target=run_crawler_process, args=(max_pages, output_dir))
    t.daemon = True
    t.start()
    return True
