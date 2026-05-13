<script>
  import Signin from "$lib/components/login.svelte";

  import { onMount } from 'svelte';

  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.has('reload') && urlParams.get('reload') === 'true') {
      urlParams.delete('reload');
      const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
      window.history.replaceState({}, '', newUrl); 
      location.reload();
    }
  });



</script>



<div class="min-h-screen overflow-hidden bg-gradient-to-br from-primary-950 via-primary-800 to-primary-900 relative">
  <div class="absolute top-1/4 left-10 lg:w-72 w-8 lg:h-80 h-8 bg-primary-800/20 blur-sm clip-hexagon shadow-md"></div>
  <div class="absolute bottom-0 right-1/4 w-10 lg:w-80 h-10 lg:h-80 bg-primary-900/10 clip-hexagon"></div>
  <div class="absolute top-0 right-10 w-10 lg:w-80 h-10 lg:h-80 bg-primary-900/5 clip-hexagon"></div>
  <Signin />
</div>