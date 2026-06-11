<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Icon from '@iconify/svelte';

	// Define your routes
	const routes = [
		{
			name: 'Dashboard',
			path: '/admin/dashboard',
			icon: 'mdi:view-dashboard'
		},
		{
			name: 'Users',
			path: '/admin/dashboard/users',
			icon: 'mdi:account-group'
		},
		{
			name: 'Products',
			path: '/admin/dashboard/products',
			icon: 'mdi:package-variant'
		},
		{
			name: 'Category',
			path: '/admin/dashboard/category',
			icon: 'bx:category-alt'
		},
		{
			name: 'Events',
			path: '/admin/dashboard/events',
			icon: 'mdi:calendar'
		},
		{
			name: 'Webinar Feedback',
			path: '/admin/dashboard/feedback',
			icon: 'mdi:clipboard-text-clock'
		},
		{
			name: 'Partners/OEM',
			path: '/admin/dashboard/partners',
			icon: 'mdi:handshake'
		},
		{
			name: 'Collaborations/Our Work',
			path: '/admin/dashboard/collaborations',
			icon: 'streamline:collaborations-idea-solid'
		},
		{
			name: 'Contacts',
			path: '/admin/dashboard/contact',
			icon: 'mdi:contacts'
		},

		{
			name: 'Quote Request',
			path: '/admin/dashboard/quote',
			icon: 'mdi:file-document-edit-outline'
		},
		{
			name: 'Product Demo Request',
			path: '/admin/dashboard/product-demo',
			icon: 'mdi:presentation-play'
		},
		
			{
			name: 'Logout',
			path: '/admin/logout',
			icon: 'ri:logout-circle-line'
		}
	];

	// Mobile sidebar state
	let isMobileOpen = false;

	function navigateTo(path) {
		goto(path);
		isMobileOpen = false; // Close mobile sidebar after navigation
	}

	function toggleMobileSidebar() {
		isMobileOpen = !isMobileOpen;
	}

	// Check if route is active
	$: currentPath = $page.url.pathname;

	function isActive(path) {
		return currentPath === path || currentPath.startsWith(path + '/');
	}
</script>

<!-- Mobile Toggle Button -->
<button
	on:click={toggleMobileSidebar}
	class="lg:hidden fixed top-4 left-4 z-50 bg-[#1b2928] text-gray-300 p-2 rounded-lg hover:bg-gray-700 transition-all"
>
	<Icon icon={isMobileOpen ? 'mdi:close' : 'mdi:menu'} class="w-6 h-6" />
</button>

<!-- Overlay for mobile -->
{#if isMobileOpen}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		class="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
		on:click={toggleMobileSidebar}
	></div>
{/if}

<!-- Sidebar -->
<aside
	class={`fixed top-0 left-0 h-full bg-primary-400 text-gray-300 w-64 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${
		isMobileOpen ? 'translate-x-0' : '-translate-x-full'
	} lg:translate-x-0`}
>
	<!-- Sidebar Header -->
	<div class="p-1 border-b border-gray-700">
		<img src="/skillsblock.png" alt="DigiToad" class="w-[100px]"/>
	</div>

	<!-- Navigation Links -->
	<nav class="p-1 space-y-2 overflow-y-auto h-[calc(100vh-120px)]">
		{#each routes as route}
			<button
				on:click={() => navigateTo(route.path)}
				class={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 ${
					isActive(route.path)
						? 'bg-gray-700 text-white shadow-lg'
						: 'text-gray-900 hover:bg-gray-700 hover:text-white'
				}`}
			>
				<Icon icon={route.icon} class="w-5 h-5" />
				<span class="font-medium">{route.name}</span>
				{#if isActive(route.path)}
					<div class="ml-auto w-2 h-2 bg-green-500 rounded-full"></div>
				{/if}
			</button>
		{/each}
	</nav>

	<!-- Sidebar Footer -->
	<!-- <div class="absolute bottom-0 left-0 right-0 p-4  border-gray-700">
		<button
			on:click={() => navigateTo('/logout')}
			class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-red-900 hover:text-white transition-all duration-200 transform hover:scale-105"
		>
			<Icon icon="mdi:logout" class="w-5 h-5" />
			<span class="font-medium">Logout</span>
		</button>
	</div> -->
</aside>

<!-- Main content wrapper (add this padding to your layout) -->
<div class="lg:ml-64">
	<!-- Your main content goes here -->
	<slot />
</div>
