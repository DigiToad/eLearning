<!-- <script>
	import Courseindi from "$lib/components/Courseindi.svelte";
	export let data;
</script>
<Courseindi {data}/> -->


<script>
    import Courseindi from "$lib/components/Courseindi.svelte";
    export let data;
</script>

<!-- Disable right-click and devtools keyboard shortcuts globally -->
<svelte:window
    on:contextmenu|preventDefault={() => {}}
    on:keydown={(e) => {
        if (
            e.key === 'F12' ||
            (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'K'].includes(e.key)) ||
            (e.ctrlKey && e.key === 'U') ||
            (e.ctrlKey && e.shiftKey && e.key === 'M')
        ) {
            e.preventDefault();
        }
    }}
/>

<style>
    /*
      Transparent overlay sits on top of the video/iframe.
      Blocks right-click on the player itself.
      pointer-events: none lets clicks pass through to controls,
      but we selectively block contextmenu via JS.
    */
    .video-wrapper {
        position: relative;
    }

    .video-shield {
        position: absolute;
        inset: 0;
        z-index: 10;
        /* Allows clicks/play controls through, but intercepts right-click */
        background: transparent;
    }
</style>

<Courseindi {data} />