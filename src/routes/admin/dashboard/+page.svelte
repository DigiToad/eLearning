<script>
	import { enhance } from '$app/forms';
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Signup from '$lib/components/Adminregister.svelte';

	export let data;
	let count_values = data?.stats || 0;
	// console.log(count_values, 'count_values');

	// $: console.log('Dashboard-->', data);

	let user = data?.authedUser || { firstname: '', phone: '', email: '' };

	user.addresses = data?.profile?.addresses || [];
	user.emailContacts = user?.emailContacts || [];

	let showEditProfile = false;
	let isLoading = true;
	let formError = '';
	let formSuccess = '';
	let selectedCountryEdit = '';

	// $: {
	// 	if (data?.customerQuotes?.quotes && Array.isArray(data.customerQuotes.quotes)) {
	// 		quotes = data.customerQuotes.quotes;
	// 	} else {
	// 		quotes = [];
	// 	}
	// }

	// $: recentQuotes = quotes
	// 	.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
	// 	.slice(0, 2);

	onMount(() => {
		isLoading = false;
	});

	function openEditProfile() {
		formError = '';
		formSuccess = '';
		selectedCountryEdit = user.country;
		showEditProfile = true;
	}

	function closeEditProfile() {
		formError = '';
		formSuccess = '';
		showEditProfile = false;
	}

	let quotes = [];

	let showEmailTooltip = false;
	let showPhoneTooltip = false;
	let tooltipTimeout;

	function showTooltip(type) {
		clearTimeout(tooltipTimeout);
		if (type === 'email') {
			showEmailTooltip = true;
		} else if (type === 'phone') {
			showPhoneTooltip = true;
		}
	}

	function hideTooltip(type) {
		tooltipTimeout = setTimeout(() => {
			if (type === 'email') {
				showEmailTooltip = false;
			} else if (type === 'phone') {
				showPhoneTooltip = false;
			}
		}, 200);
	}

	// Stats configuration
	const statsConfig = [
		{
			key: 'events',
			label: 'Events',
			icon: 'mdi:calendar',
			color: 'from-blue-500 to-blue-600',
			bgColor: 'bg-blue-50',
			iconColor: 'text-blue-600',
			route: '/admin/dashboard/events'
		},
		{
			key: 'products',
			label: 'Products',
			icon: 'mdi:package-variant',
			color: 'from-green-500 to-green-600',
			bgColor: 'bg-green-50',
			iconColor: 'text-green-600',
			route: '/admin/dashboard/products'
		},
		{
			key: 'category',
			label: 'Category',
			icon: 'bx:category-alt',
			color: 'from-yellow-500 to-yellow-600',
			bgColor: 'bg-yellow-100',
			iconColor: 'text-yellow-600',
			route: '/admin/dashboard/category'
		},
		{
			key: 'users',
			label: 'Users',
			icon: 'mdi:account-group',
			color: 'from-purple-500 to-purple-600',
			bgColor: 'bg-purple-50',
			iconColor: 'text-purple-600',
			route: '/admin/dashboard/users'
		},
		{
			key: 'WebinarFeedbackcount',
			label: 'Webinar Feedback',
			color: 'from-cyan-500 to-cyan-600',
			bgColor: 'bg-cyan-50',
			iconColor: 'text-cyan-600',
			route: '/admin/dashboard/feedback',
			icon: 'mdi:clipboard-text-clock'
		},
		{
			key: 'partners',
			label: 'Partners/ Oem',
			icon: 'mdi:handshake',
			color: 'from-orange-500 to-orange-600',
			bgColor: 'bg-orange-50',
			iconColor: 'text-orange-600',
			route: '/admin/dashboard/partners'
		},
		{
			key: 'contacts',
			label: 'Contacts',
			icon: 'mdi:contacts',
			color: 'from-pink-500 to-pink-600',
			bgColor: 'bg-pink-50',
			iconColor: 'text-pink-600',
			route: '/admin/dashboard/contact'
		},
		{
			key: 'collaborations',
			label: 'Collaborations/Our Work',
			icon: 'streamline:collaborations-idea-solid',
			color: 'from-gray-400 to-gray-900',
			bgColor: 'bg-orange-50',
			iconColor: 'text-orange-600',
			route: '/admin/dashboard/collaborations'
		},
		{
			key: 'productdemo',
			label: 'Product Demo Request',
			color: 'from-red-500 to-red-600',
			bgColor: 'bg-red-50',
			iconColor: 'text-red-600',
			route: '/admin/dashboard/product-demo',
			icon: 'mdi:presentation-play'
		},
		{
			key: 'quote',
			label: 'Quote Request',
			color: 'from-blue-500 to-blue-600',
			bgColor: 'bg-blue-50',
			iconColor: 'text-blue-600',
			route: '/admin/dashboard/quote',
			icon: 'mdi:file-document-edit-outline'
		}
	];
</script>

<div class="flex min-h-screen bg-gray-50">
	<!-- Sidebar -->
	<Sidebar />

	<!-- Main Content -->
	<div class="flex-1">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
			<!-- Welcome Card -->
			<div class="bg-white rounded-2xl shadow-xl mb-8 overflow-hidden border border-primary-100">
				<div class="bg-primary-500 p-4 sm:p-6">
					<div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
						{#if isLoading}
							<div class="animate-pulse flex-1">
								<div class="h-10 bg-white/20 rounded-xl w-72 mb-3"></div>
								<div class="h-5 bg-white/20 rounded-lg w-56"></div>
							</div>
						{:else}
							<div class="text-white flex-1">
								<h1 class="text-2xl md:text-3xl font-bold mb-4 text-white">
									Welcome back, <span class="text-primary-100 capitalize">
										{data?.authedUser?.firstname ||
											data?.user?.firstname ||
											data?.user?.username ||
											'User'}
									</span>
								</h1>
								<div
									class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-primary-50"
								>
									<div
										class="flex items-center gap-3 bg-white/10 rounded-lg px-4 py-3 backdrop-blur-sm"
									>
										<div class="bg-white/20 p-2 rounded-lg">
											<Icon icon="mdi:email" class="text-lg text-white" />
										</div>
										<div class="min-w-0 flex-1 relative">
											<p class="text-primary-100 text-xs font-medium">Email</p>
											<p
												class="text-white font-medium truncate cursor-pointer relative"
												on:mouseenter={() => showTooltip('email')}
												on:mouseleave={() => hideTooltip('email')}
											>
												{data?.authedUser?.email || 'email@example.com'}
											</p>
											{#if showEmailTooltip}
												<div
													class="absolute z-50 bg-gray-900 text-white text-sm rounded-lg px-3 py-2 shadow-lg -top-12 left-0 whitespace-nowrap border border-gray-700"
												>
													{data?.authedUser?.email || 'email@example.com'}
													<div
														class="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"
													></div>
												</div>
											{/if}
										</div>
									</div>
								</div>
							</div>
						{/if}

						{#if data?.admin_email === data?.authedUser?.email}
							<div class="flex flex-col sm:flex-row gap-4 items-center">
								<button
									class="bg-white text-primary-700 px-8 py-3 rounded-xl font-semibold hover:bg-primary-50 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2 shadow-lg"
									on:click={openEditProfile}
								>
									<Icon icon="mdi:account-edit" class="text-xl" />
									Add User
								</button>
							</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- Stats Section -->
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each statsConfig as stat}
					<!-- svelte-ignore a11y-click-events-have-key-events -->
					<!-- svelte-ignore a11y-no-static-element-interactions -->
					<div
						class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden border border-gray-100 cursor-pointer"
						on:click={() => goto(stat.route)}
					>
						<div class="p-6">
							<div class="flex items-center justify-between mb-4">
								<div class="{stat.bgColor} p-3 rounded-lg">
									<Icon icon={stat.icon} class="text-2xl {stat.iconColor}" />
								</div>
							</div>
							<div>
								<p class="text-gray-500 text-sm font-medium mb-1">{stat.label}</p>
								<p class="text-3xl font-bold text-gray-800 mb-1">
									{count_values?.[stat.key] || 0}
								</p>
								<p class="text-xs text-gray-400 italic">
									Your total number of {stat.label.toLowerCase()}
								</p>
							</div>
						</div>
						<div class="h-1 bg-gradient-to-r {stat.color}"></div>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>

<!-- Edit Profile Modal -->
{#if showEditProfile}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
		on:click={closeEditProfile}
	>
		<div class="w-full max-w-2xl max-h-[90vh] overflow-y-auto" on:click|stopPropagation>
			<Signup />
		</div>
	</div>
{/if}
