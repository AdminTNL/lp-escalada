#!/usr/bin/env python3
import os, re, subprocess

BASE    = r"C:\Users\gabri\OneDrive\Desktop\tnl\lp-escalada"
HTML    = os.path.join(BASE, "index.html")
UPLOADS = os.path.join(BASE, "wp-content", "uploads")
FFMPEG  = r"C:\ffmpeg\bin\ffmpeg.exe"

IMAGES = [
    "2025/06/background-preto-bottom.png-e1749581350843.png",
    "2025/06/background-rosa-e1749108482198.png",
    "2025/06/close-up-young-attractive-charismatic-woman-isolated-scaled-e1749193550727.png",
    "2025/06/Captura-de-tela-2025-06-05-140209.png",
    "2025/06/background-preto-bottom.png@2x-scaled.png",
    "2025/06/background-preto@2x-scaled.png",
    "2025/05/Escalada-Verde.png",
    "2025/06/ta-mas-onde-vou-usar-isso-na-vida-real-scaled.jpg",
    "2025/06/group-diverse-teens-young-people-doing-activities-together-celebrating-world-youth-skills-day-scaled-e1749094631330.jpg",
    "2025/06/retrato-de-mulher-feliz-e-despreocupada-tocando-suavemente-no-pescoco-demonstrando-beleza-natural-scaled-e1749507210114.jpg",
    "2025/06/freepik__fun-whimsical-elements-with-bright-colors-and-a-se__42605-e1749199812852.jpeg",
    "2025/06/ta-mas-onde-vou-usar-isso-na-vida-real-1-scaled-e1749666196247.jpg",
    "2025/06/mulher-jovem-scaled-e1749668051803.jpg",
    "2025/06/Textos-Escalada-10@1x.png",
    "2025/06/Personagens-Escalada-1@1x.png",
    "2025/06/Personagens-Escalada-6@1x.png",
    "2025/06/Textos-Escalada-11@1x.png",
    "2025/06/Personagens-Escalada-8@1x.png",
    "2025/06/Textos-Escalada-12@1x.png",
    "2025/06/Personagens-Escalada-9@1x.png",
    "2025/06/Personagens-Escalada-7@1x.png",
    "2025/06/Textos-Escalada-13@1x.png",
    "2025/06/Textos-Escalada-14@1x.png",
    "2025/06/Personagens-Escalada-2@1x.png",
    "2025/06/Textos-Escalada-15@1x.png",
    "elementor/thumbs/badeira-escalada-100x100px@2x-r6qtk2rhmpmwr0pso8vhrmxy58f9fc1oslk417yazk.png",
    "elementor/thumbs/Textos-Escalada-10@1x-r6ulv1gf0ve9r7nytkh2g2l48cqm52a4kxq39pbcrc.png",
    "elementor/thumbs/Personagens-Escalada-1@1x-r6um2hcf4nkzo2uuda9qoozhj6282stmlrnh1ka5i0.png",
    "elementor/thumbs/Personagens-Escalada-6@1x-r6ulyo3zeud4l0e6mmy7knm6swumuzotewekz5xmqg.png",
    "elementor/thumbs/Textos-Escalada-11@1x-r6ulumezzitolg9t9dz1c6dqq6sqpwmf6vabl9xniw.png",
    "elementor/thumbs/Personagens-Escalada-8@1x-r6ulww6yi3xmniz0zvbkv3queplobkn2i41kcckehk.png",
    "elementor/thumbs/Textos-Escalada-12@1x-r6ulud0m36gtdcngs9wrn8r4sc32kxl3tkrgsibl94.png",
    "elementor/thumbs/Personagens-Escalada-9@1x-r6ulvn2pe27v68skbbthjf4pw7s223nybwq9b2fas8.png",
    "elementor/thumbs/Personagens-Escalada-7@1x-r6ulxuyziz98l3kicscrxcywdyu98dh4yw6j3l4u3c.png",
    "elementor/thumbs/Textos-Escalada-13@1x-r6ulu2oe002ntn2hgnfvdtd293i189g245l4igqx5k.png",
    "elementor/thumbs/Textos-Escalada-14@1x-r6ultta03npsljg4zjdlovqgb8sd3aeqqv29pp4uvs.png",
    "elementor/thumbs/Personagens-Escalada-2@1x-r6um1cxcys1nsuhjxass7h6nzllfvtd647lleny2xk.png",
    "elementor/thumbs/Textos-Escalada-15@1x-r6ultixs0hbn1tv5nwwpfgcds07bqm9p1fvxfnk6s8.png",
]

# ── Phase 1: Convert to WebP ──────────────────────────────────────────────────
print("=== Phase 1: Converting images to WebP ===")
converted = []   # list of (original_url_path, webp_url_path)
total_saved = 0

for img in IMAGES:
    src = os.path.join(UPLOADS, img.replace("/", os.sep))
    dst = re.sub(r'\.(jpg|jpeg|png|gif)$', '.webp', src, flags=re.IGNORECASE)

    if not os.path.exists(src):
        print(f"  MISSING  {img}")
        continue

    webp_rel = re.sub(r'\.(jpg|jpeg|png|gif)$', '.webp', img, flags=re.IGNORECASE)

    if os.path.exists(dst):
        print(f"  EXISTS   {os.path.basename(dst)}")
        converted.append((img, webp_rel))
        continue

    r = subprocess.run([FFMPEG, "-i", src, "-quality", "82", "-y", dst],
                       capture_output=True, text=True)
    if r.returncode == 0:
        orig = os.path.getsize(src)
        new  = os.path.getsize(dst)
        saved = orig - new
        total_saved += saved
        pct = int((1 - new / orig) * 100) if orig else 0
        print(f"  OK  {os.path.basename(img):60s} {orig//1024:>5}KB -> {new//1024:>5}KB  -{pct}%")
        converted.append((img, webp_rel))
    else:
        print(f"  ERR {img}\n      {r.stderr[-200:]}")

print(f"\n  Total saved so far: {total_saved//1024} KB")

# ── Phase 2: Update HTML references ──────────────────────────────────────────
print("\n=== Phase 2: Updating HTML references ===")
with open(HTML, encoding="utf-8") as f:
    html = f.read()

for orig, webp in converted:
    html_orig = f"/wp-content/uploads/{orig}"
    html_webp = f"/wp-content/uploads/{webp}"
    n = html.count(html_orig)
    if n:
        html = html.replace(html_orig, html_webp)
        print(f"  ({n}x) {os.path.basename(orig)} -> .webp")

# ── Phase 3: Slider conditional loading ──────────────────────────────────────
print("\n=== Phase 3: Slider conditional loading ===")

# Identify the two slider sections by their unique prev-arrow IDs
DESKTOP_ID = "30a0cc84"
MOBILE_ID  = "7838acf"

# Find the <!-- Advanced Slider --> comment that precedes each slider
def find_slider_section_start(text, slider_id):
    # The data-slick attr contains the slider id in JSON-encoded form
    marker = f"wpr-slider-prev-{slider_id}"
    pos = text.find(marker)
    if pos == -1:
        return -1
    # Walk back to find the nearest <!-- Advanced Slider --> comment
    comment = "<!-- Advanced Slider -->"
    idx = text.rfind(comment, 0, pos)
    return idx

d_start = find_slider_section_start(html, DESKTOP_ID)
m_start = find_slider_section_start(html, MOBILE_ID)

if d_start == -1 or m_start == -1:
    print("  ERROR: Could not locate slider sections")
else:
    # Desktop section: d_start … m_start
    # Mobile section:  m_start … end
    desktop_block = html[d_start:m_start]
    mobile_block  = html[m_start:]

    def convert_bgs(block, cls):
        # Replace: class="wpr-slider-item-bg " style="background-image: url(X)"
        # With:    class="wpr-slider-item-bg CLS" data-bg="url(X)"
        pattern = r'class="wpr-slider-item-bg " style="background-image: url\(([^)]+)\)"'
        def repl(m):
            return f'class="wpr-slider-item-bg {cls}" data-bg="url({m.group(1)})"'
        new_block, n = re.subn(pattern, repl, block)
        print(f"  {cls}: converted {n} background-image -> data-bg")
        return new_block

    desktop_block = convert_bgs(desktop_block, "slider-bg-desktop")
    mobile_block  = convert_bgs(mobile_block,  "slider-bg-mobile")

    html = html[:d_start] + desktop_block + mobile_block

# Update the device-detection JS to also load slider backgrounds
old_js = """<script>
(function () {
  var isMobile = window.matchMedia('(max-width: 767px)').matches;

  // Load video only for current device
  var video = document.querySelector(isMobile ? '.elementor-video-mobile' : '.elementor-video-desktop');
  if (video && video.dataset.src) {
    video.src = video.dataset.src;
  }

  // Load slider backgrounds only for current device
  var bgClass = isMobile ? '.slider-bg-mobile' : '.slider-bg-desktop';
  document.querySelectorAll(bgClass + '[data-bg]').forEach(function(el) {
    el.style.backgroundImage = el.dataset.bg;
  });
})();
</script>"""

# Check if already updated
if "slider-bg-desktop" in html and old_js not in html:
    # Find current bottom script and replace it
    cur_js = """<script>
(function () {
  var isMobile = window.matchMedia('(max-width: 767px)').matches;
  var selector = isMobile ? '.elementor-video-mobile' : '.elementor-video-desktop';
  var video = document.querySelector(selector);
  if (video && video.dataset.src) {
    video.src = video.dataset.src;
  }
})();
</script>"""
    if cur_js in html:
        html = html.replace(cur_js, old_js)
        print("  Updated bottom JS to include slider background loading")
    else:
        print("  WARNING: Could not find bottom JS to update — check manually")
else:
    print("  Bottom JS already up to date")

# ── Write output ──────────────────────────────────────────────────────────────
with open(HTML, "w", encoding="utf-8") as f:
    f.write(html)

print("\n=== Done. index.html written. ===")
