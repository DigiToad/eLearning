<script>
    import { onMount, onDestroy, tick } from "svelte";
    import { goto } from "$app/navigation";

    export let data;
    const course = data?.course;
    const courseId = data?.courseId;

    const authedUser = data?.authedUser ?? null;
    const userEmail = authedUser?.email ?? "";
    const userId = authedUser?.id ?? "";

    const serverLessonMap = data?.userProgress?.lessonMap ?? {};

    const hasAccess = (data?.profile?.acessedcourse ?? []).includes(courseId);

    function canPlayLesson(modIdx, lesIdx) {
        if (hasAccess) return true;
        return modIdx === 0 && lesIdx === 0;
    }
    $: alreadyInterested =
        justSubmitted ||
        (data?.profile?.interestedcourse ?? []).some(
            (c) => c.courseId === courseId,
        );

    const MAX_SEEK_DELTA = 30;
    const MAX_NATIVE_DELTA = 1.5;

    let lastPollTime = 0;
    let lastSkipWarnTime = 0;

    let activeModuleIdx = 0;
    let activeLessonIdx = 0;
    let sidebarOpen = true;

    let lessonProgress = {};
    let moduleProgress = {};
    let overallPct = 0;
    let courseComplete = false;
    let certificateReady = false;

    let currentLesson = null;
    let currentModule = null;
    let videoLoading = false;
    let maxReached = 0;

    // FIX #6: track in-flight advance to prevent double-advance race condition
    let isAdvancing = false;

    let quizOpen = false;
    let quizAnswers = {};
    let quizResult = null;
    let questionAttempts = {};
    let totalQuizAttempts = 0;

    let toast = null;
    let toastTimeout;

    let iframeEl;
    let videoEl; // FIX #1: ref for native video element
    let ytPollInterval;
    let destroyed = false;

    // ── Interest modal ──────────────────────────────────────────────────────
    let interestModalOpen = false;
    let interestLoading = false;
    let interestDone = false;
    let justSubmitted = false;

    function openInterestModal() {
        interestModalOpen = true;
        interestDone = false;
    }

    async function confirmInterest() {
        interestLoading = true;
        try {
            const params = new URLSearchParams({
                courseId: courseId ?? "",
                courseName: course?.title ?? "",
                coursePrice: String(course?.price ?? ""),
                userEmail,
                userId,
            });
            const res = await fetch("?/interested", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: params.toString(),
            });

            if (!res.ok) {
                let errMsg = "Something went wrong. Please try again.";
                try {
                    const json = await res.json();
                    if (Array.isArray(json?.data)) {
                        const msg = json.data.find((d) => typeof d === "string");
                        if (msg) errMsg = msg;
                    } else if (json?.error) {
                        errMsg = json.error;
                    }
                } catch {}
                interestLoading = false;
                interestModalOpen = false;
                showToast(errMsg, "error");
                return;
            }

            interestLoading = false;
            interestDone = true;
            justSubmitted = true;
        } catch (err) {
            interestLoading = false;
            interestModalOpen = false;
            showToast("Network error. Please try again.", "error");
        }
    }
    // ────────────────────────────────────────────────────────────────────────

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
        return !!url && (url.includes("youtube.com") || url.includes("youtu.be"));
    }
    function getEmbedUrl(url) {
        const id = getYouTubeId(url);
        if (!id) return url;
        const origin =
            typeof window !== "undefined"
                ? encodeURIComponent(window.location.origin)
                : "";
        return `https://www.youtube.com/embed/${id}?enablejsapi=1&rel=0&modestbranding=1&origin=${origin}`;
    }

    function startYTPoll() {
        clearInterval(ytPollInterval);
        if (!iframeEl) return;
        ytPollInterval = setInterval(() => {
            try {
                iframeEl?.contentWindow?.postMessage(
                    JSON.stringify({ event: "listening" }),
                    "*",
                );
                iframeEl?.contentWindow?.postMessage(
                    JSON.stringify({
                        event: "command",
                        func: "getCurrentTime",
                        args: [],
                    }),
                    "*",
                );
            } catch {}
        }, 1000);
    }
    function stopYTPoll() {
        clearInterval(ytPollInterval);
    }

    function isLessonComplete(lessonId) {
        return !!(lessonProgress[lessonId]?.complete || serverLessonMap[lessonId]);
    }

    async function handleYTMessage(e) {
        if (destroyed) return;
        try {
            const d = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
            if (
                d?.event !== "infoDelivery" ||
                d?.info?.currentTime === undefined ||
                !currentLesson
            )
                return;

            const lesson = currentLesson;
            const mod = currentModule;
            const lesId = lesson.id;
            const ct = d.info.currentTime;

            if (!isLessonComplete(lesId) && ct > maxReached + MAX_SEEK_DELTA) {
                const allowed = maxReached + MAX_SEEK_DELTA;
                try {
                    iframeEl?.contentWindow?.postMessage(
                        JSON.stringify({
                            event: "command",
                            func: "seekTo",
                            args: [allowed, true],
                        }),
                        "*",
                    );
                } catch {}
                lastPollTime = allowed;
                const now = Date.now();
                if (now - lastSkipWarnTime > 3000) {
                    showToast(`You can only skip up to ${MAX_SEEK_DELTA}s ahead`, "info");
                    lastSkipWarnTime = now;
                }
                return;
            }

            lastPollTime = ct;
            if (ct > maxReached) maxReached = ct;

            if (!lessonProgress[lesId])
                lessonProgress[lesId] = { maxWatched: 0, complete: false };
            lessonProgress[lesId].maxWatched = Math.floor(maxReached);
            lessonProgress = { ...lessonProgress };

            if (
                !isLessonComplete(lesId) &&
                lesson.durationSeconds &&
                maxReached >= 0.95 * lesson.durationSeconds
            ) {
                lessonProgress[lesId].complete = true;
                lessonProgress = { ...lessonProgress };
                recalcProgress();
                showToast("Lesson completed!", "success");
                await sendLessonProgress(lesson, mod);
                // FIX #6: guard against destroyed + double-advance
                if (destroyed || isAdvancing) return;
                isAdvancing = true;
                await tick();
                if (!destroyed) autoAdvance();
                isAdvancing = false;
            }
        } catch (err) {
            if (err?.message && !err.message.includes("JSON"))
                console.warn("[YTMessage]", err.message);
        }
    }

    function initProgress() {
        (course.modules || []).forEach((mod) => {
            if (!moduleProgress[mod.id])
                moduleProgress[mod.id] = { complete: false };
            (mod.lessons || []).forEach((les) => {
                const serverLesson = serverLessonMap[les.id];
                lessonProgress[les.id] = {
                    maxWatched: serverLesson?.watchedSeconds ?? 0,
                    complete: !!serverLesson,
                };
            });
        });
        recalcProgress();
    }

    function recalcProgress() {
        (course.modules || []).forEach((mod) => {
            moduleProgress[mod.id].complete = (mod.lessons || []).every((l) =>
                isLessonComplete(l.id),
            );
        });
        const total = (course.modules || []).length || 1;
        const done = (course.modules || []).filter(
            (m) => moduleProgress[m.id]?.complete,
        ).length;
        overallPct = Math.round((done / total) * 100);
        courseComplete = overallPct === 100;
        if (courseComplete) certificateReady = true;
        moduleProgress = { ...moduleProgress };
        lessonProgress = { ...lessonProgress };
    }

    function canAccessModule(idx) {
        if (idx === 0) return true;
        return moduleProgress[course.modules[idx - 1].id]?.complete;
    }

    function completedLessonsInModule(mod) {
        return (mod.lessons || []).filter((l) => isLessonComplete(l.id)).length;
    }

    let reportedLessons = {};

    async function sendLessonProgress(lesson, mod, extraPayload = {}) {
        if (!userId || !userEmail) return;
        if (lesson.type === "video" && reportedLessons[lesson.id]) return;
        if (lesson.type === "video") reportedLessons[lesson.id] = true;
        try {
            const params = new URLSearchParams({
                userEmail,
                userId,
                courseId,
                sectionId: course.sectionId ?? "",
                subsectionId: lesson.id,
                lessonTitle: lesson.title,
                lessonType: lesson.type,
                moduleId: mod?.id ?? "",
                moduleTitle: mod?.title ?? "",
                completedAt: new Date().toISOString(),
                watchedSeconds: String(lessonProgress[lesson.id]?.maxWatched ?? 0),
                durationSeconds: String(lesson.durationSeconds ?? 0),
            });
            if (Object.keys(extraPayload).length > 0)
                params.append("extraPayload", JSON.stringify(extraPayload));
            const res = await fetch("?/report", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: params.toString(),
            });
            if (!res.ok && lesson.type === "video")
                reportedLessons[lesson.id] = false;
        } catch {
            if (lesson.type === "video") reportedLessons[lesson.id] = false;
        }
    }

    function selectLesson(modIdx, lesIdx) {
        if (!canAccessModule(modIdx)) {
            showToast("Complete the previous module first", "warning");
            return;
        }
        if (!canPlayLesson(modIdx, lesIdx)) {
            if (!authedUser) {
                showToast("Login to unlock this lesson", "warning");
                return;
            }
            showToast("Get access to unlock this lesson", "warning");
            return;
        }

        activeModuleIdx = modIdx;
        activeLessonIdx = lesIdx;
        quizOpen = false;
        quizResult = null;
        quizAnswers = {};
        questionAttempts = {};
        totalQuizAttempts = 0;
        // FIX #6: reset advance guard when switching lessons
        isAdvancing = false;
        currentModule = course.modules[modIdx];
        currentLesson = currentModule.lessons[lesIdx];

        maxReached = isLessonComplete(currentLesson.id)
            ? (currentLesson.durationSeconds ?? 0)
            : lessonProgress[currentLesson.id]?.maxWatched || 0;
        lastPollTime = maxReached;
        lastSkipWarnTime = 0;
        videoLoading = true;
        stopYTPoll();

        if (currentLesson.type === "assessment") {
            videoLoading = false;
            quizOpen = true;
        } else if (isYouTube(currentLesson.videoUrl)) {
            setTimeout(startYTPoll, 2000);
        }
    }

    function startCourse() {
        if (!hasAccess) {
            selectLesson(0, 0);
            return;
        }
        for (let mi = 0; mi < (course.modules || []).length; mi++) {
            if (!canAccessModule(mi)) break;
            for (let li = 0; li < (course.modules[mi].lessons || []).length; li++) {
                if (!isLessonComplete(course.modules[mi].lessons[li].id)) {
                    selectLesson(mi, li);
                    return;
                }
            }
        }
        const last = (course.modules || []).length - 1;
        if (last >= 0)
            selectLesson(last, (course.modules[last].lessons || []).length - 1);
    }

    // FIX #4: auto-advance across module boundaries
    function autoAdvance() {
        const mod = course.modules[activeModuleIdx];
        if (activeLessonIdx < (mod.lessons || []).length - 1) {
            // Next lesson within same module
            const nextLesIdx = activeLessonIdx + 1;
            if (canPlayLesson(activeModuleIdx, nextLesIdx)) {
                setTimeout(() => selectLesson(activeModuleIdx, nextLesIdx), 800);
            } else {
                showToast("Get access to continue", "warning");
            }
        } else {
            // Last lesson in module — try to advance to next module
            const nextModIdx = activeModuleIdx + 1;
            if (nextModIdx < (course.modules || []).length) {
                recalcProgress(); // ensure module is marked complete before checking access
                if (canAccessModule(nextModIdx)) {
                    showToast("Module complete! Starting next module…", "success");
                    setTimeout(() => selectLesson(nextModIdx, 0), 800);
                } else {
                    showToast("Module complete!", "success");
                    recalcProgress();
                }
            } else {
                // Last lesson of last module — course done
                showToast("🎉 Course complete!", "success");
                recalcProgress();
            }
        }
    }

    function onVideoReady() {
        videoLoading = false;
    }

    // FIX #1 + #2: native video seek guard with context-menu prevention
    function onSeeking(e) {
        if (!currentLesson || isLessonComplete(currentLesson.id)) return;
        const v = e.target;
        const ceiling = maxReached + MAX_SEEK_DELTA;
        if (v.currentTime > ceiling) {
            v.currentTime = ceiling;
            const now = Date.now();
            if (now - lastSkipWarnTime > 3000) {
                showToast(`You can only skip up to ${MAX_SEEK_DELTA}s ahead`, "info");
                lastSkipWarnTime = now;
            }
        }
    }

    function onTimeUpdate(e) {
        const v = e.target;
        if (!currentLesson) return;
        if (isLessonComplete(currentLesson.id)) {
            if (!lessonProgress[currentLesson.id])
                lessonProgress[currentLesson.id] = {
                    maxWatched: currentLesson.durationSeconds ?? 0,
                    complete: true,
                };
            return;
        }
        const delta = v.currentTime - maxReached;
        if (delta > 0 && delta <= MAX_NATIVE_DELTA) maxReached = v.currentTime;
        else if (delta > MAX_NATIVE_DELTA) {
            if (v.currentTime <= maxReached + MAX_SEEK_DELTA)
                maxReached = v.currentTime;
            else v.currentTime = maxReached + MAX_SEEK_DELTA;
        }
        if (!lessonProgress[currentLesson.id])
            lessonProgress[currentLesson.id] = { maxWatched: 0, complete: false };
        lessonProgress[currentLesson.id].maxWatched = Math.floor(maxReached);
        lessonProgress = { ...lessonProgress };

        if (
            !isLessonComplete(currentLesson.id) &&
            currentLesson.durationSeconds &&
            maxReached >= 0.95 * currentLesson.durationSeconds
        ) {
            lessonProgress[currentLesson.id].complete = true;
            lessonProgress = { ...lessonProgress };
            recalcProgress();
            showToast("Lesson completed!", "success");
            sendLessonProgress(currentLesson, currentModule);
        }
    }

    async function onVideoEnded() {
        if (!currentLesson) return;
        if (
            maxReached >= 0.9 * (currentLesson.durationSeconds ?? 0) ||
            isLessonComplete(currentLesson.id)
        ) {
            lessonProgress[currentLesson.id] = {
                complete: true,
                maxWatched: currentLesson.durationSeconds,
            };
            lessonProgress = { ...lessonProgress };
            recalcProgress();
            await sendLessonProgress(currentLesson, currentModule);
            // FIX #6: guard against double-advance on ended
            if (destroyed || isAdvancing) return;
            isAdvancing = true;
            await tick();
            if (!destroyed) autoAdvance();
            isAdvancing = false;
        } else {
            showToast("Watch the full lesson to complete it", "info");
        }
    }

    function submitQuiz() {
        if (!currentLesson || currentLesson.type !== "assessment") return;
        totalQuizAttempts++;
        const questions = currentLesson.questions || [];
        let correct = 0;
        questions.forEach((q, qi) => {
            if (!questionAttempts[qi])
                questionAttempts[qi] = { attempts: 0, correct: false };
            if (!questionAttempts[qi].correct) {
                questionAttempts[qi].attempts++;
                if (parseInt(quizAnswers[qi]) === q.answer)
                    questionAttempts[qi].correct = true;
            }
            if (parseInt(quizAnswers[qi]) === q.answer) correct++;
        });
        const score = Math.round((correct / questions.length) * 100);
        const passed = score >= 70;
        quizResult = { score, passed, correct, total: questions.length };

        if (passed) {
            lessonProgress[currentLesson.id].complete = true;
            lessonProgress = { ...lessonProgress };
            recalcProgress();
            showToast("Assessment passed!", "success");
            sendLessonProgress(currentLesson, currentModule, {
                assessmentScore: score,
                assessmentPassed: true,
                assessmentTotalAttempts: totalQuizAttempts,
                questionAnalytics: questions.map((q, qi) => ({
                    questionIndex: qi,
                    question: q.question,
                    attemptsToCorrect: questionAttempts[qi]?.attempts ?? 1,
                    correct: questionAttempts[qi]?.correct ?? false,
                })),
            });
        } else {
            showToast(`${score}% — need 70% to pass`, "error");
        }
    }

    function retryQuiz() {
        quizResult = null;
        quizAnswers = {};
    }
    async function continueAfterQuiz() {
        quizOpen = false;
        quizResult = null;
        await tick();
        autoAdvance();
    }

    function showToast(msg, type = "info") {
        clearTimeout(toastTimeout);
        toast = { msg, type };
        toastTimeout = setTimeout(() => (toast = null), 3500);
    }

    function formatTime(sec) {
        if (!sec) return "0:00";
        return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
    }

    onMount(() => {
        if (!course) {
            goto("/course");
            return;
        }
        initProgress();
        window.addEventListener("message", handleYTMessage);
    });
    onDestroy(() => {
        destroyed = true;
        stopYTPoll();
        clearTimeout(toastTimeout);
        if (typeof window !== "undefined")
            window.removeEventListener("message", handleYTMessage);
    });
</script>

<svelte:head>
    <title>{course?.title ?? "Course"} — SkillsBlock</title>
</svelte:head>

{#if course}
    <div
        class="min-h-screen bg-[#0d0d11] text-[#e8e6f0] flex flex-col"
        style="font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;"
    >
        <!-- ══ Top Bar ══════════════════════════════════════════════════════════ -->
        <header
            class="h-[52px] bg-[#101016] border-b border-white/[0.06] flex items-center px-4 gap-3 sticky top-0 z-40"
        >
            <button
                class="flex items-center gap-1.5 bg-transparent border-none text-[#888] cursor-pointer text-[13px] px-2.5 py-1.5 rounded-lg transition-all hover:bg-white/[0.06] hover:text-[#e8e6f0] whitespace-nowrap"
                on:click={() => goto("/course")}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
                <span>Back</span>
            </button>

            <div class="w-px h-5 bg-white/10"></div>

            <span class="text-[13px] font-medium text-[#d0cee0] flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{course.title}</span>

            {#if !hasAccess}
                <span class="text-[11px] font-semibold tracking-[0.04em] px-2.5 py-[3px] rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 whitespace-nowrap">Preview</span>
            {/if}

            {#if hasAccess}
                <div class="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-full py-1 pl-1.5 pr-2.5">
                    <div class="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                            class="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-violet-400 to-emerald-400"
                            style="width:{overallPct}%"
                        ></div>
                    </div>
                    <span class="text-[11px] font-semibold text-[#9ca3af]">{overallPct}%</span>
                </div>
            {/if}

            <button
                class="flex items-center justify-center bg-transparent border-none text-[#888] cursor-pointer p-1.5 rounded-lg transition-all hover:bg-white/[0.06] hover:text-[#e8e6f0]"
                on:click={() => (sidebarOpen = !sidebarOpen)}
                aria-label="Toggle sidebar"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="14" y2="18" />
                </svg>
            </button>
        </header>

        <!-- ══ Body ═════════════════════════════════════════════════════════════ -->
        <div class="flex flex-1 overflow-hidden" style="height: calc(100vh - 52px);">
            <!-- ── Main ─────────────────────────────────────────────────────── -->
            <main class="flex-1 overflow-y-auto flex flex-col scroll-smooth">
                {#if !currentLesson && !quizOpen}
                    <!-- LANDING -->
                    <div class="relative overflow-hidden">
                        {#if course.image}
                            <img
                                src={course.image}
                                on:error={(e) => (e.target.src = "/skillsblock.png")}
                                alt={course.title}
                                class="w-full h-[280px] object-cover block brightness-[0.35] saturate-[0.7]"
                            />
                        {:else}
                            <div class="w-full h-[280px] bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]"></div>
                        {/if}
                        <div class="absolute inset-0 bg-gradient-to-t from-[#0d0d11] via-[#0d0d11]/50 to-transparent flex flex-col justify-end px-10 py-8">
                            {#if course.level}
                                <span class="inline-block text-[10px] font-bold tracking-[0.12em] uppercase text-violet-400 bg-violet-400/12 border border-violet-400/20 px-2.5 py-[3px] rounded-full mb-3 w-fit">
                                    {course.level}
                                </span>
                            {/if}
                            <h1 class="text-[28px] font-bold tracking-[-0.02em] leading-[1.2] text-[#f0eeff] mb-2">{course.title}</h1>
                            <p class="text-sm text-[#9ca3af] max-w-[580px] leading-relaxed mb-3.5">{course.description ?? ""}</p>

                            <div class="flex flex-wrap gap-4 mb-5">
                                {#if course.instructor}
                                    <span class="flex items-center gap-1.5 text-xs text-[#6b7280]">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="opacity-60"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                        {course.instructor}
                                    </span>
                                {/if}
                                <span class="flex items-center gap-1.5 text-xs text-[#6b7280]">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="opacity-60"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
                                    {course.totalLessons ?? 0} lessons
                                </span>
                                {#if course.price}
                                    <span class="flex items-center gap-1.5 text-xs text-violet-400 font-semibold">₹{course.price}</span>
                                {/if}
                            </div>

                            <button
                                class="inline-flex items-center gap-2 px-6 py-3 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-semibold rounded-[10px] border-none cursor-pointer transition-all hover:-translate-y-px active:translate-y-0 w-fit mb-4"
                                on:click={startCourse}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                                {#if !hasAccess}Watch Free Preview
                                {:else}{overallPct > 0 ? "Continue Learning" : "Start Course"}{/if}
                            </button>

                            {#if !hasAccess}
                                <div class="flex items-center gap-3.5 bg-amber-500/7 border border-amber-500/18 rounded-xl px-4 py-3 max-w-[520px] flex-wrap">
                                    <div class="text-amber-500 opacity-80 flex-shrink-0">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                        </svg>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <strong class="block text-[13px] text-amber-300 mb-[2px]">Preview mode</strong>
                                        <span class="text-[11px] text-[#6b7280]">Unlock all {course.totalLessons ?? ""} lessons &amp; your certificate</span>
                                    </div>
                                    {#if !authedUser}
                                        <a href="/login" class="flex-shrink-0 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition-colors whitespace-nowrap no-underline">Login to Proceed</a>
                                    {:else if alreadyInterested}
                                        <!-- FIX #3: only one button, no duplication -->
                                        <button class="flex-shrink-0 px-4 py-2 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-lg cursor-default whitespace-nowrap" disabled>✓ Request sent</button>
                                    {:else}
                                        <button class="flex-shrink-0 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer border-none" on:click={openInterestModal}>Interested in this course</button>
                                    {/if}
                                </div>
                            {/if}
                        </div>
                    </div>

                    <!-- Stats row -->
                    <div class="grid gap-3 px-10 pt-7" style="grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));">
                        <div class="bg-white/[0.03] border border-white/[0.07] rounded-[14px] p-4 flex items-center gap-3.5">
                            {#if course.instructorAvatar}
                                <img src={course.instructorAvatar} alt={course.instructor} class="w-11 h-11 rounded-full object-cover flex-shrink-0" />
                            {:else}
                                <div class="w-11 h-11 rounded-full bg-[#3b0764] text-violet-300 flex items-center justify-center text-base font-bold flex-shrink-0">
                                    {(course.instructor ?? "?")[0]}
                                </div>
                            {/if}
                            <div>
                                <p class="text-[10px] font-semibold tracking-[0.08em] uppercase text-[#4b5563] mb-0.5">Instructor</p>
                                <p class="text-sm font-medium text-[#d1d5db]">{course.instructor ?? "—"}</p>
                            </div>
                        </div>
                        <div class="bg-white/[0.03] border border-white/[0.07] rounded-[14px] p-4 flex items-center gap-3.5">
                            <div class="text-[32px] font-bold text-violet-400 leading-none">{(course.modules || []).length}</div>
                            <div>
                                <p class="text-[10px] font-semibold tracking-[0.08em] uppercase text-[#4b5563] mb-0.5">Modules</p>
                                <p class="text-xs text-[#6b7280]">{course.totalLessons} lessons total</p>
                            </div>
                        </div>
                        <div class="bg-white/[0.03] border border-white/[0.07] rounded-[14px] p-4 flex items-center gap-3.5">
                            <div class="text-amber-500 flex">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
                                </svg>
                            </div>
                            <div>
                                <p class="text-[10px] font-semibold tracking-[0.08em] uppercase text-[#4b5563] mb-0.5">On completion</p>
                                <p class="text-sm font-medium text-[#d1d5db]">Certificate</p>
                            </div>
                        </div>
                    </div>

                    <!-- Curriculum -->
                    <div class="px-10 py-8 pb-10">
                        <h2 class="text-[11px] font-bold tracking-[0.1em] uppercase text-[#4b5563] mb-4">Curriculum</h2>
                        <div class="flex flex-col gap-2.5">
                            {#each course.modules || [] as mod, mi}
                                {@const accessible = canAccessModule(mi)}
                                {@const modProg = moduleProgress[mod.id]}
                                <div class="bg-white/[0.025] border border-white/[0.07] rounded-[14px] overflow-hidden {accessible ? '' : 'opacity-55'}">
                                    <div class="flex items-center gap-3 px-[18px] py-3.5 border-b border-white/[0.05]">
                                        <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                                            {modProg?.complete ? 'bg-emerald-900 text-emerald-300' : accessible ? 'bg-[#3b0764] text-violet-300' : 'bg-white/[0.06] text-[#4b5563]'}">
                                            {#if modProg?.complete}
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12" /></svg>
                                            {:else if !accessible}
                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                            {:else}
                                                {mi + 1}
                                            {/if}
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <p class="text-[13px] font-semibold text-[#e5e7eb] truncate">{mod.title}</p>
                                            <p class="text-[11px] text-[#4b5563] mt-0.5">{completedLessonsInModule(mod)}/{(mod.lessons || []).length} lessons complete</p>
                                        </div>
                                        {#if !accessible}
                                            <span class="text-[10px] text-[#6b7280] bg-white/[0.04] border border-white/[0.08] px-2 py-[2px] rounded-md">Locked</span>
                                        {/if}
                                    </div>
                                    <div class="py-1.5">
                                        {#each mod.lessons || [] as les, li}
                                            {@const isPlayable = canPlayLesson(mi, li)}
                                            {@const done = isLessonComplete(les.id)}
                                            <div class="flex items-center gap-2.5 px-[18px] py-[7px] {accessible && isPlayable ? '' : 'opacity-40'}">
                                                <div class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0
                                                    {done ? 'bg-emerald-500/15 text-emerald-400' : les.type === 'assessment' ? 'bg-violet-500/15 text-violet-400' : 'bg-white/[0.07] text-[#6b7280]'}">
                                                    {#if done}
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12" /></svg>
                                                    {:else if les.type === "assessment"}
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>
                                                    {:else}
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                                                    {/if}
                                                </div>
                                                <span class="flex-1 text-xs {done ? 'text-emerald-300' : 'text-[#9ca3af]'} overflow-hidden text-ellipsis whitespace-nowrap">{les.title}</span>
                                                <!-- FIX #3: clean single branch for locked lesson meta -->
                                                <span class="text-[10px] text-[#374151] flex-shrink-0">
                                                    {#if done}
                                                        Done
                                                    {:else if !isPlayable}
                                                        {#if !authedUser}
                                                            <a href="/login" class="text-amber-400 font-semibold no-underline hover:underline">Login</a>
                                                        {:else if alreadyInterested}
                                                            <span class="text-emerald-400 font-semibold">✓ Requested</span>
                                                        {:else}
                                                            <button class="text-violet-400 font-semibold bg-transparent border-none cursor-pointer p-0 text-[10px]" on:click={openInterestModal}>Interested</button>
                                                        {/if}
                                                    {:else if les.type === "assessment"}
                                                        {les.questions?.length ?? 0} Qs
                                                    {:else if les.durationSeconds}
                                                        {formatTime(les.durationSeconds)}
                                                    {/if}
                                                </span>
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>

                {:else if quizOpen && currentLesson?.type === "assessment"}
                    <!-- ASSESSMENT -->
                    {@const questions = currentLesson.questions || []}
                    <div class="px-10 py-8 max-w-[680px] w-full">
                        <div class="flex items-start gap-3 mb-7">
                            <button
                                class="bg-white/[0.04] border border-white/[0.08] rounded-lg text-[#9ca3af] cursor-pointer p-[7px] flex transition-all hover:bg-white/[0.08] hover:text-[#e5e7eb]"
                                on:click={() => { quizOpen = false; quizResult = null; }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6" /></svg>
                            </button>
                            <div>
                                <h2 class="text-xl font-bold text-[#f0eeff] tracking-[-0.01em]">{currentLesson.title}</h2>
                                <p class="text-xs text-[#4b5563] mt-1">
                                    {currentModule?.title} · {questions.length} question{questions.length !== 1 ? "s" : ""} · Pass 70%
                                    {#if totalQuizAttempts > 0}
                                        <span class="ml-2 text-[11px] text-amber-400 bg-amber-500/10 px-1.5 py-[1px] rounded">Attempt #{totalQuizAttempts + 1}</span>
                                    {/if}
                                </p>
                            </div>
                        </div>

                        {#if quizResult}
                            <div class="rounded-2xl p-10 text-center border {quizResult.passed ? 'bg-emerald-500/[0.06] border-emerald-500/20' : 'bg-red-500/[0.06] border-red-500/20'}">
                                <div class="text-[72px] font-extrabold tracking-[-0.04em] leading-none {quizResult.passed ? 'text-emerald-400' : 'text-red-400'}">
                                    {quizResult.score}<span class="text-[32px]">%</span>
                                </div>
                                <p class="text-lg font-semibold mt-2 text-[#e5e7eb]">{quizResult.passed ? "Passed" : "Not passed"}</p>
                                <p class="text-[13px] text-[#6b7280] mt-1">{quizResult.correct} of {quizResult.total} correct</p>
                                {#if !quizResult.passed}
                                    <button class="mt-6 px-7 py-2.5 bg-white/[0.07] hover:bg-white/[0.12] text-[#e5e7eb] text-[13px] font-semibold rounded-[10px] border-none cursor-pointer transition-all" on:click={retryQuiz}>Try again</button>
                                {:else}
                                    <button class="mt-6 px-7 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[13px] font-semibold rounded-[10px] border-none cursor-pointer transition-all" on:click={continueAfterQuiz}>Continue →</button>
                                {/if}
                            </div>
                        {:else}
                            <div class="flex flex-col gap-3.5">
                                {#each questions as q, qi}
                                    <div class="bg-white/[0.025] border border-white/[0.07] rounded-[14px] p-5">
                                        <p class="text-sm text-[#e5e7eb] leading-relaxed mb-3.5 flex items-start gap-2">
                                            <span class="inline-flex items-center justify-center w-[22px] h-[22px] bg-[#3b0764] text-violet-300 text-[11px] font-bold rounded-full flex-shrink-0 mt-[1px]">{qi + 1}</span>
                                            {q.question}
                                        </p>
                                        <div class="flex flex-col gap-2">
                                            {#each q.options as opt, oi}
                                                <label class="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] cursor-pointer transition-all
                                                    {parseInt(quizAnswers[qi]) === oi ? 'bg-violet-600/15 border border-violet-600/40' : 'bg-white/[0.03] border border-white/[0.07] hover:bg-white/[0.06] hover:border-white/[0.12]'}">
                                                    <input type="radio" name="q_{qi}" value={oi} bind:group={quizAnswers[qi]} class="hidden" />
                                                    <span class="w-4 h-4 rounded-full flex-shrink-0 transition-all border-2 {parseInt(quizAnswers[qi]) === oi ? 'border-violet-600 bg-violet-600' : 'border-white/20'}"></span>
                                                    <span class="text-[13px] text-[#d1d5db]">{opt}</span>
                                                </label>
                                            {/each}
                                        </div>
                                    </div>
                                {/each}
                                <button
                                    class="px-0 py-3.5 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-35 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl border-none cursor-pointer w-full transition-all"
                                    on:click={submitQuiz}
                                    disabled={Object.keys(quizAnswers).length < questions.length}
                                >Submit Assessment</button>
                            </div>
                        {/if}
                    </div>

                {:else if currentLesson}
                    <!-- VIDEO LESSON -->
                    <div class="flex flex-col">
                        <!-- FIX #1 + #2: restored native video + context-menu prevention on both players -->
                        <div
                            class="relative bg-black w-full"
                            style="aspect-ratio:16/9; max-height:62vh;"
                            on:contextmenu|preventDefault={() => {}}
                        >
                            {#if videoLoading}
                                <div class="absolute inset-0 flex items-center justify-center bg-black z-10">
                                    <div class="w-9 h-9 rounded-full border-2 border-violet-600/30 border-t-violet-600 animate-spin"></div>
                                </div>
                            {/if}

                            {#if isYouTube(currentLesson.videoUrl)}
                                <!-- YouTube: transparent overlay blocks right-click & inspect on the iframe -->
                                <div
                                    class="absolute inset-0 z-20"
                                    style="background: transparent;"
                                    on:contextmenu|preventDefault={() => {}}
                                    on:mousedown={(e) => {
                                        if (e.button === 0 || e.button === 1) {
                                            e.currentTarget.style.pointerEvents = "none";
                                            setTimeout(() => {
                                                if (e.currentTarget)
                                                    e.currentTarget.style.pointerEvents = "all";
                                            }, 100);
                                        }
                                    }}
                                ></div>
                                <iframe
                                    bind:this={iframeEl}
                                    src={getEmbedUrl(currentLesson.videoUrl)}
                                    class="w-full h-full block"
                                    frameborder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowfullscreen
                                    on:load={() => (videoLoading = false)}
                                    title={currentLesson.title}
                                ></iframe>
                            {:else}
                                <!-- FIX #1: native video fully restored with all handlers -->
                                <video
                                    bind:this={videoEl}
                                    src={currentLesson.videoUrl}
                                    class="w-full h-full object-contain block"
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
                                <div class="absolute top-3 right-3 z-20 flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-600/90 text-emerald-100 backdrop-blur-sm">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12" /></svg>
                                    Completed
                                </div>
                            {/if}

                            {#if !hasAccess}
                                <div class="absolute top-3 left-3 z-20 text-[11px] font-bold px-3 py-1 rounded-full bg-amber-500/90 text-black backdrop-blur-sm">
                                    Free Preview
                                </div>
                            {/if}
                        </div>

                        <div class="px-7 py-5 border-b border-white/[0.06]">
                            <div class="flex items-start justify-between gap-4 flex-wrap">
                                <div class="flex-1 min-w-0">
                                    <p class="text-[11px] font-semibold tracking-[0.05em] text-violet-600 uppercase mb-1.5">
                                        {currentModule?.title} / Lesson {activeLessonIdx + 1} of {(currentModule?.lessons || []).length}
                                    </p>
                                    <h2 class="text-xl font-bold text-[#f0eeff] tracking-[-0.01em]">{currentLesson.title}</h2>
                                    <p class="text-xs text-[#4b5563] mt-1">
                                        {#if currentLesson.durationSeconds}Duration: {formatTime(currentLesson.durationSeconds)}{/if}
                                        {#if lessonProgress[currentLesson.id]?.maxWatched > 0}· Watched: {formatTime(lessonProgress[currentLesson.id].maxWatched)}{/if}
                                    </p>
                                </div>
                                {#if hasAccess && activeLessonIdx < (currentModule?.lessons || []).length - 1}
                                    <button
                                        class="flex items-center gap-1.5 px-4 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-[#d1d5db] text-xs font-semibold cursor-pointer transition-all hover:bg-white/[0.08] flex-shrink-0 whitespace-nowrap"
                                        on:click={() => selectLesson(activeModuleIdx, activeLessonIdx + 1)}
                                    >
                                        Next
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6" /></svg>
                                    </button>
                                {/if}
                            </div>

                            {#if currentLesson.durationSeconds && !isLessonComplete(currentLesson.id)}
                                <div class="flex items-center gap-2.5 mt-3.5">
                                    <div class="flex-1 h-[3px] bg-white/[0.08] rounded-sm overflow-hidden">
                                        <div
                                            class="h-full bg-violet-600 rounded-sm transition-all duration-300"
                                            style="width:{Math.min(100, ((lessonProgress[currentLesson.id]?.maxWatched ?? 0) / currentLesson.durationSeconds) * 100)}%"
                                        ></div>
                                    </div>
                                    <span class="text-[11px] text-[#4b5563] font-semibold flex-shrink-0">
                                        {Math.round(((lessonProgress[currentLesson.id]?.maxWatched ?? 0) / currentLesson.durationSeconds) * 100)}%
                                    </span>
                                </div>
                                <p class="text-[11px] text-[#374151] mt-1.5">Seek ±{MAX_SEEK_DELTA}s — full watch unlocks free seek</p>
                            {:else if isLessonComplete(currentLesson.id)}
                                <p class="text-[11px] text-emerald-900 mt-1.5">Completed — seek freely anywhere</p>
                            {/if}
                        </div>

                        {#if !hasAccess}
                            <div class="flex items-center gap-3.5 mx-7 my-4 p-4 bg-amber-500/[0.05] border border-amber-500/15 rounded-[14px] flex-wrap">
                                <div class="text-amber-500 flex-shrink-0">
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />
                                    </svg>
                                </div>
                                <div class="flex-1 min-w-[140px]">
                                    <strong class="block text-[13px] text-amber-300 mb-0.5">Enjoying the preview?</strong>
                                    <span class="text-[11px] text-[#6b7280]">Get all {course.totalLessons ?? ""} lessons + certificate</span>
                                </div>
                                <!-- FIX #3: single clean branch, no duplication -->
                                {#if !authedUser}
                                    <a href="/login" class="flex-shrink-0 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition-colors whitespace-nowrap no-underline">Login to Proceed</a>
                                {:else if alreadyInterested}
                                    <button class="flex-shrink-0 px-4 py-2 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-lg cursor-default whitespace-nowrap" disabled>✓ Request sent</button>
                                {:else}
                                    <button class="flex-shrink-0 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer border-none" on:click={openInterestModal}>Interested in this course</button>
                                {/if}
                            </div>
                        {/if}
                    </div>
                {/if}
            </main>

            <!-- ── Sidebar ─────────────────────────────────────────────────────── -->
            {#if sidebarOpen}
                <aside class="w-[296px] flex-shrink-0 bg-[#101016] border-l border-white/[0.06] flex flex-col overflow-hidden">
                    <div class="px-4 py-4 border-b border-white/[0.06] flex items-center justify-between gap-3">
                        <div>
                            <p class="text-xs font-bold text-[#e5e7eb] tracking-[0.02em]">Course content</p>
                            <p class="text-[11px] text-[#374151] mt-0.5">{(course.modules || []).length} modules · {course.totalLessons ?? 0} lessons</p>
                        </div>
                        {#if hasAccess}
                            <div class="relative w-9 h-9 flex-shrink-0">
                                <svg class="block" viewBox="0 0 36 36" width="36" height="36">
                                    <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="3" />
                                    <circle cx="18" cy="18" r="14" fill="none" stroke="#7c3aed" stroke-width="3"
                                        stroke-dasharray="{Math.round(overallPct * 0.88)} 88"
                                        stroke-dashoffset="22" stroke-linecap="round"
                                        transform="rotate(-90 18 18)"
                                        style="transition: stroke-dasharray 0.6s ease;"
                                    />
                                </svg>
                                <span class="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-violet-400">{overallPct}</span>
                            </div>
                        {:else}
                            <!-- FIX #3: single clean branch in sidebar header -->
                            {#if !authedUser}
                                <a href="/login" class="px-3 py-1.5 bg-amber-500/12 border border-amber-500/25 text-amber-400 text-[11px] font-bold rounded-lg whitespace-nowrap no-underline transition-all hover:bg-amber-500/20">Login</a>
                            {:else if alreadyInterested}
                                <button class="flex-shrink-0 px-3 py-1.5 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold rounded-lg cursor-default whitespace-nowrap" disabled>✓ Requested</button>
                            {:else}
                                <button class="flex-shrink-0 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer border-none" on:click={openInterestModal}>Interested</button>
                            {/if}
                        {/if}
                    </div>

                    <div class="flex-1 overflow-y-auto py-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/[0.07] [&::-webkit-scrollbar-thumb]:rounded-sm">
                        {#each course.modules || [] as mod, mi}
                            {@const accessible = canAccessModule(mi)}
                            {@const modProg = moduleProgress[mod.id]}
                            {@const completedLes = completedLessonsInModule(mod)}

                            <div class="border-b border-white/[0.04] {accessible ? '' : 'opacity-45'}">
                                <div class="flex items-center gap-2.5 px-3.5 py-2.5">
                                    <div class="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0
                                        {modProg?.complete ? 'bg-emerald-500/15 text-emerald-400' : accessible ? 'bg-violet-600/20 text-violet-400' : 'bg-white/[0.04] text-[#374151]'}">
                                        {#if modProg?.complete}
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12" /></svg>
                                        {:else if !accessible}
                                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                        {:else}
                                            {mi + 1}
                                        {/if}
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <p class="text-xs font-semibold text-[#d1d5db] truncate">{mod.title}</p>
                                        <p class="text-[10px] text-[#374151] mt-[1px]">{completedLes}/{(mod.lessons || []).length}</p>
                                    </div>
                                </div>

                                {#if accessible}
                                    <div class="pb-2">
                                        {#each mod.lessons || [] as les, li}
                                            {@const done = isLessonComplete(les.id)}
                                            {@const isActive = activeModuleIdx === mi && activeLessonIdx === li}
                                            {@const isPlayable = canPlayLesson(mi, li)}

                                            {#if isPlayable}
                                                <button
                                                    class="w-full flex items-center gap-[9px] px-3.5 py-[7px] pl-5 bg-transparent border-l-2 text-left cursor-pointer transition-all
                                                        {isActive ? 'bg-violet-600/10 border-l-violet-600' : 'border-l-transparent hover:bg-white/[0.03] hover:border-l-white/10'}"
                                                    on:click={() => selectLesson(mi, li)}
                                                >
                                                    <div class="w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0
                                                        {done ? 'bg-emerald-500/12 text-emerald-400' : les.type === 'assessment' ? 'bg-violet-500/12 text-violet-400' : 'bg-white/[0.05] text-[#4b5563]'}">
                                                        {#if done}
                                                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12" /></svg>
                                                        {:else if les.type === "assessment"}
                                                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>
                                                        {:else}
                                                            <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                                                        {/if}
                                                    </div>
                                                    <span class="flex-1 text-[11.5px] overflow-hidden text-ellipsis whitespace-nowrap
                                                        {done ? 'text-emerald-300' : isActive ? 'text-[#e5e7eb]' : 'text-[#9ca3af]'}">
                                                        {les.title}
                                                    </span>
                                                    <span class="text-[10px] text-[#374151] flex-shrink-0">
                                                        {#if isYouTube(les.videoUrl)}<span class="text-[9px] font-extrabold text-red-500 tracking-[0.04em]">YT</span>
                                                        {:else if done}✓
                                                        {:else if les.type === "assessment"}{les.questions?.length ?? 0}q
                                                        {:else if les.durationSeconds}{formatTime(les.durationSeconds)}{/if}
                                                    </span>
                                                </button>
                                            {:else}
                                                <!-- FIX #3: locked lesson in sidebar — single clean branch -->
                                                <div class="flex items-center gap-[9px] px-3.5 py-[7px] pl-5 opacity-40 border-l-2 border-l-transparent">
                                                    <div class="w-[18px] h-[18px] rounded-full bg-white/[0.04] flex items-center justify-center flex-shrink-0 text-[#374151]">
                                                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                                    </div>
                                                    <span class="flex-1 text-[11.5px] text-[#9ca3af] overflow-hidden text-ellipsis whitespace-nowrap">{les.title}</span>
                                                    {#if !authedUser}
                                                        <a href="/login" class="text-[10px] text-amber-400 font-semibold no-underline hover:underline flex-shrink-0">Login</a>
                                                    {:else if alreadyInterested}
                                                        <span class="text-[10px] text-emerald-400 font-semibold flex-shrink-0">✓</span>
                                                    {:else}
                                                        <button class="text-[10px] text-violet-400 font-semibold bg-transparent border-none cursor-pointer p-0 flex-shrink-0" on:click|stopPropagation={openInterestModal}>Interested</button>
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
        </div>
    </div>

    <!-- ══ Interest Modal ═══════════════════════════════════════════════════════ -->
    {#if interestModalOpen}
        <div
            class="fixed inset-0 bg-black/70 backdrop-blur-md z-[200] flex items-center justify-center p-5"
            on:click={() => !interestLoading && (interestModalOpen = false)}
        >
            <div
                class="bg-[#13141f] border border-white/10 rounded-[20px] p-9 max-w-[420px] w-full text-center shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
                on:click|stopPropagation
            >
                {#if !interestDone}
                    <div class="text-[44px] mb-3.5">🎓</div>
                    <h2 class="text-xl font-bold text-[#f0eeff] mb-2.5 tracking-[-0.02em]">Interested in this course?</h2>
                    <p class="text-sm text-[#9ca3af] leading-relaxed mb-2">
                        <strong class="text-[#e5e7eb]">{course?.title}</strong><br />
                        {#if course?.price}<span class="text-violet-400 font-semibold">₹{course.price}</span>{/if}
                    </p>
                    <p class="text-xs text-[#4b5563] mb-6">We'll note your interest and get back to you. Are you sure you want to proceed?</p>
                    <div class="flex gap-2.5 justify-center">
                        <button
                            class="px-5 py-2.5 bg-white/[0.05] hover:bg-white/10 disabled:opacity-50 border border-white/10 rounded-[10px] text-[#9ca3af] text-[13px] font-semibold cursor-pointer transition-all"
                            on:click={() => (interestModalOpen = false)}
                            disabled={interestLoading}>No, cancel</button>
                        <button
                            class="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed border-none rounded-[10px] text-white text-[13px] font-bold cursor-pointer transition-all flex items-center gap-2"
                            on:click={confirmInterest}
                            disabled={interestLoading}
                        >
                            {#if interestLoading}
                                <div class="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                                Saving…
                            {:else}
                                Yes, I'm interested!
                            {/if}
                        </button>
                    </div>
                {:else}
                    <div class="text-[44px] mb-3.5">✅</div>
                    <h2 class="text-xl font-bold text-[#f0eeff] mb-2.5 tracking-[-0.02em]">You're on the list!</h2>
                    <p class="text-sm text-[#9ca3af] leading-relaxed mb-6">
                        We've recorded your interest in <strong class="text-[#e5e7eb]">{course?.title}</strong>. We'll reach out to you soon.
                    </p>
                    <button
                        class="px-7 py-2.5 bg-violet-600 hover:bg-violet-500 border-none rounded-[10px] text-white text-[13px] font-bold cursor-pointer transition-all"
                        on:click={() => (interestModalOpen = false)}>Close</button>
                {/if}
            </div>
        </div>
    {/if}

    <!-- ══ Toast ════════════════════════════════════════════════════════════════ -->
    {#if toast}
        <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-5 py-[11px] rounded-xl text-[13px] font-medium text-white backdrop-blur-lg whitespace-nowrap shadow-[0_8px_24px_rgba(0,0,0,0.4)] pointer-events-none
            {toast.type === 'success' ? 'bg-emerald-600/90 border border-emerald-500/30' : toast.type === 'error' ? 'bg-red-800/90 border border-red-500/30' : toast.type === 'warning' ? 'bg-orange-800/90 border border-amber-500/30' : 'bg-indigo-700/90 border border-indigo-500/30'}">
            {toast.msg}
        </div>
    {/if}
{/if}