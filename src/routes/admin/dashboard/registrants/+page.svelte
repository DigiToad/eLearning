<script>
    import { enhance } from '$app/forms';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';

    export let data;
    export let form;
    console.log(data,"sdfghbjndfgh");
    

    let { users, courses, pagination, search: initialSearch } = data;

    let selectedCourse = {};
    let loadingRow = {};
    let searchQuery = initialSearch || '';
    let searchLoading = false;

    $: toast = form ? { msg: form.message, type: form.success ? 'success' : 'error' } : null;
    $: ({ page: currentPage, totalPages, total, pageSize } = pagination);

    function handleEnhance(userId) {
        loadingRow[userId] = true;
        return async ({ update }) => {
            await update({ reset: false });
            loadingRow[userId] = false;
        };
    }

    function getCourseFields(userId) {
        const cid = selectedCourse[userId];
        if (!cid) return { courseId: '', courseTitle: '' };
        const c = courses.find((c) => c._id === cid);
        return { courseId: c?.courseId || c?._id || '', courseTitle: c?.title || '' };
    }

    async function handleSearch(e) {
        e.preventDefault();
        searchLoading = true;
        await goto(`?search=${encodeURIComponent(searchQuery)}&page=1`, { invalidateAll: true });
        searchLoading = false;
    }

    async function clearSearch() {
        searchQuery = '';
        searchLoading = true;
        await goto(`?search=&page=1`, { invalidateAll: true });
        searchLoading = false;
    }

    async function goToPage(p) {
        await goto(`?search=${encodeURIComponent(searchQuery)}&page=${p}`, { invalidateAll: true });
    }

    function pageRange(current, total) {
        const delta = 2;
        const range = [];
        for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
            range.push(i);
        }
        return range;
    }
</script>



<!-- Toast -->
{#if toast}
    <div class="fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-semibold animate-slide-in max-w-sm
        {toast.type === 'success'
            ? 'bg-primary-950 border border-primary-400 text-primary-400'
            : 'bg-red-950 border border-red-400 text-red-400'}">
        {toast.msg}
    </div>
{/if}

<div class=" min-h-screen bg-slate-950 text-slate-200">

    <!-- Header -->
    <div class="border-b border-slate-800 px-6 py-8">
        <div class="max-w-screen-xl mx-auto">
            <span class="inline-block text-xs font-mono tracking-widest uppercase text-primary-400 bg-primary-950 border border-primary-900 px-2 py-1 rounded mb-3">
                Admin · Registrants
            </span>
            <h1 class="text-3xl font-bold text-white tracking-tight">
                Access <span class="text-primary-400">Management</span>
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
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
                </svg>
                <input
                    type="text"
                    bind:value={searchQuery}
                    placeholder="Search by email or institution…"
                    class="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg
                           pl-9 pr-4 py-2.5 placeholder-slate-600
                           focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30
                           transition-colors"
                />
            </div>
            <button
                type="submit"
                disabled={searchLoading}
                class="bg-primary-500 hover:bg-primary-400 disabled:opacity-50 text-slate-950 font-semibold
                       text-sm px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2"
            >
                {#if searchLoading}
                    <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
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
                Showing results for <span class="text-primary-400">"{initialSearch}"</span>
                · {total} match{total !== 1 ? 'es' : ''}
            </p>
        {/if}

        <!-- Table -->
        <div class="rounded-xl border border-slate-800 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="border-b border-slate-800 bg-slate-900/60">
                            <th class="text-left px-4 py-3 text-xs font-mono uppercase tracking-widest text-slate-500 w-10">#</th>
                            <th class="text-left px-4 py-3 text-xs font-mono uppercase tracking-widest text-slate-500">Name</th>
                            <th class="text-left px-4 py-3 text-xs font-mono uppercase tracking-widest text-slate-500">Email</th>
                            <th class="text-left px-4 py-3 text-xs font-mono uppercase tracking-widest text-slate-500">Phone</th>
                            <th class="text-left px-4 py-3 text-xs font-mono uppercase tracking-widest text-slate-500">Institution</th>
                            <th class="text-left px-4 py-3 text-xs font-mono uppercase tracking-widest text-slate-500">Course</th>
                            <th class="text-left px-4 py-3 text-xs font-mono uppercase tracking-widest text-slate-500">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#if users.length === 0}
                            <tr>
                                <td colspan="7" class="text-center py-16 text-slate-600 font-mono text-sm">
                                    {initialSearch ? `No results for "${initialSearch}"` : 'No registrants found.'}
                                </td>
                            </tr>
                        {:else}
                            {#each users as user, i}
                                {@const rowNum = (currentPage - 1) * pageSize + i + 1}
                                {@const { courseId, courseTitle } = getCourseFields(user.userId)}
                                <tr class="border-b border-slate-800/60 hover:bg-slate-900/40 transition-colors
                                           {loadingRow[user.userId] ? 'opacity-50 pointer-events-none' : ''}">
                                    <td class="px-4 py-3 font-mono text-xs text-slate-600">{rowNum}</td>
                                    <td class="px-4 py-3 font-semibold text-slate-100">{user.name || '—'}</td>
                                    <td class="px-4 py-3 font-mono text-xs text-slate-400">{user.email}</td>
                                    <td class="px-4 py-3 font-mono text-xs text-slate-400">{user.phone || '—'}</td>
                                    <td class="px-4 py-3 text-slate-300">{user.institution || '—'}</td>
                                    <td class="px-4 py-3">
                                        <select
                                            bind:value={selectedCourse[user.userId]}
                                            class="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg
                                                   px-3 py-2 min-w-[200px] cursor-pointer
                                                   focus:outline-none focus:border-primary-500
                                                   transition-colors appearance-none"
                                        >
                                            <option value="" disabled selected>Select course…</option>
                                            {#each courses as course}
                                                <option value={course._id}>{course.title}</option>
                                            {/each}
                                        </select>
                                    </td>
                                    <td class="px-4 py-3">
                                        <form
                                            method="POST"
                                            action="?/grantAccess"
                                            use:enhance={() => handleEnhance(user.userId)}
                                        >
                                            <input type="hidden" name="email"       value={user.email} />
                                            <input type="hidden" name="courseId"    value={courseId} />
                                            <input type="hidden" name="courseTitle" value={courseTitle} />

                                            <button
                                                type="submit"
                                                disabled={!selectedCourse[user.userId] || loadingRow[user.userId]}
                                                class="inline-flex items-center justify-center gap-1.5 min-w-[110px]
                                                       bg-primary-500 hover:bg-primary-400
                                                       disabled:opacity-30 disabled:cursor-not-allowed
                                                       text-slate-950 font-bold text-xs rounded-lg
                                                       px-4 py-2 transition-all hover:-translate-y-px active:translate-y-0"
                                            >
                                                {#if loadingRow[user.userId]}
                                                    <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                                                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                                                    </svg>
                                                {:else}
                                                    Grant Access
                                                {/if}
                                            </button>
                                        </form>
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
                    Page {currentPage} of {totalPages}
                    · showing {users.length} of {total}
                </p>

                <div class="flex items-center gap-1">
                    <!-- Prev -->
                    <button
                        on:click={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        class="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700
                               bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200
                               disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        ← Prev
                    </button>

                    <!-- Page numbers -->
                    {#if pageRange(currentPage, totalPages)[0] > 1}
                        <button on:click={() => goToPage(1)}
                            class="px-3 py-1.5 rounded-lg text-xs font-mono border border-slate-700
                                   bg-slate-900 text-slate-400 hover:bg-slate-800 transition-colors">
                            1
                        </button>
                        {#if pageRange(currentPage, totalPages)[0] > 2}
                            <span class="text-slate-600 text-xs px-1">…</span>
                        {/if}
                    {/if}

                    {#each pageRange(currentPage, totalPages) as p}
                        <button
                            on:click={() => goToPage(p)}
                            class="px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors
                                   {p === currentPage
                                     ? 'bg-primary-500 border-primary-500 text-slate-950 font-bold'
                                     : 'border-slate-700 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'}"
                        >
                            {p}
                        </button>
                    {/each}

                    {#if pageRange(currentPage, totalPages).at(-1) < totalPages}
                        {#if pageRange(currentPage, totalPages).at(-1) < totalPages - 1}
                            <span class="text-slate-600 text-xs px-1">…</span>
                        {/if}
                        <button on:click={() => goToPage(totalPages)}
                            class="px-3 py-1.5 rounded-lg text-xs font-mono border border-slate-700
                                   bg-slate-900 text-slate-400 hover:bg-slate-800 transition-colors">
                            {totalPages}
                        </button>
                    {/if}

                    <!-- Next -->
                    <button
                        on:click={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        class="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700
                               bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200
                               disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        Next →
                    </button>
                </div>
            </div>
        {/if}

    </div>
</div>

<style>
    @keyframes slide-in {
        from { opacity: 0; transform: translateY(-8px); }
        to   { opacity: 1; transform: translateY(0); }
    }
    .animate-slide-in { animation: slide-in 0.25s ease; }
</style>