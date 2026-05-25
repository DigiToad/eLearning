<script>
	import { goto } from '$app/navigation';

	export let data;

	let user = data?.authedUser; // 👈 Auth user
	// console.log(user, 'useruseruseruser');

	let menus = [];
	let activeMenu = null;
	let isOpen = false;

	let productCategories = [];

	function navigateTo(url) {
		goto(url);
	}

	function logout() {
		localStorage.removeItem('user');
		user = null;
		goto('/');
	}
</script>

<!-- Navbar -->
<div class="bg-white text-white relative z-50">
	<nav class="max-w-7xl mx-auto flex justify-between items-center px-6 py-1">
		<!-- Logo -->
		<button on:click={() => navigateTo('/')}>
			<img src="/skillsblock.png" alt="LMS" class="h-20 w-20" />
		</button>

		<!-- Desktop Menu -->
		<div class="hidden md:flex items-center space-x-8">
			{#each menus as menu}
				{#if menu.title !== 'Products'}
					<button on:click={() => navigateTo(menu.href)}>
						{menu.title}
					</button>
				{/if}
			{/each}
		</div>

		<!-- RIGHT SIDE (AUTH UI) -->
		<div class="hidden md:flex items-center space-x-6">
			{#if !user}
				<!-- Not Logged In -->
				<button on:click={() => navigateTo('/login')}> Sign In </button>

				<button
					on:click={() => navigateTo('/register')}
					class="bg-white text-blue-900 px-4 py-2 rounded-md"
				>
					Sign Up
				</button>
				<button
					on:click={() => navigateTo('/learn')}
					class="bg-white text-blue-900 px-4 py-2 rounded-md"
				>
					Learn
				</button>
			{:else}
				<button
					on:click={() => navigateTo('/learn')}
					class="bg-white text-primary-900 px-4 py-2 rounded-md"
				>
					Learn
				</button>
				<!-- Logged In -->
				<!-- svelte-ignore a11y-no-static-element-interactions -->
				<div
					class="relative"
					on:mouseenter={() => (activeMenu = 'user')}
					on:mouseleave={() => (activeMenu = null)}
				>
					<button class="flex items-center space-x-2">
						<!-- Avatar -->
						<div
							class="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold uppercase"
						>
							{user?.firstname?.charAt(0)}
						</div>
					</button>

					{#if activeMenu === 'user'}
						<div class="absolute right-0 mt-2 w-48 bg-white text-black rounded-lg shadow-lg">
							<button
								class="block w-full text-left px-4 py-2 hover:bg-gray-100"
								on:click={() => navigateTo('/mycourses')}
							>
								My Courses
							</button>

							<button
								class="block w-full text-left px-4 py-2 hover:bg-gray-100"
								on:click={() => navigateTo('/dashboard')}
							>
								Dashboard
							</button>

							<button
								class="block w-full text-left px-4 py-2 hover:bg-red-100 text-red-500"
								on:click={logout}
							>
								Logout
							</button>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Mobile Menu Button -->
		<button class="md:hidden" on:click={() => (isOpen = !isOpen)}> ☰ </button>
	</nav>

	<!-- Mobile Drawer -->
	{#if isOpen}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div class="fixed inset-0 bg-black bg-opacity-50" on:click={() => (isOpen = false)}></div>

		<div class="fixed left-0 top-0 h-full w-4/5 bg-blue-900 p-6 text-white">
			<!-- Auth -->
			{#if !user}
				<button on:click={() => navigateTo('/login')} class="block mb-2"> Sign In </button>
				<button on:click={() => navigateTo('/register')}> Sign Up </button>
			{:else}
				<p class="mb-4 font-bold">{user.firstName}</p>
				<button on:click={() => navigateTo('/my-courses')} class="block mb-2"> My Courses </button>
				<button on:click={() => navigateTo('/dashboard')} class="block mb-2"> Dashboard </button>
				<button on:click={logout} class="text-red-400"> Logout </button>
			{/if}
		</div>
	{/if}
</div>
