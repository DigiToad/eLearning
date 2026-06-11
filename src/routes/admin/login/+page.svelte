<script>
  import Signin from "$lib/components/Loginadmin.svelte";

  import { onMount } from "svelte";

  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.has("reload") && urlParams.get("reload") === "true") {
      urlParams.delete("reload");
      const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
      window.history.replaceState({}, "", newUrl);
      location.reload();
    }
  });
</script>

<Signin />
