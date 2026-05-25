<script>
    import { enhance } from "$app/forms";

    export let lesson = null;
    export let sectionId = "";
    export let courseId = "";
    export let moduleSectionId = "";
    export let form = null;

    let title = lesson?.title ?? "";
    let submitting = false;
    let errors = {};
    let touched = {};

    // Question type options
    const QUESTION_TYPES = {
        mcq: "Multiple Choice",
        truefalse: "True / False"
    };

    function newQuestion(type = "mcq") {
        return {
            type,
            question: "",
            options: type === "truefalse" ? ["True", "False"] : ["", "", "", ""],
            answer: 0
        };
    }

    let questions = lesson?.questions?.length
        ? lesson.questions.map(q => ({
              type: q.options?.length === 2 &&
                    q.options[0] === "True" &&
                    q.options[1] === "False"
                        ? "truefalse"
                        : "mcq",
              question: q.question,
              options: [...q.options],
              answer: q.answer ?? 0
          }))
        : [newQuestion("mcq")];

    function addQuestion() {
        questions = [...questions, newQuestion("mcq")];
    }

    function removeQuestion(i) {
        questions = questions.filter((_, idx) => idx !== i);
        if (questions.length === 0) questions = [newQuestion("mcq")];
    }

    // When question type changes, reset options
    function changeQuestionType(qi, newType) {
        questions = questions.map((q, i) => {
            if (i !== qi) return q;
            return {
                ...q,
                type: newType,
                options: newType === "truefalse" ? ["True", "False"] : ["", "", "", ""],
                answer: 0
            };
        });
    }

    function addOption(qi) {
        questions = questions.map((q, i) => {
            if (i !== qi) return q;
            return { ...q, options: [...q.options, ""] };
        });
    }

    function removeOption(qi, oi) {
        questions = questions.map((q, i) => {
            if (i !== qi) return q;
            const newOptions = q.options.filter((_, idx) => idx !== oi);
            // Adjust answer index if needed
            const newAnswer = q.answer >= oi && q.answer > 0 ? q.answer - 1 : q.answer;
            return { ...q, options: newOptions, answer: newAnswer };
        });
    }

    $: if (form?.success && form?.type === "assessment") {
        title = "";
        questions = [newQuestion("mcq")];
        errors = {};
        touched = {};
    }

    function validate() {
        const errs = {};
        if (!title.trim() || title.trim().length < 3)
            errs.title = "Title must be at least 3 characters.";
        questions.forEach((q, i) => {
            if (!q.question.trim()) errs[`q_${i}`] = "Question text is required.";
            const filled = q.options.filter(o => o.trim());
            if (filled.length < 2) errs[`opt_${i}`] = "At least 2 options required.";
        });
        return errs;
    }

    $: action = lesson ? "?/updateAssessmentLesson" : "?/createAssessmentLesson";

    function enhanceAssessment() {
        return ({ formData, cancel }) => {
            touched = { title: true };
            errors = validate();
            if (Object.keys(errors).length) { cancel(); return; }

            formData.set("title",           title.trim());
            formData.set("sectionId",       sectionId);
            formData.set("courseId",        courseId);
            formData.set("moduleSectionId", moduleSectionId);
            if (lesson?._id) formData.set("lessonId", lesson._id);
            formData.set("questions", JSON.stringify(
                questions.map(q => ({
                    question: q.question.trim(),
                    options:  q.options.map(o => o.trim()).filter(Boolean),
                    answer:   q.answer,
                    questionType: q.type
                }))
            ));

            submitting = true;
            return async ({ update }) => {
                await update({ reset: false });
                submitting = false;
            };
        };
    }
</script>

<form
    method="POST"
    {action}
    use:enhance={enhanceAssessment()}
    class="space-y-5"
>
    <input type="hidden" name="sectionId"       value={sectionId} />
    <input type="hidden" name="courseId"        value={courseId} />
    <input type="hidden" name="moduleSectionId" value={moduleSectionId} />
    {#if lesson?._id}
        <input type="hidden" name="lessonId" value={lesson._id} />
    {/if}

    <!-- Assessment Title -->
    <div class="bg-[#0e1018] border border-white/[0.06] rounded-2xl px-6 py-5">
        <label
            class="block text-[0.68rem] font-bold tracking-[0.15em] uppercase text-zinc-400 mb-2"
            for="a-title"
        >
            Assessment Title <span class="text-rose-400">*</span>
        </label>
        <input
            id="a-title" name="title" type="text" maxlength="100" autocomplete="off"
            placeholder="e.g. Java Basics Quiz"
            bind:value={title}
            on:blur={() => { touched.title = true; errors = validate(); }}
            class="block w-full rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600
                   outline-none transition-all bg-zinc-900/70 border focus:ring-2 focus:ring-violet-500/15
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

    <!-- Questions -->
    {#each questions as q, qi (qi)}
        <div class="bg-[#0e1018] border border-white/[0.06] rounded-2xl overflow-hidden">

            <!-- Question Header -->
            <div class="px-6 py-4 border-b border-white/[0.05] flex items-center justify-between gap-4">
                <span class="text-xs font-bold text-zinc-400 font-mono flex-shrink-0">
                    Question {qi + 1}
                </span>

                <!-- Question Type Toggle -->
                <div class="flex items-center gap-1 bg-zinc-900 rounded-xl p-1 flex-1 max-w-xs">
                    {#each Object.entries(QUESTION_TYPES) as [typeKey, typeLabel]}
                        <button
                            type="button"
                            on:click={() => changeQuestionType(qi, typeKey)}
                            class="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                                   {q.type === typeKey
                                       ? 'bg-violet-600 text-white'
                                       : 'text-zinc-500 hover:text-zinc-300'}"
                        >
                            {typeLabel}
                        </button>
                    {/each}
                </div>

                {#if questions.length > 1}
                    <button
                        type="button"
                        on:click={() => removeQuestion(qi)}
                        class="text-xs text-zinc-600 hover:text-rose-400 transition-colors px-2 py-1
                               rounded-lg hover:bg-rose-950/30 flex-shrink-0"
                    >
                        Remove
                    </button>
                {/if}
            </div>

            <div class="px-6 py-5 space-y-4">

                <!-- Question Text -->
                <div>
                    <label
                        class="block text-[0.65rem] font-bold tracking-[0.12em] uppercase text-zinc-500 mb-1.5"
                        for="q-{qi}"
                    >
                        Question Text <span class="text-rose-400">*</span>
                    </label>
                    <textarea
                        id="q-{qi}"
                        rows="2"
                        placeholder={q.type === "truefalse"
                            ? "e.g. Java is platform independent."
                            : "e.g. What is the default value of an int in Java?"}
                        bind:value={q.question}
                        class="block w-full rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600
                               outline-none transition-all bg-zinc-900/70 border resize-none
                               focus:ring-2 focus:ring-violet-500/15
                               {errors[`q_${qi}`]
                                   ? 'border-rose-500/50'
                                   : 'border-white/[0.08] focus:border-violet-500/50'}"
                    ></textarea>
                    {#if errors[`q_${qi}`]}
                        <p class="text-rose-400 text-xs mt-1 flex items-center gap-1">
                            <span>⚠</span>{errors[`q_${qi}`]}
                        </p>
                    {/if}
                </div>

                <!-- Options -->
                <div>
                    <p class="text-[0.65rem] font-bold tracking-[0.12em] uppercase text-zinc-500 mb-2">
                        {q.type === "truefalse" ? "Answer" : "Options"}
                        <span class="text-zinc-700 font-normal normal-case">(select correct answer)</span>
                    </p>

                    <div class="space-y-2">
                        {#each q.options as opt, oi (oi)}
                            <div class="flex items-center gap-3">

                                <!-- Correct answer selector -->
                                <button
                                    type="button"
                                    on:click={() => (q.answer = oi)}
                                    class="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center
                                           transition-all {q.answer === oi
                                               ? 'border-violet-500 bg-violet-500'
                                               : 'border-zinc-700 hover:border-zinc-500'}"
                                    title="Mark as correct answer"
                                >
                                    {#if q.answer === oi}
                                        <span class="w-2 h-2 rounded-full bg-white inline-block"></span>
                                    {/if}
                                </button>

                                <!-- Option input — readonly for true/false -->
                                <input
                                    type="text"
                                    placeholder="Option {oi + 1}"
                                    bind:value={q.options[oi]}
                                    readonly={q.type === "truefalse"}
                                    class="flex-1 rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600
                                           outline-none transition-all bg-zinc-900/70 border border-white/[0.08]
                                           focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/15
                                           {q.type === 'truefalse' ? 'opacity-60 cursor-default' : ''}"
                                />

                                {#if q.answer === oi}
                                    <span class="text-[0.6rem] text-violet-400 font-bold font-mono flex-shrink-0">
                                        ✓ Correct
                                    </span>
                                {:else}
                                    <!-- Delete option — only for MCQ with more than 2 options -->
                                    {#if q.type === "mcq" && q.options.length > 2}
                                        <button
                                            type="button"
                                            on:click={() => removeOption(qi, oi)}
                                            class="text-zinc-700 hover:text-rose-400 transition-colors
                                                   flex-shrink-0 w-5 h-5 flex items-center justify-center
                                                   rounded hover:bg-rose-950/30 text-xs"
                                            title="Remove option"
                                        >
                                            ✕
                                        </button>
                                    {:else}
                                        <!-- Spacer to keep layout consistent -->
                                        <span class="flex-shrink-0 w-5"></span>
                                    {/if}
                                {/if}
                            </div>
                        {/each}
                    </div>

                    {#if errors[`opt_${qi}`]}
                        <p class="text-rose-400 text-xs mt-1.5 flex items-center gap-1">
                            <span>⚠</span>{errors[`opt_${qi}`]}
                        </p>
                    {/if}

                    <!-- Add Option — only for MCQ -->
                    {#if q.type === "mcq"}
                        <button
                            type="button"
                            on:click={() => addOption(qi)}
                            class="mt-3 flex items-center gap-1.5 text-xs text-zinc-600
                                   hover:text-violet-400 transition-colors"
                        >
                            <span class="text-base leading-none">+</span> Add Option
                        </button>
                    {/if}
                </div>
            </div>
        </div>
    {/each}

    <!-- Add Question -->
    <button
        type="button"
        on:click={addQuestion}
        class="w-full flex items-center justify-center gap-2 py-3 rounded-2xl
               border-2 border-dashed border-white/[0.08] hover:border-violet-500/30
               text-xs font-semibold text-zinc-600 hover:text-violet-400 transition-all duration-150"
    >
        + Add Another Question
    </button>

    <!-- Submit -->
    <div class="flex justify-end">
        <button
            type="submit"
            disabled={submitting}
            class="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white
                   font-semibold text-sm px-6 py-2.5 rounded-xl transition-all
                   shadow-lg shadow-violet-950/50 active:scale-[0.97]
                   disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {#if submitting}
                <span class="w-3.5 h-3.5 border-2 border-white/25 border-t-white rounded-full animate-spin"></span>
                Saving…
            {:else}
                📝 {lesson ? "Update Assessment" : "Save Assessment"} →
            {/if}
        </button>
    </div>

    {#if form?.serverError && form?.type === "assessment"}
        <div class="bg-rose-950/40 border border-rose-800/30 rounded-xl px-4 py-3">
            <p class="text-rose-400 text-xs flex items-center gap-1.5">
                <span>✗</span>{form.serverError}
            </p>
        </div>
    {/if}
</form>