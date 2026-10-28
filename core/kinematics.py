"""
Kinematic & Biomechanical Feature Extraction Module
Computes torso angles, normalized velocities, accelerations, aspect ratios,
and post-impact stillness metrics with temporal smoothing and variable dt support.
"""

from typing import List, Dict, Any, Tuple, Optional
import numpy as np


class KinematicExtractor:
    """
    Extracts physically explainable biomechanical features from temporal pose sequences.
    Supports variable elapsed time dt and applies low-latency EMA smoothing.
    """

    def __init__(self, fps: float = 30.0, smoothing_alpha: float = 0.65):
        self.fps = fps
        self.default_dt = 1.0 / max(fps, 1.0)
        self.smoothing_alpha = smoothing_alpha  # Exponential smoothing factor for centroids
        self.smoothed_centroids: Dict[int, float] = {}

    def extract_features(
        self,
        keypoints_history: List[np.ndarray],
        bbox_history: List[List[float]],
        occlusion_stats: Dict[str, float],
        dt: Optional[float] = None
    ) -> Dict[str, float]:
        """
        Computes real-time kinematic metrics from recent pose buffer.

        Args:
            keypoints_history: List of (17, 3) arrays for the past N frames.
            bbox_history: List of [x1, y1, x2, y2] bounding boxes for the past N frames.
            occlusion_stats: Current frame occlusion metrics.
            dt: Actual measured elapsed time since last frame in seconds.

        Returns:
            Dict containing torso_angle, angular_velocity, vertical_velocity,
            vertical_accel, aspect_ratio, stillness_energy, etc.
        """
        if not keypoints_history or not bbox_history:
            return self._empty_features()

        step_dt = dt if (dt is not None and 0.005 <= dt <= 0.5) else self.default_dt

        current_kps = keypoints_history[-1]
        current_bbox = bbox_history[-1]

        # 1. Torso Angle
        torso_angle = self.calculate_torso_angle(current_kps)

        # 2. Aspect Ratio (width / height)
        bbox_w = max(float(current_bbox[2] - current_bbox[0]), 1.0)
        bbox_h = max(float(current_bbox[3] - current_bbox[1]), 1.0)
        aspect_ratio = float(bbox_w / bbox_h)

        # 3. Normalized Vertical Kinematics with variable dt and body-scale normalization
        v_y, a_y, centroid_y = self.calculate_vertical_kinematics(keypoints_history, bbox_history, step_dt)

        # 4. Aspect Ratio Rate of Change
        if len(bbox_history) >= 2:
            prev_bbox = bbox_history[-2]
            prev_w = max(float(prev_bbox[2] - prev_bbox[0]), 1.0)
            prev_h = max(float(prev_bbox[3] - prev_bbox[1]), 1.0)
            prev_ar = prev_w / prev_h
            ar_delta = float((aspect_ratio - prev_ar) / step_dt)
        else:
            ar_delta = 0.0

        # 5. Stillness Energy over recent window (last 10-15 frames)
        stillness_energy = self.calculate_stillness_energy(keypoints_history, window=15)

        # 6. Angular Collapse Rate (degrees per second)
        angular_vel = 0.0
        if len(keypoints_history) >= 2:
            prev_kps = keypoints_history[-2]
            prev_angle = self.calculate_torso_angle(prev_kps)
            angular_vel = max(0.0, float((prev_angle - torso_angle) / step_dt))

        return {
            "torso_angle": float(np.nan_to_num(torso_angle, nan=90.0)),
            "angular_velocity": float(np.nan_to_num(angular_vel, nan=0.0)),
            "vertical_velocity": float(np.nan_to_num(v_y, nan=0.0)),
            "vertical_accel": float(np.nan_to_num(a_y, nan=0.0)),
            "aspect_ratio": float(np.nan_to_num(aspect_ratio, nan=0.4)),
            "aspect_ratio_delta": float(np.nan_to_num(ar_delta, nan=0.0)),
            "stillness_energy": float(np.nan_to_num(stillness_energy, nan=50.0)),
            "centroid_y": float(np.nan_to_num(centroid_y, nan=0.0)),
            "bbox_height": float(bbox_h),
            "bbox_width": float(bbox_w)
        }

    def calculate_torso_angle(self, kps: np.ndarray) -> float:
        """
        Computes the acute angle (0 to 90 degrees) of the torso relative to horizontal ground.
        Standing upright = ~75°-90°, Horizontal/Fallen = ~0°-40°.
        Requires sufficient joint confidence to prevent noise from corrupting angle.
        """
        # COCO indices: 5=L_Shoulder, 6=R_Shoulder, 11=L_Hip, 12=R_Hip
        l_sh, r_sh = kps[5], kps[6]
        l_hip, r_hip = kps[11], kps[12]

        sh_valid = (l_sh[2] > 0.25 and l_sh[0] > 0) or (r_sh[2] > 0.25 and r_sh[0] > 0)
        hip_valid = (l_hip[2] > 0.25 and l_hip[0] > 0) or (r_hip[2] > 0.25 and r_hip[0] > 0)

        if not (sh_valid and hip_valid):
            # If torso points are too degraded, check head to hip
            nose = kps[0]
            if nose[2] > 0.25 and hip_valid:
                mid_sh_x, mid_sh_y = nose[0], nose[1]
                mid_hip_x = (l_hip[0] + r_hip[0]) / 2.0 if (l_hip[0] > 0 and r_hip[0] > 0) else (l_hip[0] if l_hip[0] > 0 else r_hip[0])
                mid_hip_y = (l_hip[1] + r_hip[1]) / 2.0 if (l_hip[1] > 0 and r_hip[1] > 0) else (l_hip[1] if l_hip[1] > 0 else r_hip[1])
            else:
                return 90.0
        else:
            if l_sh[2] > 0.25 and r_sh[2] > 0.25:
                mid_sh_x = (l_sh[0] + r_sh[0]) / 2.0
                mid_sh_y = (l_sh[1] + r_sh[1]) / 2.0
            else:
                mid_sh_x = l_sh[0] if l_sh[2] > 0.25 else r_sh[0]
                mid_sh_y = l_sh[1] if l_sh[2] > 0.25 else r_sh[1]

            if l_hip[2] > 0.25 and r_hip[2] > 0.25:
                mid_hip_x = (l_hip[0] + r_hip[0]) / 2.0
                mid_hip_y = (l_hip[1] + r_hip[1]) / 2.0
            else:
                mid_hip_x = l_hip[0] if l_hip[2] > 0.25 else r_hip[0]
                mid_hip_y = l_hip[1] if l_hip[2] > 0.25 else r_hip[1]

        dx = float(mid_sh_x - mid_hip_x)
        dy = float(mid_sh_y - mid_hip_y)

        if abs(dx) < 1e-4 and abs(dy) < 1e-4:
            return 90.0

        angle_rad = np.arctan2(abs(dy), abs(dx) + 1e-6)
        angle_deg = float(np.degrees(angle_rad))
        return float(np.clip(angle_deg, 0.0, 90.0))

    def calculate_vertical_kinematics(
        self,
        kps_history: List[np.ndarray],
        bbox_history: List[List[float]],
        dt: float
    ) -> Tuple[float, float, float]:
        """
        Computes filtered normalized vertical velocity and acceleration of torso centroid.
        Normalization uses the median bbox height across history to prevent scale collapse during falls.
        """
        if len(kps_history) < 2:
            current_kps = kps_history[-1]
            torso_y = self._extract_torso_y(current_kps)
            return 0.0, 0.0, float(torso_y)

        # Stable body-scale normalization: maximum height observed in recent history
        recent_heights = [max(float(b[3] - b[1]), 30.0) for b in bbox_history[-min(len(bbox_history), 15):]]
        norm_h = float(np.median(recent_heights)) if recent_heights else 100.0

        # Collect raw torso Y coordinates for up to 4 frames
        raw_ys = [self._extract_torso_y(kps) for kps in kps_history[-min(len(kps_history), 4):]]

        # Low-pass smoothing on torso position sequence
        smoothed_ys = []
        val = raw_ys[0]
        for y in raw_ys:
            val = self.smoothing_alpha * y + (1.0 - self.smoothing_alpha) * val
            smoothed_ys.append(val)

        # Velocity in normalized body-heights per second (positive = downward descent)
        v_now = (smoothed_ys[-1] - smoothed_ys[-2]) / (max(dt, 0.005) * norm_h)

        if len(smoothed_ys) >= 3:
            v_prev = (smoothed_ys[-2] - smoothed_ys[-3]) / (max(dt, 0.005) * norm_h)
            a_now = (v_now - v_prev) / max(dt, 0.005)
        else:
            a_now = 0.0

        return float(v_now), float(a_now), float(smoothed_ys[-1])

    def _extract_torso_y(self, kps: np.ndarray) -> float:
        """Extracts average Y of visible torso landmarks (shoulders + hips)."""
        torso_pts = kps[[5, 6, 11, 12]]
        valid = torso_pts[(torso_pts[:, 2] > 0.25) & (torso_pts[:, 1] > 0)]
        if len(valid) > 0:
            return float(np.mean(valid[:, 1]))
        # Fallback to any valid joint
        all_valid = kps[(kps[:, 2] > 0.2) & (kps[:, 1] > 0)]
        if len(all_valid) > 0:
            return float(np.mean(all_valid[:, 1]))
        return 0.0

    def calculate_stillness_energy(self, kps_history: List[np.ndarray], window: int = 15) -> float:
        """
        Computes mean pixel movement across visible joints in recent window.
        Low value (<12.0) indicates immobility on ground.
        """
        if len(kps_history) < 3:
            return 50.0

        sample_len = min(len(kps_history), window)
        displacements = []

        for f in range(-sample_len + 1, 0):
            curr = kps_history[f]
            prev = kps_history[f - 1]

            valid_mask = (curr[:, 0] > 0) & (prev[:, 0] > 0) & (curr[:, 2] > 0.25) & (prev[:, 2] > 0.25)
            if np.any(valid_mask):
                diffs = np.linalg.norm(curr[valid_mask, :2] - prev[valid_mask, :2], axis=1)
                displacements.append(float(np.mean(diffs)))

        if not displacements:
            return 0.0

        return float(np.mean(displacements))

    def _empty_features(self) -> Dict[str, float]:
        return {
            "torso_angle": 90.0,
            "angular_velocity": 0.0,
            "vertical_velocity": 0.0,
            "vertical_accel": 0.0,
            "aspect_ratio": 0.4,
            "aspect_ratio_delta": 0.0,
            "stillness_energy": 50.0,
            "centroid_y": 0.0,
            "bbox_height": 100.0,
            "bbox_width": 40.0
        }
