<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Icon from '@iconify/svelte';

	export let data;
	// console.log(data,"dataaa");
	
	
	// Extract user data and current user info
	let datafetch = data?.users?.records || data?.records || [];
	let currentUserEmail = data?.currentUser?.email || '';
	// let isAdmin = data?.isAdmin || false;
	$: isAdmin = data?.isAdmin === data?.authedUser?.email;
	let open = false;

	$: totalCount = data?.users?.totalCount || data?.totalCount || datafetch.length || 0;

	// Conditionally add 'Delete' header only for admin
	$: headers = isAdmin 
		? ['User Name', 'Email','Phone', 'Institution','Date', 'Actions',  'Delete']
		: ['User Name', 'Email','Phone','Institution', 'Date', 'Actions'];
		
	let searchQuery = $page.url.searchParams.get('search') || '';
	let selectedStatus = $page.url.searchParams.get('filter') || 'unread';

	$: currentPage = parseInt($page.url.searchParams.get('page')) || 1;
	$: totalPages = isNaN(totalCount) ? 1 : Math.ceil(totalCount / 10);

	let timeout;
	const handleSearch = (e) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => {
			const newUrl = new URL(window.location.href);
			newUrl.searchParams.delete('page');
			newUrl.searchParams.delete('filter');
			newUrl.searchParams.set('search', searchQuery.trim());
			goto(newUrl.toString(), {
				invalidateAll: true,
				replaceState: true,
				keepfocus: true,
				noScroll: true
			});
			if (e.target.value.length === 0) cancelSearch();
		}, 1200);
	};

	const cancelSearch = () => {
		const newUrl = new URL(window.location.href);
		newUrl.searchParams.delete('search');
		searchQuery = '';
		goto(newUrl.toString(), {
			invalidateAll: true,
			replaceState: true,
			keepfocus: true,
			noScroll: true
		});
	};

	const changePage = (page) => {
		currentPage = page;
		const newUrl = new URL(window.location.href);
		newUrl.searchParams.set('page', currentPage);
		goto(newUrl.toString(), {
			replaceState: true,
			keepfocus: true,
			noScroll: true
		});
	};

	const handleFilter = (filter) => {
		const newUrl = new URL(window.location.href);
		newUrl.searchParams.delete('page');
		newUrl.searchParams.delete('search');
		newUrl.searchParams.set('filter', filter);
		goto(newUrl.toString(), {
			invalidateAll: true,
			replaceState: true,
			keepfocus: true,
			noScroll: true
		});
	};
	
	let selectedItem;
	let showModal = false;
	const openModal = (item) => {
		selectedItem = item;
		showModal = true;
	};

	const closeModal = () => {
		showModal = false;
		selectedItem = {};
	};
</script>

<section class="container mx-auto p-3">
	<div class="mb-4 flex items-center bg-gray-200 justify-between p-4 rounded-md shadow-md">
		<h1 class="inline-flex text-2xl font-bold mr-5">
			<Icon
				icon="ic:baseline-contact-phone"
				class="inline-block text-3xl bg-gray-50 rounded-md p-1 shadow-md"
			/>
			<span class="pt-0.5 ml-2">Users List</span>
		</h1>
		<div class="relative">
			<!-- <input
				type="text"
				placeholder="Search..."
				class="block border-gray-200 rounded-lg w-80 focus:ring-0 focus:border-primary-500 border-1 transition duration-300"
				bind:value={searchQuery}
				on:input={(e) => handleSearch(e)}
			/> -->
			<button
				class="absolute top-2.5 right-2 {searchQuery.length > 1 ? '' : 'hidden'}"
				on:click={() => cancelSearch()}
			>
				<Icon icon="charm:cross" class="text-2xl" />
			</button>
		</div>
	</div>

	{#if datafetch.length > 0}
		<div class="w-full overflow-auto rounded-md shadow-md scroll-bar">
			<table class="w-full border-collapse text-sm">
				<thead>
					<tr class="text-sm font-medium bg-gray-100 sticky top-0 whitespace-nowrap">
						{#each headers as header}
							<th class="px-4 py-2 gap-4 ">{header}</th>
						{/each}
					</tr>
				</thead>
				<tbody class="text-xs ">
					{#each datafetch as item}
						<tr class="border-t-1  font-medium whitespace-nowrap">
							<td class="px-4 py-2 gap-4">{item.firstName + " " + item.lastName || item.username || '-'}</td>
							<td class="px-4 py-2">{item.email}</td>
								<td class="px-4 py-2">{item.phone}</td>
								<td class="px-4 py-2">{item.institution || '-'}</td>
							
							<td class="px-4 py-2">
								{new Date(item.createdAt).toLocaleDateString('en-GB')}
							</td>

							<td class="px-6 py-1">
								<button
									on:click={() => openModal(item)}
									class="px-3 py-1 border-1 rounded border-gray-700 bg-gray-700 text-white hover:bg-white hover:text-gray-700 transition duration-300"
								>
									View Details
								</button>
							</td>
							<!-- <td class="px-4 py-1">
								<form action="?/status" method="POST">
									<input type="hidden" name="userId" value={item._id} />
									<select
										class="rounded text-xs p-1.5 focus:ring-0 focus:border-primary-500 border-1 transition duration-300"
										name="status"
										bind:value={item.status}
										on:change={(e) => e.target.form.submit()}
									>
										<option value="unread">Unread</option>
										<option value="responded">Responded</option>
										<option value="spam">Spam</option>
									</select>
								</form>
							</td>
							 -->
							{#if isAdmin}
								<td class="px-4 py-1">
									<form action="?/deleteusers" method="POST">
										<input type="hidden" name="userId" value={item._id} />
										<button
											type="submit"
											class="px-3 py-1 border-1 rounded border-red-600 bg-red-600 text-white hover:bg-white hover:text-red-600 transition duration-300"
											on:click={(e) => {
												if (!confirm('Are you sure you want to delete this user?')) {
													e.preventDefault();
												}
											}}
										>
											Delete
										</button>
									</form>
								</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<div
			class="{totalCount < 10 ? 'hidden' : ''} px-5 flex justify-between items-center mb-3 mt-4"
		>
			<button
				on:click={() => changePage(currentPage - 1)}
				disabled={currentPage === 1}
				class="px-5 py-1.5 bg-gray-700 border-1 disabled:bg-gray-200 disabled:border-gray-200 disabled:hover:text-white disabled:cursor-not-allowed border-gray-700 text-white rounded hover:bg-white hover:text-gray-700 transition duration-300"
			>
				Previous
			</button>
			<span>Page {currentPage} of {totalPages}</span>
			<button
				on:click={() => changePage(currentPage + 1)}
				disabled={currentPage === totalPages}
				class="px-5 py-1.5 bg-gray-700 border-1 disabled:bg-gray-200 disabled:border-gray-200 disabled:hover:text-white disabled:cursor-not-allowed border-gray-700 text-white rounded hover:bg-white hover:text-gray-700 transition duration-300"
			>
				Next
			</button>
		</div>
	{:else if !searchQuery.trim()}
		<div class="h-60 w-full pt-20 text-center text-gray-500">No Data available</div>
	{:else}
		<div class="h-60 w-full pt-20 text-center text-gray-500">
			No Data found for <span class="font-medium text-black">"{searchQuery}"</span>
		</div>
	{/if}
</section>

{#if showModal}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		class="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"
		on:click={(e) => {
			if (e.target === e.currentTarget) {
				showModal = false;
				selectedItem = {};
			}
		}}
	>
		<div
			class="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[80%] overflow-auto p-6 space-y-4"
		>
			<!-- Modal Header -->
			<div class="flex justify-between items-center border-b pb-2">
				<h2 class="text-xl font-semibold">Message Details</h2>
				<button class="text-gray-600 hover:text-black text-lg" on:click={() => (showModal = false)}
					>✖</button
				>
			</div>

			<!-- Data Content -->
			<div class="grid grid-cols-2 gap-4 text-sm">
				<div><strong>Name:</strong> {selectedItem.firstName + " " + selectedItem.lastName  || selectedItem.username || '-'}</div>
				<div><strong>Email:</strong> {selectedItem.email}</div>
				<div><strong>Phone:</strong> {selectedItem.phone}</div>
				<!-- <div><strong>Email:</strong> {selectedItem.email}</div> -->
					<div><strong>Institution:</strong> {selectedItem.institution}</div>
			
				<!-- <div><strong>Status:</strong> {selectedItem.status || '-'}</div> -->
				<div>
					<strong>Created At:</strong>
					{new Date(selectedItem.createdAt).toLocaleDateString('en-GB')}
				</div>
			</div>
			
		</div>
	</div>
{/if}