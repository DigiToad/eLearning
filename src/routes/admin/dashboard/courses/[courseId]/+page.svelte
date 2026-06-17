<script>
    import { enhance } from "$app/forms";
    import VideoForm from "$lib/components/VideoForm.svelte";
    import AssessmentForm from "$lib/components/AssessmentForm.svelte";
    import SectionModal from "$lib/components/SectionModalAdmin.svelte";

    export let data;
    export let form;

    $: sectionDocId = data?.sectionDocId ?? "";
    $: course = data?.course ?? null;
    $: sections = data?.sections ?? [];
    $: subSections = data?.subSections ?? [];
    $: courseStatus = course?.status ?? "draft";
    $: isPublished = courseStatus === "published";

    // Toast
    let toast = null;
    $: if (form?.success) {
        const messages = {
            video: "Video saved successfully!",
            assessment: "Assessment saved successfully!",
            access: isPublished
                ? "Course moved to draft."
                : "Course published!",
        };
        toast = { type: "success", message: messages[form.type] ?? "Saved!" };
        setTimeout(() => (toast = null), 3000);
    }
    $: if (form?.serverError) {
        toast = { type: "error", message: form.serverError };
        setTimeout(() => (toast = null), 4000);
    }

    let openSectionModal = false;
    let activeSectionIndex = 0;
    let activeLessonIndex = -1;
    let activeType = "video";
    let lessonPanelOpen = false; // ← key flag

    $: groupedSections = sections.map((section) => ({
        ...section,
        lessons: subSections.filter((l) => l.moduleSectionId === section._id),
    }));

    $: activeSection = groupedSections?.[activeSectionIndex] ?? null;
    $: activeLesson = activeSection?.lessons?.[activeLessonIndex] ?? null;

    // Progress
    $: sectionsWithLesson = groupedSections.filter(
        (s) => s.lessons.length > 0,
    ).length;
    $: totalSections = groupedSections.length;
    $: progressPct =
        totalSections > 0
            ? Math.round((sectionsWithLesson / totalSections) * 100)
            : 0;
    $: isComplete = progressPct === 100 && totalSections > 0;

    const typeIcon = { video: "🎬", assessment: "📝" };
    const typeLabel = { video: "Video Lesson", assessment: "Assessment" };

    function openAddLesson() {
        activeLessonIndex = -1;
        activeType = "video";
        lessonPanelOpen = true;
    }

    function openEditLesson(index, lesson) {
        activeLessonIndex = index;
        activeType = lesson.type;
        lessonPanelOpen = true;
    }

    // Reset panel when switching sections
    function switchSection(index) {
        activeSectionIndex = index;
        activeLessonIndex = -1;
        lessonPanelOpen = false;
    }
</script>

<div
    class="min-h-screen bg-[#07090e] text-white"
    style="font-family:'DM Sans',sans-serif;"
>
    <!-- BACKGROUND -->
    <div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
            class="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full
                    bg-violet-600/10 blur-[140px]"
        ></div>
        <div
            class="absolute bottom-0 right-0 w-[420px] h-[420px] rounded-full
                    bg-fuchsia-700/5 blur-[120px]"
        ></div>
    </div>

    <!-- TOAST -->
    {#if toast}
        <div
            class="fixed bottom-5 right-5 z-[100] flex items-center gap-3
                    px-5 py-3 rounded-2xl shadow-xl border text-sm font-semibold
                    {toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/90 border-rose-500/30 text-rose-300'}"
        >
            <span>{toast.type === "success" ? "✓" : "✗"}</span>
            {toast.message}
        </div>
    {/if}

    <!-- HEADER -->
    <div class="border-b border-white/[0.05] bg-[#0a0c12]/80 backdrop-blur-md">
        <div class="px-6 py-5">
            <!-- TOP ROW -->
            <div
                class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5"
            >
                <div class="flex items-center gap-4">
                    <a
                        href="/admin/dashboard/abc"
                        class="w-9 h-9 rounded-xl bg-zinc-800 hover:bg-zinc-700 flex items-center
                              justify-center text-zinc-400 hover:text-white transition-all flex-shrink-0"
                        title="Back to courses">←</a
                    >
                    <div>
                        <div class="flex items-center gap-3 flex-wrap">
                            <h1 class="text-2xl font-bold">{course?.title}</h1>
                            <span
                                class="px-3 py-1 rounded-full text-xs font-semibold
                                         {isPublished
                                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                                    : 'bg-zinc-500/10 border border-zinc-500/20 text-zinc-400'}"
                            >
                                {isPublished ? "🟢 Published" : "⚪ Draft"}
                            </span>
                        </div>
                        <p class="text-sm text-zinc-500 mt-1">
                            Manage sections, lessons & chapters.
                        </p>
                    </div>
                </div>

                <div class="flex items-center gap-3">
                    <!-- <a
                        href="/course/{course?.courseId}/preview"
                        target="_blank"
                        class="px-5 py-2.5 rounded-2xl border border-white/10 text-sm
                              font-semibold text-zinc-300 hover:bg-white/5 transition-all"
                    >
                        Preview ↗
                    </a> -->

                    {#if isPublished}
                        <form
                            method="POST"
                            action="?/access"
                            use:enhance={() => {
                                return async ({ update }) => {
                                    await update({ reset: false });
                                };
                            }}
                        >
                            <input
                                type="hidden"
                                name="courseId"
                                value={course?.courseId}
                            />
                            <input type="hidden" name="status" value="draft" />
                            <button
                                type="submit"
                                class="px-6 py-2.5 rounded-2xl bg-zinc-700 hover:bg-zinc-600
                                       text-sm font-semibold transition-all text-zinc-200"
                            >
                                ⚪ Move to Draft
                            </button>
                        </form>
                    {:else if isComplete}
                        <form
                            method="POST"
                            action="?/access"
                            use:enhance={() => {
                                return async ({ update }) => {
                                    await update({ reset: false });
                                };
                            }}
                        >
                            <input
                                type="hidden"
                                name="courseId"
                                value={course?.courseId}
                            />
                            <input
                                type="hidden"
                                name="status"
                                value="published"
                            />
                            <button
                                type="submit"
                                class="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500
                                       text-sm font-semibold transition-all"
                            >
                                🚀 Publish Course
                            </button>
                        </form>
                    {:else}
                        <button
                            disabled
                            class="px-6 py-2.5 rounded-2xl bg-zinc-800 text-zinc-600
                                   text-sm font-semibold cursor-not-allowed"
                        >
                            🚀 Publish ({progressPct}%)
                        </button>
                    {/if}
                </div>
            </div>

            <!-- PROGRESS BAR -->
            <div class="mt-5">
                <div class="flex items-center justify-between mb-2">
                    <p
                        class="text-[0.65rem] uppercase tracking-[0.15em] text-zinc-600 font-bold"
                    >
                        Course Completion
                    </p>
                    <p
                        class="text-xs font-semibold {isComplete
                            ? 'text-emerald-400'
                            : 'text-violet-400'}"
                    >
                        {sectionsWithLesson}/{totalSections} sections · {progressPct}%
                    </p>
                </div>
                <div
                    class="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden"
                >
                    <div
                        class="h-full rounded-full transition-all duration-500
                                {isComplete
                            ? 'bg-emerald-500'
                            : 'bg-violet-500'}"
                        style="width: {progressPct}%"
                    ></div>
                </div>
            </div>

            <!-- SECTION TABS -->
            <div class="flex items-center gap-3 mt-5 overflow-x-auto pb-1">
                <button
                    on:click={() => (openSectionModal = true)}
                    class="flex-shrink-0 px-5 py-3 rounded-2xl border border-dashed
                           border-violet-500/40 text-violet-400 hover:bg-violet-500/10
                           text-sm font-semibold transition-all"
                >
                    + Add Section
                </button>

                {#each groupedSections as sec, index}
                    <button
                        on:click={() => switchSection(index)}
                        class="flex-shrink-0 min-w-[220px] px-5 py-4 rounded-2xl
                               text-left transition-all
                               {activeSectionIndex === index
                            ? 'bg-violet-600 text-white'
                            : 'bg-[#12151d] text-zinc-400 hover:bg-[#1a1e29] hover:text-white'}"
                    >
                        <div class="flex items-center justify-between">
                            <p class="text-sm font-semibold">{sec.title}</p>
                            {#if sec.lessons.length > 0}
                                <span
                                    class="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0"
                                ></span>
                            {/if}
                        </div>
                        <p class="text-xs opacity-70 mt-1">
                            {sec.lessons.length} lessons
                        </p>
                    </button>
                {/each}
            </div>
        </div>
    </div>

    <!-- BODY -->
    <div class="flex h-[calc(100vh-240px)]">
        <!-- LEFT SIDEBAR -->
        <aside
            class="w-80 flex-shrink-0 border-r border-white/[0.05] bg-[#0a0c12]/50 flex flex-col"
        >
            <div class="px-5 py-5 border-b border-white/[0.05]">
                <div class="flex items-center justify-between">
                    <div>
                        <p
                            class="text-[0.6rem] uppercase tracking-[0.2em] text-zinc-600 font-bold mb-2"
                        >
                            Current Section
                        </p>
                        <h2 class="text-lg font-bold text-zinc-200">
                            {activeSection?.title}
                        </h2>
                    </div>
                    <button
                        on:click={openAddLesson}
                        class="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500
                               text-xs font-semibold transition-all"
                    >
                        + Lesson
                    </button>
                </div>
            </div>

            <div class="flex-1 overflow-y-auto px-4 py-5">
                <div class="flex items-center justify-between mb-4">
                    <p
                        class="text-[0.6rem] uppercase tracking-[0.2em] text-zinc-600 font-bold"
                    >
                        Lessons
                    </p>
                    <span class="text-xs text-zinc-600">
                        {activeSection?.lessons?.length ?? 0}
                    </span>
                </div>

                {#if activeSection?.lessons?.length > 0}
                    <div class="space-y-2">
                        {#each activeSection.lessons as lesson, index}
                            <button
                                on:click={() => openEditLesson(index, lesson)}
                                class="w-full text-left bg-[#11141d] border rounded-2xl p-4
                                       transition-all
                                       {activeLessonIndex === index &&
                                lessonPanelOpen
                                    ? 'border-violet-500 bg-violet-600/10'
                                    : 'border-white/[0.05] hover:border-white/10'}"
                            >
                                <div class="flex items-center gap-3">
                                    <span class="text-lg"
                                        >{lesson.type === "video"
                                            ? "🎬"
                                            : "📝"}</span
                                    >
                                    <div class="flex-1 min-w-0">
                                        <p
                                            class="text-sm font-semibold text-zinc-200 truncate"
                                        >
                                            {lesson.title}
                                        </p>
                                        <p
                                            class="text-xs text-zinc-600 capitalize"
                                        >
                                            {lesson.type}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        {/each}
                    </div>
                {:else}
                    <div
                        class="rounded-2xl border border-dashed border-white/10 p-8 text-center"
                    >
                        <p class="text-sm text-zinc-500">
                            No lessons added yet
                        </p>
                        <button
                            on:click={openAddLesson}
                            class="mt-4 px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500
                                   text-sm font-semibold transition-all"
                        >
                            Add First Lesson
                        </button>
                    </div>
                {/if}
            </div>
        </aside>

        <!-- MAIN -->
        <main class="flex-1 overflow-y-auto px-8 py-8">
            <div class="max-w-5xl mx-auto">
                {#if !lessonPanelOpen}
                    <!-- Empty state — nothing selected yet -->
                    <div
                        class="flex flex-col items-center justify-center h-full min-h-[400px] text-center"
                    >
                        <div
                            class="w-20 h-20 rounded-3xl bg-violet-500/10 border border-violet-500/20
                                    flex items-center justify-center text-4xl mb-6"
                        >
                            🎬
                        </div>
                        <h2 class="text-xl font-bold text-zinc-300">
                            No lesson selected
                        </h2>
                        <p class="text-sm text-zinc-600 mt-2 max-w-xs">
                            Click <span class="text-violet-400 font-semibold"
                                >+ Lesson</span
                            > to add a new lesson, or select an existing lesson from
                            the sidebar.
                        </p>
                        <button
                            on:click={openAddLesson}
                            class="mt-6 px-6 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500
                                   text-sm font-semibold transition-all"
                        >
                            + Add Lesson for {activeSection?.title}
                        </button>
                    </div>
                {:else}
                    <div class="mb-8">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <span class="text-3xl"
                                    >{typeIcon[activeType]}</span
                                >
                                <div>
                                    <h2 class="text-2xl font-bold">
                                        {activeLessonIndex === -1
                                            ? `Create ${typeLabel[activeType]} for ${activeSection?.title}`
                                            : activeLesson?.title}
                                    </h2>
                                    <p class="text-sm text-zinc-500 mt-1">
                                        {activeLessonIndex === -1
                                            ? "Add a new lesson"
                                            : activeLesson?.type === "video"
                                              ? "Manage lesson video"
                                              : "Manage assessment"}
                                    </p>
                                </div>
                            </div>

                            {#if activeLessonIndex === -1}
                                <div class="flex items-center gap-2">
                                    {#each ["video", "assessment"] as type}
                                        <button
                                            on:click={() => (activeType = type)}
                                            class="px-4 py-2 rounded-xl text-sm transition-all
                                                   {activeType === type
                                                ? 'bg-violet-600 text-white'
                                                : 'bg-[#161922] text-zinc-400'}"
                                        >
                                            {typeLabel[type]}
                                        </button>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                    </div>

                    <div
                        class="bg-[#0d1017] border border-white/[0.05] rounded-3xl p-7"
                    >
                        {#if activeLessonIndex === -1 && activeType === "video"}
                            <VideoForm
                                courseId={course?.courseId}
                                sectionId={sectionDocId}
                                moduleSectionId={activeSection?._id}
                                {form}
                            />
                        {:else if activeLessonIndex === -1 && activeType === "assessment"}
                            <AssessmentForm
                                courseId={course?.courseId}
                                sectionId={sectionDocId}
                                moduleSectionId={activeSection?._id}
                                {form}
                            />
                        {:else if activeLesson?.type === "video"}
                            <VideoForm
                                lesson={activeLesson}
                                courseId={course?.courseId}
                                sectionId={sectionDocId}
                                moduleSectionId={activeSection?._id}
                                {form}
                            />
                        {:else}
                            <AssessmentForm
                                lesson={activeLesson}
                                courseId={course?.courseId}
                                sectionId={sectionDocId}
                                moduleSectionId={activeSection?._id}
                                {form}
                            />
                        {/if}
                    </div>
                {/if}
            </div>
        </main>
    </div>
</div>

<SectionModal bind:open={openSectionModal} courseId={course?.courseId} {form} />