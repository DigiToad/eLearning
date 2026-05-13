<script>
	// Optional: You can accept a custom image path as a prop
	export let imageSrc = '/skillsblock.png';
	export let imageAlt = 'Loading...';
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100">
	<div class="relative">
		<!-- Outer rotating circle -->
		<div class="absolute inset-0 flex items-center justify-center">
			<div class="w-40 h-40 border-4 border-primary-200 rounded-full"></div>
		</div>
		
		<!-- Rotating gradient ring -->
		<div class="absolute inset-0 flex items-center justify-center animate-spin-slow">
			<div class="w-40 h-40 border-4 border-transparent border-t-primary-600 border-r-primary-500 rounded-full"></div>
		</div>

		<!-- Inner content -->
		<div class="relative flex flex-col items-center justify-center w-40 h-40">
			<!-- Logo with scale animation -->
			<div class="animate-scale-pulse">
				<img 
					src={imageSrc} 
					alt={imageAlt}
					class="w-20 h-20 object-contain drop-shadow-lg"
				/>
			</div>
		</div>
	</div>
	<!-- Loading dots indicator below -->
	<div class="absolute bottom-1/3 flex space-x-2">
		<div class="w-3 h-3 bg-primary-600 rounded-full animate-wave" style="animation-delay: 0s"></div>
		<div class="w-3 h-3 bg-primary-600 rounded-full animate-wave" style="animation-delay: 0.2s"></div>
		<div class="w-3 h-3 bg-primary-600 rounded-full animate-wave" style="animation-delay: 0.4s"></div>
	</div>

</div>

<style>
	:root {
		--tw-primary-600: #0ea5a4;
		--tw-primary-500: #14b8b7;
		--tw-primary-200: #a5f3f2;
	}
	
	@keyframes spin-slow {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}
	
	.animate-spin-slow {
		animation: spin-slow 2s linear infinite;
	}
	
	@keyframes scale-pulse {
		0%, 100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.1);
		}
	}
	
	.animate-scale-pulse {
		animation: scale-pulse 2s ease-in-out infinite;
	}
	
	@keyframes wave {
		0%, 100% {
			transform: translateY(0);
			opacity: 0.4;
		}
		50% {
			transform: translateY(-10px);
			opacity: 1;
		}
	}
	
	.animate-wave {
		animation: wave 1.5s ease-in-out infinite;
	}
</style>