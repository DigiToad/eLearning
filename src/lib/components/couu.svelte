<!-- src/routes/admin/dashboard/courses/+page.svelte -->
<script>
  import { enhance } from "$app/forms";
  import { goto, invalidateAll } from "$app/navigation";
  import { page } from "$app/stores";
  import { tick } from "svelte";
  import MediaUploader from "$lib/components/Mediaupload.svelte";

  export let data;
  export let form;

  let editMode = false;

  // ── Reactive derived state ─────────────────────────────────────────────────
  $: courses = data?.courses ?? [];
  $: drafts = data?.drafts ?? [];
  $: activeDraft = data?.activeDraft ?? null;
  $: courseId = activeDraft?.courseId ?? null;
  $: modules = activeDraft?.courseData?.modules ?? [];
  $: totalVideos = activeDraft?.totalVideos ?? 0;
  $: uploadedCount = activeDraft?.uploadedCount ?? 0;
  $: isComplete =
    modules.length > 0 &&
    modules.every((m) => m.lessons.length > 0 && m.assessment != null);

  // ── Panel state ────────────────────────────────────────────────────────────
  let panel = "list";

  $: if (
    activeDraft &&
    !editMode &&
    (panel === "list" || $page.url.searchParams.has("courseId"))
  ) {
    panel = "edit";
  }
  let openModule = 0;

  // ── Image / video value holders ────────────────────────────────────────────
  let imageValue = "";
  let videoValues = {};

  function onImageChange(e) {
    imageValue = e.detail.value;
  }
  function onVideoChange(mi, e) {
    videoValues = { ...videoValues, [mi]: e.detail };
  }

  // ── Toast ──────────────────────────────────────────────────────────────────
  let notify = null;

  $: if (form?.success) {
    notify = { type: "success", msg: successMsg(form) };
    setTimeout(() => (notify = null), 4000);
  }
  $: if (form?.serverError || form?.error) {
    notify = { type: "error", msg: form?.serverError ?? form?.error };
  }

  function successMsg(f) {
    if (f.step === "setModuleTitle") return "✓ Module title saved.";
    if (f.step === "uploadLesson") return "✓ Lesson uploaded.";
    if (f.step === "uploadAssessment") return "✓ Assessment validated & saved.";
    if (f.step === "createCourse")
      return "✓ Course created! Add your modules below.";
    if (f.step === "updateCourse") return "✓ Course details updated.";
    if (f.step === "publishCourse") return "✓ Course published successfully!";
    return "✓ Done!";
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function progressPct() {
    if (!totalVideos) return 0;
    return Math.min(100, Math.round((uploadedCount / totalVideos) * 100));
  }

  function moduleStatus(mod) {
    const hasLessons = mod.lessons.length > 0;
    const hasAssessment = mod.assessment != null;
    if (hasLessons && hasAssessment) return "complete";
    if (hasLessons || hasAssessment) return "partial";
    return "empty";
  }

  const STATUS_DOT = {
    complete: "bg-emerald-500",
    partial: "bg-amber-400",
    empty: "bg-zinc-600",
  };

  let publishing = false;

  // ══════════════════════════════════════════════════════════════════════════
  // VALIDATION & SANITIZATION
  // ══════════════════════════════════════════════════════════════════════════
  let touchedFields = {};

  function markTouched(scope, field) {
    touchedFields = { ...touchedFields, [`${scope}.${field}`]: true };
  }

  function showServerError(scope, field) {
    return !touchedFields[`${scope}.${field}`];
  }

  let clientErrors = {};

  function clearClientErrors(key) {
    clientErrors = { ...clientErrors, [key]: null };
  }

  function resetTouched(scope) {
    const next = { ...touchedFields };
    Object.keys(next).forEach((k) => {
      if (k.startsWith(`${scope}.`)) delete next[k];
    });
    touchedFields = next;
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

  function validateCreateCourse(fd) {
    const errs = {};
    const title = sanitize(fd.get("title") ?? "");
    const category = sanitize(fd.get("category") ?? "");
    const instructor = sanitize(fd.get("instructor") ?? "");
    const description = sanitize(fd.get("description") ?? "");
    const totalVids = fd.get("totalVideos");
    const numMods = fd.get("numberOfModules");
    const image = fd.get("image");
    if (!title) errs.title = "Course name is required.";
    if (!category) errs.category = "Category is required.";
    if (!instructor) errs.instructor = "Instructor name is required.";
    if (!description) errs.description = "Description is required.";
    if (!totalVids || +totalVids < 1)
      errs.totalVideos = "Must have at least 1 video.";
    if (!numMods || +numMods < 1)
      errs.numberOfModules = "Must have at least 1 module.";
    if (!image) errs.image = "Thumbnail is required";
    fd.set("title", title);
    fd.set("category", category);
    fd.set("instructor", instructor);
    fd.set("image", image);
    fd.set("description", description);
    return errs;
  }

  function validateModuleTitle(fd) {
    const t = sanitize(fd.get("moduleTitle") ?? "");
    fd.set("moduleTitle", t);
    return t ? null : "Module title cannot be empty.";
  }

  function validateUploadLesson(fd) {
    const errs = {};
    const lessonTitle = sanitize(fd.get("lessonTitle") ?? "");
    const videoUrl = (fd.get("videoUrl") ?? "").trim();
    const dur = fd.get("durationSeconds");

    if (!lessonTitle) errs.lessonTitle = "Lesson title is required.";
    if (!videoUrl) errs.videoUrl = "Please attach a video.";
    if (!dur || +dur < 1)
      errs.durationSeconds = "Duration must be at least 1 second.";

    fd.set("lessonTitle", lessonTitle);
    return errs;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ASSESSMENT STATE
  // Key fix: store everything in a plain object and always replace the whole
  // assessmentStates reference so Svelte detects the change for reactivity.
  // ══════════════════════════════════════════════════════════════════════════

  // assessmentMode[mi]: "file" | "manual"
  let assessmentModes = {};

  function getMode(mi) {
    return assessmentModes[mi] ?? "file";
  }
  function setMode(mi, mode) {
    assessmentModes = { ...assessmentModes, [mi]: mode };
  }

  // Per-module file-upload state
  let assessmentStates = {};

  function getAS(mi) {
    return (
      assessmentStates[mi] ?? {
        fileName: null,
        fileType: null,
        parsed: null,
        errors: [],
        preview: false,
        file: null,
        processing: false,
        showReplace: false,
      }
    );
  }

  // FIX: always produce a brand-new top-level object AND a brand-new inner
  // object so Svelte's reactive block fires reliably.
  function setAS(mi, patch) {
    const prev = assessmentStates[mi] ?? {
      fileName: null,
      fileType: null,
      parsed: null,
      errors: [],
      preview: false,
      file: null,
      processing: false,
      showReplace: false,
    };
    assessmentStates = {
      ...assessmentStates,
      [mi]: { ...prev, ...patch },
    };
  }

  function toggleReplace(mi) {
    setAS(mi, { showReplace: !getAS(mi).showReplace });
  }

  function removeAssessmentFile(mi) {
    // Replace the whole entry with a fresh object
    assessmentStates = {
      ...assessmentStates,
      [mi]: {
        fileName: null,
        fileType: null,
        file: null,
        parsed: null,
        errors: [],
        preview: false,
        processing: false,
        showReplace: getAS(mi).showReplace,
      },
    };
    const input = document.getElementById(`assess-file-${mi}`);
    if (input) input.value = "";
  }

  function togglePreview(mi) {
    setAS(mi, { preview: !getAS(mi).preview });
  }

  // ── Manual question builder state ──────────────────────────────────────────
  // manualDrafts[mi] = { title, passMark, attemptsAllowed, questions[] }
  let manualDrafts = {};

  function getManual(mi) {
    if (!manualDrafts[mi]) {
      manualDrafts = {
        ...manualDrafts,
        [mi]: {
          title: "",
          passMark: 70,
          attemptsAllowed: 3,
          questions: [freshQuestion()],
        },
      };
    }
    return manualDrafts[mi];
  }

  function freshQuestion() {
    return {
      text: "",
      type: "mcq",
      options: [
        { text: "", isCorrect: true },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
      ],
    };
  }

  function setManual(mi, patch) {
    manualDrafts = {
      ...manualDrafts,
      [mi]: { ...getManual(mi), ...patch },
    };
  }

  function addQuestion(mi) {
    const m = getManual(mi);
    setManual(mi, { questions: [...m.questions, freshQuestion()] });
  }

  function removeQuestion(mi, qi) {
    const m = getManual(mi);
    const qs = m.questions.filter((_, i) => i !== qi);
    setManual(mi, { questions: qs.length ? qs : [freshQuestion()] });
  }

  function updateQuestion(mi, qi, patch) {
    const m = getManual(mi);
    const qs = m.questions.map((q, i) => (i === qi ? { ...q, ...patch } : q));
    setManual(mi, { questions: qs });
  }

  function updateOption(mi, qi, oi, patch) {
    const m = getManual(mi);
    const qs = m.questions.map((q, i) => {
      if (i !== qi) return q;
      const opts = q.options.map((o, j) => (j === oi ? { ...o, ...patch } : o));
      return { ...q, options: opts };
    });
    setManual(mi, { questions: qs });
  }

  function setCorrectOption(mi, qi, oi) {
    // For MCQ single-correct, unset others; for multi it would be a toggle
    const m = getManual(mi);
    const qs = m.questions.map((q, i) => {
      if (i !== qi) return q;
      const opts = q.options.map((o, j) => ({ ...o, isCorrect: j === oi }));
      return { ...q, options: opts };
    });
    setManual(mi, { questions: qs });
  }

  function addOption(mi, qi) {
    const m = getManual(mi);
    const qs = m.questions.map((q, i) => {
      if (i !== qi) return q;
      return { ...q, options: [...q.options, { text: "", isCorrect: false }] };
    });
    setManual(mi, { questions: qs });
  }

  function removeOption(mi, qi, oi) {
    const m = getManual(mi);
    const qs = m.questions.map((q, i) => {
      if (i !== qi) return q;
      const opts = q.options.filter((_, j) => j !== oi);
      return { ...q, options: opts.length >= 2 ? opts : q.options };
    });
    setManual(mi, { questions: qs });
  }

  function changeQuestionType(mi, qi, type) {
    const m = getManual(mi);
    const qs = m.questions.map((q, i) => {
      if (i !== qi) return q;
      const opts =
        type === "truefalse"
          ? [
              { text: "True", isCorrect: true },
              { text: "False", isCorrect: false },
            ]
          : q.options.length >= 2
            ? q.options
            : freshQuestion().options;
      return { ...q, type, options: opts };
    });
    setManual(mi, { questions: qs });
  }

  // Validate the manual draft and return error list
  function validateManual(mi) {
    const m = getManual(mi);
    const errs = [];
    if (!m.title.trim()) errs.push("Assessment title is required.");
    m.questions.forEach((q, qi) => {
      if (!q.text.trim()) errs.push(`Question ${qi + 1}: text is required.`);
      if (!["mcq", "truefalse"].includes(q.type))
        errs.push(`Question ${qi + 1}: invalid type.`);
      if (!Array.isArray(q.options) || q.options.length < 2)
        errs.push(`Question ${qi + 1}: need at least 2 options.`);
      else {
        if (!q.options.some((o) => o.isCorrect === true))
          errs.push(`Question ${qi + 1}: mark at least one correct answer.`);
        q.options.forEach((o, oi) => {
          if (!o.text.trim())
            errs.push(
              `Question ${qi + 1}, Option ${oi + 1}: text is required.`,
            );
        });
        if (q.type === "truefalse" && q.options.length !== 2)
          errs.push(
            `Question ${qi + 1}: True/False must have exactly 2 options.`,
          );
      }
    });
    return errs;
  }

  // Manual submit errors per module
  let manualErrors = {};

  // ── File parsing ───────────────────────────────────────────────────────────
  function validateAssessmentSchema(obj) {
    const errs = [];
    if (!obj || typeof obj !== "object") {
      errs.push("File must contain a JSON object at the top level.");
      return errs;
    }
    if (!obj.title || typeof obj.title !== "string" || !obj.title.trim())
      errs.push('Missing required field: "title" (string).');
    if (!Array.isArray(obj.questions) || obj.questions.length === 0) {
      errs.push('Missing required field: "questions" (non-empty array).');
      return errs;
    }
    obj.questions.forEach((q, qi) => {
      const qLabel = `Question ${qi + 1}`;
      if (!q.text || typeof q.text !== "string" || !q.text.trim())
        errs.push(`${qLabel}: missing "text" field.`);
      if (!["mcq", "truefalse"].includes(q.type))
        errs.push(
          `${qLabel}: "type" must be "mcq" or "truefalse" (got "${q.type}").`,
        );
      if (!Array.isArray(q.options) || q.options.length === 0) {
        errs.push(`${qLabel}: "options" must be a non-empty array.`);
      } else {
        const correctCount = q.options.filter(
          (o) => o.isCorrect === true,
        ).length;
        q.options.forEach((o, oi) => {
          if (!o.text || typeof o.text !== "string" || !o.text.trim())
            errs.push(`${qLabel} › Option ${oi + 1}: missing "text" field.`);
          if (typeof o.isCorrect !== "boolean")
            errs.push(
              `${qLabel} › Option ${oi + 1}: "isCorrect" must be true or false.`,
            );
        });
        if (correctCount === 0)
          errs.push(
            `${qLabel}: at least one option must have isCorrect: true.`,
          );
        if (q.type === "truefalse" && q.options.length !== 2)
          errs.push(
            `${qLabel}: "truefalse" questions must have exactly 2 options.`,
          );
      }
    });
    return errs;
  }

  async function parseAssessmentFile(file) {
    const ext = file.name.split(".").pop().toLowerCase();
    const text = await file.text();
    if (ext === "json") {
      try {
        return JSON.parse(text);
      } catch (e) {
        throw new Error("Invalid JSON: " + e.message);
      }
    }
    if (ext === "csv") return parseCSVtoAssessment(text);
    if (ext === "txt" || ext === "pdf") {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {}
      }
      throw new Error("Could not find a valid JSON block in the file.");
    }
    throw new Error(
      `Unsupported file type ".${ext}". Use JSON, CSV, TXT, or PDF.`,
    );
  }

  function parseCSVtoAssessment(csvText) {
    const lines = csvText.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2)
      throw new Error("CSV must have a header row and at least one data row.");
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const rows = lines.slice(1).map((l) => {
      const cols = l.split(",").map((c) => c.trim());
      const row = {};
      headers.forEach((h, i) => {
        row[h] = cols[i] ?? "";
      });
      return row;
    });
    const titleRow = rows[0].title ?? rows[0].name ?? "Assessment";
    const passMark = +(rows[0].passmark ?? rows[0].pass_mark ?? 70);
    const attemptsAllowed = +(rows[0].attemptsallowed ?? rows[0].attempts ?? 3);
    const questions = rows.map((r, qi) => {
      const type =
        (r.type ?? "mcq").toLowerCase() === "truefalse" ? "truefalse" : "mcq";
      const correctKey = (r.correct ?? "").toUpperCase();
      const rawOptions = ["a", "b", "c", "d"]
        .map((k, i) => ({
          text: r[`option${k}`] ?? r[`option${i + 1}`] ?? "",
          key: String.fromCharCode(65 + i),
        }))
        .filter((o) => o.text);
      const options = rawOptions.map((o) => ({
        text: o.text,
        isCorrect: correctKey === o.key || correctKey === o.text.toUpperCase(),
      }));
      return {
        text: r.text ?? r.question ?? `Question ${qi + 1}`,
        type,
        options,
      };
    });
    return { title: titleRow, passMark, attemptsAllowed, questions };
  }

  // FIX: use a local variable for processing flag, set state twice so Svelte
  // sees the intermediate processing=true state before the async work runs.
  async function onAssessmentFileChange(mi, e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Step 1: show spinner immediately
    setAS(mi, {
      fileName: file.name,
      fileType: file.name.split(".").pop().toLowerCase(),
      file,
      parsed: null,
      errors: [],
      preview: false,
      processing: true,
    });
    await tick();

    // Step 2: parse
    let parsed;
    try {
      parsed = await parseAssessmentFile(file);
    } catch (err) {
      setAS(mi, { errors: [err.message], processing: false });
      return;
    }

    // Step 3: validate
    const errs = validateAssessmentSchema(parsed);
    if (errs.length > 0) {
      setAS(mi, { parsed, errors: errs, processing: false });
      return;
    }

    // Step 4: all good
    setAS(mi, { parsed, errors: [], processing: false });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ENHANCE CALLBACKS
  // ══════════════════════════════════════════════════════════════════════════

  function enhanceCreateCourse() {
    return ({ formData, cancel }) => {
      const errs = validateCreateCourse(formData);
      if (Object.keys(errs).length) {
        clientErrors = { ...clientErrors, createCourse: errs };
        cancel();
        return;
      }
      clearClientErrors("createCourse");
      resetTouched("createCourse");
      return async ({ result, update }) => {
        await update({ reset: true });
        await invalidateAll();
        if (result?.type === "success" || result?.data?.success) {
          imageValue = "";
          editMode = false;
          panel = "edit";
        }
      };
    };
  }

  function enhanceModuleTitle(mi) {
    return ({ formData, cancel }) => {
      const err = validateModuleTitle(formData);
      if (err) {
        clientErrors = { ...clientErrors, [`moduleTitle_${mi}`]: err };
        cancel();
        return;
      }
      clearClientErrors(`moduleTitle_${mi}`);
      resetTouched(`moduleTitle_${mi}`);
      return async ({ update }) => {
        await update({ reset: false });
        await invalidateAll();
      };
    };
  }

  function enhanceLesson(mi) {
    return ({ formData, cancel }) => {
      const savedTitle = modules[mi]?.title ?? "";
      if (!savedTitle.trim()) {
        notify = {
          type: "error",
          msg: "⚠ Save the module title first before uploading a lesson.",
        };
        setTimeout(() => (notify = null), 4000);
        const titleInput = document.getElementById(`mt-${mi}`);
        if (titleInput) {
          titleInput.scrollIntoView({ behavior: "smooth", block: "center" });
          titleInput.focus();
          titleInput.classList.add("inp-err");
          setTimeout(() => titleInput.classList.remove("inp-err"), 3000);
        }
        cancel();
        return;
      }
      const errs = validateUploadLesson(formData);
      if (Object.keys(errs).length) {
        clientErrors = { ...clientErrors, [`lesson_${mi}`]: errs };
        cancel();
        return;
      }
      clearClientErrors(`lesson_${mi}`);
      resetTouched(`lesson_${mi}`);
      return async ({ update }) => {
        await update({ reset: true });
        videoValues = { ...videoValues, [mi]: null };
        await invalidateAll();
      };
    };
  }

  // FIX: enhanceAssessment now also handles manual mode
  function enhanceAssessment(mi) {
    return ({ formData, cancel }) => {
      const as = getAS(mi);
      const mode = getMode(mi);

      if (mode === "manual") {
        const errs = validateManual(mi);
        if (errs.length > 0) {
          manualErrors = { ...manualErrors, [mi]: errs };
          cancel();
          return;
        }
        manualErrors = { ...manualErrors, [mi]: [] };
        const m = getManual(mi);
        formData.set("assessmentJson", JSON.stringify(m));
        return async ({ update }) => {
          await update({ reset: false });
          // Reset manual draft for this module
          manualDrafts = {
            ...manualDrafts,
            [mi]: {
              title: "",
              passMark: 70,
              attemptsAllowed: 3,
              questions: [freshQuestion()],
            },
          };
          setAS(mi, { showReplace: false });
          await invalidateAll();
        };
      }

      // File mode
      if (as.processing) {
        cancel();
        return;
      }
      if (!as.parsed && !as.fileName) {
        setAS(mi, { errors: ["Please select a valid assessment file first."] });
        cancel();
        return;
      }
      if (as.errors.length > 0) {
        cancel();
        return;
      }
      if (as.parsed) {
        formData.set("assessmentJson", JSON.stringify(as.parsed));
        return async ({ update }) => {
          await update({ reset: false });
          // FIX: reset file state AND collapse replace section
          setAS(mi, {
            fileName: null,
            file: null,
            parsed: null,
            errors: [],
            preview: false,
            processing: false,
            showReplace: false,
          });
          await invalidateAll();
        };
      }
      setAS(mi, { errors: ["Please select a valid assessment file first."] });
      cancel();
    };
  }

  function enhancePublish() {
    return ({}) => {
      publishing = true;
      return async ({ update }) => {
        await update({ reset: false });
        await invalidateAll();
        publishing = false;
      };
    };
  }
</script>

<!-- ═══ ROOT ════════════════════════════════════════════════════════════════ -->
<div
  class="min-h-screen bg-[#0d0f14] text-zinc-100"
  style="font-family:'DM Sans',sans-serif"
>
  <!-- ── Sidebar ──────────────────────────────────────────────────────────── -->
  <aside
    class="fixed top-0 left-0 h-screen w-56 bg-[#13161d] border-r border-white/5 flex flex-col z-30"
  >
    <div class="px-5 py-5 border-b border-white/5">
      <span
        class="text-xs font-bold text-violet-400 tracking-widest uppercase"
        style="font-family:'Space Mono',monospace">Admin</span
      >
      <p class="text-xs text-zinc-600 mt-0.5">Course Manager</p>
    </div>

    <nav class="flex-1 px-2 py-4 space-y-0.5">
      <button
        on:click={() => {
          panel = "list";
          goto("/admin/dashboard/courses");
        }}
        class="w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors
               {panel === 'list'
          ? 'bg-violet-600/20 text-violet-300'
          : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}"
      >
        ▤ &nbsp;All Courses
      </button>

      <button
        on:click={() => {
          editMode = false;
          panel = "new";
        }}
        class="w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors
               {panel === 'new'
          ? 'bg-violet-600/20 text-violet-300'
          : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}"
      >
        ＋ &nbsp;New Course
      </button>

      {#if activeDraft}
        <button
          on:click={() => (panel = "edit")}
          class="w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors
               {panel === 'edit'
            ? 'bg-violet-600/20 text-violet-300'
            : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}"
        >
          ✎ &nbsp;Continue Draft
          <span
            class="ml-1.5 text-xs bg-amber-500/20 text-amber-300 rounded-full px-2 py-0.5"
          >
            {progressPct()}%
          </span>
        </button>
      {/if}
    </nav>

    <div class="px-5 py-4 border-t border-white/5">
      <p
        class="text-xs text-zinc-600"
        style="font-family:'Space Mono',monospace"
      >
        {courses.length} published · {drafts.length} draft{drafts.length !== 1
          ? "s"
          : ""}
      </p>
    </div>
  </aside>

  <!-- ── Main ─────────────────────────────────────────────────────────────── -->
  <main class="ml-56 p-8 max-w-4xl">
    <!-- Toast -->
    {#if notify}
      <div
        class="fixed top-5 right-5 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-xl border
                {notify.type === 'success'
          ? 'bg-emerald-950 border-emerald-700/40 text-emerald-300'
          : 'bg-red-950 border-red-700/40 text-red-300'}"
      >
        {notify.msg}
      </div>
    {/if}

    <!-- ╔══════════════════════════════════════════════════════════════════╗ -->
    <!-- ║  LIST PANEL                                                      ║ -->
    <!-- ╚══════════════════════════════════════════════════════════════════╝ -->
    {#if panel === "list"}
      <div>
        <h1 class="text-2xl font-bold mb-1">All Courses</h1>
        <p class="text-zinc-500 text-sm mb-7">
          Published records in the CourseList collection.
        </p>

        {#if courses.length === 0}
          <div
            class="border border-dashed border-white/10 rounded-2xl p-14 text-center"
          >
            <p class="text-4xl mb-3">📭</p>
            <p class="text-zinc-500 text-sm">No published courses yet.</p>
            <button
              on:click={() => {
                editMode = false;
                panel = "new";
              }}
              class="mt-4 text-xs bg-violet-600 hover:bg-violet-500 text-white px-5 py-2 rounded-lg transition-colors"
            >
              Create your first course →
            </button>
          </div>
        {:else}
          <div class="grid gap-3">
            {#each courses as c (c._id)}
              <div
                class="bg-[#13161d] border border-white/5 rounded-2xl p-4 flex gap-4 items-center hover:border-violet-500/20 transition-all"
              >
                <img
                  src={c.image}
                  alt={c.title}
                  class="w-20 h-14 rounded-xl object-cover flex-shrink-0 bg-zinc-800"
                />
                <div class="flex-1 min-w-0">
                  <a href={`/admin/dashboard/courses/${c.id}`}>
                    <p
                      class="font-semibold text-sm truncate hover:text-violet-400 transition-colors"
                    >
                      {c.title}
                    </p>
                  </a>
                  <p class="text-xs text-zinc-500 mt-0.5">
                    {c.instructor} · {c.level} · {c.duration ?? "—"}
                  </p>
                  <div class="flex gap-1.5 mt-1.5 flex-wrap">
                    {#each (c.tags ?? []).slice(0, 4) as tag}
                      <span
                        class="text-xs bg-zinc-800 text-zinc-400 rounded px-1.5 py-0.5"
                        >{tag}</span
                      >
                    {/each}
                  </div>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                  <span
                    class="text-xs px-3 py-1 rounded-full
                         {c.status === 'published'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-amber-500/15 text-amber-400'}"
                  >
                    {c.status}
                  </span>
                  <a
                    href={`/admin/dashboard/courses/${c.id}`}
                    class="text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-3 py-1 rounded-lg transition-colors"
                  >
                    Edit
                  </a>
                </div>
              </div>
            {/each}
          </div>
        {/if}

        {#if drafts.length > 0}
          <h2 class="text-base font-semibold mt-10 mb-4 text-zinc-300">
            In-Progress Drafts
          </h2>
          <div class="grid gap-3">
            {#each drafts as d (d.courseId)}
              <div
                class="bg-[#13161d] border border-amber-500/20 rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <p class="font-medium text-sm">
                    {d.courseData?.title ?? "Untitled"}
                  </p>
                  <p class="text-xs text-zinc-500 mt-0.5">
                    {d.uploadedCount} / {d.totalVideos} videos uploaded
                  </p>
                </div>
                <a
                  href={`/admin/dashboard/courses?courseId=${d.courseId}`}
                  class="text-xs bg-violet-700 hover:bg-violet-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Continue →
                </a>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- ╔══════════════════════════════════════════════════════════════════╗ -->
      <!-- ║  NEW / EDIT COURSE PANEL  (Step 1)                               ║ -->
      <!-- ╚══════════════════════════════════════════════════════════════════╝ -->
    {:else if panel === "new"}
      <div>
        <div class="flex items-center gap-3 mb-8">
          <div
            class="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center text-sm font-bold"
          >
            {editMode ? "✎" : "1"}
          </div>
          <div>
            <h1 class="text-xl font-bold">
              {editMode ? "Edit Course Details" : "Course Information"}
            </h1>
            <p class="text-zinc-500 text-sm">
              {editMode
                ? "Update the course info below."
                : "Fill in the basics — you'll add videos next."}
            </p>
          </div>
        </div>

        <form
          method="POST"
          action={editMode ? "?/updateCourse" : "?/createCourse"}
          use:enhance={enhanceCreateCourse()}
          class="space-y-5"
        >
          {#if editMode}
            <input type="hidden" name="courseId" value={courseId} />
          {/if}

          <div>
            <label class="lbl" for="f-title">Course Name</label>
            <input
              id="f-title"
              name="title"
              type="text"
              autocomplete="off"
              placeholder="e.g. Java Full Stack Development"
              value={form?.errors
                ? (form?.values?.title ?? "")
                : editMode
                  ? (activeDraft?.courseData?.title ?? "")
                  : ""}
              on:input={() => markTouched("createCourse", "title")}
              class="inp {clientErrors?.createCourse?.title ||
              (form?.errors?.title && showServerError('createCourse', 'title'))
                ? 'inp-err'
                : ''}"
            />
            {#if clientErrors?.createCourse?.title}
              <p class="ferr">{clientErrors.createCourse.title}</p>
            {:else if form?.errors?.title && showServerError("createCourse", "title")}
              <p class="ferr">{form.errors.title}</p>
            {/if}
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="lbl" for="f-cat">Category</label>
              <input
                id="f-cat"
                name="category"
                type="text"
                autocomplete="off"
                placeholder="Development / Design / AI"
                value={form?.errors
                  ? (form?.values?.category ?? "")
                  : editMode
                    ? (activeDraft?.courseData?.category ?? "")
                    : ""}
                on:input={() => markTouched("createCourse", "category")}
                class="inp {clientErrors?.createCourse?.category ||
                (form?.errors?.category &&
                  showServerError('createCourse', 'category'))
                  ? 'inp-err'
                  : ''}"
              />
              {#if clientErrors?.createCourse?.category}
                <p class="ferr">{clientErrors.createCourse.category}</p>
              {:else if form?.errors?.category && showServerError("createCourse", "category")}
                <p class="ferr">{form.errors.category}</p>
              {/if}
            </div>
            <div>
              <label class="lbl" for="f-level">Level</label>
              <select
                id="f-level"
                name="level"
                on:change={() => markTouched("createCourse", "level")}
                class="inp {form?.errors?.level &&
                showServerError('createCourse', 'level')
                  ? 'inp-err'
                  : ''}"
              >
                <option value="">Select level…</option>
                {#each ["Beginner", "Intermediate", "Advanced"] as lvl}
                  <option
                    value={lvl}
                    selected={editMode
                      ? activeDraft?.courseData?.level === lvl
                      : form?.errors && form?.values?.level === lvl}
                  >
                    {lvl}
                  </option>
                {/each}
              </select>
            </div>
          </div>

          <div>
            <label class="lbl" for="f-inst">Instructor Name</label>
            <input
              id="f-inst"
              name="instructor"
              type="text"
              autocomplete="off"
              placeholder="e.g. John Doe"
              value={form?.errors
                ? (form?.values?.instructor ?? "")
                : editMode
                  ? (activeDraft?.courseData?.instructor ?? "")
                  : ""}
              on:input={() => markTouched("createCourse", "instructor")}
              class="inp {clientErrors?.createCourse?.instructor ||
              (form?.errors?.instructor &&
                showServerError('createCourse', 'instructor'))
                ? 'inp-err'
                : ''}"
            />
            {#if clientErrors?.createCourse?.instructor}
              <p class="ferr">{clientErrors.createCourse.instructor}</p>
            {:else if form?.errors?.instructor && showServerError("createCourse", "instructor")}
              <p class="ferr">{form.errors.instructor}</p>
            {/if}
          </div>

          <div>
            <label class="lbl" for="f-desc">Short Description</label>
            <textarea
              id="f-desc"
              name="description"
              rows="3"
              autocomplete="off"
              placeholder="What will students learn?"
              on:input={() => markTouched("createCourse", "description")}
              class="inp resize-none {clientErrors?.createCourse?.description ||
              (form?.errors?.description &&
                showServerError('createCourse', 'description'))
                ? 'inp-err'
                : ''}"
              >{form?.errors
                ? (form?.values?.description ?? "")
                : editMode
                  ? (activeDraft?.courseData?.description ?? "")
                  : ""}</textarea
            >
            {#if clientErrors?.createCourse?.description}
              <p class="ferr">{clientErrors.createCourse.description}</p>
            {:else if form?.errors?.description && showServerError("createCourse", "description")}
              <p class="ferr">{form.errors.description}</p>
            {/if}
          </div>

          <div>
            <!-- svelte-ignore a11y-label-has-associated-control -->
            <label class="lbl mb-2 block">Thumbnail</label>
            {#if editMode && activeDraft?.courseData?.image}
              <div class="mb-3 flex items-center gap-3">
                <img
                  src={activeDraft.courseData.image}
                  alt="current thumbnail"
                  class="w-24 h-16 rounded-xl object-cover bg-zinc-800"
                />
                <p class="text-xs text-zinc-500">
                  Current thumbnail — upload below to replace it.
                </p>
              </div>
            {/if}
            <input
              type="hidden"
              name="image"
              value={imageValue ||
                (editMode ? (activeDraft?.courseData?.image ?? "") : "")}
            />
            <MediaUploader type="image" on:change={onImageChange} />
            {#if clientErrors?.createCourse?.image}
              <p class="ferr">{clientErrors.createCourse.image}</p>
            {:else if form?.errors?.image && showServerError("createCourse", "image")}
              <p class="ferr">{form.errors.image}</p>
            {/if}
          </div>

          <div>
            <label class="lbl" for="f-tags">
              Tags <span class="normal-case font-normal text-zinc-600"
                >(comma-separated)</span
              >
            </label>
            <input
              id="f-tags"
              name="tags"
              type="text"
              autocomplete="off"
              placeholder="Java, Spring Boot, REST API"
              value={form?.errors
                ? (form?.values?.tags ?? "")
                : editMode
                  ? (activeDraft?.courseData?.tags ?? []).join(", ")
                  : ""}
              class="inp"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="lbl" for="f-vids">Total Number of Videos</label>
              <input
                id="f-vids"
                name="totalVideos"
                type="number"
                min="1"
                placeholder="18"
                value={form?.errors
                  ? (form?.values?.totalVideos ?? "")
                  : editMode
                    ? (activeDraft?.totalVideos ?? "")
                    : ""}
                on:input={() => markTouched("createCourse", "totalVideos")}
                class="inp {clientErrors?.createCourse?.totalVideos ||
                (form?.errors?.totalVideos &&
                  showServerError('createCourse', 'totalVideos'))
                  ? 'inp-err'
                  : ''}"
              />
              {#if clientErrors?.createCourse?.totalVideos}
                <p class="ferr">{clientErrors.createCourse.totalVideos}</p>
              {/if}
            </div>
            <div>
              <label class="lbl" for="f-mods">Number of Modules</label>
              <input
                id="f-mods"
                name="numberOfModules"
                type="number"
                min="1"
                placeholder="3"
                value={form?.errors
                  ? (form?.values?.numberOfModules ?? "")
                  : editMode
                    ? (activeDraft?.courseData?.modules?.length ?? "")
                    : ""}
                on:input={() => markTouched("createCourse", "numberOfModules")}
                class="inp {clientErrors?.createCourse?.numberOfModules ||
                (form?.errors?.numberOfModules &&
                  showServerError('createCourse', 'numberOfModules'))
                  ? 'inp-err'
                  : ''}"
              />
              {#if clientErrors?.createCourse?.numberOfModules}
                <p class="ferr">{clientErrors.createCourse.numberOfModules}</p>
              {/if}
            </div>
          </div>

          <div class="flex gap-3 pt-2">
            <button
              type="submit"
              class="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
            >
              {editMode ? "Save Changes" : "Create Course & Continue →"}
            </button>
            <button
              type="button"
              on:click={() => {
                editMode = false;
                panel = activeDraft ? "edit" : "list";
              }}
              class="text-zinc-400 hover:text-zinc-200 px-5 py-3 rounded-xl hover:bg-white/5 transition-all text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      <!-- ╔══════════════════════════════════════════════════════════════════╗ -->
      <!-- ║  EDIT DRAFT PANEL  (Steps 2 + 3 per module)                     ║ -->
      <!-- ╚══════════════════════════════════════════════════════════════════╝ -->
    {:else if panel === "edit" && activeDraft}
      <div>
        <div class="flex items-center gap-2 mb-6 text-xs text-zinc-500">
          <button
            on:click={() => {
              panel = "list";
              goto("/admin/dashboard/courses");
            }}
            class="hover:text-violet-400 transition-colors"
            >← All Courses</button
          >
          <span>/</span>
          <span class="text-zinc-300 truncate max-w-xs"
            >{activeDraft.courseData.title}</span
          >
        </div>

        <div
          class="bg-[#13161d] border border-white/5 rounded-2xl p-6 mb-8 flex gap-6 items-start"
        >
          {#if activeDraft.courseData.image}
            <img
              src={activeDraft.courseData.image}
              alt={activeDraft.courseData.title}
              class="w-28 h-20 rounded-xl object-cover flex-shrink-0 bg-zinc-800"
            />
          {:else}
            <div
              class="w-28 h-20 rounded-xl flex-shrink-0 bg-zinc-800 flex items-center justify-center"
            >
              <span class="text-2xl">🎓</span>
            </div>
          {/if}
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-3">
              <h1 class="text-xl font-bold truncate">
                {activeDraft.courseData.title}
              </h1>
              <button
                on:click={() => {
                  editMode = true;
                  panel = "new";
                }}
                class="text-xs text-zinc-500 hover:text-violet-400 flex-shrink-0 border border-white/10
                     hover:border-violet-500/30 rounded-lg px-3 py-1.5 transition-all"
              >
                ✎ Edit Details
              </button>
            </div>
            <p class="text-zinc-500 text-sm mt-1">
              {activeDraft.courseData.instructor} · {activeDraft.courseData
                .level}
            </p>
            <div class="mt-4">
              <div class="flex justify-between text-xs text-zinc-500 mb-1.5">
                <span>Video upload progress</span>
                <span>{uploadedCount} / {totalVideos}</span>
              </div>
              <div class="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  class="h-full bg-violet-500 rounded-full transition-all duration-500"
                  style="width:{progressPct()}%"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex gap-5 mb-5 text-xs text-zinc-500">
          <span class="flex items-center gap-1.5"
            ><span class="w-2 h-2 rounded-full bg-emerald-500 inline-block"
            ></span> Complete</span
          >
          <span class="flex items-center gap-1.5"
            ><span class="w-2 h-2 rounded-full bg-amber-400 inline-block"
            ></span> Partial</span
          >
          <span class="flex items-center gap-1.5"
            ><span class="w-2 h-2 rounded-full bg-zinc-600 inline-block"></span>
            Empty</span
          >
        </div>

        <!-- Modules accordion -->
        <div class="space-y-3">
          {#each modules as mod, mi (mod.id)}
            {@const status = moduleStatus(mod)}
            <!-- FIX: derive as reactively from assessmentStates[mi] directly so
             Svelte re-renders whenever assessmentStates changes -->
            {@const as = assessmentStates[mi] ?? {
              fileName: null,
              fileType: null,
              parsed: null,
              errors: [],
              preview: false,
              file: null,
              processing: false,
              showReplace: false,
            }}
            {@const mode = assessmentModes[mi] ?? "manual"}
            {@const manual = manualDrafts[mi] ?? {
              title: "",
              passMark: 70,
              attemptsAllowed: 3,
              questions: [
                {
                  text: "",
                  type: "mcq",
                  options: [
                    { text: "", isCorrect: true },
                    { text: "", isCorrect: false },
                    { text: "", isCorrect: false },
                    { text: "", isCorrect: false },
                  ],
                },
              ],
            }}

            <div
              class="bg-[#13161d] border rounded-2xl overflow-hidden transition-all
                    {openModule === mi
                ? 'border-violet-500/40'
                : 'border-white/5'}"
            >
              <!-- Accordion header -->
              <button
                type="button"
                on:click={() => (openModule = openModule === mi ? -1 : mi)}
                class="w-full px-6 py-4 flex items-center justify-between hover:bg-white/[.03] transition-colors"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <span
                    class="w-2.5 h-2.5 rounded-full {STATUS_DOT[
                      status
                    ]} flex-shrink-0"
                  ></span>
                  <span class="font-semibold text-sm truncate">
                    {mod.title || `Module ${mi + 1} (untitled)`}
                  </span>
                  <span class="text-xs text-zinc-600 flex-shrink-0">
                    {mod.lessons.length} lesson{mod.lessons.length !== 1
                      ? "s"
                      : ""}
                    {#if mod.assessment}
                      · ✓ assessment{/if}
                  </span>
                </div>
                <span
                  class="text-zinc-500 text-base leading-none select-none ml-3"
                >
                  {openModule === mi ? "−" : "+"}
                </span>
              </button>

              <!-- Accordion body -->
              {#if openModule === mi}
                <div class="px-6 pb-7 space-y-7 border-t border-white/5 pt-6">
                  <!-- ① Module title -->
                  <form
                    method="POST"
                    action="?/setModuleTitle"
                    use:enhance={enhanceModuleTitle(mi)}
                  >
                    <input type="hidden" name="courseId" value={courseId} />
                    <input type="hidden" name="moduleIndex" value={mi} />
                    <div class="flex gap-3 items-end">
                      <div class="flex-1">
                        <label class="lbl" for="mt-{mi}">Module Title</label>
                        <input
                          id="mt-{mi}"
                          name="moduleTitle"
                          type="text"
                          autocomplete="off"
                          placeholder="e.g. Java Fundamentals"
                          value={mod.title}
                          on:input={() =>
                            markTouched(`moduleTitle_${mi}`, "moduleTitle")}
                          class="inp {clientErrors?.[`moduleTitle_${mi}`]
                            ? 'inp-err'
                            : ''}"
                        />
                        {#if clientErrors?.[`moduleTitle_${mi}`]}
                          <p class="ferr">
                            {clientErrors[`moduleTitle_${mi}`]}
                          </p>
                        {/if}
                      </div>
                      <button
                        type="submit"
                        class="bg-zinc-700 hover:bg-zinc-600 text-sm text-zinc-200 px-4 py-2.5 rounded-xl transition-colors flex-shrink-0"
                      >
                        Save
                      </button>
                    </div>
                  </form>

                  <!-- ② Lesson list -->
                  {#if mod.lessons.length > 0}
                    <div>
                      <p class="lbl mb-2">Uploaded Lessons</p>
                      <ul class="space-y-2">
                        {#each mod.lessons as les, li}
                          <li
                            class="flex items-center gap-3 bg-zinc-900/60 rounded-xl px-4 py-3"
                          >
                            <span
                              class="text-xs text-zinc-600 w-5 flex-shrink-0"
                              style="font-family:'Space Mono',monospace"
                              >{li + 1}</span
                            >
                            <div class="flex-1 min-w-0">
                              <p class="text-sm font-medium truncate">
                                {les.title}
                              </p>
                              <p class="text-xs text-zinc-600 mt-0.5 truncate">
                                {les.durationSeconds}s · {les.videoUrl}
                              </p>
                            </div>
                            <span class="text-emerald-400 text-xs flex-shrink-0"
                              >✓</span
                            >
                          </li>
                        {/each}
                      </ul>
                    </div>
                  {/if}

                  <!-- ③ Upload lesson -->
                  <form
                    method="POST"
                    action="?/uploadLesson"
                    use:enhance={enhanceLesson(mi)}
                  >
                    <input type="hidden" name="courseId" value={courseId} />
                    <input type="hidden" name="moduleIndex" value={mi} />
                    <input
                      type="hidden"
                      name="videoUrl"
                      value={videoValues[mi]?.value ?? ""}
                    />

                    <p class="lbl mb-3">Add a Lesson</p>

                    {#if !(modules[mi]?.title ?? "").trim()}
                      <div
                        class="mb-4 flex items-start gap-2.5 bg-amber-950/30 border border-amber-700/30 rounded-xl px-4 py-3"
                      >
                        <span class="text-amber-400 text-sm mt-0.5">⚠</span>
                        <p class="text-xs text-amber-300 leading-relaxed">
                          Save the <strong>module title</strong> above before adding
                          lessons to this module.
                        </p>
                      </div>
                    {/if}

                    <div class="space-y-3">
                      <div>
                        <label class="lbl" for="lt-{mi}">Lesson Title</label>
                        <input
                          id="lt-{mi}"
                          name="lessonTitle"
                          type="text"
                          autocomplete="off"
                          placeholder="e.g. Introduction to Java & JVM"
                          on:input={() =>
                            markTouched(`lesson_${mi}`, "lessonTitle")}
                          class="inp {clientErrors?.[`lesson_${mi}`]
                            ?.lessonTitle
                            ? 'inp-err'
                            : ''}"
                        />
                        {#if clientErrors?.[`lesson_${mi}`]?.lessonTitle}
                          <p class="ferr">
                            {clientErrors[`lesson_${mi}`].lessonTitle}
                          </p>
                        {/if}
                      </div>
                      <div>
                        <!-- svelte-ignore a11y-label-has-associated-control -->
                        <label class="lbl mb-2 block">Lesson Video</label>
                        <MediaUploader
                          type="video"
                          on:change={(e) => onVideoChange(mi, e)}
                        />
                        {#if clientErrors?.[`lesson_${mi}`]?.videoUrl}
                          <p class="ferr mt-1">
                            {clientErrors[`lesson_${mi}`].videoUrl}
                          </p>
                        {/if}
                      </div>
                      <div>
                        <label class="lbl" for="ld-{mi}"
                          >Duration (seconds)</label
                        >
                        <input
                          id="ld-{mi}"
                          name="durationSeconds"
                          type="number"
                          min="1"
                          placeholder="286"
                          on:input={() =>
                            markTouched(`lesson_${mi}`, "durationSeconds")}
                          class="inp w-40 {clientErrors?.[`lesson_${mi}`]
                            ?.durationSeconds
                            ? 'inp-err'
                            : ''}"
                        />
                        {#if clientErrors?.[`lesson_${mi}`]?.durationSeconds}
                          <p class="ferr">
                            {clientErrors[`lesson_${mi}`].durationSeconds}
                          </p>
                        {/if}
                      </div>
                    </div>

                    <button
                      type="submit"
                      class="mt-4 bg-violet-700 hover:bg-violet-600 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition-colors"
                    >
                      ↑ Upload Lesson
                    </button>
                  </form>

                  <!-- divider -->
                  <div class="relative">
                    <div class="absolute inset-0 flex items-center">
                      <div class="w-full border-t border-white/5"></div>
                    </div>
                    <div class="relative flex justify-center">
                      <span
                        class="bg-[#13161d] px-3 text-xs text-zinc-600 uppercase tracking-widest"
                        >Assessment</span
                      >
                    </div>
                  </div>

                  <!-- ④ Assessment status + Replace toggle -->
                  {#if mod.assessment}
                    <div
                      class="bg-emerald-950/40 border border-emerald-800/30 rounded-xl overflow-hidden"
                    >
                      <div
                        class="px-5 py-4 flex items-start justify-between gap-3"
                      >
                        <div>
                          <p class="text-emerald-400 text-sm font-semibold">
                            ✓ {mod.assessment.title}
                          </p>
                          <p class="text-xs text-zinc-500 mt-1">
                            {mod.assessment.questions.length} question{mod
                              .assessment.questions.length !== 1
                              ? "s"
                              : ""}
                            · Pass mark: {mod.assessment.passMark}% · Max
                            attempts: {mod.assessment.attemptsAllowed}
                          </p>
                        </div>
                        <button
                          type="button"
                          on:click={() => toggleReplace(mi)}
                          class="text-xs text-zinc-500 hover:text-amber-400 flex-shrink-0 border border-white/10
                         hover:border-amber-500/30 rounded-lg px-3 py-1.5 transition-all"
                        >
                          {as.showReplace ? "✕ Cancel" : "↺ Replace"}
                        </button>
                      </div>
                    </div>
                  {/if}

                  <!-- ⑤ Assessment uploader — shown when no assessment OR replacing -->
                  {#if !mod.assessment || as.showReplace}
                    <!-- ── MODE SWITCHER ─────────────────────────────────────────── -->
                    <div class="flex gap-1 bg-zinc-900 rounded-xl p-1 w-fit">
                      <!-- <button type="button"
                on:click={() => setMode(mi, "file")}
                class="text-xs px-4 py-2 rounded-lg transition-colors font-medium
                       {mode === 'file' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}">
                📄 Upload File
              </button> -->
                      <button
                        type="button"
                        on:click={() => setMode(mi, "manual")}
                        class="text-xs px-4 py-2 rounded-lg transition-colors font-medium
                       {mode === 'manual'
                          ? 'bg-violet-600 text-white'
                          : 'text-zinc-400 hover:text-zinc-200'}"
                      >
                        ✏️ Type Questions
                      </button>
                    </div>

                    <!-- ══ FILE UPLOAD MODE ══════════════════════════════════════ -->
                    {#if mode === "file"}
                      <form
                        method="POST"
                        action="?/uploadAssessment"
                        enctype="multipart/form-data"
                        use:enhance={enhanceAssessment(mi)}
                      >
                        <input type="hidden" name="courseId" value={courseId} />
                        <input type="hidden" name="moduleIndex" value={mi} />

                        <p class="lbl mb-1">Upload Assessment File</p>
                        <p class="text-xs text-zinc-600 mb-3 leading-relaxed">
                          Accepts
                          <code
                            class="text-violet-400 bg-violet-950/40 px-1 rounded"
                            >.json</code
                          >,
                          <code
                            class="text-violet-400 bg-violet-950/40 px-1 rounded"
                            >.csv</code
                          >,
                          <code
                            class="text-violet-400 bg-violet-950/40 px-1 rounded"
                            >.txt</code
                          >,
                          <code
                            class="text-violet-400 bg-violet-950/40 px-1 rounded"
                            >.pdf</code
                          >. JSON must have
                          <code
                            class="text-violet-400 bg-violet-950/40 px-1 rounded"
                            >title</code
                          >
                          and
                          <code
                            class="text-violet-400 bg-violet-950/40 px-1 rounded"
                            >questions[]</code
                          >
                          with
                          <code
                            class="text-violet-400 bg-violet-950/40 px-1 rounded"
                            >text</code
                          >,
                          <code
                            class="text-violet-400 bg-violet-950/40 px-1 rounded"
                            >type</code
                          >
                          ("mcq"/"truefalse"),
                          <code
                            class="text-violet-400 bg-violet-950/40 px-1 rounded"
                            >options[]</code
                          >
                          (each with
                          <code
                            class="text-violet-400 bg-violet-950/40 px-1 rounded"
                            >text</code
                          >
                          +
                          <code
                            class="text-violet-400 bg-violet-950/40 px-1 rounded"
                            >isCorrect</code
                          >).
                        </p>

                        <!-- Hidden file input -->
                        <input
                          id="assess-file-{mi}"
                          name="assessmentFile"
                          type="file"
                          accept=".json,.csv,.txt,.pdf"
                          style="display:none"
                          on:change={(e) => onAssessmentFileChange(mi, e)}
                        />

                        <!-- Drop zone -->
                        {#if as.processing}
                          <div
                            class="border-2 border-dashed border-violet-500/40 bg-violet-950/10 rounded-xl px-6 py-8 text-center"
                          >
                            <div
                              class="flex items-center justify-center gap-3 mb-2"
                            >
                              <span class="spinner"></span>
                              <p class="text-sm font-medium text-violet-300">
                                Parsing & validating…
                              </p>
                            </div>
                            <p class="text-xs text-zinc-500 mt-1">
                              {as.fileName}
                            </p>
                          </div>
                        {:else}
                          <div
                            class="border-2 border-dashed rounded-xl px-6 py-7 text-center transition-all cursor-pointer
                       {as.errors.length > 0
                              ? 'border-red-500/40 bg-red-950/20'
                              : as.parsed
                                ? 'border-emerald-500/40 bg-emerald-950/10'
                                : 'border-white/10 hover:border-violet-500/40 hover:bg-violet-950/10'}"
                            on:click={() =>
                              document
                                .getElementById(`assess-file-${mi}`)
                                .click()}
                            on:keydown={(e) =>
                              e.key === "Enter" &&
                              document
                                .getElementById(`assess-file-${mi}`)
                                .click()}
                            role="button"
                            tabindex="0"
                          >
                            {#if as.fileName}
                              <div class="flex flex-col items-center gap-1.5">
                                <span class="text-2xl"
                                  >{as.errors.length > 0 ? "❌" : "✅"}</span
                                >
                                <div
                                  class="flex items-center gap-2 bg-zinc-800/80 border border-white/10 rounded-lg px-3 py-1.5 max-w-full"
                                >
                                  <span
                                    class="text-xs font-medium text-zinc-300 truncate max-w-[240px]"
                                    >{as.fileName}</span
                                  >
                                  <span
                                    class="text-xs text-zinc-600 uppercase flex-shrink-0"
                                    style="font-family:'Space Mono',monospace"
                                    >{as.fileType}</span
                                  >
                                </div>
                                <p
                                  class="text-xs mt-0.5 {as.errors.length > 0
                                    ? 'text-red-400'
                                    : 'text-emerald-400'}"
                                >
                                  {as.errors.length > 0
                                    ? "Invalid — see errors below"
                                    : "Validated ✓ — ready to upload"}
                                </p>
                                <p class="text-xs text-zinc-700 mt-1">
                                  Click to change file
                                </p>
                              </div>
                            {:else}
                              <p class="text-2xl mb-2">📄</p>
                              <p class="text-sm text-zinc-400">
                                Click to select a
                                <span class="text-violet-400 font-medium"
                                  >.json / .csv / .txt / .pdf</span
                                > file
                              </p>
                            {/if}
                          </div>

                          <!-- FIX: Remove file button — always visible when file is selected -->
                          {#if as.fileName && !as.processing}
                            <button
                              type="button"
                              on:click|stopPropagation={() =>
                                removeAssessmentFile(mi)}
                              class="mt-2 flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-400 transition-colors px-1 py-0.5 rounded"
                            >
                              <span class="text-base leading-none">×</span> Remove
                              file
                            </button>
                          {/if}
                        {/if}

                        <!-- Validation errors -->
                        {#if as.errors.length > 0}
                          <div
                            class="mt-3 bg-red-950/40 border border-red-800/40 rounded-xl p-4 space-y-1"
                          >
                            <p class="text-red-400 text-xs font-semibold mb-2">
                              ✗ {as.errors.length} validation error{as.errors
                                .length !== 1
                                ? "s"
                                : ""} found
                            </p>
                            {#each as.errors as err}
                              <p class="text-red-400 text-xs leading-relaxed">
                                • {err}
                              </p>
                            {/each}
                          </div>
                        {/if}

                        <!-- Preview panel — FIX: use togglePreview() function, not inline setAS -->
                        {#if as.parsed && as.errors.length === 0}
                          <div
                            class="mt-3 bg-emerald-950/30 border border-emerald-800/30 rounded-xl overflow-hidden"
                          >
                            <button
                              type="button"
                              on:click={() => togglePreview(mi)}
                              class="w-full px-4 py-3 flex items-center justify-between text-xs text-emerald-300 hover:bg-emerald-950/40 transition-colors"
                            >
                              <span class="font-semibold">
                                ✓ Valid — "{as.parsed.title}" · {as.parsed
                                  .questions.length} question{as.parsed
                                  .questions.length !== 1
                                  ? "s"
                                  : ""}
                                {#if as.parsed.passMark}
                                  · Pass: {as.parsed.passMark}%{/if}
                              </span>
                              <span class="text-zinc-500"
                                >{as.preview
                                  ? "▲ Hide preview"
                                  : "▼ Preview questions"}</span
                              >
                            </button>
                            {#if as.preview}
                              <div
                                class="px-4 pb-4 space-y-3 border-t border-emerald-800/20 pt-3"
                              >
                                {#each as.parsed.questions as q, qi}
                                  <div
                                    class="bg-zinc-900/60 rounded-xl px-4 py-3"
                                  >
                                    <p
                                      class="text-xs font-semibold text-zinc-300 mb-2"
                                    >
                                      Q{qi + 1}
                                      <span
                                        class="ml-1 text-violet-400 font-normal"
                                        >[{q.type}]</span
                                      >
                                      — {q.text}
                                    </p>
                                    <ul class="space-y-1">
                                      {#each q.options as opt}
                                        <li
                                          class="text-xs flex items-center gap-2 {opt.isCorrect
                                            ? 'text-emerald-400'
                                            : 'text-zinc-500'}"
                                        >
                                          <span
                                            class="w-3.5 h-3.5 rounded-full border flex-shrink-0 flex items-center justify-center text-[9px]
                                     {opt.isCorrect
                                              ? 'border-emerald-500 bg-emerald-500/20'
                                              : 'border-zinc-700'}"
                                          >
                                            {opt.isCorrect ? "✓" : ""}
                                          </span>
                                          {opt.text}
                                        </li>
                                      {/each}
                                    </ul>
                                  </div>
                                {/each}
                              </div>
                            {/if}
                          </div>
                        {/if}

                        {#if form?.step === "uploadAssessment" && +form?.moduleIndex === mi && form?.error}
                          <div
                            class="mt-3 bg-red-950/40 border border-red-800/40 rounded-xl p-4"
                          >
                            <p
                              class="text-red-400 text-xs font-medium leading-relaxed whitespace-pre-wrap"
                            >
                              {form.error}
                            </p>
                          </div>
                        {/if}

                        <button
                          type="submit"
                          disabled={!as.parsed ||
                            as.errors.length > 0 ||
                            as.processing}
                          class="mt-4 text-sm font-medium px-6 py-2.5 rounded-xl transition-colors
                       {!as.parsed || as.errors.length > 0 || as.processing
                            ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                            : 'bg-violet-700 hover:bg-violet-600 text-white'}"
                        >
                          ↑ Upload & Save Assessment
                        </button>
                      </form>

                      <!-- ══ MANUAL / TYPE QUESTIONS MODE ════════════════════════ -->
                    {:else}
                      <form
                        method="POST"
                        action="?/uploadAssessment"
                        enctype="multipart/form-data"
                        use:enhance={enhanceAssessment(mi)}
                      >
                        <input type="hidden" name="courseId" value={courseId} />
                        <input type="hidden" name="moduleIndex" value={mi} />

                        <p class="lbl mb-4">Build Assessment Manually</p>

                        <!-- Title, pass mark, attempts -->
                        <div class="space-y-3 mb-6">
                          <div>
                            <label class="lbl" for="man-title-{mi}"
                              >Assessment Title</label
                            >
                            <input
                              id="man-title-{mi}"
                              type="text"
                              autocomplete="off"
                              placeholder="e.g. Java Basics Quiz"
                              value={manual.title}
                              on:input={(e) =>
                                setManual(mi, { title: e.target.value })}
                              class="inp"
                            />
                          </div>
                          <div class="grid grid-cols-2 gap-3">
                            <div>
                              <label class="lbl" for="man-pass-{mi}"
                                >Pass Mark (%)</label
                              >
                              <input
                                id="man-pass-{mi}"
                                type="number"
                                min="1"
                                max="100"
                                value={manual.passMark}
                                on:input={(e) =>
                                  setManual(mi, { passMark: +e.target.value })}
                                class="inp"
                              />
                            </div>
                            <div>
                              <label class="lbl" for="man-attempts-{mi}"
                                >Max Attempts</label
                              >
                              <input
                                id="man-attempts-{mi}"
                                type="number"
                                min="1"
                                value={manual.attemptsAllowed}
                                on:input={(e) =>
                                  setManual(mi, {
                                    attemptsAllowed: +e.target.value,
                                  })}
                                class="inp"
                              />
                            </div>
                          </div>
                        </div>

                        <!-- Questions -->
                        <div class="space-y-5">
                          {#each manual.questions as q, qi}
                            <div
                              class="bg-zinc-900/70 border border-white/5 rounded-2xl p-4 space-y-3"
                            >
                              <!-- Question header -->
                              <div
                                class="flex items-center justify-between gap-3"
                              >
                                <span
                                  class="text-xs font-semibold text-zinc-400 uppercase tracking-wider"
                                  style="font-family:'Space Mono',monospace"
                                  >Q{qi + 1}</span
                                >
                                <div class="flex items-center gap-2">
                                  <!-- Type selector -->
                                  <select
                                    value={q.type}
                                    on:change={(e) =>
                                      changeQuestionType(
                                        mi,
                                        qi,
                                        e.target.value,
                                      )}
                                    class="bg-zinc-800 border border-white/10 text-zinc-300 text-xs rounded-lg px-2 py-1.5 outline-none"
                                  >
                                    <option value="mcq">MCQ</option>
                                    <option value="truefalse"
                                      >True / False</option
                                    >
                                  </select>
                                  {#if manual.questions.length > 1}
                                    <button
                                      type="button"
                                      on:click={() => removeQuestion(mi, qi)}
                                      class="text-xs text-zinc-600 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-950/30"
                                    >
                                      ✕ Remove
                                    </button>
                                  {/if}
                                </div>
                              </div>

                              <!-- Question text -->
                              <div>
                                <label class="lbl" for="q-text-{mi}-{qi}"
                                  >Question</label
                                >
                                <input
                                  id="q-text-{mi}-{qi}"
                                  type="text"
                                  autocomplete="off"
                                  placeholder="e.g. Who developed Java?"
                                  value={q.text}
                                  on:input={(e) =>
                                    updateQuestion(mi, qi, {
                                      text: e.target.value,
                                    })}
                                  class="inp"
                                />
                              </div>

                              <!-- Options -->
                              <div>
                                <p class="lbl mb-2">
                                  Options
                                  <span
                                    class="normal-case font-normal text-zinc-600"
                                  >
                                    — click the circle to mark the correct
                                    answer
                                  </span>
                                </p>
                                <div class="space-y-2">
                                  {#each q.options as opt, oi}
                                    <div class="flex items-center gap-2">
                                      <!-- Correct toggle -->
                                      <button
                                        type="button"
                                        on:click={() =>
                                          setCorrectOption(mi, qi, oi)}
                                        title={opt.isCorrect
                                          ? "Correct answer"
                                          : "Mark as correct"}
                                        class="w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all
                                 {opt.isCorrect
                                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                                          : 'border-zinc-600 hover:border-zinc-400'}"
                                      >
                                        {#if opt.isCorrect}<span
                                            class="text-[10px]">✓</span
                                          >{/if}
                                      </button>
                                      <!-- Option text -->
                                      <input
                                        type="text"
                                        autocomplete="off"
                                        placeholder="Option {oi + 1}"
                                        value={opt.text}
                                        on:input={(e) =>
                                          updateOption(mi, qi, oi, {
                                            text: e.target.value,
                                          })}
                                        class="inp flex-1"
                                      />
                                      <!-- Remove option (MCQ only, min 2) -->
                                      {#if q.type === "mcq" && q.options.length > 2}
                                        <button
                                          type="button"
                                          on:click={() =>
                                            removeOption(mi, qi, oi)}
                                          class="text-zinc-600 hover:text-red-400 transition-colors text-lg leading-none flex-shrink-0 w-6"
                                        >
                                          ×
                                        </button>
                                      {/if}
                                    </div>
                                  {/each}
                                </div>

                                <!-- Add option (MCQ only) -->
                                {#if q.type === "mcq" && q.options.length < 6}
                                  <button
                                    type="button"
                                    on:click={() => addOption(mi, qi)}
                                    class="mt-2 text-xs text-zinc-500 hover:text-violet-400 transition-colors flex items-center gap-1.5"
                                  >
                                    <span class="text-base leading-none">+</span
                                    > Add option
                                  </button>
                                {/if}
                              </div>
                            </div>
                          {/each}
                        </div>

                        <!-- Add question -->
                        <button
                          type="button"
                          on:click={() => addQuestion(mi)}
                          class="mt-4 w-full border-2 border-dashed border-white/10 hover:border-violet-500/40
                       hover:bg-violet-950/10 rounded-xl py-3 text-sm text-zinc-500 hover:text-violet-300
                       transition-all flex items-center justify-center gap-2"
                        >
                          <span class="text-lg leading-none">+</span> Add Question
                        </button>

                        <!-- Manual validation errors -->
                        {#if manualErrors[mi]?.length > 0}
                          <div
                            class="mt-4 bg-red-950/40 border border-red-800/40 rounded-xl p-4 space-y-1"
                          >
                            <p class="text-red-400 text-xs font-semibold mb-2">
                              ✗ {manualErrors[mi].length} error{manualErrors[mi]
                                .length !== 1
                                ? "s"
                                : ""} — please fix before saving
                            </p>
                            {#each manualErrors[mi] as err}
                              <p class="text-red-400 text-xs leading-relaxed">
                                • {err}
                              </p>
                            {/each}
                          </div>
                        {/if}

                        {#if form?.step === "uploadAssessment" && +form?.moduleIndex === mi && form?.error}
                          <div
                            class="mt-3 bg-red-950/40 border border-red-800/40 rounded-xl p-4"
                          >
                            <p
                              class="text-red-400 text-xs font-medium leading-relaxed whitespace-pre-wrap"
                            >
                              {form.error}
                            </p>
                          </div>
                        {/if}

                        <button
                          type="submit"
                          class="mt-4 bg-violet-700 hover:bg-violet-600 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition-colors"
                        >
                          ↑ Save Assessment
                        </button>
                      </form>
                    {/if}
                    <!-- end mode conditional -->
                  {/if}
                  <!-- end !mod.assessment || as.showReplace -->
                </div>
              {/if}
              <!-- end accordion body -->
            </div>
          {/each}
        </div>

        <!-- Publish section -->
        <div class="mt-8 pt-6 border-t border-white/5">
          {#if isComplete}
            <form
              method="POST"
              action="?/publishCourse"
              use:enhance={enhancePublish()}
            >
              <input type="hidden" name="courseId" value={courseId} />
              <div class="flex items-center gap-4 flex-wrap">
                <button
                  type="submit"
                  disabled={publishing}
                  class="flex items-center gap-2.5 font-bold px-8 py-3 rounded-xl transition-colors shadow-lg
                     {publishing
                    ? 'bg-emerald-700/50 text-emerald-300/50 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'}"
                >
                  {#if publishing}
                    <span class="spinner-sm"></span>
                    Publishing…
                  {:else}
                    🚀 Publish Course
                  {/if}
                </button>
                <p class="text-xs text-zinc-500">
                  All {modules.length} modules complete — this will write to the
                  CourseList collection.
                </p>
              </div>
              {#if form?.step === "publishCourse" && form?.serverError}
                <p class="ferr mt-3">{form.serverError}</p>
              {/if}
            </form>
          {:else}
            <div
              class="flex items-start gap-3 bg-amber-950/30 border border-amber-800/30 rounded-xl p-5"
            >
              <span class="text-amber-400 text-xl mt-0.5">⚠</span>
              <div>
                <p class="text-amber-300 text-sm font-semibold">
                  Not ready to publish
                </p>
                <p class="text-xs text-zinc-500 mt-1">
                  Every module needs at least one lesson and a validated
                  assessment.
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
  :global(.inp) {
    display: block;
    width: 100%;
    background: rgb(24 24 27);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0.75rem;
    padding: 0.625rem 1rem;
    font-size: 0.875rem;
    color: #f4f4f5;
    outline: none;
    transition:
      border-color 0.15s,
      box-shadow 0.15s;
    font-family: inherit;
  }
  :global(.inp::placeholder) {
    color: #52525b;
  }
  :global(.inp:focus) {
    border-color: rgba(139, 92, 246, 0.55);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.12);
  }
  :global(.inp-err) {
    border-color: rgba(239, 68, 68, 0.45) !important;
  }
  :global(.inp-err:focus) {
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12) !important;
  }
  :global(.lbl) {
    display: block;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: #a1a1aa;
    margin-bottom: 0.375rem;
  }
  :global(.ferr) {
    color: #f87171;
    font-size: 0.75rem;
    margin-top: 0.25rem;
  }
  :global(.spinner) {
    display: inline-block;
    width: 1rem;
    height: 1rem;
    border: 2px solid rgba(139, 92, 246, 0.3);
    border-top-color: rgba(139, 92, 246, 1);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }
  :global(.spinner-sm) {
    display: inline-block;
    width: 0.875rem;
    height: 0.875rem;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: rgba(255, 255, 255, 0.9);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
