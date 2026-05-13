<script>
	import '../app.css';
	// import NavBar from '$lib/components/Navtest.svelte';
	import NavBar from '$lib/components/Navsub.svelte';
	// import Footer from '$lib/components/Footer.svelte';
	import { page, navigating } from '$app/stores';  // ← ADD navigating HERE

	import Breadcrumb from '$lib/components/Breadcrumb.svelte';
	import { isPageLoading } from '$lib/stores/mainStores';
	import Loading from '$lib/components/Loading.svelte';
	

	export let data;
	// let Productdata = data?.products || '';

	$: isAdminRoute = $page.url.pathname.startsWith('/admin');
	$: isHomePage = $page.url.pathname === '/';

	// Watch navigation and update loading store
	$: {
		if ($navigating) {
			isPageLoading.set(true);
		} else {
			isPageLoading.set(false);
		}
	}
</script>

{#if $isPageLoading}
	<Loading />
{/if}

<div class="flex flex-col min-h-screen overflow-hidden w-full p-0 m-0">
	{#if !isAdminRoute}
		<div class="sticky top-0 z-50 w-full">
			<NavBar {data}/>
		</div>
		<!-- {#if !isHomePage}
			<Breadcrumb />
		{/if} -->
	{/if}

	<main class="flex-grow w-full">
		<slot />
	</main>

	{#if !isAdminRoute}
		<!-- <Footer /> -->
	{/if}
</div>
