<script>
	export const ssr = false;

	import { onMount, onDestroy, tick } from 'svelte';
	import { goto } from '$app/navigation';

	export let data;

	const course = data?.course;
	const courseId = data?.courseId;

	let activeModuleIdx = 0;
	let activeLessonIdx = 0;
	let sidebarOpen = true;

	// ── Progress stored in memory only ──
	let lessonProgress = {};
	let moduleProgress = {};
	let overallPct = 0;
	let courseComplete = false;
	let certificateReady = false;

	let quizOpen = false;
	let quizAnswers = {};
	let quizResult = null;
	let quizAttempts = {};

	let maxReached = 0;
	let currentLesson = null;
	let currentModule = null;
	let videoLoading = false;

	let toast = null;
	let toastTimeout;

	let iframeEl;
	let ytPollInterval;
	let heartbeatInterval;

	// ── YouTube helpers ──
	function getYouTubeId(url) {
		if (!url) return null;
		const patterns = [
			/youtu\.be\/([^?&]+)/,
			/youtube\.com\/watch\?v=([^&]+)/,
			/youtube\.com\/embed\/([^?&]+)/,
			/youtube\.com\/shorts\/([^?&]+)/
		];
		for (const p of patterns) {
			const m = url.match(p);
			if (m) return m[1];
		}
		return null;
	}

	function isYouTube(url) {
		return url && (url.includes('youtube.com') || url.includes('youtu.be'));
	}

	function getEmbedUrl(url) {
		const id = getYouTubeId(url);
		return id
			? `https://www.youtube.com/embed/${id}?enablejsapi=1&rel=0&modestbranding=1&disablekb=1`
			: url;
	}

	// ── YouTube polling ──
	// Polls the iframe every 2s to get currentTime via postMessage
	function startYTPoll() {
		clearInterval(ytPollInterval);
		if (!iframeEl) return;
		ytPollInterval = setInterval(() => {
			try {
				iframeEl?.contentWindow?.postMessage(
					JSON.stringify({ event: 'listening' }),
					'*'
				);
				iframeEl?.contentWindow?.postMessage(
					JSON.stringify({ event: 'command', func: 'getCurrentTime', args: [] }),
					'*'
				);
			} catch {}
		}, 2000);
	}

	function stopYTPoll() {
		clearInterval(ytPollInterval);
	}

	// FIX 1: Correctly handle YouTube IFrame API message shape.
	// YouTube sends: { event: 'infoDelivery', info: { currentTime: ... } }
	// The old code checked d?.info?.currentTime without verifying d.event === 'infoDelivery',
	// which never matched, so % watched never updated and completion never fired.
	async function handleYTMessage(e) {
		try {
			const d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;

			// Only handle infoDelivery events that carry currentTime
			if (d?.event !== 'infoDelivery' || d?.info?.currentTime === undefined || !currentLesson) return;

			const ct = d.info.currentTime;
			if (ct > maxReached) maxReached = ct;

			if (!lessonProgress[currentLesson.id]) {
				lessonProgress[currentLesson.id] = { maxWatched: 0, complete: false };
			}

			lessonProgress[currentLesson.id].maxWatched = Math.max(
				lessonProgress[currentLesson.id].maxWatched || 0,
				Math.floor(ct)
			);

			// FIX 1b: Spread lessonProgress on EVERY update so Svelte reactivity
			// triggers the "% watched" bar to re-render continuously (not only on completion).
			lessonProgress = { ...lessonProgress };

			// Completion: 95% of durationSeconds watched
			if (
				!lessonProgress[currentLesson.id].complete &&
				currentLesson.durationSeconds &&
				ct >= 0.95 * currentLesson.durationSeconds
			) {
				lessonProgress[currentLesson.id].complete = true;
				lessonProgress = { ...lessonProgress };
				recalcProgress();
				showToast('✅ Lesson completed!', 'success');

				// FIX 2: await tick() so Svelte flushes all reactive state
				// (lessonProgress, moduleProgress) before autoAdvance() reads
				// canTakeAssessment(). Without this, canTakeAssessment() sees stale
				// values and the quiz never opens automatically.
				await tick();
				autoAdvance();
			}
		} catch {}
	}

	// ── Progress ──
	function initProgress() {
		(course.modules || []).forEach((mod) => {
			if (!moduleProgress[mod.id])
				moduleProgress[mod.id] = { assessmentPassed: false, complete: false };
			(mod.lessons || []).forEach((les) => {
				if (!lessonProgress[les.id]) lessonProgress[les.id] = { maxWatched: 0, complete: false };
			});
		});
		recalcProgress();
	}

	function recalcProgress() {
		const mods = course.modules || [];
		mods.forEach((mod) => {
			const allLessonsDone = (mod.lessons || []).every((l) => lessonProgress[l.id]?.complete);
			const passed = moduleProgress[mod.id]?.assessmentPassed;
			moduleProgress[mod.id].complete = mod.assessment ? allLessonsDone && passed : allLessonsDone;
		});
		const total = mods.length || 1;
		const done = mods.filter((m) => moduleProgress[m.id]?.complete).length;
		overallPct = Math.round((done / total) * 100);
		courseComplete = overallPct === 100;
		if (courseComplete) certificateReady = true;
		// Spread to guarantee Svelte picks up nested object changes
		moduleProgress = { ...moduleProgress };
		lessonProgress = { ...lessonProgress };
	}

	function canAccessModule(idx) {
		if (idx === 0) return true;
		return moduleProgress[course.modules[idx - 1].id]?.complete;
	}

	function canTakeAssessment(modIdx) {
		return (course.modules[modIdx].lessons || []).every((l) => lessonProgress[l.id]?.complete);
	}

	function completedLessonsInModule(mod) {
		return (mod.lessons || []).filter((l) => lessonProgress[l.id]?.complete).length;
	}

	// ── Lesson navigation ──
	function selectLesson(modIdx, lesIdx) {
		if (!canAccessModule(modIdx)) {
			showToast('⚠️ Complete the previous module first', 'warning');
			return;
		}
		activeModuleIdx = modIdx;
		activeLessonIdx = lesIdx;
		quizOpen = false;
		quizResult = null;
		quizAnswers = {};
		currentModule = course.modules[modIdx];
		currentLesson = currentModule.lessons[lesIdx];
		maxReached = lessonProgress[currentLesson.id]?.maxWatched || 0;
		videoLoading = true;
		clearInterval(heartbeatInterval);
		stopYTPoll();
		if (isYouTube(currentLesson.videoUrl)) {
			// Give iframe time to load before starting the poll
			setTimeout(startYTPoll, 2000);
		}
	}

	function startCourse() {
		for (let mi = 0; mi < course.modules.length; mi++) {
			if (!canAccessModule(mi)) break;
			for (let li = 0; li < (course.modules[mi].lessons || []).length; li++) {
				if (!lessonProgress[course.modules[mi].lessons[li].id]?.complete) {
					selectLesson(mi, li);
					return;
				}
			}
		}
		const last = course.modules.length - 1;
		selectLesson(last, (course.modules[last].lessons || []).length - 1);
	}

	// FIX 3: autoAdvance now reliably opens the quiz because by the time it's
	// called (after await tick()), canTakeAssessment() reads the flushed state.
	function autoAdvance() {
		const mod = course.modules[activeModuleIdx];
		if (activeLessonIdx < (mod.lessons || []).length - 1) {
			setTimeout(() => selectLesson(activeModuleIdx, activeLessonIdx + 1), 800);
		} else if (
			mod.assessment &&
			!moduleProgress[mod.id]?.assessmentPassed &&
			canTakeAssessment(activeModuleIdx)
		) {
			setTimeout(() => openQuiz(), 1000);
		} else if (!mod.assessment) {
			showToast('🎉 Module complete!', 'success');
		}
	}

	// ── Video events (native <video>) ──
	function onVideoReady() {
		videoLoading = false;
	}

	function onSeeking(e) {
		const videoEl = e.target;
		if (videoEl.currentTime > maxReached + 0.1) {
			videoEl.currentTime = maxReached;
			showToast("⏭ Can't skip ahead — watch to unlock", 'info');
		}
	}

	function onTimeUpdate(e) {
		const videoEl = e.target;
		if (!currentLesson) return;
		if (videoEl.currentTime > maxReached) maxReached = videoEl.currentTime;
		if (!lessonProgress[currentLesson.id]) {
			lessonProgress[currentLesson.id] = { maxWatched: 0, complete: false };
		}
		lessonProgress[currentLesson.id].maxWatched = Math.max(
			lessonProgress[currentLesson.id].maxWatched || 0,
			Math.floor(videoEl.currentTime)
		);
		// Spread on every tick so % watched bar updates in real time
		lessonProgress = { ...lessonProgress };

		if (
			!lessonProgress[currentLesson.id]?.complete &&
			currentLesson.durationSeconds &&
			maxReached >= 0.95 * currentLesson.durationSeconds
		) {
			lessonProgress[currentLesson.id].complete = true;
			lessonProgress = { ...lessonProgress };
			recalcProgress();
			showToast('✅ Lesson completed!', 'success');
			// autoAdvance handled by onVideoEnded for native video
		}
	}

	// FIX 2 (native video): await tick() before autoAdvance so reactive state is
	// flushed and canTakeAssessment() reads the correct completed lesson list.
	async function onVideoEnded() {
		if (!currentLesson) return;
		lessonProgress[currentLesson.id].complete = true;
		lessonProgress[currentLesson.id].maxWatched = currentLesson.durationSeconds;
		lessonProgress = { ...lessonProgress };
		recalcProgress();
		await tick();
		autoAdvance();
	}

	// ── Quiz ──
	function openQuiz() {
		if (!canTakeAssessment(activeModuleIdx)) {
			showToast('⚠️ Watch all lessons first', 'warning');
			return;
		}
		quizOpen = true;
		quizResult = null;
		quizAnswers = {};
		currentLesson = null;
		stopYTPoll();
		clearInterval(heartbeatInterval);
	}

	function submitQuiz() {
		const assessment = course.modules[activeModuleIdx].assessment;
		if (!assessment) return;
		const attempts = quizAttempts[assessment.id] || 0;
		if (attempts >= assessment.attemptsAllowed) {
			showToast('❌ No attempts remaining', 'error');
			return;
		}
		let correct = 0;
		const total = assessment.questions.length;
		assessment.questions.forEach((q) => {
			const correctOpt = q.options.find((o) => o.isCorrect);
			if (quizAnswers[q.id] && quizAnswers[q.id] === correctOpt?.id) correct++;
		});
		const score = Math.round((correct / total) * 100);
		const passed = score >= assessment.passMark;
		quizAttempts[assessment.id] = attempts + 1;
		quizAttempts = { ...quizAttempts };
		quizResult = { score, passed, correct, total };
		if (passed) {
			moduleProgress[course.modules[activeModuleIdx].id].assessmentPassed = true;
			moduleProgress = { ...moduleProgress };
			recalcProgress();
			showToast('🎉 Quiz passed! Next module unlocked.', 'success');
		} else {
			showToast(`Score: ${score}%. Need ${assessment.passMark}% to pass.`, 'error');
		}
	}

	// ── Toast ──
	function showToast(msg, type = 'info') {
		clearTimeout(toastTimeout);
		toast = { msg, type };
		toastTimeout = setTimeout(() => (toast = null), 3500);
	}

	// ── Utils ──
	function formatTime(sec) {
		if (!sec) return '0:00';
		const m = Math.floor(sec / 60);
		const s = Math.floor(sec % 60);
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	const toastColors = {
		success: 'bg-emerald-600',
		error: 'bg-rose-600',
		warning: 'bg-amber-500',
		info: 'bg-violet-600'
	};

	onMount(() => {
		if (!course) {
			goto('/course');
			return;
		}
		initProgress();
		// FIX 1: Register the corrected async handler (not the old onYTMessage)
		window.addEventListener('message', handleYTMessage);
	});

	onDestroy(() => {
		clearInterval(heartbeatInterval);
		clearInterval(ytPollInterval);
		if (typeof window !== 'undefined') {
			// FIX 1: Remove the correct handler reference
			window.removeEventListener('message', handleYTMessage);
		}
	});
</script>

<svelte:head>
	<title>{course?.title ?? 'Course'} — LMS</title>
</svelte:head>

{#if course}
	<div class="min-h-screen bg-[#0f0f13] text-white flex flex-col">
		<!-- Top Bar -->
		<header
			class="h-14 border-b border-white/10 bg-[#12121a] flex items-center px-4 gap-4 shrink-0 z-30 sticky top-0"
		>
			<button
				on:click={() => goto('/course')}
				class="text-gray-400 hover:text-white transition flex items-center gap-1.5 text-sm shrink-0"
			>
				<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 19l-7-7 7-7"
					/>
				</svg>
				Back
			</button>
			<span class="text-white/20">|</span>
			<span class="font-semibold text-sm truncate flex-1">{course.title}</span>
			<div class="flex items-center gap-2 shrink-0">
				<div class="w-28 h-2 bg-white/10 rounded-full overflow-hidden">
					<div
						class="h-full bg-gradient-to-r from-violet-500 to-emerald-500 rounded-full transition-all duration-700"
						style="width:{overallPct}%"
					></div>
				</div>
				<span class="text-xs font-bold text-gray-400">{overallPct}%</span>
			</div>
			<button
				on:click={() => (sidebarOpen = !sidebarOpen)}
				class="text-gray-400 hover:text-white transition ml-1"
			>
				<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 6h16M4 12h16M4 18h7"
					/>
				</svg>
			</button>
		</header>

		<!-- Body -->
		<div class="flex flex-1 overflow-hidden" style="height: calc(100vh - 3.5rem);">
			<!-- Main -->
			<main class="flex-1 overflow-y-auto flex flex-col">
				<!-- Landing View -->
				{#if !currentLesson && !quizOpen}
					<div class="relative overflow-hidden">
						<img
							src={course.image}
							alt={course.title}
							class="w-full h-64 md:h-80 object-cover opacity-40"
						/>
						<div
							class="absolute inset-0 bg-gradient-to-t from-[#0f0f13] via-[#0f0f13]/60 to-transparent flex flex-col justify-end p-8 md:p-12"
						>
							<span class="text-violet-400 text-xs font-bold uppercase tracking-widest mb-2"
								>{course.category}</span
							>
							<h1 class="text-3xl md:text-4xl font-black mb-3">{course.title}</h1>
							<p class="text-gray-300 max-w-2xl text-sm md:text-base">{course.description}</p>
							<div class="flex flex-wrap gap-5 mt-4 text-sm text-gray-400">
								<span>⭐ {course.rating ?? 0}</span>
								<span>👥 {(course.students ?? 0).toLocaleString()} students</span>
								<span>⏱ {course.duration}</span>
								<span>📚 {course.totalLessons} lessons</span>
								<span>🏆 {course.level}</span>
							</div>
							<button
								on:click={startCourse}
								class="mt-6 self-start px-8 py-3 bg-gradient-to-r from-violet-600 to-violet-500 text-white font-bold rounded-xl hover:from-violet-500 hover:to-violet-400 transition-all shadow-lg shadow-violet-900/40 flex items-center gap-2"
							>
								<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"
									><path d="M8 5v14l11-7z" /></svg
								>
								{overallPct > 0 ? 'Continue Course' : 'Start Course'}
							</button>
						</div>
					</div>

					<div class="p-6 md:p-10 grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl">
						<div class="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
							<img
								src={course.instructorAvatar}
								alt={course.instructor}
								class="w-14 h-14 rounded-full bg-violet-900"
							/>
							<div>
								<p class="text-xs text-gray-500 uppercase tracking-wider">Instructor</p>
								<p class="font-semibold mt-0.5">{course.instructor}</p>
							</div>
						</div>
						<div class="bg-white/5 border border-white/10 rounded-2xl p-5">
							<p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Modules</p>
							<p class="text-3xl font-black text-violet-400">{(course.modules || []).length}</p>
							<p class="text-sm text-gray-400 mt-0.5">with gated assessments</p>
						</div>
						<div class="bg-white/5 border border-white/10 rounded-2xl p-5">
							<p class="text-xs text-gray-500 uppercase tracking-wider mb-1">On Completion</p>
							<p class="text-3xl font-black text-emerald-400">Certificate</p>
							<p class="text-sm text-gray-400 mt-0.5">downloadable PDF</p>
						</div>
					</div>

					{#if course.tags?.length}
						<div class="px-6 md:px-10 pb-6 flex flex-wrap gap-2">
							{#each course.tags as tag}
								<span
									class="bg-violet-900/40 border border-violet-700/30 text-violet-300 text-xs px-3 py-1 rounded-full"
									>{tag}</span
								>
							{/each}
						</div>
					{/if}

					{#if canTakeAssessment(activeModuleIdx) && course.modules[activeModuleIdx]?.assessment && !moduleProgress[course.modules[activeModuleIdx]?.id]?.assessmentPassed}
						<div class="px-6 md:px-10 pb-6">
							<button
								on:click={openQuiz}
								class="flex items-center gap-2 px-5 py-3 bg-violet-600 rounded-xl text-sm font-bold hover:bg-violet-500 transition"
							>
								Take Module Quiz 🎯
							</button>
						</div>
					{/if}

				<!-- Quiz View -->
				{:else if quizOpen}
					{@const assessment = course.modules[activeModuleIdx]?.assessment}
					{#if assessment}
						{@const attempts = quizAttempts[assessment.id] || 0}
						<div class="p-6 md:p-10 max-w-3xl w-full mx-auto">
							<div class="flex items-center gap-3 mb-6">
								<button
									on:click={() => {
										quizOpen = false;
										quizResult = null;
									}}
									class="text-gray-400 hover:text-white transition"
								>
									<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M15 19l-7-7 7-7"
										/>
									</svg>
								</button>
								<div>
									<h2 class="text-xl font-bold">{assessment.title}</h2>
									<p class="text-sm text-gray-500">
										Pass mark: {assessment.passMark}% · Attempts: {attempts}/{assessment.attemptsAllowed}
									</p>
								</div>
							</div>

							{#if quizResult}
								<div
									class="rounded-2xl border p-8 text-center {quizResult.passed
										? 'bg-emerald-900/30 border-emerald-500/30'
										: 'bg-rose-900/30 border-rose-500/30'}"
								>
									<div class="text-6xl mb-4">{quizResult.passed ? '🎉' : '😔'}</div>
									<h3 class="text-2xl font-black mb-2">
										{quizResult.passed ? 'Passed!' : 'Not quite'}
									</h3>
									<p
										class="text-5xl font-black {quizResult.passed
											? 'text-emerald-400'
											: 'text-rose-400'} mb-3"
									>
										{quizResult.score}%
									</p>
									<p class="text-gray-400">{quizResult.correct} of {quizResult.total} correct</p>
									{#if !quizResult.passed && attempts < assessment.attemptsAllowed}
										<button
											on:click={() => {
												quizResult = null;
												quizAnswers = {};
											}}
											class="mt-6 px-6 py-2.5 bg-white/10 border border-white/20 rounded-xl font-semibold hover:bg-white/20 transition"
										>
											Try Again ({assessment.attemptsAllowed - attempts} left)
										</button>
									{/if}
									{#if quizResult.passed}
										<button
											on:click={() => {
												quizOpen = false;
												quizResult = null;
											}}
											class="mt-6 px-6 py-2.5 bg-emerald-600 rounded-xl font-semibold hover:bg-emerald-500 transition"
										>
											Continue →
										</button>
									{/if}
								</div>
							{:else if attempts >= assessment.attemptsAllowed}
								<div class="rounded-2xl bg-rose-900/20 border border-rose-500/30 p-8 text-center">
									<p class="text-2xl font-bold text-rose-400 mb-2">No Attempts Remaining</p>
									<p class="text-gray-400">Please contact your instructor.</p>
								</div>
							{:else}
								<div class="space-y-5">
									{#each assessment.questions as q, qi}
										<div class="bg-[#1a1a2a] border border-white/10 rounded-2xl p-5">
											<p class="font-semibold mb-4 text-white">
												<span class="text-violet-400 mr-2">{qi + 1}.</span>{q.text}
											</p>
											<div class="space-y-2">
												{#each q.options as opt}
													<label
														class="flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all
														{quizAnswers[q.id] === opt.id
															? 'bg-violet-600/20 border-violet-500'
															: 'bg-white/5 border-white/10 hover:bg-white/10'}"
													>
														<input
															type="radio"
															name={q.id}
															value={opt.id}
															bind:group={quizAnswers[q.id]}
															class="accent-violet-500 w-4 h-4"
														/>
														<span class="text-sm">{opt.text}</span>
													</label>
												{/each}
											</div>
										</div>
									{/each}
									<button
										on:click={submitQuiz}
										disabled={Object.keys(quizAnswers).length < assessment.questions.length}
										class="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:from-violet-500 hover:to-violet-400 transition-all"
									>
										Submit Quiz
									</button>
								</div>
							{/if}
						</div>
					{:else}
						<div class="p-10 text-center text-gray-500">No assessment for this module.</div>
					{/if}

				<!-- Video Player View -->
				{:else}
					<div class="flex flex-col">
						<div class="relative bg-black w-full" style="aspect-ratio:16/9; max-height:62vh;">
							{#if videoLoading}
								<div class="absolute inset-0 flex items-center justify-center bg-black z-10">
									<div
										class="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"
									></div>
								</div>
							{/if}

							{#if isYouTube(currentLesson.videoUrl)}
								<iframe
									bind:this={iframeEl}
									src={getEmbedUrl(currentLesson.videoUrl)}
									class="w-full h-full"
									frameborder="0"
									allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
									allowfullscreen
									on:load={() => (videoLoading = false)}
									title={currentLesson.title}
								></iframe>
								<!-- Overlay to prevent bottom-bar scrubbing on YouTube -->
								<div
									class="absolute bottom-0 left-0 right-0 z-20"
									style="height: 15%;"
									on:click|preventDefault|stopPropagation={() =>
										showToast("⏭ Can't skip ahead — watch to unlock", 'info')}
								></div>
							{:else}
								<video
									src={currentLesson.videoUrl}
									class="w-full h-full object-contain"
									controls
									controlsList="noplaybackrate"
									on:loadedmetadata={onVideoReady}
									on:seeking={onSeeking}
									on:timeupdate={onTimeUpdate}
									on:ended={onVideoEnded}
								></video>
							{/if}

							{#if lessonProgress[currentLesson.id]?.complete}
								<div
									class="absolute top-3 right-3 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg z-10"
								>
									<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="3"
											d="M5 13l4 4L19 7"
										/>
									</svg>
									Completed
								</div>
							{/if}
						</div>

						<!-- Lesson info -->
						<div class="p-5 md:p-6 border-b border-white/10">
							<div class="flex items-start justify-between gap-4 flex-wrap">
								<div>
									<p class="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-1">
										{currentModule.title} · Lesson {activeLessonIdx + 1}/{(
											currentModule.lessons || []
										).length}
									</p>
									<h2 class="text-xl md:text-2xl font-bold">{currentLesson.title}</h2>
									<p class="text-sm text-gray-500 mt-1">
										{#if currentLesson.durationSeconds}Duration: {formatTime(
												currentLesson.durationSeconds
											)}{/if}
										{#if lessonProgress[currentLesson.id]?.maxWatched > 0}
											· Watched: {formatTime(lessonProgress[currentLesson.id].maxWatched)}
										{/if}
									</p>
								</div>

								{#if activeLessonIdx < (currentModule.lessons || []).length - 1}
									<button
										on:click={() => selectLesson(activeModuleIdx, activeLessonIdx + 1)}
										class="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-sm font-semibold hover:bg-white/20 transition shrink-0"
									>
										Next <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"
											><path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M9 5l7 7-7 7"
											/></svg
										>
									</button>
								{:else if canTakeAssessment(activeModuleIdx) && course.modules[activeModuleIdx]?.assessment && !moduleProgress[currentModule.id]?.assessmentPassed}
									<button
										on:click={openQuiz}
										class="flex items-center gap-2 px-4 py-2 bg-violet-600 rounded-xl text-sm font-bold hover:bg-violet-500 transition shrink-0"
									>
										Take Quiz 🎯
									</button>
								{/if}
							</div>

							{#if currentLesson.durationSeconds}
								<div class="mt-4 flex items-center gap-3">
									<div class="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
										<div
											class="h-full bg-gradient-to-r from-violet-500 to-violet-400 rounded-full transition-all duration-300"
											style="width:{Math.min(
												100,
												((lessonProgress[currentLesson.id]?.maxWatched ?? 0) /
													currentLesson.durationSeconds) *
													100
											)}%"
										></div>
									</div>
									<span class="text-xs text-gray-500 shrink-0">
										{Math.round(
											((lessonProgress[currentLesson.id]?.maxWatched ?? 0) /
												currentLesson.durationSeconds) *
												100
										)}% watched
									</span>
								</div>
								{#if !isYouTube(currentLesson.videoUrl)}
									<p class="text-xs text-gray-600 mt-1.5">
										⏭ Seeking is locked beyond your furthest watched point
									</p>
								{/if}
							{/if}
						</div>
					</div>
				{/if}

				<!-- Certificate Banner -->
				{#if certificateReady}
					<div
						class="m-6 p-5 rounded-2xl bg-gradient-to-r from-amber-900/40 to-orange-900/40 border border-amber-500/30 flex items-center gap-4 flex-wrap"
					>
						<div class="text-5xl">🏆</div>
						<div class="flex-1">
							<h3 class="font-black text-xl text-amber-300">Course Complete!</h3>
							<p class="text-gray-400 text-sm mt-0.5">
								All modules and assessments done. Download your certificate.
							</p>
						</div>
						<button
							class="shrink-0 px-5 py-2.5 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition text-sm"
						>
							Download Certificate
						</button>
					</div>
				{/if}
			</main>

			<!-- Sidebar -->
			{#if sidebarOpen}
				<aside
					class="w-80 shrink-0 border-l border-white/10 bg-[#12121a] flex flex-col overflow-hidden"
				>
					<div class="p-4 border-b border-white/10">
						<h3 class="font-bold text-sm">Course Content</h3>
						<p class="text-xs text-gray-500 mt-0.5">
							{(course.modules || []).length} modules · {course.totalLessons} lessons
						</p>
						<div class="mt-3 flex items-center gap-2">
							<div class="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
								<div
									class="h-full bg-gradient-to-r from-violet-500 to-emerald-400 rounded-full transition-all duration-700"
									style="width:{overallPct}%"
								></div>
							</div>
							<span class="text-xs font-bold text-gray-400">{overallPct}%</span>
						</div>
					</div>

					<div class="overflow-y-auto flex-1 py-2">
						{#each course.modules || [] as mod, mi}
							{@const accessible = canAccessModule(mi)}
							{@const modProg = moduleProgress[mod.id]}
							{@const completedLes = completedLessonsInModule(mod)}

							<div class="border-b border-white/5">
								<div class="px-4 py-3 flex items-start gap-3 {accessible ? '' : 'opacity-50'}">
									<div
										class="w-6 h-6 rounded-full shrink-0 flex items-center justify-center mt-0.5
										{modProg?.complete
											? 'bg-emerald-500'
											: accessible
												? 'bg-violet-700'
												: 'bg-white/10'}"
									>
										{#if modProg?.complete}
											<svg
												class="w-3.5 h-3.5 text-white"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="3"
													d="M5 13l4 4L19 7"
												/>
											</svg>
										{:else if !accessible}
											<svg
												class="w-3 h-3 text-gray-400"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
												/>
											</svg>
										{:else}
											<span class="text-xs font-bold text-white">{mi + 1}</span>
										{/if}
									</div>
									<div class="flex-1 min-w-0">
										<p class="text-sm font-semibold text-white truncate">{mod.title}</p>
										<p class="text-xs text-gray-500 mt-0.5">
											{completedLes}/{(mod.lessons || []).length} lessons
											{#if modProg?.assessmentPassed}
												· Quiz ✓{/if}
										</p>
									</div>
								</div>

								{#if accessible}
									<div class="pb-2">
										{#each mod.lessons || [] as les, li}
											{@const lesProg = lessonProgress[les.id]}
											<button
												on:click={() => selectLesson(mi, li)}
												class="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all border-l-2
												{activeModuleIdx === mi && activeLessonIdx === li && !quizOpen
													? 'bg-violet-600/20 border-violet-500'
													: 'hover:bg-white/5 border-transparent'}"
											>
												<div
													class="w-5 h-5 rounded-full shrink-0 flex items-center justify-center
													{lesProg?.complete ? 'bg-emerald-500' : 'bg-white/10'}"
												>
													{#if lesProg?.complete}
														<svg
															class="w-3 h-3 text-white"
															fill="none"
															viewBox="0 0 24 24"
															stroke="currentColor"
														>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="3"
																d="M5 13l4 4L19 7"
															/>
														</svg>
													{:else}
														<svg
															class="w-3 h-3 text-gray-400"
															fill="currentColor"
															viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg
														>
													{/if}
												</div>
												<div class="flex-1 min-w-0">
													<p class="text-xs font-medium text-gray-300 truncate">{les.title}</p>
													{#if les.durationSeconds}
														<p class="text-xs text-gray-600">{formatTime(les.durationSeconds)}</p>
													{/if}
												</div>
												{#if isYouTube(les.videoUrl)}
													<span class="text-[10px] text-red-400 font-bold shrink-0">YT</span>
												{/if}
											</button>
										{/each}

										<!-- Quiz button in sidebar for accessible modules with pending assessment -->
										{#if canTakeAssessment(mi) && mod.assessment && !modProg?.assessmentPassed}
											<button
												on:click={() => {
													activeModuleIdx = mi;
													openQuiz();
												}}
												class="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all border-l-2
												{quizOpen && activeModuleIdx === mi
													? 'bg-violet-600/20 border-violet-500'
													: 'hover:bg-white/5 border-transparent'}"
											>
												<div class="w-5 h-5 rounded-full shrink-0 flex items-center justify-center bg-violet-700">
													<svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
														<path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
													</svg>
												</div>
												<div class="flex-1 min-w-0">
													<p class="text-xs font-medium text-violet-300 truncate">{mod.assessment.title}</p>
													<p class="text-xs text-gray-600">Module quiz</p>
												</div>
											</button>
										{/if}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</aside>
			{/if}
		</div>
	</div>

	<!-- Toast -->
	{#if toast}
		<div
			class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-semibold text-white shadow-2xl {toastColors[
				toast.type
			]}"
		>
			{toast.msg}
		</div>
	{/if}
{/if}

<style>
	@keyframes slide-up {
		from {
			transform: translateX(-50%) translateY(16px);
			opacity: 0;
		}
		to {
			transform: translateX(-50%) translateY(0);
			opacity: 1;
		}
	}
</style>