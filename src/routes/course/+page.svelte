<script>
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";

  export let data;
  const courses = data?.courseInfo?.records || [];
  // console.log(courses, "cogyuhjg");

  const levelColors = {
    Beginner: "bg-emerald-100 text-emerald-700",
    Intermediate: "bg-amber-100 text-amber-700",
    Advanced: "bg-rose-100 text-rose-700",
  };

  let search = data.search ?? "";
  let debounceTimer;

  function handleSearch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const params = new URLSearchParams($page.url.searchParams);
      params.set("search", search);
      params.set("page", "1");
      goto(`?${params.toString()}`, { keepFocus: true });
    }, 300);
  }

  function handleStart(courseId) {
    goto(`/course/${courseId}`);
  }

  // $: courses    = data.courses    ?? [];
  $: totalCount = data.totalCount ?? 0;
  $: currentPage = data.currentPage ?? 1;
</script>

<div class="min-h-screen bg-[#0f0f13] text-white">
  <!-- Hero Header -->
  <div
    class="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-[#0f0f13] via-[#1a1040] to-[#0f0f13]"
  >
    <div
      class="absolute inset-0 opacity-30"
      style="background-image: radial-gradient(circle at 20% 50%, #7c3aed33 0%, transparent 60%), radial-gradient(circle at 80% 20%, #f97316 0%, transparent 50%);"
    ></div>
    <div class="relative max-w-7xl mx-auto px-6 py-16">
      <p
        class="text-sm font-semibold tracking-widest text-violet-400 uppercase mb-3"
      >
        Your Learning Hub
      </p>
      <h1 class="text-5xl font-black tracking-tight mb-4">
        Explore <span
          class="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-orange-400"
          >Courses</span
        >
      </h1>
      <p class="text-gray-400 text-lg max-w-xl">
        Structured paths. Anti-skip videos. Gated assessments. Real
        certificates.
      </p>

      <!-- Search -->
      <!-- <div class="mt-8 relative w-full max-w-md">
        <svg
          class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
          />
        </svg>
        <input
          type="text"
          placeholder="Search courses..."
          bind:value={search}
          on:input={handleSearch}
          class="w-full pl-12 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent backdrop-blur-sm transition"
        />
      </div> -->
    </div>
  </div>

  <!-- Count bar -->
  <div class="max-w-7xl mx-auto px-6 py-4 flex items-center">
    <span class="text-sm text-gray-500">{courses.length} courses</span>
  </div>

  <!-- Course Grid -->
  <div
    class="max-w-7xl mx-auto px-6 pb-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
  >
    {#each courses as course (course._id ?? course.id)}
      <div
        class="group relative bg-[#1a1a2a] border border-white/10 rounded-2xl overflow-hidden flex flex-col hover:border-violet-500/50 hover:shadow-xl hover:shadow-violet-900/20 transition-all duration-300 cursor-pointer"
        on:click={() => handleStart(course?.courseId)}
        on:keydown={(e) => e.key === "Enter" && handleStart(course.courseId)}
        role="button"
        tabindex="0"
      >
        <!-- Thumbnail -->
        <div class="relative overflow-hidden">
          <img
            src={course.image}
            alt={course.title}
            on:error={(e) => (e.target.src = "/skillsblock.png")}
            class="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div
            class="absolute inset-0 bg-gradient-to-t from-[#1a1a2a] via-transparent to-transparent"
          ></div>

          <span
            class="absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full {levelColors[
              course.level
            ] || 'bg-gray-100 text-gray-700'}"
          >
            {course.level}
          </span>

          <!-- <span class="absolute top-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-yellow-400 text-xs font-bold px-2 py-1 rounded-full">
            ★ {course.rating ?? 0}
          </span> -->

          <!-- Play overlay -->
          <div
            class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          >
            <div
              class="w-14 h-14 rounded-full bg-violet-600/90 backdrop-blur-sm flex items-center justify-center shadow-xl"
            >
              <svg
                class="w-6 h-6 text-white ml-1"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Content -->
        <div class="p-5 flex flex-col flex-1">
          <!-- <span class="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-2">{course.category}</span> -->

          <h2
            class="font-bold text-white text-base leading-snug line-clamp-2 group-hover:text-violet-300 transition-colors"
          >
            {course.title}
          </h2>

          <p class="text-sm text-gray-500 mt-2 line-clamp-2">
            {course.description}
          </p>

          <!-- Instructor -->
          <div class="flex items-center gap-2 mt-4">
            <img
              src={course.instructorAvatar}
              alt={course.instructor}
              class="w-7 h-7 rounded-full bg-violet-800"
            />
            <span class="text-sm text-gray-400">{course.instructor}</span>
          </div>

          <!-- Meta -->
          <div class="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <span>📚 {course?.sectionsCount} Modules</span>
          </div>

          <!-- Tags -->

          <!-- CTA -->
          <button
            on:click|stopPropagation={() => handleStart(course?.courseId)}
            class="mt-5 w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 text-white text-sm font-bold hover:from-violet-500 hover:to-violet-400 transition-all duration-200 shadow-lg shadow-violet-900/30 flex items-center justify-center gap-2"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"
              ><path d="M8 5v14l11-7z" /></svg
            >
            Start Course
          </button>
        </div>
      </div>
    {/each}

    {#if courses.length === 0}
      <div class="col-span-full py-24 text-center text-gray-500">
        <p class="text-xl font-semibold">No courses found</p>
        <p class="text-sm mt-1">Try a different search</p>
      </div>
    {/if}
  </div>

  <!-- Pagination -->
  {#if totalCount > 10}
    {@const totalPages = Math.ceil(totalCount / 10)}
    <div class="max-w-7xl mx-auto px-6 pb-16 flex justify-center gap-2">
      {#each Array(totalPages) as _, i}
        {@const p = i + 1}
        <button
          on:click={() => {
            const params = new URLSearchParams($page.url.searchParams);
            params.set("page", String(p));
            goto(`?${params.toString()}`);
          }}
          class="w-9 h-9 rounded-lg text-sm font-semibold transition-all
            {currentPage === p
            ? 'bg-violet-600 text-white'
            : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'}"
        >
          {p}
        </button>
      {/each}
    </div>
  {/if}
</div>
