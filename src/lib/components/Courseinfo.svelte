<script>
  import { enhance } from "$app/forms";
  import MediaUploader from "$lib/components/Mediaupload.svelte";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let form;
  export let course = null;
  export let isEdit = false;
  export let onSuccess = null;

  let imageValue   = course?.image ?? "";
  let keywordsRaw  = course?.keywords?.join?.(",") ?? course?.keywords ?? "";
  let descLen      = course?.description?.length ?? 0;
  let titleLen     = course?.title?.length ?? 0;
  let hasSubmitted = false;
  let resetKey     = 0;   // ← forces MediaUploader remount on success

  let clientErrors  = {};
  let touchedFields = {};
  let submitted     = false;

  // ── Success / error handling ─────────────────────────────────────────────
  let lastFormSuccess = null;
  $: if (form?.success && hasSubmitted && form !== lastFormSuccess) {
    lastFormSuccess = form;
    hasSubmitted    = false;
    resetKey       += 1;   // ← remounts MediaUploader completely
    dispatch("notify", {
      type: "success",
      message: isEdit ? "Course updated!" : "Course info saved successfully!",
    });
    setTimeout(() => {
      if (onSuccess) onSuccess();
    }, 1500);
  }

  $: if ((form?.serverError || form?.error) && hasSubmitted) {
    dispatch("notify", {
      type: "error",
      message: form?.serverError ?? form?.error,
    });
  }

  function sanitize(str) {
    if (typeof str !== "string") return "";
    return str
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
      .replace(/<[^>]+>/g, "")
      .trim();
  }

  function validateAll(fd) {
    const errs = {};
    const title       = sanitize(fd.get("title")       ?? "");
    const instructor  = sanitize(fd.get("instructor")  ?? "");
    const level       = sanitize(fd.get("level")       ?? "");
    const description = sanitize(fd.get("description") ?? "");
    const priceRaw    = fd.get("price") ?? "";
    const keywords    = sanitize(fd.get("keywords")    ?? "");
    const image       = imageValue;

    if (!title) errs.title = "Course title is required.";
    else if (title.length < 5)   errs.title = "Title must be at least 5 characters.";
    else if (title.length > 120) errs.title = "Title must be under 120 characters.";

    if (!instructor) errs.instructor = "Instructor name is required.";
    else if (instructor.length < 2) errs.instructor = "Instructor name must be at least 2 characters.";

    if (!level) errs.level = "Please select a level.";

    if (!description) errs.description = "Short description is required.";
    else if (description.length < 20)  errs.description = "Description must be at least 20 characters.";
    else if (description.length > 500) errs.description = "Description must be under 500 characters.";

    const price = parseFloat(priceRaw);
    if (!priceRaw && priceRaw !== "0") errs.price = "Price is required.";
    else if (isNaN(price) || price < 0) errs.price = "Price must be a valid non-negative number.";
    else if (price > 1000000) errs.price = "Price seems too high. Max ₹10,00,000.";

    if (!image) errs.image = "Course thumbnail is required.";

    if (!keywords) errs.keywords = "At least one SEO keyword is required.";
    else {
      const kws = keywords.split(",").map((k) => k.trim()).filter(Boolean);
      if (kws.length < 2)              errs.keywords = "Add at least 2 keywords (comma-separated).";
      if (kws.some((k) => k.length > 50)) errs.keywords = "Each keyword must be under 50 characters.";
    }

    fd.set("title",       title);
    fd.set("instructor",  instructor);
    fd.set("level",       level);
    fd.set("description", description);
    fd.set("keywords",    keywords);
    fd.set("image",       image);
    return errs;
  }

  function validateField(name, value) {
    const errs = { ...clientErrors };
    if (name === "title") {
      const v = sanitize(value);
      if (!v) errs.title = "Course title is required.";
      else if (v.length < 5)   errs.title = "Title must be at least 5 characters.";
      else if (v.length > 120) errs.title = "Title must be under 120 characters.";
      else delete errs.title;
    }
    if (name === "instructor") {
      const v = sanitize(value);
      if (!v) errs.instructor = "Instructor name is required.";
      else if (v.length < 2) errs.instructor = "Instructor name must be at least 2 characters.";
      else delete errs.instructor;
    }
    if (name === "level") {
      if (!value) errs.level = "Please select a level.";
      else delete errs.level;
    }
    if (name === "description") {
      const v = sanitize(value);
      if (!v) errs.description = "Short description is required.";
      else if (v.length < 20)  errs.description = "Description must be at least 20 characters.";
      else if (v.length > 500) errs.description = "Description must be under 500 characters.";
      else delete errs.description;
    }
    if (name === "price") {
      const price = parseFloat(value);
      if (!value && value !== "0") errs.price = "Price is required.";
      else if (isNaN(price) || price < 0) errs.price = "Price must be a valid non-negative number.";
      else if (price > 1000000) errs.price = "Price seems too high.";
      else delete errs.price;
    }
    if (name === "keywords") {
      const v = sanitize(value);
      if (!v) {
        errs.keywords = "At least one SEO keyword is required.";
      } else {
        const kws = v.split(",").map((k) => k.trim()).filter(Boolean);
        if (kws.length < 2) errs.keywords = "Add at least 2 keywords (comma-separated).";
        else if (kws.some((k) => k.length > 50)) errs.keywords = "Each keyword must be under 50 characters.";
        else delete errs.keywords;
      }
    }
    clientErrors = errs;
  }

  function handleBlur(e) {
    const { name, value } = e.target;
    touchedFields = { ...touchedFields, [name]: true };
    validateField(name, value);
  }
  function handleInput(e) {
    const { name, value } = e.target;
    if (touchedFields[name]) validateField(name, value);
  }

  function onImageChange(e) {
    imageValue = e.detail?.value ?? e.detail ?? "";
    if (imageValue) {
      const errs = { ...clientErrors };
      delete errs.image;
      clientErrors = errs;
    }
  }

  $: keywordTags = keywordsRaw.split(",").map((k) => k.trim()).filter(Boolean);

  function enhanceForm() {
    return ({ formData, cancel }) => {
      submitted = true;
      touchedFields = {
        title: true, instructor: true, level: true,
        description: true, price: true, keywords: true,
      };
      if (isEdit) formData.set("courseId", course?.courseId ?? "");
      const errs = validateAll(formData);
      if (Object.keys(errs).length) {
        clientErrors = errs;
        cancel();
        setTimeout(() => {
          const el = document.querySelector("[data-error='true']");
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 50);
        return;
      }
      clientErrors = {};
      hasSubmitted = true;
      return async ({ update }) => {
        await update({ reset: !isEdit });
        if (!isEdit) {
          imageValue    = "";
          submitted     = false;
          touchedFields = {};
          keywordsRaw   = "";
          titleLen      = 0;
          descLen       = 0;
          // resetKey incremented by the reactive success block above
        }
      };
    };
  }

  function iv(field) {
    const val = course?.[field] ?? form?.values?.[field] ?? "";
    if (field === "keywords") {
      if (Array.isArray(val)) return val.join(", ");
      return val;
    }
    return val;
  }

  let currentTitle       = iv("title");
  let currentInstructor  = iv("instructor");
  let currentLevel       = iv("level");
  let currentDescription = iv("description");
  let currentPrice       = String(iv("price"));
  let currentKeywords    = iv("keywords");

  $: isDirty = isEdit
    ? currentTitle       !== (course?.title       ?? "") ||
      currentInstructor  !== (course?.instructor  ?? "") ||
      currentLevel       !== (course?.level       ?? "") ||
      currentDescription !== (course?.description ?? "") ||
      currentPrice       !== String(course?.price ?? "") ||
      currentKeywords    !== iv("keywords") ||
      imageValue         !== (course?.image ?? "")
    : true;
</script>

<div class="bg-[#0a0c10] text-zinc-100 font-sans flex items-start justify-center py-12 px-4 rounded-md">
  <div class="relative w-full max-w-2xl">

    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-center gap-2 mb-3">
        <span class="w-1.5 h-6 rounded-full bg-violet-500 inline-block"></span>
        <p class="text-[0.65rem] font-bold tracking-[0.2em] uppercase text-violet-400 font-mono">
          Course Manager
        </p>
      </div>
      <h1 class="text-3xl font-bold tracking-tight text-white">
        {isEdit ? `Edit: ${course?.title}` : "New Course"}
      </h1>
      <p class="text-zinc-500 text-sm mt-1.5">
        {isEdit
          ? "Update the course details below."
          : "Fill in the details below to create your course listing."}
      </p>
    </div>

    <div class="bg-[#12151c] border border-white/[0.06] rounded-3xl overflow-hidden shadow-2xl shadow-black/40">
      <form
        method="POST"
        action={isEdit ? "?/updatedcourseinfo" : "?/createcourseinfo"}
        use:enhance={enhanceForm()}
        class="divide-y divide-white/[0.04]"
        novalidate
      >
        {#if isEdit}
          <input type="hidden" name="courseId" value={course?.courseId ?? ""} />
        {/if}

        <!-- Course Basics -->
        <div class="px-8 py-7 space-y-5">
          <p class="text-[0.65rem] font-bold tracking-[0.18em] uppercase text-zinc-500 font-mono">
            Course Basics
          </p>

          <!-- Title -->
          <div data-error={!!clientErrors.title}>
            <div class="flex justify-between items-center mb-1.5">
              <label class="text-[0.72rem] font-semibold tracking-widest uppercase text-zinc-400" for="f-title">
                Course Title <span class="text-red-400">*</span>
              </label>
              <span class="text-[0.65rem] font-mono text-zinc-600">{titleLen}/120</span>
            </div>
            <input
              id="f-title" name="title" type="text"
              autocomplete="off" maxlength="120"
              placeholder="e.g. Complete Java Full-Stack Development"
              value={iv("title")}
              on:input={(e) => { titleLen = e.target.value.length; currentTitle = e.target.value; handleInput(e); }}
              on:blur={handleBlur}
              class="block w-full bg-zinc-900/80 border rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600
                     outline-none transition-all focus:ring-2 focus:ring-violet-500/20
                     {clientErrors.title ? 'border-red-500/50' : 'border-white/8 focus:border-violet-500/50'}"
            />
            {#if clientErrors.title}
              <p class="text-red-400 text-xs mt-1.5 flex items-center gap-1"><span>⚠</span>{clientErrors.title}</p>
            {/if}
          </div>

          <!-- Instructor + Level -->
          <div class="grid grid-cols-2 gap-4">
            <div data-error={!!clientErrors.instructor}>
              <label class="block text-[0.72rem] font-semibold tracking-widest uppercase text-zinc-400 mb-1.5" for="f-inst">
                Instructor <span class="text-red-400">*</span>
              </label>
              <input
                id="f-inst" name="instructor" type="text"
                autocomplete="off" placeholder="e.g. Rahul Sharma"
                value={iv("instructor")}
                on:input={(e) => { currentInstructor = e.target.value; handleInput(e); }}
                on:blur={handleBlur}
                class="block w-full bg-zinc-900/80 border rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600
                       outline-none transition-all focus:ring-2 focus:ring-violet-500/20
                       {clientErrors.instructor ? 'border-red-500/50' : 'border-white/8 focus:border-violet-500/50'}"
              />
              {#if clientErrors.instructor}
                <p class="text-red-400 text-xs mt-1.5 flex items-center gap-1"><span>⚠</span>{clientErrors.instructor}</p>
              {/if}
            </div>

            <div data-error={!!clientErrors.level}>
              <label class="block text-[0.72rem] font-semibold tracking-widest uppercase text-zinc-400 mb-1.5" for="f-level">
                Level <span class="text-red-400">*</span>
              </label>
              <div class="relative">
                <select
                  id="f-level" name="level"
                  on:change={(e) => { touchedFields.level = true; currentLevel = e.target.value; validateField("level", e.target.value); }}
                  class="block w-full bg-zinc-900/80 border rounded-xl px-4 py-3 text-sm text-zinc-100
                         outline-none transition-all focus:ring-2 focus:ring-violet-500/20 appearance-none cursor-pointer
                         {clientErrors.level ? 'border-red-500/50' : 'border-white/8 focus:border-violet-500/50'}"
                >
                  <option value="" class="bg-zinc-900">Select level…</option>
                  {#each ["Beginner", "Intermediate", "Advanced"] as lvl}
                    <option value={lvl} class="bg-zinc-900" selected={iv("level") === lvl}>{lvl}</option>
                  {/each}
                </select>
                <span class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">▾</span>
              </div>
              {#if clientErrors.level}
                <p class="text-red-400 text-xs mt-1.5 flex items-center gap-1"><span>⚠</span>{clientErrors.level}</p>
              {/if}
            </div>
          </div>

          <!-- Description -->
          <div data-error={!!clientErrors.description}>
            <div class="flex justify-between items-center mb-1.5">
              <label class="text-[0.72rem] font-semibold tracking-widest uppercase text-zinc-400" for="f-desc">
                Short Description <span class="text-red-400">*</span>
              </label>
              <span class="text-[0.65rem] font-mono {descLen > 480 ? 'text-amber-400' : 'text-zinc-600'}">{descLen}/500</span>
            </div>
            <textarea
              id="f-desc" name="description"
              rows="3" maxlength="500" autocomplete="off"
              placeholder="What will students learn?"
              on:input={(e) => { descLen = e.target.value.length; currentDescription = e.target.value; handleInput(e); }}
              on:blur={handleBlur}
              class="block w-full bg-zinc-900/80 border rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600
                     outline-none transition-all resize-none focus:ring-2 focus:ring-violet-500/20
                     {clientErrors.description ? 'border-red-500/50' : 'border-white/8 focus:border-violet-500/50'}"
            >{iv("description")}</textarea>
            {#if clientErrors.description}
              <p class="text-red-400 text-xs mt-1.5 flex items-center gap-1"><span>⚠</span>{clientErrors.description}</p>
            {/if}
          </div>
        </div>

        <!-- Thumbnail -->
        <div class="px-8 py-7">
          <p class="text-[0.65rem] font-bold tracking-[0.18em] uppercase text-zinc-500 font-mono mb-5">
            Thumbnail
          </p>
          <input type="hidden" name="image" value={imageValue} />

          {#if imageValue}
            <div class="mb-4 relative w-full max-w-xs">
              <img
                src={imageValue} alt="Current thumbnail"
                class="w-full rounded-2xl border border-white/10 object-cover"
              />
              <button
                type="button"
                on:click={() => { imageValue = ""; resetKey += 1; }}
                class="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white
                       flex items-center justify-center text-xs hover:bg-red-600 transition-all"
              >✕</button>
              <p class="text-xs text-zinc-500 mt-2">Current thumbnail — click ✕ to replace</p>
            </div>
          {/if}

          <div data-error={!!clientErrors.image}>
            <!-- {#key resetKey} destroys & recreates MediaUploader on every save or manual remove -->
            {#key resetKey}
              <MediaUploader type="image" on:change={onImageChange} />
            {/key}
            {#if clientErrors.image}
              <p class="text-red-400 text-xs mt-2 flex items-center gap-1">
                <span>⚠</span>{clientErrors.image}
              </p>
            {/if}
          </div>
        </div>

        <!-- Pricing & SEO -->
        <div class="px-8 py-7 space-y-5">
          <p class="text-[0.65rem] font-bold tracking-[0.18em] uppercase text-zinc-500 font-mono">
            Pricing & SEO
          </p>

          <!-- Price -->
          <div data-error={!!clientErrors.price}>
            <label class="block text-[0.72rem] font-semibold tracking-widest uppercase text-zinc-400 mb-1.5" for="f-price">
              Price (₹) <span class="text-red-400">*</span>
            </label>
            <div class="relative">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-semibold select-none">₹</span>
              <input
                id="f-price" name="price" type="number"
                min="0" max="1000000" step="1" autocomplete="off"
                placeholder="999"
                value={iv("price")}
                on:input={(e) => { currentPrice = e.target.value; handleInput(e); }}
                on:blur={handleBlur}
                class="block w-full bg-zinc-900/80 border rounded-xl pl-8 pr-4 py-3 text-sm text-zinc-100 placeholder-zinc-600
                       outline-none transition-all focus:ring-2 focus:ring-violet-500/20
                       {clientErrors.price ? 'border-red-500/50' : 'border-white/8 focus:border-violet-500/50'}"
              />
            </div>
            <p class="text-zinc-600 text-xs mt-1.5">Enter 0 for a free course.</p>
            {#if clientErrors.price}
              <p class="text-red-400 text-xs mt-1 flex items-center gap-1"><span>⚠</span>{clientErrors.price}</p>
            {/if}
          </div>

          <!-- Keywords -->
          <div data-error={!!clientErrors.keywords}>
            <label class="block text-[0.72rem] font-semibold tracking-widest uppercase text-zinc-400 mb-1.5" for="f-keywords">
              SEO Keywords <span class="text-red-400">*</span>
            </label>
            <input
              id="f-keywords" name="keywords" type="text"
              autocomplete="off" placeholder="java, spring boot, backend"
              value={iv("keywords")}
              on:input={(e) => { keywordsRaw = e.target.value; currentKeywords = e.target.value; handleInput(e); }}
              on:blur={(e) => { keywordsRaw = e.target.value; handleBlur(e); }}
              class="block w-full bg-zinc-900/80 border rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600
                     outline-none transition-all focus:ring-2 focus:ring-violet-500/20
                     {clientErrors.keywords ? 'border-red-500/50' : 'border-white/8 focus:border-violet-500/50'}"
            />
            <p class="text-zinc-600 text-xs mt-1.5">Separate with commas. At least 2 required.</p>
            {#if keywordTags.length > 0}
              <div class="flex flex-wrap gap-1.5 mt-2.5">
                {#each keywordTags as tag}
                  <span class="text-xs bg-violet-950/50 border border-violet-700/30 text-violet-300 px-2.5 py-1 rounded-lg font-mono">{tag}</span>
                {/each}
              </div>
            {/if}
            {#if clientErrors.keywords}
              <p class="text-red-400 text-xs mt-1.5 flex items-center gap-1"><span>⚠</span>{clientErrors.keywords}</p>
            {/if}
          </div>
        </div>

        <!-- Footer -->
        <div class="px-8 py-6 bg-zinc-900/30 flex items-center justify-between gap-4 flex-wrap">
          <div class="flex items-center gap-1.5 text-xs text-zinc-600">
            <span class="text-red-400">*</span><span>All starred fields are required</span>
          </div>
          <div class="flex items-center gap-3">
            <button
              type="submit"
              disabled={isEdit && !isDirty}
              class="flex items-center gap-2.5 bg-violet-600 hover:bg-violet-500 text-white
                     font-semibold text-sm px-7 py-2.5 rounded-xl transition-all
                     shadow-lg shadow-violet-950/50 active:scale-[0.98]
                     {isEdit && !isDirty ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}"
            >
              <span>{isEdit ? "Update Course" : "Save Course Info"}</span>
              <span class="text-base leading-none">→</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</div>