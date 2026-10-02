# Automatic Text + Video Safety Extension V3

This version automatically checks both captions/text and selected video files before a social-media Post/Publish/Share action is allowed to continue.

## Backend

```bat
cd backend
python -m venv venv
venv\\Scripts\\activate
pip install -r requirements.txt
python app.py
```

Keep Flask running at `http://127.0.0.1:5000`.

## Extension

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Remove old AI Safety Barrier versions.
4. Click Load unpacked.
5. Select the `extension` folder.
6. Refresh the social-media page.

## Video flow

1. Select a video through the site's file picker, or drag/drop a video.
2. Do not click a separate safety button.
3. Click the site's normal Post/Publish/Share button.
4. The extension intercepts the action.
5. The selected video is sent to `/api/analyze/video`.
6. The backend runs the existing VideoDetector V4 (8 sampled frames, ResNet-18 spatial features, temporal Conv-BiGRU/attention model).
7. FAKE blocks publishing and shows the report.
8. REAL allows the original publishing action to continue.

## Important limitation

This generic extension can reliably capture video files exposed through standard HTML file inputs and drag/drop. Platforms that upload media through custom browser APIs, streams, or shadow DOM may require a platform-specific adapter. The ML backend itself exposes `/api/analyze/video` and is independent of the social-media site.
