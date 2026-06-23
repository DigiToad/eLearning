<script>
	// import Learn from '$lib/components/Learn.svelte';
	import Learn from '$lib/components/Landingnew.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import { PUBLIC_WEBSITE_URL, PUBLIC_WEBSITE_NAME } from '$env/static/public';
	

	$: metadata = {
		title: `${PUBLIC_WEBSITE_NAME} | Solutions in Wireless Research, Quantum Technologies & AI`,
		description:
			` ${PUBLIC_WEBSITE_NAME}, We empowers academia, industry, and research institutions with advanced solutions in Wireless Research, Quantum Technologies, and AI.` ||
			'Default description',
		keywords: `Wireless Research Solutions, mmWave Research, 5G Research Testbed, 6G Research Testbed, Terahertz Communication, Sub-Terahertz Systems, Wireless Test & Measurement, Quantum Technologies Solutions, Quantum Computing Platforms, Quantum Communication Systems, Quantum Security, Quantum Key Distribution (QKD), Post-Quantum Cryptography (PQC), Optical Test Solutions, High Performance Computing (HPC), Edge Computing & AI, Edge AI Solutions, FPGA Development Platforms, Advanced Research Platforms, AI & Quantum Labs for Universities, Academic Teaching Solutions, Industry-Aligned Curriculum, Engineering Lab Setup Solutions, Industrial Training Programs, Proof of Concept (PoC) Development, Engineering Solutions`,
		urlPath: `${PUBLIC_WEBSITE_URL}` || 'Default URl',
		schema: {
			'@context': 'https://schema.org',
			'@type': 'Webpage',
			name: `${PUBLIC_WEBSITE_NAME}` || 'Default Title',
			description:
				`Welcome to ${PUBLIC_WEBSITE_NAME}. We empowers academia, industry, and research institutions with advanced solutions in Wireless Research, Quantum Technologies, and AI.` ||
				'Default description',
			url: `${PUBLIC_WEBSITE_URL}`,
			brand: {
				'@type': 'Brand',
				name: `${PUBLIC_WEBSITE_NAME}`
			}
		}
	};
</script>

<div class="bg-white relative z-10 max-auto max-7xl">
	<SEO {metadata} />
	<Learn />
</div>
