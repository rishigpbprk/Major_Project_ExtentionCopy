# AI Content Safety Barrier V4 — Enhanced Report UI

This version keeps the automatic text + video pre-post barrier and upgrades the report UI.

## New report features
- Clear POST BLOCKED / POST CLEARED decision hero.
- Platform and content-type context.
- Risk overview.
- Dedicated "Why was this post blocked?" section.
- Numbered blocking reasons tied to actual detector outputs.
- Video evidence: fake/real probabilities, confidence, frames, face-detected frames, model.
- Text evidence: AI/human probabilities, confidence, word count, length group, threshold.
- Linguistic feature summary with a note that these are model features, not standalone proof.
- Colorful topic-oriented cards for Video and Text analysis.
- Probability meters and status chips.
- Responsive layout and improved typography.

## Important interpretation rule
The UI does not invent frame-level artifacts or claim that a particular visual defect caused the decision. The strongest blocking reason is the classifier output and its probabilities. Supporting metrics are shown as evidence/context.

## Installation
1. Keep the existing backend running with `python app.py`.
2. Open `chrome://extensions`.
3. Remove the older Automatic V3 extension.
4. Enable Developer mode.
5. Load unpacked -> select the `extension` folder from this package.
6. Refresh the social-media page.

## V4.1 precision and remediation update
- Expanded blocking explanations for text, video, insufficient evidence, and service errors.
- Added a probability-margin explanation when video is classified as FAKE.
- Added model-feature context without claiming unsupported frame-level artifacts or specific words as causal evidence.
- Added a topic-oriented remediation section with safe next steps for video and text blocks.
- Suggestions focus on verified/original media, genuine rewriting, factual review, and platform disclosure rather than detector evasion.
