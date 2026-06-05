<script>
    import SectionModal from "$lib/components/SectionModalAdmin.svelte";
    import Courseinfo from "$lib/components/Courseinfo.svelte";
    import { PUBLIC_ADMIN_URL } from "$env/static/public";

    export let data;
    export let form;
    let toast = null;
    let toastTimer = null;
    $: courses = data?.courseInfo?.records || [];

    let openSectionModal = false;
    let openCreateCourse = false;
    let openEditCourse = false;
    let selectedCourseId = "";
    let editingCourse = null; // ← holds course being edited

    function handleOpenSections(course) {
        selectedCourseId = course.courseId;
        openSectionModal = true;
    }

    function handleEditCourse(course) {
        editingCourse = course;
        openEditCourse = true;
        form = null; // ← clear stale form state
    }
    function showToast(e) {
        clearTimeout(toastTimer);
        toast = e.detail;
        toastTimer = setTimeout(() => (toast = null), 3500);
    }
</script>

<!-- Section Modal -->
<SectionModal bind:open={openSectionModal} courseId={selectedCourseId} />

<!-- ── Create Course Modal ───────────────────────────────────────────────── -->
{#if openCreateCourse}
    <div
        class="fixed inset-0 z-50 flex items-start justify-center
              backdrop-blur-sm overflow-y-auto py-8 px-4"
        on:click|self={() => (openCreateCourse = false)}
        role="dialog"
        aria-modal="true"
        aria-label="Create new course"
    >
        <div class="relative w-full max-w-2xl">
            <button
                type="button"
                on:click={() => (openCreateCourse = false)}
                class="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full
                       bg-zinc-800 border border-white/10 text-zinc-400
                       hover:text-white hover:bg-zinc-700 transition-all
                       flex items-center justify-center text-sm leading-none"
                aria-label="Close">✕</button
            >
            <Courseinfo
                {form}
                on:notify={showToast}
                onSuccess={() => (openCreateCourse = false)}
            />
        </div>
    </div>
{/if}

<!-- ── Edit Course Modal ─────────────────────────────────────────────────── -->
{#if openEditCourse && editingCourse}
    <div
        class="fixed inset-0 z-50 flex items-start justify-center
              backdrop-blur-sm overflow-y-auto py-8 px-4"
        on:click|self={() => (openEditCourse = false)}
        role="dialog"
        aria-modal="true"
        aria-label="Edit course"
    >
        <div class="relative w-full max-w-2xl">
            <button
                type="button"
                on:click={() => (openEditCourse = false)}
                class="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full
                       bg-zinc-800 border border-white/10 text-zinc-400
                       hover:text-white hover:bg-zinc-700 transition-all
                       flex items-center justify-center text-sm leading-none"
                aria-label="Close">✕</button
            >
            <Courseinfo
                {form}
                course={editingCourse}
                isEdit={true}
                on:notify={showToast}
                onSuccess={() => (openEditCourse = false)}
            />
        </div>
    </div>
{/if}

<!-- ── Main Page ─────────────────────────────────────────────────────────── -->
<div class="w-full max-w-7xl mx-auto px-6 py-8">
    <div class="flex items-center justify-between mb-8">
        <div>
            <p
                class="text-violet-400 text-xs uppercase tracking-[0.2em] font-bold"
            >
                LMS Dashboard
            </p>
            <h1 class="text-3xl font-bold text-primary-500 mt-2">
                Course Builder
            </h1>
        </div>
        <button
            on:click={() => (openCreateCourse = true)}
            class="px-6 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-all"
        >
            + Create New Course
        </button>
    </div>

    {#if courses.length > 0}
        <div class="space-y-5">
            {#each courses as course}
                <div
                    class="bg-[#0d0f17] border border-white/10 rounded-3xl overflow-hidden
                            hover:border-violet-500/30 transition-all duration-300"
                >
                    <div class="flex flex-col lg:flex-row">
                        <!-- Left Image -->
                        <div class="lg:w-[220px] h-[220px] lg:h-auto">
                            <img
                                src={course.image}
                                alt={course.title}
                                class="w-full h-full object-cover"
                            />
                        </div>

                        <!-- Right Content -->
                        <div class="flex-1 p-6 flex flex-col justify-between">
                            <div>
                                <div
                                    class="flex items-center justify-between mb-4"
                                >
                                    <div class="flex items-center gap-3">
                                        <span
                                            class="px-3 py-1 rounded-full text-xs bg-violet-500/10 text-violet-300 border border-violet-500/20"
                                        >
                                            {course?.sections?.length} Modules
                                        </span>
                                        <span
                                            class="px-3 py-1 rounded-full text-xs bg-violet-500/10 text-violet-300 border border-violet-500/20"
                                        >
                                            {course.level}
                                        </span>
                                        <span
                                            class="px-3 py-1 rounded-full text-xs bg-zinc-800 text-zinc-300"
                                        >
                                            {course.status}
                                        </span>
                                    </div>
                                    <p class="text-2xl font-bold text-white">
                                        ₹ {course.price}
                                    </p>
                                </div>

                                <h2 class="text-2xl font-bold text-white">
                                    {course.title}
                                </h2>
                                <p
                                    class="text-zinc-400 text-sm leading-relaxed mt-4 max-w-3xl"
                                >
                                    {course.description}
                                </p>
                            </div>

                            <div
                                class="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5 mt-8"
                            >
                                <!-- Instructor -->
                                <div class="flex items-center gap-3">
                                    <img
                                        src={course.instructorAvatar}
                                        alt={course.instructor}
                                        class="w-11 h-11 rounded-full border border-white/10"
                                    />
                                    <div>
                                        <p
                                            class="text-white font-semibold text-sm"
                                        >
                                            {course.instructor}
                                        </p>
                                        <p class="text-zinc-500 text-xs">
                                            Course Instructor
                                        </p>
                                    </div>
                                </div>

                                <!-- Actions -->
                                <div class="flex items-center gap-3">
                                    <!-- Edit Course Info -->
                                    <button
                                        on:click={() =>
                                            handleEditCourse(course)}
                                        class="inline-flex items-center justify-center
                                               px-5 py-3 rounded-2xl bg-zinc-700
                                               hover:bg-zinc-600 text-white
                                               text-sm font-semibold transition-all"
                                    >
                                         Edit Info
                                    </button>

                                    <a
                                        href={`${PUBLIC_ADMIN_URL}/admin/dashboard/abc/${course.courseId}`}
                                        class="inline-flex items-center justify-center
                                               px-5 py-3 rounded-2xl bg-zinc-800
                                               hover:bg-zinc-700 text-white
                                               text-sm font-semibold transition-all"
                                    >
                                        Manage Course
                                    </a>

                                    {#if course?.sections?.length <= 0}
                                        <button
                                            on:click={() =>
                                                handleOpenSections(course)}
                                            class="px-5 py-3 rounded-2xl bg-violet-600
                                                   hover:bg-violet-500 text-white
                                                   text-sm font-semibold transition-all"
                                        >
                                            + Add Modules
                                        </button>
                                    {/if}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    {:else}
        <div
            class="bg-[#0d0f17] border border-dashed border-white/10 rounded-3xl py-24 px-6 text-center"
        >
            <div
                class="w-20 h-20 rounded-3xl bg-violet-500/10 border border-violet-500/20
                        flex items-center justify-center text-3xl mx-auto"
            >
                📚
            </div>
            <h2 class="text-2xl font-bold text-white mt-6">
                No Courses Available
            </h2>
            <p class="text-zinc-500 mt-3">
                Create your first LMS course to get started.
            </p>
        </div>
    {/if}
</div>
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
