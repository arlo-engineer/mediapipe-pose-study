import { NormalizedLandmark } from "@mediapipe/tasks-vision";

export function compareWithReference(
  currentLandmarks: NormalizedLandmark[],
  referenceLandmarks: NormalizedLandmark[]
): string {
  // 重要なランドマークのインデックス
  const NOSE = 0;
  const LEFT_SHOULDER = 11;
  const RIGHT_SHOULDER = 12;
  const LEFT_EAR = 7;
  const RIGHT_EAR = 8;

  // 肩の平均位置の差を計算
  const currentAvgShoulderX = (currentLandmarks[LEFT_SHOULDER].x + currentLandmarks[RIGHT_SHOULDER].x) / 2;
  const referenceAvgShoulderX = (referenceLandmarks[LEFT_SHOULDER].x + referenceLandmarks[RIGHT_SHOULDER].x) / 2;
  const shoulderDiff = Math.abs(currentAvgShoulderX - referenceAvgShoulderX);

  // 鼻の位置の差を計算
  const noseDiff = Math.abs(currentLandmarks[NOSE].x - referenceLandmarks[NOSE].x);

  // 耳の位置の差を計算
  const leftEarDiff = Math.abs(currentLandmarks[LEFT_EAR].x - referenceLandmarks[LEFT_EAR].x);
  const rightEarDiff = Math.abs(currentLandmarks[RIGHT_EAR].x - referenceLandmarks[RIGHT_EAR].x);
  const earDiff = Math.max(leftEarDiff, rightEarDiff);

  // 許容範囲の設定
  const THRESHOLD_SMALL = 0.05;
  const THRESHOLD_MEDIUM = 0.08;
  const THRESHOLD_LARGE = 0.1;
//   const THRESHOLD_SMALL = 0.02;
//   const THRESHOLD_MEDIUM = 0.04;
//   const THRESHOLD_LARGE = 0.06;

  // 姿勢のずれを判定
  if (shoulderDiff > THRESHOLD_LARGE || noseDiff > THRESHOLD_LARGE || earDiff > THRESHOLD_LARGE) {
    return "姿勢が大きく崩れています！";
  } else if (shoulderDiff > THRESHOLD_MEDIUM || noseDiff > THRESHOLD_MEDIUM || earDiff > THRESHOLD_MEDIUM) {
    return "姿勢が少し崩れています";
  } else if (shoulderDiff > THRESHOLD_SMALL || noseDiff > THRESHOLD_SMALL || earDiff > THRESHOLD_SMALL) {
    return "姿勢がわずかに崩れています";
  } else {
    return "基準姿勢を維持できています！";
  }
}