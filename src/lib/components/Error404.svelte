<script>
	import Icon from '@iconify/svelte';
	import SEO from '$lib/components/SEO.svelte';
	import { PUBLIC_WEBSITE_URL, PUBLIC_WEBSITE_NAME } from '$env/static/public';
$: metadata = {
    title: `404 Page Not Found | ${PUBLIC_WEBSITE_NAME}`,
    description:
        "The page you're looking for doesn't exist or has been moved. Please check the URL or return to our homepage to find what you need.",
    keywords: '404 error, page not found, broken link, missing page, error page',
    urlPath: `${PUBLIC_WEBSITE_URL}/404`,
    robots: 'noindex, nofollow',
    schema: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: `404 Page Not Found | ${PUBLIC_WEBSITE_NAME}`,
        description:
            "The page you're looking for doesn't exist or has been moved. Please check the URL or navigate back to our homepage.",
        url: `${PUBLIC_WEBSITE_URL}/404`,
        publisher: {
            '@type': 'Organization',
            name: PUBLIC_WEBSITE_NAME
        }
    }
};
	function goHome() {
		window.location.href = '/';
	}

	function goBack() {
		if (window.history.length > 1) {
			window.history.back();
		} else {
			goHome();
		}
	}
</script>

<SEO {metadata} />
<div class="bg-white relative overflow-hidden">
	<!-- Soft background gradients matching the image -->
	<div
		class="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-cyan-100 to-transparent rounded-full blur-3xl opacity-60"
	></div>
	<div
		class="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-cyan-50 to-transparent rounded-full blur-3xl opacity-50"
	></div>

	<!-- Main Content -->
	<div class="flex flex-col justify-center items-center px-4 md:px-4 relative z-10">
		<div class="max-w-2xl w-full mx-auto text-center">
			<!-- Image Section - Green Box Illustration -->
			<div class="flex justify-center mb-">
				<img src="/error/404.png" alt="404 Error" class="w-[400px] h-auto" />
			</div>

			<!-- Bold "Oops...!" heading in green -->
			<h1 class="text-5xl font-black mb- text-green-700 italic animate-zoom">Oops...!</h1>

			<!-- 404 and "PAGE NOT FOUND" -->
			<div class="flex items-center justify-center gap-4 mb-6">
				<span class="text-6xl md:text-7xl font-bold text-green-600">404</span>
				<span class="text-2xl md:text-3xl font-semibold text-gray-800 tracking-wide"
					>PAGE NOT FOUND</span
				>
			</div>

			<!-- Description text -->
			<p class="text-base md:text-lg text-gray-600 mb-4 max-w-xl mx-auto">
				The page you are looking for may be temporarily unavailable. Please check back later.
			</p>

			<!-- Action buttons -->
			<div class="flex flex-col sm:flex-row gap-4 justify-center items-center mb-4">
				<button
					on:click={goHome}
					class="inline-flex items-center bg-green-600 text-white font-semibold py-3 px-8 rounded-lg hover:bg-green-700 transition-all duration-300 shadow-md hover:shadow-lg"
				>
					<Icon icon="mdi:home" class="text-xl mr-2" />
					Back to Home
				</button>

				<button
					on:click={goBack}
					class="inline-flex items-center bg-white text-gray-700 font-semibold py-3 px-8 rounded-lg border-2 border-gray-300 hover:border-green-600 hover:text-green-600 transition-all duration-300"
				>
					<Icon icon="mdi:arrow-left" class="text-xl mr-2" />
					Go Back
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	@keyframes zoom {
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.15);
		}
	}

	.animate-zoom {
		animation: zoom 2s ease-in-out infinite;
	}
</style>
