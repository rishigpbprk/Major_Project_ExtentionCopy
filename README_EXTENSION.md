# AI Text & Deepfake Detection — Chrome Extension Conversion

This package keeps the original ML project as the **local Flask backend** and adds a Chrome Manifest V3 extension for Instagram.

## Architecture

Instagram -> Chrome Extension -> Flask API -> Original ML Text Detector -> Safety Report

The extension does NOT run Python/ML directly inside Chrome. The trained models in the original project remain on the backend.

## Run backend

Open `backend` in VS Code:

```bash
python -m pip install -r requirements.txt
python app.py
```

The API should be available at:

`http://127.0.0.1:5000`

Test:

`http://127.0.0.1:5000/api/health`

## Install extension

1. Open Chrome.
2. Go to `chrome://extensions`.
3. Enable **Developer mode**.
4. Remove older versions of the AI Content Safety Barrier extension.
5. Click **Load unpacked**.
6. Select the `extension` folder in this package.
7. Open/refresh Instagram.

## Use

1. Start creating an Instagram post/reel.
2. Enter a caption.
3. Click **Check with AI Safety Barrier**.
4. The extension sends the caption to `/api/analyze/text`.
5. The ML result is shown in the report.
6. If the result is `AI-GENERATED`, the extension blocks the Share/Post click.
7. If it is `HUMAN-WRITTEN`, the Share/Post action is allowed.

If the Flask server is unavailable, the extension displays a clearly labelled browser fallback report so the button does not appear broken. The fallback is only for demo continuity and is not the project's ML model.
