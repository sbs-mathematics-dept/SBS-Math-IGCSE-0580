/* SBS Mathematics — Interactive Lesson Engine
   Renders a slide-by-slide lesson from a LESSON_DATA object: { title, kicker, sub, slides: [...] }
   Slide types: 'content' (explainer) and 'quiz' (mcq or numeric)
*/

let LESSON_STATE = { current: 0, stars: 0, answered: {}, correctCount: 0, quizCount: 0 };

function initLesson(){
  const root = document.getElementById('lesson-root');
  LESSON_DATA.slides.forEach((s,i)=>{ if(s.type==='quiz') LESSON_STATE.quizCount++; });

  document.getElementById('lesson-title').textContent = LESSON_DATA.title;
  document.getElementById('lesson-kicker').textContent = LESSON_DATA.kicker;
  document.getElementById('lesson-sub').textContent = LESSON_DATA.sub;

  renderSlide(0);
  renderDots();
  updateProgress();
}

function slideHTML(slide, idx){
  if(slide.type === 'complete'){
    return `<div class="slide-card"><div class="complete-card">
      <div class="ci">🏆</div>
      <h2>Chapter complete!</h2>
      <p>${slide.message || "You've worked through every concept and quiz in this chapter."}</p>
      <div class="complete-stats">
        <div class="complete-stat"><div class="n" id="final-score">0/0</div><div class="l">Quiz score</div></div>
        <div class="complete-stat"><div class="n" id="final-stars">0</div><div class="l">Stars earned</div></div>
      </div>
      <button class="slide-nav-btn primary" onclick="goToSlide(0)">↻ Review from the start</button>
      <div style="margin-top:14px;"><a href="../chapters.html" style="font-size:13px;color:var(--sbs-blue);">← Back to all chapters</a></div>
    </div></div>`;
  }

  const typeLabel = slide.type === 'quiz' ? 'Quick check' : (slide.tag || 'Concept');
  let body = '';

  if(slide.type === 'quiz'){
    body = `
      <div class="quiz-area" data-slide="${idx}">
        <div class="quiz-prompt">${slide.question}</div>
        ${slide.svg ? `<div class="slide-svg-wrap">${slide.svg}</div>` : ''}
        ${renderQuizInput(slide, idx)}
        <div class="quiz-fb" id="fb-${idx}"></div>
      </div>`;
  } else {
    body = `
      <div class="slide-text">${slide.html || ''}</div>
      ${slide.formula ? `<div class="slide-formula">${slide.formula}</div>` : ''}
      ${slide.svg ? `<div class="slide-svg-wrap">${slide.svg}</div>` : ''}
      ${slide.callout ? `<div class="slide-callout"><b>Exam tip:</b> ${slide.callout}</div>` : ''}
      ${slide.worked ? renderWorked(slide.worked) : ''}
    `;
  }

  return `
    <div class="slide-card">
      <div class="slide-head">
        <span class="slide-num">${idx+1} / ${LESSON_DATA.slides.length}</span>
        <span class="slide-type">${typeLabel}</span>
      </div>
      <div class="slide-body">
        <div class="slide-title">${slide.title}</div>
        ${body}
      </div>
      <div class="slide-nav">
        <button class="slide-nav-btn" id="btn-prev" onclick="prevSlide()" ${idx===0?'disabled':''}>← Back</button>
        <div class="slide-dots" id="slide-dots"></div>
        <button class="slide-nav-btn primary" id="btn-next" onclick="nextSlide()">${idx===LESSON_DATA.slides.length-1?'Finish ✓':'Next →'}</button>
      </div>
    </div>`;
}

function renderWorked(steps){
  return `<div class="slide-worked"><div style="font-weight:600;margin-bottom:8px;color:var(--gray-800);">Worked example</div>
    ${steps.map((s,i)=>`<div class="ww-step"><span class="ww-num">${i+1}.</span><span>${s}</span></div>`).join('')}
  </div>`;
}

function renderQuizInput(slide, idx){
  if(slide.qtype === 'numeric'){
    return `<div class="quiz-input-row">
      <input type="text" id="num-input-${idx}" placeholder="Type your answer">
      <button class="quiz-submit" onclick="checkNumeric(${idx})">Submit</button>
    </div>`;
  }
  return slide.options.map((opt,oi)=>
    `<button class="quiz-choice" id="choice-${idx}-${oi}" onclick="checkChoice(${idx},${oi})">${opt}</button>`
  ).join('');
}

function renderSlide(idx){
  document.getElementById('lesson-root').innerHTML = slideHTML(LESSON_DATA.slides[idx], idx);
  if(LESSON_DATA.slides[idx].type === 'complete'){
    document.getElementById('final-score').textContent = `${LESSON_STATE.correctCount}/${LESSON_STATE.quizCount}`;
    document.getElementById('final-stars').textContent = LESSON_STATE.stars;
  }
  renderDots();
  LESSON_STATE.current = idx;
  updateProgress();
  window.scrollTo({top: document.getElementById('lesson-progress-track')?.offsetTop || 0, behavior:'smooth'});
}

function renderDots(){
  const dotsEl = document.getElementById('slide-dots');
  if(!dotsEl) return;
  dotsEl.innerHTML = LESSON_DATA.slides.map((s,i)=>{
    let cls = 'slide-dot';
    if(i===LESSON_STATE.current) cls += ' active';
    else if(LESSON_STATE.answered[i] !== undefined) cls += ' done';
    return `<span class="${cls}" onclick="goToSlide(${i})"></span>`;
  }).join('');
}

function updateProgress(){
  const pct = Math.round(((LESSON_STATE.current+1)/LESSON_DATA.slides.length)*100);
  const fill = document.getElementById('lesson-progress-fill');
  if(fill) fill.style.width = pct + '%';
  const meta = document.getElementById('progress-meta-text');
  if(meta) meta.textContent = `Slide ${LESSON_STATE.current+1} of ${LESSON_DATA.slides.length}`;
  const starEl = document.getElementById('lesson-stars-count');
  if(starEl) starEl.textContent = `★ ${LESSON_STATE.stars}`;
}

function nextSlide(){
  if(LESSON_STATE.current < LESSON_DATA.slides.length-1) goToSlide(LESSON_STATE.current+1);
}
function prevSlide(){
  if(LESSON_STATE.current > 0) goToSlide(LESSON_STATE.current-1);
}
function goToSlide(idx){
  renderSlide(idx);
}

function checkChoice(slideIdx, optIdx){
  const slide = LESSON_DATA.slides[slideIdx];
  if(LESSON_STATE.answered[slideIdx] !== undefined) return;
  const isCorrect = optIdx === slide.correct;
  LESSON_STATE.answered[slideIdx] = isCorrect;
  if(isCorrect){ LESSON_STATE.correctCount++; LESSON_STATE.stars++; }

  slide.options.forEach((opt,oi)=>{
    const el = document.getElementById(`choice-${slideIdx}-${oi}`);
    if(oi===slide.correct) el.classList.add('correct');
    else if(oi===optIdx) el.classList.add('wrong');
    el.onclick = null;
  });
  const fb = document.getElementById(`fb-${slideIdx}`);
  fb.textContent = isCorrect ? '✓ Correct! +1 star' : `✗ Not quite. ${slide.explain || ''}`;
  fb.style.color = isCorrect ? '#16A34A' : '#DC2626';
  updateProgress();
}

function checkNumeric(slideIdx){
  const slide = LESSON_DATA.slides[slideIdx];
  if(LESSON_STATE.answered[slideIdx] !== undefined) return;
  const input = document.getElementById(`num-input-${slideIdx}`);
  const raw = input.value.trim().toLowerCase().replace(/\s+/g,'');
  const accepted = slide.accept.map(a=>a.toLowerCase().replace(/\s+/g,''));
  const isCorrect = accepted.includes(raw);
  LESSON_STATE.answered[slideIdx] = isCorrect;
  if(isCorrect){ LESSON_STATE.correctCount++; LESSON_STATE.stars++; }

  input.style.borderColor = isCorrect ? '#16A34A' : '#DC2626';
  input.disabled = true;
  document.querySelector(`[data-slide="${slideIdx}"] .quiz-submit`).disabled = true;
  const fb = document.getElementById(`fb-${slideIdx}`);
  fb.textContent = isCorrect ? '✓ Correct! +1 star' : `✗ Not quite — correct answer: ${slide.accept[0]}. ${slide.explain || ''}`;
  fb.style.color = isCorrect ? '#16A34A' : '#DC2626';
  updateProgress();
}

document.addEventListener('DOMContentLoaded', initLesson);
