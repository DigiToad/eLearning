<script>
	import { goto } from '$app/navigation';

	export let data;

	const { authedUser, profile, enrolledCourses, stats } = data;

	const firstName = profile?.firstName ?? authedUser?.name?.split(' ')[0] ?? 'Learner';
	const lastName  = profile?.lastName  ?? '';
	const initials  = (firstName[0] ?? '') + (lastName[0] ?? '');

	// ── Stat cards defined in script (fixes {@const} invalid placement error) ──
	$: statCards = [
		{ label: 'Enrolled',     value: stats.totalEnrolled,         icon: '📚', color: 'from-violet-600/20 to-violet-900/10 border-violet-500/20' },
		{ label: 'In Progress',  value: stats.inProgress,            icon: '▶️',  color: 'from-amber-600/20  to-amber-900/10  border-amber-500/20'  },
		{ label: 'Completed',    value: stats.totalCompleted,        icon: '🏆', color: 'from-emerald-600/20 to-emerald-900/10 border-emerald-500/20'},
		{ label: 'Lessons Done', value: stats.totalLessonsCompleted, icon: '✅', color: 'from-blue-600/20   to-blue-900/10   border-blue-500/20'   },
	];

	// ── Filter / sort ─────────────────────────────────────────────────────────
	let filter = 'all'; // 'all' | 'in-progress' | 'completed' | 'not-started'
	let sortBy = 'recent'; // 'recent' | 'progress' | 'title'

	$: filtered = enrolledCourses
		.filter(c => {
			if (filter === 'in-progress') return c.progress.completionPct > 0 && c.progress.completionPct < 100;
			if (filter === 'completed')   return c.progress.completionPct === 100;
			if (filter === 'not-started') return !c.progress.started;
			return true;
		})
		.sort((a, b) => {
			if (sortBy === 'progress') return b.progress.completionPct - a.progress.completionPct;
			if (sortBy === 'title')    return a.title.localeCompare(b.title);
			const aTime = a.progress.lastActivity ? new Date(a.progress.lastActivity).getTime() : 0;
			const bTime = b.progress.lastActivity ? new Date(b.progress.lastActivity).getTime() : 0;
			return bTime - aTime;
		});

	function formatDate(iso) {
		if (!iso) return 'Not started';
		return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
	}

	function relativeTime(iso) {
		if (!iso) return null;
		const diff  = Date.now() - new Date(iso).getTime();
		const mins  = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days  = Math.floor(diff / 86400000);
		if (mins  < 60) return `${mins}m ago`;
		if (hours < 24) return `${hours}h ago`;
		if (days  < 30) return `${days}d ago`;
		return formatDate(iso);
	}

	function progressColor(pct) {
		if (pct === 100) return 'from-emerald-500 to-teal-400';
		if (pct >= 60)   return 'from-violet-500 to-blue-500';
		if (pct >= 20)   return 'from-amber-500 to-orange-400';
		return 'from-rose-500 to-pink-500';
	}

	function levelBadge(level) {
		const map = {
			beginner:     'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
			intermediate: 'bg-amber-500/15   text-amber-400  border-amber-500/30',
			advanced:     'bg-rose-500/15    text-rose-400   border-rose-500/30',
		};
		return map[(level ?? '').toLowerCase()] ?? 'bg-white/10 text-gray-400 border-white/20';
	}
</script>




<div class="min-h-screen bg-black text-white" style="font-family:'DM Sans',sans-serif;">
	<main class="relative z-10 max-w-7xl mx-auto px-5 py-10">
		<div class="mb-10">
			<p class="text-gray-500 text-sm mb-1">Welcome back 👋</p>
			<h1 class="text-4xl font-black leading-none tracking-tight" style="font-family:'Syne',sans-serif;">
				{firstName}<span class="text-violet-400">.</span>
			</h1>
			{#if profile?.institution}
				<p class="text-gray-500 text-sm mt-2">{profile.institution}{profile.branch ? ` · ${profile.branch}` : ''}</p>
			{/if}
		</div>
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
			{#each statCards as s}
				<div class="rounded-2xl border bg-gradient-to-br p-5 {s.color}">
					<div class="text-2xl mb-3">{s.icon}</div>
					<p class="text-3xl font-black leading-none" style="font-family:'Syne',sans-serif;">{s.value}</p>
					<p class="text-xs text-gray-500 mt-1.5 font-medium">{s.label}</p>
				</div>
			{/each}
		</div>

		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
			<h2 class="text-xl font-bold" style="font-family:'Syne',sans-serif;">My Courses</h2>

			<div class="flex items-center gap-2 flex-wrap">
				<div class="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
					{#each [['all','All'],['in-progress','In Progress'],['completed','Done'],['not-started','New']] as [val, label]}
						<button
							on:click={() => filter = val}
							class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all {filter === val ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}"
						>{label}</button>
					{/each}
				</div>

				<!-- Sort -->
				<select
					bind:value={sortBy}
					class="bg-white/5 border border-white/10 text-gray-300 text-xs rounded-xl px-3 py-2 outline-none focus:border-violet-500 transition"
				>
					<option value="recent">Recent Activity</option>
					<option value="progress">Progress</option>
					<option value="title">A–Z</option>
				</select>
			</div>
		</div>

		<!-- ══ Course Grid ════════════════════════════════════════════════════ -->
		{#if filtered.length === 0}
			<div class="flex flex-col items-center justify-center py-24 text-center">
				<div class="text-6xl mb-4">📭</div>
				<h3 class="text-xl font-bold mb-2" style="font-family:'Syne',sans-serif;">No courses here</h3>
				<p class="text-gray-500 text-sm mb-6 max-w-xs">
					{filter === 'all'
						? "You haven't enrolled in any courses yet."
						: `No courses match the "${filter}" filter.`}
				</p>
				<button
					on:click={() => goto('/course')}
					class="px-6 py-3 bg-gradient-to-r from-violet-600 to-blue-600 rounded-xl font-semibold text-sm hover:opacity-90 transition"
				>
					Browse Courses
				</button>
			</div>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
				{#each filtered as course}
					<!-- {@const} is valid here — inside {#each} -->
					{@const p = course.progress}
					{@const isComplete = p.completionPct === 100}

					<article
						class="group relative bg-white/[0.03] border border-white/8 rounded-2xl overflow-hidden hover:border-violet-500/40 hover:bg-white/[0.05] transition-all duration-300 cursor-pointer flex flex-col"
						on:click={() => goto(`/course/${course.courseId}`)}
						on:keydown={(e) => e.key === 'Enter' && goto(`/course/${course.courseId}`)}
						role="link"
						tabindex="0"
					>
						<!-- Thumbnail -->
						<div class="relative h-40 bg-gradient-to-br from-violet-900/40 to-blue-900/40 overflow-hidden shrink-0">
							{#if course.image}
								<img
									src={course.image}
									alt={course.title}
									class="w-full h-full object-cover opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-all duration-500"
									on:error={(e) => { e.target.style.display = 'none'; }}
								/>
							{/if}

							<!-- Progress bar strip at bottom of image -->
							<div class="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
								<div
									class="h-full bg-gradient-to-r {progressColor(p.completionPct)} transition-all duration-700"
									style="width:{p.completionPct}%"
								></div>
							</div>

							<!-- Status badge -->
							{#if isComplete}
								<div class="absolute top-3 right-3 flex items-center gap-1.5 bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg">
									<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
									Completed
								</div>
							{:else if p.started}
								<div class="absolute top-3 right-3 bg-violet-600/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
									{p.completionPct}% done
								</div>
							{:else}
								<div class="absolute top-3 right-3 bg-black/50 text-gray-300 text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm border border-white/10">
									Not started
								</div>
							{/if}

							<!-- Level badge -->
							{#if course.level}
								<div class="absolute top-3 left-3">
									<span class="text-[10px] font-bold px-2 py-0.5 rounded-md border capitalize {levelBadge(course.level)}">{course.level}</span>
								</div>
							{/if}
						</div>

						<!-- Card body -->
						<div class="flex flex-col flex-1 p-5">
							<h3 class="font-bold text-sm leading-snug mb-1 line-clamp-2 group-hover:text-violet-300 transition-colors" style="font-family:'Syne',sans-serif;">
								{course.title}
							</h3>
							{#if course.instructor}
								<p class="text-xs text-gray-500 mb-3">👨‍🏫 {course.instructor}</p>
							{/if}

							<!-- Progress bar -->
							<div class="mb-3">
								<div class="flex items-center justify-between mb-1.5">
									<span class="text-[10px] text-gray-500 font-medium">Progress</span>
									<span class="text-[10px] font-bold {isComplete ? 'text-emerald-400' : 'text-violet-400'}">{p.completionPct}%</span>
								</div>
								<div class="h-1.5 bg-white/8 rounded-full overflow-hidden">
									<div
										class="h-full rounded-full bg-gradient-to-r {progressColor(p.completionPct)} transition-all duration-700"
										style="width:{p.completionPct}%"
									></div>
								</div>
							</div>

							<!-- Mini stats: videos · quizzes · total -->
							<div class="grid grid-cols-3 gap-2 mb-4">
								<div class="bg-white/5 rounded-lg px-2 py-2 text-center">
									<p class="text-sm font-black leading-none" style="font-family:'Syne',sans-serif;">{p.completedVideos}</p>
									<p class="text-[9px] text-gray-500 mt-0.5">Videos</p>
								</div>
								<div class="bg-white/5 rounded-lg px-2 py-2 text-center">
									<p class="text-sm font-black leading-none" style="font-family:'Syne',sans-serif;">{p.completedAssessments}</p>
									<p class="text-[9px] text-gray-500 mt-0.5">Quizzes</p>
								</div>
								<div class="bg-white/5 rounded-lg px-2 py-2 text-center">
									<p class="text-sm font-black leading-none" style="font-family:'Syne',sans-serif;">{p.totalLessons}</p>
									<p class="text-[9px] text-gray-500 mt-0.5">Total</p>
								</div>
							</div>

							<!-- Last lesson + CTA -->
							<div class="mt-auto">
								{#if p.lastLessonTitle}
									<div class="bg-white/5 rounded-lg px-3 py-2 mb-3 border border-white/5">
										<p class="text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">Last watched</p>
										<p class="text-xs text-gray-300 truncate">{p.lastLessonTitle}</p>
										{#if p.lastModuleTitle}
											<p class="text-[9px] text-gray-500 truncate">{p.lastModuleTitle}</p>
										{/if}
									</div>
								{/if}

								<div class="flex items-center justify-between">
									<span class="text-[10px] text-gray-600">
										{#if p.lastActivity}
											🕐 {relativeTime(p.lastActivity)}
										{:else}
											🗓 {formatDate(p.firstSeenAt)}
										{/if}
									</span>
									<button
										on:click|stopPropagation={() => goto(`/course/${course.courseId}`)}
										class="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all
											{isComplete
												? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30'
												: 'bg-violet-600/20 text-violet-300 border border-violet-500/30 hover:bg-violet-600/40'}"
									>
										{#if isComplete}
											Review <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
										{:else if p.started}
											Continue <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
										{:else}
											Start <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
										{/if}
									</button>
								</div>
							</div>
						</div>
					</article>
				{/each}
			</div>

			<div class="mt-10 flex justify-center">
				<button
					on:click={() => goto('/course')}
					class="flex items-center gap-2 px-6 py-3 border border-white/10 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:border-violet-500/50 hover:bg-violet-600/10 transition-all"
				>
					<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
					Explore More Courses
				</button>
			</div>
		{/if}
	</main>
</div>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	article:focus {
		outline: 2px solid rgb(139 92 246 / 0.6);
		outline-offset: 2px;
	}
</style>