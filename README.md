# EcoTrack

EcoTrack is a student prototype for **EcoNex** (MCA AI/DS, ML-III-2026-T002). A person submits one photo of one waste item. A fine-tuned **YOLOv8n** model names the material. Fixed rules then choose a bin and an awareness score, and the scan is stored.

The model does not output a bin, a point value, or a carbon credit. Those are application rules. Simulated bin levels are counts of accepted scans. They are not sensor readings.

## What the model does

The project trains YOLOv8n (Ultralytics), starting from COCO weights, on five planned classes:

| Class | Material | Bin rule in this app | Points |
| --- | --- | --- | --- |
| plastic | Plastic | Dry recyclable — plastic | 10 |
| paper | Paper (cardboard uses the same rule) | Dry recyclable — paper | 8 |
| metal | Metal | Dry recyclable — metal | 12 |
| organic | Organic | Organic / wet waste | 8 |
| ewaste | E-waste | Separate e-waste collection | 15 |

The reports do not publish the point values or the confidence cutoff. This prototype counts a scan only at **50%** confidence or above. Change that with `CONFIDENCE_THRESHOLD`.

Each training image was labelled with one box covering about 95% of the frame (`class 0.5 0.5 0.95 0.95`). The network is learning the material in the photo. It is not a detector for a scene that contains several objects, and mAP on that labelling scheme is expected to look optimistic. Top-1 accuracy and the confusion counts are the clearer measures.

Training augmentations stay in training. At prediction time Ultralytics resizes the photo to 640 pixels and normalises it. This app does not retrain the checkpoint.

The Phase 2 report left measured scores pending. The Model page shows numbers only when `backend/data/test_metrics.csv` is present. It does not invent them.

## Features

- Upload or camera capture of one JPEG, PNG, or WebP image (up to 8 MB)
- Real YOLOv8n inference when `best.pt` is installed
- Class, confidence, bin, and points, with a clear retry when confidence is low
- History, category counts, simulated bins, and a name-based leaderboard stored in SQLite
- Model page that explains the training plan and reads an evaluation CSV if you add one

There is no password login. The name is kept in the browser and sent with each scan.

## Architecture

```text
Browser (Next.js) -- /backend/* --> FastAPI
                                   |-- best.pt   (Ultralytics YOLOv8n)
                                   |-- rules.py  (bin + points)
                                   \-- SQLite    (scans)
```

The browser calls `/backend/...` on the Next.js origin. Next.js forwards that to the API (`API_URL`, default `http://127.0.0.1:8000`).

## Project layout

```text
ecotrack/
  frontend/          Next.js, TypeScript, Tailwind
  backend/
    app/             FastAPI application
    tests/           Rule, storage, and API tests
    weights/         Put best.pt here (not committed)
    data/            SQLite database and optional metric CSVs
```

## Setup

Use two terminals from the repository root.

### API

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
```

`requirements-dev.txt` includes the runtime packages plus pytest and httpx. Ultralytics installs PyTorch, which is a large download.

Copy the trained checkpoint from the Colab run:

```text
Google Drive: ecotrack_runs/ecotrack_v1/weights/best.pt
Local path:   backend/weights/best.pt
```

Optional evaluation files, if that notebook cell finished:

```text
backend/data/test_metrics.csv
backend/data/test_confusion_counts.csv
```

Start the API:

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000/health`. `model_loaded` is true only after the weights load. API docs are at `http://127.0.0.1:8000/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

`make backend` and `make frontend` run the same two processes after the virtual environment and `npm install` exist.

## Environment

Copy `.env.example` if you want local overrides. None of these values are secrets.

| Variable | Where | Purpose |
| --- | --- | --- |
| `API_URL` | frontend process | Where Next.js forwards `/backend/*` |
| `MODEL_PATH` | API process | Checkpoint path, relative to `backend/` |
| `ECOTRACK_DB` | API process | SQLite file |
| `CONFIDENCE_THRESHOLD` | API process | Minimum confidence for a bin and points |
| `BIN_CAPACITY` | API process | Denominator for simulated fill |
| `CORS_ORIGINS` | API process | Browsers allowed to call the API directly |

Set `API_URL` before `npm run build` if the API will not be on `127.0.0.1:8000`. Rewrites are read when the frontend starts or is built.

## How a scan is decided

1. The image must be a JPEG, PNG, or WebP under 8 MB.
2. YOLOv8n runs at 640 pixels. Boxes below `min(0.05, threshold)` are ignored. `0.05` matches the evaluation script.
3. The strongest remaining box is the prediction.
4. At or above the cutoff, the class is mapped to a bin and points and the scan counts toward simulated bins.
5. Below the cutoff, with no box, or with a class that has no rule, the attempt is stored and does not change points or bin levels.

The running checkpoint's own class list is shown on the scan page. If a name does not match the five rules above, EcoTrack reports the class and does not invent a bin. `cardboard` follows the paper rule, because the proposal merges cardboard into paper.

## Tests

From `backend`, with the virtual environment active:

```bash
python -m pytest
```

From `frontend`:

```bash
npm run lint
npm run build
```

## Git and the weight file

`backend/weights/*.pt` and the SQLite database are gitignored. A YOLOv8n checkpoint is usually about 6 MB, so GitHub accepts it as a normal file if you want the demo to run after a clone:

```bash
git add -f backend/weights/best.pt
```

Use Git LFS only if a weight file approaches GitHub's 100 MB limit. Do not commit the image dataset, `node_modules`, `.venv`, or `.next`.

This repository is created locally first. Creating the GitHub remote and pushing are separate steps and should be confirmed before they run.

## Deployment

- Frontend: Vercel, or any host that can run `next build` and `next start`. Set `API_URL` to the public API origin.
- API: a Python host with CPU PyTorch is enough for a YOLOv8n demo. Put `best.pt` on the server and set `MODEL_PATH`. A GPU is optional.
- Keep the database on disk on that server, or switch later if you need a shared hosted database. The current code uses SQLite.

## Dataset and citation notes

The proposal cites TrashNet (Yang and Thung, 2016) for plastic, paper, and metal, and names a Kaggle waste set for organic waste plus a Kaggle or Roboflow set for e-waste. Exact licences, image counts, and the e-waste source are still marked “to be confirmed” in the reports. TACO is cited as related work, not as the training set. COCO is the pretraining source for the starting weights.

The proposal lists the second team member as Anubhi Sharma. The Phase 2 report lists Shreyansh Tiwari in that seat with the same student ID. The About page records both.
