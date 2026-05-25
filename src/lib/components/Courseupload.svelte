<!-- src/routes/admin/dashboard/courses/+page.svelte -->
<script>
  import { enhance } from '$app/forms';
  import { goto, invalidateAll } from '$app/navigation';

  // ── Props ──────────────────────────────────────────────────────────────────
  export let data;   // { courses, totalCount, drafts, activeDraft, currentPage, search }
  // console.log(data,"dataaaaaaaaaaaaaaaa");
  
  export let form;   // form action result

  // ── Reactive derived state ─────────────────────────────────────────────────
  $: courses       = data?.courses      ?? [];
  $: drafts        = data?.drafts       ?? [];
  $: activeDraft   = data?.activeDraft  ?? null;
  $: courseId      = activeDraft?.courseId ?? null;
  $: modules       = activeDraft?.courseData?.modules ?? [];
  $: totalVideos   = activeDraft?.totalVideos   ?? 0;
  $: uploadedCount = activeDraft?.uploadedCount ?? 0;
  $: isComplete    = modules.length > 0
      && modules.every(m => m.lessons.length > 0 && m.assessment != null);

  // ── Panel state ────────────────────────────────────────────────────────────
  let panel = 'list';
  $: if (activeDraft && panel === 'list') panel = 'edit';

  let openModule = 0;

  // ── Toast notification ─────────────────────────────────────────────────────
  let notify = null;

  $: if (form?.success) {
    notify = { type: 'success', msg: successMsg(form) };
    setTimeout(() => (notify = null), 4000);
  }
  $: if (form?.serverError || form?.error) {
    notify = { type: 'error', msg: form?.serverError ?? form?.error };
  }

  function successMsg(f) {
    if (f.step === 'setModuleTitle')   return '✓ Module title saved.';
    if (f.step === 'uploadLesson')     return '✓ Lesson uploaded.';
    if (f.step === 'uploadAssessment') return '✓ Assessment validated & saved.';
    return '✓ Done!';
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function progressPct() {
    if (!totalVideos) return 0;
    return Math.min(100, Math.round((uploadedCount / totalVideos) * 100));
  }

  function moduleStatus(mod) {
    const hasLessons    = mod.lessons.length > 0;
    const hasAssessment = mod.assessment != null;
    if (hasLessons && hasAssessment) return 'complete';
    if (hasLessons || hasAssessment) return 'partial';
    return 'empty';
  }

  const STATUS_DOT = {
    complete: 'bg-emerald-500',
    partial:  'bg-amber-400',
    empty:    'bg-zinc-600'
  };

  // ── enhance callback — syncs activeDraft after mutations ──────────────────
  function handleResult() {
    return async ({ result, update }) => {
      await update({ reset: false });
      await invalidateAll();
      if (result.type === 'success' && result.data?.draft) {
        data = { ...data, activeDraft: result.data.draft };
      }
    };
  }
</script>



<!-- ═══ ROOT ════════════════════════════════════════════════════════════════ -->
<div class="min-h-screen bg-[#0d0f14] text-zinc-100" style="font-family:'DM Sans',sans-serif">

  <!-- ── Sidebar ──────────────────────────────────────────────────────────── -->
  <aside class="fixed top-0 left-0 h-screen w-56 bg-[#13161d] border-r border-white/5 flex flex-col z-30">
    <div class="px-5 py-5 border-b border-white/5">
      <span class="text-xs font-bold text-violet-400 tracking-widest uppercase"
            style="font-family:'Space Mono',monospace">Admin</span>
      <p class="text-xs text-zinc-600 mt-0.5">Course Manager</p>
    </div>

    <nav class="flex-1 px-2 py-4 space-y-0.5">
      <button
        on:click={() => { panel = 'list'; goto('/admin/dashboard/courses'); }}
        class="w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors
               {panel === 'list'
                 ? 'bg-violet-600/20 text-violet-300'
                 : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}">
        ▤ &nbsp;All Courses
      </button>

      <button
        on:click={() => (panel = 'new')}
        class="w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors
               {panel === 'new'
                 ? 'bg-violet-600/20 text-violet-300'
                 : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}">
        ＋ &nbsp;New Course
      </button>

      {#if activeDraft}
      <button
        on:click={() => (panel = 'edit')}
        class="w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors
               {panel === 'edit'
                 ? 'bg-violet-600/20 text-violet-300'
                 : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}">
        ✎ &nbsp;Continue Draft
        <span class="ml-1.5 text-xs bg-amber-500/20 text-amber-300 rounded-full px-2 py-0.5">
          {progressPct()}%
        </span>
      </button>
      {/if}
    </nav>

    <div class="px-5 py-4 border-t border-white/5">
      <p class="text-xs text-zinc-600" style="font-family:'Space Mono',monospace">
        {courses.length} published · {drafts.length} draft{drafts.length !== 1 ? 's' : ''}
      </p>
    </div>
  </aside>

  <!-- ── Main ─────────────────────────────────────────────────────────────── -->
  <main class="ml-56 p-8 max-w-4xl">

    <!-- Toast -->
    {#if notify}
    <div class="fixed top-5 right-5 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-xl border
                {notify.type === 'success'
                  ? 'bg-emerald-950 border-emerald-700/40 text-emerald-300'
                  : 'bg-red-950 border-red-700/40 text-red-300'}">
      {notify.msg}
    </div>
    {/if}

    <!-- ╔══════════════════════════════════════════════════════════════════╗ -->
    <!-- ║  LIST PANEL                                                      ║ -->
    <!-- ╚══════════════════════════════════════════════════════════════════╝ -->
    {#if panel === 'list'}
    <div>
      <h1 class="text-2xl font-bold mb-1">All Courses</h1>
      <p class="text-zinc-500 text-sm mb-7">Published records in the CourseList collection.</p>

      {#if courses.length === 0}
      <div class="border border-dashed border-white/10 rounded-2xl p-14 text-center">
        <p class="text-4xl mb-3">📭</p>
        <p class="text-zinc-500 text-sm">No published courses yet.</p>
        <button on:click={() => (panel = 'new')}
          class="mt-4 text-xs bg-violet-600 hover:bg-violet-500 text-white px-5 py-2 rounded-lg transition-colors">
          Create your first course →
        </button>
      </div>
      {:else}
      <div class="grid gap-3">
        {#each courses as c (c._id)}
        <div class="bg-[#13161d] border border-white/5 rounded-2xl p-4 flex gap-4 items-center hover:border-violet-500/20 transition-all">
          <img src={c.image} alt={c.title} class="w-20 h-14 rounded-xl object-cover flex-shrink-0 bg-zinc-800" />
          <div class="flex-1 min-w-0">
        
            <a href={`/admin/dashboard/courses/${c.id}`}
           >
           <p class="font-semibold text-sm truncate">{c.title}</p>
          </a>
            
            <p class="text-xs text-zinc-500 mt-0.5">{c.instructor} · {c.level} · {c.duration ?? '—'}</p>
            <div class="flex gap-1.5 mt-1.5 flex-wrap">
              {#each (c.tags ?? []).slice(0, 4) as tag}
              <span class="text-xs bg-zinc-800 text-zinc-400 rounded px-1.5 py-0.5">{tag}</span>
              {/each}
            </div>
          </div>
          <span class="text-xs px-3 py-1 rounded-full flex-shrink-0
                       {c.status === 'published'
                         ? 'bg-emerald-500/15 text-emerald-400'
                         : 'bg-amber-500/15 text-amber-400'}">
            {c.status}
          </span>
        </div>
        {/each}
      </div>
      {/if}

      <!-- Drafts sub-section -->
      {#if drafts.length > 0}
      <h2 class="text-base font-semibold mt-10 mb-4 text-zinc-300">In-Progress Drafts</h2>
      <div class="grid gap-3">
        {#each drafts as d (d.courseId)}
        <div class="bg-[#13161d] border border-amber-500/20 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p class="font-medium text-sm">{d.courseData?.title ?? 'Untitled'}</p>
            <p class="text-xs text-zinc-500 mt-0.5">
              {d.uploadedCount} / {d.totalVideos} videos uploaded
            </p>
          </div>
          <a href={`/admin/dashboard/courses?courseId=${d.courseId}`}
             class="text-xs bg-violet-700 hover:bg-violet-600 text-white px-4 py-2 rounded-lg transition-colors">
            Continue →
          </a>
        </div>
        {/each}
      </div>
      {/if}
    </div>

    <!-- ╔══════════════════════════════════════════════════════════════════╗ -->
    <!-- ║  NEW COURSE PANEL  (Step 1)                                      ║ -->
    <!-- ╚══════════════════════════════════════════════════════════════════╝ -->
    {:else if panel === 'new'}
    <div>
      <div class="flex items-center gap-3 mb-8">
        <div class="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center text-sm font-bold">1</div>
        <div>
          <h1 class="text-xl font-bold">Course Information</h1>
          <p class="text-zinc-500 text-sm">Fill in the basics — you'll add videos next.</p>
        </div>
      </div>

      <form method="POST" action="?/createCourse" use:enhance={handleResult} class="space-y-5">

        <!-- Course name -->
        <div>
          <label class="lbl" for="f-title">Course Name</label>
          <input id="f-title" name="title" type="text"
            placeholder="e.g. Java Full Stack Development"
            value={form?.values?.title ?? ''}
            class="inp {form?.errors?.title ? 'inp-err' : ''}" />
          {#if form?.errors?.title}
          <p class="ferr">{form.errors.title}</p>
          {/if}
        </div>

        <!-- Category + Level -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="lbl" for="f-cat">Category</label>
            <input id="f-cat" name="category" type="text"
              placeholder="Development / Design / AI"
              value={form?.values?.category ?? ''}
              class="inp {form?.errors?.category ? 'inp-err' : ''}" />
            {#if form?.errors?.category}
            <p class="ferr">{form.errors.category}</p>
            {/if}
          </div>
          <div>
            <label class="lbl" for="f-level">Level</label>
            <select id="f-level" name="level"
              class="inp {form?.errors?.level ? 'inp-err' : ''}">
              <option value="">Select level…</option>
              {#each ['Beginner','Intermediate','Advanced'] as lvl}
              <option value={lvl} selected={form?.values?.level === lvl}>{lvl}</option>
              {/each}
            </select>
            {#if form?.errors?.level}
            <p class="ferr">{form.errors.level}</p>
            {/if}
          </div>
        </div>

        <!-- Instructor -->
        <div>
          <label class="lbl" for="f-inst">Instructor Name</label>
          <input id="f-inst" name="instructor" type="text"
            placeholder="e.g. John Doe"
            value={form?.values?.instructor ?? ''}
            class="inp {form?.errors?.instructor ? 'inp-err' : ''}" />
          {#if form?.errors?.instructor}
          <p class="ferr">{form.errors.instructor}</p>
          {/if}
        </div>

        <!-- Description -->
        <div>
          <label class="lbl" for="f-desc">Short Description</label>
          <textarea id="f-desc" name="description" rows="3"
            placeholder="What will students learn?"
            class="inp resize-none {form?.errors?.description ? 'inp-err' : ''}"
          >{form?.values?.description ?? ''}</textarea>
          {#if form?.errors?.description}
          <p class="ferr">{form.errors.description}</p>
          {/if}
        </div>

        <!-- Thumbnail URL -->
        <div>
          <label class="lbl" for="f-img">Thumbnail URL</label>
          <input id="f-img" name="image" type="url"
            placeholder="https://…/thumbnail.jpg"
            value={form?.values?.image ?? ''}
            class="inp {form?.errors?.image ? 'inp-err' : ''}" />
          {#if form?.errors?.image}
          <p class="ferr">{form.errors.image}</p>
          {/if}
        </div>

        <!-- Tags -->
        <div>
          <label class="lbl" for="f-tags">
            Tags <span class="normal-case font-normal text-zinc-600">(comma-separated)</span>
          </label>
          <input id="f-tags" name="tags" type="text"
            placeholder="Java, Spring Boot, REST API"
            value={form?.values?.tags ?? ''}
            class="inp" />
        </div>

        <!-- Video count + Module count -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="lbl" for="f-vids">Total Number of Videos</label>
            <input id="f-vids" name="totalVideos" type="number" min="1"
              placeholder="18"
              value={form?.values?.totalVideos ?? ''}
              class="inp {form?.errors?.totalVideos ? 'inp-err' : ''}" />
            {#if form?.errors?.totalVideos}
            <p class="ferr">{form.errors.totalVideos}</p>
            {/if}
          </div>
          <div>
            <label class="lbl" for="f-mods">Number of Modules</label>
            <input id="f-mods" name="numberOfModules" type="number" min="1"
              placeholder="3"
              value={form?.values?.numberOfModules ?? ''}
              class="inp {form?.errors?.numberOfModules ? 'inp-err' : ''}" />
            {#if form?.errors?.numberOfModules}
            <p class="ferr">{form.errors.numberOfModules}</p>
            {/if}
          </div>
        </div>

        {#if form?.serverError && form?.step === 'createCourse'}
        <p class="ferr">{form.serverError}</p>
        {/if}

        <div class="flex gap-3 pt-2">
          <button type="submit"
            class="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-8 py-3 rounded-xl transition-colors">
            Create Course & Continue →
          </button>
          <button type="button" on:click={() => (panel = 'list')}
            class="text-zinc-400 hover:text-zinc-200 px-5 py-3 rounded-xl hover:bg-white/5 transition-all text-sm">
            Cancel
          </button>
        </div>
      </form>
    </div>

    <!-- ╔══════════════════════════════════════════════════════════════════╗ -->
    <!-- ║  EDIT DRAFT PANEL  (Steps 2 + 3 per module)                     ║ -->
    <!-- ╚══════════════════════════════════════════════════════════════════╝ -->
    {:else if panel === 'edit' && activeDraft}
    <div>
      <!-- Course header card -->
      <div class="bg-[#13161d] border border-white/5 rounded-2xl p-6 mb-8 flex gap-6 items-start">
        <img src={activeDraft.courseData.image} alt={activeDraft.courseData.title}
             class="w-28 h-20 rounded-xl object-cover flex-shrink-0 bg-zinc-800" />
        <div class="flex-1 min-w-0">
          <h1 class="text-xl font-bold truncate">{activeDraft.courseData.title}</h1>
          <p class="text-zinc-500 text-sm mt-1">
            {activeDraft.courseData.instructor} · {activeDraft.courseData.level}
          </p>
          <div class="mt-4">
            <div class="flex justify-between text-xs text-zinc-500 mb-1.5">
              <span>Video upload progress</span>
              <span>{uploadedCount} / {totalVideos}</span>
            </div>
            <div class="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div class="h-full bg-violet-500 rounded-full transition-all duration-500"
                   style="width:{progressPct()}%"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Status legend -->
      <div class="flex gap-5 mb-5 text-xs text-zinc-500">
        <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Complete</span>
        <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-amber-400 inline-block"></span> Partial</span>
        <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-zinc-600 inline-block"></span> Empty</span>
      </div>

      <!-- Modules accordion -->
      <div class="space-y-3">
        {#each modules as mod, mi (mod.id)}
        {@const status = moduleStatus(mod)}
        <div class="bg-[#13161d] border rounded-2xl overflow-hidden transition-all
                    {openModule === mi ? 'border-violet-500/40' : 'border-white/5'}">

          <!-- Accordion header -->
          <button type="button"
            on:click={() => openModule = openModule === mi ? -1 : mi}
            class="w-full px-6 py-4 flex items-center justify-between hover:bg-white/[.03] transition-colors">
            <div class="flex items-center gap-3 min-w-0">
              <span class="w-2.5 h-2.5 rounded-full {STATUS_DOT[status]} flex-shrink-0"></span>
              <span class="font-semibold text-sm truncate">
                {mod.title || `Module ${mi + 1} (untitled)`}
              </span>
              <span class="text-xs text-zinc-600 flex-shrink-0">
                {mod.lessons.length} lesson{mod.lessons.length !== 1 ? 's' : ''}
                {#if mod.assessment} · ✓ assessment{/if}
              </span>
            </div>
            <span class="text-zinc-500 text-base leading-none select-none ml-3">
              {openModule === mi ? '−' : '+'}
            </span>
          </button>

          <!-- Accordion body -->
          {#if openModule === mi}
          <div class="px-6 pb-7 space-y-7 border-t border-white/5 pt-6">

            <!-- ① Module title ──────────────────────────────────────────── -->
            <form method="POST" action="?/setModuleTitle" use:enhance={handleResult}>
              <input type="hidden" name="courseId"    value={courseId} />
              <input type="hidden" name="moduleIndex" value={mi} />
              <div class="flex gap-3 items-end">
                <div class="flex-1">
                  <label class="lbl" for="mt-{mi}">Module Title</label>
                  <input id="mt-{mi}" name="moduleTitle" type="text"
                    placeholder="e.g. Java Fundamentals"
                    value={mod.title}
                    class="inp {form?.step === 'setModuleTitle' && +form?.moduleIndex === mi && form?.error ? 'inp-err' : ''}" />
                  {#if form?.step === 'setModuleTitle' && +form?.moduleIndex === mi && form?.error}
                  <p class="ferr">{form.error}</p>
                  {/if}
                </div>
                <button type="submit"
                  class="bg-zinc-700 hover:bg-zinc-600 text-sm text-zinc-200 px-4 py-2.5 rounded-xl transition-colors flex-shrink-0">
                  Save
                </button>
              </div>
            </form>

            <!-- ② Lesson list ────────────────────────────────────────────── -->
            {#if mod.lessons.length > 0}
            <div>
              <p class="lbl mb-2">Uploaded Lessons</p>
              <ul class="space-y-2">
                {#each mod.lessons as les, li}
                <li class="flex items-center gap-3 bg-zinc-900/60 rounded-xl px-4 py-3">
                  <span class="text-xs text-zinc-600 w-5 flex-shrink-0"
                        style="font-family:'Space Mono',monospace">{li + 1}</span>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium truncate">{les.title}</p>
                    <p class="text-xs text-zinc-600 mt-0.5 truncate">
                      {les.durationSeconds}s · {les.videoUrl}
                    </p>
                  </div>
                  <span class="text-emerald-400 text-xs flex-shrink-0">✓</span>
                </li>
                {/each}
              </ul>
            </div>
            {/if}

            <!-- ③ Upload lesson ──────────────────────────────────────────── -->
            <form method="POST" action="?/uploadLesson" use:enhance={handleResult}>
              <input type="hidden" name="courseId"    value={courseId} />
              <input type="hidden" name="moduleIndex" value={mi} />

              <p class="lbl mb-3">Add a Lesson</p>
              <div class="space-y-3">

                <div>
                  <label class="lbl" for="lt-{mi}">Lesson Title</label>
                  <input id="lt-{mi}" name="lessonTitle" type="text"
                    placeholder="e.g. Introduction to Java & JVM"
                    class="inp {form?.step === 'uploadLesson' && +form?.moduleIndex === mi && form?.errors?.lessonTitle ? 'inp-err' : ''}" />
                  {#if form?.step === 'uploadLesson' && +form?.moduleIndex === mi && form?.errors?.lessonTitle}
                  <p class="ferr">{form.errors.lessonTitle}</p>
                  {/if}
                </div>

                <div>
                  <label class="lbl" for="lv-{mi}">Video URL</label>
                  <input id="lv-{mi}" name="videoUrl" type="url"
                    placeholder="https://…/video.mp4"
                    class="inp {form?.step === 'uploadLesson' && +form?.moduleIndex === mi && form?.errors?.videoUrl ? 'inp-err' : ''}" />
                  {#if form?.step === 'uploadLesson' && +form?.moduleIndex === mi && form?.errors?.videoUrl}
                  <p class="ferr">{form.errors.videoUrl}</p>
                  {/if}
                </div>

                <div>
                  <label class="lbl" for="ld-{mi}">Duration (seconds)</label>
                  <input id="ld-{mi}" name="durationSeconds" type="number" min="1"
                    placeholder="286"
                    class="inp w-40 {form?.step === 'uploadLesson' && +form?.moduleIndex === mi && form?.errors?.durationSeconds ? 'inp-err' : ''}" />
                  {#if form?.step === 'uploadLesson' && +form?.moduleIndex === mi && form?.errors?.durationSeconds}
                  <p class="ferr">{form.errors.durationSeconds}</p>
                  {/if}
                </div>

              </div>

              {#if form?.step === 'uploadLesson' && +form?.moduleIndex === mi && form?.serverError}
              <p class="ferr mt-2">{form.serverError}</p>
              {/if}

              <button type="submit"
                class="mt-4 bg-violet-700 hover:bg-violet-600 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition-colors">
                ↑ Upload Lesson
              </button>
            </form>

            <!-- divider -->
            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-white/5"></div>
              </div>
              <div class="relative flex justify-center">
                <span class="bg-[#13161d] px-3 text-xs text-zinc-600 uppercase tracking-widest">
                  Assessment
                </span>
              </div>
            </div>

            <!-- ④ Assessment status ─────────────────────────────────────── -->
            {#if mod.assessment}
            <div class="bg-emerald-950/40 border border-emerald-800/30 rounded-xl px-5 py-4">
              <p class="text-emerald-400 text-sm font-semibold">✓ {mod.assessment.title}</p>
              <p class="text-xs text-zinc-500 mt-1">
                {mod.assessment.questions.length} question{mod.assessment.questions.length !== 1 ? 's' : ''}
                · Pass mark: {mod.assessment.passMark}%
                · Max attempts: {mod.assessment.attemptsAllowed}
              </p>
            </div>
            {/if}

            <!-- ⑤ Upload assessment ─────────────────────────────────────── -->
            <form method="POST" action="?/uploadAssessment" use:enhance={handleResult}
                  enctype="multipart/form-data">
              <input type="hidden" name="courseId"    value={courseId} />
              <input type="hidden" name="moduleIndex" value={mi} />

              <p class="lbl mb-1">{mod.assessment ? 'Replace' : 'Upload'} Assessment JSON</p>
              <p class="text-xs text-zinc-600 mb-3 leading-relaxed">
                JSON must contain:
                <code class="text-violet-400 bg-violet-950/40 px-1 rounded">title</code>,
                <code class="text-violet-400 bg-violet-950/40 px-1 rounded">questions[]</code>
                — each with
                <code class="text-violet-400 bg-violet-950/40 px-1 rounded">text</code>,
                <code class="text-violet-400 bg-violet-950/40 px-1 rounded">type</code>
                ("mcq" or "truefalse"),
                <code class="text-violet-400 bg-violet-950/40 px-1 rounded">options[]</code>
                (each with <code class="text-violet-400 bg-violet-950/40 px-1 rounded">text</code> +
                <code class="text-violet-400 bg-violet-950/40 px-1 rounded">isCorrect: true/false</code>).
              </p>

              <!-- Drop zone -->
              <label class="block cursor-pointer group">
                <input name="assessmentFile" type="file" accept=".json" class="sr-only" />
                <div class="border-2 border-dashed rounded-xl px-6 py-8 text-center transition-all
                            {form?.step === 'uploadAssessment' && +form?.moduleIndex === mi && form?.error
                              ? 'border-red-500/40 bg-red-950/20'
                              : 'border-white/10 group-hover:border-violet-500/40 group-hover:bg-violet-950/10'}">
                  <p class="text-2xl mb-2">📄</p>
                  <p class="text-sm text-zinc-400">
                    Click to select a <span class="text-violet-400 font-medium">.json</span> file
                  </p>
                  <p class="text-xs text-zinc-600 mt-1">assessment.json</p>
                </div>
              </label>

              {#if form?.step === 'uploadAssessment' && +form?.moduleIndex === mi && form?.error}
              <div class="mt-3 bg-red-950/40 border border-red-800/40 rounded-xl p-4">
                <p class="text-red-400 text-xs font-medium leading-relaxed whitespace-pre-wrap">{form.error}</p>
              </div>
              {/if}

              <button type="submit"
                class="mt-4 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm font-medium px-6 py-2.5 rounded-xl transition-colors">
                ↑ Upload & Validate Assessment
              </button>
            </form>

          </div>
          {/if}
        </div>
        {/each}
      </div>

      <!-- Publish / warning -->
      <div class="mt-8 pt-6 border-t border-white/5">
        {#if isComplete}
        <form method="POST" action="?/publishCourse" use:enhance>
          <input type="hidden" name="courseId" value={courseId} />
          <div class="flex items-center gap-4 flex-wrap">
            <button type="submit"
              class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-3 rounded-xl transition-colors shadow-lg shadow-emerald-950/50">
              🚀 Publish Course
            </button>
            <p class="text-xs text-zinc-500">
              All {modules.length} modules complete — this will write to the CourseList collection.
            </p>
          </div>
          {#if form?.step === 'publishCourse' && form?.serverError}
          <p class="ferr mt-3">{form.serverError}</p>
          {/if}
        </form>

        {:else}
        <div class="flex items-start gap-3 bg-amber-950/30 border border-amber-800/30 rounded-xl p-5">
          <span class="text-amber-400 text-xl mt-0.5">⚠</span>
          <div>
            <p class="text-amber-300 text-sm font-semibold">Not ready to publish</p>
            <p class="text-xs text-zinc-500 mt-1">
              Every module needs at least one lesson and a validated assessment file.
            </p>
          </div>
        </div>
        {/if}
      </div>
    </div>
    {/if}

  </main>
</div>

<style>
  /* Input base */
  :global(.inp) {
    display: block;
    width: 100%;
    background: rgb(24 24 27);
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 0.75rem;
    padding: 0.625rem 1rem;
    font-size: 0.875rem;
    color: #f4f4f5;
    outline: none;
    transition: border-color .15s, box-shadow .15s;
    font-family: inherit;
  }
  :global(.inp::placeholder) { color: #52525b; }
  :global(.inp:focus) {
    border-color: rgba(139,92,246,.55);
    box-shadow: 0 0 0 3px rgba(139,92,246,.12);
  }
  /* Input error state */
  :global(.inp-err) {
    border-color: rgba(239,68,68,.45) !important;
  }
  :global(.inp-err:focus) {
    box-shadow: 0 0 0 3px rgba(239,68,68,.12) !important;
  }
  /* Label */
  :global(.lbl) {
    display: block;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: .07em;
    text-transform: uppercase;
    color: #a1a1aa;
    margin-bottom: 0.375rem;
  }
  /* Field error message */
  :global(.ferr) {
    color: #f87171;
    font-size: 0.75rem;
    margin-top: 0.25rem;
  }
</style>