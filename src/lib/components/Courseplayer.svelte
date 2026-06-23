<script>
// ─────────────────────────────────────────────────────────────────────────────
// +page.svelte — Course Player
// ─────────────────────────────────────────────────────────────────────────────
// CHANGES vs original:
//
// [FIX-1] Video seek restriction — users can only seek within watched content
//         OR up to MAX_SEEK_DELTA (30s) ahead of maxReached, for BOTH native
//         video and YouTube iframe. Persisted to sessionStorage per lesson so
//         maxReached survives soft-navigations within the same tab session.
//
// [FIX-2] Access caching — hasAccess is resolved server-side and cached in
//         sessionStorage keyed by courseId. Progress API calls (?/report) are
//         completely suppressed for users without access. The session cache is
//         read on mount so subsequent page visits skip the server round-trip.
//
// [FIX-3] Progress circle — fixed the SVG stroke-dasharray so 100% renders a
//         fully filled circle. circumference = 2πr = 2π×14 ≈ 87.96. We now
//         compute the arc length from overallPct instead of a hard-coded "88".
//
// [FIX-4] Full UI redesign — modern card-based layout, improved typography,
//         responsive sidebar, richer progress visualisation.
//
// [FIX-5] Course completion email — when overallPct first reaches 100 we POST
//         to ?/complete (server action). A `completionFired` flag (also stored
//         in sessionStorage) prevents duplicate POSTs on page refresh.
//
// [REFACTOR] Removed all redundant API calls; improved error handling;
//            extracted helper functions; consolidated duplicated JSX branches.
// ─────────────────────────────────────────────────────────────────────────────

import { onMount, onDestroy, tick } from 'svelte';
import { goto } from '$app/navigation';

export let data;

const course    = data?.course;
const courseId  = data?.courseId;
const authedUser = data?.authedUser ?? null;
const userEmail  = authedUser?.email ?? '';
const userId     = authedUser?.id    ?? '';

const serverLessonMap = data?.userProgress?.lessonMap ?? {};

// ── [FIX-2] Access: use server-resolved value; cache in sessionStorage ────────
const SESSION_ACCESS_KEY = `course_access_${courseId}`;

function resolveAccess() {
    // Server is the truth on first load; after that use session cache.
    if (typeof sessionStorage === 'undefined') return data?.hasAccess ?? false;
    const cached = sessionStorage.getItem(SESSION_ACCESS_KEY);
    if (cached !== null) return cached === 'true';
    const serverVal = data?.hasAccess ?? false;
    sessionStorage.setItem(SESSION_ACCESS_KEY, String(serverVal));
    return serverVal;
}

let hasAccess = false; // set in onMount after sessionStorage is available

function canPlayLesson(modIdx, lesIdx) {
    if (hasAccess) return true;
    return modIdx === 0 && lesIdx === 0;
}

// ── [FIX-5] Completion tracking ──────────────────────────────────────────────
const SESSION_COMPLETE_KEY = `course_completed_${courseId}`;
let completionFired = false; // set in onMount

// ── Interest modal ────────────────────────────────────────────────────────────
let interestModalOpen = false;
let interestLoading   = false;
let interestDone      = false;
let justSubmitted     = false;

$: alreadyInterested =
    justSubmitted ||
    (data?.profile?.interestedcourse ?? []).some(c => c.courseId === courseId);

function openInterestModal() { interestModalOpen = true; interestDone = false; }

async function confirmInterest() {
    interestLoading = true;
    try {
        const params = new URLSearchParams({
            courseId:    courseId ?? '',
            courseName:  course?.title ?? '',
            coursePrice: String(course?.price ?? ''),
            userEmail,
            userId,
        });
        const res = await fetch('?/interested', {
            method:  'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body:    params.toString(),
        });
        if (!res.ok) {
            let errMsg = 'Something went wrong. Please try again.';
            try {
                const json = await res.json();
                if (Array.isArray(json?.data)) {
                    const msg = json.data.find(d => typeof d === 'string');
                    if (msg) errMsg = msg;
                } else if (json?.error) errMsg = json.error;
            } catch {}
            interestLoading = false;
            interestModalOpen = false;
            showToast(errMsg, 'error');
            return;
        }
        interestLoading  = false;
        interestDone     = true;
        justSubmitted    = true;
    } catch {
        interestLoading  = false;
        interestModalOpen = false;
        showToast('Network error. Please try again.', 'error');
    }
}

// ── Video utils ───────────────────────────────────────────────────────────────
function getYouTubeId(url) {
    if (!url) return null;
    const patterns = [
        /youtu\.be\/([^?&]+)/,
        /youtube\.com\/watch\?v=([^&]+)/,
        /youtube\.com\/embed\/([^?&]+)/,
        /youtube\.com\/shorts\/([^?&]+)/,
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
    }
    return null;
}
function isYouTube(url) {
    return !!url && (url.includes('youtube.com') || url.includes('youtu.be'));
}
function getEmbedUrl(url) {
    const id = getYouTubeId(url);
    if (!id) return url;
    const origin = typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : '';
    return `https://www.youtube.com/embed/${id}?enablejsapi=1&rel=0&modestbranding=1&origin=${origin}`;
}

// ── Seek constants ────────────────────────────────────────────────────────────
const MAX_SEEK_DELTA   = 30;   // seconds a user may skip ahead of maxReached
const MAX_NATIVE_DELTA = 1.5;  // tolerance for normal playback drift

// ── Reactive state ────────────────────────────────────────────────────────────
let lastPollTime     = 0;
let lastSkipWarnTime = 0;

let activeModuleIdx  = 0;
let activeLessonIdx  = 0;
let sidebarOpen      = true;

let lessonProgress  = {};
let moduleProgress  = {};
let overallPct      = 0;
let courseComplete  = false;
let certificateReady = false;

let currentLesson  = null;
let currentModule  = null;
let videoLoading   = false;

// [FIX-1] maxReached is now always bounded by the per-lesson sessionStorage cache.
let maxReached = 0;

let isAdvancing = false; // guard against double-advance race condition

let quizOpen          = false;
let quizAnswers       = {};
let quizResult        = null;
let questionAttempts  = {};
let totalQuizAttempts = 0;

let toast        = null;
let toastTimeout;

let iframeEl;
let videoEl;
let ytPollInterval;
let destroyed = false;

// ── [FIX-1] Per-lesson maxReached persistence ─────────────────────────────────
/** sessionStorage key for a lesson's maxReached */
function lessonKey(lessonId) { return `mr_${courseId}_${lessonId}`; }

function loadMaxReached(lessonId) {
    if (typeof sessionStorage === 'undefined') return 0;
    return Number(sessionStorage.getItem(lessonKey(lessonId)) ?? 0) || 0;
}
function saveMaxReached(lessonId, val) {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(lessonKey(lessonId), String(Math.floor(val)));
}

// ── YouTube polling ───────────────────────────────────────────────────────────
function startYTPoll() {
    clearInterval(ytPollInterval);
    if (!iframeEl) return;
    ytPollInterval = setInterval(() => {
        try {
            iframeEl?.contentWindow?.postMessage(JSON.stringify({ event: 'listening' }), '*');
            iframeEl?.contentWindow?.postMessage(
                JSON.stringify({ event: 'command', func: 'getCurrentTime', args: [] }), '*'
            );
        } catch {}
    }, 1000);
}
function stopYTPoll() { clearInterval(ytPollInterval); }

// ── Progress helpers ──────────────────────────────────────────────────────────
function isLessonComplete(lessonId) {
    return !!(lessonProgress[lessonId]?.complete || serverLessonMap[lessonId]);
}

// ── [FIX-1] YouTube message handler ──────────────────────────────────────────
async function handleYTMessage(e) {
    if (destroyed) return;
    try {
        const d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (d?.event !== 'infoDelivery' || d?.info?.currentTime === undefined || !currentLesson) return;

        const lesson = currentLesson;
        const mod    = currentModule;
        const lesId  = lesson.id;
        const ct     = d.info.currentTime;

        // [FIX-1] Block seek beyond maxReached + MAX_SEEK_DELTA when not complete.
        if (!isLessonComplete(lesId) && ct > maxReached + MAX_SEEK_DELTA) {
            const allowed = maxReached + MAX_SEEK_DELTA;
            try {
                iframeEl?.contentWindow?.postMessage(
                    JSON.stringify({ event: 'command', func: 'seekTo', args: [allowed, true] }), '*'
                );
            } catch {}
            lastPollTime = allowed;
            const now = Date.now();
            if (now - lastSkipWarnTime > 3000) {
                showToast(`You can only skip up to ${MAX_SEEK_DELTA}s ahead`, 'info');
                lastSkipWarnTime = now;
            }
            return;
        }

        lastPollTime = ct;
        if (ct > maxReached) {
            maxReached = ct;
            saveMaxReached(lesId, maxReached); // [FIX-1] persist
        }

        if (!lessonProgress[lesId]) lessonProgress[lesId] = { maxWatched: 0, complete: false };
        lessonProgress[lesId].maxWatched = Math.floor(maxReached);
        lessonProgress = { ...lessonProgress };

        if (
            !isLessonComplete(lesId) &&
            lesson.durationSeconds &&
            maxReached >= 0.95 * lesson.durationSeconds
        ) {
            await markLessonComplete(lesson, mod);
        }
    } catch (err) {
        if (err?.message && !err.message.includes('JSON')) console.warn('[YTMessage]', err.message);
    }
}

// ── markLessonComplete — single source of truth ───────────────────────────────
async function markLessonComplete(lesson, mod) {
    const lesId = lesson.id;
    lessonProgress[lesId] = { ...lessonProgress[lesId], complete: true };
    lessonProgress = { ...lessonProgress };
    recalcProgress();
    showToast('Lesson completed!', 'success');
    await sendLessonProgress(lesson, mod);
    if (destroyed || isAdvancing) return;
    isAdvancing = true;
    await tick();
    if (!destroyed) autoAdvance();
    isAdvancing = false;
}

// ── initProgress ──────────────────────────────────────────────────────────────
function initProgress() {
    (course.modules || []).forEach(mod => {
        if (!moduleProgress[mod.id]) moduleProgress[mod.id] = { complete: false };
        (mod.lessons || []).forEach(les => {
            const serverLesson = serverLessonMap[les.id];
            // [FIX-1] Merge server maxWatched with sessionStorage value
            const storedMax    = loadMaxReached(les.id);
            const serverMax    = serverLesson?.watchedSeconds ?? 0;
            lessonProgress[les.id] = {
                maxWatched: Math.max(storedMax, serverMax),
                complete:   !!serverLesson,
            };
        });
    });
    recalcProgress();
}

function recalcProgress() {
    (course.modules || []).forEach(mod => {
        moduleProgress[mod.id].complete = (mod.lessons || []).every(l => isLessonComplete(l.id));
    });
    const total = (course.modules || []).length || 1;
    const done  = (course.modules || []).filter(m => moduleProgress[m.id]?.complete).length;
    // [FIX-3] Correct integer percentage; circle arc derived from this in the template.
    overallPct      = Math.round((done / total) * 100);
    courseComplete  = overallPct === 100;
    certificateReady = courseComplete;
    moduleProgress = { ...moduleProgress };
    lessonProgress = { ...lessonProgress };

    // [FIX-5] Fire completion notification once
    if (courseComplete && !completionFired && hasAccess) {
        fireCompletionEmail();
    }
}

// ── [FIX-5] One-time completion email ────────────────────────────────────────
async function fireCompletionEmail() {
    if (completionFired) return;
    completionFired = true;
    if (typeof sessionStorage !== 'undefined')
        sessionStorage.setItem(SESSION_COMPLETE_KEY, 'true');

    try {
        const params = new URLSearchParams({
            courseId,
            courseName: course?.title ?? '',
            userId,
            userEmail,
        });
        const res = await fetch('?/complete', {
            method:  'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body:    params.toString(),
        });
        if (!res.ok) console.error('[complete] Server error', await res.text());
        else console.log('✅ Completion recorded.');
    } catch (err) {
        console.error('[complete] Network error:', err);
        // Reset so it can retry next recalc if server was temporarily unavailable
        completionFired = false;
        if (typeof sessionStorage !== 'undefined')
            sessionStorage.removeItem(SESSION_COMPLETE_KEY);
    }
}

function canAccessModule(idx) {
    if (idx === 0) return true;
    return moduleProgress[course.modules[idx - 1].id]?.complete;
}
function completedLessonsInModule(mod) {
    return (mod.lessons || []).filter(l => isLessonComplete(l.id)).length;
}

// ── sendLessonProgress — [FIX-2] gate on hasAccess ───────────────────────────
let reportedLessons = {};

async function sendLessonProgress(lesson, mod, extraPayload = {}) {
    // [FIX-2] Never send progress for users without course access.
    if (!hasAccess || !userId || !userEmail) return;
    if (lesson.type === 'video' && reportedLessons[lesson.id]) return;
    if (lesson.type === 'video') reportedLessons[lesson.id] = true;

    try {
        const params = new URLSearchParams({
            userEmail,
            userId,
            courseId,
            sectionId:        course.sectionId ?? '',
            subsectionId:     lesson.id,
            lessonTitle:      lesson.title,
            lessonType:       lesson.type,
            moduleId:         mod?.id         ?? '',
            moduleTitle:      mod?.title       ?? '',
            completedAt:      new Date().toISOString(),
            watchedSeconds:   String(lessonProgress[lesson.id]?.maxWatched ?? 0),
            durationSeconds:  String(lesson.durationSeconds ?? 0),
        });
        if (Object.keys(extraPayload).length > 0)
            params.append('extraPayload', JSON.stringify(extraPayload));

        const res = await fetch('?/report', {
            method:  'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body:    params.toString(),
        });
        if (!res.ok && lesson.type === 'video') reportedLessons[lesson.id] = false;
    } catch {
        if (lesson.type === 'video') reportedLessons[lesson.id] = false;
    }
}

// ── selectLesson ──────────────────────────────────────────────────────────────
function selectLesson(modIdx, lesIdx) {
    if (!canAccessModule(modIdx)) {
        showToast('Complete the previous module first', 'warning');
        return;
    }
    if (!canPlayLesson(modIdx, lesIdx)) {
        if (!authedUser)    { showToast('Login to unlock this lesson', 'warning'); return; }
        showToast('Get access to unlock this lesson', 'warning');
        return;
    }

    activeModuleIdx = modIdx;
    activeLessonIdx = lesIdx;
    quizOpen = quizResult = null;
    quizAnswers = {};
    questionAttempts = {};
    totalQuizAttempts = 0;
    isAdvancing = false;
    currentModule = course.modules[modIdx];
    currentLesson = currentModule.lessons[lesIdx];

    // [FIX-1] Restore maxReached from session + server, take the maximum.
    const stored     = loadMaxReached(currentLesson.id);
    const serverMax  = serverLessonMap[currentLesson.id]?.watchedSeconds ?? 0;
    maxReached = isLessonComplete(currentLesson.id)
        ? (currentLesson.durationSeconds ?? 0)
        : Math.max(stored, serverMax, lessonProgress[currentLesson.id]?.maxWatched || 0);

    lastPollTime     = maxReached;
    lastSkipWarnTime = 0;
    videoLoading     = true;
    stopYTPoll();

    if (currentLesson.type === 'assessment') {
        videoLoading = false;
        quizOpen     = true;
    } else if (isYouTube(currentLesson.videoUrl)) {
        setTimeout(startYTPoll, 2000);
    }
}

function startCourse() {
    if (!hasAccess) { selectLesson(0, 0); return; }
    for (let mi = 0; mi < (course.modules || []).length; mi++) {
        if (!canAccessModule(mi)) break;
        for (let li = 0; li < (course.modules[mi].lessons || []).length; li++) {
            if (!isLessonComplete(course.modules[mi].lessons[li].id)) {
                selectLesson(mi, li); return;
            }
        }
    }
    const last = (course.modules || []).length - 1;
    if (last >= 0) selectLesson(last, (course.modules[last].lessons || []).length - 1);
}

function autoAdvance() {
    const mod = course.modules[activeModuleIdx];
    if (activeLessonIdx < (mod.lessons || []).length - 1) {
        const nextLesIdx = activeLessonIdx + 1;
        if (canPlayLesson(activeModuleIdx, nextLesIdx))
            setTimeout(() => selectLesson(activeModuleIdx, nextLesIdx), 800);
        else
            showToast('Get access to continue', 'warning');
    } else {
        const nextModIdx = activeModuleIdx + 1;
        if (nextModIdx < (course.modules || []).length) {
            recalcProgress();
            if (canAccessModule(nextModIdx)) {
                showToast('Module complete! Starting next module…', 'success');
                setTimeout(() => selectLesson(nextModIdx, 0), 800);
            } else {
                showToast('Module complete!', 'success');
                recalcProgress();
            }
        } else {
            showToast('🎉 Course complete!', 'success');
            recalcProgress();
        }
    }
}

// ── Native video handlers [FIX-1] ─────────────────────────────────────────────
function onVideoReady() { videoLoading = false; }

function onSeeking(e) {
    if (!currentLesson || isLessonComplete(currentLesson.id)) return;
    const v       = e.target;
    const ceiling = maxReached + MAX_SEEK_DELTA;
    if (v.currentTime > ceiling) {
        v.currentTime = ceiling;
        const now = Date.now();
        if (now - lastSkipWarnTime > 3000) {
            showToast(`You can only skip up to ${MAX_SEEK_DELTA}s ahead`, 'info');
            lastSkipWarnTime = now;
        }
    }
}

function onTimeUpdate(e) {
    const v = e.target;
    if (!currentLesson) return;

    if (isLessonComplete(currentLesson.id)) {
        if (!lessonProgress[currentLesson.id])
            lessonProgress[currentLesson.id] = { maxWatched: currentLesson.durationSeconds ?? 0, complete: true };
        return;
    }

    const delta = v.currentTime - maxReached;
    if      (delta > 0 && delta <= MAX_NATIVE_DELTA)  maxReached = v.currentTime;
    else if (delta > MAX_NATIVE_DELTA) {
        if (v.currentTime <= maxReached + MAX_SEEK_DELTA) maxReached = v.currentTime;
        else v.currentTime = maxReached + MAX_SEEK_DELTA; // [FIX-1] enforce ceiling
    }

    saveMaxReached(currentLesson.id, maxReached); // [FIX-1] persist on every tick

    if (!lessonProgress[currentLesson.id])
        lessonProgress[currentLesson.id] = { maxWatched: 0, complete: false };
    lessonProgress[currentLesson.id].maxWatched = Math.floor(maxReached);
    lessonProgress = { ...lessonProgress };

    if (
        !isLessonComplete(currentLesson.id) &&
        currentLesson.durationSeconds &&
        maxReached >= 0.95 * currentLesson.durationSeconds
    ) {
        markLessonComplete(currentLesson, currentModule);
    }
}

async function onVideoEnded() {
    if (!currentLesson) return;
    if (
        maxReached >= 0.9 * (currentLesson.durationSeconds ?? 0) ||
        isLessonComplete(currentLesson.id)
    ) {
        lessonProgress[currentLesson.id] = { complete: true, maxWatched: currentLesson.durationSeconds };
        lessonProgress = { ...lessonProgress };
        recalcProgress();
        await sendLessonProgress(currentLesson, currentModule);
        if (destroyed || isAdvancing) return;
        isAdvancing = true;
        await tick();
        if (!destroyed) autoAdvance();
        isAdvancing = false;
    } else {
        showToast('Watch the full lesson to complete it', 'info');
    }
}

// ── Quiz ──────────────────────────────────────────────────────────────────────
function submitQuiz() {
    if (!currentLesson || currentLesson.type !== 'assessment') return;
    totalQuizAttempts++;
    const questions = currentLesson.questions || [];
    let correct = 0;
    questions.forEach((q, qi) => {
        if (!questionAttempts[qi]) questionAttempts[qi] = { attempts: 0, correct: false };
        if (!questionAttempts[qi].correct) {
            questionAttempts[qi].attempts++;
            if (parseInt(quizAnswers[qi]) === q.answer) questionAttempts[qi].correct = true;
        }
        if (parseInt(quizAnswers[qi]) === q.answer) correct++;
    });
    const score  = Math.round((correct / questions.length) * 100);
    const passed = score >= 70;
    quizResult   = { score, passed, correct, total: questions.length };
    if (passed) {
        lessonProgress[currentLesson.id].complete = true;
        lessonProgress = { ...lessonProgress };
        recalcProgress();
        showToast('Assessment passed!', 'success');
        sendLessonProgress(currentLesson, currentModule, {
            assessmentScore:         score,
            assessmentPassed:        true,
            assessmentTotalAttempts: totalQuizAttempts,
            questionAnalytics: questions.map((q, qi) => ({
                questionIndex:    qi,
                question:         q.question,
                attemptsToCorrect: questionAttempts[qi]?.attempts ?? 1,
                correct:          questionAttempts[qi]?.correct ?? false,
            })),
        });
    } else {
        showToast(`${score}% — need 70% to pass`, 'error');
    }
}
function retryQuiz() { quizResult = null; quizAnswers = {}; }
async function continueAfterQuiz() { quizOpen = false; quizResult = null; await tick(); autoAdvance(); }

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
    clearTimeout(toastTimeout);
    toast = { msg, type };
    toastTimeout = setTimeout(() => (toast = null), 3500);
}

// ── Formatting ────────────────────────────────────────────────────────────────
function formatTime(sec) {
    if (!sec) return '0:00';
    return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
}

// ── [FIX-3] SVG circle math ───────────────────────────────────────────────────
const CIRCLE_R   = 14;                             // SVG circle radius
const CIRCLE_C   = +(2 * Math.PI * CIRCLE_R).toFixed(2); // ≈ 87.96
$: circleArc     = +((overallPct / 100) * CIRCLE_C).toFixed(2);
$: circleGap     = +(CIRCLE_C - circleArc).toFixed(2);

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMount(() => {
    if (!course) { goto('/course'); return; }

    // [FIX-2] Resolve access from sessionStorage first, fall back to server value
    hasAccess = resolveAccess();

    // [FIX-5] Check if completion email was already fired this session
    completionFired = typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem(SESSION_COMPLETE_KEY) === 'true'
        : false;

    // Also honour server-side completedAt (cross-session dedup)
    if (data?.userProgress?.completedAt) completionFired = true;

    initProgress();
    window.addEventListener('message', handleYTMessage);
});

onDestroy(() => {
    destroyed = true;
    stopYTPoll();
    clearTimeout(toastTimeout);
    if (typeof window !== 'undefined') window.removeEventListener('message', handleYTMessage);
});
</script>

<svelte:head>
    <title>{course?.title ?? 'Course'} — SkillsBlock</title>
</svelte:head>

{#if course}
<!-- ╔══════════════════════════════════════════════════════════════════════════╗
     ║  ROOT SHELL                                                            ║
     ╚══════════════════════════════════════════════════════════════════════════╝ -->
<div class="shell">

    <!-- ══ TOP BAR ══════════════════════════════════════════════════════════════ -->
    <header class="topbar">
        <button class="topbar-back" on:click={() => goto('/course')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            <span>Courses</span>
        </button>

        <div class="topbar-divider"></div>
        <span class="topbar-title">{course.title}</span>

        <div class="topbar-right">
            {#if !hasAccess}
                <span class="badge-preview">Preview</span>
            {/if}

            {#if hasAccess}
                <!-- [FIX-3] Progress pill with correct percentage -->
                <div class="progress-pill">
                    <div class="progress-pill-track">
                        <div class="progress-pill-fill" style="width:{overallPct}%"></div>
                    </div>
                    <span class="progress-pill-label">{overallPct}%</span>
                </div>
            {/if}

            <button class="topbar-icon-btn" on:click={() => (sidebarOpen = !sidebarOpen)} aria-label="Toggle sidebar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="14" y2="18"/>
                </svg>
            </button>
        </div>
    </header>

    <!-- ══ BODY ═════════════════════════════════════════════════════════════════ -->
    <div class="body">

        <!-- ── MAIN ──────────────────────────────────────────────────────────── -->
        <main class="main">

            {#if !currentLesson && !quizOpen}
            <!-- ════ LANDING ════════════════════════════════════════════════════ -->
            <div class="landing">

                <!-- Hero banner -->
                <div class="hero">
                    {#if course.image}
                        <img src={course.image} on:error={(e) => (e.target.src = '/skillsblock.png')} alt={course.title} class="hero-img"/>
                    {:else}
                        <div class="hero-placeholder"></div>
                    {/if}
                    <div class="hero-overlay">
                        {#if course.level}
                            <span class="badge-level">{course.level}</span>
                        {/if}
                        <h1 class="hero-title">{course.title}</h1>
                        <p class="hero-desc">{course.description ?? ''}</p>

                        <div class="hero-meta">
                            {#if course.instructor}
                                <span class="hero-meta-item">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                    {course.instructor}
                                </span>
                            {/if}
                            <span class="hero-meta-item">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                                {course.totalLessons ?? 0} lessons
                            </span>
                            {#if course.price}
                                <span class="hero-meta-price">₹{course.price}</span>
                            {/if}
                        </div>

                        <button class="btn-primary" on:click={startCourse}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                            {#if !hasAccess}Watch Free Preview
                            {:else}{overallPct > 0 ? 'Continue Learning' : 'Start Course'}{/if}
                        </button>

                        {#if !hasAccess}
                            <div class="access-banner">
                                <div class="access-banner-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                </div>
                                <div class="access-banner-text">
                                    <strong>Preview mode</strong>
                                    <span>Unlock all {course.totalLessons ?? ''} lessons &amp; your certificate</span>
                                </div>
                                {#if !authedUser}
                                    <a href="/login" class="btn-amber">Login to Proceed</a>
                                {:else if alreadyInterested}
                                    <button class="btn-requested" disabled>✓ Request sent</button>
                                {:else}
                                    <button class="btn-interest" on:click={openInterestModal}>Interested in this course</button>
                                {/if}
                            </div>
                        {/if}
                    </div>
                </div>

                <!-- Stats row -->
                <div class="stats-row">
                    <div class="stat-card">
                        {#if course.instructorAvatar}
                            <img src={course.instructorAvatar} alt={course.instructor} class="stat-avatar"/>
                        {:else}
                            <div class="stat-avatar-placeholder">{(course.instructor ?? '?')[0]}</div>
                        {/if}
                        <div>
                            <p class="stat-label">Instructor</p>
                            <p class="stat-value">{course.instructor ?? '—'}</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">{(course.modules || []).length}</div>
                        <div>
                            <p class="stat-label">Modules</p>
                            <p class="stat-sub">{course.totalLessons} lessons total</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-cert-icon">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>
                        </div>
                        <div>
                            <p class="stat-label">On completion</p>
                            <p class="stat-value">Certificate</p>
                        </div>
                    </div>
                    {#if hasAccess && overallPct > 0}
                        <div class="stat-card stat-card--progress">
                            <!-- [FIX-3] Correctly computed SVG arc -->
                            <svg class="stat-circle" viewBox="0 0 36 36" width="48" height="48">
                                <circle cx="18" cy="18" r="{CIRCLE_R}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="3"/>
                                <circle cx="18" cy="18" r="{CIRCLE_R}" fill="none" stroke="#7c3aed" stroke-width="3"
                                    stroke-dasharray="{circleArc} {circleGap}"
                                    stroke-dashoffset="{CIRCLE_C * 0.25}"
                                    stroke-linecap="round"
                                    style="transition: stroke-dasharray 0.6s ease;"/>
                            </svg>
                            <div>
                                <p class="stat-label">Your progress</p>
                                <p class="stat-value">{overallPct}% done</p>
                            </div>
                        </div>
                    {/if}
                </div>

                <!-- [FIX-4] Completion banner -->
                {#if courseComplete}
                    <div class="completion-banner">
                        <div class="completion-banner-icon">🎓</div>
                        <div>
                            <strong>Course Complete!</strong>
                            <span>You've completed all modules. Your certificate is ready.</span>
                        </div>
                        <button class="btn-cert">Download Certificate</button>
                    </div>
                {/if}

                <!-- Curriculum -->
                <div class="curriculum">
                    <h2 class="section-eyebrow">Curriculum</h2>
                    <div class="module-list">
                        {#each course.modules || [] as mod, mi}
                            {@const accessible = canAccessModule(mi)}
                            {@const modProg    = moduleProgress[mod.id]}
                            <div class="module-card {accessible ? '' : 'module-card--locked'}">
                                <div class="module-header">
                                    <div class="module-num
                                        {modProg?.complete ? 'module-num--done' : accessible ? 'module-num--active' : 'module-num--locked'}">
                                        {#if modProg?.complete}
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                                        {:else if !accessible}
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                        {:else}{mi + 1}{/if}
                                    </div>
                                    <div class="module-header-text">
                                        <p class="module-title">{mod.title}</p>
                                        <p class="module-sub">{completedLessonsInModule(mod)}/{(mod.lessons || []).length} complete</p>
                                    </div>
                                    {#if !accessible}<span class="badge-locked">Locked</span>{/if}
                                </div>

                                <div class="lesson-list">
                                    {#each mod.lessons || [] as les, li}
                                        {@const isPlayable = canPlayLesson(mi, li)}
                                        {@const done       = isLessonComplete(les.id)}
                                        <div class="lesson-row {accessible && isPlayable ? '' : 'lesson-row--dim'}">
                                            <div class="lesson-icon
                                                {done ? 'lesson-icon--done' : les.type === 'assessment' ? 'lesson-icon--quiz' : 'lesson-icon--play'}">
                                                {#if done}
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                                                {:else if les.type === 'assessment'}
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                                                {:else}
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                                                {/if}
                                            </div>
                                            <span class="lesson-label {done ? 'lesson-label--done' : ''}">{les.title}</span>
                                            <span class="lesson-meta">
                                                {#if done}Done
                                                {:else if !isPlayable}
                                                    {#if !authedUser}<a href="/login" class="link-amber">Login</a>
                                                    {:else if alreadyInterested}<span class="text-emerald">✓ Requested</span>
                                                    {:else}<button class="link-violet" on:click={openInterestModal}>Interested</button>{/if}
                                                {:else if les.type === 'assessment'}{les.questions?.length ?? 0} Qs
                                                {:else if les.durationSeconds}{formatTime(les.durationSeconds)}{/if}
                                            </span>
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            </div><!-- /landing -->

            {:else if quizOpen && currentLesson?.type === 'assessment'}
            <!-- ════ ASSESSMENT ══════════════════════════════════════════════════ -->
            {@const questions = currentLesson.questions || []}
            <div class="quiz-wrap">
                <div class="quiz-header">
                    <button class="btn-icon" on:click={() => { quizOpen = false; quizResult = null; }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
                    </button>
                    <div>
                        <h2 class="quiz-title">{currentLesson.title}</h2>
                        <p class="quiz-sub">
                            {currentModule?.title} · {questions.length} question{questions.length !== 1 ? 's' : ''} · Pass 70%
                            {#if totalQuizAttempts > 0}
                                <span class="badge-attempt">Attempt #{totalQuizAttempts + 1}</span>
                            {/if}
                        </p>
                    </div>
                </div>

                {#if quizResult}
                    <div class="quiz-result {quizResult.passed ? 'quiz-result--pass' : 'quiz-result--fail'}">
                        <div class="quiz-score {quizResult.passed ? 'quiz-score--pass' : 'quiz-score--fail'}">{quizResult.score}<span>%</span></div>
                        <p class="quiz-verdict">{quizResult.passed ? 'Passed 🎉' : 'Not passed'}</p>
                        <p class="quiz-tally">{quizResult.correct} of {quizResult.total} correct</p>
                        {#if !quizResult.passed}
                            <button class="btn-secondary" on:click={retryQuiz}>Try again</button>
                        {:else}
                            <button class="btn-primary" on:click={continueAfterQuiz}>Continue →</button>
                        {/if}
                    </div>
                {:else}
                    <div class="question-list">
                        {#each questions as q, qi}
                            <div class="question-card">
                                <p class="question-text">
                                    <span class="question-num">{qi + 1}</span>
                                    {q.question}
                                </p>
                                <div class="option-list">
                                    {#each q.options as opt, oi}
                                        <label class="option {parseInt(quizAnswers[qi]) === oi ? 'option--selected' : ''}">
                                            <input type="radio" name="q_{qi}" value={oi} bind:group={quizAnswers[qi]} class="sr-only"/>
                                            <span class="option-dot {parseInt(quizAnswers[qi]) === oi ? 'option-dot--on' : ''}"></span>
                                            <span class="option-label">{opt}</span>
                                        </label>
                                    {/each}
                                </div>
                            </div>
                        {/each}
                        <button
                            class="btn-primary btn-full"
                            on:click={submitQuiz}
                            disabled={Object.keys(quizAnswers).length < questions.length}
                        >Submit Assessment</button>
                    </div>
                {/if}
            </div>

            {:else if currentLesson}
            <!-- ════ VIDEO LESSON ════════════════════════════════════════════════ -->
            <div class="player-wrap">

                <!-- Video area -->
                <div class="video-box" on:contextmenu|preventDefault={() => {}}>
                    {#if videoLoading}
                        <div class="video-spinner"><div class="spinner"></div></div>
                    {/if}

                    {#if isYouTube(currentLesson.videoUrl)}
                        <div class="yt-overlay"
                            on:contextmenu|preventDefault={() => {}}
                            on:mousedown={(e) => {
                                if (e.button === 0 || e.button === 1) {
                                    e.currentTarget.style.pointerEvents = 'none';
                                    setTimeout(() => { if (e.currentTarget) e.currentTarget.style.pointerEvents = 'all'; }, 100);
                                }
                            }}
                        ></div>
                        <iframe
                            bind:this={iframeEl}
                            src={getEmbedUrl(currentLesson.videoUrl)}
                            class="video-frame"
                            frameborder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowfullscreen
                            on:load={() => (videoLoading = false)}
                            title={currentLesson.title}
                        ></iframe>
                    {:else}
                        <video
                            bind:this={videoEl}
                            src={currentLesson.videoUrl}
                            class="video-native"
                            controls
                            controlsList="noplaybackrate nodownload"
                            disablePictureInPicture
                            on:loadedmetadata={onVideoReady}
                            on:seeking={onSeeking}
                            on:timeupdate={onTimeUpdate}
                            on:ended={onVideoEnded}
                            on:contextmenu|preventDefault={() => {}}
                        ></video>
                    {/if}

                    {#if isLessonComplete(currentLesson.id)}
                        <div class="badge-completed-overlay">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                            Completed
                        </div>
                    {/if}
                    {#if !hasAccess}
                        <div class="badge-preview-overlay">Free Preview</div>
                    {/if}
                </div>

                <!-- Lesson meta -->
                <div class="lesson-meta-bar">
                    <div class="lesson-meta-top">
                        <div class="lesson-meta-info">
                            <p class="lesson-breadcrumb">
                                {currentModule?.title} / Lesson {activeLessonIdx + 1} of {(currentModule?.lessons || []).length}
                            </p>
                            <h2 class="lesson-title">{currentLesson.title}</h2>
                            <p class="lesson-timing">
                                {#if currentLesson.durationSeconds}Duration: {formatTime(currentLesson.durationSeconds)}{/if}
                                {#if lessonProgress[currentLesson.id]?.maxWatched > 0} · Watched: {formatTime(lessonProgress[currentLesson.id].maxWatched)}{/if}
                            </p>
                        </div>
                        {#if hasAccess && activeLessonIdx < (currentModule?.lessons || []).length - 1}
                            <button class="btn-next" on:click={() => selectLesson(activeModuleIdx, activeLessonIdx + 1)}>
                                Next
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                            </button>
                        {/if}
                    </div>

                    {#if currentLesson.durationSeconds && !isLessonComplete(currentLesson.id)}
                        <div class="watch-progress">
                            <div class="watch-bar">
                                <div class="watch-fill" style="width:{Math.min(100, ((lessonProgress[currentLesson.id]?.maxWatched ?? 0) / currentLesson.durationSeconds) * 100)}%"></div>
                            </div>
                            <span class="watch-pct">{Math.round(((lessonProgress[currentLesson.id]?.maxWatched ?? 0) / currentLesson.durationSeconds) * 100)}%</span>
                        </div>
                        <p class="seek-hint">Seek ±{MAX_SEEK_DELTA}s — full watch unlocks free seek</p>
                    {:else if isLessonComplete(currentLesson.id)}
                        <p class="seek-hint seek-hint--done">✓ Completed — seek freely anywhere</p>
                    {/if}
                </div>

                {#if !hasAccess}
                    <div class="upsell-bar">
                        <div class="upsell-icon">
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                        </div>
                        <div class="upsell-text">
                            <strong>Enjoying the preview?</strong>
                            <span>Get all {course.totalLessons ?? ''} lessons + certificate</span>
                        </div>
                        {#if !authedUser}
                            <a href="/login" class="btn-amber">Login to Proceed</a>
                        {:else if alreadyInterested}
                            <button class="btn-requested" disabled>✓ Request sent</button>
                        {:else}
                            <button class="btn-interest" on:click={openInterestModal}>Interested in this course</button>
                        {/if}
                    </div>
                {/if}
            </div>
            {/if}

        </main><!-- /main -->

        <!-- ── SIDEBAR ──────────────────────────────────────────────────────────── -->
        {#if sidebarOpen}
        <aside class="sidebar">
            <div class="sidebar-header">
                <div>
                    <p class="sidebar-heading">Course content</p>
                    <p class="sidebar-sub">{(course.modules || []).length} modules · {course.totalLessons ?? 0} lessons</p>
                </div>

                {#if hasAccess}
                    <!-- [FIX-3] Correct SVG circle in sidebar -->
                    <div class="sidebar-circle">
                        <svg viewBox="0 0 36 36" width="40" height="40">
                            <circle cx="18" cy="18" r="{CIRCLE_R}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="3"/>
                            <circle cx="18" cy="18" r="{CIRCLE_R}" fill="none"
                                stroke={overallPct === 100 ? '#10b981' : '#7c3aed'}
                                stroke-width="3"
                                stroke-dasharray="{circleArc} {circleGap}"
                                stroke-dashoffset="{CIRCLE_C * 0.25}"
                                stroke-linecap="round"
                                style="transition: stroke-dasharray 0.6s ease, stroke 0.4s ease;"/>
                        </svg>
                        <span class="sidebar-circle-label" style="color:{overallPct === 100 ? '#10b981' : '#7c3aed'}">{overallPct}</span>
                    </div>
                {:else}
                    {#if !authedUser}
                        <a href="/login" class="btn-amber-sm">Login</a>
                    {:else if alreadyInterested}
                        <button class="btn-requested-sm" disabled>✓ Requested</button>
                    {:else}
                        <button class="btn-interest-sm" on:click={openInterestModal}>Interested</button>
                    {/if}
                {/if}
            </div>

            <div class="sidebar-scroll">
                {#each course.modules || [] as mod, mi}
                    {@const accessible    = canAccessModule(mi)}
                    {@const modProg       = moduleProgress[mod.id]}
                    {@const completedLes  = completedLessonsInModule(mod)}

                    <div class="sb-module {accessible ? '' : 'sb-module--locked'}">
                        <div class="sb-mod-header">
                            <div class="sb-mod-num
                                {modProg?.complete ? 'sb-mod-num--done' : accessible ? 'sb-mod-num--active' : 'sb-mod-num--locked'}">
                                {#if modProg?.complete}
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                                {:else if !accessible}
                                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                {:else}{mi + 1}{/if}
                            </div>
                            <div class="sb-mod-info">
                                <p class="sb-mod-title">{mod.title}</p>
                                <p class="sb-mod-sub">{completedLes}/{(mod.lessons || []).length}</p>
                            </div>
                        </div>

                        {#if accessible}
                            <div class="sb-lesson-list">
                                {#each mod.lessons || [] as les, li}
                                    {@const done     = isLessonComplete(les.id)}
                                    {@const isActive = activeModuleIdx === mi && activeLessonIdx === li}
                                    {@const isPlayable = canPlayLesson(mi, li)}

                                    {#if isPlayable}
                                        <button
                                            class="sb-lesson {isActive ? 'sb-lesson--active' : ''}"
                                            on:click={() => selectLesson(mi, li)}
                                        >
                                            <div class="sb-les-icon {done ? 'sb-les-icon--done' : les.type === 'assessment' ? 'sb-les-icon--quiz' : 'sb-les-icon--play'}">
                                                {#if done}
                                                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                                                {:else if les.type === 'assessment'}
                                                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                                                {:else}
                                                    <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                                                {/if}
                                            </div>
                                            <span class="sb-les-label {done ? 'sb-les-label--done' : isActive ? 'sb-les-label--active' : ''}">{les.title}</span>
                                            <span class="sb-les-meta">
                                                {#if isYouTube(les.videoUrl)}<span class="yt-badge">YT</span>
                                                {:else if done}✓
                                                {:else if les.type === 'assessment'}{les.questions?.length ?? 0}q
                                                {:else if les.durationSeconds}{formatTime(les.durationSeconds)}{/if}
                                            </span>
                                        </button>
                                    {:else}
                                        <div class="sb-lesson sb-lesson--locked">
                                            <div class="sb-les-icon sb-les-icon--play" style="opacity:.3">
                                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                            </div>
                                            <span class="sb-les-label" style="opacity:.35">{les.title}</span>
                                            {#if !authedUser}
                                                <a href="/login" class="link-amber">Login</a>
                                            {:else if alreadyInterested}
                                                <span class="text-emerald" style="font-size:10px">✓</span>
                                            {:else}
                                                <button class="link-violet" style="font-size:10px" on:click|stopPropagation={openInterestModal}>Interested</button>
                                            {/if}
                                        </div>
                                    {/if}
                                {/each}
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        </aside>
        {/if}

    </div><!-- /body -->
</div><!-- /shell -->

<!-- ══ INTEREST MODAL ══════════════════════════════════════════════════════════ -->
{#if interestModalOpen}
    <div class="modal-backdrop" on:click={() => !interestLoading && (interestModalOpen = false)}>
        <div class="modal" on:click|stopPropagation>
            {#if !interestDone}
                <div class="modal-emoji">🎓</div>
                <h2 class="modal-title">Interested in this course?</h2>
                <p class="modal-body">
                    <strong>{course?.title}</strong><br/>
                    {#if course?.price}<span class="modal-price">₹{course.price}</span>{/if}
                </p>
                <p class="modal-hint">We'll note your interest and get back to you. Continue?</p>
                <div class="modal-actions">
                    <button class="btn-secondary" on:click={() => (interestModalOpen = false)} disabled={interestLoading}>No, cancel</button>
                    <button class="btn-primary" on:click={confirmInterest} disabled={interestLoading}>
                        {#if interestLoading}<div class="spinner spinner--sm"></div> Saving…{:else}Yes, I'm interested!{/if}
                    </button>
                </div>
            {:else}
                <div class="modal-emoji">✅</div>
                <h2 class="modal-title">You're on the list!</h2>
                <p class="modal-body">We've recorded your interest in <strong>{course?.title}</strong>. We'll reach out soon.</p>
                <button class="btn-primary" on:click={() => (interestModalOpen = false)}>Close</button>
            {/if}
        </div>
    </div>
{/if}

<!-- ══ TOAST ═══════════════════════════════════════════════════════════════════ -->
{#if toast}
    <div class="toast toast--{toast.type}">{toast.msg}</div>
{/if}

{/if}<!-- /if course -->

<!-- ══════════════════════════════════════════════════════════════════════════════
     STYLES — [FIX-4] Full redesign
     All scoped to this component via CSS custom properties & BEM-lite naming.
══════════════════════════════════════════════════════════════════════════════ -->
<style>
/* ── Tokens ──────────────────────────────────────────────────────────────── */
:global(:root) {
    --bg0: #0c0c10;
    --bg1: #101014;
    --bg2: #16161c;
    --bg3: #1c1c24;
    --border: rgba(255,255,255,0.07);
    --border-md: rgba(255,255,255,0.11);
    --text-primary: #f0eeff;
    --text-secondary: #b8b4cc;
    --text-muted: #6b6880;
    --text-dim: #3f3c50;
    --violet: #7c3aed;
    --violet-hover: #6d28d9;
    --violet-light: rgba(124,58,237,0.15);
    --emerald: #10b981;
    --emerald-light: rgba(16,185,129,0.12);
    --amber: #f59e0b;
    --amber-light: rgba(245,158,11,0.12);
    --red: #ef4444;
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 16px;
    --radius-xl: 20px;
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.4);
    --shadow-md: 0 4px 16px rgba(0,0,0,0.5);
    --shadow-lg: 0 12px 40px rgba(0,0,0,0.65);
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
}

/* ── Utilities ───────────────────────────────────────────────────────────── */
.sr-only { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0,0,0,0); }

/* ── Shell ───────────────────────────────────────────────────────────────── */
.shell {
    min-height: 100vh;
    background: var(--bg0);
    color: var(--text-primary);
    display: flex;
    flex-direction: column;
}

/* ── Top Bar ─────────────────────────────────────────────────────────────── */
.topbar {
    height: 52px;
    background: var(--bg1);
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    padding: 0 16px;
    gap: 10px;
    position: sticky;
    top: 0;
    z-index: 40;
}
.topbar-back {
    display: flex;
    align-items: center;
    gap: 6px;
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 13px;
    padding: 6px 10px;
    border-radius: var(--radius-sm);
    transition: background .15s, color .15s;
    white-space: nowrap;
}
.topbar-back:hover { background: rgba(255,255,255,0.05); color: var(--text-primary); }
.topbar-divider { width: 1px; height: 20px; background: rgba(255,255,255,0.09); }
.topbar-title { font-size: 13px; font-weight: 500; color: var(--text-secondary); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.topbar-right { display: flex; align-items: center; gap: 10px; margin-left: auto; }
.topbar-icon-btn {
    background: none; border: none; color: var(--text-muted); cursor: pointer;
    padding: 6px; border-radius: var(--radius-sm); transition: background .15s, color .15s;
    display: flex;
}
.topbar-icon-btn:hover { background: rgba(255,255,255,0.05); color: var(--text-primary); }

/* ── Badges ──────────────────────────────────────────────────────────────── */
.badge-preview {
    font-size: 10px; font-weight: 700; letter-spacing: .06em;
    padding: 3px 10px; border-radius: 99px;
    background: var(--amber-light); color: var(--amber); border: 1px solid rgba(245,158,11,.25);
}
.badge-locked {
    font-size: 10px; color: var(--text-muted);
    background: rgba(255,255,255,0.04); border: 1px solid var(--border);
    padding: 2px 8px; border-radius: 6px;
}
.badge-level {
    display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase;
    color: #a78bfa; background: rgba(167,139,250,.12); border: 1px solid rgba(167,139,250,.2);
    padding: 3px 10px; border-radius: 99px; margin-bottom: 12px;
}
.badge-attempt {
    display: inline-block; margin-left: 8px; font-size: 11px; color: var(--amber);
    background: var(--amber-light); padding: 1px 8px; border-radius: 99px;
}

/* ── Progress pill ───────────────────────────────────────────────────────── */
.progress-pill {
    display: flex; align-items: center; gap: 8px;
    background: rgba(255,255,255,0.04); border: 1px solid var(--border-md);
    border-radius: 99px; padding: 4px 10px 4px 6px;
}
.progress-pill-track { width: 64px; height: 3px; background: rgba(255,255,255,0.1); border-radius: 99px; overflow: hidden; }
.progress-pill-fill  { height: 100%; border-radius: 99px; background: linear-gradient(90deg,#7c3aed,#10b981); transition: width .5s ease; }
.progress-pill-label { font-size: 11px; font-weight: 700; color: var(--text-muted); }

/* ── Body / Main / Sidebar ───────────────────────────────────────────────── */
.body {
    display: flex;
    flex: 1;
    overflow: hidden;
    height: calc(100vh - 52px);
}
.main {
    flex: 1;
    overflow-y: auto;
    scroll-behavior: smooth;
    display: flex;
    flex-direction: column;
}

/* ── Landing ─────────────────────────────────────────────────────────────── */
.landing { display: flex; flex-direction: column; }

/* Hero */
.hero { position: relative; overflow: hidden; }
.hero-img { width: 100%; height: 280px; object-fit: cover; display: block; filter: brightness(.3) saturate(.6); }
.hero-placeholder { width: 100%; height: 280px; background: linear-gradient(135deg,#1a1a2e,#16213e,#0f3460); }
.hero-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(to top, var(--bg0) 0%, rgba(12,12,16,.55) 50%, transparent 100%);
    display: flex; flex-direction: column; justify-content: flex-end;
    padding: 36px 40px;
}
.hero-title { font-size: 28px; font-weight: 800; letter-spacing: -.02em; line-height: 1.2; color: var(--text-primary); margin: 0 0 8px; }
.hero-desc  { font-size: 14px; color: var(--text-muted); max-width: 580px; line-height: 1.65; margin: 0 0 14px; }
.hero-meta  { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 20px; }
.hero-meta-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-dim); }
.hero-meta-price { font-size: 13px; font-weight: 700; color: #a78bfa; }

/* Stats row */
.stats-row {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
    padding: 24px 40px 0;
}
.stat-card {
    background: rgba(255,255,255,0.025);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 16px 18px;
    display: flex;
    align-items: center;
    gap: 14px;
    transition: border-color .2s;
}
.stat-card:hover { border-color: var(--border-md); }
.stat-card--progress { gap: 10px; }
.stat-avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.stat-avatar-placeholder {
    width: 44px; height: 44px; border-radius: 50%; background: #3b0764;
    color: #c4b5fd; display: flex; align-items: center; justify-content: center;
    font-size: 16px; font-weight: 700; flex-shrink: 0;
}
.stat-number { font-size: 32px; font-weight: 800; color: #a78bfa; line-height: 1; }
.stat-label  { font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--text-dim); margin-bottom: 2px; }
.stat-value  { font-size: 14px; font-weight: 500; color: #d1d5db; }
.stat-sub    { font-size: 11px; color: var(--text-muted); }
.stat-cert-icon { color: var(--amber); }
.stat-circle { display: block; }

/* Completion banner */
.completion-banner {
    display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
    margin: 20px 40px 0;
    background: linear-gradient(135deg, rgba(16,185,129,.1), rgba(16,185,129,.04));
    border: 1px solid rgba(16,185,129,.25);
    border-radius: var(--radius-lg);
    padding: 18px 22px;
}
.completion-banner-icon { font-size: 28px; }
.completion-banner strong { display: block; font-size: 15px; font-weight: 700; color: #6ee7b7; margin-bottom: 2px; }
.completion-banner span  { font-size: 12px; color: var(--text-muted); }
.btn-cert {
    margin-left: auto; padding: 8px 18px;
    background: rgba(16,185,129,.15); border: 1px solid rgba(16,185,129,.3);
    color: #6ee7b7; font-size: 12px; font-weight: 700; border-radius: var(--radius-sm);
    cursor: pointer; transition: background .2s; white-space: nowrap;
}
.btn-cert:hover { background: rgba(16,185,129,.25); }

/* Curriculum */
.curriculum { padding: 28px 40px 40px; }
.section-eyebrow {
    font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
    color: var(--text-dim); margin: 0 0 16px;
}
.module-list { display: flex; flex-direction: column; gap: 10px; }
.module-card {
    background: rgba(255,255,255,0.02);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    transition: border-color .2s;
}
.module-card:hover { border-color: var(--border-md); }
.module-card--locked { opacity: .55; }
.module-header {
    display: flex; align-items: center; gap: 12px;
    padding: 14px 18px; border-bottom: 1px solid var(--border);
}
.module-num {
    width: 28px; height: 28px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 700; flex-shrink: 0;
}
.module-num--done   { background: rgba(16,185,129,.15); color: #6ee7b7; }
.module-num--active { background: rgba(124,58,237,.2);  color: #c4b5fd; }
.module-num--locked { background: rgba(255,255,255,.05); color: var(--text-dim); }
.module-header-text { flex: 1; min-width: 0; }
.module-title { font-size: 13px; font-weight: 600; color: #e5e7eb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.module-sub   { font-size: 11px; color: var(--text-dim); margin-top: 2px; }
.lesson-list  { padding: 6px 0; }
.lesson-row {
    display: flex; align-items: center; gap: 10px;
    padding: 7px 18px;
}
.lesson-row--dim { opacity: .4; }
.lesson-icon {
    width: 20px; height: 20px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.lesson-icon--done { background: rgba(16,185,129,.12); color: #6ee7b7; }
.lesson-icon--quiz { background: rgba(124,58,237,.12); color: #c4b5fd; }
.lesson-icon--play { background: rgba(255,255,255,.06); color: var(--text-muted); }
.lesson-label      { flex: 1; font-size: 12px; color: #9ca3af; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lesson-label--done{ color: #6ee7b7; }
.lesson-meta       { font-size: 10px; color: var(--text-dim); flex-shrink: 0; }

/* Access / upsell banners */
.access-banner {
    display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
    background: rgba(245,158,11,.06); border: 1px solid rgba(245,158,11,.16);
    border-radius: var(--radius-lg); padding: 14px 16px; margin-top: 16px; max-width: 540px;
}
.access-banner-icon { color: var(--amber); opacity: .8; flex-shrink: 0; }
.access-banner-text { flex: 1; min-width: 0; }
.access-banner-text strong { display: block; font-size: 13px; color: #fcd34d; margin-bottom: 2px; }
.access-banner-text span   { font-size: 11px; color: var(--text-muted); }

/* Buttons */
.btn-primary {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 10px 22px; background: var(--violet); color: #fff;
    font-size: 14px; font-weight: 700; border: none; border-radius: var(--radius-md);
    cursor: pointer; transition: background .15s, transform .1s;
}
.btn-primary:hover   { background: var(--violet-hover); transform: translateY(-1px); }
.btn-primary:active  { transform: translateY(0); }
.btn-primary:disabled{ opacity: .35; cursor: not-allowed; transform: none; }
.btn-primary.btn-full{ width: 100%; justify-content: center; border-radius: var(--radius-lg); padding: 14px; }

.btn-secondary {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 9px 20px; background: rgba(255,255,255,.06); border: 1px solid var(--border-md);
    color: var(--text-secondary); font-size: 13px; font-weight: 600;
    border-radius: var(--radius-md); cursor: pointer; transition: background .15s;
}
.btn-secondary:hover   { background: rgba(255,255,255,.1); }
.btn-secondary:disabled{ opacity: .35; cursor: not-allowed; }

.btn-amber    { flex-shrink:0; padding:8px 16px; background:var(--amber); color:#000; font-size:12px; font-weight:700; border-radius:var(--radius-sm); border:none; cursor:pointer; transition:background .15s; white-space:nowrap; text-decoration:none; }
.btn-amber:hover { background:#fbbf24; }
.btn-amber-sm { padding:6px 12px; background:rgba(245,158,11,.12); border:1px solid rgba(245,158,11,.25); color:var(--amber); font-size:11px; font-weight:700; border-radius:var(--radius-sm); border-radius:var(--radius-sm); white-space:nowrap; text-decoration:none; }

.btn-interest    { flex-shrink:0; padding:8px 16px; background:var(--violet); color:#fff; font-size:12px; font-weight:700; border-radius:var(--radius-sm); border:none; cursor:pointer; transition:background .15s; white-space:nowrap; }
.btn-interest:hover { background:var(--violet-hover); }
.btn-interest-sm { padding:6px 12px; background:var(--violet); color:#fff; font-size:11px; font-weight:700; border-radius:var(--radius-sm); border:none; cursor:pointer; transition:background .15s; white-space:nowrap; }
.btn-interest-sm:hover { background:var(--violet-hover); }

.btn-requested    { flex-shrink:0; padding:8px 16px; background:rgba(16,185,129,.12); border:1px solid rgba(16,185,129,.25); color:#6ee7b7; font-size:12px; font-weight:600; border-radius:var(--radius-sm); cursor:default; white-space:nowrap; }
.btn-requested-sm { padding:6px 12px; background:rgba(16,185,129,.12); border:1px solid rgba(16,185,129,.25); color:#6ee7b7; font-size:11px; font-weight:600; border-radius:var(--radius-sm); cursor:default; white-space:nowrap; }

.btn-icon {
    background: rgba(255,255,255,.04); border: 1px solid var(--border);
    color: var(--text-muted); cursor: pointer; padding: 7px;
    border-radius: var(--radius-sm); display: flex; transition: background .15s, color .15s;
}
.btn-icon:hover { background: rgba(255,255,255,.09); color: var(--text-primary); }

.btn-next {
    display: flex; align-items: center; gap: 6px;
    padding: 8px 16px; background: rgba(255,255,255,.04); border: 1px solid var(--border-md);
    color: #d1d5db; font-size: 12px; font-weight: 600; border-radius: var(--radius-sm);
    cursor: pointer; transition: background .15s; white-space: nowrap; flex-shrink: 0;
}
.btn-next:hover { background: rgba(255,255,255,.08); }

/* Links */
.link-amber  { font-size:10px; color:var(--amber); font-weight:600; text-decoration:none; }
.link-amber:hover { text-decoration:underline; }
.link-violet { font-size:10px; color:#a78bfa; font-weight:600; background:none; border:none; cursor:pointer; padding:0; }
.link-violet:hover { text-decoration:underline; }
.text-emerald{ color:#6ee7b7; }

/* ── Video player ─────────────────────────────────────────────────────────── */
.player-wrap { display: flex; flex-direction: column; }
.video-box {
    position: relative; background: #000; width: 100%;
    aspect-ratio: 16/9; max-height: 62vh;
}
.video-spinner {
    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    background: #000; z-index: 10;
}
.spinner {
    width: 36px; height: 36px; border-radius: 50%;
    border: 3px solid rgba(124,58,237,.25); border-top-color: var(--violet);
    animation: spin .8s linear infinite;
}
.spinner--sm { width:14px; height:14px; border-width:2px; }
@keyframes spin { to { transform: rotate(360deg); } }

.yt-overlay {
    position: absolute; inset: 0; z-index: 20; background: transparent;
}
.video-frame  { width: 100%; height: 100%; display: block; }
.video-native { width: 100%; height: 100%; object-fit: contain; display: block; }

.badge-completed-overlay {
    position: absolute; top: 12px; right: 12px; z-index: 25;
    display: flex; align-items: center; gap: 6px;
    font-size: 11px; font-weight: 700;
    background: rgba(16,185,129,.85); color: #d1fae5;
    padding: 5px 12px; border-radius: 99px; backdrop-filter: blur(8px);
}
.badge-preview-overlay {
    position: absolute; top: 12px; left: 12px; z-index: 25;
    font-size: 11px; font-weight: 700;
    background: rgba(245,158,11,.88); color: #000;
    padding: 5px 12px; border-radius: 99px; backdrop-filter: blur(8px);
}

/* Lesson meta bar */
.lesson-meta-bar {
    padding: 18px 28px 16px;
    border-bottom: 1px solid var(--border);
}
.lesson-meta-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 12px; }
.lesson-meta-info { flex: 1; min-width: 0; }
.lesson-breadcrumb { font-size: 11px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--violet); margin: 0 0 6px; }
.lesson-title  { font-size: 20px; font-weight: 800; letter-spacing: -.01em; color: var(--text-primary); margin: 0 0 4px; }
.lesson-timing { font-size: 12px; color: var(--text-dim); margin: 0; }

.watch-progress { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.watch-bar  { flex: 1; height: 4px; background: rgba(255,255,255,.08); border-radius: 99px; overflow: hidden; }
.watch-fill { height: 100%; background: var(--violet); border-radius: 99px; transition: width .3s; }
.watch-pct  { font-size: 11px; font-weight: 700; color: var(--text-dim); flex-shrink: 0; min-width: 32px; }
.seek-hint  { font-size: 11px; color: var(--text-dim); margin: 0; }
.seek-hint--done { color: rgba(16,185,129,.6); }

/* Upsell */
.upsell-bar {
    display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
    margin: 16px 28px;
    background: rgba(245,158,11,.05); border: 1px solid rgba(245,158,11,.14);
    border-radius: var(--radius-lg); padding: 16px 18px;
}
.upsell-icon { color: var(--amber); flex-shrink: 0; }
.upsell-text { flex: 1; min-width: 140px; }
.upsell-text strong { display: block; font-size: 13px; color: #fcd34d; margin-bottom: 2px; }
.upsell-text span   { font-size: 11px; color: var(--text-muted); }

/* ── Assessment / Quiz ────────────────────────────────────────────────────── */
.quiz-wrap { padding: 32px 40px; max-width: 700px; width: 100%; }
.quiz-header { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 28px; }
.quiz-title  { font-size: 22px; font-weight: 800; letter-spacing: -.01em; color: var(--text-primary); margin: 0 0 4px; }
.quiz-sub    { font-size: 12px; color: var(--text-dim); margin: 0; }

.quiz-result {
    border-radius: var(--radius-xl); padding: 48px; text-align: center;
    border: 1px solid; margin-bottom: 8px;
}
.quiz-result--pass { background: rgba(16,185,129,.06); border-color: rgba(16,185,129,.2); }
.quiz-result--fail { background: rgba(239,68,68,.06);  border-color: rgba(239,68,68,.2); }
.quiz-score        { font-size: 72px; font-weight: 900; letter-spacing: -.04em; line-height: 1; }
.quiz-score span   { font-size: 32px; }
.quiz-score--pass  { color: #6ee7b7; }
.quiz-score--fail  { color: #fca5a5; }
.quiz-verdict      { font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 8px 0 4px; }
.quiz-tally        { font-size: 13px; color: var(--text-muted); margin: 0 0 20px; }

.question-list  { display: flex; flex-direction: column; gap: 14px; }
.question-card  {
    background: rgba(255,255,255,.025); border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: 20px;
}
.question-text  { font-size: 14px; color: #e5e7eb; line-height: 1.6; margin: 0 0 14px; display: flex; align-items: flex-start; gap: 10px; }
.question-num   {
    display: inline-flex; align-items: center; justify-content: center;
    width: 22px; height: 22px; background: #3b0764; color: #c4b5fd;
    font-size: 11px; font-weight: 700; border-radius: 50%; flex-shrink: 0; margin-top: 1px;
}
.option-list { display: flex; flex-direction: column; gap: 8px; }
.option {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 14px; border-radius: var(--radius-md); cursor: pointer;
    border: 1px solid var(--border); background: rgba(255,255,255,.03);
    transition: border-color .15s, background .15s;
}
.option:hover      { background: rgba(255,255,255,.06); border-color: var(--border-md); }
.option--selected  { background: rgba(124,58,237,.12); border-color: rgba(124,58,237,.4); }
.option-dot        { width: 16px; height: 16px; border-radius: 50%; border: 2px solid rgba(255,255,255,.2); flex-shrink: 0; transition: border-color .15s, background .15s; }
.option-dot--on    { border-color: var(--violet); background: var(--violet); }
.option-label      { font-size: 13px; color: #d1d5db; }

/* ── Sidebar ──────────────────────────────────────────────────────────────── */
.sidebar {
    width: 288px; flex-shrink: 0;
    background: var(--bg1); border-left: 1px solid var(--border);
    display: flex; flex-direction: column; overflow: hidden;
}
.sidebar-header {
    padding: 14px 16px; border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
}
.sidebar-heading { font-size: 12px; font-weight: 700; color: #e5e7eb; letter-spacing: .02em; margin: 0 0 2px; }
.sidebar-sub     { font-size: 11px; color: var(--text-dim); margin: 0; }

/* [FIX-3] Sidebar circle — positioned correctly */
.sidebar-circle { position: relative; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.sidebar-circle-label {
    position: absolute; font-size: 9px; font-weight: 800;
}

.sidebar-scroll {
    flex: 1; overflow-y: auto; padding: 8px 0;
}
.sidebar-scroll::-webkit-scrollbar       { width: 4px; }
.sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
.sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.07); border-radius: 99px; }

.sb-module        { border-bottom: 1px solid rgba(255,255,255,.04); }
.sb-module--locked{ opacity: .45; }
.sb-mod-header    { display: flex; align-items: center; gap: 10px; padding: 10px 14px; }
.sb-mod-num {
    width: 22px; height: 22px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; font-weight: 700; flex-shrink: 0;
}
.sb-mod-num--done   { background: rgba(16,185,129,.12); color: #6ee7b7; }
.sb-mod-num--active { background: rgba(124,58,237,.18); color: #c4b5fd; }
.sb-mod-num--locked { background: rgba(255,255,255,.04); color: var(--text-dim); }
.sb-mod-info  { flex: 1; min-width: 0; }
.sb-mod-title { font-size: 12px; font-weight: 600; color: #d1d5db; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0 0 1px; }
.sb-mod-sub   { font-size: 10px; color: var(--text-dim); margin: 0; }

.sb-lesson-list{ padding: 4px 0 8px; }
.sb-lesson {
    width: 100%; display: flex; align-items: center; gap: 9px;
    padding: 7px 14px 7px 20px;
    background: none; border: none; border-left: 2px solid transparent;
    text-align: left; cursor: pointer;
    transition: background .12s, border-color .12s;
}
.sb-lesson:hover:not(.sb-lesson--active):not(.sb-lesson--locked) {
    background: rgba(255,255,255,.03); border-left-color: rgba(255,255,255,.1);
}
.sb-lesson--active { background: rgba(124,58,237,.1); border-left-color: var(--violet); }
.sb-lesson--locked { cursor: default; }

.sb-les-icon {
    width: 18px; height: 18px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.sb-les-icon--done { background: rgba(16,185,129,.1);  color: #6ee7b7; }
.sb-les-icon--quiz { background: rgba(124,58,237,.1);  color: #c4b5fd; }
.sb-les-icon--play { background: rgba(255,255,255,.05); color: var(--text-muted); }

.sb-les-label        { flex: 1; font-size: 11.5px; color: #9ca3af; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sb-les-label--done  { color: #6ee7b7; }
.sb-les-label--active{ color: #e5e7eb; }
.sb-les-meta         { font-size: 10px; color: var(--text-dim); flex-shrink: 0; }
.yt-badge            { font-size: 9px; font-weight: 900; color: #f87171; letter-spacing: .04em; }

/* ── Modal ────────────────────────────────────────────────────────────────── */
.modal-backdrop {
    position: fixed; inset: 0; background: rgba(0,0,0,.75); backdrop-filter: blur(12px);
    z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px;
}
.modal {
    background: var(--bg2); border: 1px solid var(--border-md);
    border-radius: var(--radius-xl); padding: 40px 36px;
    max-width: 420px; width: 100%; text-align: center;
    box-shadow: var(--shadow-lg);
}
.modal-emoji { font-size: 44px; margin-bottom: 14px; }
.modal-title { font-size: 21px; font-weight: 800; letter-spacing: -.02em; color: var(--text-primary); margin: 0 0 10px; }
.modal-body  { font-size: 14px; color: var(--text-muted); line-height: 1.6; margin: 0 0 8px; }
.modal-body strong { color: var(--text-primary); }
.modal-price { color: #a78bfa; font-weight: 700; }
.modal-hint  { font-size: 12px; color: var(--text-dim); margin: 0 0 24px; }
.modal-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }

/* ── Toast ────────────────────────────────────────────────────────────────── */
.toast {
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    z-index: 100; padding: 11px 20px; border-radius: var(--radius-md);
    font-size: 13px; font-weight: 600; color: #fff;
    backdrop-filter: blur(12px); white-space: nowrap;
    box-shadow: 0 8px 24px rgba(0,0,0,.45); pointer-events: none;
    border: 1px solid;
    animation: toastIn .2s ease;
}
.toast--success { background: rgba(16,185,129,.85);  border-color: rgba(16,185,129,.3); }
.toast--error   { background: rgba(185,28,28,.88);   border-color: rgba(239,68,68,.3); }
.toast--warning { background: rgba(180,83,9,.88);    border-color: rgba(245,158,11,.3); }
.toast--info    { background: rgba(67,56,202,.88);   border-color: rgba(99,102,241,.3); }
@keyframes toastIn { from { opacity:0; transform:translateX(-50%) translateY(8px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }

/* ── Responsive ───────────────────────────────────────────────────────────── */
@media (max-width: 768px) {
    .hero-overlay { padding: 20px 20px 24px; }
    .hero-title   { font-size: 20px; }
    .stats-row    { padding: 16px 20px 0; grid-template-columns: 1fr 1fr; }
    .curriculum   { padding: 20px 20px 32px; }
    .quiz-wrap    { padding: 20px; }
    .lesson-meta-bar { padding: 14px 16px 12px; }
    .upsell-bar   { margin: 12px 16px; }
    .sidebar      { position: fixed; right: 0; top: 52px; bottom: 0; z-index: 50; box-shadow: var(--shadow-lg); }
    .hero-img, .hero-placeholder { height: 200px; }
}
@media (max-width: 480px) {
    .stats-row    { grid-template-columns: 1fr; }
    .topbar-title { display: none; }
}
</style>