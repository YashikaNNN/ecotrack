"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, getHealth, predict } from "@/lib/api";
import { formatConfidence } from "@/lib/format";
import { readName, validateName } from "@/lib/profile";
import type { Health, Prediction } from "@/lib/types";
import { Notice } from "@/components/ui";
import { ProfileBar } from "@/components/ProfileBar";

const MAX_BYTES = 8 * 1024 * 1024;

function fileError(file: File): string | null {
  if (file.size === 0) return "The file is empty.";
  if (file.size > MAX_BYTES) return "Use an image smaller than 8 MB.";
  if (file.type && !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return "Use a JPEG, PNG, or WebP image.";
  }
  return null;
}

export function ScanStudio() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [fileMessage, setFileMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Prediction | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    getHealth()
      .then((body) => {
        if (!cancel) setHealth(body);
      })
      .catch((reason: unknown) => {
        if (!cancel) {
          setHealthError(
            reason instanceof ApiError
              ? reason.message
              : "The sorting service is not running.",
          );
        }
      });
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!cameraOn || !video || !stream) return;
    video.srcObject = stream;
    void video.play().catch(() => {
      setFileMessage("The camera preview could not start. You can still upload a photo.");
    });
  }, [cameraOn]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  function chooseFile(next: File | null) {
    setResult(null);
    setError(null);
    if (preview) URL.revokeObjectURL(preview);
    if (!next) {
      setFile(null);
      setPreview(null);
      setFileMessage(null);
      return;
    }
    const problem = fileError(next);
    setFileMessage(problem);
    if (problem) {
      setFile(null);
      setPreview(null);
      return;
    }
    setFile(next);
    setPreview(URL.createObjectURL(next));
  }

  async function startCamera() {
    setFileMessage(null);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);
    } catch {
      setFileMessage("Camera access was blocked. You can still upload a photo.");
    }
  }

  async function captureFrame() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) {
      setFileMessage("The camera is not ready yet. Wait a moment and try again.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setFileMessage("This browser could not capture the camera frame.");
      return;
    }
    context.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92),
    );
    if (!blob) {
      setFileMessage("This browser could not capture the camera frame.");
      return;
    }
    stopCamera();
    chooseFile(new File([blob], "camera.jpg", { type: "image/jpeg" }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const name = readName();
    const nameError = validateName(name);
    if (nameError) {
      setError("Save your name above before scanning.");
      return;
    }
    if (!file) {
      setError("Choose a photo first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const prediction = await predict(file, name);
      setResult(prediction);
    } catch (reason: unknown) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : "The photo could not be checked.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const modelReady = health?.model_loaded === true;
  const cutoff = health ? `${Math.round(health.threshold * 100)}%` : "50%";

  return (
    <div>
      <ProfileBar />

      {healthError ? <Notice tone="bad">{healthError}</Notice> : null}
      {health && !health.model_loaded ? (
        <Notice tone="warn">{health.model_error}</Notice>
      ) : null}
      {health?.model_loaded ? (
        <Notice tone="good">
          Model loaded from {health.weights_file}. Classes:{" "}
          {health.classes.map((item) => item.name).join(", ")}. A bin is
          recommended only at {cutoff} confidence or higher.
        </Notice>
      ) : null}

      <form onSubmit={onSubmit} className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="border border-line bg-card p-5">
          <h2 className="font-serif text-2xl tracking-tight">Photo</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            One item, filling most of the frame. JPEG, PNG, or WebP, up to 8 MB.
          </p>

          <label className="mt-5 block border border-dashed border-line bg-paper-2 px-4 py-8 text-center text-sm">
            <span className="font-medium text-ink">Upload a photo</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="mt-3 block w-full text-sm text-muted"
              onChange={(event) => {
                stopCamera();
                chooseFile(event.target.files?.[0] ?? null);
              }}
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-3">
            {cameraOn ? (
              <>
                <button
                  type="button"
                  onClick={captureFrame}
                  className="border border-ink px-4 py-2 text-sm font-medium"
                >
                  Capture frame
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-4 py-2 text-sm text-muted"
                >
                  Close camera
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={startCamera}
                className="border border-ink px-4 py-2 text-sm font-medium"
              >
                Use camera
              </button>
            )}
          </div>

          {cameraOn ? (
            <video
              ref={videoRef}
              playsInline
              muted
              className="mt-4 max-h-[360px] w-full bg-ink"
            />
          ) : null}

          {fileMessage ? (
            <p className="mt-4 text-sm text-danger" role="alert">
              {fileMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting || !file || !modelReady}
            className="mt-5 bg-accent px-4 py-2.5 text-sm font-medium text-paper-2 hover:bg-accent-strong disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
          >
            {submitting ? "Reading the photo…" : "Check this item"}
          </button>
          {!modelReady && !healthError ? (
            <p className="mt-3 text-sm text-muted">
              {health
                ? "Checking stays disabled until the trained weights are loaded."
                : "Checking whether the model is available…"}
            </p>
          ) : null}
        </div>

        <div className="border border-line bg-card p-5" aria-live="polite">
          <h2 className="font-serif text-2xl tracking-tight">Result</h2>
          {preview ? (
            <div className="relative mt-4 inline-block max-w-full">
              {/* The preview keeps the photo's own aspect ratio so the box lines up. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Selected waste item"
                className="block max-h-[360px] w-auto max-w-full"
              />
              {result?.box && result.image_width > 0 && result.image_height > 0 ? (
                <div
                  className="pointer-events-none absolute border-2 border-accent"
                  style={{
                    left: `${(result.box[0] / result.image_width) * 100}%`,
                    top: `${(result.box[1] / result.image_height) * 100}%`,
                    width: `${((result.box[2] - result.box[0]) / result.image_width) * 100}%`,
                    height: `${((result.box[3] - result.box[1]) / result.image_height) * 100}%`,
                  }}
                />
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-muted">
              The class, confidence, and bin will appear here after a real model
              check. Nothing on this page is a sample prediction.
            </p>
          )}

          {error ? (
            <p className="mt-4 text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}

          {result ? <ResultCard result={result} /> : null}
        </div>
      </form>
    </div>
  );
}

function ResultCard({ result }: { result: Prediction }) {
  const tone = result.accepted
    ? "border-accent bg-accent-soft"
    : result.reason === "low_confidence"
      ? "border-brass bg-brass-soft"
      : "border-danger bg-danger-soft";

  return (
    <div className={`mt-4 border p-4 ${tone}`}>
      <p className="font-serif text-3xl tracking-tight">
        {result.label ?? "No class"}
      </p>
      <p className="mt-1 text-sm text-muted">
        Confidence {formatConfidence(result.confidence)}
        {result.class_name && result.label && result.class_name !== result.label
          ? ` · model name “${result.class_name}”`
          : ""}
      </p>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">Bin</dt>
          <dd className="mt-1 font-medium">{result.bin ?? "None recommended"}</dd>
        </div>
        <div>
          <dt className="text-muted">Points</dt>
          <dd className="mt-1 font-medium">
            {result.accepted ? `+${result.points}` : "0"}
          </dd>
        </div>
      </dl>
      <p className="mt-4 text-sm leading-relaxed">{result.message}</p>
      {result.extra_boxes > 0 ? (
        <p className="mt-3 text-sm leading-relaxed text-muted">
          The model also marked {result.extra_boxes} other{" "}
          {result.extra_boxes === 1 ? "box" : "boxes"}. Training used one item
          per photo, so this recommendation uses only the strongest box.
        </p>
      ) : null}
      {result.box ? (
        <p className="mt-3 text-sm leading-relaxed text-muted">
          The outline is the model box. Labels in training covered almost the
          whole photo, so the outline is a guide to the class, not a measured
          object boundary.
        </p>
      ) : null}
      <p className="mt-3 text-sm text-muted">
        {result.accepted
          ? `Saved to history for ${result.display_name}.`
          : "This attempt is saved in history and does not change points or bin levels."}
      </p>
    </div>
  );
}
