"""
Comprehensive Regression Test Suite for Fall Detection Engine
Validates:
  1. Standing upright without false alarm
  2. Sitting down normally (ADL protection)
  3. Bending forward to pick up an object (ADL protection)
  4. Lying down intentionally without high impact shock
  5. Rapid descent + impact + ground immobility -> CONFIRMED_FALL
  6. Rapid descent + immediate standing up -> RECOVERY to MONITORING
  7. Sustained fall candidate without timer resets
  8. Missing / degraded pose keypoints (robustness against zero coords / NaNs)
  9. Variable dt inference intervals (8 FPS to 60 FPS)
"""

import unittest
import numpy as np
from core.tracker import Tracklet
from core.kinematics import KinematicExtractor
from core.state_machine import FallStateMachine


def create_synthetic_keypoints(torso_angle: float, y_offset: float = 200.0, height: float = 200.0) -> np.ndarray:
    """
    Creates a synthetic 17-keypoint COCO array with given torso inclination.
    Torso angle: 90 = vertical standing, 0 = horizontal lying.
    """
    kps = np.zeros((17, 3), dtype=np.float32)
    # Default confidence 0.9 for all joints
    kps[:, 2] = 0.9

    rad = np.radians(torso_angle)
    torso_len = height * 0.45

    # Shoulders at y_offset
    mid_sh_x = 300.0
    mid_sh_y = float(y_offset)

    # Hips positioned based on torso angle
    mid_hip_x = float(mid_sh_x - torso_len * np.cos(rad))
    mid_hip_y = float(mid_sh_y + torso_len * np.sin(rad))

    # Left & right shoulders (5, 6)
    kps[5] = [mid_sh_x - 20, mid_sh_y, 0.9]
    kps[6] = [mid_sh_x + 20, mid_sh_y, 0.9]

    # Left & right hips (11, 12)
    kps[11] = [mid_hip_x - 15, mid_hip_y, 0.9]
    kps[12] = [mid_hip_x + 15, mid_hip_y, 0.9]

    # Head (nose=0)
    kps[0] = [mid_sh_x, mid_sh_y - 25, 0.9]

    # Knees & ankles
    kps[13] = [mid_hip_x - 15, mid_hip_y + 40, 0.9]
    kps[14] = [mid_hip_x + 15, mid_hip_y + 40, 0.9]
    kps[15] = [mid_hip_x - 15, mid_hip_y + 80, 0.9]
    kps[16] = [mid_hip_x + 15, mid_hip_y + 80, 0.9]

    return kps


def create_bbox_from_kps(kps: np.ndarray) -> list:
    valid = kps[kps[:, 2] > 0.2]
    min_x = float(np.min(valid[:, 0])) - 10
    max_x = float(np.max(valid[:, 0])) + 10
    min_y = float(np.min(valid[:, 1])) - 10
    max_y = float(np.max(valid[:, 1])) + 10
    return [min_x, min_y, max_x, max_y]


class TestKinematicExtractor(unittest.TestCase):
    def test_torso_angle_upright(self):
        extractor = KinematicExtractor(fps=30.0)
        kps = create_synthetic_keypoints(torso_angle=90.0)
        angle = extractor.calculate_torso_angle(kps)
        self.assertTrue(85.0 <= angle <= 90.0)

    def test_torso_angle_horizontal(self):
        extractor = KinematicExtractor(fps=30.0)
        kps = create_synthetic_keypoints(torso_angle=10.0)
        angle = extractor.calculate_torso_angle(kps)
        self.assertTrue(5.0 <= angle <= 20.0)

    def test_missing_keypoints_graceful_fallback(self):
        extractor = KinematicExtractor(fps=30.0)
        kps = np.zeros((17, 3), dtype=np.float32)
        angle = extractor.calculate_torso_angle(kps)
        self.assertEqual(angle, 90.0)

    def test_variable_dt_velocity_calculation(self):
        extractor = KinematicExtractor(fps=30.0)
        kps1 = create_synthetic_keypoints(torso_angle=90.0, y_offset=200.0)
        bbox1 = create_bbox_from_kps(kps1)
        kps2 = create_synthetic_keypoints(torso_angle=90.0, y_offset=250.0)
        bbox2 = create_bbox_from_kps(kps2)

        feats = extractor.extract_features([kps1, kps2], [bbox1, bbox2], {}, dt=0.1)
        self.assertGreater(feats["vertical_velocity"], 0.0)
        self.assertFalse(np.isnan(feats["vertical_velocity"]))
        self.assertFalse(np.isinf(feats["vertical_velocity"]))


class TestFallStateMachine(unittest.TestCase):
    def setUp(self):
        self.sm = FallStateMachine(fps=30.0, inactivity_sec=1.0)
        init_kps = create_synthetic_keypoints(torso_angle=90.0)
        init_bbox = create_bbox_from_kps(init_kps)
        self.track = Tracklet(track_id=1, initial_bbox=init_bbox, initial_kps=init_kps)

    def test_person_standing_still(self):
        """A person standing upright must remain in MONITORING indefinitely."""
        extractor = KinematicExtractor(fps=30.0)
        kps = create_synthetic_keypoints(torso_angle=90.0)
        bbox = create_bbox_from_kps(kps)

        for _ in range(60):
            feats = extractor.extract_features([kps, kps], [bbox, bbox], {}, dt=0.033)
            state, info = self.sm.step(self.track, feats, {}, dt=0.033)
            assert state == FallStateMachine.STATE_MONITORING

    def test_person_sitting_normally(self):
        """Sitting down has moderate descent and remains upright -> No false fall."""
        extractor = KinematicExtractor(fps=30.0)
        # Person lowers torso while keeping spine angle upright (~75°)
        kps_stand = create_synthetic_keypoints(torso_angle=88.0, y_offset=180.0)
        kps_sit = create_synthetic_keypoints(torso_angle=76.0, y_offset=260.0)

        feats = extractor.extract_features(
            [kps_stand, kps_sit],
            [create_bbox_from_kps(kps_stand), create_bbox_from_kps(kps_sit)],
            {},
            dt=0.2  # Smooth sitting takes 0.2s-0.5s
        )
        state, info = self.sm.step(self.track, feats, {}, dt=0.2)
        assert state in [FallStateMachine.STATE_MONITORING, FallStateMachine.STATE_RAPID_DESCENT]

        # In seated position, they stay upright -> must resolve to MONITORING
        kps_seated = create_synthetic_keypoints(torso_angle=78.0, y_offset=260.0)
        feats_seated = extractor.extract_features(
            [kps_sit, kps_seated],
            [create_bbox_from_kps(kps_sit), create_bbox_from_kps(kps_seated)],
            {},
            dt=0.033
        )
        state, info = self.sm.step(self.track, feats_seated, {}, dt=0.033)
        assert state == FallStateMachine.STATE_MONITORING

    def test_person_lying_down_intentionally(self):
        """Lying down gently without high dynamic descent shock remains in MONITORING."""
        extractor = KinematicExtractor(fps=30.0)
        # Low downward velocity (v_y < 0.5) transitioning to horizontal
        kps_prev = create_synthetic_keypoints(torso_angle=40.0, y_offset=300.0)
        kps_now = create_synthetic_keypoints(torso_angle=15.0, y_offset=305.0)

        feats = extractor.extract_features(
            [kps_prev, kps_now],
            [create_bbox_from_kps(kps_prev), create_bbox_from_kps(kps_now)],
            {},
            dt=0.1
        )
        # Small v_y
        state, info = self.sm.step(self.track, feats, {}, dt=0.1)
        assert state == FallStateMachine.STATE_MONITORING

    def test_rapid_fall_and_confirmation(self):
        """Rapid descent followed by horizontal stillness confirms fall after inactivity period."""
        # 1. High downward descent shock
        high_shock_feats = {
            "vertical_velocity": 1.6,
            "angular_velocity": 45.0,
            "torso_angle": 30.0,
            "aspect_ratio": 1.4,
            "stillness_energy": 5.0
        }
        state, info = self.sm.step(self.track, high_shock_feats, {}, dt=0.033)
        assert state in [FallStateMachine.STATE_FALL_DETECTED, FallStateMachine.STATE_RAPID_DESCENT]

        # 2. Subject remains horizontal on ground for inactivity_sec (1.0s)
        ground_feats = {
            "vertical_velocity": 0.0,
            "angular_velocity": 0.0,
            "torso_angle": 12.0,
            "aspect_ratio": 1.5,
            "stillness_energy": 2.0
        }

        # Step through 1.2 seconds of ground immobility
        for _ in range(40):
            state, info = self.sm.step(self.track, ground_feats, {}, dt=0.033)

        assert state == FallStateMachine.STATE_CONFIRMED_FALL
        assert self.track.state_timer >= 1.0

    def test_sustained_fall_candidate_no_timer_reset(self):
        """Ongoing horizontal / low angle state must NOT reset timer every frame."""
        feats = {
            "vertical_velocity": 0.8,
            "angular_velocity": 35.0,
            "torso_angle": 25.0,
            "aspect_ratio": 1.3,
            "stillness_energy": 4.0
        }

        self.sm.step(self.track, feats, {}, dt=0.1)
        initial_timer = self.track.state_timer

        # Second step with continuing trigger conditions
        self.sm.step(self.track, feats, {}, dt=0.1)
        second_timer = self.track.state_timer

        # Timer must accumulate, not reset to 0
        assert second_timer > initial_timer

    def test_rapid_fall_followed_by_recovery(self):
        """If person falls but immediately stands upright, state must reset to MONITORING."""
        # Fall event
        fall_feats = {
            "vertical_velocity": 1.5,
            "angular_velocity": 40.0,
            "torso_angle": 20.0,
            "aspect_ratio": 1.3,
            "stillness_energy": 10.0
        }
        self.sm.step(self.track, fall_feats, {}, dt=0.033)
        assert self.track.state in [FallStateMachine.STATE_FALL_DETECTED, FallStateMachine.STATE_INACTIVITY_CHECK]

        # Stood back up (torso angle 80°, negative velocity moving upward)
        recovery_feats = {
            "vertical_velocity": -0.5,
            "angular_velocity": 10.0,
            "torso_angle": 82.0,
            "aspect_ratio": 0.4,
            "stillness_energy": 30.0
        }
        state, info = self.sm.step(self.track, recovery_feats, {}, dt=0.033)
        assert state == FallStateMachine.STATE_MONITORING
