 <script>
	import { authedUser } from '$lib/stores/mainStores.js';
	import { onMount } from 'svelte';
	
	export let data;
	console.log(data, "data from forgot");
	onMount(() => {
	  
	  authedUser.set({ username: "", email: "", userId: "" });
	  
	  
	  console.log('All local data cleared');
	});
  </script> 
