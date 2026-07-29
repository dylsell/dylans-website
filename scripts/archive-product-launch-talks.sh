#!/usr/bin/env bash

set -euo pipefail

archive_dir="${1:-.archive/product-launch-talks}"

for dependency in yt-dlp ffmpeg; do
  if ! command -v "$dependency" >/dev/null 2>&1; then
    echo "Missing $dependency. Install it with: brew install yt-dlp ffmpeg" >&2
    exit 1
  fi
done

mkdir -p "$archive_dir"

yt-dlp \
  --no-playlist \
  --format 'bv*[vcodec^=avc1][height<=1080]+ba[ext=m4a]/b[ext=mp4][height<=1080]' \
  --merge-output-format mp4 \
  --embed-metadata \
  --embed-thumbnail \
  --embed-chapters \
  --write-info-json \
  --write-description \
  --write-thumbnail \
  --convert-thumbnails jpg \
  --write-subs \
  --write-auto-subs \
  --sub-langs 'en.*,en' \
  --sub-format vtt \
  --download-archive "$archive_dir/downloaded.txt" \
  --output "$archive_dir/%(upload_date>%Y)s - %(title).160B [%(id)s].%(ext)s" \
  'https://www.youtube.com/watch?v=hT4NvY1vbK0' \
  'https://www.youtube.com/watch?v=QP0SHDV_7Ts' \
  'https://www.youtube.com/watch?v=qHXMlj6fdrI'
