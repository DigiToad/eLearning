<script>
    import { page } from '$app/stores';
    import { PUBLIC_WEBSITE_URL } from '$env/static/public';
    import Icon from '@iconify/svelte';
    import Errorpgnt from '$lib/components/Error404.svelte';
    import Interror from '$lib/components/Error500.svelte';
    
    // $: status = $page?.status;
    $: message = $page.error?.message || "Something went wrong. Please try again later.";
    
 let pagestatus = $page.error.status;
//  console.log(pagestatus,"pagestatuspagestatuspagestatuspagestatus");
 
    function goHome() {
        window.location.href = PUBLIC_WEBSITE_URL;
    }
    
    function goBack() {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            goHome();
        }
    }
</script>

{#if pagestatus === 404}
    <Errorpgnt />
{:else if pagestatus === 500}
    <Interror />
{:else}
  <Interror />
{/if}