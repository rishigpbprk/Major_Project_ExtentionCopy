(() => {
  if (window.top !== window.self) return;
  if (window.__AI_SAFETY_AUTO_BARRIER_V4__) return;
  window.__AI_SAFETY_AUTO_BARRIER_V4__ = true;

  let analyzing = false;
  let pendingAction = null;
  const allowNext = new WeakSet();
  let selectedVideo = null;

  const root = document.createElement('div');
  root.id = 'ai-safety-barrier-root';
  root.innerHTML = `
    <div id="ai-safety-status" aria-live="polite">
      <span class="dot"></span><span id="ai-safety-status-text">AI Safety Active</span>
    </div>
    <div id="ai-safety-report" role="dialog" aria-modal="false" aria-label="AI Content Safety Report">
      <div class="report-glow"></div>
      <div class="report-header">
        <div class="brand-mark">🛡️</div>
        <div class="report-heading">
          <div class="eyebrow">PRE-POST SECURITY CHECK</div>
          <div class="ai-safety-title">AI Content Safety Report</div>
          <div id="ai-safety-subtitle" class="report-subtitle">Automatic content analysis</div>
        </div>
        <button id="ai-safety-close" type="button" aria-label="Close">×</button>
      </div>
      <div id="ai-safety-report-body"></div>
      <div class="report-footer">Analysis performed locally through your configured ML safety gateway.</div>
    </div>`;
  document.documentElement.appendChild(root);

  const status = root.querySelector('#ai-safety-status');
  const statusText = root.querySelector('#ai-safety-status-text');
  const report = root.querySelector('#ai-safety-report');
  const body = root.querySelector('#ai-safety-report-body');
  const subtitle = root.querySelector('#ai-safety-subtitle');
  root.querySelector('#ai-safety-close').addEventListener('click', () => report.classList.remove('open'));

  function setStatus(text, mode = 'ready') { statusText.textContent = text; status.dataset.mode = mode; }
  function visible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  }
  function textFromEditable(el) { return el ? String(el.value ?? el.innerText ?? el.textContent ?? '').replace(/\u00a0/g, ' ').trim() : ''; }
  function getEditables(scope = document) {
    return [...scope.querySelectorAll('textarea, input[type="text"], [contenteditable="true"], [role="textbox"]')].filter(visible);
  }
  let lastEdited = null;
  document.addEventListener('input', e => {
    const t = e.target;
    if (t?.matches?.('textarea, input[type="text"], [contenteditable="true"], [role="textbox"]')) lastEdited = t;
  }, true);

  function rememberVideo(file) {
    if (!(file instanceof File) || !file.type.startsWith('video/')) return;
    selectedVideo = file;
    setStatus('Video selected — automatic scan armed', 'ready');
  }

  document.addEventListener('change', e => {
    const input = e.target;
    if (input?.matches?.('input[type="file"]')) {
      const video = [...(input.files || [])].find(f => f.type.startsWith('video/'));
      if (video) rememberVideo(video);
    }
  }, true);

  document.addEventListener('drop', e => {
    const video = [...(e.dataTransfer?.files || [])].find(f => f.type.startsWith('video/'));
    if (video) rememberVideo(video);
  }, true);

  function getCurrentVideo() {
    if (selectedVideo && selectedVideo.size > 0 && selectedVideo.type.startsWith('video/')) return selectedVideo;
    for (const input of [...document.querySelectorAll('input[type="file"]')]) {
      const file = [...(input.files || [])].find(f => f.type.startsWith('video/'));
      if (file) { selectedVideo = file; return file; }
    }
    return null;
  }

  function getComposerText(target) {
    if (lastEdited && document.contains(lastEdited)) {
      const t = textFromEditable(lastEdited); if (t) return t;
    }
    const container = target?.closest?.('[role="dialog"], form, article, section, main');
    if (container) {
      const values = getEditables(container).map(textFromEditable).filter(Boolean);
      if (values.length) return values.sort((a,b) => b.length-a.length)[0];
    }
    const values = getEditables().map(textFromEditable).filter(t => t.length >= 2);
    return values.sort((a,b) => b.length-a.length)[0] || '';
  }

  function isPostAction(el) {
    if (!el || root.contains(el)) return false;
    const tag = el.tagName?.toLowerCase();
    const role = (el.getAttribute?.('role') || '').toLowerCase();
    const type = (el.getAttribute?.('type') || '').toLowerCase();
    const text = [el.innerText, el.textContent, el.getAttribute?.('aria-label'), el.getAttribute?.('title'), el.getAttribute?.('data-testid'), el.getAttribute?.('name')]
      .filter(Boolean).join(' ').replace(/\s+/g, ' ').trim().toLowerCase();
    const looksLikeButton = tag === 'button' || role === 'button' || type === 'submit' || tag === 'input';
    if (!looksLikeButton) return false;
    return /\b(post|publish|share|tweet|upload|submit|send)\b/i.test(text);
  }

  function escapeHtml(value) { return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
  function num(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }
  function pct(v) { const n = num(v); return n !== null ? n.toFixed(2) + '%' : 'N/A'; }
  function pctNum(v) { const n = num(v); return n !== null ? n : 0; }
  function thresholdPct(v) { const n = num(v); return n !== null ? (n <= 1 ? n * 100 : n) : null; }
  function hostname() { return location.hostname.replace(/^www\./, '') || 'social platform'; }
  function platformName() {
    const h = hostname();
    if (h.includes('instagram')) return 'Instagram';
    if (h.includes('facebook')) return 'Facebook';
    if (h.includes('twitter') || h.includes('x.com')) return 'X';
    if (h.includes('linkedin')) return 'LinkedIn';
    if (h.includes('youtube')) return 'YouTube';
    if (h.includes('tiktok')) return 'TikTok';
    return h;
  }

  function reasonCards(videoData, textData, error) {
    const reasons = [];
    if (videoData) {
      const fake = num(videoData.fake_probability), real = num(videoData.real_probability);
      if (videoData.result === 'FAKE') {
        const margin = Number.isFinite(fake) && Number.isFinite(real) ? Math.abs(fake - real).toFixed(2) : null;
        reasons.push({
          type:'danger', icon:'🎥', title:'Video classified as FAKE / potential deepfake',
          body:`The video classifier assigned <b>${pct(fake)}</b> deepfake probability versus <b>${pct(real)}</b> real probability${margin ? `, a <b>${margin} percentage-point</b> separation` : ''}. This classifier result is the direct video blocking signal.`
        });
      }
      if (videoData.result === 'REAL') {
        reasons.push({type:'good', icon:'✅', title:'Video passed the deepfake classifier', body:`The detector assigned <b>${pct(real)}</b> real probability versus <b>${pct(fake)}</b> deepfake probability. No video blocking signal was triggered.`});
      }
      if (videoData.result === 'INSUFFICIENT_EVIDENCE') {
        reasons.push({type:'warn', icon:'⚠️', title:'Video evidence was insufficient', body:'The detector could not establish a reliable video decision. The barrier stopped publishing rather than treating an uncertain result as safe.'});
      }
      if (videoData.frames_analyzed != null) {
        const faces = videoData.face_detected_frames;
        reasons.push({type:'info', icon:'🔎', title:'Video evidence examined', body:`<b>${escapeHtml(videoData.frames_analyzed)}</b> sampled frames were analyzed, with faces detected in <b>${escapeHtml(faces ?? 'N/A')}</b> frame(s). These are supporting measurements, not independent proof of manipulation.`});
      }
    }
    if (textData) {
      const ai = num(textData.ai_probability), human = num(textData.human_probability), th = thresholdPct(textData.threshold);
      if (textData.result === 'AI-GENERATED') {
        const thresholdText = th !== null ? ` The configured threshold shown by the backend is <b>${th.toFixed(2)}%</b>.` : '';
        reasons.push({type:'danger', icon:'📝', title:'Caption classified as AI-generated', body:`The text classifier assigned <b>${pct(ai)}</b> AI-generation probability versus <b>${pct(human)}</b> human probability.${thresholdText}`});
      }
      if (textData.result === 'HUMAN-WRITTEN') {
        reasons.push({type:'good', icon:'✅', title:'Caption passed the AI-text classifier', body:`The detector assigned <b>${pct(human)}</b> human probability versus <b>${pct(ai)}</b> AI probability. No text blocking signal was triggered.`});
      }
      if (textData.result === 'INSUFFICIENT_EVIDENCE') {
        reasons.push({type:'warn', icon:'⚠️', title:'Caption was too short for a reliable decision', body:escapeHtml(textData.reason || 'The text contains too little linguistic context for reliable AI detection. The barrier therefore stopped publishing rather than guessing.')});
      }
      if (textData.linguistic_features) {
        const f = textData.linguistic_features;
        reasons.push({type:'info', icon:'🧠', title:'Text features considered by the model', body:`Sentence count: <b>${escapeHtml(f.sentence_count ?? 'N/A')}</b> · average sentence length: <b>${escapeHtml(f.avg_sentence_length ?? 'N/A')}</b> words · vocabulary diversity: <b>${escapeHtml(f.vocabulary_diversity ?? 'N/A')}</b> · length group: <b>${escapeHtml(textData.length_group ?? 'N/A')}</b>. These are model features, not standalone proof of authorship.`});
      }
    }
    if (error) reasons.push({type:'danger', icon:'🛑', title:'Safety system error', body:escapeHtml(error)});
    return reasons;
  }

  function remediationCards(videoData, textData, error) {
    const cards = [];
    if (error) {
      cards.push({type:'warn', icon:'🔧', title:'Retry after the safety service is available', body:'Make sure the Flask ML backend is running on localhost:5000, then retry the post. The barrier blocks on service failure so content is not published without a completed scan.'});
      return cards;
    }
    if (videoData?.result === 'FAKE') {
      cards.push({type:'video', icon:'🎥', title:'For a video block', body:'Use an original recording or another source whose authenticity you can verify. If the clip has been edited, keep the original source and provenance available for review. Do not repeatedly alter a video just to evade detection.'});
      cards.push({type:'video', icon:'📎', title:'If you believe the result is wrong', body:'Try the original, highest-quality file and verify its source. A detector score is evidence, not a guarantee; your report can be reviewed alongside the original media and provenance.'});
    }
    if (videoData?.result === 'INSUFFICIENT_EVIDENCE') {
      cards.push({type:'video', icon:'🎬', title:'Improve video evidence', body:'Use the original video file with enough visible content and avoid submitting a severely shortened or corrupted clip. The goal is to give the detector sufficient frames for analysis.'});
    }
    if (textData?.result === 'AI-GENERATED') {
      cards.push({type:'text', icon:'✍️', title:'For a text block', body:'Write the caption in your own words based on your actual experience or source material. Add specific details you can personally verify and review every factual claim before publishing.'});
      cards.push({type:'text', icon:'🧾', title:'If AI assistance was legitimate', body:'If the platform or your context permits AI-assisted content, follow its disclosure or labeling requirements rather than trying to disguise AI authorship. Keep supporting sources or drafts if human review is required.'});
    }
    if (textData?.result === 'INSUFFICIENT_EVIDENCE') {
      cards.push({type:'text', icon:'📝', title:'Provide more context', body:'Very short captions do not provide enough linguistic evidence for a reliable decision. Add enough genuine context for the detector to analyze, or treat the result as unresolved rather than assuming it is human or AI.'});
    }
    if (!cards.length) cards.push({type:'good', icon:'✅', title:'No remediation needed', body:'No blocking condition was triggered by the current scan. You can continue with the normal publishing flow.'});
    return cards;
  }

  function renderReport(videoData, textData, error) {
    const videoBlocked = videoData && videoData.result === 'FAKE';
    const textBlocked = textData && textData.result === 'AI-GENERATED';
    const blocked = !!(videoBlocked || textBlocked || error || (videoData && videoData.result === 'INSUFFICIENT_EVIDENCE'));
    const reasons = reasonCards(videoData, textData, error);
    const contentType = videoData ? (textData ? 'Video + caption' : 'Video') : 'Caption / text';
    const title = blocked ? 'POST BLOCKED' : 'POST CLEARED';
    const badgeClass = blocked ? 'blocked' : 'cleared';

    const videoScore = videoData ? pctNum(videoData.fake_probability) : null;
    const textScore = textData ? pctNum(textData.ai_probability) : null;
    const highestRisk = Math.max(videoScore ?? 0, textScore ?? 0);
    const riskLabel = highestRisk >= 80 ? 'HIGH RISK' : highestRisk >= 50 ? 'REVIEW' : 'LOW RISK';
    const riskClass = highestRisk >= 80 ? 'high' : highestRisk >= 50 ? 'medium' : 'low';

    let html = `
      <div class="decision-hero ${badgeClass}">
        <div class="decision-icon">${blocked ? '🚫' : '✓'}</div>
        <div><div class="decision-label">${title}</div><div class="decision-detail">${blocked ? 'One or more safety conditions triggered.' : 'No blocking condition was triggered.'}</div></div>
      </div>
      <div class="meta-grid">
        <div class="meta-card"><span>🌐 Platform</span><strong>${escapeHtml(platformName())}</strong></div>
        <div class="meta-card"><span>📦 Content</span><strong>${escapeHtml(contentType)}</strong></div>
        <div class="meta-card"><span>⚡ Risk</span><strong class="risk-text ${riskClass}">${riskLabel}</strong></div>
      </div>`;

    if (blocked && reasons.length) {
      html += `<section class="reason-panel"><div class="section-heading"><span>🚨</span><div><b>Why was this post blocked?</b><small>Direct signals and supporting evidence from this scan</small></div></div>`;
      reasons.forEach((r, i) => {
        html += `<div class="reason-card ${r.type}"><div class="reason-icon">${r.icon}</div><div><div class="reason-title">${i+1}. ${r.title}</div><div class="reason-body">${r.body}</div></div></div>`;
      });
      html += `</section>`;
    }

    if (videoData) {
      const fake = pctNum(videoData.fake_probability);
      const real = pctNum(videoData.real_probability);
      html += `<section class="analysis-card video-card">
        <div class="card-title"><span class="topic-icon video">🎥</span><div><b>Deepfake / Video Analysis</b><small>Spatial + temporal model assessment</small></div><span class="mini-status ${videoData.result === 'FAKE' ? 'bad' : 'good'}">${escapeHtml(videoData.result || 'UNKNOWN')}</span></div>
        <div class="score-pair"><div><span>Deepfake</span><b>${pct(fake)}</b><div class="meter"><i style="width:${Math.min(fake,100)}%"></i></div></div><div><span>Real</span><b>${pct(real)}</b><div class="meter real"><i style="width:${Math.min(real,100)}%"></i></div></div></div>
        <div class="evidence-grid">
          <div><span>Confidence</span><b>${pct(videoData.confidence)}</b></div>
          <div><span>Frames analyzed</span><b>${videoData.frames_analyzed ?? 'N/A'}</b></div>
          <div><span>Faces detected</span><b>${videoData.face_detected_frames ?? 'N/A'}</b></div>
          <div><span>Model</span><b>${escapeHtml(videoData.model || 'Video detector')}</b></div>
        </div>
      </section>`;
    }

    if (textData) {
      const ai = pctNum(textData.ai_probability);
      const human = pctNum(textData.human_probability);
      html += `<section class="analysis-card text-card">
        <div class="card-title"><span class="topic-icon text">📝</span><div><b>AI Text Analysis</b><small>Hybrid linguistic + ML assessment</small></div><span class="mini-status ${textData.result === 'AI-GENERATED' ? 'bad' : 'good'}">${escapeHtml(textData.result || 'UNKNOWN')}</span></div>
        <div class="score-pair"><div><span>AI-generated</span><b>${pct(ai)}</b><div class="meter ai"><i style="width:${Math.min(ai,100)}%"></i></div></div><div><span>Human-written</span><b>${pct(human)}</b><div class="meter real"><i style="width:${Math.min(human,100)}%"></i></div></div></div>
        <div class="evidence-grid">
          <div><span>Confidence</span><b>${pct(textData.confidence)}</b></div>
          <div><span>Words</span><b>${textData.word_count ?? 'N/A'}</b></div>
          <div><span>Length group</span><b>${escapeHtml(textData.length_group || 'N/A')}</b></div>
          <div><span>Threshold</span><b>${thresholdPct(textData.threshold) !== null ? thresholdPct(textData.threshold).toFixed(2)+'%' : 'N/A'}</b></div>
        </div>
      </section>`;
    }

    const fixes = remediationCards(videoData, textData, error);
    html += `<section class="remediation-panel"><div class="section-heading"><span>${blocked ? '🛠️' : '💡'}</span><div><b>${blocked ? 'How to resolve this block' : 'Publishing guidance'}</b><small>Practical next steps based on the signals above</small></div></div>`;
    fixes.forEach((f, i) => { html += `<div class="remediation-card ${f.type}"><div class="remediation-icon">${f.icon}</div><div><div class="remediation-title">${i+1}. ${f.title}</div><div class="remediation-body">${f.body}</div></div></div>`; });
    html += `</section>`;
    html += `<section class="method-note"><span>ℹ️</span><div><b>How to interpret this report</b><p>The report explains the model outputs that triggered the barrier. It does not invent a specific facial artifact, word, or editing operation as the cause when the underlying model does not expose that information. Probabilities, frame counts and linguistic statistics are evidence for the classifier decision, not absolute proof of authorship or manipulation.</p></div></section>`;
    body.innerHTML = html;
    subtitle.textContent = `${platformName()} • ${contentType} • ${new Date().toLocaleTimeString()}`;
    report.classList.add('open');
  }

  async function analyzeVideo(file) {
    const fd = new FormData();
    fd.append('file', file, file.name || 'upload.mp4');
    const response = await fetch('http://127.0.0.1:5000/api/analyze/video', { method: 'POST', body: fd });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) throw new Error(data.error || `Video detector returned HTTP ${response.status}`);
    return data;
  }

  async function analyzeText(text) {
    const response = await fetch('http://127.0.0.1:5000/api/analyze/text', {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({text})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) throw new Error(data.error || `Text detector returned HTTP ${response.status}`);
    return data;
  }

  function resumeAction() {
    const action = pendingAction; pendingAction = null;
    if (!action) return;
    if (action.kind === 'click' && action.el?.isConnected) {
      allowNext.add(action.el); action.el.click();
    } else if (action.kind === 'submit' && action.form?.isConnected) {
      allowNext.add(action.form);
      if (typeof action.form.requestSubmit === 'function') action.form.requestSubmit(action.submitter || undefined); else action.form.submit();
    }
  }

  async function analyzeBeforePublish(text, action, videoFile) {
    if (analyzing) return;
    analyzing = true; pendingAction = action;
    setStatus(videoFile ? 'Scanning video + text…' : 'Scanning text…', 'checking');
    try {
      let videoData = null, textData = null;
      if (videoFile) videoData = await analyzeVideo(videoFile);
      if (text && text.trim().length > 2) textData = await analyzeText(text);
      const videoBlocked = videoData && videoData.result === 'FAKE';
      const textBlocked = textData && textData.result === 'AI-GENERATED';
      const insufficient = videoData && videoData.result === 'INSUFFICIENT_EVIDENCE';
      const safe = !videoBlocked && !textBlocked && !insufficient;
      renderReport(videoData, textData, null);
      if (safe) {
        setStatus('Safety check passed — publishing allowed', 'safe');
        setTimeout(resumeAction, 650);
      } else {
        setStatus('Unsafe content detected — publishing blocked', 'blocked');
        pendingAction = null;
      }
    } catch (err) {
      pendingAction = null;
      renderReport(null, null, `The safety service could not complete the scan: ${err.message}`);
      setStatus('Safety check failed — post blocked', 'error');
    } finally { analyzing = false; }
  }

  function interceptClick(e) {
    if (e.defaultPrevented) return;
    const el = e.target?.closest?.('button, [role="button"], input[type="submit"], input[type="button"]');
    if (!isPostAction(el)) return;
    if (allowNext.has(el)) { allowNext.delete(el); return; }
    const text = getComposerText(el);
    const video = getCurrentVideo();
    if (!text && !video) return;
    e.preventDefault(); e.stopImmediatePropagation();
    analyzeBeforePublish(text, {kind:'click', el}, video);
  }

  function interceptSubmit(e) {
    const form = e.target;
    if (!form || allowNext.has(form)) { if (allowNext.has(form)) allowNext.delete(form); return; }
    const text = getComposerText(form); const video = getCurrentVideo();
    if (!text && !video) return;
    e.preventDefault(); e.stopImmediatePropagation();
    analyzeBeforePublish(text, {kind:'submit', form, submitter:e.submitter}, video);
  }

  document.addEventListener('click', interceptClick, true);
  document.addEventListener('submit', interceptSubmit, true);
  const observer = new MutationObserver(() => { if (!document.documentElement.contains(root)) document.documentElement.appendChild(root); });
  observer.observe(document.documentElement, {childList:true, subtree:true});
  setStatus('AI Safety Active — automatic text + video pre-post scan', 'ready');
})();
