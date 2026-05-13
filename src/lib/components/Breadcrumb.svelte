<script>
  import { page } from '$app/stores';
  import { derived } from 'svelte/store';
  
  const breadcrumbs = derived(page, ($page) => {
    const segments = $page.url.pathname.split('/').filter(Boolean);
    let path = '';
    return segments.map((segment) => {
      path += `/${segment}`;
      const name = segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      return { name, href: path };
    });
  });
</script>

<div class=" from-slate-50 to-slate-100  border-slate-200 py-1 px-6  max-w-7xl mx-auto w-full">
  <ol class="flex items-center flex-wrap gap-2 text-sm">
    <li class="flex items-center">
      <a 
        href="/" 
        class="flex items-center gap-1.5 text-slate-600 hover:text-primary-600 transition-colors duration-200 font-medium"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span>Home</span>
      </a>
    </li>
    
    {#each $breadcrumbs as item, i}
      <li class="flex items-center gap-2">
        <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
        
        {#if i === $breadcrumbs.length - 1}
          <span class="text-primary-600 font-semibold px-3 py-1.5 bg-primary-50 rounded-lg">
            {item.name}
          </span>
        {:else}
          <a 
            href={item.href} 
            class="text-slate-600 hover:text-primary-600 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-all duration-200 font-medium"
          >
            {item.name}
          </a>
        {/if}
      </li>
    {/each}
  </ol>
</div>