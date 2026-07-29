# Product launch video archive

The three talks featured at `/work/product-launch-talks` were archived locally
on July 29, 2026. The media lives in the git-ignored directory:

```text
.archive/product-launch-talks/
```

The website continues to use YouTube as its primary player. The local files are
preservation masters and are not committed or deployed.

## Archive inventory

| Year | YouTube ID | Duration | MP4 size | SHA-256 |
| --- | --- | ---: | ---: | --- |
| 2023 | `hT4NvY1vbK0` | 30:33 | 108,386,021 bytes | `fdd274b97d7f4055e10cd7fa55deedad83a5f60ef00d730e856227fac9e68438` |
| 2024 | `QP0SHDV_7Ts` | 46:17 | 727,667,574 bytes | `0492378464ac9e3fe0f674bd22ac09bbf154663d17e1f1adade82ce3b642a439` |
| 2025 | `qHXMlj6fdrI` | 31:13 | 263,019,292 bytes | `8465905d08e0ada06125ba598083e312cd9035f4cdfb8a9022704d197f2e2454` |

Each talk is stored as a browser-compatible 1080p H.264/AAC MP4 with embedded
metadata and thumbnail. The archive also includes the source description,
thumbnail, YouTube metadata JSON, and English WebVTT captions.

## Refresh or restore the archive

Install the required tools:

```sh
brew install yt-dlp ffmpeg
```

Then run:

```sh
./scripts/archive-product-launch-talks.sh
```

The download archive file prevents completed talks from being downloaded twice.
Delete the relevant line from `.archive/product-launch-talks/downloaded.txt`
only when intentionally replacing a master.

## Preservation note

Git-ignored local files are not a backup by themselves. Copy the entire
`.archive/product-launch-talks/` directory to at least one independent storage
location. If the site ever needs to self-host these files, upload the MP4s to
object storage/CDN and add those URLs to the talk data rather than committing
the videos to Git.
