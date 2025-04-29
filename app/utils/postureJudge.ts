import { NormalizedLandmark } from "@mediapipe/tasks-vision";

export function judgePosture(landmarks: NormalizedLandmark[]): string {
    const nose = landmarks[0];            // 鼻
    const leftShoulder = landmarks[11];   // 左肩
    const rightShoulder = landmarks[12];  // 右肩
    const leftEar = landmarks[7];         // 左耳
    const rightEar = landmarks[8];        // 右耳

    // 肩の平均位置
    const avgShoulderX = (leftShoulder.x + rightShoulder.x) / 2;
    // const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;

    // 鼻が肩よりも大きく前（Xが小さい = 前に出てる）に出ているか
    const noseForward = nose.x < avgShoulderX - 0.03;

    // 耳が肩よりも前に出ているか（猫背の傾向）
    const leftEarForward = leftEar.x < leftShoulder.x - 0.02;
    const rightEarForward = rightEar.x < rightShoulder.x - 0.02;

    if (noseForward || leftEarForward || rightEarForward) {
      return "猫背の可能性があります";
    }

    return "良い姿勢です";
  }