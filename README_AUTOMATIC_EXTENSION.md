# AI Content Safety Barrier - Automatic Social Media Extension

## What changed

There is **no Check button** anymore.

The extension automatically runs the project's ML text detector when the user attempts to publish content. It works on social-media sites through a generic browser-level interception layer rather than being tied only to Instagram.

### Flow

User writes a caption/post -> clicks the site's Post/Publish/Share/Tweet/Upload/Submit action -> extension intercepts it -> sends text to Flask ML backend ->

- HUMAN-WRITTEN: the original action is automatically continued.
- AI-GENERATED: action stays blocked and the AI Content Safety Report opens automatically.
- INSUFFICIENT_EVIDENCE / unavailable backend: action stays blocked and the reason is shown.

## Important scope

A browser extension cannot guarantee compatibility with literally every social-media website because each platform can change its private DOM and event handling. This version uses generic selectors and capture-phase interception for common publishing controls, so it is designed to work across many current sites without a platform-specific button.

It currently performs the automatic **text/caption gate**. The uploaded project also contains the deepfake-video model, but automatic video-file interception is platform-specific and should be added per platform if you need reliable pre-upload deepfake blocking.

## Run backend

```bash
cd backend
python -m pip install -r requirements.txt
python app.py
```

Confirm:

http://127.0.0.1:5000/api/health

## Load extension

1. Open Chrome and go to `chrome://extensions`.
2. Enable Developer mode.
3. Remove old versions of AI Content Safety Barrier.
4. Click **Load unpacked**.
5. Select the `extension` folder from this project.
6. Open/reload the social-media website.

You should see only a small **AI Safety Active — automatic pre-post scan** indicator. There is no manual scan button.

## Demo

1. Start Flask.
2. Open a supported social-media site.
3. Open its post composer.
4. Enter a test caption.
5. Click the site's normal Post/Publish/Share button.
6. The extension automatically pauses the publish action while the ML detector runs.
7. The report appears automatically.

For an AI-generated result, the post remains blocked. For a HUMAN-WRITTEN result, the original publishing action is resumed automatically.
