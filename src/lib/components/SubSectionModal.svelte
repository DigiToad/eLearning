<script>
  import { enhance } from "$app/forms";

  export let open = false;

  export let courseId = "";
  export let sectionId = "";
  export let moduleSectionId = "";
console.log(moduleSectionId,"moduleSectionId");

  let submitting = false;

  let title = "";
  let description = "";
  let type = "video";

  function resetForm() {
    title = "";
    description = "";
    type = "video";
  }

  $: if (open) {
    resetForm();
  }

  function enhanceSubSection() {
    return ({ formData }) => {

      formData.set("courseId", courseId);

      formData.set("sectionId", sectionId);

      formData.set(
        "moduleSectionId",
        moduleSectionId
      );

      formData.set("title", title);

      formData.set(
        "description",
        description
      );

      formData.set("type", type);

      submitting = true;

      return async ({ update }) => {
        await update({ reset: false });

        submitting = false;

        open = false;
      };
    };
  }
</script>

{#if open}

  <!-- BACKDROP -->
  <div
    class="fixed inset-0 z-50
           bg-black/70 backdrop-blur-sm"
  ></div>

  <!-- MODAL -->
  <div
    class="fixed inset-0 z-[60]
           flex items-center justify-center
           p-5"
  >
    <div
      class="w-full max-w-xl
             rounded-3xl
             bg-[#0d1017]
             border border-white/10
             overflow-hidden"
    >

      <!-- HEADER -->
      <div
        class="px-6 py-5
               border-b border-white/5"
      >
        <div class="flex items-center justify-between">

          <div>
            <p
              class="text-[0.65rem]
                     uppercase tracking-[0.25em]
                     text-violet-400 font-bold"
            >
              Course Builder
            </p>

            <h2
              class="text-2xl font-bold
                     text-white mt-2"
            >
              Add New Lesson
            </h2>

            <p
              class="text-sm text-zinc-500 mt-2"
            >
              Add a video or assessment.
            </p>
          </div>

          <button
            type="button"
            on:click={() => (open = false)}
            class="w-10 h-10 rounded-xl
                   bg-zinc-800 hover:bg-zinc-700
                   text-zinc-400 hover:text-white
                   transition-all"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- FORM -->
      <form
        method="POST"
        action="?/createSubSection"
        use:enhance={enhanceSubSection()}
        class="p-6 space-y-5"
      >

        <!-- TITLE -->
        <div>
          <label
            class="block text-xs font-semibold
                   text-zinc-400 mb-2"
          >
            Lesson Title
          </label>

          <input
            type="text"
            bind:value={title}
            placeholder="Enter lesson title"
            class="w-full rounded-2xl
                   bg-[#11141d]
                   border border-white/10
                   px-4 py-3
                   text-white text-sm
                   outline-none
                   focus:border-violet-500"
          />
        </div>

        <!-- DESCRIPTION -->
        <div>
          <label
            class="block text-xs font-semibold
                   text-zinc-400 mb-2"
          >
            Description
          </label>

          <textarea
            rows="4"
            bind:value={description}
            placeholder="Enter lesson description"
            class="w-full rounded-2xl
                   bg-[#11141d]
                   border border-white/10
                   px-4 py-3
                   text-white text-sm
                   outline-none
                   focus:border-violet-500"
          ></textarea>
        </div>

        <!-- TYPE -->
        <div>
          <label
            class="block text-xs font-semibold
                   text-zinc-400 mb-3"
          >
            Lesson Type
          </label>

          <div class="grid grid-cols-2 gap-3">

            <!-- VIDEO -->
            <button
              type="button"
              on:click={() => (type = "video")}
              class="rounded-2xl border
                     px-4 py-4 text-left
                     transition-all
                     {type === 'video'
                       ? 'bg-violet-600/20 border-violet-500 text-violet-300'
                       : 'border-white/10 bg-[#11141d] text-zinc-400'}"
            >
              <div class="text-2xl mb-2">
                🎬
              </div>

              <p class="font-semibold text-sm">
                Video Lesson
              </p>

              <p class="text-xs mt-1 opacity-70">
                Upload lesson videos
              </p>
            </button>

            <!-- QUIZ -->
            <button
              type="button"
              on:click={() => (type = "assessment")}
              class="rounded-2xl border
                     px-4 py-4 text-left
                     transition-all
                     {type === 'assessment'
                       ? 'bg-violet-600/20 border-violet-500 text-violet-300'
                       : 'border-white/10 bg-[#11141d] text-zinc-400'}"
            >
              <div class="text-2xl mb-2">
                📝
              </div>

              <p class="font-semibold text-sm">
                Assessment
              </p>

              <p class="text-xs mt-1 opacity-70">
                Create quizzes
              </p>
            </button>

          </div>
        </div>

        <!-- FOOTER -->
        <div
          class="flex items-center justify-between
                 pt-4"
        >
          <button
            type="button"
            on:click={() => (open = false)}
            class="px-5 py-3 rounded-2xl
                   bg-zinc-800 hover:bg-zinc-700
                   text-sm font-semibold
                   transition-all"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting}
            class="px-6 py-3 rounded-2xl
                   bg-violet-600 hover:bg-violet-500
                   text-white text-sm font-semibold
                   transition-all"
          >
            {#if submitting}
              Saving...
            {:else}
              Save Lesson
            {/if}
          </button>
        </div>
      </form>
    </div>
  </div>

{/if}