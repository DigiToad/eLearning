<script>
import { PUBLIC_WEBSITE_URL  } from '$env/static/public';
  export let metadata = {
    title: "Default Title",
    description: "Default description",
    image: null,
    og: {
      title: "Default OG Title",
      description: "Default OG Description",
      image: null,
    },
    keywords: "embedded systems, edge AI, artificial intelligence, IoT, Industrial IoT, machine learning education, Industry 4.0, embedded machine learning, Centers of Excellence, STMicroelectronics partner, FPGA development, automation solutions, wireless communication, aerospace applications, data acquisition, machine vision, sensor technology, engineering training, proof of concept development, system integration, bangalore embedded systems",
    urlPath: PUBLIC_WEBSITE_URL ,
    schema: null,
  };
</script>

<svelte:head>
  <title>{metadata.title}</title>
  <meta name="title" content={metadata.title} />
  <meta name="description" content={metadata.description} />
  <meta name="keywords" content={metadata.keywords} />

  <meta property="og:type" content="product" />
  <meta property="og:title" content={metadata.og?.title || metadata.title} />
  <meta property="og:description" content={metadata.og?.description || metadata.description} />
  {#if metadata?.image}
    <meta property="og:image" content={metadata.image} />
  {/if}
  {#if metadata?.urlPath}
    <meta property="og:url" content={metadata.urlPath} />
  {/if}

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={metadata.og?.title || metadata.title} />
  <meta name="twitter:description" content={metadata.og?.description || metadata.description} />
  {#if metadata?.image}
    <meta name="twitter:image" content={metadata.image} />
  {/if}

  {#if metadata?.urlPath}
    <link rel="canonical" href={metadata.urlPath} />
  {/if}

  {#if metadata?.schema}
    {@html `<script type="application/ld+json">${JSON.stringify(metadata.schema)}</script>`}
  {/if}
</svelte:head>
