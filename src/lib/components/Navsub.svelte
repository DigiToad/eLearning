<script>
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';

    export let data;

    // authedUser comes from your layout load function
    // It has: userId, username, email, firstName, lastName (from getUserAttributes)
    let user = data?.authedUser ?? null;

    let menus = [];
    let activeMenu = null;
    let isOpen = false;

    // Avatar initials — firstName first char, fallback to email first char
    $: initials = user
        ? (user.firstName?.charAt(0) ?? user.username?.charAt(0) ?? user.email?.charAt(0) ?? '?').toUpperCase()
        : '';

    // Full display name
    $: displayName = user
        ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || user.email
        : '';

    function navigateTo(url) {
        goto(url);
        isOpen = false;
        activeMenu = null;
    }

    async function logout() {
        // POST to your logout action
        await fetch('/logout', { method: 'POST' });
        localStorage.removeItem('user');
        user = null;
        goto('/');
    }
</script>

<!-- Navbar -->
<div class="bg-white shadow-sm relative z-50">
    <nav class="max-w-7xl mx-auto flex justify-between items-center px-6 py-1">

        <!-- Logo -->
        <button on:click={() => navigateTo('/')}>
            <img src="/skillsblock.png" alt="LMS" class="h-20 w-20" />
        </button>

        <!-- Desktop Menu Links -->
        <div class="hidden md:flex items-center space-x-8">
            {#each menus as menu}
                {#if menu.title !== 'Products'}
                    <button
                        on:click={() => navigateTo(menu.href)}
                        class="text-gray-700 hover:text-blue-700 font-medium transition-colors"
                    >
                        {menu.title}
                    </button>
                {/if}
            {/each}
        </div>

        <!-- RIGHT SIDE -->
        <div class="hidden md:flex items-center space-x-4">

            <!-- Learn button — always visible -->
            <button
                on:click={() => navigateTo('/learn')}
                class="bg-blue-700 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-800 transition-colors"
            >
                Learn
            </button>

            {#if !user}
                <!-- Not logged in -->
                <button
                    on:click={() => navigateTo('/login')}
                    class="text-gray-700 hover:text-blue-700 font-medium transition-colors"
                >
                    Sign In
                </button>
                <button
                    on:click={() => navigateTo('/register')}
                    class="border border-blue-700 text-blue-700 px-4 py-2 rounded-md font-medium hover:bg-blue-50 transition-colors"
                >
                    Sign Up
                </button>

            {:else}
                <!-- Logged in — avatar dropdown -->
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div
                    class="relative"
                    on:mouseenter={() => (activeMenu = 'user')}
                    on:mouseleave={() => (activeMenu = null)}
                >
                    <button class="flex items-center gap-2 group">
                        <!-- Avatar circle -->
                        <div class="w-9 h-9 rounded-full bg-blue-700 flex items-center justify-center
                                    text-white font-bold text-sm uppercase
                                    group-hover:bg-blue-800 transition-colors">
                            {initials}
                        </div>
                        <!-- Name (truncated) -->
                        <span class="text-gray-800 text-sm font-medium max-w-[120px] truncate hidden lg:block">
                            {displayName}
                        </span>
                        <!-- Chevron -->
                        <svg class="w-4 h-4 text-gray-500 transition-transform {activeMenu === 'user' ? 'rotate-180' : ''}"
                             fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                        </svg>
                    </button>

                    <!-- Dropdown -->
                    {#if activeMenu === 'user'}
                        <div class="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl
                                    border border-gray-100 overflow-hidden">

                            <!-- User info header -->
                            <div class="px-4 py-3 border-b border-gray-100 bg-gray-50">
                                <div class="flex items-center gap-2.5">
                                    <div class="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center
                                                text-white font-bold text-xs uppercase shrink-0">
                                        {initials}
                                    </div>
                                    <div class="min-w-0">
                                        <p class="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                                        <p class="text-xs text-gray-500 truncate">{user.email}</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Menu items -->
                            <button
                                class="flex items-center gap-2.5 w-full text-left px-4 py-2.5
                                       text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                on:click={() => navigateTo('/mycourses')}
                            >
                                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                                </svg>
                                My Courses
                            </button>

                            <button
                                class="flex items-center gap-2.5 w-full text-left px-4 py-2.5
                                       text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                on:click={() => navigateTo('/dashboard')}
                            >
                                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                          d="M3 7h6v6H3V7zm0 10h6v2H3v-2zm8-10h10v2H11V7zm0 6h10v2H11v-2zm0 4h10v2H11v-2z"/>
                                </svg>
                                Dashboard
                            </button>

                            <div class="border-t border-gray-100">
                                <button
                                    class="flex items-center gap-2.5 w-full text-left px-4 py-2.5
                                           text-sm text-red-500 hover:bg-red-50 transition-colors"
                                    on:click={logout}
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                                    </svg>
                                    Logout
                                </button>
                            </div>
                        </div>
                    {/if}
                </div>
            {/if}
        </div>

        <!-- Mobile hamburger -->
        <button class="md:hidden text-gray-700 text-2xl" on:click={() => (isOpen = !isOpen)}>
            {isOpen ? '✕' : '☰'}
        </button>
    </nav>

    <!-- Mobile Drawer -->
    {#if isOpen}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="fixed inset-0 bg-black bg-opacity-50 z-40" on:click={() => (isOpen = false)}></div>

        <div class="fixed left-0 top-0 h-full w-4/5 max-w-xs bg-blue-900 p-6 text-white z-50 overflow-y-auto">

            <button class="absolute top-4 right-4 text-white text-xl" on:click={() => (isOpen = false)}>✕</button>

            {#if !user}
                <div class="mt-8 flex flex-col gap-3">
                    <button on:click={() => navigateTo('/login')}
                        class="w-full text-left py-2 border-b border-blue-700">Sign In</button>
                    <button on:click={() => navigateTo('/register')}
                        class="w-full text-left py-2">Sign Up</button>
                </div>
            {:else}
                <!-- Logged-in mobile -->
                <div class="mt-8">
                    <!-- User info -->
                    <div class="flex items-center gap-3 pb-4 border-b border-blue-700 mb-4">
                        <div class="w-10 h-10 rounded-full bg-white flex items-center justify-center
                                    text-blue-900 font-bold text-sm uppercase">
                            {initials}
                        </div>
                        <div class="min-w-0">
                            <p class="font-semibold truncate">{displayName}</p>
                            <p class="text-xs text-blue-300 truncate">{user.email}</p>
                        </div>
                    </div>

                    <div class="flex flex-col gap-1">
                        <button on:click={() => navigateTo('/learn')}
                            class="w-full text-left py-2.5 px-2 rounded hover:bg-blue-800 transition-colors">
                            Learn
                        </button>
                        <button on:click={() => navigateTo('/mycourses')}
                            class="w-full text-left py-2.5 px-2 rounded hover:bg-blue-800 transition-colors">
                            My Courses
                        </button>
                        <button on:click={() => navigateTo('/dashboard')}
                            class="w-full text-left py-2.5 px-2 rounded hover:bg-blue-800 transition-colors">
                            Dashboard
                        </button>
                        <button on:click={logout}
                            class="w-full text-left py-2.5 px-2 rounded text-red-400 hover:bg-red-900/20 transition-colors mt-2">
                            Logout
                        </button>
                    </div>
                </div>
            {/if}
        </div>
    {/if}
</div>