<script>
  import { enhance } from "$app/forms";

  export let open        = false;
  export let courseId    = "";
  export let form        = null;
  export let editChapter = null;

  $: isEdit = !!editChapter;

  let title      = "";
  let errors     = {};
  let touched    = {};
  let submitting = false;
  let toast      = null;

  let toastTimer = null;

  function showToast(type, message) {
    toast = { type, message };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast = null), 3500);
  }

  $: if (open) {
    title   = isEdit ? (editChapter?.title ?? "") : "";
    errors  = {};
    touched = {};
    toast   = null;
  }

  function onKeydown(e) { if (e.key === "Escape" && !submitting) open = false; }

  function validateTitle(v) {
    if (!v.trim())             return "Chapter title is required.";
    if (v.trim().length < 3)   return "Minimum 3 characters.";
    if (v.trim().length > 100) return "Maximum 100 characters.";
    return null;
  }

  function touch(field) {
    touched = { ...touched, [field]: true };
    if (field === "title") errors = { ...errors, title: validateTitle(title) };
  }

  function onInput() {
    if (!touched.title) return;
    errors = { ...errors, title: validateTitle(title) };
  }

  function enhanceForm() {
    return ({ formData, cancel }) => {
      touched = { title: true };
      const err = validateTitle(title);
      errors = err ? { title: err } : {};
      if (err) { cancel(); return; }

      formData.set("title",    title.trim());
      formData.set("courseId", courseId);
      if (isEdit) formData.set("chapterId", editChapter._id);

      submitting = true;

      return async ({ result, update }) => {
        await update({ reset: false });
        submitting = false;

        if (result?.type === "success" || result?.data?.success) {
          showToast("success", isEdit ? "Chapter updated!" : "Chapter added!");
          setTimeout(() => {
            open = false;
          }, 1200); // slight delay so user sees toast before close
        } else {
          const msg =
            result?.data?.serverError ||
            form?.serverError ||
            "Something went wrong.";
          showToast("error", msg);
        }
      };
    };
  }
</script>

<svelte:window on:keydown={onKeydown} />

<!-- Toast -->
{#if toast}
  <div
    class="fixed bottom-5 right-5 z-[100] flex items-center gap-3
           px-5 py-3 rounded-2xl shadow-xl border text-sm font-semibold
           {toast.type === 'success'
             ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300'
             : 'bg-rose-950/90 border-rose-500/30 text-rose-300'}"
  >
    <span>{toast.type === "success" ? "✓" : "✗"}</span>
    {toast.message}
  </div>
{/if}

{#if open}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 bg-black/65 backdrop-blur-[6px]"
    role="button" tabindex="-1"
    on:click={() => !submitting && (open = false)}
    on:keydown={() => {}}
    aria-label="Close modal"
  ></div>

  <!-- Panel -->
  <div class="fixed inset-0 z-[55] flex items-end sm:items-center justify-center p-0 sm:p-6"
       role="dialog" aria-modal="true" aria-labelledby="modal-title">

    <div class="w-full sm:max-w-md bg-[#0d0f17] border border-white/[0.08]
                rounded-t-[2rem] sm:rounded-[2rem]
                shadow-[0_32px_80px_-12px_rgba(0,0,0,0.9)]
                overflow-hidden flex flex-col max-h-[92vh]"
         style="font-family:'DM Sans',sans-serif;">

      <!-- mobile handle -->
      <div class="sm:hidden flex justify-center pt-3 pb-1">
        <div class="w-10 h-1 rounded-full bg-white/10"></div>
      </div>

      <!-- accent bar -->
      <div class="h-[2px] w-full bg-gradient-to-r from-violet-600/0 via-violet-500 to-violet-600/0 flex-shrink-0"></div>

      <!-- Header -->
      <div class="px-7 pt-6 pb-5 flex items-start justify-between gap-4 flex-shrink-0">
        <div>
          <p class="text-[0.6rem] font-black tracking-[0.22em] uppercase text-violet-400 font-mono mb-1.5">
            Course Builder · Step 2
          </p>
          <h2 id="modal-title" class="text-lg font-bold text-white leading-tight">
            {isEdit ? 'Edit Chapter' : 'New Chapter'}
          </h2>
          <p class="text-xs text-zinc-500 mt-1 leading-relaxed">
            {isEdit
              ? 'Update the chapter title below.'
              : 'Give this chapter a title. Add lessons inside it next.'}
          </p>
        </div>
        <button
          type="button"
          on:click={() => !submitting && (open = false)}
          disabled={submitting}
          class="w-8 h-8 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-white/5
                 flex items-center justify-center text-zinc-500 hover:text-zinc-200
                 transition-all flex-shrink-0 mt-0.5"
          aria-label="Close"
        >✕</button>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto px-7 pb-2">
        <form
          id="section-modal-form"
          method="POST"
          action={isEdit ? "?/updateSection" : "?/addSection"}
          use:enhance={enhanceForm()}
        >
          <input type="hidden" name="courseId" value={courseId} />
          {#if isEdit}
            <input type="hidden" name="chapterId" value={editChapter?._id ?? ''} />
          {/if}

          <!-- Title -->
          <div class="mb-6">
            <label class="block text-[0.68rem] font-bold tracking-[0.15em] uppercase
                          text-zinc-400 mb-2" for="sec-title">
              Chapter Title <span class="text-rose-400">*</span>
            </label>
            <input
              id="sec-title" name="title" type="text"
              maxlength="100" autocomplete="off"
              placeholder="e.g. Introduction to Java"
              bind:value={title}
              on:input={onInput}
              on:blur={() => touch("title")}
              class="block w-full rounded-xl px-4 py-3 text-sm text-zinc-100
                     placeholder-zinc-600 outline-none transition-all duration-200
                     bg-zinc-900/70 border focus:ring-2 focus:ring-violet-500/15
                     {errors.title
                       ? 'border-rose-500/50 focus:border-rose-500/50'
                       : 'border-white/[0.08] focus:border-violet-500/50'}"
            />
            <div class="flex items-center justify-between mt-1.5">
              {#if errors.title}
                <p class="text-rose-400 text-xs flex items-center gap-1"><span>⚠</span>{errors.title}</p>
              {:else}<span></span>{/if}
              <span class="text-[0.62rem] font-mono text-zinc-700 ml-auto">{title.length}/100</span>
            </div>
          </div>

          <!-- Preview -->
          {#if title.trim()}
            <div class="mb-6 flex items-center gap-3 bg-violet-950/25
                        border border-violet-800/20 rounded-xl px-4 py-3">
              <div class="w-6 h-6 rounded-lg bg-violet-600/25 border border-violet-500/20
                          flex items-center justify-center text-[0.6rem] font-black text-violet-400">
                {isEdit ? '✎' : '#'}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold text-zinc-300 truncate">{title.trim()}</p>
                <p class="text-[0.6rem] text-zinc-600 font-mono mt-0.5">
                  {isEdit ? 'Updating chapter title' : 'New chapter · add lessons next'}
                </p>
              </div>
              <span class="text-[0.6rem] text-violet-500 font-bold tracking-wider uppercase">Preview</span>
            </div>
          {/if}

          <!-- Server error -->
          {#if form?.serverError}
            <div class="mb-4 bg-rose-950/40 border border-rose-800/30 rounded-xl px-4 py-3">
              <p class="text-rose-400 text-xs flex items-center gap-1.5"><span>✗</span>{form.serverError}</p>
            </div>
          {/if}
        </form>
      </div>

      <!-- Footer -->
      <div class="px-7 py-5 border-t border-white/[0.05] flex items-center justify-between gap-3 flex-shrink-0">
        <button
          type="button"
          on:click={() => !submitting && (open = false)}
          disabled={submitting}
          class="text-sm text-zinc-500 hover:text-zinc-300 px-4 py-2.5
                 rounded-xl hover:bg-white/5 transition-all disabled:opacity-40"
        >Cancel</button>

        <button
          type="submit" form="section-modal-form" disabled={submitting}
          class="flex items-center gap-2.5 bg-violet-600 hover:bg-violet-500
                 text-white font-semibold text-sm px-7 py-2.5 rounded-xl
                 transition-all duration-150 shadow-lg shadow-violet-950/50
                 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {#if submitting}
            <span class="w-3.5 h-3.5 border-2 border-white/25 border-t-white
                         rounded-full animate-spin inline-block"></span>
            Saving…
          {:else}
            {isEdit ? 'Update Chapter' : 'Save Chapter'} <span class="text-base leading-none">→</span>
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}