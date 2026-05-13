<script>
  import { onMount, tick } from "svelte";
  import { enhance, applyAction } from "$app/forms";
  import { Toaster, toast } from "svelte-sonner";
  import { createEventDispatcher } from "svelte";

  export let isEditing = false;
  export let blogToEdit = null;
  export let showForm = false;

  const dispatch = createEventDispatcher();

  let title = "";
  let description = "";
  let content = "";
  let image = "";
  let category = "";
  let imageType = "url";
  let uploadedImage = null;
  let fileInput; // Reference to file input element
  let editor;
  let editorContainer;
  let Quill;

  // Load Quill once on mount
  onMount(async () => {
    const quillModule = await import("quill");
    await import("quill/dist/quill.snow.css");
    Quill = quillModule.default;
    await tick();

    if (editorContainer && !editor) {
      editor = new Quill(editorContainer, {
        theme: "snow",
        placeholder: "Write your blog content...",
        modules: {
          toolbar: [
            [{ header: [1, 2, 3, false] }],
            ["bold", "italic", "underline"],
            [{ list: "ordered" }, { list: "bullet" }],
            [{ color: [] }],
            ["link", "blockquote", "code-block", "image"],
            ["clean"],
          ],
        },
      });

      editor.on("text-change", () => {
        content = editor.root.innerHTML;
      });
    }
  });

  // When showForm becomes true, initialize or reset form fields
  $: if (showForm) {
    initializeForm();
  }

  async function initializeForm() {
    await tick(); // Wait for DOM to be ready (important for editor)

    if (isEditing && blogToEdit) {
      // Editing an existing blog
      title = blogToEdit.title || "";
      category = blogToEdit.category || "";
      image = blogToEdit.image || "";
      content = blogToEdit.content || "";
      imageType = image?.startsWith("http") ? "url" : "upload";

      if (editor) {
        editor.root.innerHTML = blogToEdit.content || "";
      }
    } else {
      // Adding a new blog — clear all fields
      title = "";
      description = "";
      category = "";
      image = "";
      content = "";
      imageType = "url";
      uploadedImage = null;

      if (editor) {
        editor.root.innerHTML = "";
      }
    }
  }

  // Called when clicking "Add New Blog" button
  function resetForm() {
    blogToEdit = null;
    isEditing = false;
    showForm = true; // this will trigger initializeForm automatically
  }

  function handleFileChange(event) {
    const file = event.target.files[0];
    if (file) {
      uploadedImage = file;
      image = URL.createObjectURL(file); // For preview only
    }
  }
</script>

<div
  class={showForm
    ? "fixed inset-0 z-40 bg-black bg-opacity-40 flex items-center justify-center"
    : "hidden"}
>
  <div
    class="bg-white p-6 rounded-lg shadow-lg w-8/12 h-[530px] overflow-y-auto relative z-50"
  >
    <h2 class="text-xl font-bold mb-4">
      {isEditing ? "Edit Product" : "Create New Product"}
    </h2>

    <form
      class="space-y-4"
      method="POST"
      action={isEditing ? "?/editblog" : "?/createblogs"}
      enctype="multipart/form-data"
      use:enhance={({ cancel }) => {
        return async ({ result }) => {
          if (result.type === "success") {
            if (result.data?.success) {
              toast.success(result.data.message);
              resetForm();
              showForm = false;
            } else {
              toast.error(result.data?.error || result.data?.message);
            }
          } else if (result.type === "failure") {
            toast.error(result.data?.error || "Form submission failed");
          }
          await applyAction(result);
        };
      }}
    >
      <input
        bind:value={title}
        name="title"
        placeholder="Title"
        class="w-full p-2 border rounded"
        required
      />

      {#if blogToEdit}
        <input name="id" type="hidden" bind:value={blogToEdit.id} />
      {/if}

      <div
        class="border border-t rounded bg-white h-52"
        bind:this={editorContainer}
      ></div>
      <input type="hidden" name="content" value={content} />

      <div class="space-y-2">
        <!-- svelte-ignore a11y-label-has-associated-control -->
        <label class="font-semibold">Image Input Type:</label>
        <div class="flex gap-4">
          <label
            ><input type="radio" bind:group={imageType} value="url" /> URL</label
          >
          <label
            ><input type="radio" bind:group={imageType} value="upload" /> Upload</label
          >
        </div>

        {#if imageType === "url"}
          <input
            type="text"
            bind:value={image}
            name="image"
            placeholder="Image URL"
            class="w-full p-2 border rounded"
            required
          />
        {:else}
          <!-- File input for uploading -->
          <input
            bind:this={fileInput}
            type="file"
            name="image"
            accept="image/*"
            on:change={handleFileChange}
            class="w-full p-2 border rounded"
            required={!isEditing}
          />
        {/if}
      </div>

      <div class="flex justify-end gap-2">
        <button
          type="button"
          on:click={() => {
            showForm = false;
          }}
          class="px-4 py-2 rounded border border-gray-400 hover:bg-gray-100"
          >Cancel</button
        >
        <button
          type="submit"
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {isEditing ? "Update" : "Submit"}
        </button>
      </div>
    </form>

    <div class="mt-6 border-t pt-4">
      <h3 class="text-lg font-semibold mb-2">Preview</h3>
      {#if image}
        <!-- svelte-ignore a11y-img-redundant-alt -->
        <img
          src={image}
          alt="Preview Image"
          class="w-40 h-40 rounded border mb-4"
        />
      {/if}
      <!-- <div
        class="prose max-w-full break-words whitespace-pre-wrap overflow-hidden"
      >
        {@html content}
      </div> -->
    </div>
  </div>
</div>

<Toaster position="bottom-right" richColors />