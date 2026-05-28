<script>
    import { enhance } from "$app/forms";
    import { goto } from "$app/navigation";

    export let data;
    export let form;

    let { users, courses, pagination, search: initialSearch } = data;

    /**
     * selectedCourses: { [userId]: Set<courseId> }
     * Tracks which courses are checked for each user (multi-select).
     */
    let selectedCourses = {};
    let dropdownOpen = {}; // { [userId]: boolean }
    let loadingRow = {};
    let searchQuery = initialSearch || "";
    let searchLoading = false;

    $: toast = form
        ? { msg: form.message, type: form.success ? "success" : "error" }
        : null;
    $: ({ page: currentPage, totalPages, total, pageSize } = pagination);

    // Auto-dismiss toast after 4 s
    $: if (toast) {
        setTimeout(() => {
            toast = null;
        }, 3000);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    function getSelected(userId) {
        return selectedCourses[userId] ?? new Set();
    }

    /** Returns array of already-granted courseIds for a user (handles String or [String] schema) */
    function getGranted(user) {
        const val = user.accessedcourse;
        if (!val) return [];
        return Array.isArray(val) ? val : [val];
    }

    /** True if this course._id is already granted (compares via courseId or _id) */
    function isAlreadyGranted(user, courseMongoId) {
        const granted = getGranted(user);
        const course = courses.find((c) => c._id === courseMongoId);
        if (!course) return false;
        const id = String(course.courseId || course._id);
        return granted.map(String).includes(id);
    }

    function toggleCourse(userId, courseId, user) {
        if (isAlreadyGranted(user, courseId)) return; // block re-selecting granted courses
        const set = new Set(getSelected(userId));
        set.has(courseId) ? set.delete(courseId) : set.add(courseId);
        selectedCourses = { ...selectedCourses, [userId]: set };
    }

    function selectedLabel(userId) {
        const set = getSelected(userId);
        if (set.size === 0) return "Select new courses…";
        if (set.size === 1) {
            const id = [...set][0];
            const c = courses.find((c) => c._id === id);
            return c ? c.title : "1 course";
        }
        return `${set.size} new courses selected`;
    }

    function toggleDropdown(userId) {
        dropdownOpen = {
            ...Object.fromEntries(
                Object.keys(dropdownOpen).map((k) => [k, false]),
            ),
            [userId]: !dropdownOpen[userId],
        };
    }

    function closeAll() {
        dropdownOpen = {};
    }

    // ── Form enhance: Grant (multi-course) ───────────────────────────────────
    function handleGrantEnhance(userId, userEmail) {
        return ({ formData, cancel }) => {
            const set = getSelected(userId);
            if (set.size === 0) {
                cancel();
                return;
            }

            const selected = [...set]
                .map((id) => {
                    const c = courses.find((c) => c._id === id);
                    return c
                        ? {
                              courseId: c.courseId || c._id,
                              courseTitle: c.title,
                          }
                        : null;
                })
                .filter(Boolean);

            if (selected.length === 0) {
                cancel();
                return;
            }

            formData.set("email", userEmail);
            formData.set("coursesJson", JSON.stringify(selected));
            loadingRow = { ...loadingRow, [`grant_${userId}`]: true };

            return async ({ update }) => {
                await update({ reset: false });
                loadingRow = { ...loadingRow, [`grant_${userId}`]: false };
                selectedCourses = { ...selectedCourses, [userId]: new Set() };
            };
        };
    }

    // ── Form enhance: Revoke ─────────────────────────────────────────────────
    function handleRevokeEnhance(userId) {
        return ({ formData, cancel }) => {
            const set = getSelected(userId);
            if (set.size === 0) {
                cancel();
                return;
            }

            const selected = [...set]
                .map((id) => {
                    const c = courses.find((c) => c._id === id);
                    return c
                        ? {
                              courseId: c.courseId || c._id,
                              courseTitle: c.title,
                          }
                        : null;
                })
                .filter(Boolean);

            if (selected.length === 0) {
                cancel();
                return;
            }

            formData.set("coursesJson", JSON.stringify(selected));
            loadingRow = { ...loadingRow, [`revoke_${userId}`]: true };

            return async ({ update }) => {
                await update({ reset: false });
                loadingRow = { ...loadingRow, [`revoke_${userId}`]: false };
                selectedCourses = { ...selectedCourses, [userId]: new Set() };
            };
        };
    }

    // ── Navigation ───────────────────────────────────────────────────────────
    async function handleSearch(e) {
        e.preventDefault();
        searchLoading = true;
        await goto(`?search=${encodeURIComponent(searchQuery)}&page=1`, {
            invalidateAll: true,
        });
        searchLoading = false;
    }

    async function clearSearch() {
        searchQuery = "";
        searchLoading = true;
        await goto(`?search=&page=1`, { invalidateAll: true });
        searchLoading = false;
    }

    async function goToPage(p) {
        await goto(`?search=${encodeURIComponent(searchQuery)}&page=${p}`, {
            invalidateAll: true,
        });
    }

    function pageRange(current, total) {
        const delta = 2;
        const range = [];
        for (
            let i = Math.max(1, current - delta);
            i <= Math.min(total, current + delta);
            i++
        ) {
            range.push(i);
        }
        return range;
    }
</script>

<svelte:head>
    <title>Registrants | Admin</title>
</svelte:head>

<!-- Click-outside to close dropdowns -->
<svelte:window on:click={closeAll} />

<!-- Toast -->
{#if toast}
    <div
        class="fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-semibold max-w-sm shadow-xl
        {toast.type === 'success'
            ? 'bg-emerald-950 border border-emerald-400 text-emerald-400'
            : 'bg-red-950 border border-red-400 text-red-400'}"
    >
        {toast.msg}
    </div>
{/if}

<div class="min-h-screen bg-slate-950 text-slate-200">
    <!-- Header -->
    <div class="border-b border-slate-800 px-6 py-8">
        <div class="max-w-screen-xl mx-auto">
            <span
                class="inline-block text-xs font-mono tracking-widest uppercase text-emerald-400 bg-emerald-950 border border-emerald-900 px-2 py-1 rounded mb-3"
            >
                Admin · Registrants
            </span>
            <h1 class="text-3xl font-bold text-white tracking-tight">
                Access <span class="text-emerald-400">Management</span>
            </h1>
            <p class="mt-1 text-xs font-mono text-slate-500">
                {total} total users · {courses.length} courses available
            </p>
        </div>
    </div>

    <div class="max-w-screen-xl mx-auto px-6 py-6">
        <!-- Search Bar -->
        <form on:submit={handleSearch} class="flex gap-2 mb-6">
            <div class="relative flex-1 max-w-md">
                <svg
                    class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
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
                    bind:value={searchQuery}
                    placeholder="Search by email or institution…"
                    class="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg
                           pl-9 pr-4 py-2.5 placeholder-slate-600
                           focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30
                           transition-colors"
                />
            </div>
            <button
                type="submit"
                disabled={searchLoading}
                class="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold
                       text-sm px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2"
            >
                {#if searchLoading}
                    <svg
                        class="w-4 h-4 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            class="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            stroke-width="4"
                        />
                        <path
                            class="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v8H4z"
                        />
                    </svg>
                {/if}
                Search
            </button>
            {#if initialSearch}
                <button
                    type="button"
                    on:click={clearSearch}
                    class="bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium
                           px-4 py-2.5 rounded-lg transition-colors border border-slate-700"
                >
                    Clear
                </button>
            {/if}
        </form>

        {#if initialSearch}
            <p class="text-xs text-slate-500 mb-4 font-mono">
                Results for <span class="text-emerald-400"
                    >"{initialSearch}"</span
                >
                · {total} match{total !== 1 ? "es" : ""}
            </p>
        {/if}

        <!-- Table -->
        <div class="rounded-xl border border-slate-800 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="border-b border-slate-800 bg-slate-900/60">
                            <th
                                class="text-left px-4 py-3 text-xs font-mono uppercase tracking-widest text-slate-500 w-10"
                                >#</th
                            >
                            <th
                                class="text-left px-4 py-3 text-xs font-mono uppercase tracking-widest text-slate-500"
                                >Name</th
                            >
                            <th
                                class="text-left px-4 py-3 text-xs font-mono uppercase tracking-widest text-slate-500"
                                >Email</th
                            >
                            <th
                                class="text-left px-4 py-3 text-xs font-mono uppercase tracking-widest text-slate-500"
                                >Phone</th
                            >
                            <th
                                class="text-left px-4 py-3 text-xs font-mono uppercase tracking-widest text-slate-500"
                                >Institution</th
                            >
                            <th
                                class="text-left px-4 py-3 text-xs font-mono uppercase tracking-widest text-slate-500"
                                >Accessed Course</th
                            >
                            <th
                                class="text-left px-4 py-3 text-xs font-mono uppercase tracking-widest text-slate-500"
                                >Select Courses</th
                            >
                            <th
                                class="text-left px-4 py-3 text-xs font-mono uppercase tracking-widest text-slate-500"
                                >Actions</th
                            >
                        </tr>
                    </thead>
                    <tbody>
                        {#if users.length === 0}
                            <tr>
                                <td
                                    colspan="8"
                                    class="text-center py-16 text-slate-600 font-mono text-sm"
                                >
                                    {initialSearch
                                        ? `No results for "${initialSearch}"`
                                        : "No registrants found."}
                                </td>
                            </tr>
                        {:else}
                            {#each users as user, i}
                                {@const isGrantLoading =
                                    loadingRow[`grant_${user.userId}`]}
                                {@const isRevokeLoading =
                                    loadingRow[`revoke_${user.userId}`]}
                                {@const anyLoading =
                                    isGrantLoading || isRevokeLoading}

                                <tr
                                    class="border-b border-slate-800/60 hover:bg-slate-900/40 transition-colors
                                           {anyLoading
                                        ? 'opacity-50 pointer-events-none'
                                        : ''}"
                                >
                                    <!-- # -->
                                    <td
                                        class="px-4 py-3 font-mono text-xs text-slate-600"
                                    >
                                        {(currentPage - 1) * pageSize + i + 1}
                                    </td>

                                    <!-- Name -->
                                    <td
                                        class="px-4 py-3 font-semibold text-slate-100"
                                        >{user.name || "—"}</td
                                    >

                                    <!-- Email -->
                                    <td
                                        class="px-4 py-3 font-mono text-xs text-slate-400"
                                        >{user.email}</td
                                    >

                                    <!-- Phone -->
                                    <td
                                        class="px-4 py-3 font-mono text-xs text-slate-400"
                                        >{user.phone || "—"}</td
                                    >

                                    <!-- Institution -->
                                    <td class="px-4 py-3 text-slate-300"
                                        >{user.institution || "—"}</td
                                    >

                                    <!-- Currently Accessed Courses (array) -->
                                    <td class="px-4 py-3">
                                        {#if getGranted(user).length > 0}
                                            <div class="flex flex-col gap-1.5">
                                                {#each getGranted(user) as gid}
                                                    <div
                                                        class="inline-flex items-center gap-1 w-fit
                                                                group rounded-md overflow-hidden
                                                                border border-emerald-900"
                                                    >
                                                        <!-- Course title -->
                                                        <span
                                                            class="inline-flex items-center gap-1 pl-2 pr-1.5 py-0.5
                                                                     text-xs font-mono font-semibold
                                                                     bg-emerald-950 text-emerald-400"
                                                        >
                                                            <svg
                                                                class="w-2.5 h-2.5 shrink-0"
                                                                fill="currentColor"
                                                                viewBox="0 0 20 20"
                                                            >
                                                                <path
                                                                    fill-rule="evenodd"
                                                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                                    clip-rule="evenodd"
                                                                />
                                                            </svg>
                                                            {courses.find(
                                                                (c) =>
                                                                    String(
                                                                        c.courseId ||
                                                                            c._id,
                                                                    ) ===
                                                                    String(gid),
                                                            )?.title ?? gid}
                                                        </span>
                                                        <!-- Per-course revoke button -->
                                                        <form
                                                            method="POST"
                                                            action="?/revokeAccess"
                                                            use:enhance={() => {
                                                                loadingRow = {
                                                                    ...loadingRow,
                                                                    [`revoke_single_${user.userId}_${gid}`]: true,
                                                                };
                                                                return async ({
                                                                    update,
                                                                }) => {
                                                                    await update(
                                                                        {
                                                                            reset: false,
                                                                        },
                                                                    );
                                                                    loadingRow =
                                                                        {
                                                                            ...loadingRow,
                                                                            [`revoke_single_${user.userId}_${gid}`]: false,
                                                                        };
                                                                };
                                                            }}
                                                        >
                                                            <input
                                                                type="hidden"
                                                                name="email"
                                                                value={user.email}
                                                            />
                                                            <input
                                                                type="hidden"
                                                                name="coursesJson"
                                                                value={JSON.stringify(
                                                                    [
                                                                        {
                                                                            courseId:
                                                                                gid,
                                                                            courseTitle:
                                                                                courses.find(
                                                                                    (
                                                                                        c,
                                                                                    ) =>
                                                                                        String(
                                                                                            c.courseId ||
                                                                                                c._id,
                                                                                        ) ===
                                                                                        String(
                                                                                            gid,
                                                                                        ),
                                                                                )
                                                                                    ?.title ??
                                                                                gid,
                                                                        },
                                                                    ],
                                                                )}
                                                            />
                                                            <button
                                                                type="submit"
                                                                title="Revoke this course"
                                                                class="flex items-center justify-center px-1.5 py-0.5 h-full
                                                                       bg-red-950/60 hover:bg-red-900
                                                                       text-red-500 hover:text-red-300
                                                                       border-l border-emerald-900
                                                                       transition-colors cursor-pointer"
                                                            >
                                                                {#if loadingRow[`revoke_single_${user.userId}_${gid}`]}
                                                                    <svg
                                                                        class="w-2.5 h-2.5 animate-spin"
                                                                        fill="none"
                                                                        viewBox="0 0 24 24"
                                                                    >
                                                                        <circle
                                                                            class="opacity-25"
                                                                            cx="12"
                                                                            cy="12"
                                                                            r="10"
                                                                            stroke="currentColor"
                                                                            stroke-width="4"
                                                                        />
                                                                        <path
                                                                            class="opacity-75"
                                                                            fill="currentColor"
                                                                            d="M4 12a8 8 0 018-8v8H4z"
                                                                        />
                                                                    </svg>
                                                                {:else}
                                                                    <!-- × icon -->
                                                                    <svg
                                                                        class="w-2.5 h-2.5"
                                                                        fill="none"
                                                                        stroke="currentColor"
                                                                        viewBox="0 0 24 24"
                                                                    >
                                                                        <path
                                                                            stroke-linecap="round"
                                                                            stroke-linejoin="round"
                                                                            stroke-width="2.5"
                                                                            d="M6 18L18 6M6 6l12 12"
                                                                        />
                                                                    </svg>
                                                                {/if}
                                                            </button>
                                                        </form>
                                                    </div>
                                                {/each}
                                            </div>
                                        {:else}
                                            <span
                                                class="text-xs font-mono text-slate-600"
                                                >No access</span
                                            >
                                        {/if}
                                    </td>

                                    <!-- Multi-select Dropdown -->
                                    <td class="px-4 py-3">
                                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                                        <div
                                            class="relative"
                                            on:click|stopPropagation
                                        >
                                            <button
                                                type="button"
                                                on:click={() =>
                                                    toggleDropdown(user.userId)}
                                                class="flex items-center justify-between gap-2 min-w-[200px] w-full
                                                       bg-slate-900 border text-slate-300 text-xs rounded-lg px-3 py-2
                                                       focus:outline-none transition-colors
                                                       {dropdownOpen[
                                                    user.userId
                                                ]
                                                    ? 'border-emerald-500 ring-1 ring-emerald-500/30'
                                                    : 'border-slate-700 hover:border-slate-500'}"
                                            >
                                                <span
                                                    class="truncate {getSelected(
                                                        user.userId,
                                                    ).size > 0
                                                        ? 'text-emerald-400'
                                                        : 'text-slate-500'}"
                                                >
                                                    {selectedLabel(user.userId)}
                                                </span>
                                                <svg
                                                    class="w-3.5 h-3.5 shrink-0 text-slate-500 transition-transform
                                                            {dropdownOpen[
                                                        user.userId
                                                    ]
                                                        ? 'rotate-180'
                                                        : ''}"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        stroke-linecap="round"
                                                        stroke-linejoin="round"
                                                        stroke-width="2"
                                                        d="M19 9l-7 7-7-7"
                                                    />
                                                </svg>
                                            </button>

                                            {#if dropdownOpen[user.userId]}
                                                <div
                                                    class="absolute z-40 top-full mt-1 left-0 min-w-[240px]
                                                             bg-slate-900 border border-slate-700 rounded-xl shadow-2xl
                                                             overflow-hidden"
                                                >
                                                    <!-- Select All / Clear -->
                                                    <div
                                                        class="flex items-center justify-between px-3 py-2 border-b border-slate-800"
                                                    >
                                                        <button
                                                            type="button"
                                                            on:click={() => {
                                                                selectedCourses =
                                                                    {
                                                                        ...selectedCourses,
                                                                        [user.userId]:
                                                                            new Set(
                                                                                courses
                                                                                    .filter(
                                                                                        (
                                                                                            c,
                                                                                        ) =>
                                                                                            !isAlreadyGranted(
                                                                                                user,
                                                                                                c._id,
                                                                                            ),
                                                                                    )
                                                                                    .map(
                                                                                        (
                                                                                            c,
                                                                                        ) =>
                                                                                            c._id,
                                                                                    ),
                                                                            ),
                                                                    };
                                                            }}
                                                            class="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                                                        >
                                                            All
                                                        </button>
                                                        <span
                                                            class="text-xs text-slate-600 font-mono"
                                                        >
                                                            {getSelected(
                                                                user.userId,
                                                            )
                                                                .size}/{courses.length}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            on:click={() => {
                                                                selectedCourses =
                                                                    {
                                                                        ...selectedCourses,
                                                                        [user.userId]:
                                                                            new Set(),
                                                                    };
                                                            }}
                                                            class="text-xs text-slate-500 hover:text-slate-300 font-medium"
                                                        >
                                                            Clear
                                                        </button>
                                                    </div>

                                                    <!-- Course list -->
                                                    <div
                                                        class="max-h-48 overflow-y-auto"
                                                    >
                                                        {#each courses as course}
                                                            {@const granted =
                                                                isAlreadyGranted(
                                                                    user,
                                                                    course._id,
                                                                )}
                                                            {@const newlyPicked =
                                                                getSelected(
                                                                    user.userId,
                                                                ).has(
                                                                    course._id,
                                                                )}
                                                            <label
                                                                class="flex items-center gap-2.5 px-3 py-2
                                                                          {granted
                                                                    ? 'cursor-not-allowed opacity-60'
                                                                    : 'cursor-pointer hover:bg-slate-800/60'}
                                                                          transition-colors"
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={granted ||
                                                                        newlyPicked}
                                                                    disabled={granted}
                                                                    on:change={() =>
                                                                        toggleCourse(
                                                                            user.userId,
                                                                            course._id,
                                                                            user,
                                                                        )}
                                                                    class="w-3.5 h-3.5 cursor-pointer
                                                                           {granted
                                                                        ? 'accent-slate-500 cursor-not-allowed'
                                                                        : 'accent-emerald-500'}"
                                                                />
                                                                <span
                                                                    class="text-xs flex items-center gap-1.5
                                                                             {granted
                                                                        ? 'text-slate-500'
                                                                        : newlyPicked
                                                                          ? 'text-emerald-300 font-medium'
                                                                          : 'text-slate-300'}"
                                                                >
                                                                    {course.title}
                                                                    {#if granted}
                                                                        <span
                                                                            class="text-[10px] font-mono px-1.5 py-0.5 rounded
                                                                                     bg-slate-800 text-slate-500 border border-slate-700"
                                                                        >
                                                                            granted
                                                                        </span>
                                                                    {/if}
                                                                </span>
                                                            </label>
                                                        {/each}
                                                    </div>
                                                </div>
                                            {/if}
                                        </div>
                                    </td>

                                    <!-- Actions: Grant + Revoke -->
                                    <td class="px-4 py-3">
                                        <div class="flex items-center gap-2">
                                            <!-- Grant Access -->
                                            <form
                                                method="POST"
                                                action="?/grantAccess"
                                                use:enhance={handleGrantEnhance(
                                                    user.userId,
                                                    user.email,
                                                )}
                                            >
                                                <button
                                                    type="submit"
                                                    disabled={!(
                                                        selectedCourses[
                                                            user.userId
                                                        ]?.size > 0
                                                    ) || anyLoading}
                                                    title={!(
                                                        selectedCourses[
                                                            user.userId
                                                        ]?.size > 0
                                                    )
                                                        ? "Select at least one course"
                                                        : "Grant access to selected courses"}
                                                    class="inline-flex items-center justify-center gap-1.5 min-w-[110px]
                                                           bg-emerald-500 hover:bg-emerald-400
                                                           disabled:opacity-30 disabled:cursor-not-allowed
                                                           text-slate-950 font-bold text-xs rounded-lg
                                                           px-4 py-2 transition-all hover:-translate-y-px active:translate-y-0"
                                                >
                                                    {#if isGrantLoading}
                                                        <svg
                                                            class="w-3.5 h-3.5 animate-spin"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <circle
                                                                class="opacity-25"
                                                                cx="12"
                                                                cy="12"
                                                                r="10"
                                                                stroke="currentColor"
                                                                stroke-width="4"
                                                            />
                                                            <path
                                                                class="opacity-75"
                                                                fill="currentColor"
                                                                d="M4 12a8 8 0 018-8v8H4z"
                                                            />
                                                        </svg>
                                                    {:else}
                                                        <svg
                                                            class="w-3.5 h-3.5"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                stroke-linecap="round"
                                                                stroke-linejoin="round"
                                                                stroke-width="2.5"
                                                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                                            />
                                                        </svg>
                                                        Grant
                                                    {/if}
                                                </button>
                                            </form>

                                            <!-- Revoke Access -->
                                            <form
                                                method="POST"
                                                action="?/revokeAccess"
                                                use:enhance={handleRevokeEnhance(
                                                    user.userId,
                                                )}
                                            >
                                                <input
                                                    type="hidden"
                                                    name="email"
                                                    value={user.email}
                                                />
                                                <!-- <button
                                                    type="submit"
                                                    disabled={!(selectedCourses[user.userId]?.size > 0) || anyLoading}
                                                    title={!(selectedCourses[user.userId]?.size > 0) ? 'Select courses to revoke' : 'Revoke access to selected courses'}
                                                    class="inline-flex items-center justify-center gap-1.5 min-w-[90px]
                                                           bg-transparent hover:bg-red-500/10 border border-red-700
                                                           disabled:opacity-30 disabled:cursor-not-allowed
                                                           text-red-400 hover:text-red-300 font-bold text-xs rounded-lg
                                                           px-4 py-2 transition-all hover:-translate-y-px active:translate-y-0">
                                                    {#if isRevokeLoading}
                                                        <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                                                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                                                        </svg>
                                                    {:else}
                                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                                                        </svg>
                                                        Revoke
                                                    {/if}
                                                </button> -->
                                            </form>
                                        </div>
                                    </td>
                                </tr>
                            {/each}
                        {/if}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Pagination -->
        {#if totalPages > 1}
            <div class="flex items-center justify-between mt-5">
                <p class="text-xs font-mono text-slate-500">
                    Page {currentPage} of {totalPages} · showing {users.length} of
                    {total}
                </p>
                <div class="flex items-center gap-1">
                    <button
                        on:click={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        class="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700
                               bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200
                               disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >← Prev</button
                    >

                    {#if pageRange(currentPage, totalPages)[0] > 1}
                        <button
                            on:click={() => goToPage(1)}
                            class="px-3 py-1.5 rounded-lg text-xs font-mono border border-slate-700
                                   bg-slate-900 text-slate-400 hover:bg-slate-800 transition-colors"
                            >1</button
                        >
                        {#if pageRange(currentPage, totalPages)[0] > 2}
                            <span class="text-slate-600 text-xs px-1">…</span>
                        {/if}
                    {/if}

                    {#each pageRange(currentPage, totalPages) as p}
                        <button
                            on:click={() => goToPage(p)}
                            class="px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors
                                   {p === currentPage
                                ? 'bg-emerald-500 border-emerald-500 text-slate-950 font-bold'
                                : 'border-slate-700 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'}"
                            >{p}</button
                        >
                    {/each}

                    {#if pageRange(currentPage, totalPages).at(-1) < totalPages}
                        {#if pageRange(currentPage, totalPages).at(-1) < totalPages - 1}
                            <span class="text-slate-600 text-xs px-1">…</span>
                        {/if}
                        <button
                            on:click={() => goToPage(totalPages)}
                            class="px-3 py-1.5 rounded-lg text-xs font-mono border border-slate-700
                                   bg-slate-900 text-slate-400 hover:bg-slate-800 transition-colors"
                            >{totalPages}</button
                        >
                    {/if}

                    <button
                        on:click={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        class="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700
                               bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200
                               disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >Next →</button
                    >
                </div>
            </div>
        {/if}
    </div>
</div>
