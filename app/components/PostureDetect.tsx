'use client';

import { useEffect, useRef, useState } from "react";
import { PoseLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import { judgePosture } from "../utils/postureJudge";

export default function PostureDetect() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [poseLandmarker, setPoseLandmarker] = useState<PoseLandmarker | null>(null);
  const [isWebcamRunning, setIsWebcamRunning] = useState(false);
  const [postureMessage, setPostureMessage] = useState<string>("");

  // PoseLandmarkerのセットアップ
  const setupPoseLandmarker = async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );
    const landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
    });
    setPoseLandmarker(landmarker);
  };

  // ウェブカメラの設定
  const startWebcam = async () => {
    if (navigator.mediaDevices?.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        videoRef.current.onloadedmetadata = () => {
          const width = videoRef.current!.videoWidth;
          const height = videoRef.current!.videoHeight;
          // video のサイズを canvas に設定
          if (canvasRef.current) {
            canvasRef.current.width = width;
            canvasRef.current.height = height;
          }
        };
      }
    } else {
      console.warn("Webcam not supported");
    }
  };

  // カメラから画像を取得してポーズ推定を行う
  const detectPose = async () => {
    if (poseLandmarker && videoRef.current && canvasRef.current) {
        // videoのサイズが0ならスキップ
      if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
        console.warn("Video not ready yet");
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const result = await poseLandmarker.detectForVideo(video, performance.now());
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const drawingUtils = new DrawingUtils(ctx);

        for (const landmark of result.landmarks) {
          drawingUtils.drawLandmarks(landmark, {
            radius: (data) => DrawingUtils.lerp(data.from!.z, -0.15, 0.1, 5, 1),
          });
          drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS);

          const judgment = judgePosture(landmark);
          setPostureMessage(judgment);
        }
      }
    }
  };

  useEffect(() => {
    setupPoseLandmarker();
  }, []);

  useEffect(() => {
    if (isWebcamRunning && poseLandmarker) {
      startWebcam();
      const interval = setInterval(detectPose, 100); // 100msごとにポーズを検出
      return () => clearInterval(interval);
    }
  }, [isWebcamRunning, poseLandmarker]);

  return (
    <div>
      <h1>姿勢矯正サービス</h1>
      <button onClick={() => setIsWebcamRunning((prev) => !prev)}>
        {isWebcamRunning ? "カメラ停止" : "カメラ開始"}
      </button>
      <p>{postureMessage}</p>
      <div>
        <video ref={videoRef} width="640" height="480" />
        <canvas ref={canvasRef} width="640" height="480" />
      </div>
    </div>
  );
}
