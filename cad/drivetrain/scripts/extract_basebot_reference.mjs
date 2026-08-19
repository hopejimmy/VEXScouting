#!/usr/bin/env node

import fs from "node:fs";

const [inputPath, outputPath, requestedModule = "left"] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  console.error("Usage: extract_basebot_reference.mjs <cadasio-project.json> <placements.json>");
  process.exit(2);
}

const project = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const assembly = project.assemblyStructure;
const versions = assembly.rootVersions;

const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

// Cadasio stores matrices in column-major order, as used by three.js.
function multiply(a, b) {
  const out = new Array(16).fill(0);
  for (let col = 0; col < 4; col += 1) {
    for (let row = 0; row < 4; row += 1) {
      for (let k = 0; k < 4; k += 1) {
        out[col * 4 + row] += a[k * 4 + row] * b[col * 4 + k];
      }
    }
  }
  return out;
}

function matrixOf(reference) {
  return reference.transform.split(",").map(Number);
}

const partNumberPattern = /^(228-(?:2500-\d+|2536-\d+|2560|6480|7045))\b/;
const supported = new Set([
  "228-2500-017",
  "228-2500-026",
  "228-2500-060",
  "228-2500-086",
  "228-2500-112",
  "228-2500-1208",
  "228-2500-1253",
  "228-2500-136",
  "228-2500-143",
  "228-2500-1925",
  "228-2500-209",
  "228-2500-2225",
  "228-2500-2236",
  "228-2536-000",
  "228-2560",
  "228-6480",
  "228-7045",
]);

function findFirstHalf(nodes) {
  for (const node of nodes) {
    if (node.rootReference?.name === "Half of basebot^228-8899 Base bot-1") return node;
    const nested = findFirstHalf(node.children || []);
    if (nested) return nested;
  }
  return null;
}

const half = findFirstHalf(assembly.children);
if (!half) throw new Error("Could not find the first BaseBot half assembly");

const placements = [];
function walk(node, parentMatrix, path) {
  const reference = node.rootReference;
  if (!reference) return;
  const world = multiply(parentMatrix, matrixOf(reference));
  const version = versions[reference.childVersionId];
  const component = version?.versionComponentName || "";
  const match = component.match(partNumberPattern);
  const partNumber = match?.[1];

  if (partNumber && supported.has(partNumber)) {
    placements.push({
      partNumber,
      name: reference.name.split("/").at(-1),
      description: version?.versionProperties?.Description || component,
      matrix: world.map((value) => Math.abs(value) < 1e-9 ? 0 : Number(value.toFixed(9))),
      referencePath: [...path, reference.name.split("/").at(-1)].join("/"),
    });
    return;
  }

  for (const child of node.children || []) {
    walk(child, world, [...path, reference.name.split("/").at(-1)]);
  }
}

if (requestedModule === "full") {
  for (const node of assembly.children) {
    const name = node.rootReference?.name || "";
    const version = versions[node.rootReference?.childVersionId];
    const component = version?.versionComponentName || "";
    if (name.startsWith("Half of basebot^") || name.startsWith("Brain^") || partNumberPattern.test(component)) {
      walk(node, identity, []);
    }
  }
} else {
  // Use the half assembly as the local origin so the exported module is easy to inspect.
  for (const child of half.children || []) walk(child, identity, []);
}

fs.writeFileSync(outputPath, `${JSON.stringify({
  source: "Public VEX IQ BaseBot Cadasio project; placements used as an internal engineering reference",
  module: requestedModule === "full" ? "complete-mechanical-drive-train" : "left-drive-and-chassis-half",
  occurrences: placements,
}, null, 2)}\n`);

console.log(`WROTE ${placements.length} placements to ${outputPath}`);
