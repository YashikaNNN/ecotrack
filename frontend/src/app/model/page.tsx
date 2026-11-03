"use client";

import { useEffect, useState } from "react";
import { ApiError, getMetrics } from "@/lib/api";
import { formatMap, formatScore } from "@/lib/format";
import type { Metrics } from "@/lib/types";
import { Notice, PageHeader } from "@/components/ui";

export default function ModelPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Model · EcoTrack";
    let cancel = false;
    getMetrics()
      .then((body) => {
        if (!cancel) setMetrics(body);
      })
      .catch((reason: unknown) => {
        if (!cancel) {
          setError(reason instanceof ApiError ? reason.message : "Evaluation data could not be loaded.");
        }
      });
    return () => {
      cancel = true;
    };
  }, []);

  return (
    <div>
      <PageHeader
        kicker="YOLOv8n"
        title="What the model is actually doing"
        lede="EcoTrack uses one learned model: YOLOv8n, fine-tuned from COCO weights. The web app does not retrain it."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <section className="border border-line bg-card p-5">
          <h2 className="font-serif text-2xl tracking-tight">Training setup in the reports</h2>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-muted">
            <li>Smallest YOLOv8 variant, through the Ultralytics library.</li>
            <li>Planned on Colab with a T4 GPU: image size 640, batch 16, learning rate 0.01, up to 50 epochs, early stop after 15 epochs, seed 42.</li>
            <li>The Phase 2 report still marks the finished epoch count as unconfirmed. This app loads the checkpoint you provide and does not claim a training log it has not seen.</li>
            <li>Colour changes, rotation, shifts, scaling, flips, and mosaic run during training only. A user photo is resized and normalised by Ultralytics at prediction time.</li>
          </ul>
        </section>
        <section className="border border-line bg-card p-5">
          <h2 className="font-serif text-2xl tracking-tight">Why the box is not the point</h2>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Each training image received one label line, a box covering about 95% of the frame. The network is learning which material is in the photo. It should not be treated as a detector for a scene with several items. Box scores such as mAP describe that labelling scheme and are expected to look optimistic. Top-1 accuracy and the confusion counts are the clearer measures.
          </p>
        </section>
      </div>

      <section className="mt-6 border border-line bg-card p-5">
        <h2 className="font-serif text-2xl tracking-tight">How a photo is scored in the app</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted">
          <li>The checkpoint runs at 640 pixels. The detection floor is 0.05, the same cutoff as the evaluation script, so a weak box can still be reported.</li>
          <li>The recommendation uses the single most confident box.</li>
          <li>A bin and points are added only when that confidence is at least 50%. The reports ask for a cutoff and do not set the number, so 50% is the prototype rule.</li>
          <li>Below 50%, or when no box appears, the attempt is saved and left out of points and simulated bins.</li>
        </ol>
      </section>

      <section className="mt-6 border border-line bg-card p-5">
        <h2 className="font-serif text-2xl tracking-tight">Measured test results</h2>
        {error ? <div className="mt-4"><Notice tone="bad">{error}</Notice></div> : null}
        {!metrics && !error ? <p className="mt-4 text-sm text-muted">Looking for the evaluation file…</p> : null}
        {metrics && !metrics.available ? <div className="mt-4"><Notice>{metrics.message}</Notice></div> : null}
        {metrics?.available ? (
          <div className="mt-4">
            <p className="text-sm leading-relaxed text-muted">{metrics.message}</p>
            <p className="mt-1 text-xs text-muted">Source: {metrics.source}</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <caption className="sr-only">Test-set metrics from the evaluation CSV</caption>
                <thead>
                  <tr className="border-b border-line text-muted">
                    {["Class", "Test images", "Precision", "Recall", "F1", "mAP50", "mAP50-95", "Top-1"].map((heading) => (
                      <th key={heading} className="py-2 pr-3 font-medium">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metrics.rows.map((row) => (
                    <tr key={row.class_name} className="border-b border-line last:border-0">
                      <td className="py-2 pr-3 font-medium">{row.class_name}</td>
                      <td className="py-2 pr-3 tabular-nums">{row.test_images ?? "—"}</td>
                      <td className="py-2 pr-3 tabular-nums">{formatScore(row.precision)}</td>
                      <td className="py-2 pr-3 tabular-nums">{formatScore(row.recall)}</td>
                      <td className="py-2 pr-3 tabular-nums">{formatScore(row.f1)}</td>
                      <td className="py-2 pr-3 tabular-nums">{formatMap(row.map50)}</td>
                      <td className="py-2 pr-3 tabular-nums">{formatMap(row.map50_95)}</td>
                      <td className="py-2 pr-3 tabular-nums">{formatScore(row.top1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Precision, recall, F1, and top-1 are shown as percentages when the CSV stores a fraction between 0 and 1. mAP stays on the 0 to 1 scale used by the evaluation script. In that script, a photo with no detection counts as wrong for top-1 and is left out of the confusion counts.
            </p>
          </div>
        ) : null}

        {metrics?.confusion ? (
          <div className="mt-8">
            <h3 className="font-serif text-xl">Confusion counts</h3>
            <p className="mt-1 text-xs text-muted">
              Rows are the labelled class. Columns are the predicted class. Source: backend/data/test_confusion_counts.csv
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Confusion counts from the evaluation CSV</caption>
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th className="py-2 pr-3 font-medium">True \ predicted</th>
                    {metrics.confusion.column_labels.map((label) => (
                      <th key={label} className="py-2 pr-3 font-medium">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metrics.confusion.matrix.map((row, index) => (
                    <tr key={metrics.confusion?.row_labels[index] ?? index} className="border-b border-line last:border-0">
                      <th className="py-2 pr-3 text-left font-medium">
                        {metrics.confusion?.row_labels[index]}
                      </th>
                      {row.map((value, column) => (
                        <td key={`${index}-${column}`} className="py-2 pr-3 tabular-nums">{value}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
