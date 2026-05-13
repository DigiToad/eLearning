<script>
	import Icon from '@iconify/svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { createEventDispatcher } from 'svelte';
	import { browser } from '$app/environment';

	export let blogData;
	console.log('blogData received:', blogData);

	export let searchQuery = '';
	export let categoryFilter = '';
	

	let showModal = false;
	let showModalshort = false;
	let selectedItem = null;
	let modalType = null; // 'description', 'features', or 'applications'

	const itemsPerPage = 10;

	$: currentPage = parseInt($page.url.searchParams.get('page')) || 1;
$: if (browser) categoryFilter, changePage(1);
	// Safely extract records, totalCount, and news with fallbacks
	// $: records = blogData?.records || [];
	// $: totalCount = blogData?.totalCount || records.length;
	$: news = blogData?.news || [];
	// Your blogData is directly an array
	$: records = Array.isArray(blogData) ? blogData : blogData?.records || [];
	$: totalCount = records.length;
	// $: displayBlogs = searchQuery
	//   ? records.filter(
	//       (blog) =>
	//         blog.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
	//         blog.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
	//         blog.subtitle?.toLowerCase().includes(searchQuery.toLowerCase())
	//     )
	//   : records.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

	// console.log('Extracted records:', records);
	// console.log('Total count:', totalCount);

	// Check if server is doing pagination or if we need to do it client-side
	$: isServerPaginated = records.length <= itemsPerPage && totalCount > itemsPerPage;

	// Calculate total pages
	// $: totalPages = isServerPaginated
	// 	? Math.ceil(totalCount / itemsPerPage)
	// 	: Math.ceil(records.length / itemsPerPage);

	// // Client-side pagination if server isn't handling it
	// $: paginatedRecords = isServerPaginated
	// 	? records
	// 	: records.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

	// Only filter if there's a search query, otherwise use paginated records
	$: filteredRecords = categoryFilter
    ? records.filter((b) => b.category === categoryFilter)
    : records;

$: totalPages = Math.ceil(filteredRecords.length / itemsPerPage);

$: paginatedRecords = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

$: displayBlogs = searchQuery
    ? filteredRecords.filter(
            (blog) =>
                blog.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                blog.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                blog.subtitle?.toLowerCase().includes(searchQuery.toLowerCase())
        )
    : paginatedRecords;

	

	// console.log('Display blogs:', displayBlogs);

	const dispatch = createEventDispatcher();

	function truncateText(text, maxLength) {
		if (!text) return '';
		return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
	}

	const changePage = (newPage) => {
		if (!browser) return; 
		if (newPage < 1 || newPage > totalPages) return;

		const newUrl = new URL(window.location.href);
		if (newPage === 1) {
			newUrl.searchParams.delete('page');
		} else {
			newUrl.searchParams.set('page', newPage);
		}

		goto(newUrl.toString(), {
			replaceState: true,
			keepfocus: true,
			noScroll: true
		});
	};

	function parseJSON(jsonString) {
		try {
			if (typeof jsonString === 'object') return jsonString;
			return JSON.parse(jsonString);
		} catch (e) {
			console.error('JSON parse error:', e, jsonString);
			return null;
		}
	}

	function formatFeatures(featuresString) {
		const features = parseJSON(featuresString);
		if (!features || !Array.isArray(features)) return '-';

		return features
			.map((obj) => {
				const entries = Object.entries(obj);
				return entries.map(([key, value]) => `${key}: ${value}`).join(', ');
			})
			.join('; ');
	}

	function formatApplications(applicationsString) {
		const applications = parseJSON(applicationsString);
		if (!applications || !Array.isArray(applications)) return '-';
		return applications.join(', ');
	}

	function openModalInfo(item, type = 'description') {
		showModal = true;
		selectedItem = item;
		modalType = type;
	}

	function closeModalInfo() {
		showModal = false;
		selectedItem = null;
		modalType = null;
	}
</script>

<div class="w-full border-t-1 border-b-1 border-l-1 overflow-auto rounded scroll-bar">
	{#if displayBlogs.length === 0}
		<div class="p-8 text-center text-gray-500">
			{#if searchQuery}
				No products found matching "{searchQuery}"
			{:else if records.length === 0}
				No products available. Click "Add New Product" to get started.
			{:else}
				Loading products...
			{/if}
		</div>
	{:else}
		<table class="w-full border-r-1 border-collapse rounded text-sm">
			<thead>
				<tr class="font-medium bg-gray-100 sticky top-0 text-left">
					<th class="px-4 py-2 border">Category</th>
					<th class="px-4 py-2 border">Sub Category</th>
					<th class="px-4 py-2 border">Title</th>
					<th class="px-4 py-2 border">SubTitle</th>
					<th class="px-4 py-2 border">Description</th>
					<th class="px-4 py-2 border">KeyWords</th>
					<th class="px-4 py-2 border">Overview</th>
					<th class="px-4 py-2 border">Features</th>
					<th class="px-4 py-2 border">Applications</th>
					<th class="px-4 py-2 border">Image</th>
					<th class="px-4 py-2 border">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each displayBlogs as blog (blog.id)}
					<tr class="border-t border-gray-300 text-left align-top">
						<td class="px-4 py-3">{blog?.category || '-'}</td>
							<td class="px-4 py-3">{blog?.subcategory || '-'}</td>
						<td class="px-4 py-3">{blog?.title || '-'}</td>
						<!-- <td class="px-4 py-3">{blog?.subtitle || '-'}</td> -->

						<td class="px-4 py-2">
							{#if blog?.subtitle}
								<div class="flex items-center justify-between space-x-0 w-[200px]">
									<span class="truncate flex-1 overflow-hidden text-ellipsis">
										{truncateText(blog.subtitle.replace(/<[^>]*>/g, ''), 20)}
									</span>
									{#if blog.subtitle.length > 20}
										<!-- svelte-ignore a11y-click-events-have-key-events -->
										<!-- svelte-ignore a11y-no-static-element-interactions -->
										<span
											class="text-blue-400 underline text-xs hover:text-blue-600 cursor-pointer whitespace-nowrap"
											on:click={() => openModalInfo(blog, 'subtitle')}
										>
											Readmore
										</span>
									{/if}
								</div>
							{:else}
								<span>-</span>
							{/if}
						</td>
						<td class="px-4 py-2">
							{#if blog?.description}
								<div class="flex items-center justify-between space-x-0 w-[200px]">
									<span class="truncate flex-1 overflow-hidden text-ellipsis">
										{truncateText(blog.description.replace(/<[^>]*>/g, ''), 20)}
									</span>
									{#if blog.description.length > 20}
										<!-- svelte-ignore a11y-click-events-have-key-events -->
										<!-- svelte-ignore a11y-no-static-element-interactions -->
										<span
											class="text-blue-400 underline text-xs hover:text-blue-600 cursor-pointer whitespace-nowrap"
											on:click={() => openModalInfo(blog, 'description')}
										>
											Readmore
										</span>
									{/if}
								</div>
							{:else}
								<span>-</span>
							{/if}
						</td>
						<!-- <td class="px-4 py-3">{blog?.keywords || '-'}</td> -->
						<td class="px-4 py-2 text-center">
							{#if blog?.keywords}
								<div class="flex items-center justify-between space-x-0 w-[200px]">
									<span class="truncate flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
										{truncateText(blog.keywords.replace(/<[^>]*>/g, ''), 20)}
									</span>
									{#if blog.keywords.length > 20}
										<!-- svelte-ignore a11y-click-events-have-key-events -->
										<!-- svelte-ignore a11y-no-static-element-interactions -->
										<span
											class="text-blue-400 underline text-xs hover:text-blue-600 cursor-pointer whitespace-nowrap"
											on:click={() => openModalInfo(blog, 'keywords')}
										>
											Readmore
										</span>
									{/if}
								</div>
							{:else}
								<span>-</span>
							{/if}
						</td>
						<td class="px-4 py-3">
							{#if blog?.overview}
								<div class="flex items-center justify-between space-x-0 w-[200px]">
									<span class="truncate flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
										{truncateText(blog.overview.replace(/<[^>]*>/g, ''), 20)}
									</span>
									{#if blog.overview.length > 20}
										<!-- svelte-ignore a11y-click-events-have-key-events -->
										<!-- svelte-ignore a11y-no-static-element-interactions -->
										<span
											class="text-blue-400 underline text-xs hover:text-blue-600 cursor-pointer whitespace-nowrap"
											on:click={() => openModalInfo(blog, 'overview')}
										>
											Readmore
										</span>
									{/if}
								</div>
							{:else}
								<span>-</span>
							{/if}
						</td>

						<!-- Features Column -->
						<td class="px-4 py-2 text-center">
							{#if blog?.features}
								<div class="flex items-center justify-between space-x-0 w-[200px]">
									<span class="truncate flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
										{truncateText(formatFeatures(blog.features), 20)}
									</span>
									{#if formatFeatures(blog.features).length > 20}
										<!-- svelte-ignore a11y-click-events-have-key-events -->
										<!-- svelte-ignore a11y-no-static-element-interactions -->
										<span
											class="text-blue-400 underline text-xs hover:text-blue-600 cursor-pointer whitespace-nowrap"
											on:click={() => openModalInfo(blog, 'features')}
										>
											Readmore
										</span>
									{/if}
								</div>
							{:else}
								<span>-</span>
							{/if}
						</td>

						<!-- Applications Column -->
						<td class="px-4 py-2 text-center">
							{#if blog?.applications}
								<div class="flex items-center justify-between space-x-0 w-[200px]">
									<span class="truncate flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
										{truncateText(formatApplications(blog.applications), 20)}
									</span>
									{#if formatApplications(blog.applications).length > 20}
										<!-- svelte-ignore a11y-click-events-have-key-events -->
										<!-- svelte-ignore a11y-no-static-element-interactions -->
										<span
											class="text-blue-400 underline text-xs hover:text-blue-600 cursor-pointer whitespace-nowrap"
											on:click={() => openModalInfo(blog, 'applications')}
										>
											Readmore
										</span>
									{/if}
								</div>
							{:else}
								<span>-</span>
							{/if}
						</td>

						<td class="px-4 py-3">
							{#if blog?.image}
								<!-- svelte-ignore a11y-missing-attribute -->
								<img
									src={blog.image}
									class="h-16 w-16 border rounded object-cover"
									alt={blog.title || 'Product image'}
								/>
							{:else}
								<div
									class="h-16 w-16 border rounded bg-gray-200 flex items-center justify-center text-xs text-gray-500"
								>
									No image
								</div>
							{/if}
						</td>
						<td class="px-4 py-3 my-3 flex items-center justify-center">
							<div class="flex gap-2 items-center">
								<!-- Edit Button with Icon -->
								<button
									class="bg-gray-700 text-white px-2 py-1 rounded hover:bg-white hover:text-gray-700 border border-gray-700 flex items-center gap-1"
									on:click={() => dispatch('edit', blog)}
								>
									<Icon icon="ic:sharp-mode-edit" class="text-xl" />
								</button>
								<!-- Delete Button with Icon -->
								<form
									method="POST"
									action="?/deleteblog"
									on:submit|preventDefault={(e) => {
										const confirmed = confirm('Are you sure you want to delete this blog?');
										if (!confirmed) return;
										e.target.submit();
									}}
								>
									<input type="hidden" name="id" value={blog.id} />
									<button
										type="submit"
										class="bg-gray-700 text-white px-2 py-1 rounded hover:bg-white hover:text-gray-700 border border-gray-700 flex items-center gap-1"
									>
										<Icon icon="bi:trash" class="text-xl" />
									</button>
								</form>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}

	{#if totalPages > 1 && !searchQuery}
		<div class="px-5 flex justify-between items-center mb-3 mt-4">
			<button
				on:click={() => changePage(currentPage - 1)}
				disabled={currentPage === 1}
				class="px-5 py-1.5 bg-gray-700 border border-gray-700 text-white rounded hover:bg-white hover:text-gray-700 disabled:bg-gray-200 disabled:border-gray-200"
			>
				Previous
			</button>
			<span>Page {currentPage} of {totalPages}</span>
			<button
				on:click={() => changePage(currentPage + 1)}
				disabled={currentPage === totalPages}
				class="px-5 py-1.5 bg-gray-700 border border-gray-700 text-white rounded hover:bg-white hover:text-gray-700 disabled:bg-gray-200 disabled:border-gray-200"
			>
				Next
			</button>
		</div>
	{/if}
</div>

{#if showModal}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		class="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-50 p-4"
		on:click|self={closeModalInfo}
	>
		<div class="bg-white rounded shadow-lg w-full max-w-xl max-h-[90vh] overflow-y-auto p-6">
			{#if modalType === 'description'}
				<h2 class="text-lg font-semibold mb-2">Complete Description</h2>
				<div class="text-gray-800 text-justify prose">{@html selectedItem?.description}</div>
			{:else if modalType === 'overview'}
				<h2 class="text-lg font-semibold mb-2">Complete Overview</h2>
				<div class="text-gray-800 text-justify prose">{@html selectedItem?.overview}</div>
				{:else if modalType === 'subtitle'}
				<h2 class="text-lg font-semibold mb-2">Complete SubTitle</h2>
				<div class="text-gray-800 text-justify prose">{@html selectedItem?.subtitle}</div>
			{:else if modalType === 'keywords'}
				<h2 class="text-lg font-semibold mb-2">Complete keywords</h2>
				<div class="text-gray-800 text-justify prose">{@html selectedItem?.keywords}</div>
			{:else if modalType === 'features'}
				<h2 class="text-lg font-semibold mb-4">Features</h2>
				<div class="text-gray-800">
					{#each parseJSON(selectedItem?.features) || [] as feature}
						<div class="mb-3 p-3 bg-gray-50 rounded border">
							{#each Object.entries(feature) as [key, value]}
								<div class="flex flex-col">
									<span class="font-medium text-gray-700">{key}:</span>
									<span class="text-gray-600 ml-2">{value}</span>
								</div>
							{/each}
						</div>
					{/each}
				</div>
			{:else if modalType === 'applications'}
				<h2 class="text-lg font-semibold mb-4">Applications</h2>
				<ul class="list-disc list-inside text-gray-800 space-y-2">
					{#each parseJSON(selectedItem?.applications) || [] as application}
						<li class="text-gray-700">{application}</li>
					{/each}
				</ul>
			{/if}

			<button
				on:click={closeModalInfo}
				class="mt-5 px-5 py-1.5 bg-gray-700 border border-gray-700 text-white rounded hover:bg-white hover:text-gray-700 transition-colors duration-300"
			>
				Close
			</button>
		</div>
	</div>
{/if}
