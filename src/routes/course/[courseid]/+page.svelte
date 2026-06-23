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


<div class=" bg-black  ">
<Courseindi {data} />
</div>