import type { Metadata } from "next";
import Link from "next/link";
import { Listing3D } from "@/components/listing-3d";
import { FloorPlanSvg } from "@/components/floor-plan-svg";
import { FloorPlan, totalArea } from "@/lib/floor-plan";
import groundJson from "../../../../public/samples/villa/floor-plan-ground.json";
import firstJson from "../../../../public/samples/villa/floor-plan-first.json";

export const metadata: Metadata = {
  title: "Sample files",
  description: "Download a sample villa (3D model and floor plans) and see how PHONIEX turns your design files into a professional 3D listing.",
};

const ground = FloorPlan.parse(groundJson);
const first = FloorPlan.parse(firstJson);
const DIR = "/samples/villa";

const files = [
  { name: "villa-sample.glb", what: "3D model of the villa and land (GLB, 0.6 MB)", where: "Listing → 3D design model → Upload" },
  { name: "floor-plan-ground.json", what: `Ground floor plan, 10 rooms, ${totalArea(ground)} m²`, where: "Listing → Floor plan diagram → Import plan file" },
  { name: "floor-plan-first.json", what: `First floor plan, 9 rooms, ${totalArea(first)} m²`, where: "Listing → Floor plan diagram → Import plan file" },
  { name: "README.txt", what: "Property details and import steps", where: "Read first" },
];

export default function SamplesPage() {
  return (
    <div className="container-page py-14">
      <span className="badge mb-4">Sample files</span>
      <h1 className="max-w-3xl text-3xl font-bold sm:text-5xl">Sample villa: from design files to a 3D listing</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        A sample 5-bedroom villa on a 1,200 m² plot (30 × 40 m) with a pool, majlis, carport and garden. Download the files and import
        them into your own listing to see how PHONIEX presents them.
      </p>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1fr_360px]">
        <Listing3D model={{ src: `${DIR}/villa-sample.glb`, format: "glb" }} plan={ground} title="Sample villa" />
        <div className="card">
          <h2 className="font-semibold">Sample folder: /samples/villa</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {files.map((f) => (
              <li key={f.name} className="rounded-lg border border-border p-3">
                <a href={`${DIR}/${f.name}`} download className="font-semibold text-accent underline">{f.name}</a>
                <p className="text-muted">{f.what}</p>
                <p className="mt-1 text-xs text-muted">Import: {f.where}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-12 grid gap-6 md:grid-cols-2">
        <div className="card">
          <h2 className="font-semibold">Ground floor · {totalArea(ground)} m²</h2>
          <div className="mt-3"><FloorPlanSvg plan={ground} /></div>
        </div>
        <div className="card">
          <h2 className="font-semibold">First floor · {totalArea(first)} m²</h2>
          <div className="mt-3"><FloorPlanSvg plan={first} /></div>
        </div>
      </section>

      <section className="card mt-12">
        <h2 className="text-lg font-bold">How to import it into your listing</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm">
          <li>Download the files above.</li>
          <li>Sign in and open <b>My listings → New listing</b> (choose Villa, 5 bedrooms).</li>
          <li>Under <b>3D design model</b>, upload <code>villa-sample.glb</code>. Buyers can rotate, zoom and view it full screen.</li>
          <li>Under <b>Floor plan diagram</b>, tap <b>Import plan file</b> and choose <code>floor-plan-ground.json</code>, then <b>Save</b>.</li>
          <li>Add your photos and 360° tours, set the location on the map, and publish.</li>
        </ol>
        <p className="mt-3 text-xs text-muted">This is an illustrative sample made by PHONIEX for testing, not a real property for sale.</p>
        <Link href="/app/listings/new" className="btn-primary mt-4">Create a listing</Link>
      </section>
    </div>
  );
}
