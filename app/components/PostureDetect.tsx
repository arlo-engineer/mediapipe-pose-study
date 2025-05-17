"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
  NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import { compareWithReference } from "../utils/postureComparison";

export default function PostureDetect() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [poseLandmarker, setPoseLandmarker] = useState<PoseLandmarker | null>(
    null
  );
  const [isWebcamRunning, setIsWebcamRunning] = useState(false);
  const [postureMessage, setPostureMessage] = useState("");
  const [referencePosture, setReferencePosture] = useState<
    NormalizedLandmark[] | null
  >(null);
  const shouldSetReferenceRef = useRef(false);

  const setupPoseLandmarker = useCallback(async () => {
    try {
      // ISSUE ROOT CAUSE: This is using the CDN to load WASM files which may not be compatible with GPU-less environments
      // The WebGL context creation fails on M1 MacBook Air without discrete GPU
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );

      // ISSUE ROOT CAUSE: The PoseLandmarker initialization fails with WebGL errors
      // Even though delegate is set to "CPU", the error indicates it still requires GPU service
      const landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          // IMPORTANT: Setting delegate to "CPU" still requires WebGL context
          // This is the primary issue on M1 MacBook Air with no discrete GPU
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
      });
      setPoseLandmarker(landmarker);
    } catch (error) {
      // CRITICAL ERROR: The error occurs here with message about "kGpuService" and "emscripten_webgl_create_context"
      // indicating that even with CPU delegate, WebGL is still required
      console.error("Failed to initialize pose landmarker:", error);
    }
  }, []);

  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();

        videoRef.current.onloadedmetadata = () => {
          if (canvasRef.current && videoRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
          }
        };
      }
    } catch (err) {
      console.warn("Webcam not supported or permission denied.", err);
    }
  }, []);

  const setReferencePostureHandler = () => {
    shouldSetReferenceRef.current = true;
    setPostureMessage("Setting reference posture in 3 seconds");

    setTimeout(() => {
      shouldSetReferenceRef.current = false;
      setPostureMessage("Reference posture setting completed");
    }, 3000);
  };

  const drawPose = (
    ctx: CanvasRenderingContext2D,
    landmarks: NormalizedLandmark[]
  ) => {
    const drawingUtils = new DrawingUtils(ctx);

    drawingUtils.drawLandmarks(landmarks, {
      radius: (data) => DrawingUtils.lerp(data.from!.z, -0.15, 0.1, 5, 1),
    });
    drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS);
  };

  const detectPose = useCallback(async () => {
    if (!poseLandmarker || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const result = await poseLandmarker.detectForVideo(
      video,
      performance.now()
    );

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    result.landmarks.forEach((landmarks) => {
      drawPose(ctx, landmarks);

      if (shouldSetReferenceRef.current) {
        setReferencePosture(landmarks);
        setPostureMessage("Reference posture set");
      } else if (referencePosture) {
        const judgment = compareWithReference(landmarks, referencePosture);
        setPostureMessage(judgment);
      }
    });
  }, [poseLandmarker, referencePosture]);

  useEffect(() => {
    setupPoseLandmarker();
  }, [setupPoseLandmarker]);

  useEffect(() => {
    if (!isWebcamRunning || !poseLandmarker) return;

    startWebcam();
    const interval = setInterval(detectPose, 100);

    return () => clearInterval(interval);
  }, [isWebcamRunning, poseLandmarker, startWebcam, detectPose]);

  return (
    <div>
      <h1>Posture Correction Service</h1>
      <div className="flex gap-4">
        <button onClick={() => setIsWebcamRunning((prev) => !prev)}>
          {isWebcamRunning ? "Stop Camera" : "Start Camera"}
        </button>
        {isWebcamRunning && (
          <button onClick={setReferencePostureHandler}>
            Set Reference Posture
          </button>
        )}
      </div>
      <p>{postureMessage}</p>
      <div>
        <video ref={videoRef} width="640" height="480" />
        <canvas ref={canvasRef} width="640" height="480" />
      </div>
    </div>
  );
}
