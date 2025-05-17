'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import { PoseLandmarker, FilesetResolver, DrawingUtils, NormalizedLandmark } from "@mediapipe/tasks-vision";
import { compareWithReference } from "../utils/postureComparison";

export default function PostureDetect() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [poseLandmarker, setPoseLandmarker] = useState<PoseLandmarker | null>(null);
  const [isWebcamRunning, setIsWebcamRunning] = useState(false);
  const [postureMessage, setPostureMessage] = useState("");
  const [referencePosture, setReferencePosture] = useState<NormalizedLandmark[] | null>(null);
  const shouldSetReferenceRef = useRef(false);

  const setupPoseLandmarker = useCallback(async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );
      const landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
      });
      setPoseLandmarker(landmarker);
    } catch (error) {
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
    setPostureMessage("3秒後に基準姿勢を設定します");

    setTimeout(() => {
      shouldSetReferenceRef.current = false;
      setPostureMessage("基準姿勢の設定が終了しました");
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

    const result = await poseLandmarker.detectForVideo(video, performance.now());

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    result.landmarks.forEach((landmarks) => {
      drawPose(ctx, landmarks);

      if (shouldSetReferenceRef.current) {
        setReferencePosture(landmarks);
        setPostureMessage("基準姿勢を設定しました");
      } else if (referencePosture) {
        const judgment = compareWithReference(landmarks, referencePosture);
        setPostureMessage(judgment);
      }
    });
  }, [poseLandmarker, referencePosture]);

  // 初回のみ PoseLandmarker をセットアップ
  useEffect(() => {
    setupPoseLandmarker();
  }, [setupPoseLandmarker]);

  // カメラ起動・検出の制御
  useEffect(() => {
    if (!isWebcamRunning || !poseLandmarker) return;

    startWebcam();
    const interval = setInterval(detectPose, 100);

    return () => clearInterval(interval);
  }, [isWebcamRunning, poseLandmarker, startWebcam, detectPose]);

  return (
    <div>
      <h1>姿勢矯正サービス</h1>
      <div className="flex gap-4">
        <button onClick={() => setIsWebcamRunning((prev) => !prev)}>
          {isWebcamRunning ? "カメラ停止" : "カメラ開始"}
        </button>
        {isWebcamRunning && (
          <button onClick={setReferencePostureHandler}>
            基準姿勢を設定
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
