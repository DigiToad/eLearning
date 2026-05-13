<script>
	import { goto } from '$app/navigation';
	import courses from '$lib/data/Courses.json';

	let search = '';
	let activeCategory = 'All';

	const categories = ['All', 'Development', 'AI', 'Design'];

	const levelColors = {
		Beginner: 'bg-emerald-100 text-emerald-700',
		Intermediate: 'bg-amber-100 text-amber-700',
		Advanced: 'bg-rose-100 text-rose-700'
	};

	$: filteredCourses = courses.filter((c) => {
		return (
			(activeCategory === 'All' || c.category === activeCategory) &&
			c.title.toLowerCase().includes(search.toLowerCase())
		);
	});

	function handleStart(courseId) {
		goto(`/learn/${courseId}`);
	}
</script>

<div class="min-h-screen bg-[#0f0f13] text-white">
	<!-- Hero Header -->
	<div class="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-[#0f0f13] via-[#1a1040] to-[#0f0f13]">
		<div
			class="absolute inset-0 opacity-30"
			style="background-image: radial-gradient(circle at 20% 50%, #7c3aed33 0%, transparent 60%), radial-gradient(circle at 80% 20%, #f97316 0%, transparent 50%);"
		></div>
		<div class="relative max-w-7xl mx-auto px-6 py-16">
			<p class="text-sm font-semibold tracking-widest text-violet-400 uppercase mb-3">Your Learning Hub</p>
			<h1 class="text-5xl font-black tracking-tight mb-4">
				Explore <span class="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-orange-400">Courses</span>
			</h1>
			<p class="text-gray-400 text-lg max-w-xl">
				Structured paths. Anti-skip videos. Gated assessments. Real certificates.
			</p>

			<!-- Search -->
			<div class="mt-8 relative w-full max-w-md">
				<svg class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
				</svg>
				<input
					type="text"
					placeholder="Search courses..."
					bind:value={search}
					class="w-full pl-12 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent backdrop-blur-sm transition"
				/>
			</div>
		</div>
	</div>

	<!-- Category Filters -->
	<div class="max-w-7xl mx-auto px-6 py-6 flex gap-3 flex-wrap items-center">
		{#each categories as cat}
			<button
				on:click={() => (activeCategory = cat)}
				class="px-5 py-2 rounded-full text-sm font-semibold border transition-all duration-200
				{activeCategory === cat
					? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-900/40'
					: 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'}"
			>
				{cat}
			</button>
		{/each}
		<span class="ml-auto text-sm text-gray-500">{filteredCourses.length} courses</span>
	</div>

	<!-- Course Grid -->
	<div class="max-w-7xl mx-auto px-6 pb-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
		{#each filteredCourses as course (course.id)}
			<div
				class="group relative bg-[#1a1a2a] border border-white/10 rounded-2xl overflow-hidden flex flex-col hover:border-violet-500/50 hover:shadow-xl hover:shadow-violet-900/20 transition-all duration-300 cursor-pointer"
				on:click={() => handleStart(course.id)}
				on:keydown={(e) => e.key === 'Enter' && handleStart(course.id)}
				role="button"
				tabindex="0"
			>
				<!-- Thumbnail -->
				<div class="relative overflow-hidden">
					<img
						src={course.image}
						alt={course.title}
						class="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-500"
					/>
					<div class="absolute inset-0 bg-gradient-to-t from-[#1a1a2a] via-transparent to-transparent"></div>

					<span class="absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full {levelColors[course.level] || 'bg-gray-100 text-gray-700'}">
						{course.level}
					</span>

					<span class="absolute top-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-yellow-400 text-xs font-bold px-2 py-1 rounded-full">
						★ {course.rating}
					</span>

					<!-- Play overlay on hover -->
					<div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
						<div class="w-14 h-14 rounded-full bg-violet-600/90 backdrop-blur-sm flex items-center justify-center shadow-xl">
							<svg class="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
								<path d="M8 5v14l11-7z" />
							</svg>
						</div>
					</div>
				</div>

				<!-- Content -->
				<div class="p-5 flex flex-col flex-1">
					<span class="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-2">{course.category}</span>

					<h2 class="font-bold text-white text-base leading-snug line-clamp-2 group-hover:text-violet-300 transition-colors">
						{course.title}
					</h2>

					<p class="text-sm text-gray-500 mt-2 line-clamp-2">{course.description}</p>

					<!-- Instructor -->
					<div class="flex items-center gap-2 mt-4">
						<img src={course.instructorAvatar} alt={course.instructor} class="w-7 h-7 rounded-full bg-violet-800" />
						<span class="text-sm text-gray-400">{course.instructor}</span>
					</div>

					<!-- Meta -->
					<div class="flex items-center gap-4 mt-3 text-xs text-gray-500">
						<span>⏱ {course.duration}</span>
						<span>📚 {course.totalLessons} lessons</span>
						<span>👥 {course.students.toLocaleString()}</span>
					</div>

					<!-- Tags -->
					<div class="flex flex-wrap gap-1.5 mt-3">
						{#each course.tags.slice(0, 3) as tag}
							<span class="text-xs bg-white/5 border border-white/10 text-gray-400 px-2 py-0.5 rounded-md">{tag}</span>
						{/each}
					</div>

					<!-- CTA -->
					<button
						on:click|stopPropagation={() => handleStart(course.id)}
						class="mt-5 w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 text-white text-sm font-bold hover:from-violet-500 hover:to-violet-400 transition-all duration-200 shadow-lg shadow-violet-900/30 flex items-center justify-center gap-2"
					>
						<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
						Start Course
					</button>
				</div>
			</div>
		{/each}

		{#if filteredCourses.length === 0}
			<div class="col-span-full py-24 text-center text-gray-500">
				<p class="text-xl font-semibold">No courses found</p>
				<p class="text-sm mt-1">Try a different search or category</p>
			</div>
		{/if}
	</div>
</div>