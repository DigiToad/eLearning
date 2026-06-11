<script>
    import { enhance } from "$app/forms";
    import Mediaupload from "$lib/components/Mediaupload.svelte";

    export let lesson          = null;
    export let sectionId       = "";
    export let courseId        = "";
    export let moduleSectionId = "";
    export let form            = null;

    let title            = "";
    let videoUrl         = "";
    let duration         = "";
    let submitting       = false;
    let errors           = {};
    let touched          = {};
    let durationDetected = false;
    let mediaReady       = false;
    let resetKey         = 0;

    // ── Sync only when lesson ID changes ────────────────────────────────────
    let lastLessonId = null;
    $: if (lesson?._id !== lastLessonId) {
        lastLessonId     = lesson?._id ?? null;
        title            = lesson?.title    ?? "";
        videoUrl         = lesson?.videoUrl ?? "";
        duration         = lesson?.duration != null ? String(lesson.duration) : "";
        errors           = {};
        touched          = {};
        durationDetected = !!(lesson?.duration && Number(lesson.duration) > 0);
        mediaReady       = !!(lesson?.videoUrl);
    }

    // ── Reset on success ────────────────────────────────────────────────────
    let lastFormSuccess = null;
    $: if (form?.success && form?.type === "video" && form !== lastFormSuccess) {
        lastFormSuccess  = form;
        title            = "";
        videoUrl         = "";
        duration         = "";
        errors           = {};
        touched          = {};
        durationDetected = false;
        mediaReady       = false;
        submitting       = false;   // ← ensure spinner clears
        lastLessonId     = null;
        resetKey        += 1;       // ← remounts Mediaupload completely
    }

    // ── Dirty check ─────────────────────────────────────────────────────────
    $: isDirty = lesson
        ? (title.trim()    !== (lesson?.title    ?? "") ||
           videoUrl.trim() !== (lesson?.videoUrl ?? "") ||
           String(duration) !== String(lesson?.duration ?? ""))
        : true;

    // ── Submit guard ────────────────────────────────────────────────────────
    $: cannotSubmit = submitting || (!!lesson && !isDirty) || !mediaReady;

    // ── Validation ──────────────────────────────────────────────────────────
    function validate() {
        const errs = {};
        if (!title.trim() || title.trim().length < 3)
            errs.title = "Title must be at least 3 characters.";
        if (!videoUrl.trim())
            errs.videoUrl = "Video URL is required.";
        return errs;
    }

    function touch(field) {
        touched = { ...touched, [field]: true };
        errors  = validate();
        if (!touched.title)    delete errors.title;
        if (!touched.videoUrl) delete errors.videoUrl;
    }

    $: action = lesson ? "?/updateVideoLesson" : "?/createVideoLesson";

    function enhanceVideo() {
        return ({ formData, cancel }) => {
            if (!mediaReady) {
                cancel();
                touched = { title: true, videoUrl: true };
                errors  = { ...validate(), videoUrl: "Please process the video before saving." };
                return;
            }

            touched = { title: true, videoUrl: true };
            errors  = validate();
            if (Object.keys(errors).length) { cancel(); return; }

            formData.set("title",           title.trim());
            formData.set("videoUrl",        videoUrl.trim());
            formData.set("duration",        String(parseInt(duration) || 0));
            formData.set("sectionId",       sectionId);
            formData.set("courseId",        courseId);
            formData.set("moduleSectionId", moduleSectionId);
            if (lesson?._id) formData.set("lessonId", lesson._id);

            submitting = true;
            return async ({ update }) => {
                await update({ reset: false });
                submitting = false;   // ← always reset here too
            };
        };
    }

    // ── Video preview helpers ────────────────────────────────────────────────
    $: videoName = videoUrl
        ? videoUrl.startsWith("http") ? videoUrl : videoUrl.split("/").pop()
        : null;

    $: embedUrl = (() => {
        if (!videoUrl) return null;
        const yt = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
        if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
        const vm = videoUrl.match(/vimeo\.com\/(\d+)/);
        if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
        return null;
    })();

    $: isDirectVideo = !!(
        videoUrl && !embedUrl && videoUrl.match(/\.(mp4|webm|ogg)(\?|$)/i)
    );

    function onVideoLoaded(e) {
        const d = e.target.duration;
        if (d && isFinite(d)) {
            duration         = String(Math.round(d));
            durationDetected = true;
        }
    }

    $: if (!videoUrl) durationDetected = false;

    $: durationDisplay = (() => {
        const n = parseInt(duration);
        if (!n || isNaN(n)) return null;
        const m = Math.floor(n / 60);
        const s = n % 60;
        return m > 0 ? `${m}m ${s}s` : `${s}s`;
    })();
</script>

<form method="POST" {action} use:enhance={enhanceVideo()} class="space-y-5">

    <input type="hidden" name="sectionId"       value={sectionId} />
    <input type="hidden" name="courseId"        value={courseId} />
    <input type="hidden" name="moduleSectionId" value={moduleSectionId} />
    {#if lesson?._id}
        <input type="hidden" name="lessonId" value={lesson._id} />
    {/if}
    <input type="hidden" name="videoUrl" bind:value={videoUrl} />

    <div class="bg-[#0e1018] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div class="px-6 py-6 space-y-5">

            <!-- Title -->
            <div>
                <label class="block text-[0.68rem] font-bold tracking-[0.15em] uppercase
                              text-zinc-400 mb-2" for="v-title">
                    Lesson Title <span class="text-rose-400">*</span>
                </label>
                <input
                    id="v-title" name="title" type="text"
                    maxlength="100" autocomplete="off"
                    placeholder="e.g. Variables and Data Types"
                    bind:value={title}
                    on:blur={() => touch("title")}
                    class="block w-full rounded-xl px-4 py-3 text-sm text-zinc-100
                           placeholder-zinc-600 outline-none transition-all
                           bg-zinc-900/70 border focus:ring-2 focus:ring-violet-500/15
                           {errors.title
                               ? 'border-rose-500/50 focus:border-rose-500/50'
                               : 'border-white/[0.08] focus:border-violet-500/50'}"
                />
                {#if errors.title}
                    <p class="text-rose-400 text-xs mt-1.5 flex items-center gap-1">
                        <span>⚠</span>{errors.title}
                    </p>
                {/if}
            </div>

            <!-- Video Upload -->
            <div>
                <!-- svelte-ignore a11y-label-has-associated-control -->
                <label class="block text-[0.68rem] font-bold tracking-[0.15em] uppercase
                              text-zinc-400 mb-2">
                    Video <span class="text-rose-400">*</span>
                </label>

                <!-- {#key resetKey} destroys & recreates Mediaupload fresh on every save -->
                {#key resetKey}
                    <Mediaupload type="video" bind:value={videoUrl} bind:ready={mediaReady} />
                {/key}

                {#if errors.videoUrl}
                    <p class="text-rose-400 text-xs mt-1.5 flex items-center gap-1">
                        <span>⚠</span>{errors.videoUrl}
                    </p>
                {/if}

                <!-- File name chip -->
                {#if videoName}
                    <div class="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl
                                bg-zinc-900/80 border border-white/[0.06]">
                        <span class="text-sm flex-shrink-0">🎬</span>
                        <p class="text-xs text-zinc-400 truncate flex-1" title={videoName}>
                            {videoName}
                        </p>
                        <button type="button"
                            on:click={() => {
                                videoUrl         = "";
                                duration         = "";
                                durationDetected = false;
                                mediaReady       = false;
                                touched.videoUrl = true;
                                errors           = validate();
                                resetKey        += 1;
                            }}
                            class="text-zinc-600 hover:text-rose-400 text-xs
                                   transition-colors flex-shrink-0 px-1"
                            title="Remove video">✕</button>
                    </div>
                {/if}

                <!-- Embed preview -->
                {#if embedUrl}
                    <div class="mt-3 rounded-xl overflow-hidden border border-white/[0.06]
                                bg-black aspect-video">
                        <iframe src={embedUrl} title="Video preview" class="w-full h-full"
                            frameborder="0"
                            allow="accelerometer; autoplay; clipboard-write;
                                   encrypted-media; gyroscope; picture-in-picture"
                            allowfullscreen></iframe>
                    </div>
                {:else if isDirectVideo}
                    <div class="mt-3 rounded-xl overflow-hidden border border-white/[0.06]
                                bg-black aspect-video">
                        <!-- svelte-ignore a11y-media-has-caption -->
                        <video src={videoUrl} controls class="w-full h-full object-contain"
                            on:loadedmetadata={onVideoLoaded}></video>
                    </div>
                {:else if videoUrl}
                    <p class="text-zinc-600 text-xs mt-1.5">
                        Preview not available for this URL format.
                    </p>
                {/if}

                <p class="text-zinc-700 text-xs mt-1.5">
                    Upload a video file or paste a YouTube / Vimeo link.
                </p>
            </div>

            <!-- Duration -->
            <div>
                <label class="block text-[0.68rem] font-bold tracking-[0.15em] uppercase
                              text-zinc-400 mb-2" for="v-dur">
                    Duration
                    <span class="text-zinc-600 font-normal normal-case">(seconds)</span>
                    {#if durationDetected}
                        <span class="text-emerald-400 font-normal normal-case tracking-normal">
                            — auto-detected ✓
                        </span>
                    {/if}
                </label>

                {#if durationDetected}
                    <div class="flex items-center gap-3 px-4 py-3 rounded-xl
                                bg-emerald-950/30 border border-emerald-800/30">
                        <span class="text-emerald-400 text-sm font-semibold">{duration}s</span>
                        {#if durationDisplay}
                            <span class="text-emerald-600 text-xs">({durationDisplay})</span>
                        {/if}
                        <span class="ml-auto text-emerald-700 text-xs">Read from video file</span>
                        <input type="hidden" name="duration" value={duration} />
                    </div>
                {:else}
                    <div class="relative">
                        <input
                            id="v-dur" name="duration" type="number"
                            min="0" max="36000"
                            placeholder="e.g. 480  —  auto-detected for uploaded files"
                            bind:value={duration}
                            class="block w-full rounded-xl px-4 py-3 text-sm text-zinc-100
                                   placeholder-zinc-600 outline-none transition-all
                                   bg-zinc-900/70 border border-white/[0.08]
                                   focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/15
                                   {durationDisplay ? 'pr-20' : ''}"
                        />
                        {#if durationDisplay}
                            <span class="absolute right-3 top-1/2 -translate-y-1/2
                                         text-xs text-zinc-500 pointer-events-none select-none">
                                {durationDisplay}
                            </span>
                        {/if}
                    </div>
                    <p class="text-zinc-700 text-xs mt-1.5">
                        Auto-detected for uploaded files. Enter manually for YouTube / Vimeo.
                    </p>
                {/if}
            </div>

        </div>

        <!-- Footer -->
        <div class="px-6 py-4 bg-zinc-900/30 border-t border-white/[0.05]
                    flex items-center justify-between">

            <div class="flex flex-col gap-1">
                {#if lesson}
                    <p class="text-xs {isDirty ? 'text-amber-400' : 'text-zinc-600'}">
                        {isDirty ? '● Unsaved changes' : '✓ No changes'}
                    </p>
                {/if}
                {#if !mediaReady && videoUrl}
                    <p class="text-amber-400 text-xs flex items-center gap-1">
                        <span>⚠</span> Process the video before saving
                    </p>
                {/if}
            </div>

            <button
                type="submit"
                disabled={cannotSubmit}
                title={!mediaReady && videoUrl
                    ? "Process the video first"
                    : lesson && !isDirty
                        ? "No changes to save"
                        : ""}
                class="flex items-center gap-2 bg-violet-600 hover:bg-violet-500
                       text-white font-semibold text-sm px-6 py-2.5 rounded-xl
                       transition-all shadow-lg shadow-violet-950/50 active:scale-[0.97]
                       disabled:opacity-40 disabled:cursor-not-allowed
                       disabled:pointer-events-none"
            >
                {#if submitting}
                    <span class="w-3.5 h-3.5 border-2 border-white/25 border-t-white
                                 rounded-full animate-spin"></span>
                    Saving…
                {:else}
                    🎬 {lesson ? "Update Video" : "Save Video"} →
                {/if}
            </button>
        </div>
    </div>

    {#if form?.serverError && form?.type === "video"}
        <div class="bg-rose-950/40 border border-rose-800/30 rounded-xl px-4 py-3">
            <p class="text-rose-400 text-xs flex items-center gap-1.5">
                <span>✗</span>{form.serverError}
            </p>
        </div>
    {/if}
</form>