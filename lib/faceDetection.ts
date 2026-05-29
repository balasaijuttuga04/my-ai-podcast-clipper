// @ts-nocheck
import * as faceapi from "@vladmandic/face-api";
import path from "path";
import canvas from "canvas";

const { Canvas, Image, ImageData } = canvas;

faceapi.env.monkeyPatch({
  Canvas,
  Image,
  ImageData
});

let loaded = false;

async function loadModel() {
  if (loaded) return;

  const modelPath = path.join(process.cwd(), "models");

  await faceapi.nets.tinyFaceDetector.loadFromDisk(modelPath);

  loaded = true;
}

export async function detectCropMode(framePath: string) {
  try {
    await loadModel();

    const img = await canvas.loadImage(framePath);

    const detection = await faceapi.detectSingleFace(
      img as any,
      new faceapi.TinyFaceDetectorOptions()
    );

    if (!detection) {
      return "center";
    }

    const faceCenterX =
      detection.box.x + detection.box.width / 2;

    const imageWidth = img.width;

    const ratio = faceCenterX / imageWidth;

    if (ratio < 0.35) {
      return "left";
    }

    if (ratio > 0.65) {
      return "right";
    }

    return "center";
  } catch (error) {
    console.error("FACE_DETECTION_ERROR", error);

    return "center";
  }
}