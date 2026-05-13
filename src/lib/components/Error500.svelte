<script>
	import SEO from '$lib/components/SEO.svelte';
	import { PUBLIC_WEBSITE_URL, PUBLIC_WEBSITE_NAME } from '$env/static/public';
	import Icon from '@iconify/svelte';
	$: metadata = {
		title: `500 Internal Server Error | ${PUBLIC_WEBSITE_NAME}`,
		description:
			"We're experiencing technical difficulties. Our team has been notified and is working to resolve the issue. Please try again later or return to our homepage.",
		keywords: '500 error, internal server error, technical difficulties, server error',
		urlPath: `${PUBLIC_WEBSITE_URL}/500`,
		robots: 'noindex, nofollow',
		schema: {
			'@context': 'https://schema.org',
			'@type': 'WebPage',
			name: `500 Internal Server Error | ${PUBLIC_WEBSITE_NAME}`,
			description:
				"We're experiencing technical difficulties. Our team has been notified and is working to resolve the issue.",
			url: `${PUBLIC_WEBSITE_URL}/500`,
			publisher: {
				'@type': 'Organization',
				name: PUBLIC_WEBSITE_NAME
			}
		}
	};

	function goHome() {
		window.location.href = '/';
	}
</script>

<SEO {metadata} />

<div class="bg-white relative overflow-hidden">
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
			<h1 class="text-5xl font-black mb- text-green-700 italic animate-zoom">
				Sorry Something went wrong on our end
			</h1>

			<!-- 404 and "PAGE NOT FOUND" -->
			<div class="flex items-center justify-center gap-4 mb-6">
				<span class="text-6xl md:text-7xl font-bold text-green-600">500 </span>
				<span class="text-2xl md:text-3xl font-semibold text-gray-800 tracking-wide"
					>INTERNAL SERVER ERROR</span
				>
			</div>

			<!-- Description text -->
			<p class="text-base md:text-lg text-gray-600 mb-4 max-w-xl mx-auto">
				Please again later or return to home page
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
