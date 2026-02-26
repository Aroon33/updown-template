import os
import librosa
import soundfile as sf
import numpy as np


def change_pitch(input_path, output_path, n_steps):
    y, sr = librosa.load(input_path, sr=None)
    y_shifted = librosa.effects.pitch_shift(y, sr=sr, n_steps=n_steps)
    sf.write(output_path, y_shifted, sr)


def robot_voice(input_path, output_path):
    y, sr = librosa.load(input_path, sr=None)

    # 簡易ロボット化（位相ずらし＋変調）
    y_mod = np.sin(2 * np.pi * 30 * np.arange(len(y)) / sr) * y

    sf.write(output_path, y_mod, sr)


def generate_variations(input_wav):
    base = os.path.splitext(input_wav)[0]

    change_pitch(input_wav, base + "_male.wav", -4)
    change_pitch(input_wav, base + "_female.wav", 4)
    robot_voice(input_wav, base + "_robot.wav")

    print("Voice variations created.")
