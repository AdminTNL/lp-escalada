import subprocess
from pathlib import Path

INPUT = Path(r"C:\Users\gabri\OneDrive\Desktop\tnl\lp-escalada\wp-content\uploads\2025\06\Escalada_ANA_TOFU1.mp4")
OUTPUT = INPUT.with_name(INPUT.stem + "_compressed_under_100mb.mp4")

TARGET_MB = 95
AUDIO_BITRATE_KBPS = 96

def run(cmd):
    print("\nExecutando:")
    print(" ".join(str(c) for c in cmd))
    subprocess.run(cmd, check=True)

def get_duration_seconds(video_path):
    result = subprocess.run(
        [
            "ffprobe",
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(video_path),
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    return float(result.stdout.strip())

duration = get_duration_seconds(INPUT)

target_bytes = TARGET_MB * 1024 * 1024
target_total_kbps = (target_bytes * 8) / duration / 1000

video_bitrate_kbps = int((target_total_kbps - AUDIO_BITRATE_KBPS) * 0.95)

if video_bitrate_kbps < 300:
    raise ValueError("Bitrate calculado muito baixo. O vídeo talvez precise reduzir resolução também.")

print(f"Duração: {duration:.2f}s")
print(f"Bitrate total alvo: {target_total_kbps:.0f} kbps")
print(f"Bitrate de vídeo: {video_bitrate_kbps} kbps")
print(f"Saída: {OUTPUT}")

# Passo 1
run([
    "ffmpeg",
    "-y",
    "-i", str(INPUT),
    "-c:v", "libx264",
    "-b:v", f"{video_bitrate_kbps}k",
    "-preset", "medium",
    "-pass", "1",
    "-an",
    "-f", "mp4",
    "NUL",
])

# Passo 2
run([
    "ffmpeg",
    "-y",
    "-i", str(INPUT),
    "-c:v", "libx264",
    "-b:v", f"{video_bitrate_kbps}k",
    "-preset", "medium",
    "-pass", "2",
    "-c:a", "aac",
    "-b:a", f"{AUDIO_BITRATE_KBPS}k",
    "-movflags", "+faststart",
    str(OUTPUT),
])

final_mb = OUTPUT.stat().st_size / 1024 / 1024
print(f"\nArquivo final: {final_mb:.2f} MB")

if final_mb >= 100:
    print("Ainda ficou acima de 100 MB. Reduza TARGET_MB para 90 e rode de novo.")
else:
    print("OK: arquivo ficou abaixo de 100 MB.")