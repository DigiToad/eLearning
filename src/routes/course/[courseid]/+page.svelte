<script>
	import { onMount, onDestroy, tick } from "svelte";
	import { goto } from "$app/navigation";
	import { page } from "$app/stores";

	export let data;

	const course = data?.course;
	const courseId = data?.courseId;

	// ─── User info ────────────────────────────────────────────────────────────
	const userEmail = data?.authedUser?.email ?? "";
	const userId = data?.authedUser?.id ?? "";

	// ─── Access control ───────────────────────────────────────────────────────
	// hasAccess = true if user has purchased / been granted access to this course
	const hasAccess = (data?.profile?.acessedcourse ?? []).includes(courseId);

	// A lesson is playable if the user has full access,
	// OR it is the very first lesson of the very first module (free preview).
	function canPlayLesson(modIdx, lesIdx) {
		if (hasAccess) return true;
		return modIdx === 0 && lesIdx === 0;
	}

	// ─── Anti-skip config ─────────────────────────────────────────────────────
	const MAX_JUMP = 2.5;
	const MAX_NATIVE_DELTA = 1.5;

	let lastPollTime = 0;

	// ─── UI State ─────────────────────────────────────────────────────────────
	let activeModuleIdx = 0;
	let activeLessonIdx = 0;
	let sidebarOpen = true;

	// ─── Progress (in-memory) ─────────────────────────────────────────────────
	let lessonProgress = {};
	let moduleProgress = {};
	let overallPct = 0;
	let courseComplete = false;
	let certificateReady = false;

	// ─── Current lesson ───────────────────────────────────────────────────────
	let currentLesson = null;
	let currentModule = null;
	let videoLoading = false;
	let maxReached = 0;

	// ─── Assessment state ─────────────────────────────────────────────────────
	let quizOpen = false;
	let quizAnswers = {};
	let quizResult = null;
	let questionAttempts = {};
	let totalQuizAttempts = 0;

	// ─── Toast ────────────────────────────────────────────────────────────────
	let toast = null;
	let toastTimeout;

	// ─── YouTube ──────────────────────────────────────────────────────────────
	let iframeEl;
	let ytPollInterval;
	let lastSkipWarnTime = 0;

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
		return (
			!!url && (url.includes("youtube.com") || url.includes("youtu.be"))
		);
	}
	function getEmbedUrl(url) {
		const id = getYouTubeId(url);
		return id
			? `https://www.youtube.com/embed/${id}?enablejsapi=1&rel=0&modestbranding=1&disablekb=1&fs=0`
			: url;
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

	async function handleYTMessage(e) {
		try {
			const d = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
			if (
				d?.event !== "infoDelivery" ||
				d?.info?.currentTime === undefined ||
				!currentLesson
			)
				return;

			const ct = d.info.currentTime;

			if (lastPollTime > 0 && ct > maxReached + MAX_JUMP) {
				try {
					iframeEl?.contentWindow?.postMessage(
						JSON.stringify({
							event: "command",
							func: "seekTo",
							args: [maxReached, true],
						}),
						"*",
					);
				} catch {}
				lastPollTime = maxReached;
				const now = Date.now();
				if (now - lastSkipWarnTime > 3000) {
					showToast("⏭ Can't skip ahead — watch to unlock", "info");
					lastSkipWarnTime = now;
				}
				return;
			}

			lastPollTime = ct;
			if (ct > maxReached) maxReached = ct;

			if (!lessonProgress[currentLesson.id])
				lessonProgress[currentLesson.id] = {
					maxWatched: 0,
					complete: false,
				};
			lessonProgress[currentLesson.id].maxWatched =
				Math.floor(maxReached);
			lessonProgress = { ...lessonProgress };

			if (
				!lessonProgress[currentLesson.id].complete &&
				currentLesson.durationSeconds &&
				maxReached >= 0.95 * currentLesson.durationSeconds
			) {
				lessonProgress[currentLesson.id].complete = true;
				lessonProgress = { ...lessonProgress };
				recalcProgress();
				showToast("✅ Lesson completed!", "success");
				await sendLessonProgress(currentLesson, currentModule);
				await tick();
				autoAdvance();
			}
		} catch {}
	}

	// ─── Progress helpers ─────────────────────────────────────────────────────
	function initProgress() {
		(course.modules || []).forEach((mod) => {
			if (!moduleProgress[mod.id])
				moduleProgress[mod.id] = { complete: false };
			(mod.lessons || []).forEach((les) => {
				if (!lessonProgress[les.id])
					lessonProgress[les.id] = { maxWatched: 0, complete: false };
			});
		});
		recalcProgress();
	}

	function recalcProgress() {
		(course.modules || []).forEach((mod) => {
			moduleProgress[mod.id].complete = (mod.lessons || []).every(
				(l) => lessonProgress[l.id]?.complete,
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
		return (mod.lessons || []).filter((l) => lessonProgress[l.id]?.complete)
			.length;
	}

	// ─── Reported lessons guard ───────────────────────────────────────────────
	let reportedLessons = {};

	// ─── Analytics ───────────────────────────────────────────────────────────
	async function sendLessonProgress(lesson, mod, extraPayload = {}) {
		if (!userId || !userEmail) {
			console.warn("sendLessonProgress: no userId/userEmail", {
				userId,
				userEmail,
			});
			return;
		}
		if (lesson.type === "video" && reportedLessons[lesson.id]) return;
		if (lesson.type === "video") reportedLessons[lesson.id] = true;

		try {
			const params = new URLSearchParams({
				userEmail: userEmail,
				userId: userId,
				courseId: courseId,
				sectionId: course.sectionId ?? "",
				subsectionId: lesson.id,
				lessonTitle: lesson.title,
				lessonType: lesson.type,
				moduleId: mod?.id ?? "",
				moduleTitle: mod?.title ?? "",
				completedAt: new Date().toISOString(),
				watchedSeconds: String(
					lessonProgress[lesson.id]?.maxWatched ?? 0,
				),
				durationSeconds: String(lesson.durationSeconds ?? 0),
			});

			if (Object.keys(extraPayload).length > 0) {
				params.append("extraPayload", JSON.stringify(extraPayload));
			}

			const res = await fetch("?/report", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: params.toString(),
			});

			if (!res.ok) {
				if (lesson.type === "video") reportedLessons[lesson.id] = false;
				console.warn("Report action returned:", res.status);
			}
		} catch (err) {
			if (lesson.type === "video") reportedLessons[lesson.id] = false;
			console.warn("Failed to send progress report:", err);
		}
	}

	// ─── Lesson selection ─────────────────────────────────────────────────────
	function selectLesson(modIdx, lesIdx) {
		if (!canAccessModule(modIdx)) {
			showToast("⚠️ Complete the previous module first", "warning");
			return;
		}
		// ── Access gate ───────────────────────────────────────────────────────
		if (!canPlayLesson(modIdx, lesIdx)) {
			showToast(
				"🔒 Purchase the course to unlock this lesson",
				"warning",
			);
			return;
		}

		activeModuleIdx = modIdx;
		activeLessonIdx = lesIdx;
		quizOpen = false;
		quizResult = null;
		quizAnswers = {};
		questionAttempts = {};
		totalQuizAttempts = 0;
		currentModule = course.modules[modIdx];
		currentLesson = currentModule.lessons[lesIdx];
		maxReached = lessonProgress[currentLesson.id]?.maxWatched || 0;
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
			// Non-purchasers go straight to the free preview lesson
			selectLesson(0, 0);
			return;
		}
		for (let mi = 0; mi < (course.modules || []).length; mi++) {
			if (!canAccessModule(mi)) break;
			for (
				let li = 0;
				li < (course.modules[mi].lessons || []).length;
				li++
			) {
				if (
					!lessonProgress[course.modules[mi].lessons[li].id]?.complete
				) {
					selectLesson(mi, li);
					return;
				}
			}
		}
		const last = (course.modules || []).length - 1;
		if (last >= 0)
			selectLesson(last, (course.modules[last].lessons || []).length - 1);
	}

	function autoAdvance() {
		const mod = course.modules[activeModuleIdx];
		if (activeLessonIdx < (mod.lessons || []).length - 1) {
			// Only auto-advance if the next lesson is accessible
			const nextLesIdx = activeLessonIdx + 1;
			if (canPlayLesson(activeModuleIdx, nextLesIdx)) {
				setTimeout(
					() => selectLesson(activeModuleIdx, nextLesIdx),
					800,
				);
			} else {
				showToast("🔒 Purchase the course to continue", "warning");
			}
		} else {
			showToast("🎉 Module complete!", "success");
			recalcProgress();
		}
	}

	// ─── Native video events ──────────────────────────────────────────────────
	function onVideoReady() {
		videoLoading = false;
	}

	function onSeeking(e) {
		const v = e.target;
		if (v.currentTime > maxReached + 0.3) {
			v.currentTime = maxReached;
			const now = Date.now();
			if (now - lastSkipWarnTime > 3000) {
				showToast("⏭ Can't skip ahead — watch to unlock", "info");
				lastSkipWarnTime = now;
			}
		}
	}

	function onTimeUpdate(e) {
		const v = e.target;
		if (!currentLesson) return;

		const delta = v.currentTime - maxReached;
		if (delta > 0 && delta <= MAX_NATIVE_DELTA) {
			maxReached = v.currentTime;
		} else if (delta > MAX_NATIVE_DELTA) {
			v.currentTime = maxReached;
		}

		if (!lessonProgress[currentLesson.id])
			lessonProgress[currentLesson.id] = {
				maxWatched: 0,
				complete: false,
			};
		lessonProgress[currentLesson.id].maxWatched = Math.floor(maxReached);
		lessonProgress = { ...lessonProgress };

		if (
			!lessonProgress[currentLesson.id].complete &&
			currentLesson.durationSeconds &&
			maxReached >= 0.95 * currentLesson.durationSeconds
		) {
			lessonProgress[currentLesson.id].complete = true;
			lessonProgress = { ...lessonProgress };
			recalcProgress();
			showToast("✅ Lesson completed!", "success");
			sendLessonProgress(currentLesson, currentModule);
		}
	}

	async function onVideoEnded() {
		if (!currentLesson) return;
		if (maxReached >= 0.9 * (currentLesson.durationSeconds ?? 0)) {
			lessonProgress[currentLesson.id].complete = true;
			lessonProgress[currentLesson.id].maxWatched =
				currentLesson.durationSeconds;
			lessonProgress = { ...lessonProgress };
			recalcProgress();
			await sendLessonProgress(currentLesson, currentModule);
			await tick();
			autoAdvance();
		} else {
			showToast("⏭ Watch the full lesson to complete it", "info");
		}
	}

	// ─── Assessment submit ────────────────────────────────────────────────────
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
				if (parseInt(quizAnswers[qi]) === q.answer) {
					questionAttempts[qi].correct = true;
				}
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
			showToast("🎉 Assessment passed!", "success");

			const questionAnalytics = questions.map((q, qi) => ({
				questionIndex: qi,
				question: q.question,
				attemptsToCorrect: questionAttempts[qi]?.attempts ?? 1,
				correct: questionAttempts[qi]?.correct ?? false,
			}));

			sendLessonProgress(currentLesson, currentModule, {
				assessmentScore: score,
				assessmentPassed: true,
				assessmentTotalAttempts: totalQuizAttempts,
				questionAnalytics,
			});
		} else {
			showToast(`Score: ${score}% — need 70% to pass`, "error");
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

	// ─── Toast ────────────────────────────────────────────────────────────────
	function showToast(msg, type = "info") {
		clearTimeout(toastTimeout);
		toast = { msg, type };
		toastTimeout = setTimeout(() => (toast = null), 3500);
	}

	function formatTime(sec) {
		if (!sec) return "0:00";
		return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
	}

	const toastColors = {
		success: "bg-emerald-600",
		error: "bg-rose-600",
		warning: "bg-amber-500",
		info: "bg-violet-600",
	};

	onMount(() => {
		if (!course) {
			goto("/course");
			return;
		}
		initProgress();
		window.addEventListener("message", handleYTMessage);
	});
	onDestroy(() => {
		stopYTPoll();
		if (typeof window !== "undefined")
			window.removeEventListener("message", handleYTMessage);
	});
</script>

<svelte:head>
	<title>{course?.title ?? "Course"} — SkillsBlock</title>
</svelte:head>

{#if course}
	<div class="min-h-screen bg-[#0f0f13] text-white flex flex-col">
		<!-- ══ Top Bar ══════════════════════════════════════════════════════════ -->
		<header
			class="h-14 border-b border-white/10 bg-[#12121a] flex items-center px-4 gap-4 shrink-0 z-30 sticky top-0"
		>
			<button
				on:click={() => goto("/course")}
				class="text-gray-400 hover:text-white transition flex items-center gap-1.5 text-sm shrink-0"
			>
				<svg
					class="w-4 h-4"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
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
			<span class="font-semibold text-sm truncate flex-1"
				>{course.title}</span
			>

			<!-- Access badge -->
			{#if !hasAccess}
				<span
					class="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30"
				>
					🔒 Preview Mode
				</span>
			{/if}

			{#if hasAccess}
				<div class="flex items-center gap-2 shrink-0">
					<div
						class="w-28 h-2 bg-white/10 rounded-full overflow-hidden"
					>
						<div
							class="h-full bg-gradient-to-r from-violet-500 to-emerald-500 rounded-full transition-all duration-700"
							style="width:{overallPct}%"
						></div>
					</div>
					<span class="text-xs font-bold text-gray-400"
						>{overallPct}%</span
					>
				</div>
			{/if}

			<button
				on:click={() => (sidebarOpen = !sidebarOpen)}
				class="text-gray-400 hover:text-white transition ml-1"
			>
				<svg
					class="w-5 h-5"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 6h16M4 12h16M4 18h7"
					/>
				</svg>
			</button>
		</header>

		<!-- ══ Body ═════════════════════════════════════════════════════════════ -->
		<div
			class="flex flex-1 overflow-hidden"
			style="height:calc(100vh - 3.5rem);"
		>
			<!-- ── Main content ──────────────────────────────────────────────── -->
			<main class="flex-1 overflow-y-auto flex flex-col">
				{#if !currentLesson && !quizOpen}
					<!-- ┌─ LANDING VIEW ──────────────────────────────────────────── -->
					<div class="relative overflow-hidden">
						{#if course.image}
							<img
								src={course.image}
								on:error={(e) =>
									(e.target.src = "/skillsblock.png")}
								alt={course.title}
								class="w-full h-64 md:h-80 object-cover opacity-40"
							/>
						{:else}
							<div
								class="w-full h-64 md:h-80 bg-gradient-to-br from-violet-900/40 to-blue-900/40"
							></div>
						{/if}
						<div
							class="absolute inset-0 bg-gradient-to-t from-[#0f0f13] via-[#0f0f13]/60 to-transparent flex flex-col justify-end p-8 md:p-12"
						>
							<span
								class="text-violet-400 text-xs font-bold uppercase tracking-widest mb-2"
								>{course.level ?? ""}</span
							>
							<h1 class="text-3xl md:text-4xl font-black mb-3">
								{course.title}
							</h1>
							<p
								class="text-gray-300 max-w-2xl text-sm md:text-base"
							>
								{course.description ?? ""}
							</p>
							<div
								class="flex flex-wrap gap-5 mt-4 text-sm text-gray-400"
							>
								{#if course.instructor}<span
										>👨‍🏫 {course.instructor}</span
									>{/if}
								{#if course.level}<span>🏆 {course.level}</span
									>{/if}
								<span
									>📚 {course.totalLessons ?? 0} lessons</span
								>
								{#if course.price}<span>💰 ₹{course.price}</span
									>{/if}
							</div>

							<!-- CTA Button -->
							<button
								on:click={startCourse}
								class="mt-6 self-start px-8 py-3 bg-gradient-to-r from-violet-600 to-violet-500 text-white font-bold rounded-xl hover:from-violet-500 hover:to-violet-400 transition-all shadow-lg shadow-violet-900/40 flex items-center gap-2"
							>
								<svg
									class="w-5 h-5"
									fill="currentColor"
									viewBox="0 0 24 24"
									><path d="M8 5v14l11-7z" /></svg
								>
								{#if !hasAccess}
									▶ Watch Free Preview
								{:else}
									{overallPct > 0
										? "Continue Course"
										: "Start Course"}
								{/if}
							</button>

							<!-- Buy Now banner for non-purchasers -->
							{#if !hasAccess}
								<div
									class="mt-4 flex items-center gap-4 px-5 py-4 bg-amber-900/30 border border-amber-500/40 rounded-2xl max-w-lg self-start"
								>
									<div class="text-3xl shrink-0">🔒</div>
									<div class="flex-1 min-w-0">
										<p
											class="text-amber-300 font-bold text-sm"
										>
											Full access required
										</p>
										<p
											class="text-gray-400 text-xs mt-0.5 leading-relaxed"
										>
											You're on the free preview (Lesson 1
											only). Purchase to unlock all {course.totalLessons ??
												""} lessons &amp; get a certificate.
										</p>
									</div>
									<button
										class="shrink-0 px-4 py-2 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition text-sm whitespace-nowrap"
									>
										Buy Now ₹{course.price ?? ""}
									</button>
								</div>
							{/if}
						</div>
					</div>
					<div
						class="p-6 md:p-10 grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl"
					>
						<div
							class="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4"
						>
							{#if course.instructorAvatar}
								<img
									src={course.instructorAvatar}
									alt={course.instructor}
									class="w-14 h-14 rounded-full bg-violet-900"
								/>
							{:else}
								<div
									class="w-14 h-14 rounded-full bg-violet-900 flex items-center justify-center text-xl font-bold"
								>
									{(course.instructor ?? "?")[0]}
								</div>
							{/if}
							<div>
								<p
									class="text-xs text-gray-500 uppercase tracking-wider"
								>
									Instructor
								</p>
								<p class="font-semibold mt-0.5">
									{course.instructor ?? "—"}
								</p>
							</div>
						</div>
						<div
							class="bg-white/5 border border-white/10 rounded-2xl p-5"
						>
							<p
								class="text-xs text-gray-500 uppercase tracking-wider mb-1"
							>
								Modules
							</p>
							<p class="text-3xl font-black text-violet-400">
								{(course.modules || []).length}
							</p>
							<p class="text-sm text-gray-400 mt-0.5">
								{course.totalLessons} total lessons
							</p>
						</div>
						<div
							class="bg-white/5 border border-white/10 rounded-2xl p-5"
						>
							<p
								class="text-xs text-gray-500 uppercase tracking-wider mb-1"
							>
								On Completion
							</p>
							<p class="text-3xl font-black text-emerald-400">
								Certificate
							</p>
							<p class="text-sm text-gray-400 mt-0.5">
								downloadable PDF
							</p>
						</div>
					</div>

					<div class="px-6 md:px-10 pb-10 max-w-4xl">
						<h2 class="text-lg font-bold mb-4 text-white/80">
							Course Curriculum
						</h2>
						<div class="space-y-3">
							{#each course.modules || [] as mod, mi}
								{@const accessible = canAccessModule(mi)}
								{@const modProg = moduleProgress[mod.id]}
								<div
									class="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
								>
									<div
										class="flex items-center gap-3 px-5 py-4 {accessible
											? ''
											: 'opacity-60'}"
									>
										<div
											class="w-7 h-7 rounded-full shrink-0 flex items-center justify-center {modProg?.complete
												? 'bg-emerald-500'
												: accessible
													? 'bg-violet-700'
													: 'bg-white/10'}"
										>
											{#if modProg?.complete}
												<svg
													class="w-4 h-4 text-white"
													fill="none"
													viewBox="0 0 24 24"
													stroke="currentColor"
													><path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="3"
														d="M5 13l4 4L19 7"
													/></svg
												>
											{:else if !accessible}
												<svg
													class="w-3.5 h-3.5 text-gray-400"
													fill="none"
													viewBox="0 0 24 24"
													stroke="currentColor"
													><path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
													/></svg
												>
											{:else}
												<span
													class="text-xs font-bold text-white"
													>{mi + 1}</span
												>
											{/if}
										</div>
										<div class="flex-1 min-w-0">
											<p
												class="font-semibold text-sm truncate"
											>
												{mod.title}
											</p>
											<p
												class="text-xs text-gray-500 mt-0.5"
											>
												{completedLessonsInModule(
													mod,
												)}/{(mod.lessons || []).length} lessons
											</p>
										</div>
										{#if !accessible}<span
												class="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-md"
												>🔒 Locked</span
											>{/if}
									</div>
									<div
										class="border-t border-white/5 divide-y divide-white/5"
									>
										{#each mod.lessons || [] as les, li}
											{@const isPlayable = canPlayLesson(
												mi,
												li,
											)}
											<div
												class="flex items-center gap-3 px-5 py-2.5 {accessible &&
												isPlayable
													? 'opacity-80'
													: 'opacity-40'}"
											>
												{#if les.type === "assessment"}
													<svg
														class="w-4 h-4 {isPlayable
															? 'text-violet-400'
															: 'text-gray-600'} shrink-0"
														fill="none"
														viewBox="0 0 24 24"
														stroke="currentColor"
														><path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
														/></svg
													>
													<span
														class="text-xs text-gray-300 flex-1 truncate"
														>{les.title}</span
													>
													{#if isPlayable}
														<span
															class="text-[10px] text-violet-400 font-semibold shrink-0"
															>{les.questions
																?.length ?? 0} Qs</span
														>
													{:else}
														<span
															class="text-[10px] text-amber-500 font-semibold shrink-0"
															>🔒 Buy</span
														>
													{/if}
												{:else}
													<svg
														class="w-4 h-4 {isPlayable
															? 'text-gray-500'
															: 'text-gray-700'} shrink-0"
														fill="currentColor"
														viewBox="0 0 24 24"
														><path
															d="M8 5v14l11-7z"
														/></svg
													>
													<span
														class="text-xs text-gray-300 flex-1 truncate"
														>{les.title}</span
													>
													{#if !isPlayable}
														<span
															class="text-[10px] text-amber-500 font-semibold shrink-0"
															>🔒 Buy</span
														>
													{:else if les.durationSeconds}
														<span
															class="text-[10px] text-gray-500 shrink-0"
															>{formatTime(
																les.durationSeconds,
															)}</span
														>
													{/if}
												{/if}
											</div>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{:else if quizOpen && currentLesson?.type === "assessment"}
					<!-- ┌─ ASSESSMENT VIEW ───────────────────────────────────────── -->
					{@const questions = currentLesson.questions || []}
					<div class="p-6 md:p-10 max-w-3xl w-full mx-auto">
						<div class="flex items-center gap-3 mb-6">
							<button
								on:click={() => {
									quizOpen = false;
									quizResult = null;
								}}
								class="text-gray-400 hover:text-white transition"
							>
								<svg
									class="w-5 h-5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									><path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M15 19l-7-7 7-7"
									/></svg
								>
							</button>
							<div>
								<h2 class="text-xl font-bold">
									{currentLesson.title}
								</h2>
								<p class="text-sm text-gray-500 mt-0.5">
									{currentModule?.title} · {questions.length} question{questions.length !==
									1
										? "s"
										: ""} · Pass: 70%
									{#if totalQuizAttempts > 0}
										<span class="ml-2 text-amber-400"
											>· Attempt #{totalQuizAttempts +
												1}</span
										>
									{/if}
								</p>
							</div>
						</div>

						{#if quizResult}
							<div
								class="rounded-2xl border p-8 text-center {quizResult.passed
									? 'bg-emerald-900/30 border-emerald-500/30'
									: 'bg-rose-900/30 border-rose-500/30'}"
							>
								<div class="text-6xl mb-4">
									{quizResult.passed ? "🎉" : "😔"}
								</div>
								<h3 class="text-2xl font-black mb-2">
									{quizResult.passed
										? "Passed!"
										: "Not quite"}
								</h3>
								<p
									class="text-5xl font-black mb-3 {quizResult.passed
										? 'text-emerald-400'
										: 'text-rose-400'}"
								>
									{quizResult.score}%
								</p>
								<p class="text-gray-400">
									{quizResult.correct} of {quizResult.total} correct
								</p>
								{#if !quizResult.passed}
									<button
										on:click={retryQuiz}
										class="mt-6 px-6 py-2.5 bg-white/10 border border-white/20 rounded-xl font-semibold hover:bg-white/20 transition"
									>
										Try Again
									</button>
								{:else}
									<button
										on:click={continueAfterQuiz}
										class="mt-6 px-6 py-2.5 bg-emerald-600 rounded-xl font-semibold hover:bg-emerald-500 transition"
									>
										Continue →
									</button>
								{/if}
							</div>
						{:else}
							<div class="space-y-5">
								{#each questions as q, qi}
									<div
										class="bg-[#1a1a2a] border border-white/10 rounded-2xl p-5"
									>
										<p
											class="font-semibold mb-4 text-white"
										>
											<span class="text-violet-400 mr-2"
												>{qi + 1}.</span
											>{q.question}
										</p>
										<div class="space-y-2">
											{#each q.options as opt, oi}
												<label
													class="flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all {parseInt(
														quizAnswers[qi],
													) === oi
														? 'bg-violet-600/20 border-violet-500'
														: 'bg-white/5 border-white/10 hover:bg-white/10'}"
												>
													<input
														type="radio"
														name="q_{qi}"
														value={oi}
														bind:group={
															quizAnswers[qi]
														}
														class="accent-violet-500 w-4 h-4"
													/>
													<span class="text-sm"
														>{opt}</span
													>
												</label>
											{/each}
										</div>
									</div>
								{/each}
								<button
									on:click={submitQuiz}
									disabled={Object.keys(quizAnswers).length <
										questions.length}
									class="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:from-violet-500 hover:to-violet-400 transition-all"
								>
									Submit Assessment
								</button>
							</div>
						{/if}
					</div>
				{:else if currentLesson}
					<!-- ┌─ VIDEO LESSON VIEW ─────────────────────────────────────── -->
					<div class="flex flex-col">
						<div
							class="relative bg-black w-full"
							style="aspect-ratio:16/9; max-height:62vh;"
						>
							{#if videoLoading}
								<div
									class="absolute inset-0 flex items-center justify-center bg-black z-10"
								>
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
								<div
									class="absolute inset-0 z-20"
									style="cursor:default;"
									on:click|preventDefault|stopPropagation={() => {
										const now = Date.now();
										if (now - lastSkipWarnTime > 3000) {
											showToast(
												"⏭ Use play/pause only — seeking is disabled",
												"info",
											);
											lastSkipWarnTime = now;
										}
									}}
								></div>
								<div
									class="absolute inset-0 z-20 flex items-center justify-center"
									on:click|preventDefault|stopPropagation={(
										e,
									) => {
										const rect =
											e.currentTarget.getBoundingClientRect();
										const cx = rect.width / 2;
										const cy = rect.height / 2;
										const dx = Math.abs(
											e.clientX - rect.left - cx,
										);
										const dy = Math.abs(
											e.clientY - rect.top - cy,
										);
										if (
											dx < rect.width * 0.12 &&
											dy < rect.height * 0.15
										) {
											try {
												iframeEl?.contentWindow?.postMessage(
													JSON.stringify({
														event: "command",
														func: "playVideo",
														args: [],
													}),
													"*",
												);
											} catch {}
										} else {
											const now = Date.now();
											if (now - lastSkipWarnTime > 3000) {
												showToast(
													"⏭ Use play/pause only — seeking is disabled",
													"info",
												);
												lastSkipWarnTime = now;
											}
										}
									}}
								></div>
							{:else}
								<video
									src={currentLesson.videoUrl}
									class="w-full h-full object-contain"
									controls
									controlsList="noplaybackrate nodownload"
									disablePictureInPicture
									on:loadedmetadata={onVideoReady}
									on:seeking={onSeeking}
									on:timeupdate={onTimeUpdate}
									on:ended={onVideoEnded}
								></video>
							{/if}

							{#if lessonProgress[currentLesson.id]?.complete}
								<div
									class="absolute top-3 right-3 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg z-30"
								>
									<svg
										class="w-3 h-3"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										><path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="3"
											d="M5 13l4 4L19 7"
										/></svg
									>
									Completed
								</div>
							{/if}

							<!-- Free preview badge on video -->
							{#if !hasAccess}
								<div
									class="absolute top-3 left-3 bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-full z-30"
								>
									Free Preview
								</div>
							{/if}
						</div>

						<div class="p-5 md:p-6 border-b border-white/10">
							<div
								class="flex items-start justify-between gap-4 flex-wrap"
							>
								<div>
									<p
										class="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-1"
									>
										{currentModule?.title} · Lesson {activeLessonIdx +
											1}/{(currentModule?.lessons || [])
											.length}
									</p>
									<h2 class="text-xl md:text-2xl font-bold">
										{currentLesson.title}
									</h2>
									<p class="text-sm text-gray-500 mt-1">
										{#if currentLesson.durationSeconds}Duration:
											{formatTime(
												currentLesson.durationSeconds,
											)}{/if}
										{#if lessonProgress[currentLesson.id]?.maxWatched > 0}
											· Watched: {formatTime(
												lessonProgress[currentLesson.id]
													.maxWatched,
											)}
										{/if}
									</p>
								</div>
								{#if hasAccess && activeLessonIdx < (currentModule?.lessons || []).length - 1}
									<button
										on:click={() =>
											selectLesson(
												activeModuleIdx,
												activeLessonIdx + 1,
											)}
										class="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-sm font-semibold hover:bg-white/20 transition shrink-0"
									>
										Next
										<svg
											class="w-4 h-4"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
											><path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M9 5l7 7-7 7"
											/></svg
										>
									</button>
								{/if}
							</div>

							{#if currentLesson.durationSeconds}
								<div class="mt-4 flex items-center gap-3">
									<div
										class="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden"
									>
										<div
											class="h-full bg-gradient-to-r from-violet-500 to-violet-400 rounded-full transition-all duration-300"
											style="width:{Math.min(
												100,
												((lessonProgress[
													currentLesson.id
												]?.maxWatched ?? 0) /
													currentLesson.durationSeconds) *
													100,
											)}%"
										></div>
									</div>
									<span
										class="text-xs text-gray-500 shrink-0"
									>
										{Math.round(
											((lessonProgress[currentLesson.id]
												?.maxWatched ?? 0) /
												currentLesson.durationSeconds) *
												100,
										)}% watched
									</span>
								</div>
								<p class="text-xs text-gray-600 mt-1.5">
									⏭ Seeking ahead is disabled — watch to
									unlock progress
								</p>
							{/if}
						</div>

						<!-- Buy Now prompt below video for free preview users -->
						{#if !hasAccess}
							<div
								class="m-5 p-5 rounded-2xl bg-gradient-to-r from-amber-900/40 to-orange-900/30 border border-amber-500/30 flex items-center gap-4 flex-wrap"
							>
								<div class="text-4xl shrink-0">🎓</div>
								<div class="flex-1 min-w-0">
									<h3
										class="font-black text-base text-amber-300"
									>
										Enjoying the preview?
									</h3>
									<p class="text-gray-400 text-sm mt-0.5">
										Purchase the full course to unlock all {course.totalLessons ??
											""} lessons, assessments &amp; your certificate.
									</p>
								</div>
								<button
									class="shrink-0 px-5 py-2.5 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition text-sm whitespace-nowrap"
								>
									Buy Now ₹{course.price ?? ""}
								</button>
							</div>
						{/if}
					</div>
				{/if}

				<!-- Certificate Banner (only for purchasers) -->
				{#if certificateReady && hasAccess}
					<div
						class="m-6 p-5 rounded-2xl bg-gradient-to-r from-amber-900/40 to-orange-900/40 border border-amber-500/30 flex items-center gap-4 flex-wrap"
					>
						<div class="text-5xl">🏆</div>
						<div class="flex-1">
							<h3 class="font-black text-xl text-amber-300">
								Course Complete!
							</h3>
							<p class="text-gray-400 text-sm mt-0.5">
								All modules done. Download your certificate.
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

			<!-- ── Sidebar ────────────────────────────────────────────────────── -->
			{#if sidebarOpen}
				<aside
					class="w-80 shrink-0 border-l border-white/10 bg-[#12121a] flex flex-col overflow-hidden"
				>
					<div class="p-4 border-b border-white/10">
						<h3 class="font-bold text-sm">Course Content</h3>
						<p class="text-xs text-gray-500 mt-0.5">
							{(course.modules || []).length} modules · {course.totalLessons ??
								0} lessons
						</p>
						{#if hasAccess}
							<div class="mt-3 flex items-center gap-2">
								<div
									class="flex-1 h-2 bg-white/10 rounded-full overflow-hidden"
								>
									<div
										class="h-full bg-gradient-to-r from-violet-500 to-emerald-400 rounded-full transition-all duration-700"
										style="width:{overallPct}%"
									></div>
								</div>
								<span class="text-xs font-bold text-gray-400"
									>{overallPct}%</span
								>
							</div>
						{:else}
							<!-- Buy now CTA in sidebar -->
							<button
								class="mt-3 w-full py-2 bg-amber-500 text-black text-xs font-bold rounded-lg hover:bg-amber-400 transition"
							>
								🔒 Buy Now to Unlock All Lessons
							</button>
						{/if}
					</div>

					<div class="overflow-y-auto flex-1 py-2">
						{#each course.modules || [] as mod, mi}
							{@const accessible = canAccessModule(mi)}
							{@const modProg = moduleProgress[mod.id]}
							{@const completedLes =
								completedLessonsInModule(mod)}
							<div class="border-b border-white/5">
								<div
									class="px-4 py-3 flex items-start gap-3 {accessible
										? ''
										: 'opacity-50'}"
								>
									<div
										class="w-6 h-6 rounded-full shrink-0 flex items-center justify-center mt-0.5 {modProg?.complete
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
												><path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="3"
													d="M5 13l4 4L19 7"
												/></svg
											>
										{:else if !accessible}
											<svg
												class="w-3 h-3 text-gray-400"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
												><path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
												/></svg
											>
										{:else}
											<span
												class="text-xs font-bold text-white"
												>{mi + 1}</span
											>
										{/if}
									</div>
									<div class="flex-1 min-w-0">
										<p
											class="text-sm font-semibold text-white truncate"
										>
											{mod.title}
										</p>
										<p class="text-xs text-gray-500 mt-0.5">
											{completedLes}/{(mod.lessons || [])
												.length} lessons
										</p>
									</div>
								</div>

								{#if accessible}
									<div class="pb-2">
										{#each mod.lessons || [] as les, li}
											{@const lesProg =
												lessonProgress[les.id]}
											{@const isActive =
												activeModuleIdx === mi &&
												activeLessonIdx === li}
											{@const isPlayable = canPlayLesson(
												mi,
												li,
											)}

											{#if isPlayable}
												<!-- Accessible lesson: clickable button -->
												<button
													on:click={() =>
														selectLesson(mi, li)}
													class="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all border-l-2 {isActive
														? 'bg-violet-600/20 border-violet-500'
														: 'hover:bg-white/5 border-transparent'}"
												>
													{#if les.type === "assessment"}
														<div
															class="w-5 h-5 rounded-full shrink-0 flex items-center justify-center {lesProg?.complete
																? 'bg-emerald-500'
																: 'bg-violet-700/60'}"
														>
															{#if lesProg?.complete}
																<svg
																	class="w-3 h-3 text-white"
																	fill="none"
																	viewBox="0 0 24 24"
																	stroke="currentColor"
																	><path
																		stroke-linecap="round"
																		stroke-linejoin="round"
																		stroke-width="3"
																		d="M5 13l4 4L19 7"
																	/></svg
																>
															{:else}
																<svg
																	class="w-3 h-3 text-violet-300"
																	fill="none"
																	viewBox="0 0 24 24"
																	stroke="currentColor"
																	><path
																		stroke-linecap="round"
																		stroke-linejoin="round"
																		stroke-width="2"
																		d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
																	/></svg
																>
															{/if}
														</div>
													{:else}
														<div
															class="w-5 h-5 rounded-full shrink-0 flex items-center justify-center {lesProg?.complete
																? 'bg-emerald-500'
																: 'bg-white/10'}"
														>
															{#if lesProg?.complete}
																<svg
																	class="w-3 h-3 text-white"
																	fill="none"
																	viewBox="0 0 24 24"
																	stroke="currentColor"
																	><path
																		stroke-linecap="round"
																		stroke-linejoin="round"
																		stroke-width="3"
																		d="M5 13l4 4L19 7"
																	/></svg
																>
															{:else}
																<svg
																	class="w-3 h-3 text-gray-400"
																	fill="currentColor"
																	viewBox="0 0 24 24"
																	><path
																		d="M8 5v14l11-7z"
																	/></svg
																>
															{/if}
														</div>
													{/if}
													<div class="flex-1 min-w-0">
														<p
															class="text-xs font-medium truncate {les.type ===
															'assessment'
																? 'text-violet-300'
																: 'text-gray-300'}"
														>
															{les.title}
														</p>
														{#if les.type === "assessment"}
															<p
																class="text-[10px] text-violet-500"
															>
																{les.questions
																	?.length ??
																	0} questions
															</p>
														{:else if les.durationSeconds}
															<p
																class="text-[10px] text-gray-600"
															>
																{formatTime(
																	les.durationSeconds,
																)}
															</p>
														{/if}
													</div>
													{#if isYouTube(les.videoUrl)}
														<span
															class="text-[10px] text-red-400 font-bold shrink-0"
															>YT</span
														>
													{/if}
												</button>
											{:else}
												<!-- Locked lesson: non-clickable, shows Buy label -->
												<div
													class="w-full flex items-center gap-3 px-4 py-2.5 opacity-50 cursor-not-allowed border-l-2 border-transparent"
												>
													<div
														class="w-5 h-5 rounded-full shrink-0 flex items-center justify-center bg-white/10"
													>
														<svg
															class="w-3 h-3 text-gray-500"
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
													</div>
													<div class="flex-1 min-w-0">
														<p
															class="text-xs font-medium truncate text-gray-500"
														>
															{les.title}
														</p>
														<p
															class="text-[10px] text-amber-500 font-semibold"
														>
															🔒 Purchase to
															unlock
														</p>
													</div>
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
